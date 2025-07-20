/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, NullLogger } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistry } from '../../common/mcpRegistry.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
import { mcpEnabledConfig } from '../../../../../platform/mcp/common/mcpManagement.js';
class TestConfigurationResolverService {
    constructor() {
        this.interactiveCounter = 0;
        // Used to simulate stored/resolved variables
        this.resolvedVariables = new Map();
        // Add some test variables
        this.resolvedVariables.set('workspaceFolder', '/test/workspace');
        this.resolvedVariables.set('fileBasename', 'test.txt');
    }
    resolveAsync(folder, value) {
        const parsed = ConfigurationResolverExpression.parse(value);
        for (const variable of parsed.unresolved()) {
            const resolved = this.resolvedVariables.get(variable.inner);
            if (resolved) {
                parsed.resolve(variable, resolved);
            }
        }
        return Promise.resolve(parsed.toObject());
    }
    resolveWithInteraction(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        // For testing, we simulate interaction by returning a map with some variables
        const result = new Map();
        result.set('input:testInteractive', `interactiveValue${this.interactiveCounter++}`);
        result.set('command:testCommand', `commandOutput${this.interactiveCounter++}}`);
        // If variables are provided, include those too
        for (const [k, v] of result.entries()) {
            parsed.resolve({ id: '${' + k + '}' }, v);
        }
        return Promise.resolve(result);
    }
}
class TestMcpHostDelegate {
    constructor() {
        this.priority = 0;
    }
    canStart() {
        return true;
    }
    start() {
        return new TestMcpMessageTransport();
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
class TestDialogService {
    constructor() {
        this._promptSpy = sinon.stub();
        this._promptSpy.callsFake(() => {
            return Promise.resolve({ result: this._promptResult });
        });
    }
    setPromptResult(result) {
        this._promptResult = result;
    }
    get promptSpy() {
        return this._promptSpy;
    }
    prompt(options) {
        return this._promptSpy(options);
    }
}
suite('Workbench - MCP - Registry', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    let testStorageService;
    let testConfigResolverService;
    let testDialogService;
    let testCollection;
    let baseDefinition;
    let configurationService;
    let logger;
    setup(() => {
        testConfigResolverService = new TestConfigurationResolverService();
        testStorageService = store.add(new TestStorageService());
        testDialogService = new TestDialogService();
        configurationService = new TestConfigurationService({ [mcpEnabledConfig]: true });
        const services = new ServiceCollection([IConfigurationService, configurationService], [IConfigurationResolverService, testConfigResolverService], [IStorageService, testStorageService], [ISecretStorageService, new TestSecretStorageService()], [ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IDialogService, testDialogService], [IProductService, {}]);
        logger = new NullLogger();
        const instaService = store.add(new TestInstantiationService(services));
        registry = store.add(instaService.createInstance(McpRegistry));
        // Create test collection that can be reused
        testCollection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            isTrustedByDefault: true,
            scope: -1 /* StorageScope.APPLICATION */,
            configTarget: 2 /* ConfigurationTarget.USER */,
        };
        // Create base definition that can be reused
        baseDefinition = {
            id: 'test-server',
            label: 'Test Server',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: '/test',
            }
        };
    });
    test('registerCollection adds collection to registry', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        assert.strictEqual(registry.collections.get()[0], testCollection);
        disposable.dispose();
        assert.strictEqual(registry.collections.get().length, 0);
    });
    test('collections are not visible when not enabled', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        configurationService.setUserConfiguration(mcpEnabledConfig, false);
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(registry.collections.get().length, 0);
        configurationService.setUserConfiguration(mcpEnabledConfig, true);
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
    });
    test('registerDelegate adds delegate to registry', () => {
        const delegate = new TestMcpHostDelegate();
        const disposable = registry.registerDelegate(delegate);
        store.add(disposable);
        assert.strictEqual(registry.delegates.get().length, 1);
        assert.strictEqual(registry.delegates.get()[0], delegate);
        disposable.dispose();
        assert.strictEqual(registry.delegates.get().length, 0);
    });
    test('resolveConnection creates connection with resolved variables and memorizes them until cleared', async () => {
        const definition = {
            ...baseDefinition,
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: '${workspaceFolder}/cmd',
                args: ['--file', '${fileBasename}'],
                env: {
                    PATH: '${input:testInteractive}'
                },
                envFile: undefined,
                cwd: '/test',
            },
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(testCollection));
        const connection = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger });
        assert.ok(connection);
        assert.strictEqual(connection.definition, definition);
        assert.strictEqual(connection.launchDefinition.command, '/test/workspace/cmd');
        assert.strictEqual(connection.launchDefinition.env.PATH, 'interactiveValue0');
        connection.dispose();
        const connection2 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger });
        assert.ok(connection2);
        assert.strictEqual(connection2.launchDefinition.env.PATH, 'interactiveValue0');
        connection2.dispose();
        registry.clearSavedInputs(1 /* StorageScope.WORKSPACE */);
        const connection3 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger });
        assert.ok(connection3);
        assert.strictEqual(connection3.launchDefinition.env.PATH, 'interactiveValue4');
        connection3.dispose();
    });
    test('resolveConnection uses user-provided launch configuration', async () => {
        // Create a collection with custom launch resolver
        const customCollection = {
            ...testCollection,
            resolveServerLanch: async (def) => {
                return {
                    ...def.launch,
                    env: { CUSTOM_ENV: 'value' },
                };
            }
        };
        // Create a definition with variable replacement
        const definition = {
            ...baseDefinition,
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(customCollection));
        // Resolve connection should use the custom launch configuration
        const connection = await registry.resolveConnection({
            collectionRef: customCollection,
            definitionRef: definition,
            logger
        });
        assert.ok(connection);
        // Verify the launch configuration passed to _replaceVariablesInLaunch was the custom one
        assert.deepStrictEqual(connection.launchDefinition.env, { CUSTOM_ENV: 'value' });
        connection.dispose();
    });
    suite('Trust Management', () => {
        setup(() => {
            const delegate = new TestMcpHostDelegate();
            store.add(registry.registerDelegate(delegate));
        });
        test('resolveConnection connects to server when trusted by default', async () => {
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(testCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            const connection = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger });
            assert.ok(connection);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection?.dispose();
        });
        test('resolveConnection prompts for confirmation when not trusted by default', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(true);
            const connection = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.ok(connection);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            connection?.dispose();
            testDialogService.promptSpy.resetHistory();
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.ok(connection2);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection2?.dispose();
        });
        test('resolveConnection returns undefined when user does not trust the server', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(false);
            const connection = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.strictEqual(connection, undefined);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            testDialogService.promptSpy.resetHistory();
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.strictEqual(connection2, undefined);
            assert.strictEqual(testDialogService.promptSpy.called, false);
        });
        test('resolveConnection honors forceTrust parameter', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(false);
            const connection1 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.strictEqual(connection1, undefined);
            testDialogService.promptSpy.resetHistory();
            testDialogService.setPromptResult(true);
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
                forceTrust: true
            });
            assert.ok(connection2);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            connection2?.dispose();
            testDialogService.promptSpy.resetHistory();
            const connection3 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition
            });
            assert.ok(connection3);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection3?.dispose();
        });
    });
    suite('Lazy Collections', () => {
        let lazyCollection;
        let normalCollection;
        let removedCalled;
        setup(() => {
            removedCalled = false;
            lazyCollection = {
                ...testCollection,
                id: 'lazy-collection',
                lazy: {
                    isCached: false,
                    load: () => Promise.resolve(),
                    removed: () => { removedCalled = true; }
                }
            };
            normalCollection = {
                ...testCollection,
                id: 'lazy-collection',
                serverDefinitions: observableValue('serverDefs', [baseDefinition])
            };
        });
        test('registers lazy collection', () => {
            const disposable = registry.registerCollection(lazyCollection);
            store.add(disposable);
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.collections.get()[0], lazyCollection);
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
        });
        test('lazy collection is replaced by normal collection', () => {
            store.add(registry.registerCollection(lazyCollection));
            store.add(registry.registerCollection(normalCollection));
            const collections = registry.collections.get();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0], normalCollection);
            assert.strictEqual(collections[0].lazy, undefined);
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
        });
        test('lazyCollectionState updates correctly during loading', async () => {
            lazyCollection = {
                ...lazyCollection,
                lazy: {
                    ...lazyCollection.lazy,
                    load: async () => {
                        await timeout(0);
                        store.add(registry.registerCollection(normalCollection));
                        return Promise.resolve();
                    }
                }
            };
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
            const loadingPromise = registry.discoverCollections();
            assert.strictEqual(registry.lazyCollectionState.get(), 1 /* LazyCollectionState.LoadingUnknown */);
            await loadingPromise;
            // The collection wasn't replaced, so it should be removed
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
            assert.strictEqual(removedCalled, false);
        });
        test('removed callback is called when lazy collection is not replaced', async () => {
            store.add(registry.registerCollection(lazyCollection));
            await registry.discoverCollections();
            assert.strictEqual(removedCalled, true);
        });
        test('cached lazy collections are tracked correctly', () => {
            lazyCollection.lazy.isCached = true;
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
            // Adding an uncached lazy collection changes the state
            const uncachedLazy = {
                ...lazyCollection,
                id: 'uncached-lazy',
                lazy: {
                    ...lazyCollection.lazy,
                    isCached: false
                }
            };
            store.add(registry.registerCollection(uncachedLazy));
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBdUIsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMzSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFXLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDbkgsT0FBTyxFQUFF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