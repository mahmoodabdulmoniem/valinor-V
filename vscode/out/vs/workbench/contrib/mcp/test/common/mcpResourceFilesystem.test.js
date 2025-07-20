/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileSystemProviderErrorCode, FileType, IFileService } from '../../../../../platform/files/common/files.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestContextService, TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IMcpRegistry } from '../../common/mcpRegistryTypes.js';
import { McpResourceFilesystem } from '../../common/mcpResourceFilesystem.js';
import { McpService } from '../../common/mcpService.js';
import { IMcpService } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport, TestMcpRegistry } from './mcpRegistryTypes.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Barrier, timeout } from '../../../../../base/common/async.js';
suite('Workbench - MCP - ResourceFilesystem', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let transport;
    let fs;
    setup(() => {
        const services = new ServiceCollection([IFileService, { registerProvider: () => { } }], [IStorageService, ds.add(new TestStorageService())], [ILoggerService, ds.add(new TestLoggerService())], [IWorkspaceContextService, new TestContextService()], [ITelemetryService, NullTelemetryService], [IProductService, TestProductService]);
        const parentInsta1 = ds.add(new TestInstantiationService(services));
        const registry = new TestMcpRegistry(parentInsta1);
        const parentInsta2 = ds.add(parentInsta1.createChild(new ServiceCollection([IMcpRegistry, registry])));
        const mcpService = ds.add(new McpService(parentInsta2, registry, { registerToolData: () => Disposable.None, registerToolImplementation: () => Disposable.None, createToolSet: () => Disposable.None }, new NullLogService()));
        mcpService.updateCollectedServers();
        const instaService = ds.add(parentInsta2.createChild(new ServiceCollection([IMcpRegistry, registry], [IMcpService, mcpService])));
        fs = ds.add(instaService.createInstance(McpResourceFilesystem));
        transport = ds.add(new TestMcpMessageTransport());
        registry.makeTestTransport = () => transport;
    });
    test('reads a basic file', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/world.txt');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'Hello World' }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World');
    });
    test('stat returns file information', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/world.txt');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'Hello World' }],
                }
            };
        });
        const fileStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(fileStats.type, FileType.File);
        assert.strictEqual(fileStats.size, 'Hello World'.length);
    });
    test('stat returns directory information', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/file2.txt', text: 'File 2' },
                    ],
                }
            };
        });
        const dirStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/'));
        assert.strictEqual(dirStats.type, FileType.Directory);
        // Size should be sum of all file contents in the directory
        assert.strictEqual(dirStats.size, 'File 1'.length + 'File 2'.length);
    });
    test('stat throws FileNotFound for nonexistent resources', async () => {
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [],
                }
            };
        });
        await assert.rejects(() => fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/nonexistent.txt')), (err) => err.code === FileSystemProviderErrorCode.FileNotFound);
    });
    test('readdir returns directory contents', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/dir');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/dir/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/dir/file2.txt', text: 'File 2' },
                        { uri: 'custom://hello/dir/subdir/file3.txt', text: 'File 3' },
                    ],
                }
            };
        });
        const dirEntries = await fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/dir/'));
        assert.deepStrictEqual(dirEntries, [
            ['file1.txt', FileType.File],
            ['file2.txt', FileType.File],
            ['subdir', FileType.Directory],
        ]);
    });
    test('readdir throws when reading a file as directory', async () => {
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'This is a file' }],
                }
            };
        });
        await assert.rejects(() => fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt')), (err) => err.code === FileSystemProviderErrorCode.FileNotADirectory);
    });
    test('watch file emits change events', async () => {
        // Set up the responder for resource reading
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'File content' }],
                }
            };
        });
        const didSubscribe = new Barrier();
        // Set up the responder for resource subscription
        transport.setResponder('resources/subscribe', msg => {
            didSubscribe.open();
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {},
            };
        });
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        const fileChanges = [];
        // Create a listener for file change events
        const disposable = fs.onDidChangeFile(events => {
            fileChanges.push(...events);
        });
        // Start watching the file
        const watchDisposable = fs.watch(uri, { excludes: [], recursive: false });
        // Simulate a file update notification from the server
        await didSubscribe.wait();
        await timeout(10); // wait for listeners to attach
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/file.txt',
            },
        });
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/unrelated.txt',
            },
        });
        // Check that we received a file change event
        assert.strictEqual(fileChanges.length, 1);
        assert.strictEqual(fileChanges[0].type, 0 /* FileChangeType.UPDATED */);
        assert.strictEqual(fileChanges[0].resource.toString(), uri.toString());
        // Clean up
        disposable.dispose();
        watchDisposable.dispose();
    });
    test('read blob resource', async () => {
        const blobBase64 = 'SGVsbG8gV29ybGQgYXMgQmxvYg=='; // "Hello World as Blob" in base64
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/blob.bin');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, blob: blobBase64 }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/blob.bin'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World as Blob');
    });
    test('throws error for write operations', async () => {
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        await assert.rejects(async () => fs.writeFile(uri, new Uint8Array(), { create: true, overwrite: true, atomic: false, unlock: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.delete(uri, { recursive: false, useTrash: false, atomic: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.mkdir(uri), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.rename(uri, URI.parse('mcp-resource://746573742D736572766572/custom/hello/newfile.txt'), { overwrite: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VGaWxlc3lzdGVtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZXNvdXJjZUZpbGVzeXN0ZW0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBa0IsMkJBQTJCLEVBQUUsUUFBUSxFQUFlLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxZ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