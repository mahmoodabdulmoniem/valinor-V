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
var ChatWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { disposableTimeout, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { basename, extUri, isEqual } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { PromptsType } from '../common/promptSyntax/promptTypes.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { buttonSecondaryBackground, buttonSecondaryForeground, buttonSecondaryHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { checkModeOption } from '../common/chat.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, decidedChatEditingResourceContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService, inChatEditingSessionContextKey } from '../common/chatEditingService.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestDynamicVariablePart, ChatRequestSlashPromptPart, ChatRequestToolPart, ChatRequestToolSetPart, chatSubcommandLeader, formatChatQuestion } from '../common/chatParserTypes.js';
import { ChatRequestParser } from '../common/chatRequestParser.js';
import { IChatService } from '../common/chatService.js';
import { IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatViewModel, isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
import { handleModeSwitch } from './actions/chatActions.js';
import { IChatAccessibilityService, IChatWidgetService } from './chat.js';
import { ChatAccessibilityProvider } from './chatAccessibilityProvider.js';
import { ChatInputPart } from './chatInputPart.js';
import { ChatListDelegate, ChatListItemRenderer } from './chatListRenderer.js';
import { ChatEditorOptions } from './chatOptions.js';
import './media/chat.css';
import './media/chatAgentHover.css';
import './media/chatViewWelcome.css';
import { ChatViewWelcomePart } from './viewsWelcome/chatViewWelcomeController.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { isPromptFileVariableEntry, toPromptFileVariableEntry, PromptFileVariableKind, isPromptTextVariableEntry } from '../common/chatVariableEntries.js';
import { PromptsConfig } from '../common/promptSyntax/config/config.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ComputeAutomaticInstructions } from '../common/promptSyntax/computeAutomaticInstructions.js';
import { startupExpContext, StartupExperimentGroup } from '../../../services/coreExperimentation/common/coreExperimentationService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
const $ = dom.$;
export function isQuickChat(widget) {
    return 'viewContext' in widget && 'isQuickChat' in widget.viewContext && Boolean(widget.viewContext.isQuickChat);
}
export function isInlineChat(widget) {
    return 'viewContext' in widget && 'isInlineChat' in widget.viewContext && Boolean(widget.viewContext.isInlineChat);
}
let ChatWidget = class ChatWidget extends Disposable {
    static { ChatWidget_1 = this; }
    static { this.CONTRIBS = []; }
    get domNode() {
        return this.container;
    }
    get visible() {
        return this._visible;
    }
    set viewModel(viewModel) {
        if (this._viewModel === viewModel) {
            return;
        }
        this.viewModelDisposables.clear();
        this._viewModel = viewModel;
        if (viewModel) {
            this.viewModelDisposables.add(viewModel);
            this.logService.debug('ChatWidget#setViewModel: have viewModel');
            if (viewModel.model.editingSessionObs) {
                this.logService.debug('ChatWidget#setViewModel: waiting for editing session');
                viewModel.model.editingSessionObs?.promise.then(() => {
                    this._isReady = true;
                    this._onDidBecomeReady.fire();
                });
            }
            else {
                this._isReady = true;
                this._onDidBecomeReady.fire();
            }
        }
        else {
            this.logService.debug('ChatWidget#setViewModel: no viewModel');
        }
        this._onDidChangeViewModel.fire();
    }
    get viewModel() {
        return this._viewModel;
    }
    get parsedInput() {
        if (this.parsedChatRequest === undefined) {
            if (!this.viewModel) {
                return { text: '', parts: [] };
            }
            this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(this.viewModel.sessionId, this.getInput(), this.location, { selectedAgent: this._lastSelectedAgent, mode: this.input.currentModeKind });
            this._onDidChangeParsedInput.fire();
        }
        return this.parsedChatRequest;
    }
    get scopedContextKeyService() {
        return this.contextKeyService;
    }
    get location() {
        return this._location.location;
    }
    get supportsChangingModes() {
        return !!this.viewOptions.supportsChangingModes;
    }
    constructor(location, _viewContext, viewOptions, styles, codeEditorService, configurationService, contextKeyService, instantiationService, chatService, chatAgentService, chatWidgetService, contextMenuService, chatAccessibilityService, logService, themeService, chatSlashCommandService, chatEditingService, telemetryService, promptsService, toolsService, contextService) {
        super();
        this.viewOptions = viewOptions;
        this.styles = styles;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.chatWidgetService = chatWidgetService;
        this.contextMenuService = contextMenuService;
        this.chatAccessibilityService = chatAccessibilityService;
        this.logService = logService;
        this.themeService = themeService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.telemetryService = telemetryService;
        this.promptsService = promptsService;
        this.toolsService = toolsService;
        this.contextService = contextService;
        this._onDidSubmitAgent = this._register(new Emitter());
        this.onDidSubmitAgent = this._onDidSubmitAgent.event;
        this._onDidChangeAgent = this._register(new Emitter());
        this.onDidChangeAgent = this._onDidChangeAgent.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidChangeViewModel = this._register(new Emitter());
        this.onDidChangeViewModel = this._onDidChangeViewModel.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidClear = this._register(new Emitter());
        this.onDidClear = this._onDidClear.event;
        this._onDidAcceptInput = this._register(new Emitter());
        this.onDidAcceptInput = this._onDidAcceptInput.event;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidChangeParsedInput = this._register(new Emitter());
        this.onDidChangeParsedInput = this._onDidChangeParsedInput.event;
        this._onWillMaybeChangeHeight = new Emitter();
        this.onWillMaybeChangeHeight = this._onWillMaybeChangeHeight.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidChangeContentHeight = new Emitter();
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.contribs = [];
        this.settingChangeCounter = 0;
        this.welcomePart = this._register(new MutableDisposable());
        this.visibleChangeCount = 0;
        this._visible = false;
        this.previousTreeScrollHeight = 0;
        /**
         * Whether the list is scroll-locked to the bottom. Initialize to true so that we can scroll to the bottom on first render.
         * The initial render leads to a lot of `onDidChangeTreeContentHeight` as the renderer works out the real heights of rows.
         */
        this.scrollLock = true;
        this._isReady = false;
        this._onDidBecomeReady = this._register(new Emitter());
        this.viewModelDisposables = this._register(new DisposableStore());
        this._editingSession = observableValue(this, undefined);
        this.viewContext = _viewContext ?? {};
        const viewModelObs = observableFromEvent(this, this.onDidChangeViewModel, () => this.viewModel);
        if (typeof location === 'object') {
            this._location = location;
        }
        else {
            this._location = { location };
        }
        ChatContextKeys.inChatSession.bindTo(contextKeyService).set(true);
        ChatContextKeys.location.bindTo(contextKeyService).set(this._location.location);
        ChatContextKeys.inQuickChat.bindTo(contextKeyService).set(isQuickChat(this));
        this.agentInInput = ChatContextKeys.inputHasAgent.bindTo(contextKeyService);
        this.requestInProgress = ChatContextKeys.requestInProgress.bindTo(contextKeyService);
        this.isRequestPaused = ChatContextKeys.isRequestPaused.bindTo(contextKeyService);
        this.canRequestBePaused = ChatContextKeys.canRequestBePaused.bindTo(contextKeyService);
        this._register(bindContextKey(decidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return;
            }
            const entries = currentSession.entries.read(reader);
            const decidedEntries = entries.filter(entry => entry.state.read(reader) !== 0 /* ModifiedFileEntryState.Modified */);
            return decidedEntries.map(entry => entry.entryId);
        }));
        this._register(bindContextKey(hasUndecidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            const entries = currentSession?.entries.read(reader) ?? []; // using currentSession here
            const decidedEntries = entries.filter(entry => entry.state.read(reader) === 0 /* ModifiedFileEntryState.Modified */);
            return decidedEntries.length > 0;
        }));
        this._register(bindContextKey(hasAppliedChatEditsContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return false;
            }
            const entries = currentSession.entries.read(reader);
            return entries.length > 0;
        }));
        this._register(bindContextKey(inChatEditingSessionContextKey, contextKeyService, (reader) => {
            return this._editingSession.read(reader) !== null;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanUndo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canUndo.read(r) || false;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanRedo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canRedo.read(r) || false;
        }));
        this._register(bindContextKey(applyingChatEditsFailedContextKey, contextKeyService, (r) => {
            const chatModel = viewModelObs.read(r)?.model;
            const editingSession = this._editingSession.read(r);
            if (!editingSession || !chatModel) {
                return false;
            }
            const lastResponse = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)?.response).read(r);
            return lastResponse?.result?.errorDetails && !lastResponse?.result?.errorDetails.responseIsIncomplete;
        }));
        this._codeBlockModelCollection = this._register(instantiationService.createInstance(CodeBlockModelCollection, undefined));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('chat.renderRelatedFiles')) {
                this.renderChatEditingSessionState();
            }
            if (e.affectsConfiguration(ChatConfiguration.EditRequests) || e.affectsConfiguration(ChatConfiguration.CheckpointsEnabled)) {
                this.settingChangeCounter++;
                this.onDidChangeItems();
            }
        }));
        this._register(autorun(r => {
            const viewModel = viewModelObs.read(r);
            const sessions = chatEditingService.editingSessionsObs.read(r);
            const session = sessions.find(candidate => candidate.chatSessionId === viewModel?.sessionId);
            this._editingSession.set(undefined, undefined);
            this.renderChatEditingSessionState(); // this is necessary to make sure we dispose previous buttons, etc.
            if (!session) {
                // none or for a different chat widget
                return;
            }
            const entries = session.entries.read(r);
            for (const entry of entries) {
                entry.state.read(r); // SIGNAL
            }
            this._editingSession.set(session, undefined);
            r.store.add(session.onDidDispose(() => {
                this._editingSession.set(undefined, undefined);
                this.renderChatEditingSessionState();
            }));
            r.store.add(this.onDidChangeParsedInput(() => {
                this.renderChatEditingSessionState();
            }));
            r.store.add(this.inputEditor.onDidChangeModelContent(() => {
                if (this.getInput() === '') {
                    this.refreshParsedInput();
                    this.renderChatEditingSessionState();
                }
            }));
            this.renderChatEditingSessionState();
        }));
        this._register(codeEditorService.registerCodeEditorOpenHandler(async (input, _source, _sideBySide) => {
            const resource = input.resource;
            if (resource.scheme !== Schemas.vscodeChatCodeBlock) {
                return null;
            }
            const responseId = resource.path.split('/').at(1);
            if (!responseId) {
                return null;
            }
            const item = this.viewModel?.getItems().find(item => item.id === responseId);
            if (!item) {
                return null;
            }
            // TODO: needs to reveal the chat view
            this.reveal(item);
            await timeout(0); // wait for list to actually render
            for (const codeBlockPart of this.renderer.editorsInUse()) {
                if (extUri.isEqual(codeBlockPart.uri, resource, true)) {
                    const editor = codeBlockPart.editor;
                    let relativeTop = 0;
                    const editorDomNode = editor.getDomNode();
                    if (editorDomNode) {
                        const row = dom.findParentWithClass(editorDomNode, 'monaco-list-row');
                        if (row) {
                            relativeTop = dom.getTopLeftOffset(editorDomNode).top - dom.getTopLeftOffset(row).top;
                        }
                    }
                    if (input.options?.selection) {
                        const editorSelectionTopOffset = editor.getTopForPosition(input.options.selection.startLineNumber, input.options.selection.startColumn);
                        relativeTop += editorSelectionTopOffset;
                        editor.focus();
                        editor.setSelection({
                            startLineNumber: input.options.selection.startLineNumber,
                            startColumn: input.options.selection.startColumn,
                            endLineNumber: input.options.selection.endLineNumber ?? input.options.selection.startLineNumber,
                            endColumn: input.options.selection.endColumn ?? input.options.selection.startColumn
                        });
                    }
                    this.reveal(item, relativeTop);
                    return editor;
                }
            }
            return null;
        }));
        this._register(this.onDidChangeParsedInput(() => this.updateChatInputContext()));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(new Set([
                ChatContextKeys.Setup.installed.key,
                ChatContextKeys.Entitlement.canSignUp.key
            ]))) {
                // reset the input in welcome view if it was rendered in experimental mode
                if (this.container.classList.contains('experimental-welcome-view')) {
                    this.container.classList.remove('experimental-welcome-view');
                    const renderFollowups = this.viewOptions.renderFollowups ?? false;
                    const renderStyle = this.viewOptions.renderStyle;
                    this.createInput(this.container, { renderFollowups, renderStyle });
                }
            }
        }));
    }
    set lastSelectedAgent(agent) {
        this.parsedChatRequest = undefined;
        this._lastSelectedAgent = agent;
        this._onDidChangeParsedInput.fire();
    }
    get lastSelectedAgent() {
        return this._lastSelectedAgent;
    }
    get supportsFileReferences() {
        return !!this.viewOptions.supportsFileReferences;
    }
    get input() {
        return this.viewModel?.editing && this.configurationService.getValue('chat.editRequests') !== 'input' ? this.inlineInputPart : this.inputPart;
    }
    get inputEditor() {
        return this.input.inputEditor;
    }
    get inputUri() {
        return this.input.inputUri;
    }
    get contentHeight() {
        return this.input.contentHeight + this.tree.contentHeight;
    }
    get attachmentModel() {
        return this.input.attachmentModel;
    }
    async waitForReady() {
        if (this._isReady) {
            this.logService.debug('ChatWidget#waitForReady: already ready');
            return;
        }
        this.logService.debug('ChatWidget#waitForReady: waiting for ready');
        await Event.toPromise(this._onDidBecomeReady.event);
        if (this.viewModel) {
            this.logService.debug('ChatWidget#waitForReady: ready');
        }
        else {
            this.logService.debug('ChatWidget#waitForReady: no viewModel');
        }
    }
    render(parent) {
        const viewId = 'viewId' in this.viewContext ? this.viewContext.viewId : undefined;
        this.editorOptions = this._register(this.instantiationService.createInstance(ChatEditorOptions, viewId, this.styles.listForeground, this.styles.inputEditorBackground, this.styles.resultEditorBackground));
        const renderInputOnTop = this.viewOptions.renderInputOnTop ?? false;
        const renderFollowups = this.viewOptions.renderFollowups ?? !renderInputOnTop;
        const renderStyle = this.viewOptions.renderStyle;
        this.container = dom.append(parent, $('.interactive-session'));
        this.welcomeMessageContainer = dom.append(this.container, $('.chat-welcome-view-container', { style: 'display: none' }));
        this._register(dom.addStandardDisposableListener(this.welcomeMessageContainer, dom.EventType.CLICK, () => this.focusInput()));
        if (renderInputOnTop) {
            this.createInput(this.container, { renderFollowups, renderStyle });
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
        }
        else {
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
            this.createInput(this.container, { renderFollowups, renderStyle });
        }
        this.renderWelcomeViewContentIfNeeded();
        this.createList(this.listContainer, { ...this.viewOptions.rendererOptions, renderStyle });
        const scrollDownButton = this._register(new Button(this.listContainer, {
            supportIcons: true,
            buttonBackground: asCssVariable(buttonSecondaryBackground),
            buttonForeground: asCssVariable(buttonSecondaryForeground),
            buttonHoverBackground: asCssVariable(buttonSecondaryHoverBackground),
        }));
        scrollDownButton.element.classList.add('chat-scroll-down');
        scrollDownButton.label = `$(${Codicon.chevronDown.id})`;
        scrollDownButton.setTitle(localize('scrollDownButtonLabel', "Scroll down"));
        this._register(scrollDownButton.onDidClick(() => {
            this.scrollLock = true;
            this.scrollToEnd();
        }));
        this._register(this.editorOptions.onDidChange(() => this.onDidStyleChange()));
        this.onDidStyleChange();
        // Do initial render
        if (this.viewModel) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.contribs = ChatWidget_1.CONTRIBS.map(contrib => {
            try {
                return this._register(this.instantiationService.createInstance(contrib, this));
            }
            catch (err) {
                this.logService.error('Failed to instantiate chat widget contrib', toErrorMessage(err));
                return undefined;
            }
        }).filter(isDefined);
        this._register(this.chatWidgetService.register(this));
        const parsedInput = observableFromEvent(this.onDidChangeParsedInput, () => this.parsedInput);
        this._register(autorun(r => {
            const input = parsedInput.read(r);
            const newPromptAttachments = new Map();
            const oldPromptAttachments = new Set();
            // get all attachments, know those that are prompt-referenced
            for (const attachment of this.attachmentModel.attachments) {
                if (attachment.range) {
                    oldPromptAttachments.add(attachment.id);
                }
            }
            // update/insert prompt-referenced attachments
            for (const part of input.parts) {
                if (part instanceof ChatRequestToolPart || part instanceof ChatRequestToolSetPart || part instanceof ChatRequestDynamicVariablePart) {
                    const entry = part.toVariableEntry();
                    newPromptAttachments.set(entry.id, entry);
                    oldPromptAttachments.delete(entry.id);
                }
            }
            this.attachmentModel.updateContext(oldPromptAttachments, newPromptAttachments.values());
        }));
        if (!this.focusedInputDOM) {
            this.focusedInputDOM = this.container.appendChild(dom.$('.focused-input-dom'));
        }
    }
    scrollToEnd() {
        if (this.lastItem) {
            const offset = Math.max(this.lastItem.currentRenderedHeight ?? 0, 1e6);
            this.tree.reveal(this.lastItem, offset);
        }
    }
    getContrib(id) {
        return this.contribs.find(c => c.id === id);
    }
    focusInput() {
        this.input.focus();
        // Sometimes focusing the input part is not possible,
        // but we'd like to be the last focused chat widget,
        // so we emit an optimistic onDidFocus event nonetheless.
        this._onDidFocus.fire();
    }
    hasInputFocus() {
        return this.input.hasFocus();
    }
    refreshParsedInput() {
        if (!this.viewModel) {
            return;
        }
        this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(this.viewModel.sessionId, this.getInput(), this.location, { selectedAgent: this._lastSelectedAgent, mode: this.input.currentModeKind });
        this._onDidChangeParsedInput.fire();
    }
    getSibling(item, type) {
        if (!isResponseVM(item)) {
            return;
        }
        const items = this.viewModel?.getItems();
        if (!items) {
            return;
        }
        const responseItems = items.filter(i => isResponseVM(i));
        const targetIndex = responseItems.indexOf(item);
        if (targetIndex === undefined) {
            return;
        }
        const indexToFocus = type === 'next' ? targetIndex + 1 : targetIndex - 1;
        if (indexToFocus < 0 || indexToFocus > responseItems.length - 1) {
            return;
        }
        return responseItems[indexToFocus];
    }
    clear() {
        this.logService.debug('ChatWidget#clear');
        this._isReady = false;
        if (this._dynamicMessageLayoutData) {
            this._dynamicMessageLayoutData.enabled = true;
        }
        this._onDidClear.fire();
    }
    onDidChangeItems(skipDynamicLayout) {
        if (this._visible || !this.viewModel) {
            const treeItems = (this.viewModel?.getItems() ?? [])
                .map((item) => {
                return {
                    element: item,
                    collapsed: false,
                    collapsible: false
                };
            });
            // reset the input in welcome view if it was rendered in experimental mode
            if (this.container.classList.contains('experimental-welcome-view')) {
                this.container.classList.remove('experimental-welcome-view');
                const renderFollowups = this.viewOptions.renderFollowups ?? false;
                const renderStyle = this.viewOptions.renderStyle;
                this.createInput(this.container, { renderFollowups, renderStyle });
            }
            this.renderWelcomeViewContentIfNeeded();
            this._onWillMaybeChangeHeight.fire();
            this.lastItem = treeItems.at(-1)?.element;
            ChatContextKeys.lastItemId.bindTo(this.contextKeyService).set(this.lastItem ? [this.lastItem.id] : []);
            this.tree.setChildren(null, treeItems, {
                diffIdentityProvider: {
                    getId: (element) => {
                        return element.dataId +
                            // Ensure re-rendering an element once slash commands are loaded, so the colorization can be applied.
                            `${(isRequestVM(element)) /* && !!this.lastSlashCommands ? '_scLoaded' : '' */}` +
                            // If a response is in the process of progressive rendering, we need to ensure that it will
                            // be re-rendered so progressive rendering is restarted, even if the model wasn't updated.
                            `${isResponseVM(element) && element.renderData ? `_${this.visibleChangeCount}` : ''}` +
                            // Re-render once content references are loaded
                            (isResponseVM(element) ? `_${element.contentReferences.length}` : '') +
                            // Re-render if element becomes hidden due to undo/redo
                            `_${element.shouldBeRemovedOnSend ? `${element.shouldBeRemovedOnSend.afterUndoStop || '1'}` : '0'}` +
                            // Re-render if element becomes enabled/disabled due to checkpointing
                            `_${element.shouldBeBlocked ? '1' : '0'}` +
                            // Re-render if we have an element currently being edited
                            `_${this.viewModel?.editing ? '1' : '0'}` +
                            // Re-render if we have an element currently being checkpointed
                            `_${this.viewModel?.model.checkpoint ? '1' : '0'}` +
                            // Re-render all if invoked by setting change
                            `_setting${this.settingChangeCounter || '0'}` +
                            // Rerender request if we got new content references in the response
                            // since this may change how we render the corresponding attachments in the request
                            (isRequestVM(element) && element.contentReferences ? `_${element.contentReferences?.length}` : '') +
                            (isResponseVM(element) && element.model.isPaused.get() ? '_paused' : '');
                    },
                }
            });
            if (!skipDynamicLayout && this._dynamicMessageLayoutData) {
                this.layoutDynamicChatTreeItemMode();
            }
            this.renderFollowups();
        }
    }
    renderWelcomeViewContentIfNeeded() {
        if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal') {
            return;
        }
        const numItems = this.viewModel?.getItems().length ?? 0;
        if (!numItems) {
            dom.clearNode(this.welcomeMessageContainer);
            // TODO@bhavyaus remove this startup experiment once settled
            const startupExpValue = startupExpContext.getValue(this.contextKeyService);
            const configuration = this.configurationService.inspect('workbench.secondarySideBar.defaultVisibility');
            const expIsActive = configuration.defaultValue !== 'hidden';
            const expEmptyState = this.configurationService.getValue('chat.emptyChatState.enabled');
            const chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
            let welcomeContent;
            const defaultAgent = this.chatAgentService.getDefaultAgent(this.location, this.input.currentModeKind);
            const additionalMessage = defaultAgent?.metadata.additionalWelcomeMessage;
            if ((startupExpValue === StartupExperimentGroup.MaximizedChat
                || startupExpValue === StartupExperimentGroup.SplitEmptyEditorChat
                || startupExpValue === StartupExperimentGroup.SplitWelcomeChat
                || expIsActive) && this.contextKeyService.contextMatchesRules(chatSetupTriggerContext)) {
                welcomeContent = this.getExpWelcomeViewContent();
                this.container.classList.add('experimental-welcome-view');
            }
            else if (expEmptyState) {
                welcomeContent = this.getWelcomeViewContent(additionalMessage, expEmptyState);
            }
            else {
                const tips = this.input.currentModeKind === ChatModeKind.Ask
                    ? new MarkdownString(localize('chatWidget.tips', "{0} or type {1} to attach context\n\n{2} to chat with extensions\n\nType {3} to use commands", '$(attach)', '#', '$(mention)', '/'), { supportThemeIcons: true })
                    : new MarkdownString(localize('chatWidget.tips.withoutParticipants', "{0} or type {1} to attach context", '$(attach)', '#'), { supportThemeIcons: true });
                welcomeContent = this.getWelcomeViewContent(additionalMessage);
                welcomeContent.tips = tips;
            }
            this.welcomePart.value = this.instantiationService.createInstance(ChatViewWelcomePart, welcomeContent, {
                location: this.location,
                isWidgetAgentWelcomeViewContent: this.input?.currentModeKind === ChatModeKind.Agent
            });
            dom.append(this.welcomeMessageContainer, this.welcomePart.value.element);
        }
        if (this.viewModel) {
            dom.setVisibility(numItems === 0, this.welcomeMessageContainer);
            dom.setVisibility(numItems !== 0, this.listContainer);
        }
    }
    getWelcomeViewContent(additionalMessage, expEmptyState) {
        const disclaimerMessage = expEmptyState
            ? localize('chatDisclaimer', "AI responses may be inaccurate.")
            : localize('chatMessage', "Copilot is powered by AI, so mistakes are possible. Review output carefully before use.");
        const icon = expEmptyState ? Codicon.chatSparkle : Codicon.copilotLarge;
        if (this.input.currentModeKind === ChatModeKind.Ask) {
            return {
                title: localize('chatDescription', "Ask about your code."),
                message: new MarkdownString(disclaimerMessage),
                icon,
                additionalMessage,
            };
        }
        else if (this.input.currentModeKind === ChatModeKind.Edit) {
            const editsHelpMessage = localize('editsHelp', "Start your editing session by defining a set of files that you want to work with. Then ask Copilot for the changes you want to make.");
            const message = expEmptyState ? disclaimerMessage : `${editsHelpMessage}\n\n${disclaimerMessage}`;
            return {
                title: localize('editsTitle', "Edit in context."),
                message: new MarkdownString(message),
                icon,
                additionalMessage
            };
        }
        else {
            const agentHelpMessage = localize('agentMessage', "Ask Copilot to edit your files in [agent mode]({0}). Copilot will automatically use multiple requests to pick files to edit, run terminal commands, and iterate on errors.", 'https://aka.ms/vscode-copilot-agent');
            const message = expEmptyState ? disclaimerMessage : `${agentHelpMessage}\n\n${disclaimerMessage}`;
            return {
                title: localize('agentTitle', "Build with agent mode."),
                message: new MarkdownString(message),
                icon,
                additionalMessage
            };
        }
    }
    getExpWelcomeViewContent() {
        const welcomeContent = {
            title: localize('expChatTitle', 'Welcome to Copilot'),
            message: new MarkdownString(localize('expchatMessage', "Let's get started")),
            icon: Codicon.copilotLarge,
            inputPart: this.inputPart.element,
            additionalMessage: localize('expChatAdditionalMessage', "Review AI output carefully before use."),
            isExperimental: true,
            suggestedPrompts: this.getExpSuggestedPrompts(),
        };
        return welcomeContent;
    }
    getExpSuggestedPrompts() {
        // Check if the workbench is empty
        const isEmpty = this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */;
        if (isEmpty) {
            return [
                {
                    icon: Codicon.vscode,
                    label: localize('chatWidget.suggestedPrompts.gettingStarted', "Ask @vscode"),
                    prompt: localize('chatWidget.suggestedPrompts.gettingStartedPrompt', "@vscode How do I change the theme to light mode?"),
                },
                {
                    icon: Codicon.newFolder,
                    label: localize('chatWidget.suggestedPrompts.newProject', "Create project"),
                    prompt: localize('chatWidget.suggestedPrompts.newProjectPrompt', "Create a #new Hello World project in TypeScript"),
                }
            ];
        }
        else {
            return [
                {
                    icon: Codicon.debugAlt,
                    label: localize('chatWidget.suggestedPrompts.buildWorkspace', "Build workspace"),
                    prompt: localize('chatWidget.suggestedPrompts.buildWorkspacePrompt', "How do I build this workspace?"),
                },
                {
                    icon: Codicon.gear,
                    label: localize('chatWidget.suggestedPrompts.findConfig', "Show project config"),
                    prompt: localize('chatWidget.suggestedPrompts.findConfigPrompt', "Where is the configuration for this project defined?"),
                }
            ];
        }
    }
    async renderChatEditingSessionState() {
        if (!this.input) {
            return;
        }
        this.input.renderChatEditingSessionState(this._editingSession.get() ?? null);
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    async renderFollowups() {
        if (this.lastItem && isResponseVM(this.lastItem) && this.lastItem.isComplete && this.input.currentModeKind === ChatModeKind.Ask) {
            this.input.renderFollowups(this.lastItem.replyFollowups, this.lastItem);
        }
        else {
            this.input.renderFollowups(undefined, undefined);
        }
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    setVisible(visible) {
        const wasVisible = this._visible;
        this._visible = visible;
        this.visibleChangeCount++;
        this.renderer.setVisible(visible);
        this.input.setVisible(visible);
        if (visible) {
            this._register(disposableTimeout(() => {
                // Progressive rendering paused while hidden, so start it up again.
                // Do it after a timeout because the container is not visible yet (it should be but offsetHeight returns 0 here)
                if (this._visible) {
                    this.onDidChangeItems(true);
                }
            }, 0));
        }
        else if (wasVisible) {
            this._onDidHide.fire();
        }
    }
    createList(listContainer, options) {
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        const delegate = scopedInstantiationService.createInstance(ChatListDelegate, this.viewOptions.defaultElementHeight ?? 200);
        const rendererDelegate = {
            getListLength: () => this.tree.getNode(null).visibleChildrenCount,
            onDidScroll: this.onDidScroll,
            container: listContainer,
            currentChatMode: () => this.input.currentModeKind,
        };
        // Create a dom element to hold UI from editor widgets embedded in chat messages
        const overflowWidgetsContainer = document.createElement('div');
        overflowWidgetsContainer.classList.add('chat-overflow-widget-container', 'monaco-editor');
        listContainer.append(overflowWidgetsContainer);
        this.renderer = this._register(scopedInstantiationService.createInstance(ChatListItemRenderer, this.editorOptions, options, rendererDelegate, this._codeBlockModelCollection, overflowWidgetsContainer, this.viewModel, isInlineChat(this) || isQuickChat(this)));
        this._register(this.renderer.onDidClickRequest(async (item) => {
            this.clickedRequest(item);
        }));
        this._register(this.renderer.onDidRerender(item => {
            if (isRequestVM(item.currentElement) && this.configurationService.getValue('chat.editRequests') !== 'input') {
                if (!item.rowContainer.contains(this.inputContainer)) {
                    item.rowContainer.appendChild(this.inputContainer);
                }
                this.input.focus();
            }
        }));
        this._register(this.renderer.onDidDispose((item) => {
            this.focusedInputDOM.appendChild(this.inputContainer);
            this.input.focus();
        }));
        this._register(this.renderer.onDidFocusOutside(() => {
            this.finishedEditing();
            this.viewModel?.model.setCheckpoint(undefined);
        }));
        this._register(this.renderer.onDidClickFollowup(item => {
            // is this used anymore?
            this.acceptInput(item.message);
        }));
        this._register(this.renderer.onDidClickRerunWithAgentOrCommandDetection(item => {
            const request = this.chatService.getSession(item.sessionId)?.getRequests().find(candidate => candidate.id === item.requestId);
            if (request) {
                const options = {
                    noCommandDetection: true,
                    attempt: request.attempt + 1,
                    location: this.location,
                    userSelectedModelId: this.input.currentLanguageModel,
                    mode: this.input.currentModeKind,
                };
                this.chatService.resendRequest(request, options).catch(e => this.logService.error('FAILED to rerun request', e));
            }
        }));
        this.tree = this._register(scopedInstantiationService.createInstance((WorkbenchObjectTree), 'Chat', listContainer, delegate, [this.renderer], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            supportDynamicHeights: true,
            hideTwistiesOfChildlessElements: true,
            accessibilityProvider: this.instantiationService.createInstance(ChatAccessibilityProvider),
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => isRequestVM(e) ? e.message : isResponseVM(e) ? e.response.value : '' }, // TODO
            setRowLineHeight: false,
            filter: this.viewOptions.filter ? { filter: this.viewOptions.filter.bind(this.viewOptions), } : undefined,
            scrollToActiveElement: true,
            overrideStyles: {
                listFocusBackground: this.styles.listBackground,
                listInactiveFocusBackground: this.styles.listBackground,
                listActiveSelectionBackground: this.styles.listBackground,
                listFocusAndSelectionBackground: this.styles.listBackground,
                listInactiveSelectionBackground: this.styles.listBackground,
                listHoverBackground: this.styles.listBackground,
                listBackground: this.styles.listBackground,
                listFocusForeground: this.styles.listForeground,
                listHoverForeground: this.styles.listForeground,
                listInactiveFocusForeground: this.styles.listForeground,
                listInactiveSelectionForeground: this.styles.listForeground,
                listActiveSelectionForeground: this.styles.listForeground,
                listFocusAndSelectionForeground: this.styles.listForeground,
                listActiveSelectionIconForeground: undefined,
                listInactiveSelectionIconForeground: undefined,
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeContentHeight(() => {
            this.onDidChangeTreeContentHeight();
        }));
        this._register(this.renderer.onDidChangeItemHeight(e => {
            if (this.tree.hasElement(e.element)) {
                this.tree.updateElementHeight(e.element, e.height);
            }
        }));
        this._register(this.tree.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
        this._register(this.tree.onDidScroll(() => {
            this._onDidScroll.fire();
            const isScrolledDown = this.tree.scrollTop >= this.tree.scrollHeight - this.tree.renderHeight - 2;
            this.container.classList.toggle('show-scroll-down', !isScrolledDown && !this.scrollLock);
        }));
    }
    startEditing(requestId) {
        const editedRequest = this.renderer.getTemplateDataForRequestId(requestId);
        if (editedRequest) {
            this.clickedRequest(editedRequest);
        }
    }
    clickedRequest(item) {
        const currentElement = item.currentElement;
        if (isRequestVM(currentElement) && !this.viewModel?.editing) {
            const requests = this.viewModel?.model.getRequests();
            if (!requests) {
                return;
            }
            this.viewModel?.model.setCheckpoint(currentElement.id);
            // set contexts and request to false
            const currentContext = [];
            for (let i = requests.length - 1; i >= 0; i -= 1) {
                const request = requests[i];
                if (request.id === currentElement.id) {
                    request.shouldBeBlocked = false; // unblocking just this request.
                    if (request.attachedContext) {
                        const context = request.attachedContext.filter(entry => !(isPromptFileVariableEntry(entry) || isPromptTextVariableEntry(entry)) || !entry.automaticallyAdded);
                        currentContext.push(...context);
                    }
                }
            }
            // set states
            this.viewModel?.setEditing(currentElement);
            if (item?.contextKeyService) {
                ChatContextKeys.currentlyEditing.bindTo(item.contextKeyService).set(true);
            }
            const isInput = this.configurationService.getValue('chat.editRequests') === 'input';
            this.inputPart?.setEditing(!!this.viewModel?.editing && isInput);
            if (!isInput) {
                const rowContainer = item.rowContainer;
                this.inputContainer = dom.$('.chat-edit-input-container');
                rowContainer.appendChild(this.inputContainer);
                this.createInput(this.inputContainer);
                this.input.setChatMode(this.inputPart.currentModeKind);
            }
            else {
                this.inputPart.element.classList.add('editing');
            }
            this.inputPart.toggleChatInputOverlay(!isInput);
            if (currentContext.length > 0) {
                this.input.attachmentModel.addContext(...currentContext);
            }
            // rerenders
            this.inputPart.dnd.setDisabledOverlay(!isInput);
            this.input.renderAttachedContext();
            this.input.setValue(currentElement.messageText, false);
            this.renderer.updateItemHeightOnRender(currentElement, item);
            this.onDidChangeItems();
            this.input.inputEditor.focus();
            this._register(dom.addDisposableListener(this.inputPart.element, dom.EventType.CLICK, () => {
                if (this.viewModel?.editing && this.configurationService.getValue('chat.editRequests') !== 'input') {
                    this.finishedEditing();
                }
            }));
            // listeners
            if (!isInput) {
                this._register(this.inlineInputPart.inputEditor.onDidChangeModelContent(() => {
                    this.scrollToCurrentItem(currentElement);
                }));
                this._register(this.inlineInputPart.inputEditor.onDidChangeCursorSelection((e) => {
                    this.scrollToCurrentItem(currentElement);
                }));
            }
        }
        this.telemetryService.publicLog2('chat.startEditingRequests', {
            editRequestType: this.configurationService.getValue('chat.editRequests'),
        });
    }
    finishedEditing(completedEdit) {
        // reset states
        const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
        this.viewModel?.model.setCheckpoint(undefined);
        this.inputPart.dnd.setDisabledOverlay(false);
        if (editedRequest?.contextKeyService) {
            ChatContextKeys.currentlyEditing.bindTo(editedRequest.contextKeyService).set(false);
        }
        const isInput = this.configurationService.getValue('chat.editRequests') === 'input';
        if (!isInput) {
            this.inputPart.setChatMode(this.input.currentModeKind);
            const currentModel = this.input.selectedLanguageModel;
            if (currentModel) {
                this.inputPart.switchModel(currentModel.metadata);
            }
            this.inputPart?.toggleChatInputOverlay(false);
            try {
                if (editedRequest?.rowContainer && editedRequest.rowContainer.contains(this.inputContainer)) {
                    editedRequest.rowContainer.removeChild(this.inputContainer);
                }
                else if (this.inputContainer.parentElement) {
                    this.inputContainer.parentElement.removeChild(this.inputContainer);
                }
            }
            catch (e) {
                this.logService.error('Error occurred while finishing editing:', e);
            }
            this.inputContainer = dom.$('.empty-chat-state');
            // only dispose if we know the input is not the bottom input object.
            this.input.dispose();
        }
        if (isInput) {
            this.inputPart.element.classList.remove('editing');
        }
        this.viewModel?.setEditing(undefined);
        this.inputPart?.setEditing(!!this.viewModel?.editing && isInput);
        this.onDidChangeItems();
        if (editedRequest && editedRequest.currentElement) {
            this.renderer.updateItemHeightOnRender(editedRequest.currentElement, editedRequest);
        }
        this.telemetryService.publicLog2('chat.editRequestsFinished', {
            editRequestType: this.configurationService.getValue('chat.editRequests'),
            editCanceled: !completedEdit
        });
        this.inputPart.focus();
    }
    scrollToCurrentItem(currentElement) {
        if (this.viewModel?.editing && currentElement) {
            const element = currentElement;
            if (!this.tree.hasElement(element)) {
                return;
            }
            const relativeTop = this.tree.getRelativeTop(element);
            if (relativeTop === null || relativeTop < 0 || relativeTop > 1) {
                this.tree.reveal(element, 0);
            }
        }
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selected = e.element;
        const scopedContextKeyService = this.contextKeyService.createOverlay([
            [ChatContextKeys.responseIsFiltered.key, isResponseVM(selected) && !!selected.errorDetails?.responseIsFiltered]
        ]);
        this.contextMenuService.showContextMenu({
            menuId: MenuId.ChatContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => selected,
        });
    }
    onDidChangeTreeContentHeight() {
        // If the list was previously scrolled all the way down, ensure it stays scrolled down, if scroll lock is on
        if (this.tree.scrollHeight !== this.previousTreeScrollHeight) {
            const lastItem = this.viewModel?.getItems().at(-1);
            const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
            if (!lastResponseIsRendering || this.scrollLock) {
                // Due to rounding, the scrollTop + renderHeight will not exactly match the scrollHeight.
                // Consider the tree to be scrolled all the way down if it is within 2px of the bottom.
                const lastElementWasVisible = this.tree.scrollTop + this.tree.renderHeight >= this.previousTreeScrollHeight - 2;
                if (lastElementWasVisible) {
                    dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                        // Can't set scrollTop during this event listener, the list might overwrite the change
                        this.scrollToEnd();
                    }, 0);
                }
            }
        }
        // TODO@roblourens add `show-scroll-down` class when button should show
        // Show the button when content height changes, the list is not fully scrolled down, and (the latest response is currently rendering OR I haven't yet scrolled all the way down since the last response)
        // So for example it would not reappear if I scroll up and delete a message
        this.previousTreeScrollHeight = this.tree.scrollHeight;
        this._onDidChangeContentHeight.fire();
    }
    getWidgetViewKindTag() {
        if (!this.viewContext) {
            return 'editor';
        }
        else if ('viewId' in this.viewContext) {
            return 'view';
        }
        else {
            return 'quick';
        }
    }
    createInput(container, options) {
        const commonConfig = {
            renderFollowups: options?.renderFollowups ?? true,
            renderStyle: options?.renderStyle === 'minimal' ? 'compact' : options?.renderStyle,
            menus: {
                executeToolbar: MenuId.ChatExecute,
                ...this.viewOptions.menus
            },
            editorOverflowWidgetsDomNode: this.viewOptions.editorOverflowWidgetsDomNode,
            enableImplicitContext: this.viewOptions.enableImplicitContext,
            renderWorkingSet: this.viewOptions.enableWorkingSet === 'explicit',
            supportsChangingModes: this.viewOptions.supportsChangingModes,
            dndContainer: this.viewOptions.dndContainer,
            widgetViewKindTag: this.getWidgetViewKindTag()
        };
        if (this.viewModel?.editing) {
            const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
            const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editedRequest?.contextKeyService])));
            this.inlineInputPart = this._register(scopedInstantiationService.createInstance(ChatInputPart, this.location, commonConfig, this.styles, () => this.collectInputState(), true));
        }
        else {
            this.inputPart = this._register(this.instantiationService.createInstance(ChatInputPart, this.location, commonConfig, this.styles, () => this.collectInputState(), false));
        }
        this.input.render(container, '', this);
        this._register(this.input.onDidLoadInputState(state => {
            this.contribs.forEach(c => {
                if (c.setInputState) {
                    const contribState = (typeof state === 'object' && state?.[c.id]) ?? {};
                    c.setInputState(contribState);
                }
            });
            this.refreshParsedInput();
        }));
        this._register(this.input.onDidFocus(() => this._onDidFocus.fire()));
        this._register(this.input.onDidAcceptFollowup(e => {
            if (!this.viewModel) {
                return;
            }
            let msg = '';
            if (e.followup.agentId && e.followup.agentId !== this.chatAgentService.getDefaultAgent(this.location, this.input.currentModeKind)?.id) {
                const agent = this.chatAgentService.getAgent(e.followup.agentId);
                if (!agent) {
                    return;
                }
                this.lastSelectedAgent = agent;
                msg = `${chatAgentLeader}${agent.name} `;
                if (e.followup.subCommand) {
                    msg += `${chatSubcommandLeader}${e.followup.subCommand} `;
                }
            }
            else if (!e.followup.agentId && e.followup.subCommand && this.chatSlashCommandService.hasCommand(e.followup.subCommand)) {
                msg = `${chatSubcommandLeader}${e.followup.subCommand} `;
            }
            msg += e.followup.message;
            this.acceptInput(msg);
            if (!e.response) {
                // Followups can be shown by the welcome message, then there is no response associated.
                // At some point we probably want telemetry for these too.
                return;
            }
            this.chatService.notifyUserAction({
                sessionId: this.viewModel.sessionId,
                requestId: e.response.requestId,
                agentId: e.response.agent?.id,
                command: e.response.slashCommand?.name,
                result: e.response.result,
                action: {
                    kind: 'followUp',
                    followup: e.followup
                },
            });
        }));
        this._register(this.input.onDidChangeHeight(() => {
            const editedRequest = this.renderer.getTemplateDataForRequestId(this.viewModel?.editing?.id);
            if (isRequestVM(editedRequest?.currentElement) && this.viewModel?.editing) {
                this.renderer.updateItemHeightOnRender(editedRequest?.currentElement, editedRequest);
            }
            if (this.bodyDimension) {
                this.layout(this.bodyDimension.height, this.bodyDimension.width);
            }
            this._onDidChangeContentHeight.fire();
        }));
        this._register(this.input.attachmentModel.onDidChange(() => {
            if (this._editingSession) {
                // TODO still needed? Do this inside input part and fire onDidChangeHeight?
                this.renderChatEditingSessionState();
            }
        }));
        this._register(this.inputEditor.onDidChangeModelContent(() => {
            this.parsedChatRequest = undefined;
            this.updateChatInputContext();
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            this.parsedChatRequest = undefined;
            // Tools agent loads -> welcome content changes
            this.renderWelcomeViewContentIfNeeded();
        }));
        this._register(this.input.onDidChangeCurrentChatMode(() => {
            this.renderWelcomeViewContentIfNeeded();
            this.refreshParsedInput();
            this.renderFollowups();
        }));
        const enabledToolSetsAndTools = this.input.selectedToolsModel.entries.map(value => {
            const toolSetIds = new Set();
            const toolIds = new Set();
            for (const item of value) {
                if (item instanceof ToolSet) {
                    toolSetIds.add(item.id);
                }
                else {
                    toolIds.add(item.id);
                }
            }
            return { toolSetIds, toolIds };
        });
        this._register(autorun(r => {
            const { toolSetIds, toolIds } = enabledToolSetsAndTools.read(r);
            const disabledTools = this.input.attachmentModel.attachments
                .filter(a => a.kind === 'tool' && !toolIds.has(a.id) || a.kind === 'toolset' && !toolSetIds.has(a.id))
                .map(a => a.id);
            this.input.attachmentModel.updateContext(disabledTools, Iterable.empty());
            this.refreshParsedInput();
        }));
    }
    onDidStyleChange() {
        this.container.style.setProperty('--vscode-interactive-result-editor-background-color', this.editorOptions.configuration.resultEditor.backgroundColor?.toString() ?? '');
        this.container.style.setProperty('--vscode-interactive-session-foreground', this.editorOptions.configuration.foreground?.toString() ?? '');
        this.container.style.setProperty('--vscode-chat-list-background', this.themeService.getColorTheme().getColor(this.styles.listBackground)?.toString() ?? '');
    }
    togglePaused() {
        this.viewModel?.model.toggleLastRequestPaused();
        this.onDidChangeItems();
    }
    setModel(model, viewState) {
        if (!this.container) {
            throw new Error('Call render() before setModel()');
        }
        if (model.sessionId === this.viewModel?.sessionId) {
            return;
        }
        this._codeBlockModelCollection.clear();
        this.container.setAttribute('data-session-id', model.sessionId);
        this.viewModel = this.instantiationService.createInstance(ChatViewModel, model, this._codeBlockModelCollection);
        const renderImmediately = this.configurationService.getValue('chat.experimental.renderMarkdownImmediately') === true;
        const delay = renderImmediately ? MicrotaskDelay : 0;
        this.viewModelDisposables.add(Event.runAndSubscribe(Event.accumulate(this.viewModel.onDidChange, delay), (events => {
            if (!this.viewModel) {
                return;
            }
            this.requestInProgress.set(this.viewModel.requestInProgress);
            this.isRequestPaused.set(this.viewModel.requestPausibility === 1 /* ChatPauseState.Paused */);
            this.canRequestBePaused.set(this.viewModel.requestPausibility !== 0 /* ChatPauseState.NotPausable */);
            this.onDidChangeItems();
            if (events?.some(e => e?.kind === 'addRequest') && this.visible) {
                this.scrollToEnd();
            }
            if (this._editingSession) {
                this.renderChatEditingSessionState();
            }
        })));
        this.viewModelDisposables.add(this.viewModel.onDidDisposeModel(() => {
            // Ensure that view state is saved here, because we will load it again when a new model is assigned
            this.input.saveState();
            if (this.viewModel?.editing) {
                this.finishedEditing();
            }
            // Disposes the viewmodel and listeners
            this.viewModel = undefined;
            this.onDidChangeItems();
        }));
        this.input.initForNewChatModel(viewState, model.getRequests().length === 0);
        this.contribs.forEach(c => {
            if (c.setInputState && viewState.inputState?.[c.id]) {
                c.setInputState(viewState.inputState?.[c.id]);
            }
        });
        this.refreshParsedInput();
        this.viewModelDisposables.add(model.onDidChange((e) => {
            if (e.kind === 'setAgent') {
                this._onDidChangeAgent.fire({ agent: e.agent, slashCommand: e.command });
            }
        }));
        if (this.tree && this.visible) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.renderer.updateViewModel(this.viewModel);
        this.updateChatInputContext();
    }
    getFocus() {
        return this.tree.getFocus()[0] ?? undefined;
    }
    reveal(item, relativeTop) {
        this.tree.reveal(item, relativeTop);
    }
    focus(item) {
        const items = this.tree.getNode(null).children;
        const node = items.find(i => i.element?.id === item.id);
        if (!node) {
            return;
        }
        this.tree.setFocus([node.element]);
        this.tree.domFocus();
    }
    refilter() {
        this.tree.refilter();
    }
    setInputPlaceholder(placeholder) {
        this.viewModel?.setInputPlaceholder(placeholder);
    }
    resetInputPlaceholder() {
        this.viewModel?.resetInputPlaceholder();
    }
    setInput(value = '') {
        this.input.setValue(value, false);
        this.refreshParsedInput();
    }
    getInput() {
        return this.input.inputEditor.getValue();
    }
    logInputHistory() {
        this.input.logInputHistory();
    }
    async acceptInput(query, options) {
        return this._acceptInput(query ? { query } : undefined, options);
    }
    async rerunLastRequest() {
        if (!this.viewModel) {
            return;
        }
        const sessionId = this.viewModel.sessionId;
        const lastRequest = this.chatService.getSession(sessionId)?.getRequests().at(-1);
        if (!lastRequest) {
            return;
        }
        const options = {
            attempt: lastRequest.attempt + 1,
            location: this.location,
            userSelectedModelId: this.input.currentLanguageModel
        };
        return await this.chatService.resendRequest(lastRequest, options);
    }
    collectInputState() {
        const inputState = {};
        this.contribs.forEach(c => {
            if (c.getInputState) {
                inputState[c.id] = c.getInputState();
            }
        });
        return inputState;
    }
    _findPromptFileInContext(attachedContext) {
        for (const item of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(item) && item.isRoot && this.promptsService.getPromptFileType(item.value) === PromptsType.prompt) {
                return item.value;
            }
        }
        return undefined;
    }
    async _applyPromptFileIfSet(requestInput) {
        if (!PromptsConfig.enabled(this.configurationService)) {
            // if prompts are not enabled, we don't need to do anything
            return undefined;
        }
        let parseResult;
        // first check if the input has a prompt slash command
        const agentSlashPromptPart = this.parsedInput.parts.find((r) => r instanceof ChatRequestSlashPromptPart);
        if (agentSlashPromptPart) {
            parseResult = await this.promptsService.resolvePromptSlashCommand(agentSlashPromptPart.slashPromptCommand, CancellationToken.None);
            if (parseResult) {
                // add the prompt file to the context, but not sticky
                requestInput.attachedContext.insertFirst(toPromptFileVariableEntry(parseResult.uri, PromptFileVariableKind.PromptFile, undefined, true));
                // remove the slash command from the input
                requestInput.input = this.parsedInput.parts.filter(part => !(part instanceof ChatRequestSlashPromptPart)).map(part => part.text).join('').trim();
            }
        }
        else {
            // if not, check if the context contains a prompt file: This is the old workflow that we still support for legacy reasons
            const uri = this._findPromptFileInContext(requestInput.attachedContext);
            if (uri) {
                parseResult = await this.promptsService.parse(uri, PromptsType.prompt, CancellationToken.None);
            }
        }
        if (!parseResult) {
            return undefined;
        }
        const meta = parseResult.metadata;
        if (meta?.promptType !== PromptsType.prompt) {
            return undefined;
        }
        const input = requestInput.input.trim();
        requestInput.input = `Follow instructions in [${basename(parseResult.uri)}](${parseResult.uri.toString()}).`;
        if (input) {
            // if the input is not empty, append it to the prompt
            requestInput.input += `\n${input}`;
        }
        await this._applyPromptMetadata(meta, requestInput);
        return parseResult;
    }
    async _acceptInput(query, options) {
        if (this.viewModel?.requestInProgress && this.viewModel.requestPausibility !== 1 /* ChatPauseState.Paused */) {
            return;
        }
        if (!query && this.input.generating) {
            // if the user submits the input and generation finishes quickly, just submit it for them
            const generatingAutoSubmitWindow = 500;
            const start = Date.now();
            await this.input.generating;
            if (Date.now() - start > generatingAutoSubmitWindow) {
                return;
            }
        }
        if (this.viewModel) {
            this._onDidAcceptInput.fire();
            this.scrollLock = !!checkModeOption(this.input.currentModeKind, this.viewOptions.autoScroll);
            const editorValue = this.getInput();
            const requestId = this.chatAccessibilityService.acceptRequest();
            const requestInputs = {
                input: !query ? editorValue : query.query,
                attachedContext: this.input.getAttachedAndImplicitContext(this.viewModel.sessionId),
            };
            const isUserQuery = !query;
            if (!this.viewModel.editing) {
                // process the prompt command
                await this._applyPromptFileIfSet(requestInputs);
                await this._autoAttachInstructions(requestInputs);
            }
            if (this.viewOptions.enableWorkingSet !== undefined && this.input.currentModeKind === ChatModeKind.Edit && !this.chatService.edits2Enabled) {
                const uniqueWorkingSetEntries = new ResourceSet(); // NOTE: this is used for bookkeeping so the UI can avoid rendering references in the UI that are already shown in the working set
                const editingSessionAttachedContext = requestInputs.attachedContext;
                // Collect file variables from previous requests before sending the request
                const previousRequests = this.viewModel.model.getRequests();
                for (const request of previousRequests) {
                    for (const variable of request.variableData.variables) {
                        if (URI.isUri(variable.value) && variable.kind === 'file') {
                            const uri = variable.value;
                            if (!uniqueWorkingSetEntries.has(uri)) {
                                editingSessionAttachedContext.add(variable);
                                uniqueWorkingSetEntries.add(variable.value);
                            }
                        }
                    }
                }
                requestInputs.attachedContext = editingSessionAttachedContext;
                this.telemetryService.publicLog2('chatEditing/workingSetSize', { originalSize: uniqueWorkingSetEntries.size, actualSize: uniqueWorkingSetEntries.size });
            }
            this.chatService.cancelCurrentRequestForSession(this.viewModel.sessionId);
            if (this.currentRequest) {
                // We have to wait the current request to be properly cancelled so that it has a chance to update the model with its result metadata.
                // This is awkward, it's basically a limitation of the chat provider-based agent.
                await Promise.race([this.currentRequest, timeout(1000)]);
            }
            this.input.validateAgentMode();
            if (this.viewModel.model.checkpoint) {
                const requests = this.viewModel.model.getRequests();
                for (let i = requests.length - 1; i >= 0; i -= 1) {
                    const request = requests[i];
                    if (request.shouldBeBlocked) {
                        this.chatService.removeRequest(this.viewModel.sessionId, request.id);
                    }
                }
            }
            const result = await this.chatService.sendRequest(this.viewModel.sessionId, requestInputs.input, {
                userSelectedModelId: this.input.currentLanguageModel,
                location: this.location,
                locationData: this._location.resolveData?.(),
                parserContext: { selectedAgent: this._lastSelectedAgent, mode: this.input.currentModeKind },
                attachedContext: requestInputs.attachedContext.asArray(),
                noCommandDetection: options?.noCommandDetection,
                ...this.getModeRequestOptions(),
                modeInstructions: this.input.currentModeObs.get().body?.get()
            });
            if (result) {
                this.input.acceptInput(isUserQuery);
                this._onDidSubmitAgent.fire({ agent: result.agent, slashCommand: result.slashCommand });
                this.currentRequest = result.responseCompletePromise.then(() => {
                    const responses = this.viewModel?.getItems().filter(isResponseVM);
                    const lastResponse = responses?.[responses.length - 1];
                    this.chatAccessibilityService.acceptResponse(lastResponse, requestId, options?.isVoiceInput);
                    if (lastResponse?.result?.nextQuestion) {
                        const { prompt, participant, command } = lastResponse.result.nextQuestion;
                        const question = formatChatQuestion(this.chatAgentService, this.location, prompt, participant, command);
                        if (question) {
                            this.input.setValue(question, false);
                        }
                    }
                    this.currentRequest = undefined;
                });
                if (this.viewModel?.editing) {
                    this.finishedEditing(true);
                }
                return result.responseCreatedPromise;
            }
        }
        return undefined;
    }
    getModeRequestOptions() {
        return {
            modeInstructions: this.input.currentModeObs.get().body?.get(),
            userSelectedTools: this.input.selectedToolsModel.enablementMap.map(map => {
                const userSelectedTools = {};
                for (const [tool, enablement] of map) {
                    userSelectedTools[tool.id] = enablement;
                }
                return userSelectedTools;
            }),
            mode: this.input.currentModeKind,
        };
    }
    getCodeBlockInfosForResponse(response) {
        return this.renderer.getCodeBlockInfosForResponse(response);
    }
    getCodeBlockInfoForEditor(uri) {
        return this.renderer.getCodeBlockInfoForEditor(uri);
    }
    getFileTreeInfosForResponse(response) {
        return this.renderer.getFileTreeInfosForResponse(response);
    }
    getLastFocusedFileTreeForResponse(response) {
        return this.renderer.getLastFocusedFileTreeForResponse(response);
    }
    focusLastMessage() {
        if (!this.viewModel) {
            return;
        }
        const items = this.tree.getNode(null).children;
        const lastItem = items[items.length - 1];
        if (!lastItem) {
            return;
        }
        this.tree.setFocus([lastItem.element]);
        this.tree.domFocus();
    }
    layout(height, width) {
        width = Math.min(width, 850);
        this.bodyDimension = new dom.Dimension(width, height);
        const layoutHeight = this._dynamicMessageLayoutData?.enabled ? this._dynamicMessageLayoutData.maxHeight : height;
        if (this.viewModel?.editing) {
            this.inlineInputPart?.layout(layoutHeight, width);
        }
        if (this.container.classList.contains('experimental-welcome-view')) {
            this.inputPart.layout(layoutHeight, Math.min(width, 650));
        }
        else {
            this.inputPart.layout(layoutHeight, width);
        }
        const inputHeight = this.inputPart.inputPartHeight;
        const lastElementVisible = this.tree.scrollTop + this.tree.renderHeight >= this.tree.scrollHeight - 2;
        const contentHeight = Math.max(0, height - inputHeight);
        if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal') {
            this.listContainer.style.removeProperty('--chat-current-response-min-height');
        }
        else {
            this.listContainer.style.setProperty('--chat-current-response-min-height', contentHeight * .75 + 'px');
        }
        this.tree.layout(contentHeight, width);
        this.tree.getHTMLElement().style.height = `${contentHeight}px`;
        // Push the welcome message down so it doesn't change position
        // when followups, attachments or working set appear
        let welcomeOffset = 100;
        if (this.viewOptions.renderFollowups) {
            welcomeOffset = Math.max(welcomeOffset - this.input.followupsHeight, 0);
        }
        if (this.viewOptions.enableWorkingSet) {
            welcomeOffset = Math.max(welcomeOffset - this.input.editSessionWidgetHeight, 0);
        }
        welcomeOffset = Math.max(welcomeOffset - this.input.attachmentsHeight, 0);
        this.welcomeMessageContainer.style.height = `${contentHeight - welcomeOffset}px`;
        this.welcomeMessageContainer.style.paddingBottom = `${welcomeOffset}px`;
        this.renderer.layout(width);
        const lastItem = this.viewModel?.getItems().at(-1);
        const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
        if (lastElementVisible && (!lastResponseIsRendering || checkModeOption(this.input.currentModeKind, this.viewOptions.autoScroll))) {
            this.scrollToEnd();
        }
        this.listContainer.style.height = `${contentHeight}px`;
        this._onDidChangeHeight.fire(height);
    }
    // An alternative to layout, this allows you to specify the number of ChatTreeItems
    // you want to show, and the max height of the container. It will then layout the
    // tree to show that many items.
    // TODO@TylerLeonhardt: This could use some refactoring to make it clear which layout strategy is being used
    setDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        this._register(this.renderer.onDidChangeItemHeight(() => this.layoutDynamicChatTreeItemMode()));
        const mutableDisposable = this._register(new MutableDisposable());
        this._register(this.tree.onDidScroll((e) => {
            // TODO@TylerLeonhardt this should probably just be disposed when this is disabled
            // and then set up again when it is enabled again
            if (!this._dynamicMessageLayoutData?.enabled) {
                return;
            }
            mutableDisposable.value = dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                if (!e.scrollTopChanged || e.heightChanged || e.scrollHeightChanged) {
                    return;
                }
                const renderHeight = e.height;
                const diff = e.scrollHeight - renderHeight - e.scrollTop;
                if (diff === 0) {
                    return;
                }
                const possibleMaxHeight = (this._dynamicMessageLayoutData?.maxHeight ?? maxHeight);
                const width = this.bodyDimension?.width ?? this.container.offsetWidth;
                this.input.layout(possibleMaxHeight, width);
                const inputPartHeight = this.input.inputPartHeight;
                const newHeight = Math.min(renderHeight + diff, possibleMaxHeight - inputPartHeight);
                this.layout(newHeight + inputPartHeight, width);
            });
        }));
    }
    updateDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        let hasChanged = false;
        let height = this.bodyDimension.height;
        let width = this.bodyDimension.width;
        if (maxHeight < this.bodyDimension.height) {
            height = maxHeight;
            hasChanged = true;
        }
        const containerWidth = this.container.offsetWidth;
        if (this.bodyDimension?.width !== containerWidth) {
            width = containerWidth;
            hasChanged = true;
        }
        if (hasChanged) {
            this.layout(height, width);
        }
    }
    get isDynamicChatTreeItemLayoutEnabled() {
        return this._dynamicMessageLayoutData?.enabled ?? false;
    }
    set isDynamicChatTreeItemLayoutEnabled(value) {
        if (!this._dynamicMessageLayoutData) {
            return;
        }
        this._dynamicMessageLayoutData.enabled = value;
    }
    layoutDynamicChatTreeItemMode() {
        if (!this.viewModel || !this._dynamicMessageLayoutData?.enabled) {
            return;
        }
        const width = this.bodyDimension?.width ?? this.container.offsetWidth;
        this.input.layout(this._dynamicMessageLayoutData.maxHeight, width);
        const inputHeight = this.input.inputPartHeight;
        const totalMessages = this.viewModel.getItems();
        // grab the last N messages
        const messages = totalMessages.slice(-this._dynamicMessageLayoutData.numOfMessages);
        const needsRerender = messages.some(m => m.currentRenderedHeight === undefined);
        const listHeight = needsRerender
            ? this._dynamicMessageLayoutData.maxHeight
            : messages.reduce((acc, message) => acc + message.currentRenderedHeight, 0);
        this.layout(Math.min(
        // we add an additional 18px in order to show that there is scrollable content
        inputHeight + listHeight + (totalMessages.length > 2 ? 18 : 0), this._dynamicMessageLayoutData.maxHeight), width);
        if (needsRerender || !listHeight) {
            this.scrollToEnd();
        }
    }
    saveState() {
        this.input.saveState();
    }
    getViewState() {
        return {
            inputValue: this.getInput(),
            inputState: this.input.getViewState()
        };
    }
    updateChatInputContext() {
        const currentAgent = this.parsedInput.parts.find(part => part instanceof ChatRequestAgentPart);
        this.agentInInput.set(!!currentAgent);
    }
    async _applyPromptMetadata(metadata, requestInput) {
        const { mode, tools, model } = metadata;
        // switch to appropriate chat mode if needed
        if (mode && mode !== this.input.currentModeKind) {
            const chatModeCheck = await this.instantiationService.invokeFunction(handleModeSwitch, this.input.currentModeKind, mode, this.viewModel?.model.getRequests().length ?? 0, this.viewModel?.model.editingSession);
            if (!chatModeCheck) {
                return undefined;
            }
            else if (chatModeCheck.needToClearSession) {
                this.clear();
                await this.waitForReady();
            }
            this.input.setChatMode(mode);
        }
        // if not tools to enable are present, we are done
        if (tools !== undefined && this.input.currentModeKind === ChatModeKind.Agent) {
            const enablementMap = this.toolsService.toToolAndToolSetEnablementMap(tools);
            this.input.selectedToolsModel.set(enablementMap, true);
        }
        if (model !== undefined) {
            this.input.switchModelByQualifiedName(model);
        }
    }
    /**
     * Adds additional instructions to the context
     * - instructions that have a 'applyTo' pattern that matches the current input
     * - instructions referenced in the copilot settings 'copilot-instructions'
     * - instructions referenced in an already included instruction file
     */
    async _autoAttachInstructions({ attachedContext }) {
        const promptsConfigEnabled = PromptsConfig.enabled(this.configurationService);
        this.logService.debug(`ChatWidget#_autoAttachInstructions: ${PromptsConfig.KEY}: ${promptsConfigEnabled}`);
        if (promptsConfigEnabled) {
            let readFileTool = this.toolsService.getToolByName('readFile');
            const enablementMap = this.input.selectedToolsModel.enablementMap.get();
            if (readFileTool && Iterable.some(enablementMap, ([tool, enabled]) => tool.id === readFileTool.id && enabled === false)) {
                readFileTool = undefined;
            }
            const computer = this.instantiationService.createInstance(ComputeAutomaticInstructions, readFileTool);
            await computer.collect(attachedContext, CancellationToken.None);
        }
        else {
            const computer = this.instantiationService.createInstance(ComputeAutomaticInstructions, undefined);
            await computer.collectCopilotInstructionsOnly(attachedContext, CancellationToken.None);
        }
        // add to attached list to make the instructions sticky
        //this.inputPart.attachmentModel.addContext(...computer.autoAddedInstructions);
    }
};
ChatWidget = ChatWidget_1 = __decorate([
    __param(4, ICodeEditorService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IInstantiationService),
    __param(8, IChatService),
    __param(9, IChatAgentService),
    __param(10, IChatWidgetService),
    __param(11, IContextMenuService),
    __param(12, IChatAccessibilityService),
    __param(13, ILogService),
    __param(14, IThemeService),
    __param(15, IChatSlashCommandService),
    __param(16, IChatEditingService),
    __param(17, ITelemetryService),
    __param(18, IPromptsService),
    __param(19, ILanguageModelToolsService),
    __param(20, IWorkspaceContextService)
], ChatWidget);
export { ChatWidget };
export class ChatWidgetService extends Disposable {
    constructor() {
        super(...arguments);
        this._widgets = [];
        this._lastFocusedWidget = undefined;
        this._onDidAddWidget = this._register(new Emitter());
        this.onDidAddWidget = this._onDidAddWidget.event;
    }
    get lastFocusedWidget() {
        return this._lastFocusedWidget;
    }
    getAllWidgets() {
        return this._widgets;
    }
    getWidgetsByLocations(location) {
        return this._widgets.filter(w => w.location === location);
    }
    getWidgetByInputUri(uri) {
        return this._widgets.find(w => isEqual(w.inputUri, uri));
    }
    getWidgetBySessionId(sessionId) {
        return this._widgets.find(w => w.viewModel?.sessionId === sessionId);
    }
    setLastFocusedWidget(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget = widget;
    }
    register(newWidget) {
        if (this._widgets.some(widget => widget === newWidget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        this._widgets.push(newWidget);
        this._onDidAddWidget.fire(newWidget);
        return combinedDisposable(newWidget.onDidFocus(() => this.setLastFocusedWidget(newWidget)), toDisposable(() => this._widgets.splice(this._widgets.indexOf(newWidget), 1)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckosT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pGLE9BQU8sRUFB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