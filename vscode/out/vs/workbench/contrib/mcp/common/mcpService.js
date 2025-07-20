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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { decodeBase64 } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { autorun, observableValue, transaction } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ChatResponseResource, getAttachableImageExtension } from '../../chat/common/chatModel.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServer, McpServerMetadataCache } from './mcpServer.js';
import { McpResourceURI, McpServerDefinition } from './mcpTypes.js';
let McpService = class McpService extends Disposable {
    get lazyCollectionState() { return this._mcpRegistry.lazyCollectionState; }
    constructor(_instantiationService, _mcpRegistry, _toolsService, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._mcpRegistry = _mcpRegistry;
        this._toolsService = _toolsService;
        this._logService = _logService;
        this._servers = observableValue(this, []);
        this.servers = this._servers.map(servers => servers.map(s => s.object));
        this.userCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 0 /* StorageScope.PROFILE */));
        this.workspaceCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 1 /* StorageScope.WORKSPACE */));
        const updateThrottle = this._store.add(new RunOnceScheduler(() => this.updateCollectedServers(), 500));
        // Throttle changes so that if a collection is changed, or a server is
        // unregistered/registered, we don't stop servers unnecessarily.
        this._register(autorun(reader => {
            for (const collection of this._mcpRegistry.collections.read(reader)) {
                collection.serverDefinitions.read(reader);
            }
            updateThrottle.schedule(500);
        }));
    }
    resetCaches() {
        this.userCache.reset();
        this.workspaceCache.reset();
    }
    async activateCollections() {
        const collections = await this._mcpRegistry.discoverCollections();
        const collectionIds = new Set(collections.map(c => c.id));
        this.updateCollectedServers();
        // Discover any newly-collected servers with unknown tools
        const todo = [];
        for (const { object: server } of this._servers.get()) {
            if (collectionIds.has(server.collection.id)) {
                const state = server.cacheState.get();
                if (state === 0 /* McpServerCacheState.Unknown */) {
                    todo.push(server.start());
                }
            }
        }
        await Promise.all(todo);
    }
    _syncTools(server, collectionData, store) {
        const tools = new Map();
        store.add(autorun(reader => {
            const toDelete = new Set(tools.keys());
            // toRegister is deferred until deleting tools that moving a tool between
            // servers (or deleting one instance of a multi-instance server) doesn't cause an error.
            const toRegister = [];
            const registerTool = (tool, toolData, store) => {
                store.add(this._toolsService.registerToolData(toolData));
                store.add(this._toolsService.registerToolImplementation(tool.id, this._instantiationService.createInstance(McpToolImplementation, tool, server)));
                store.add(collectionData.value.toolSet.addTool(toolData));
            };
            for (const tool of server.tools.read(reader)) {
                const existing = tools.get(tool.id);
                const collection = this._mcpRegistry.collections.get().find(c => c.id === server.collection.id);
                const toolData = {
                    id: tool.id,
                    source: collectionData.value.source,
                    icon: Codicon.tools,
                    // duplicative: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/813
                    displayName: tool.definition.annotations?.title || tool.definition.title || tool.definition.name,
                    toolReferenceName: tool.referenceName,
                    modelDescription: tool.definition.description ?? '',
                    userDescription: tool.definition.description ?? '',
                    inputSchema: tool.definition.inputSchema,
                    canBeReferencedInPrompt: true,
                    alwaysDisplayInputOutput: true,
                    runsInWorkspace: collection?.scope === 1 /* StorageScope.WORKSPACE */ || !!collection?.remoteAuthority,
                    tags: ['mcp'],
                };
                if (existing) {
                    if (!equals(existing.toolData, toolData)) {
                        existing.toolData = toolData;
                        existing.store.clear();
                        // We need to re-register both the data and implementation, as the
                        // implementation is discarded when the data is removed (#245921)
                        registerTool(tool, toolData, store);
                    }
                    toDelete.delete(tool.id);
                }
                else {
                    const store = new DisposableStore();
                    toRegister.push(() => registerTool(tool, toolData, store));
                    tools.set(tool.id, { toolData, store });
                }
            }
            for (const id of toDelete) {
                const tool = tools.get(id);
                if (tool) {
                    tool.store.dispose();
                    tools.delete(id);
                }
            }
            for (const fn of toRegister) {
                fn();
            }
        }));
        store.add(toDisposable(() => {
            for (const tool of tools.values()) {
                tool.store.dispose();
            }
        }));
    }
    updateCollectedServers() {
        const prefixGenerator = new McpPrefixGenerator();
        const definitions = this._mcpRegistry.collections.get().flatMap(collectionDefinition => collectionDefinition.serverDefinitions.get().map(serverDefinition => {
            const toolPrefix = prefixGenerator.generate(serverDefinition.label);
            return { serverDefinition, collectionDefinition, toolPrefix };
        }));
        const nextDefinitions = new Set(definitions);
        const currentServers = this._servers.get();
        const nextServers = [];
        const pushMatch = (match, rec) => {
            nextDefinitions.delete(match);
            nextServers.push(rec);
            const connection = rec.object.connection.get();
            // if the definition was modified, stop the server; it'll be restarted again on-demand
            if (connection && !McpServerDefinition.equals(connection.definition, match.serverDefinition)) {
                rec.object.stop();
                this._logService.debug(`MCP server ${rec.object.definition.id} stopped because the definition changed`);
            }
        };
        // Transfer over any servers that are still valid.
        for (const server of currentServers) {
            const match = definitions.find(d => defsEqual(server.object, d) && server.toolPrefix === d.toolPrefix);
            if (match) {
                pushMatch(match, server);
            }
            else {
                server.dispose();
            }
        }
        // Create any new servers that are needed.
        for (const def of nextDefinitions) {
            const store = new DisposableStore();
            const object = this._instantiationService.createInstance(McpServer, def.collectionDefinition, def.serverDefinition, def.serverDefinition.roots, !!def.collectionDefinition.lazy, def.collectionDefinition.scope === 1 /* StorageScope.WORKSPACE */ ? this.workspaceCache : this.userCache, def.toolPrefix);
            const toolSet = new Lazy(() => {
                const metadata = object.serverMetadata.get();
                const source = {
                    type: 'mcp',
                    serverLabel: metadata.serverName,
                    instructions: metadata.serverInstructions,
                    label: object.definition.label,
                    collectionId: object.collection.id,
                    definitionId: object.definition.id
                };
                const toolSet = store.add(this._toolsService.createToolSet(source, def.serverDefinition.id, def.serverDefinition.label, {
                    icon: Codicon.mcp,
                    description: localize('mcp.toolset', "{0}: All Tools", def.serverDefinition.label)
                }));
                return { source, toolSet };
            });
            store.add(object);
            this._syncTools(object, toolSet, store);
            nextServers.push({ object, dispose: () => store.dispose(), toolPrefix: def.toolPrefix });
        }
        transaction(tx => {
            this._servers.set(nextServers, tx);
        });
    }
    dispose() {
        this._servers.get().forEach(s => s.dispose());
        super.dispose();
    }
};
McpService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMcpRegistry),
    __param(2, ILanguageModelToolsService),
    __param(3, ILogService)
], McpService);
export { McpService };
function defsEqual(server, def) {
    return server.collection.id === def.collectionDefinition.id && server.definition.id === def.serverDefinition.id;
}
let McpToolImplementation = class McpToolImplementation {
    constructor(_tool, _server, _productService) {
        this._tool = _tool;
        this._server = _server;
        this._productService = _productService;
    }
    async prepareToolInvocation(context) {
        const tool = this._tool;
        const server = this._server;
        const mcpToolWarning = localize('mcp.tool.warning', "Note that MCP servers or malicious conversation content may attempt to misuse '{0}' through tools.", this._productService.nameShort);
        const needsConfirmation = !tool.definition.annotations?.readOnlyHint;
        // duplicative: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/813
        const title = tool.definition.annotations?.title || tool.definition.title || ('`' + tool.definition.name + '`');
        const subtitle = localize('msg.subtitle', "{0} (MCP Server)", server.definition.label);
        return {
            confirmationMessages: needsConfirmation ? {
                title: new MarkdownString(localize('msg.title', "Run {0}", title)),
                message: new MarkdownString(tool.definition.description, { supportThemeIcons: true }),
                disclaimer: mcpToolWarning,
                allowAutoConfirm: true,
            } : undefined,
            invocationMessage: new MarkdownString(localize('msg.run', "Running {0}", title)),
            pastTenseMessage: new MarkdownString(localize('msg.ran', "Ran {0} ", title)),
            originMessage: new MarkdownString(markdownCommandLink({
                id: "workbench.mcp.showConfiguration" /* McpCommandIds.ShowConfiguration */,
                title: subtitle,
                arguments: [server.collection.id, server.definition.id],
            }), { isTrusted: true }),
            toolSpecificData: {
                kind: 'input',
                rawInput: context.parameters
            }
        };
    }
    async invoke(invocation, _countTokens, progress, token) {
        const result = {
            content: []
        };
        const callResult = await this._tool.callWithProgress(invocation.parameters, progress, { chatRequestId: invocation.chatRequestId, chatSessionId: invocation.context?.sessionId }, token);
        const details = {
            input: JSON.stringify(invocation.parameters, undefined, 2),
            output: [],
            isError: callResult.isError === true,
        };
        for (const item of callResult.content) {
            const audience = item.annotations?.audience || ['assistant'];
            if (audience.includes('user')) {
                if (item.type === 'text') {
                    progress.report({ message: item.text });
                }
            }
            // Rewrite image rsources to images so they are inlined nicely
            const addAsInlineData = (mimeType, value, uri) => {
                details.output.push({ mimeType, value, uri });
                if (isForModel) {
                    result.content.push({
                        kind: 'data',
                        value: { mimeType, data: decodeBase64(value) }
                    });
                }
            };
            const isForModel = audience.includes('assistant');
            if (item.type === 'text') {
                details.output.push({ isText: true, value: item.text });
                if (isForModel) {
                    result.content.push({
                        kind: 'text',
                        value: item.text
                    });
                }
            }
            else if (item.type === 'image' || item.type === 'audio') {
                // default to some image type if not given to hint
                addAsInlineData(item.mimeType || 'image/png', item.data);
            }
            else if (item.type === 'resource_link') {
                // todo@connor4312 look at what we did before #250329 and use that here
            }
            else if (item.type === 'resource') {
                const uri = McpResourceURI.fromServer(this._server.definition, item.resource.uri);
                if (item.resource.mimeType && getAttachableImageExtension(item.resource.mimeType) && 'blob' in item.resource) {
                    addAsInlineData(item.resource.mimeType, item.resource.blob, uri);
                }
                else {
                    details.output.push({
                        uri,
                        isText: 'text' in item.resource,
                        mimeType: item.resource.mimeType,
                        value: 'blob' in item.resource ? item.resource.blob : item.resource.text,
                        asResource: true,
                    });
                    if (isForModel) {
                        const permalink = invocation.chatRequestId && invocation.context && ChatResponseResource.createUri(invocation.context.sessionId, invocation.chatRequestId, invocation.callId, result.content.length, basename(uri));
                        result.content.push({
                            kind: 'text',
                            value: 'text' in item.resource ? item.resource.text : `The tool returns a resource which can be read from the URI ${permalink || uri}`,
                        });
                    }
                }
            }
        }
        result.toolResultDetails = details;
        return result;
    }
};
McpToolImplementation = __decorate([
    __param(2, IProductService)
], McpToolImplementation);
// Helper class for generating unique MCP tool prefixes
class McpPrefixGenerator {
    constructor() {
        this.seenPrefixes = new Set();
    }
    generate(label) {
        const baseToolPrefix = "mcp_" /* McpToolName.Prefix */ + label.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').slice(0, 18 /* McpToolName.MaxPrefixLen */ - "mcp_" /* McpToolName.Prefix */.length - 1);
        let toolPrefix = baseToolPrefix + '_';
        for (let i = 2; this.seenPrefixes.has(toolPrefix); i++) {
            toolPrefix = baseToolPrefix + i + '_';
        }
        this.seenPrefixes.add(toolPrefix);
        return toolPrefix;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBYyxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXhGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25HLE9B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