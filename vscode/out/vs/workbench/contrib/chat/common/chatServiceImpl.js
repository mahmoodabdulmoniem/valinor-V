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
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { autorun, derived, ObservableMap } from '../../../../base/common/observable.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatModel, ChatRequestModel, normalizeSerializableChatData, toChatHistoryContent, updateRanges } from './chatModel.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, chatSubcommandLeader, getPromptText } from './chatParserTypes.js';
import { ChatRequestParser } from './chatRequestParser.js';
import { ChatServiceTelemetry } from './chatServiceTelemetry.js';
import { ChatSessionStore } from './chatSessionStore.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatTransferService } from './chatTransferService.js';
import { isImageVariableEntry } from './chatVariableEntries.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from './constants.js';
import { ILanguageModelsService } from './languageModels.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const serializedChatKey = 'interactive.sessions';
const globalChatKey = 'chat.workspaceTransfer';
const SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS = 1000 * 60;
const maxPersistedSessions = 25;
let CancellableRequest = class CancellableRequest {
    constructor(cancellationTokenSource, requestId, toolsService) {
        this.cancellationTokenSource = cancellationTokenSource;
        this.requestId = requestId;
        this.toolsService = toolsService;
    }
    dispose() {
        this.cancellationTokenSource.dispose();
    }
    cancel() {
        if (this.requestId) {
            this.toolsService.cancelToolCallsForRequest(this.requestId);
        }
        this.cancellationTokenSource.cancel();
    }
};
CancellableRequest = __decorate([
    __param(2, ILanguageModelToolsService)
], CancellableRequest);
let ChatService = class ChatService extends Disposable {
    get transferredSessionData() {
        return this._transferredSessionData;
    }
    get useFileStorage() {
        return this.configurationService.getValue(ChatConfiguration.UseFileStorage);
    }
    get edits2Enabled() {
        return this.configurationService.getValue(ChatConfiguration.Edits2Enabled);
    }
    get isEmptyWindow() {
        const workspace = this.workspaceContextService.getWorkspace();
        return !workspace.configuration && workspace.folders.length === 0;
    }
    constructor(storageService, logService, extensionService, instantiationService, telemetryService, workspaceContextService, chatSlashCommandService, chatAgentService, configurationService, chatTransferService, languageModelsService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.chatTransferService = chatTransferService;
        this.languageModelsService = languageModelsService;
        this._sessionModels = new ObservableMap();
        this._pendingRequests = this._register(new DisposableMap());
        /** Just for empty windows, need to enforce that a chat was deleted, even though other windows still have it */
        this._deletedChatIds = new Set();
        this._onDidSubmitRequest = this._register(new Emitter());
        this.onDidSubmitRequest = this._onDidSubmitRequest.event;
        this._onDidPerformUserAction = this._register(new Emitter());
        this.onDidPerformUserAction = this._onDidPerformUserAction.event;
        this._onDidDisposeSession = this._register(new Emitter());
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this._sessionFollowupCancelTokens = this._register(new DisposableMap());
        this._chatServiceTelemetry = this.instantiationService.createInstance(ChatServiceTelemetry);
        const sessionData = storageService.get(serializedChatKey, this.isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */, '');
        if (sessionData) {
            this._persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(this._persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            this._persistedSessions = {};
        }
        const transferredData = this.getTransferredSessionData();
        const transferredChat = transferredData?.chat;
        if (transferredChat) {
            this.trace('constructor', `Transferred session ${transferredChat.sessionId}`);
            this._persistedSessions[transferredChat.sessionId] = transferredChat;
            this._transferredSessionData = {
                sessionId: transferredChat.sessionId,
                inputValue: transferredData.inputValue,
                location: transferredData.location,
                mode: transferredData.mode,
            };
        }
        this._chatSessionStore = this._register(this.instantiationService.createInstance(ChatSessionStore));
        if (this.useFileStorage) {
            this._chatSessionStore.migrateDataIfNeeded(() => this._persistedSessions);
        }
        this._register(storageService.onWillSaveState(() => this.saveState()));
        this.requestInProgressObs = derived(reader => {
            const models = this._sessionModels.observable.read(reader).values();
            return Array.from(models).some(model => model.requestInProgressObs.read(reader));
        });
    }
    isEnabled(location) {
        return this.chatAgentService.getContributedDefaultAgent(location) !== undefined;
    }
    saveState() {
        const liveChats = Array.from(this._sessionModels.values())
            .filter(session => session.initialLocation === ChatAgentLocation.Panel);
        if (this.useFileStorage) {
            this._chatSessionStore.storeSessions(liveChats);
        }
        else {
            if (this.isEmptyWindow) {
                this.syncEmptyWindowChats(liveChats);
            }
            else {
                let allSessions = liveChats;
                allSessions = allSessions.concat(Object.values(this._persistedSessions)
                    .filter(session => !this._sessionModels.has(session.sessionId))
                    .filter(session => session.requests.length));
                allSessions.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
                allSessions = allSessions.slice(0, maxPersistedSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${allSessions.length} sessions`);
                }
                const serialized = JSON.stringify(allSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${serialized.length} chars`);
                }
                this.storageService.store(serializedChatKey, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        this._deletedChatIds.clear();
    }
    syncEmptyWindowChats(thisWindowChats) {
        // Note- an unavoidable race condition exists here. If there are multiple empty windows open, and the user quits the application, then the focused
        // window may lose active chats, because all windows are reading and writing to storageService at the same time. This can't be fixed without some
        // kind of locking, but in reality, the focused window will likely have run `saveState` at some point, like on a window focus change, and it will
        // generally be fine.
        const sessionData = this.storageService.get(serializedChatKey, -1 /* StorageScope.APPLICATION */, '');
        const originalPersistedSessions = this._persistedSessions;
        let persistedSessions;
        if (sessionData) {
            persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            persistedSessions = {};
        }
        this._deletedChatIds.forEach(id => delete persistedSessions[id]);
        // Has the chat in this window been updated, and then closed? Overwrite the old persisted chats.
        Object.values(originalPersistedSessions).forEach(session => {
            const persistedSession = persistedSessions[session.sessionId];
            if (persistedSession && session.requests.length > persistedSession.requests.length) {
                // We will add a 'modified date' at some point, but comparing the number of requests is good enough
                persistedSessions[session.sessionId] = session;
            }
            else if (!persistedSession && session.isNew) {
                // This session was created in this window, and hasn't been persisted yet
                session.isNew = false;
                persistedSessions[session.sessionId] = session;
            }
        });
        this._persistedSessions = persistedSessions;
        // Add this window's active chat models to the set to persist.
        // Having the same session open in two empty windows at the same time can lead to data loss, this is acceptable
        const allSessions = { ...this._persistedSessions };
        for (const chat of thisWindowChats) {
            allSessions[chat.sessionId] = chat;
        }
        let sessionsList = Object.values(allSessions);
        sessionsList.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
        sessionsList = sessionsList.slice(0, maxPersistedSessions);
        const data = JSON.stringify(sessionsList);
        this.storageService.store(serializedChatKey, data, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    notifyUserAction(action) {
        this._chatServiceTelemetry.notifyUserAction(action);
        this._onDidPerformUserAction.fire(action);
        if (action.action.kind === 'chatEditingSessionAction') {
            const model = this._sessionModels.get(action.sessionId);
            if (model) {
                model.notifyEditingAction(action.action);
            }
        }
    }
    async setChatSessionTitle(sessionId, title) {
        const model = this._sessionModels.get(sessionId);
        if (model) {
            model.setCustomTitle(title);
            return;
        }
        if (this.useFileStorage) {
            await this._chatSessionStore.setSessionTitle(sessionId, title);
            return;
        }
        const session = this._persistedSessions[sessionId];
        if (session) {
            session.customTitle = title;
        }
    }
    trace(method, message) {
        if (message) {
            this.logService.trace(`ChatService#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatService#${method}`);
        }
    }
    error(method, message) {
        this.logService.error(`ChatService#${method} ${message}`);
    }
    deserializeChats(sessionData) {
        try {
            const arrayOfSessions = revive(JSON.parse(sessionData)); // Revive serialized URIs in session data
            if (!Array.isArray(arrayOfSessions)) {
                throw new Error('Expected array');
            }
            const sessions = arrayOfSessions.reduce((acc, session) => {
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                acc[session.sessionId] = normalizeSerializableChatData(session);
                return acc;
            }, {});
            return sessions;
        }
        catch (err) {
            this.error('deserializeChats', `Malformed session data: ${err}. [${sessionData.substring(0, 20)}${sessionData.length > 20 ? '...' : ''}]`);
            return {};
        }
    }
    getTransferredSessionData() {
        const data = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        const workspaceUri = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!workspaceUri) {
            return;
        }
        const thisWorkspace = workspaceUri.toString();
        const currentTime = Date.now();
        // Only use transferred data if it was created recently
        const transferred = data.find(item => URI.revive(item.toWorkspace).toString() === thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        // Keep data that isn't for the current workspace and that hasn't expired yet
        const filtered = data.filter(item => URI.revive(item.toWorkspace).toString() !== thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        this.storageService.store(globalChatKey, JSON.stringify(filtered), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return transferred;
    }
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     */
    async getHistory() {
        if (this.useFileStorage) {
            const liveSessionItems = Array.from(this._sessionModels.values())
                .filter(session => !session.isImported)
                .map(session => {
                const title = session.title || localize('newChat', "New Chat");
                return {
                    sessionId: session.sessionId,
                    title,
                    lastMessageDate: session.lastMessageDate,
                    isActive: true,
                };
            });
            const index = await this._chatSessionStore.getIndex();
            const entries = Object.values(index)
                .filter(entry => !this._sessionModels.has(entry.sessionId) && !entry.isImported && !entry.isEmpty)
                .map((entry) => ({
                ...entry,
                isActive: this._sessionModels.has(entry.sessionId),
            }));
            return [...liveSessionItems, ...entries];
        }
        const persistedSessions = Object.values(this._persistedSessions)
            .filter(session => session.requests.length > 0)
            .filter(session => !this._sessionModels.has(session.sessionId));
        const persistedSessionItems = persistedSessions
            .filter(session => !session.isImported)
            .map(session => {
            const title = session.customTitle ?? ChatModel.getDefaultTitle(session.requests);
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: false,
            };
        });
        const liveSessionItems = Array.from(this._sessionModels.values())
            .filter(session => !session.isImported)
            .map(session => {
            const title = session.title || localize('newChat', "New Chat");
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: true,
            };
        });
        return [...liveSessionItems, ...persistedSessionItems];
    }
    async removeHistoryEntry(sessionId) {
        if (this.useFileStorage) {
            await this._chatSessionStore.deleteSession(sessionId);
            return;
        }
        if (this._persistedSessions[sessionId]) {
            this._deletedChatIds.add(sessionId);
            delete this._persistedSessions[sessionId];
            this.saveState();
        }
    }
    async clearAllHistoryEntries() {
        if (this.useFileStorage) {
            await this._chatSessionStore.clearAllSessions();
            return;
        }
        Object.values(this._persistedSessions).forEach(session => this._deletedChatIds.add(session.sessionId));
        this._persistedSessions = {};
        this.saveState();
    }
    startSession(location, token, isGlobalEditingSession = true) {
        this.trace('startSession');
        return this._startSession(undefined, location, isGlobalEditingSession, token);
    }
    _startSession(someSessionHistory, location, isGlobalEditingSession, token) {
        const model = this.instantiationService.createInstance(ChatModel, someSessionHistory, location);
        if (location === ChatAgentLocation.Panel) {
            model.startEditingSession(isGlobalEditingSession);
        }
        this._sessionModels.set(model.sessionId, model);
        this.initializeSession(model, token);
        return model;
    }
    initializeSession(model, token) {
        this.trace('initializeSession', `Initialize session ${model.sessionId}`);
        // Activate the default extension provided agent but do not wait
        // for it to be ready so that the session can be used immediately
        // without having to wait for the agent to be ready.
        this.activateDefaultAgent(model.initialLocation).catch(e => this.logService.error(e));
    }
    async activateDefaultAgent(location) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const defaultAgentData = this.chatAgentService.getContributedDefaultAgent(location) ?? this.chatAgentService.getContributedDefaultAgent(ChatAgentLocation.Panel);
        if (!defaultAgentData) {
            throw new ErrorNoTelemetry('No default agent contributed');
        }
        // Await activation of the extension provided agent
        // Using `activateById` as workaround for the issue
        // https://github.com/microsoft/vscode/issues/250590
        if (!defaultAgentData.isCore) {
            await this.extensionService.activateById(defaultAgentData.extensionId, {
                activationEvent: `onChatParticipant:${defaultAgentData.id}`,
                extensionId: defaultAgentData.extensionId,
                startup: false
            });
        }
        const defaultAgent = this.chatAgentService.getActivatedAgents().find(agent => agent.id === defaultAgentData.id);
        if (!defaultAgent) {
            throw new ErrorNoTelemetry('No default agent registered');
        }
    }
    getSession(sessionId) {
        return this._sessionModels.get(sessionId);
    }
    async getOrRestoreSession(sessionId) {
        this.trace('getOrRestoreSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (model) {
            return model;
        }
        let sessionData;
        if (!this.useFileStorage || this.transferredSessionData?.sessionId === sessionId) {
            sessionData = revive(this._persistedSessions[sessionId]);
        }
        else {
            sessionData = revive(await this._chatSessionStore.readSession(sessionId));
        }
        if (!sessionData) {
            return undefined;
        }
        const session = this._startSession(sessionData, sessionData.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
        const isTransferred = this.transferredSessionData?.sessionId === sessionId;
        if (isTransferred) {
            // TODO
            // this.chatAgentService.toggleToolsAgentMode(this.transferredSessionData.toolsAgentModeEnabled);
            this._transferredSessionData = undefined;
        }
        return session;
    }
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionId) {
        const session = this._persistedSessions[sessionId];
        if (session) {
            return session.requests.length === 0;
        }
        return this._chatSessionStore.isSessionEmpty(sessionId);
    }
    loadSessionFromContent(data) {
        return this._startSession(data, data.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
    }
    async resendRequest(request, options) {
        const model = this._sessionModels.get(request.session.sessionId);
        if (!model && model !== request.session) {
            throw new Error(`Unknown session: ${request.session.sessionId}`);
        }
        const cts = this._pendingRequests.get(request.session.sessionId);
        if (cts) {
            this.trace('resendRequest', `Session ${request.session.sessionId} already has a pending request, cancelling...`);
            cts.cancel();
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const enableCommandDetection = !options?.noCommandDetection;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        model.removeRequest(request.id, 1 /* ChatRequestRemovalReason.Resend */);
        const resendOptions = {
            ...options,
            locationData: request.locationData,
            attachedContext: request.attachedContext,
        };
        await this._sendRequestAsync(model, model.sessionId, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions).responseCompletePromise;
    }
    async sendRequest(sessionId, request, options) {
        this.trace('sendRequest', `sessionId: ${sessionId}, message: ${request.substring(0, 20)}${request.length > 20 ? '[...]' : ''}}`);
        if (!request.trim() && !options?.slashCommand && !options?.agentId) {
            this.trace('sendRequest', 'Rejected empty message');
            return;
        }
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        if (this._pendingRequests.has(sessionId)) {
            this.trace('sendRequest', `Session ${sessionId} already has a pending request`);
            return;
        }
        const requests = model.getRequests();
        for (let i = requests.length - 1; i >= 0; i -= 1) {
            const request = requests[i];
            if (request.shouldBeRemovedOnSend) {
                if (request.shouldBeRemovedOnSend.afterUndoStop) {
                    request.response?.finalizeUndoState();
                }
                else {
                    await this.removeRequest(sessionId, request.id);
                }
            }
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        const parsedRequest = this.parseChatRequest(sessionId, request, location, options);
        const agent = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart)?.agent ?? defaultAgent;
        const agentSlashCommandPart = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        // This method is only returning whether the request was accepted - don't block on the actual request
        return {
            ...this._sendRequestAsync(model, sessionId, parsedRequest, attempt, !options?.noCommandDetection, defaultAgent, location, options),
            agent,
            slashCommand: agentSlashCommandPart?.command,
        };
    }
    parseChatRequest(sessionId, request, location, options) {
        let parserContext = options?.parserContext;
        if (options?.agentId) {
            const agent = this.chatAgentService.getAgent(options.agentId);
            if (!agent) {
                throw new Error(`Unknown agent: ${options.agentId}`);
            }
            parserContext = { selectedAgent: agent, mode: options.mode };
            const commandPart = options.slashCommand ? ` ${chatSubcommandLeader}${options.slashCommand}` : '';
            request = `${chatAgentLeader}${agent.name}${commandPart} ${request}`;
        }
        const parsedRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionId, request, location, parserContext);
        return parsedRequest;
    }
    refreshFollowupsCancellationToken(sessionId) {
        this._sessionFollowupCancelTokens.get(sessionId)?.cancel();
        const newTokenSource = new CancellationTokenSource();
        this._sessionFollowupCancelTokens.set(sessionId, newTokenSource);
        return newTokenSource.token;
    }
    _sendRequestAsync(model, sessionId, parsedRequest, attempt, enableCommandDetection, defaultAgent, location, options) {
        const followupsCancelToken = this.refreshFollowupsCancellationToken(sessionId);
        let request;
        const agentPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart);
        const agentSlashCommandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        const commandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestSlashCommandPart);
        const requests = [...model.getRequests()];
        let gotProgress = false;
        const requestType = commandPart ? 'slashCommand' : 'string';
        const responseCreated = new DeferredPromise();
        let responseCreatedComplete = false;
        function completeResponseCreated() {
            if (!responseCreatedComplete && request?.response) {
                responseCreated.complete(request.response);
                responseCreatedComplete = true;
            }
        }
        const store = new DisposableStore();
        const source = store.add(new CancellationTokenSource());
        const token = source.token;
        const sendRequestInternal = async () => {
            const progressCallback = (progress) => {
                if (token.isCancellationRequested) {
                    return;
                }
                gotProgress = true;
                for (let i = 0; i < progress.length; i++) {
                    const isLast = i === progress.length - 1;
                    const progressItem = progress[i];
                    if (progressItem.kind === 'markdownContent') {
                        this.trace('sendRequest', `Provider returned progress for session ${model.sessionId}, ${progressItem.content.value.length} chars`);
                    }
                    else {
                        this.trace('sendRequest', `Provider returned progress: ${JSON.stringify(progressItem)}`);
                    }
                    model.acceptResponseProgress(request, progressItem, !isLast);
                }
                completeResponseCreated();
            };
            let detectedAgent;
            let detectedCommand;
            const stopWatch = new StopWatch(false);
            store.add(token.onCancellationRequested(() => {
                this.trace('sendRequest', `Request for session ${model.sessionId} was cancelled`);
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    // Normally timings happen inside the EH around the actual provider. For cancellation we can measure how long the user waited before cancelling
                    totalTime: stopWatch.elapsed(),
                    result: 'cancelled',
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: request?.response?.codeCitations.length ?? 0,
                    numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                    isParticipantDetected: !!detectedAgent,
                    enableCommandDetection,
                    attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
                    model: this.resolveModelId(options?.userSelectedModelId),
                });
                model.cancelRequest(request);
            }));
            try {
                let rawResult;
                let agentOrCommandFollowups = undefined;
                let chatTitlePromise;
                if (agentPart || (defaultAgent && !commandPart)) {
                    const prepareChatAgentRequest = (agent, command, enableCommandDetection, chatRequest, isParticipantDetected) => {
                        const initVariableData = { variables: [] };
                        request = chatRequest ?? model.addRequest(parsedRequest, initVariableData, attempt, agent, command, options?.confirmation, options?.locationData, options?.attachedContext, undefined, options?.userSelectedModelId);
                        let variableData;
                        let message;
                        if (chatRequest) {
                            variableData = chatRequest.variableData;
                            message = getPromptText(request.message).message;
                        }
                        else {
                            variableData = { variables: this.prepareContext(request.attachedContext) };
                            model.updateRequest(request, variableData);
                            const promptTextResult = getPromptText(request.message);
                            variableData = updateRanges(variableData, promptTextResult.diff); // TODO bit of a hack
                            message = promptTextResult.message;
                        }
                        let isInitialTools = true;
                        store.add(autorun(reader => {
                            const tools = options?.userSelectedTools?.read(reader);
                            if (isInitialTools) {
                                isInitialTools = false;
                                return;
                            }
                            if (tools) {
                                this.chatAgentService.setRequestTools(agent.id, request.id, { userSelectedTools: tools });
                            }
                        }));
                        return {
                            sessionId,
                            requestId: request.id,
                            agentId: agent.id,
                            message,
                            command: command?.name,
                            variables: variableData,
                            enableCommandDetection,
                            isParticipantDetected,
                            attempt,
                            location,
                            locationData: request.locationData,
                            acceptedConfirmationData: options?.acceptedConfirmationData,
                            rejectedConfirmationData: options?.rejectedConfirmationData,
                            userSelectedModelId: options?.userSelectedModelId,
                            userSelectedTools: options?.userSelectedTools?.get(),
                            modeInstructions: options?.modeInstructions,
                            editedFileEvents: request.editedFileEvents
                        };
                    };
                    if (this.configurationService.getValue('chat.detectParticipant.enabled') !== false && this.chatAgentService.hasChatParticipantDetectionProviders() && !agentPart && !commandPart && !agentSlashCommandPart && enableCommandDetection && options?.mode !== ChatModeKind.Agent && options?.mode !== ChatModeKind.Edit) {
                        // We have no agent or command to scope history with, pass the full history to the participant detection provider
                        const defaultAgentHistory = this.getHistoryEntriesFromModel(requests, model.sessionId, location, defaultAgent.id);
                        // Prepare the request object that we will send to the participant detection provider
                        const chatAgentRequest = prepareChatAgentRequest(defaultAgent, undefined, enableCommandDetection, undefined, false);
                        const result = await this.chatAgentService.detectAgentOrCommand(chatAgentRequest, defaultAgentHistory, { location }, token);
                        if (result && this.chatAgentService.getAgent(result.agent.id)?.locations?.includes(location)) {
                            // Update the response in the ChatModel to reflect the detected agent and command
                            request.response?.setAgent(result.agent, result.command);
                            detectedAgent = result.agent;
                            detectedCommand = result.command;
                        }
                    }
                    const agent = (detectedAgent ?? agentPart?.agent ?? defaultAgent);
                    const command = detectedCommand ?? agentSlashCommandPart?.command;
                    await this.extensionService.activateByEvent(`onChatParticipant:${agent.id}`);
                    // Recompute history in case the agent or command changed
                    const history = this.getHistoryEntriesFromModel(requests, model.sessionId, location, agent.id);
                    const requestProps = prepareChatAgentRequest(agent, command, enableCommandDetection, request /* Reuse the request object if we already created it for participant detection */, !!detectedAgent);
                    const pendingRequest = this._pendingRequests.get(sessionId);
                    if (pendingRequest && !pendingRequest.requestId) {
                        pendingRequest.requestId = requestProps.requestId;
                    }
                    completeResponseCreated();
                    const agentResult = await this.chatAgentService.invokeAgent(agent.id, requestProps, progressCallback, history, token);
                    rawResult = agentResult;
                    agentOrCommandFollowups = this.chatAgentService.getFollowups(agent.id, requestProps, agentResult, history, followupsCancelToken);
                    chatTitlePromise = model.getRequests().length === 1 && !model.customTitle ? this.chatAgentService.getChatTitle(defaultAgent.id, this.getHistoryEntriesFromModel(model.getRequests(), model.sessionId, location, agent.id), CancellationToken.None) : undefined;
                }
                else if (commandPart && this.chatSlashCommandService.hasCommand(commandPart.slashCommand.command)) {
                    if (commandPart.slashCommand.silent !== true) {
                        request = model.addRequest(parsedRequest, { variables: [] }, attempt);
                        completeResponseCreated();
                    }
                    // contributed slash commands
                    // TODO: spell this out in the UI
                    const history = [];
                    for (const modelRequest of model.getRequests()) {
                        if (!modelRequest.response) {
                            continue;
                        }
                        history.push({ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: modelRequest.message.text }] });
                        history.push({ role: 2 /* ChatMessageRole.Assistant */, content: [{ type: 'text', value: modelRequest.response.response.toString() }] });
                    }
                    const message = parsedRequest.text;
                    const commandResult = await this.chatSlashCommandService.executeCommand(commandPart.slashCommand.command, message.substring(commandPart.slashCommand.command.length + 1).trimStart(), new Progress(p => {
                        progressCallback([p]);
                    }), history, location, token);
                    agentOrCommandFollowups = Promise.resolve(commandResult?.followUp);
                    rawResult = {};
                }
                else {
                    throw new Error(`Cannot handle request`);
                }
                if (token.isCancellationRequested && !rawResult) {
                    return;
                }
                else {
                    if (!rawResult) {
                        this.trace('sendRequest', `Provider returned no response for session ${model.sessionId}`);
                        rawResult = { errorDetails: { message: localize('emptyResponse', "Provider returned null response") } };
                    }
                    const result = rawResult.errorDetails?.responseIsFiltered ? 'filtered' :
                        rawResult.errorDetails && gotProgress ? 'errorWithOutput' :
                            rawResult.errorDetails ? 'error' :
                                'success';
                    const commandForTelemetry = agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command;
                    this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                        timeToFirstProgress: rawResult.timings?.firstProgress,
                        totalTime: rawResult.timings?.totalElapsed,
                        result,
                        requestType,
                        agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                        agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                        slashCommand: commandForTelemetry,
                        chatSessionId: model.sessionId,
                        enableCommandDetection,
                        isParticipantDetected: !!detectedAgent,
                        location,
                        citations: request.response?.codeCitations.length ?? 0,
                        numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                        attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
                        model: this.resolveModelId(options?.userSelectedModelId),
                    });
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    this.trace('sendRequest', `Provider returned response for session ${model.sessionId}`);
                    model.completeResponse(request);
                    if (agentOrCommandFollowups) {
                        agentOrCommandFollowups.then(followups => {
                            model.setFollowups(request, followups);
                            this._chatServiceTelemetry.retrievedFollowups(agentPart?.agent.id ?? '', commandForTelemetry, followups?.length ?? 0);
                        });
                    }
                    chatTitlePromise?.then(title => {
                        if (title) {
                            model.setCustomTitle(title);
                        }
                    });
                }
            }
            catch (err) {
                this.logService.error(`Error while handling chat request: ${toErrorMessage(err, true)}`);
                const result = 'error';
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    totalTime: undefined,
                    result,
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: 0,
                    numCodeBlocks: 0,
                    enableCommandDetection,
                    isParticipantDetected: !!detectedAgent,
                    attachmentKinds: request ? this.attachmentKindsForTelemetry(request.variableData) : [],
                    model: this.resolveModelId(options?.userSelectedModelId)
                });
                if (request) {
                    const rawResult = { errorDetails: { message: err.message } };
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    model.completeResponse(request);
                }
            }
            finally {
                store.dispose();
            }
        };
        const rawResponsePromise = sendRequestInternal();
        // Note- requestId is not known at this point, assigned later
        this._pendingRequests.set(model.sessionId, this.instantiationService.createInstance(CancellableRequest, source, undefined));
        rawResponsePromise.finally(() => {
            this._pendingRequests.deleteAndDispose(model.sessionId);
        });
        this._onDidSubmitRequest.fire({ chatSessionId: model.sessionId });
        return {
            responseCreatedPromise: responseCreated.p,
            responseCompletePromise: rawResponsePromise,
        };
    }
    resolveModelId(userSelectedModelId) {
        return userSelectedModelId && this.languageModelsService.lookupLanguageModel(userSelectedModelId)?.id;
    }
    prepareContext(attachedContextVariables) {
        attachedContextVariables ??= [];
        // "reverse", high index first so that replacement is simple
        attachedContextVariables.sort((a, b) => {
            // If either range is undefined, sort it to the back
            if (!a.range && !b.range) {
                return 0; // Keep relative order if both ranges are undefined
            }
            if (!a.range) {
                return 1; // a goes after b
            }
            if (!b.range) {
                return -1; // a goes before b
            }
            return b.range.start - a.range.start;
        });
        return attachedContextVariables;
    }
    attachmentKindsForTelemetry(variableData) {
        // TODO this shows why attachments still have to be cleaned up somewhat
        return variableData.variables.map(v => {
            if (v.kind === 'implicit') {
                return 'implicit';
            }
            else if (v.range) {
                // 'range' is range within the prompt text
                if (v.kind === 'tool') {
                    return 'toolInPrompt';
                }
                else if (v.kind === 'toolset') {
                    return 'toolsetInPrompt';
                }
                else {
                    return 'fileInPrompt';
                }
            }
            else if (v.kind === 'command') {
                return 'command';
            }
            else if (v.kind === 'symbol') {
                return 'symbol';
            }
            else if (isImageVariableEntry(v)) {
                return 'image';
            }
            else if (v.kind === 'directory') {
                return 'directory';
            }
            else if (v.kind === 'tool') {
                return 'tool';
            }
            else if (v.kind === 'toolset') {
                return 'toolset';
            }
            else {
                if (URI.isUri(v.value)) {
                    return 'file';
                }
                else if (isLocation(v.value)) {
                    return 'location';
                }
                else {
                    return 'otherAttachment';
                }
            }
        });
    }
    getHistoryEntriesFromModel(requests, sessionId, location, forAgentId) {
        const history = [];
        const agent = this.chatAgentService.getAgent(forAgentId);
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            if (forAgentId !== request.response.agent?.id && !agent?.isDefault) {
                // An agent only gets to see requests that were sent to this agent.
                // The default agent (the undefined case) gets to see all of them.
                continue;
            }
            const promptTextResult = getPromptText(request.message);
            const historyRequest = {
                sessionId: sessionId,
                requestId: request.id,
                agentId: request.response.agent?.id ?? '',
                message: promptTextResult.message,
                command: request.response.slashCommand?.name,
                variables: updateRanges(request.variableData, promptTextResult.diff), // TODO bit of a hack
                location: ChatAgentLocation.Panel,
                editedFileEvents: request.editedFileEvents,
            };
            history.push({ request: historyRequest, response: toChatHistoryContent(request.response.response.value), result: request.response.result ?? {} });
        }
        return history;
    }
    async removeRequest(sessionId, requestId) {
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        const pendingRequest = this._pendingRequests.get(sessionId);
        if (pendingRequest?.requestId === requestId) {
            pendingRequest.cancel();
            this._pendingRequests.deleteAndDispose(sessionId);
        }
        model.removeRequest(requestId);
    }
    async adoptRequest(sessionId, request) {
        if (!(request instanceof ChatRequestModel)) {
            throw new TypeError('Can only adopt requests of type ChatRequestModel');
        }
        const target = this._sessionModels.get(sessionId);
        if (!target) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        const oldOwner = request.session;
        target.adoptRequest(request);
        if (request.response && !request.response.isComplete) {
            const cts = this._pendingRequests.deleteAndLeak(oldOwner.sessionId);
            if (cts) {
                cts.requestId = request.id;
                this._pendingRequests.set(target.sessionId, cts);
            }
        }
    }
    async addCompleteRequest(sessionId, message, variableData, attempt, response) {
        this.trace('addCompleteRequest', `message: ${message}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        const parsedRequest = typeof message === 'string' ?
            this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionId, message) :
            message;
        const request = model.addRequest(parsedRequest, variableData || { variables: [] }, attempt ?? 0, undefined, undefined, undefined, undefined, undefined, true);
        if (typeof response.message === 'string') {
            // TODO is this possible?
            model.acceptResponseProgress(request, { content: new MarkdownString(response.message), kind: 'markdownContent' });
        }
        else {
            for (const part of response.message) {
                model.acceptResponseProgress(request, part, true);
            }
        }
        model.setResponse(request, response.result || {});
        if (response.followups !== undefined) {
            model.setFollowups(request, response.followups);
        }
        model.completeResponse(request);
    }
    cancelCurrentRequestForSession(sessionId) {
        this.trace('cancelCurrentRequestForSession', `sessionId: ${sessionId}`);
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
    }
    async clearSession(sessionId) {
        this.trace('clearSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        if (model.initialLocation === ChatAgentLocation.Panel) {
            if (this.useFileStorage) {
                if (model.getRequests().length === 0) {
                    await this._chatSessionStore.deleteSession(sessionId);
                }
                else {
                    await this._chatSessionStore.storeSessions([model]);
                }
            }
            else {
                if (model.getRequests().length === 0) {
                    delete this._persistedSessions[sessionId];
                }
                else {
                    // Turn all the real objects into actual JSON, otherwise, calling 'revive' may fail when it tries to
                    // assign values to properties that are getters- microsoft/vscode-copilot-release#1233
                    const sessionData = JSON.parse(JSON.stringify(model));
                    sessionData.isNew = true;
                    this._persistedSessions[sessionId] = sessionData;
                }
            }
        }
        this._sessionModels.delete(sessionId);
        model.dispose();
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
        this._onDidDisposeSession.fire({ sessionId, reason: 'cleared' });
    }
    hasSessions() {
        if (this.useFileStorage) {
            return this._chatSessionStore.hasSessions();
        }
        else {
            return Object.values(this._persistedSessions).length > 0;
        }
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        const model = Iterable.find(this._sessionModels.values(), model => model.sessionId === transferredSessionData.sessionId);
        if (!model) {
            throw new Error(`Failed to transfer session. Unknown session ID: ${transferredSessionData.sessionId}`);
        }
        const existingRaw = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        existingRaw.push({
            chat: model.toJSON(),
            timestampInMilliseconds: Date.now(),
            toWorkspace: toWorkspace,
            inputValue: transferredSessionData.inputValue,
            location: transferredSessionData.location,
            mode: transferredSessionData.mode,
        });
        this.storageService.store(globalChatKey, JSON.stringify(existingRaw), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.chatTransferService.addWorkspaceToTransferred(toWorkspace);
        this.trace('transferChatSession', `Transferred session ${model.sessionId} to workspace ${toWorkspace.toString()}`);
    }
    getChatStorageFolder() {
        return this._chatSessionStore.getChatStorageFolder();
    }
    logChatIndex() {
        this._chatSessionStore.logIndex();
    }
};
__decorate([
    memoize
], ChatService.prototype, "useFileStorage", null);
ChatService = __decorate([
    __param(0, IStorageService),
    __param(1, ILogService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, ITelemetryService),
    __param(5, IWorkspaceContextService),
    __param(6, IChatSlashCommandService),
    __param(7, IChatAgentService),
    __param(8, IConfigurationService),
    __param(9, IChatTransferService),
    __param(10, ILanguageModelsService)
], ChatService);
export { ChatService };
function getCodeBlocks(text) {
    const lines = text.split('\n');
    const codeBlockLanguages = [];
    let codeBlockState;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (codeBlockState) {
            if (new RegExp(`^\\s*${codeBlockState.delimiter}\\s*$`).test(line)) {
                codeBlockLanguages.push(codeBlockState.languageId);
                codeBlockState = undefined;
            }
        }
        else {
            const match = line.match(/^(\s*)(`{3,}|~{3,})(\w*)/);
            if (match) {
                codeBlockState = { delimiter: match[2], languageId: match[3] };
            }
        }
    }
    return codeBlockLanguages;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0csT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUE4RyxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hLLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQXNNLDZCQUE2QixFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3BVLE9BQU8sRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsMkJBQTJCLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFzQixNQUFNLHNCQUFzQixDQUFDO0FBQ25NLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0IsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQTZCLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3BGLE9BQU8sRUFBaUMsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU1RSxNQUFNLGlCQUFpQixHQUFHLHNCQUFzQixDQUFDO0FBRWpELE1BQU0sYUFBYSxHQUFHLHdCQUF3QixDQUFDO0FBRS9DLE1BQU0sMkNBQTJDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQXdDOUQsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUM7QUFFaEMsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFDdkIsWUFDaUIsdUJBQWdELEVBQ3pELFNBQTZCLEVBQ1MsWUFBd0M7UUFGckUsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQUN6RCxjQUFTLEdBQVQsU0FBUyxDQUFvQjtRQUNTLGlCQUFZLEdBQVosWUFBWSxDQUE0QjtJQUNsRixDQUFDO0lBRUwsT0FBTztRQUNOLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDdkMsQ0FBQztDQUNELENBQUE7QUFsQkssa0JBQWtCO0lBSXJCLFdBQUEsMEJBQTBCLENBQUE7R0FKdkIsa0JBQWtCLENBa0J2QjtBQUVNLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVksU0FBUSxVQUFVO0lBVzFDLElBQVcsc0JBQXNCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDO0lBQ3JDLENBQUM7SUFrQkQsSUFBWSxjQUFjO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsSUFBWSxhQUFhO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM5RCxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELFlBQ2tCLGNBQWdELEVBQ3BELFVBQXdDLEVBQ2xDLGdCQUFvRCxFQUNoRCxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQzdDLHVCQUFrRSxFQUNsRSx1QkFBa0UsRUFDekUsZ0JBQW9ELEVBQ2hELG9CQUE0RCxFQUM3RCxtQkFBMEQsRUFDeEQscUJBQThEO1FBRXRGLEtBQUssRUFBRSxDQUFDO1FBWjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNuQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQzVCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDakQsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUN4RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQy9CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDNUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN2QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBcER0RSxtQkFBYyxHQUFHLElBQUksYUFBYSxFQUFxQixDQUFDO1FBQ3hELHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQThCLENBQUMsQ0FBQztRQUdwRywrR0FBK0c7UUFDdkcsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBTzNCLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTZCLENBQUMsQ0FBQztRQUNoRix1QkFBa0IsR0FBcUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQUVyRiw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QixDQUFDLENBQUM7UUFDL0UsMkJBQXNCLEdBQWdDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7UUFFeEYseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBNEMsQ0FBQyxDQUFDO1FBQ2hHLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFFckQsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBbUMsQ0FBQyxDQUFDO1FBbUNwSCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTVGLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLG1DQUEwQixDQUFDLCtCQUF1QixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3RCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNqRSxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsWUFBWSxZQUFZLHFCQUFxQixDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztRQUM5QixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDekQsTUFBTSxlQUFlLEdBQUcsZUFBZSxFQUFFLElBQUksQ0FBQztRQUM5QyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLHVCQUF1QixlQUFlLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM5RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGVBQWUsQ0FBQztZQUNyRSxJQUFJLENBQUMsdUJBQXVCLEdBQUc7Z0JBQzlCLFNBQVMsRUFBRSxlQUFlLENBQUMsU0FBUztnQkFDcEMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxVQUFVO2dCQUN0QyxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7Z0JBQ2xDLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSTthQUMxQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3BHLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLENBQUMsUUFBMkI7UUFDcEMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUyxDQUFDO0lBQ2pGLENBQUM7SUFFTyxTQUFTO1FBQ2hCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN4RCxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxLQUFLLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXpFLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLFdBQVcsR0FBMEMsU0FBUyxDQUFDO2dCQUNuRSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUM7cUJBQ3BDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUM5RCxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRTFFLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUV6RCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLFdBQVcsQ0FBQyxNQUFNLFdBQVcsQ0FBQyxDQUFDO2dCQUM1RSxDQUFDO2dCQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRS9DLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLGNBQWMsVUFBVSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7Z0JBQ3hFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxnRUFBZ0QsQ0FBQztZQUN6RyxDQUFDO1FBRUYsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVPLG9CQUFvQixDQUFDLGVBQTRCO1FBQ3hELGtKQUFrSjtRQUNsSixpSkFBaUo7UUFDakosaUpBQWlKO1FBQ2pKLHFCQUFxQjtRQUNyQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIscUNBQTRCLEVBQUUsQ0FBQyxDQUFDO1FBRTdGLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1FBQzFELElBQUksaUJBQXlDLENBQUM7UUFDOUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUMzRCxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsWUFBWSxZQUFZLHFCQUFxQixDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8saUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqRSxnR0FBZ0c7UUFDaEcsTUFBTSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxRCxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5RCxJQUFJLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEYsbUdBQW1HO2dCQUNuRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsT0FBTyxDQUFDO1lBQ2hELENBQUM7aUJBQU0sSUFBSSxDQUFDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDL0MseUVBQXlFO2dCQUN6RSxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDdEIsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztZQUNoRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsaUJBQWlCLENBQUM7UUFFNUMsOERBQThEO1FBQzlELCtHQUErRztRQUMvRyxNQUFNLFdBQVcsR0FBc0QsRUFBRSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3RHLEtBQUssTUFBTSxJQUFJLElBQUksZUFBZSxFQUFFLENBQUM7WUFDcEMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDcEMsQ0FBQztRQUVELElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksbUVBQWtELENBQUM7SUFDckcsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQTRCO1FBQzVDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssMEJBQTBCLEVBQUUsQ0FBQztZQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxLQUFLLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxTQUFpQixFQUFFLEtBQWE7UUFDekQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7UUFDN0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsTUFBTSxLQUFLLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBYyxFQUFFLE9BQWU7UUFDNUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsV0FBbUI7UUFDM0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxlQUFlLEdBQThCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5Q0FBeUM7WUFDN0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUF5QixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDaEYsc0RBQXNEO2dCQUN0RCxLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7NEJBQ3BELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7Z0NBQ2xDLE9BQU8sSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQ3JDLENBQUM7NEJBQ0QsT0FBTyxRQUFRLENBQUM7d0JBQ2pCLENBQUMsQ0FBQyxDQUFDO29CQUNKLENBQUM7eUJBQU0sSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQ2pELE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDM0QsQ0FBQztnQkFDRixDQUFDO2dCQUVELEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsNkJBQTZCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sR0FBRyxDQUFDO1lBQ1osQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ1AsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLDJCQUEyQixHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMzSSxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7SUFDRixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLE1BQU0sSUFBSSxHQUFxQixJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxhQUFhLGdDQUF3QixFQUFFLENBQUMsQ0FBQztRQUN0RyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztRQUNqRixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQy9CLHVEQUF1RDtRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssYUFBYSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsR0FBRywyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7UUFDL0wsNkVBQTZFO1FBQzdFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxhQUFhLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixHQUFHLDJDQUEyQyxDQUFDLENBQUMsQ0FBQztRQUM5TCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsOERBQThDLENBQUM7UUFDaEgsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNmLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO2lCQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7aUJBQ3RDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDZCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQy9ELE9BQU87b0JBQ04sU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO29CQUM1QixLQUFLO29CQUNMLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtvQkFDeEMsUUFBUSxFQUFFLElBQUk7aUJBQ1EsQ0FBQztZQUN6QixDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2lCQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO2lCQUNqRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQWUsRUFBRSxDQUFDLENBQUM7Z0JBQzdCLEdBQUcsS0FBSztnQkFDUixRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQzthQUNsRCxDQUFDLENBQUMsQ0FBQztZQUNMLE9BQU8sQ0FBQyxHQUFHLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUM7YUFDOUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2FBQzlDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFakUsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUI7YUFDN0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNkLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDakYsT0FBTztnQkFDTixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7Z0JBQzVCLEtBQUs7Z0JBQ0wsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO2dCQUN4QyxRQUFRLEVBQUUsS0FBSzthQUNPLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7YUFDdEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9ELE9BQU87Z0JBQ04sU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO2dCQUM1QixLQUFLO2dCQUNMLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtnQkFDeEMsUUFBUSxFQUFFLElBQUk7YUFDUSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxDQUFDLEdBQUcsZ0JBQWdCLEVBQUUsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBaUI7UUFDekMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDaEQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBMkIsRUFBRSxLQUF3QixFQUFFLHlCQUFrQyxJQUFJO1FBQ3pHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVPLGFBQWEsQ0FBQyxrQkFBMkUsRUFBRSxRQUEyQixFQUFFLHNCQUErQixFQUFFLEtBQXdCO1FBQ3hMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hHLElBQUksUUFBUSxLQUFLLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBZ0IsRUFBRSxLQUF3QjtRQUNuRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUV6RSxnRUFBZ0U7UUFDaEUsaUVBQWlFO1FBQ2pFLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUEyQjtRQUNyRCxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1FBRWhFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqSyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixNQUFNLElBQUksZ0JBQWdCLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsbURBQW1EO1FBQ25ELG1EQUFtRDtRQUNuRCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3RFLGVBQWUsRUFBRSxxQkFBcUIsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO2dCQUMzRCxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsV0FBVztnQkFDekMsT0FBTyxFQUFFLEtBQUs7YUFDZCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoSCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLGdCQUFnQixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsU0FBaUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFNBQWlCO1FBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsY0FBYyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLFdBQThDLENBQUM7UUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsRixXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsZUFBZSxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEksTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLFNBQVMsS0FBSyxTQUFTLENBQUM7UUFDM0UsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPO1lBQ1AsaUdBQWlHO1lBQ2pHLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLENBQUM7UUFDMUMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILHVCQUF1QixDQUFDLFNBQWlCO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsc0JBQXNCLENBQUMsSUFBaUQ7UUFDdkUsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZUFBZSxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEgsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBMEIsRUFBRSxPQUFpQztRQUNoRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxLQUFLLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsV0FBVyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsK0NBQStDLENBQUMsQ0FBQztZQUNqSCxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxFQUFFLFFBQVEsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDO1FBQzVELE1BQU0sT0FBTyxHQUFHLE9BQU8sRUFBRSxPQUFPLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUM7UUFDNUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBRSxDQUFDO1FBRXJGLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsMENBQWtDLENBQUM7UUFFakUsTUFBTSxhQUFhLEdBQTRCO1lBQzlDLEdBQUcsT0FBTztZQUNWLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtZQUNsQyxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWU7U0FDeEMsQ0FBQztRQUNGLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUMsdUJBQXVCLENBQUM7SUFDdkssQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBaUIsRUFBRSxPQUFlLEVBQUUsT0FBaUM7UUFDdEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsY0FBYyxTQUFTLGNBQWMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUdqSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNwRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3BELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsV0FBVyxTQUFTLGdDQUFnQyxDQUFDLENBQUM7WUFDaEYsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDckMsS0FBSyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNsRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsSUFBSSxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxPQUFPLENBQUMscUJBQXFCLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ2pELE9BQU8sQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLEVBQUUsUUFBUSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDNUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxFQUFFLE9BQU8sSUFBSSxDQUFDLENBQUM7UUFDdEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBRSxDQUFDO1FBRXJGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBNkIsRUFBRSxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLEtBQUssSUFBSSxZQUFZLENBQUM7UUFDbkksTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBdUMsRUFBRSxDQUFDLENBQUMsWUFBWSw4QkFBOEIsQ0FBQyxDQUFDO1FBRWhKLHFHQUFxRztRQUNyRyxPQUFPO1lBQ04sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDO1lBQ2xJLEtBQUs7WUFDTCxZQUFZLEVBQUUscUJBQXFCLEVBQUUsT0FBTztTQUM1QyxDQUFDO0lBQ0gsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQWlCLEVBQUUsT0FBZSxFQUFFLFFBQTJCLEVBQUUsT0FBNEM7UUFDckksSUFBSSxhQUFhLEdBQUcsT0FBTyxFQUFFLGFBQWEsQ0FBQztRQUMzQyxJQUFJLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQUNELGFBQWEsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xHLE9BQU8sR0FBRyxHQUFHLGVBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLFdBQVcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN0RSxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2hKLE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFTyxpQ0FBaUMsQ0FBQyxTQUFpQjtRQUMxRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzNELE1BQU0sY0FBYyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVqRSxPQUFPLGNBQWMsQ0FBQyxLQUFLLENBQUM7SUFDN0IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEtBQWdCLEVBQUUsU0FBaUIsRUFBRSxhQUFpQyxFQUFFLE9BQWUsRUFBRSxzQkFBK0IsRUFBRSxZQUF3QixFQUFFLFFBQTJCLEVBQUUsT0FBaUM7UUFDM08sTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0UsSUFBSSxPQUF5QixDQUFDO1FBQzlCLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQTZCLEVBQUUsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsQ0FBQztRQUN0SixNQUFNLHFCQUFxQixHQUFHLE1BQU0sSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQXVDLEVBQUUsQ0FBQyxDQUFDLFlBQVksOEJBQThCLENBQUMsQ0FBQztRQUN0TCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFvQyxFQUFFLENBQUMsQ0FBQyxZQUFZLDJCQUEyQixDQUFDLENBQUM7UUFDdEssTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBRTVELE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFzQixDQUFDO1FBQ2xFLElBQUksdUJBQXVCLEdBQUcsS0FBSyxDQUFDO1FBQ3BDLFNBQVMsdUJBQXVCO1lBQy9CLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ25ELGVBQWUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyx1QkFBdUIsR0FBRyxJQUFJLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUMzQixNQUFNLG1CQUFtQixHQUFHLEtBQUssSUFBSSxFQUFFO1lBQ3RDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxRQUF5QixFQUFFLEVBQUU7Z0JBQ3RELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQ25DLE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUVuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxQyxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFakMsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7d0JBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLDBDQUEwQyxLQUFLLENBQUMsU0FBUyxLQUFLLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7b0JBQ3BJLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSwrQkFBK0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzFGLENBQUM7b0JBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUQsQ0FBQztnQkFDRCx1QkFBdUIsRUFBRSxDQUFDO1lBQzNCLENBQUMsQ0FBQztZQUVGLElBQUksYUFBeUMsQ0FBQztZQUM5QyxJQUFJLGVBQThDLENBQUM7WUFFbkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO2dCQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSx1QkFBdUIsS0FBSyxDQUFDLFNBQVMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDbEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBOEQsbUNBQW1DLEVBQUU7b0JBQ2xJLG1CQUFtQixFQUFFLFNBQVM7b0JBQzlCLCtJQUErSTtvQkFDL0ksU0FBUyxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUU7b0JBQzlCLE1BQU0sRUFBRSxXQUFXO29CQUNuQixXQUFXO29CQUNYLEtBQUssRUFBRSxhQUFhLEVBQUUsRUFBRSxJQUFJLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLEVBQUU7b0JBQ3JELGdCQUFnQixFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsS0FBSyxJQUFJLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO29CQUM5RixZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsT0FBTztvQkFDNUcsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTO29CQUM5QixRQUFRO29CQUNSLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQztvQkFDdkQsYUFBYSxFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNO29CQUNoRixxQkFBcUIsRUFBRSxDQUFDLENBQUMsYUFBYTtvQkFDdEMsc0JBQXNCO29CQUN0QixlQUFlLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7b0JBQ3ZFLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQztpQkFDeEQsQ0FBQyxDQUFDO2dCQUVILEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksQ0FBQztnQkFDSixJQUFJLFNBQThDLENBQUM7Z0JBQ25ELElBQUksdUJBQXVCLEdBQXFELFNBQVMsQ0FBQztnQkFDMUYsSUFBSSxnQkFBeUQsQ0FBQztnQkFFOUQsSUFBSSxTQUFTLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNqRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsS0FBcUIsRUFBRSxPQUEyQixFQUFFLHNCQUFnQyxFQUFFLFdBQThCLEVBQUUscUJBQStCLEVBQXFCLEVBQUU7d0JBQzVNLE1BQU0sZ0JBQWdCLEdBQTZCLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDO3dCQUNyRSxPQUFPLEdBQUcsV0FBVyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQzt3QkFFck4sSUFBSSxZQUFzQyxDQUFDO3dCQUMzQyxJQUFJLE9BQWUsQ0FBQzt3QkFDcEIsSUFBSSxXQUFXLEVBQUUsQ0FBQzs0QkFDakIsWUFBWSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUM7NEJBQ3hDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQzt3QkFDbEQsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLFlBQVksR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDOzRCQUMzRSxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQzs0QkFFM0MsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUN4RCxZQUFZLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHFCQUFxQjs0QkFDdkYsT0FBTyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQzt3QkFDcEMsQ0FBQzt3QkFFRCxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUM7d0JBRTFCLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFOzRCQUMxQixNQUFNLEtBQUssR0FBRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUN2RCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dDQUNwQixjQUFjLEdBQUcsS0FBSyxDQUFDO2dDQUN2QixPQUFPOzRCQUNSLENBQUM7NEJBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQ0FDWCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7NEJBQzNGLENBQUM7d0JBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFSixPQUFPOzRCQUNOLFNBQVM7NEJBQ1QsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFOzRCQUNyQixPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7NEJBQ2pCLE9BQU87NEJBQ1AsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJOzRCQUN0QixTQUFTLEVBQUUsWUFBWTs0QkFDdkIsc0JBQXNCOzRCQUN0QixxQkFBcUI7NEJBQ3JCLE9BQU87NEJBQ1AsUUFBUTs0QkFDUixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7NEJBQ2xDLHdCQUF3QixFQUFFLE9BQU8sRUFBRSx3QkFBd0I7NEJBQzNELHdCQUF3QixFQUFFLE9BQU8sRUFBRSx3QkFBd0I7NEJBQzNELG1CQUFtQixFQUFFLE9BQU8sRUFBRSxtQkFBbUI7NEJBQ2pELGlCQUFpQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7NEJBQ3BELGdCQUFnQixFQUFFLE9BQU8sRUFBRSxnQkFBZ0I7NEJBQzNDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7eUJBQ2QsQ0FBQztvQkFDL0IsQ0FBQyxDQUFDO29CQUVGLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLHFCQUFxQixJQUFJLHNCQUFzQixJQUFJLE9BQU8sRUFBRSxJQUFJLEtBQUssWUFBWSxDQUFDLEtBQUssSUFBSSxPQUFPLEVBQUUsSUFBSSxLQUFLLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDclQsaUhBQWlIO3dCQUNqSCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUVsSCxxRkFBcUY7d0JBQ3JGLE1BQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBRXBILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQzVILElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7NEJBQzlGLGlGQUFpRjs0QkFDakYsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7NEJBQ3pELGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDOzRCQUM3QixlQUFlLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQzt3QkFDbEMsQ0FBQztvQkFDRixDQUFDO29CQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsYUFBYSxJQUFJLFNBQVMsRUFBRSxLQUFLLElBQUksWUFBWSxDQUFFLENBQUM7b0JBQ25FLE1BQU0sT0FBTyxHQUFHLGVBQWUsSUFBSSxxQkFBcUIsRUFBRSxPQUFPLENBQUM7b0JBQ2xFLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBRTdFLHlEQUF5RDtvQkFDekQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQy9GLE1BQU0sWUFBWSxHQUFHLHVCQUF1QixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLGlGQUFpRixFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDak0sTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDNUQsSUFBSSxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2pELGNBQWMsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQztvQkFDbkQsQ0FBQztvQkFDRCx1QkFBdUIsRUFBRSxDQUFDO29CQUMxQixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUN0SCxTQUFTLEdBQUcsV0FBVyxDQUFDO29CQUN4Qix1QkFBdUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztvQkFDakksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDaFEsQ0FBQztxQkFBTSxJQUFJLFdBQVcsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDckcsSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQzt3QkFDOUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUN0RSx1QkFBdUIsRUFBRSxDQUFDO29CQUMzQixDQUFDO29CQUNELDZCQUE2QjtvQkFDN0IsaUNBQWlDO29CQUNqQyxNQUFNLE9BQU8sR0FBbUIsRUFBRSxDQUFDO29CQUNuQyxLQUFLLE1BQU0sWUFBWSxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO3dCQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDOzRCQUM1QixTQUFTO3dCQUNWLENBQUM7d0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksOEJBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM1RyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxtQ0FBMkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2xJLENBQUM7b0JBQ0QsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztvQkFDbkMsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFnQixDQUFDLENBQUMsRUFBRTt3QkFDck4sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2QixDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUM5Qix1QkFBdUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDbkUsU0FBUyxHQUFHLEVBQUUsQ0FBQztnQkFFaEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNqRCxPQUFPO2dCQUNSLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLDZDQUE2QyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQzt3QkFDMUYsU0FBUyxHQUFHLEVBQUUsWUFBWSxFQUFFLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsaUNBQWlDLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pHLENBQUM7b0JBRUQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQ3ZFLFNBQVMsQ0FBQyxZQUFZLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOzRCQUMxRCxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQ0FDakMsU0FBUyxDQUFDO29CQUNiLE1BQU0sbUJBQW1CLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDO29CQUMzSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE4RCxtQ0FBbUMsRUFBRTt3QkFDbEksbUJBQW1CLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxhQUFhO3dCQUNyRCxTQUFTLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxZQUFZO3dCQUMxQyxNQUFNO3dCQUNOLFdBQVc7d0JBQ1gsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksRUFBRTt3QkFDckQsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxLQUFLLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7d0JBQzlGLFlBQVksRUFBRSxtQkFBbUI7d0JBQ2pDLGFBQWEsRUFBRSxLQUFLLENBQUMsU0FBUzt3QkFDOUIsc0JBQXNCO3dCQUN0QixxQkFBcUIsRUFBRSxDQUFDLENBQUMsYUFBYTt3QkFDdEMsUUFBUTt3QkFDUixTQUFTLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUM7d0JBQ3RELGFBQWEsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTt3QkFDaEYsZUFBZSxFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO3dCQUN2RSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLENBQUM7cUJBQ3hELENBQUMsQ0FBQztvQkFDSCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDdEMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsMENBQTBDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUV2RixLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2hDLElBQUksdUJBQXVCLEVBQUUsQ0FBQzt3QkFDN0IsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFOzRCQUN4QyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQzs0QkFDdkMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUN2SCxDQUFDLENBQUMsQ0FBQztvQkFDSixDQUFDO29CQUNELGdCQUFnQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDOUIsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDWCxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUM3QixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBOEQsbUNBQW1DLEVBQUU7b0JBQ2xJLG1CQUFtQixFQUFFLFNBQVM7b0JBQzlCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNO29CQUNOLFdBQVc7b0JBQ1gsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksRUFBRTtvQkFDckQsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxLQUFLLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7b0JBQzlGLFlBQVksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxPQUFPO29CQUM1RyxhQUFhLEVBQUUsS0FBSyxDQUFDLFNBQVM7b0JBQzlCLFFBQVE7b0JBQ1IsU0FBUyxFQUFFLENBQUM7b0JBQ1osYUFBYSxFQUFFLENBQUM7b0JBQ2hCLHNCQUFzQjtvQkFDdEIscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLGFBQWE7b0JBQ3RDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3RGLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQztpQkFDeEQsQ0FBQyxDQUFDO2dCQUNILElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsTUFBTSxTQUFTLEdBQXFCLEVBQUUsWUFBWSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO29CQUMvRSxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDdEMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDMUIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxrQkFBa0IsR0FBRyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2pELDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1SCxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQy9CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLE9BQU87WUFDTixzQkFBc0IsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUN6Qyx1QkFBdUIsRUFBRSxrQkFBa0I7U0FDM0MsQ0FBQztJQUNILENBQUM7SUFFTyxjQUFjLENBQUMsbUJBQXVDO1FBQzdELE9BQU8sbUJBQW1CLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxDQUFDO0lBQ3ZHLENBQUM7SUFFTyxjQUFjLENBQUMsd0JBQWlFO1FBQ3ZGLHdCQUF3QixLQUFLLEVBQUUsQ0FBQztRQUVoQyw0REFBNEQ7UUFDNUQsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLG9EQUFvRDtZQUNwRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLENBQUMsQ0FBQyxtREFBbUQ7WUFDOUQsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7WUFDNUIsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtZQUM5QixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sd0JBQXdCLENBQUM7SUFDakMsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFlBQXNDO1FBQ3pFLHVFQUF1RTtRQUN2RSxPQUFPLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxVQUFVLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsMENBQTBDO2dCQUMxQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQ3ZCLE9BQU8sY0FBYyxDQUFDO2dCQUN2QixDQUFDO3FCQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxpQkFBaUIsQ0FBQztnQkFDMUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sY0FBYyxDQUFDO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO2lCQUFNLElBQUksb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxPQUFPLENBQUM7WUFDaEIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sV0FBVyxDQUFDO1lBQ3BCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixPQUFPLE1BQU0sQ0FBQztnQkFDZixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNoQyxPQUFPLFVBQVUsQ0FBQztnQkFDbkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8saUJBQWlCLENBQUM7Z0JBQzFCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sMEJBQTBCLENBQUMsUUFBNkIsRUFBRSxTQUFpQixFQUFFLFFBQTJCLEVBQUUsVUFBa0I7UUFDbkksTUFBTSxPQUFPLEdBQTZCLEVBQUUsQ0FBQztRQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkIsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLFVBQVUsS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7Z0JBQ3BFLG1FQUFtRTtnQkFDbkUsa0VBQWtFO2dCQUNsRSxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxNQUFNLGNBQWMsR0FBc0I7Z0JBQ3pDLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRTtnQkFDekMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLE9BQU87Z0JBQ2pDLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJO2dCQUM1QyxTQUFTLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUscUJBQXFCO2dCQUMzRixRQUFRLEVBQUUsaUJBQWlCLENBQUMsS0FBSztnQkFDakMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQjthQUMxQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25KLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFpQixFQUFFLFNBQWlCO1FBQ3ZELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUQsSUFBSSxjQUFjLEVBQUUsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBaUIsRUFBRSxPQUEwQjtRQUMvRCxJQUFJLENBQUMsQ0FBQyxPQUFPLFlBQVksZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQzVDLE1BQU0sSUFBSSxTQUFTLENBQUMsa0RBQWtELENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdCLElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEUsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxHQUFHLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBaUIsRUFBRSxPQUFvQyxFQUFFLFlBQWtELEVBQUUsT0FBMkIsRUFBRSxRQUErQjtRQUNqTSxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLFlBQVksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUV4RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxPQUFPLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDbEcsT0FBTyxDQUFDO1FBQ1QsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5SixJQUFJLE9BQU8sUUFBUSxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyx5QkFBeUI7WUFDekIsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNuSCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNyQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuRCxDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbEQsSUFBSSxRQUFRLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxTQUFpQjtRQUMvQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLGNBQWMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxTQUFpQjtRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxjQUFjLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN0QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDM0MsQ0FBQztxQkFBTSxDQUFDO29CQUNQLG9HQUFvRztvQkFDcEcsc0ZBQXNGO29CQUN0RixNQUFNLFdBQVcsR0FBMEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQzdFLFdBQVcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO29CQUN6QixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsV0FBVyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3QyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDRixDQUFDO0lBRUQsbUJBQW1CLENBQUMsc0JBQW1ELEVBQUUsV0FBZ0I7UUFDeEYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6SCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3hHLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBcUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsYUFBYSxnQ0FBd0IsRUFBRSxDQUFDLENBQUM7UUFDN0csV0FBVyxDQUFDLElBQUksQ0FBQztZQUNoQixJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNwQix1QkFBdUIsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ25DLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxVQUFVO1lBQzdDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxRQUFRO1lBQ3pDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxJQUFJO1NBQ2pDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyw4REFBOEMsQ0FBQztRQUNuSCxJQUFJLENBQUMsbUJBQW1CLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSx1QkFBdUIsS0FBSyxDQUFDLFNBQVMsaUJBQWlCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEgsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQ3RELENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ25DLENBQUM7Q0FDRCxDQUFBO0FBbGhDQTtJQURDLE9BQU87aURBR1A7QUFqQ1csV0FBVztJQTZDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLHNCQUFzQixDQUFBO0dBdkRaLFdBQVcsQ0FpakN2Qjs7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsTUFBTSxrQkFBa0IsR0FBYSxFQUFFLENBQUM7SUFFeEMsSUFBSSxjQUF1RixDQUFDO0lBQzVGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRCLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLE1BQU0sQ0FBQyxRQUFRLGNBQWMsQ0FBQyxTQUFTLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuRCxjQUFjLEdBQUcsU0FBUyxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUNyRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLGNBQWMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sa0JBQWtCLENBQUM7QUFDM0IsQ0FBQyJ9