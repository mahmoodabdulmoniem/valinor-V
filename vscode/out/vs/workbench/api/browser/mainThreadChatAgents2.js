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
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { Range } from '../../../editor/common/core/range.js';
import { getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IChatWidgetService } from '../../contrib/chat/browser/chat.js';
import { AddDynamicVariableAction } from '../../contrib/chat/browser/contrib/chatDynamicVariables.js';
import { IChatAgentService } from '../../contrib/chat/common/chatAgents.js';
import { IChatEditingService } from '../../contrib/chat/common/chatEditingService.js';
import { ChatRequestAgentPart } from '../../contrib/chat/common/chatParserTypes.js';
import { ChatRequestParser } from '../../contrib/chat/common/chatRequestParser.js';
import { IChatService } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../../contrib/chat/common/constants.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
export class MainThreadChatTask {
    get onDidAddProgress() { return this._onDidAddProgress.event; }
    constructor(content) {
        this.content = content;
        this.kind = 'progressTask';
        this.deferred = new DeferredPromise();
        this._onDidAddProgress = new Emitter();
        this.progress = [];
    }
    task() {
        return this.deferred.p;
    }
    isSettled() {
        return this.deferred.isSettled;
    }
    complete(v) {
        this.deferred.complete(v);
    }
    add(progress) {
        this.progress.push(progress);
        this._onDidAddProgress.fire(progress);
    }
    toJSON() {
        return {
            kind: 'progressTaskSerialized',
            content: this.content,
            progress: this.progress
        };
    }
}
let MainThreadChatAgents2 = class MainThreadChatAgents2 extends Disposable {
    constructor(extHostContext, _chatAgentService, _chatService, _chatEditingService, _languageFeaturesService, _chatWidgetService, _instantiationService, _logService, _extensionService, _uriIdentityService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._chatService = _chatService;
        this._chatEditingService = _chatEditingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._extensionService = _extensionService;
        this._uriIdentityService = _uriIdentityService;
        this._agents = this._register(new DisposableMap());
        this._agentCompletionProviders = this._register(new DisposableMap());
        this._agentIdsToCompletionProviders = this._register(new DisposableMap);
        this._chatParticipantDetectionProviders = this._register(new DisposableMap());
        this._chatRelatedFilesProviders = this._register(new DisposableMap());
        this._pendingProgress = new Map();
        this._activeTasks = new Map();
        this._unresolvedAnchors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatAgents2);
        this._register(this._chatService.onDidDisposeSession(e => {
            this._proxy.$releaseSession(e.sessionId);
        }));
        this._register(this._chatService.onDidPerformUserAction(e => {
            if (typeof e.agentId === 'string') {
                for (const [handle, agent] of this._agents) {
                    if (agent.id === e.agentId) {
                        if (e.action.kind === 'vote') {
                            this._proxy.$acceptFeedback(handle, e.result ?? {}, e.action);
                        }
                        else {
                            this._proxy.$acceptAction(handle, e.result || {}, e);
                        }
                        break;
                    }
                }
            }
        }));
    }
    $unregisterAgent(handle) {
        this._agents.deleteAndDispose(handle);
    }
    $transferActiveChatSession(toWorkspace) {
        const widget = this._chatWidgetService.lastFocusedWidget;
        const sessionId = widget?.viewModel?.model.sessionId;
        if (!sessionId) {
            this._logService.error(`MainThreadChat#$transferActiveChatSession: No active chat session found`);
            return;
        }
        const inputValue = widget?.inputEditor.getValue() ?? '';
        const location = widget.location;
        const mode = widget.input.currentModeKind;
        this._chatService.transferChatSession({ sessionId, inputValue, location, mode }, URI.revive(toWorkspace));
    }
    async $registerAgent(handle, extension, id, metadata, dynamicProps) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const staticAgentRegistration = this._chatAgentService.getAgent(id, true);
        if (!staticAgentRegistration && !dynamicProps) {
            if (this._chatAgentService.getAgentsByName(id).length) {
                // Likely some extension authors will not adopt the new ID, so give a hint if they register a
                // participant by name instead of ID.
                throw new Error(`chatParticipant must be declared with an ID in package.json. The "id" property may be missing! "${id}"`);
            }
            throw new Error(`chatParticipant must be declared in package.json: ${id}`);
        }
        const impl = {
            invoke: async (request, progress, history, token) => {
                this._pendingProgress.set(request.requestId, progress);
                try {
                    return await this._proxy.$invokeAgent(handle, request, { history }, token) ?? {};
                }
                finally {
                    this._pendingProgress.delete(request.requestId);
                }
            },
            setRequestTools: (requestId, tools) => {
                this._proxy.$setRequestTools(requestId, tools);
            },
            setRequestPaused: (requestId, isPaused) => {
                this._proxy.$setRequestPaused(handle, requestId, isPaused);
            },
            provideFollowups: async (request, result, history, token) => {
                if (!this._agents.get(handle)?.hasFollowups) {
                    return [];
                }
                return this._proxy.$provideFollowups(request, handle, result, { history }, token);
            },
            provideChatTitle: (history, token) => {
                return this._proxy.$provideChatTitle(handle, history, token);
            },
            provideChatSummary: (history, token) => {
                return this._proxy.$provideChatSummary(handle, history, token);
            },
        };
        let disposable;
        if (!staticAgentRegistration && dynamicProps) {
            const extensionDescription = this._extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension));
            disposable = this._chatAgentService.registerDynamicAgent({
                id,
                name: dynamicProps.name,
                description: dynamicProps.description,
                extensionId: extension,
                extensionDisplayName: extensionDescription?.displayName ?? extension.value,
                extensionPublisherId: extensionDescription?.publisher ?? '',
                publisherDisplayName: dynamicProps.publisherName,
                fullName: dynamicProps.fullName,
                metadata: revive(metadata),
                slashCommands: [],
                disambiguation: [],
                locations: [ChatAgentLocation.Panel],
                modes: [ChatModeKind.Ask, ChatModeKind.Agent, ChatModeKind.Edit],
            }, impl);
        }
        else {
            disposable = this._chatAgentService.registerAgentImplementation(id, impl);
        }
        this._agents.set(handle, {
            id: id,
            extensionId: extension,
            dispose: disposable.dispose,
            hasFollowups: metadata.hasFollowups
        });
    }
    async $updateAgent(handle, metadataUpdate) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const data = this._agents.get(handle);
        if (!data) {
            this._logService.error(`MainThreadChatAgents2#$updateAgent: No agent with handle ${handle} registered`);
            return;
        }
        data.hasFollowups = metadataUpdate.hasFollowups;
        this._chatAgentService.updateAgent(data.id, revive(metadataUpdate));
    }
    async $handleProgressChunk(requestId, chunks) {
        const chatProgressParts = [];
        chunks.forEach(item => {
            const [progress, responsePartHandle] = Array.isArray(item) ? item : [item];
            const revivedProgress = progress.kind === 'notebookEdit'
                ? ChatNotebookEdit.fromChatEdit(progress)
                : revive(progress);
            if (revivedProgress.kind === 'notebookEdit'
                || revivedProgress.kind === 'textEdit'
                || revivedProgress.kind === 'codeblockUri') {
                // make sure to use the canonical uri
                revivedProgress.uri = this._uriIdentityService.asCanonicalUri(revivedProgress.uri);
            }
            if (responsePartHandle !== undefined) {
                if (revivedProgress.kind === 'progressTask') {
                    const handle = responsePartHandle;
                    const responsePartId = `${requestId}_${handle}`;
                    const task = new MainThreadChatTask(revivedProgress.content);
                    this._activeTasks.set(responsePartId, task);
                    chatProgressParts.push(task);
                    return;
                }
                else if (responsePartHandle !== undefined) {
                    const responsePartId = `${requestId}_${responsePartHandle}`;
                    const task = this._activeTasks.get(responsePartId);
                    switch (revivedProgress.kind) {
                        case 'progressTaskResult':
                            if (task && revivedProgress.content) {
                                task.complete(revivedProgress.content.value);
                                this._activeTasks.delete(responsePartId);
                            }
                            else {
                                task?.complete(undefined);
                            }
                            return;
                        case 'warning':
                        case 'reference':
                            task?.add(revivedProgress);
                            return;
                    }
                }
            }
            if (revivedProgress.kind === 'inlineReference' && revivedProgress.resolveId) {
                if (!this._unresolvedAnchors.has(requestId)) {
                    this._unresolvedAnchors.set(requestId, new Map());
                }
                this._unresolvedAnchors.get(requestId)?.set(revivedProgress.resolveId, revivedProgress);
            }
            chatProgressParts.push(revivedProgress);
        });
        this._pendingProgress.get(requestId)?.(chatProgressParts);
    }
    $handleAnchorResolve(requestId, handle, resolveAnchor) {
        const anchor = this._unresolvedAnchors.get(requestId)?.get(handle);
        if (!anchor) {
            return;
        }
        this._unresolvedAnchors.get(requestId)?.delete(handle);
        if (resolveAnchor) {
            const revivedAnchor = revive(resolveAnchor);
            anchor.inlineReference = revivedAnchor.inlineReference;
        }
    }
    $registerAgentCompletionsProvider(handle, id, triggerCharacters) {
        const provide = async (query, token) => {
            const completions = await this._proxy.$invokeCompletionProvider(handle, query, token);
            return completions.map((c) => ({ ...c, icon: c.icon ? ThemeIcon.fromId(c.icon) : undefined }));
        };
        this._agentIdsToCompletionProviders.set(id, this._chatAgentService.registerAgentCompletionProvider(id, provide));
        this._agentCompletionProviders.set(handle, this._languageFeaturesService.completionProvider.register({ scheme: Schemas.vscodeChatInput, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentCompletions:' + handle,
            triggerCharacters,
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this._chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const triggerCharsPart = triggerCharacters.map(c => escapeRegExpCharacters(c)).join('');
                const wordRegex = new RegExp(`[${triggerCharsPart}]\\S*`, 'g');
                const query = getWordAtText(position.column, wordRegex, model.getLineContent(position.lineNumber), 0)?.word ?? '';
                if (query && !triggerCharacters.some(c => query.startsWith(c))) {
                    return;
                }
                const parsedRequest = this._instantiationService.createInstance(ChatRequestParser).parseChatRequest(widget.viewModel.sessionId, model.getValue()).parts;
                const agentPart = parsedRequest.find((part) => part instanceof ChatRequestAgentPart);
                const thisAgentId = this._agents.get(handle)?.id;
                if (agentPart?.agent.id !== thisAgentId) {
                    return;
                }
                const range = computeCompletionRanges(model, position, wordRegex);
                if (!range) {
                    return null;
                }
                const result = await provide(query, token);
                const variableItems = result.map(v => {
                    const insertText = v.insertText ?? (typeof v.label === 'string' ? v.label : v.label.label);
                    const rangeAfterInsert = new Range(range.insert.startLineNumber, range.insert.startColumn, range.insert.endLineNumber, range.insert.startColumn + insertText.length);
                    return {
                        label: v.label,
                        range,
                        insertText: insertText + ' ',
                        kind: 18 /* CompletionItemKind.Text */,
                        detail: v.detail,
                        documentation: v.documentation,
                        command: { id: AddDynamicVariableAction.ID, title: '', arguments: [{ id: v.id, widget, range: rangeAfterInsert, variableData: revive(v.value), command: v.command }] }
                    };
                });
                return {
                    suggestions: variableItems
                };
            }
        }));
    }
    $unregisterAgentCompletionsProvider(handle, id) {
        this._agentCompletionProviders.deleteAndDispose(handle);
        this._agentIdsToCompletionProviders.deleteAndDispose(id);
    }
    $registerChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.set(handle, this._chatAgentService.registerChatParticipantDetectionProvider(handle, {
            provideParticipantDetection: async (request, history, options, token) => {
                return await this._proxy.$detectChatParticipant(handle, request, { history }, options, token);
            }
        }));
    }
    $unregisterChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.deleteAndDispose(handle);
    }
    $registerRelatedFilesProvider(handle, metadata) {
        this._chatRelatedFilesProviders.set(handle, this._chatEditingService.registerRelatedFilesProvider(handle, {
            description: metadata.description,
            provideRelatedFiles: async (request, token) => {
                return (await this._proxy.$provideRelatedFiles(handle, request, token))?.map((v) => ({ uri: URI.from(v.uri), description: v.description })) ?? [];
            }
        }));
    }
    $unregisterRelatedFilesProvider(handle) {
        this._chatRelatedFilesProviders.deleteAndDispose(handle);
    }
};
MainThreadChatAgents2 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatAgents2),
    __param(1, IChatAgentService),
    __param(2, IChatService),
    __param(3, IChatEditingService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IInstantiationService),
    __param(7, ILogService),
    __param(8, IExtensionService),
    __param(9, IUriIdentityService)
], MainThreadChatAgents2);
export { MainThreadChatAgents2 };
function computeCompletionRanges(model, position, reg) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace };
}
var ChatNotebookEdit;
(function (ChatNotebookEdit) {
    function fromChatEdit(part) {
        return {
            kind: 'notebookEdit',
            uri: URI.revive(part.uri),
            done: part.done,
            edits: part.edits.map(NotebookDto.fromCellEditOperationDto)
        };
    }
    ChatNotebookEdit.fromChatEdit = fromChatEdit;
})(ChatNotebookEdit || (ChatNotebookEdit = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENoYXRBZ2VudHMyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFD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