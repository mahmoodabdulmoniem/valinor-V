/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { sumBy } from '../../../../base/common/arrays.js';
import { decodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, FileType, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { McpServer } from './mcpServer.js';
import { IMcpService, McpResourceURI } from './mcpTypes.js';
let McpResourceFilesystem = class McpResourceFilesystem extends Disposable {
    get _mcpService() {
        return this._mcpServiceLazy.value;
    }
    constructor(_instantiationService, _fileService) {
        super();
        this._instantiationService = _instantiationService;
        this._fileService = _fileService;
        /** Defer getting the MCP service since this is a BlockRestore and no need to make it unnecessarily. */
        this._mcpServiceLazy = new Lazy(() => this._instantiationService.invokeFunction(a => a.get(IMcpService)));
        this.onDidChangeCapabilities = Event.None;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.capabilities = 0 /* FileSystemProviderCapabilities.None */
            | 2048 /* FileSystemProviderCapabilities.Readonly */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 16 /* FileSystemProviderCapabilities.FileReadStream */
            | 16384 /* FileSystemProviderCapabilities.FileAtomicRead */
            | 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this._register(this._fileService.registerProvider(McpResourceURI.scheme, this));
    }
    //#region Filesystem API
    async readFile(resource) {
        return this._readFile(resource);
    }
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        this._readFile(resource, token).then(data => {
            if (opts.position) {
                data = data.slice(opts.position);
            }
            if (opts.length) {
                data = data.slice(0, opts.length);
            }
            stream.end(data);
        }, err => stream.error(err));
        return stream;
    }
    watch(uri, _opts) {
        const { resourceURI, server } = this._decodeURI(uri);
        const cap = server.capabilities.get();
        if (cap !== undefined && !(cap & 32 /* McpCapability.ResourcesSubscribe */)) {
            return Disposable.None;
        }
        server.start();
        const store = new DisposableStore();
        let watchedOnHandler;
        const watchListener = store.add(new MutableDisposable());
        const callCts = store.add(new MutableDisposable());
        store.add(autorun(reader => {
            const connection = server.connection.read(reader);
            if (!connection) {
                return;
            }
            const handler = connection.handler.read(reader);
            if (!handler || watchedOnHandler === handler) {
                return;
            }
            callCts.value?.dispose(true);
            callCts.value = new CancellationTokenSource();
            watchedOnHandler = handler;
            const token = callCts.value.token;
            handler.subscribe({ uri: resourceURI.toString() }, token).then(() => {
                if (!token.isCancellationRequested) {
                    watchListener.value = handler.onDidUpdateResource(e => {
                        if (equalsUrlPath(e.params.uri, resourceURI)) {
                            this._onDidChangeFile.fire([{ resource: uri, type: 0 /* FileChangeType.UPDATED */ }]);
                        }
                    });
                }
            }, err => {
                handler.logger.warn(`Failed to subscribe to resource changes for ${resourceURI}: ${err}`);
                watchedOnHandler = undefined;
            });
        }));
        return store;
    }
    async stat(resource) {
        const { forSameURI, contents } = await this._readURI(resource);
        if (!contents.length) {
            throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        return {
            ctime: 0,
            mtime: 0,
            size: sumBy(contents, c => contentToBuffer(c).byteLength),
            type: forSameURI.length ? FileType.File : FileType.Directory,
        };
    }
    async readdir(resource) {
        const { forSameURI, contents, resourceURI } = await this._readURI(resource);
        if (forSameURI.length > 0) {
            throw createFileSystemProviderError(`File is not a directory`, FileSystemProviderErrorCode.FileNotADirectory);
        }
        const resourcePathParts = resourceURI.pathname.split('/');
        const output = new Map();
        for (const content of contents) {
            const contentURI = URI.parse(content.uri);
            const contentPathParts = contentURI.path.split('/');
            // Skip contents that are not in the same directory
            if (contentPathParts.length <= resourcePathParts.length || !resourcePathParts.every((part, index) => equalsIgnoreCase(part, contentPathParts[index]))) {
                continue;
            }
            // nested resource in a directory, just emit a directory to output
            else if (contentPathParts.length > resourcePathParts.length + 1) {
                output.set(contentPathParts[resourcePathParts.length], FileType.Directory);
            }
            else {
                // resource in the same directory, emit the file
                const name = contentPathParts[contentPathParts.length - 1];
                output.set(name, contentToBuffer(content).byteLength > 0 ? FileType.File : FileType.Directory);
            }
        }
        return [...output];
    }
    mkdir(resource) {
        throw createFileSystemProviderError('write is not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    writeFile(resource, content, opts) {
        throw createFileSystemProviderError('write is not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    delete(resource, opts) {
        throw createFileSystemProviderError('delete is not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    rename(from, to, opts) {
        throw createFileSystemProviderError('rename is not supported', FileSystemProviderErrorCode.NoPermissions);
    }
    //#endregion
    async _readFile(resource, token) {
        const { forSameURI, contents } = await this._readURI(resource);
        // MCP does not distinguish between files and directories, and says that
        // servers should just return multiple when 'reading' a directory.
        if (!forSameURI.length) {
            if (!contents.length) {
                throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
            }
            else {
                throw createFileSystemProviderError(`File is a directory`, FileSystemProviderErrorCode.FileIsADirectory);
            }
        }
        return contentToBuffer(forSameURI[0]);
    }
    _decodeURI(uri) {
        let definitionId;
        let resourceURL;
        try {
            ({ definitionId, resourceURL } = McpResourceURI.toServer(uri));
        }
        catch (e) {
            throw createFileSystemProviderError(String(e), FileSystemProviderErrorCode.FileNotFound);
        }
        if (resourceURL.pathname.endsWith('/')) {
            resourceURL.pathname = resourceURL.pathname.slice(0, -1);
        }
        const server = this._mcpService.servers.get().find(s => s.definition.id === definitionId);
        if (!server) {
            throw createFileSystemProviderError(`MCP server ${definitionId} not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        const cap = server.capabilities.get();
        if (cap !== undefined && !(cap & 16 /* McpCapability.Resources */)) {
            throw createFileSystemProviderError(`MCP server ${definitionId} does not support resources`, FileSystemProviderErrorCode.FileNotFound);
        }
        return { definitionId, resourceURI: resourceURL, server };
    }
    async _readURI(uri, token) {
        const { resourceURI, server } = this._decodeURI(uri);
        const res = await McpServer.callOn(server, r => r.readResource({ uri: resourceURI.toString() }, token), token);
        return {
            contents: res.contents,
            resourceURI,
            forSameURI: res.contents.filter(c => equalsUrlPath(c.uri, resourceURI)),
        };
    }
};
McpResourceFilesystem = __decorate([
    __param(0, IInstantiationService),
    __param(1, IFileService)
], McpResourceFilesystem);
export { McpResourceFilesystem };
function equalsUrlPath(a, b) {
    // MCP doesn't specify either way, but underlying systems may can be case-sensitive.
    // It's better to treat case-sensitive paths as case-insensitive than vise-versa.
    return equalsIgnoreCase(new URL(a).pathname, b.pathname);
}
function contentToBuffer(content) {
    if ('text' in content) {
        return VSBuffer.fromString(content.text).buffer;
    }
    else if ('blob' in content) {
        return decodeBase64(content.blob).buffer;
    }
    else {
        throw createFileSystemProviderError('Unknown content type', FileSystemProviderErrorCode.Unknown);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VGaWxlc3lzdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFJlc291cmNlRmlsZXN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLG1DQUFtQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsNkJBQTZCLEVBQWtELDJCQUEyQixFQUFFLFFBQVEsRUFBa0YsWUFBWSxFQUE2TCxNQUFNLDRDQUE0QyxDQUFDO0FBQzNjLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUUzQyxPQUFP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