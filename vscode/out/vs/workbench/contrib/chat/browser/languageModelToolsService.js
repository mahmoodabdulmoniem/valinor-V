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
var ToolConfirmStore_1;
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { assertNever } from '../../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { ObservableSet } from '../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatToolInvocation } from '../common/chatProgressTypes/chatToolInvocation.js';
import { IChatService } from '../common/chatService.js';
import { ChatConfiguration } from '../common/constants.js';
import { createToolSchemaUri, ToolSet, stringifyPromptTsxPart } from '../common/languageModelToolsService.js';
import { getToolConfirmationAlert } from './chatAccessibilityProvider.js';
const jsonSchemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
let LanguageModelToolsService = class LanguageModelToolsService extends Disposable {
    constructor(_instantiationService, _extensionService, _contextKeyService, _chatService, _dialogService, _telemetryService, _logService, _configurationService, _accessibilityService, _accessibilitySignalService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._dialogService = _dialogService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._onDidChangeTools = new Emitter();
        this.onDidChangeTools = this._onDidChangeTools.event;
        /** Throttle tools updates because it sends all tools and runs on context key updates */
        this._onDidChangeToolsScheduler = new RunOnceScheduler(() => this._onDidChangeTools.fire(), 750);
        this._tools = new Map();
        this._toolContextKeys = new Set();
        this._callsByRequestId = new Map();
        this._memoryToolConfirmStore = new Set();
        this._toolSets = new ObservableSet();
        this.toolSets = this._toolSets.observable;
        this._workspaceToolConfirmStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 1 /* StorageScope.WORKSPACE */)));
        this._profileToolConfirmStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 0 /* StorageScope.PROFILE */)));
        this._register(this._contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._toolContextKeys)) {
                // Not worth it to compute a delta here unless we have many tools changing often
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ExtensionToolsEnabled)) {
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._ctxToolsCount = ChatContextKeys.Tools.toolsCount.bindTo(_contextKeyService);
    }
    dispose() {
        super.dispose();
        this._callsByRequestId.forEach(calls => calls.forEach(call => call.store.dispose()));
        this._ctxToolsCount.reset();
    }
    registerToolData(toolData) {
        if (this._tools.has(toolData.id)) {
            throw new Error(`Tool "${toolData.id}" is already registered.`);
        }
        this._tools.set(toolData.id, { data: toolData });
        this._ctxToolsCount.set(this._tools.size);
        this._onDidChangeToolsScheduler.schedule();
        toolData.when?.keys().forEach(key => this._toolContextKeys.add(key));
        let store;
        if (toolData.inputSchema) {
            store = new DisposableStore();
            const schemaUrl = createToolSchemaUri(toolData.id).toString();
            jsonSchemaRegistry.registerSchema(schemaUrl, toolData.inputSchema, store);
            store.add(jsonSchemaRegistry.registerSchemaAssociation(schemaUrl, `/lm/tool/${toolData.id}/tool_input.json`));
        }
        return toDisposable(() => {
            store?.dispose();
            this._tools.delete(toolData.id);
            this._ctxToolsCount.set(this._tools.size);
            this._refreshAllToolContextKeys();
            this._onDidChangeToolsScheduler.schedule();
        });
    }
    _refreshAllToolContextKeys() {
        this._toolContextKeys.clear();
        for (const tool of this._tools.values()) {
            tool.data.when?.keys().forEach(key => this._toolContextKeys.add(key));
        }
    }
    registerToolImplementation(id, tool) {
        const entry = this._tools.get(id);
        if (!entry) {
            throw new Error(`Tool "${id}" was not contributed.`);
        }
        if (entry.impl) {
            throw new Error(`Tool "${id}" already has an implementation.`);
        }
        entry.impl = tool;
        return toDisposable(() => {
            entry.impl = undefined;
        });
    }
    getTools(includeDisabled) {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesWhenClause = includeDisabled || !toolData.when || this._contextKeyService.contextMatchesRules(toolData.when);
            const satisfiesExternalToolCheck = toolData.source.type !== 'extension' || !!extensionToolsEnabled;
            return satisfiesWhenClause && satisfiesExternalToolCheck;
        });
    }
    getTool(id) {
        return this._getToolEntry(id)?.data;
    }
    _getToolEntry(id) {
        const entry = this._tools.get(id);
        if (entry && (!entry.data.when || this._contextKeyService.contextMatchesRules(entry.data.when))) {
            return entry;
        }
        else {
            return undefined;
        }
    }
    getToolByName(name, includeDisabled) {
        for (const tool of this.getTools(!!includeDisabled)) {
            if (tool.toolReferenceName === name) {
                return tool;
            }
        }
        return undefined;
    }
    setToolAutoConfirmation(toolId, scope, autoConfirm = true) {
        if (scope === 'workspace') {
            this._workspaceToolConfirmStore.value.setAutoConfirm(toolId, autoConfirm);
        }
        else if (scope === 'profile') {
            this._profileToolConfirmStore.value.setAutoConfirm(toolId, autoConfirm);
        }
        else {
            this._memoryToolConfirmStore.add(toolId);
        }
    }
    resetToolAutoConfirmation() {
        this._workspaceToolConfirmStore.value.reset();
        this._profileToolConfirmStore.value.reset();
        this._memoryToolConfirmStore.clear();
    }
    async invokeTool(dto, countTokens, token) {
        this._logService.trace(`[LanguageModelToolsService#invokeTool] Invoking tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}`);
        // When invoking a tool, don't validate the "when" clause. An extension may have invoked a tool just as it was becoming disabled, and just let it go through rather than throw and break the chat.
        let tool = this._tools.get(dto.toolId);
        if (!tool) {
            throw new Error(`Tool ${dto.toolId} was not contributed`);
        }
        if (!tool.impl) {
            await this._extensionService.activateByEvent(`onLanguageModelTool:${dto.toolId}`);
            // Extension should activate and register the tool implementation
            tool = this._tools.get(dto.toolId);
            if (!tool?.impl) {
                throw new Error(`Tool ${dto.toolId} does not have an implementation registered.`);
            }
        }
        // Shortcut to write to the model directly here, but could call all the way back to use the real stream.
        let toolInvocation;
        let requestId;
        let store;
        let toolResult;
        try {
            if (dto.context) {
                store = new DisposableStore();
                const model = this._chatService.getSession(dto.context?.sessionId);
                if (!model) {
                    throw new Error(`Tool called for unknown chat session`);
                }
                const request = model.getRequests().at(-1);
                requestId = request.id;
                dto.modelId = request.modelId;
                // Replace the token with a new token that we can cancel when cancelToolCallsForRequest is called
                if (!this._callsByRequestId.has(requestId)) {
                    this._callsByRequestId.set(requestId, []);
                }
                const trackedCall = { store };
                this._callsByRequestId.get(requestId).push(trackedCall);
                const source = new CancellationTokenSource();
                store.add(toDisposable(() => {
                    source.dispose(true);
                }));
                store.add(token.onCancellationRequested(() => {
                    toolInvocation?.confirmed.complete(false);
                    source.cancel();
                }));
                store.add(source.token.onCancellationRequested(() => {
                    toolInvocation?.confirmed.complete(false);
                }));
                token = source.token;
                const prepared = await this.prepareToolInvocation(tool, dto, token);
                toolInvocation = new ChatToolInvocation(prepared, tool.data, dto.callId);
                trackedCall.invocation = toolInvocation;
                const autoConfirmed = this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace);
                if (autoConfirmed) {
                    toolInvocation.confirmed.complete(true);
                }
                model.acceptResponseProgress(request, toolInvocation);
                if (prepared?.confirmationMessages) {
                    if (!toolInvocation.isConfirmed && !autoConfirmed) {
                        this.playAccessibilitySignal([toolInvocation]);
                    }
                    const userConfirmed = await toolInvocation.confirmed.p;
                    if (!userConfirmed) {
                        throw new CancellationError();
                    }
                    dto.toolSpecificData = toolInvocation?.toolSpecificData;
                    if (dto.toolSpecificData?.kind === 'input') {
                        dto.parameters = dto.toolSpecificData.rawInput;
                        dto.toolSpecificData = undefined;
                    }
                }
            }
            else {
                const prepared = await this.prepareToolInvocation(tool, dto, token);
                if (prepared?.confirmationMessages && !this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace)) {
                    const result = await this._dialogService.confirm({ message: renderAsPlaintext(prepared.confirmationMessages.title), detail: renderAsPlaintext(prepared.confirmationMessages.message) });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            toolResult = await tool.impl.invoke(dto, countTokens, {
                report: step => {
                    toolInvocation?.acceptProgress(step);
                }
            }, token);
            this.ensureToolDetails(dto, toolResult, tool.data);
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result: 'success',
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
            });
            return toolResult;
        }
        catch (err) {
            const result = isCancellationError(err) ? 'userCancelled' : 'error';
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result,
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
            });
            this._logService.error(`[LanguageModelToolsService#invokeTool] Error from tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}:\n${toErrorMessage(err, true)}`);
            toolResult ??= { content: [] };
            toolResult.toolResultError = err instanceof Error ? err.message : String(err);
            if (tool.data.alwaysDisplayInputOutput) {
                toolResult.toolResultDetails = { input: this.formatToolInput(dto), output: [{ isText: true, value: String(err) }], isError: true };
            }
            throw err;
        }
        finally {
            toolInvocation?.complete(toolResult);
            if (requestId && store) {
                this.cleanupCallDisposables(requestId, store);
            }
        }
    }
    async prepareToolInvocation(tool, dto, token) {
        const prepared = tool.impl.prepareToolInvocation ?
            await tool.impl.prepareToolInvocation({
                parameters: dto.parameters,
                chatRequestId: dto.chatRequestId,
                chatSessionId: dto.context?.sessionId,
                chatInteractionId: dto.chatInteractionId
            }, token)
            : undefined;
        if (prepared?.confirmationMessages) {
            if (prepared.toolSpecificData?.kind !== 'terminal' && prepared.toolSpecificData?.kind !== 'terminal2' && typeof prepared.confirmationMessages.allowAutoConfirm !== 'boolean') {
                prepared.confirmationMessages.allowAutoConfirm = true;
            }
            if (!prepared.toolSpecificData && tool.data.alwaysDisplayInputOutput) {
                prepared.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
        }
        return prepared;
    }
    playAccessibilitySignal(toolInvocations) {
        const autoApproved = this._configurationService.getValue('chat.tools.autoApprove');
        if (autoApproved) {
            return;
        }
        const setting = this._configurationService.getValue(AccessibilitySignal.chatUserActionRequired.settingsKey);
        if (!setting) {
            return;
        }
        const soundEnabled = setting.sound === 'on' || (setting.sound === 'auto' && (this._accessibilityService.isScreenReaderOptimized()));
        const announcementEnabled = this._accessibilityService.isScreenReaderOptimized() && setting.announcement === 'auto';
        if (soundEnabled || announcementEnabled) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.chatUserActionRequired, { customAlertMessage: this._instantiationService.invokeFunction(getToolConfirmationAlert, toolInvocations), userGesture: true, modality: !soundEnabled ? 'announcement' : undefined });
        }
    }
    ensureToolDetails(dto, toolResult, toolData) {
        if (!toolResult.toolResultDetails && toolData.alwaysDisplayInputOutput) {
            toolResult.toolResultDetails = {
                input: this.formatToolInput(dto),
                output: this.toolResultToIO(toolResult),
            };
        }
    }
    formatToolInput(dto) {
        return JSON.stringify(dto.parameters, undefined, 2);
    }
    toolResultToIO(toolResult) {
        return toolResult.content.map(part => {
            if (part.kind === 'text') {
                return { isText: true, value: part.value };
            }
            else if (part.kind === 'promptTsx') {
                return { isText: true, value: stringifyPromptTsxPart(part) };
            }
            else if (part.kind === 'data') {
                return { value: encodeBase64(part.value.data), mimeType: part.value.mimeType };
            }
            else {
                assertNever(part);
            }
        });
    }
    shouldAutoConfirm(toolId, runsInWorkspace) {
        if (this._workspaceToolConfirmStore.value.getAutoConfirm(toolId) || this._profileToolConfirmStore.value.getAutoConfirm(toolId) || this._memoryToolConfirmStore.has(toolId)) {
            return true;
        }
        const config = this._configurationService.inspect('chat.tools.autoApprove');
        // If we know the tool runs at a global level, only consider the global config.
        // If we know the tool runs at a workspace level, use those specific settings when appropriate.
        let value = config.value ?? config.defaultValue;
        if (typeof runsInWorkspace === 'boolean') {
            value = config.userLocalValue ?? config.applicationValue;
            if (runsInWorkspace) {
                value = config.workspaceValue ?? config.workspaceFolderValue ?? config.userRemoteValue ?? value;
            }
        }
        return value === true || (typeof value === 'object' && value.hasOwnProperty(toolId) && value[toolId] === true);
    }
    cleanupCallDisposables(requestId, store) {
        const disposables = this._callsByRequestId.get(requestId);
        if (disposables) {
            const index = disposables.findIndex(d => d.store === store);
            if (index > -1) {
                disposables.splice(index, 1);
            }
            if (disposables.length === 0) {
                this._callsByRequestId.delete(requestId);
            }
        }
        store.dispose();
    }
    cancelToolCallsForRequest(requestId) {
        const calls = this._callsByRequestId.get(requestId);
        if (calls) {
            calls.forEach(call => call.store.dispose());
            this._callsByRequestId.delete(requestId);
        }
    }
    toToolEnablementMap(toolOrToolsetNames) {
        const result = {};
        for (const tool of this._tools.values()) {
            if (tool.data.toolReferenceName && toolOrToolsetNames.has(tool.data.toolReferenceName)) {
                result[tool.data.id] = true;
            }
            else {
                result[tool.data.id] = false;
            }
        }
        for (const toolSet of this._toolSets) {
            if (toolOrToolsetNames.has(toolSet.referenceName)) {
                for (const tool of toolSet.getTools()) {
                    result[tool.id] = true;
                }
            }
        }
        return result;
    }
    /**
     * Create a map that contains all tools and toolsets with their enablement state.
     * @param toolOrToolSetNames A list of tool or toolset names to check for enablement. If undefined, all tools and toolsets are enabled.
     * @returns A map of tool or toolset instances to their enablement state.
     */
    toToolAndToolSetEnablementMap(enabledToolOrToolSetNames) {
        const toolOrToolSetNames = enabledToolOrToolSetNames ? new Set(enabledToolOrToolSetNames) : undefined;
        const result = new Map();
        for (const tool of this.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                result.set(tool, toolOrToolSetNames === undefined || toolOrToolSetNames.has(tool.toolReferenceName ?? tool.displayName));
            }
        }
        for (const toolSet of this._toolSets) {
            const enabled = toolOrToolSetNames === undefined || toolOrToolSetNames.has(toolSet.referenceName);
            result.set(toolSet, enabled);
            // if a mcp toolset is enabled, all tools in it are enabled
            if (enabled && toolSet.source.type === 'mcp') {
                for (const tool of toolSet.getTools()) {
                    if (tool.canBeReferencedInPrompt) {
                        result.set(tool, enabled);
                    }
                }
            }
        }
        return result;
    }
    getToolSet(id) {
        for (const toolSet of this._toolSets) {
            if (toolSet.id === id) {
                return toolSet;
            }
        }
        return undefined;
    }
    getToolSetByName(name) {
        for (const toolSet of this._toolSets) {
            if (toolSet.referenceName === name) {
                return toolSet;
            }
        }
        return undefined;
    }
    createToolSet(source, id, referenceName, options) {
        const that = this;
        const result = new class extends ToolSet {
            dispose() {
                if (that._toolSets.has(result)) {
                    this._tools.clear();
                    that._toolSets.delete(result);
                }
            }
        }(id, referenceName, options?.icon ?? Codicon.tools, source, options?.description);
        this._toolSets.add(result);
        return result;
    }
};
LanguageModelToolsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService),
    __param(3, IChatService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService),
    __param(9, IAccessibilitySignalService)
], LanguageModelToolsService);
export { LanguageModelToolsService };
let ToolConfirmStore = class ToolConfirmStore extends Disposable {
    static { ToolConfirmStore_1 = this; }
    static { this.STORED_KEY = 'chat/autoconfirm'; }
    constructor(_scope, storageService) {
        super();
        this._scope = _scope;
        this.storageService = storageService;
        this._autoConfirmTools = new LRUCache(100);
        this._didChange = false;
        const stored = storageService.getObject(ToolConfirmStore_1.STORED_KEY, this._scope);
        if (stored) {
            for (const key of stored) {
                this._autoConfirmTools.set(key, true);
            }
        }
        this._register(storageService.onWillSaveState(() => {
            if (this._didChange) {
                this.storageService.store(ToolConfirmStore_1.STORED_KEY, [...this._autoConfirmTools.keys()], this._scope, 1 /* StorageTarget.MACHINE */);
                this._didChange = false;
            }
        }));
    }
    reset() {
        this._autoConfirmTools.clear();
        this._didChange = true;
    }
    getAutoConfirm(toolId) {
        if (this._autoConfirmTools.get(toolId)) {
            this._didChange = true;
            return true;
        }
        return false;
    }
    setAutoConfirm(toolId, autoConfirm) {
        if (autoConfirm) {
            this._autoConfirmTools.set(toolId, true);
        }
        else {
            this._autoConfirmTools.delete(toolId);
        }
        this._didChange = true;
    }
};
ToolConfirmStore = ToolConfirmStore_1 = __decorate([
    __param(1, IStorageService)
], ToolConfirmStore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVu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