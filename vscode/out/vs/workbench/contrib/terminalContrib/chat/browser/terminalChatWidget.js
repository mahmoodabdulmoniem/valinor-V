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
import { Dimension, getActiveWindow, trackFocus } from '../../../../../base/browser/dom.js';
import { createCancelablePromise, DeferredPromise } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { MicrotaskDelay } from '../../../../../base/common/symbols.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { showChatView } from '../../../chat/browser/chat.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { isCellTextEditOperation } from '../../../chat/common/chatModel.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { InlineChatWidget } from '../../../inlineChat/browser/inlineChatWidget.js';
import { MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { TerminalStickyScrollContribution } from '../../stickyScroll/browser/terminalStickyScrollContribution.js';
import './media/terminalChatWidget.css';
import { MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR, MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
var Constants;
(function (Constants) {
    Constants[Constants["HorizontalMargin"] = 10] = "HorizontalMargin";
    Constants[Constants["VerticalMargin"] = 30] = "VerticalMargin";
    /** The right padding of the widget, this should align exactly with that in the editor. */
    Constants[Constants["RightPadding"] = 12] = "RightPadding";
    /** The max allowed height of the widget. */
    Constants[Constants["MaxHeight"] = 480] = "MaxHeight";
    /** The max allowed height of the widget as a percentage of the terminal viewport. */
    Constants[Constants["MaxHeightPercentageOfViewport"] = 0.75] = "MaxHeightPercentageOfViewport";
})(Constants || (Constants = {}));
var Message;
(function (Message) {
    Message[Message["None"] = 0] = "None";
    Message[Message["AcceptSession"] = 1] = "AcceptSession";
    Message[Message["CancelSession"] = 2] = "CancelSession";
    Message[Message["PauseSession"] = 4] = "PauseSession";
    Message[Message["CancelRequest"] = 8] = "CancelRequest";
    Message[Message["CancelInput"] = 16] = "CancelInput";
    Message[Message["AcceptInput"] = 32] = "AcceptInput";
    Message[Message["ReturnInput"] = 64] = "ReturnInput";
})(Message || (Message = {}));
let TerminalChatWidget = class TerminalChatWidget extends Disposable {
    get inlineChatWidget() { return this._inlineChatWidget; }
    get lastResponseContent() {
        return this._lastResponseContent;
    }
    constructor(_terminalElement, _instance, _xterm, contextKeyService, _chatService, _storageService, _viewsService, instantiationService, _chatAgentService) {
        super();
        this._terminalElement = _terminalElement;
        this._instance = _instance;
        this._xterm = _xterm;
        this._chatService = _chatService;
        this._storageService = _storageService;
        this._viewsService = _viewsService;
        this._chatAgentService = _chatAgentService;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._messages = this._store.add(new Emitter());
        this._viewStateStorageKey = 'terminal-inline-chat-view-state';
        this._terminalAgentName = 'terminal';
        this._model = this._register(new MutableDisposable());
        this._requestInProgress = observableValue(this, false);
        this.requestInProgress = this._requestInProgress;
        this._focusedContextKey = TerminalChatContextKeys.focused.bindTo(contextKeyService);
        this._visibleContextKey = TerminalChatContextKeys.visible.bindTo(contextKeyService);
        this._requestActiveContextKey = TerminalChatContextKeys.requestActive.bindTo(contextKeyService);
        this._responseContainsCodeBlockContextKey = TerminalChatContextKeys.responseContainsCodeBlock.bindTo(contextKeyService);
        this._responseContainsMulitpleCodeBlocksContextKey = TerminalChatContextKeys.responseContainsMultipleCodeBlocks.bindTo(contextKeyService);
        this._container = document.createElement('div');
        this._container.classList.add('terminal-inline-chat');
        this._terminalElement.appendChild(this._container);
        this._inlineChatWidget = instantiationService.createInstance(InlineChatWidget, {
            location: ChatAgentLocation.Terminal,
            resolveData: () => {
                // TODO@meganrogge return something that identifies this terminal
                return undefined;
            }
        }, {
            statusMenuId: {
                menu: MENU_TERMINAL_CHAT_WIDGET_STATUS,
                options: {
                    buttonConfigProvider: action => ({
                        showLabel: action.id !== "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        showIcon: action.id === "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        isSecondary: action.id !== "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */ && action.id !== "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */
                    })
                }
            },
            secondaryMenuId: MENU_INLINE_CHAT_WIDGET_SECONDARY,
            chatWidgetViewOptions: {
                menus: {
                    telemetrySource: 'terminal-inline-chat',
                    executeToolbar: MenuId.ChatExecute,
                    inputSideToolbar: MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR,
                }
            }
        });
        this._register(this._inlineChatWidget.chatWidget.onDidChangeViewModel(() => this._saveViewState()));
        this._register(Event.any(this._inlineChatWidget.onDidChangeHeight, this._instance.onDimensionsChanged, this._inlineChatWidget.chatWidget.onDidChangeContentHeight, Event.debounce(this._xterm.raw.onCursorMove, () => void 0, MicrotaskDelay))(() => this._relayout()));
        const observer = new ResizeObserver(() => this._relayout());
        observer.observe(this._terminalElement);
        this._register(toDisposable(() => observer.disconnect()));
        this._resetPlaceholder();
        this._container.appendChild(this._inlineChatWidget.domNode);
        this._focusTracker = this._register(trackFocus(this._container));
        this._register(this._focusTracker.onDidFocus(() => this._focusedContextKey.set(true)));
        this._register(this._focusTracker.onDidBlur(() => this._focusedContextKey.set(false)));
        this._register(autorun(r => {
            const isBusy = this._inlineChatWidget.requestInProgress.read(r);
            this._container.classList.toggle('busy', isBusy);
            this._inlineChatWidget.toggleStatus(!!this._inlineChatWidget.responseContent);
            if (isBusy || !this._inlineChatWidget.responseContent) {
                this._responseContainsCodeBlockContextKey.set(false);
                this._responseContainsMulitpleCodeBlocksContextKey.set(false);
            }
            else {
                Promise.all([
                    this._inlineChatWidget.getCodeBlockInfo(0),
                    this._inlineChatWidget.getCodeBlockInfo(1)
                ]).then(([firstCodeBlock, secondCodeBlock]) => {
                    this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                    this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                    this._inlineChatWidget.updateToolbar(true);
                });
            }
        }));
        this.hide();
    }
    _relayout() {
        if (this._dimension) {
            this._doLayout();
        }
    }
    _doLayout() {
        const xtermElement = this._xterm.raw.element;
        if (!xtermElement) {
            return;
        }
        const style = getActiveWindow().getComputedStyle(xtermElement);
        // Calculate width
        const xtermLeftPadding = parseInt(style.paddingLeft);
        const width = xtermElement.clientWidth - xtermLeftPadding - 12 /* Constants.RightPadding */;
        if (width === 0) {
            return;
        }
        // Calculate height
        const terminalViewportHeight = this._getTerminalViewportHeight();
        const widgetAllowedPercentBasedHeight = (terminalViewportHeight ?? 0) * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (height === 0) {
            return;
        }
        // Layout
        this._dimension = new Dimension(width, height);
        this._inlineChatWidget.layout(this._dimension);
        this._inlineChatWidget.domNode.style.paddingLeft = `${xtermLeftPadding}px`;
        this._updateXtermViewportPosition();
    }
    _resetPlaceholder() {
        const defaultAgent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Terminal);
        this.inlineChatWidget.placeholder = defaultAgent?.description ?? localize('askAI', 'Ask AI');
    }
    async reveal(viewState) {
        await this._createSession(viewState);
        this._doLayout();
        this._container.classList.remove('hide');
        this._visibleContextKey.set(true);
        this._resetPlaceholder();
        this._inlineChatWidget.focus();
        this._instance.scrollToBottom();
    }
    _getTerminalCursorTop() {
        const font = this._instance.xterm?.getFont();
        if (!font?.charHeight) {
            return;
        }
        const terminalWrapperHeight = this._getTerminalViewportHeight() ?? 0;
        const cellHeight = font.charHeight * font.lineHeight;
        const topPadding = terminalWrapperHeight - (this._instance.rows * cellHeight);
        const cursorY = (this._instance.xterm?.raw.buffer.active.cursorY ?? 0) + 1;
        return topPadding + cursorY * cellHeight;
    }
    _updateXtermViewportPosition() {
        const top = this._getTerminalCursorTop();
        if (!top) {
            return;
        }
        this._container.style.top = `${top}px`;
        const terminalViewportHeight = this._getTerminalViewportHeight();
        if (!terminalViewportHeight) {
            return;
        }
        const widgetAllowedPercentBasedHeight = terminalViewportHeight * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (top > terminalViewportHeight - height && terminalViewportHeight - height > 0) {
            this._setTerminalViewportOffset(top - (terminalViewportHeight - height));
        }
        else {
            this._setTerminalViewportOffset(undefined);
        }
    }
    _getTerminalViewportHeight() {
        return this._terminalElement.clientHeight;
    }
    hide() {
        this._container.classList.add('hide');
        this._inlineChatWidget.reset();
        this._resetPlaceholder();
        this._inlineChatWidget.updateToolbar(false);
        this._visibleContextKey.set(false);
        this._inlineChatWidget.value = '';
        this._instance.focus();
        this._setTerminalViewportOffset(undefined);
        this._onDidHide.fire();
    }
    _setTerminalViewportOffset(offset) {
        if (offset === undefined || this._container.classList.contains('hide')) {
            this._terminalElement.style.position = '';
            this._terminalElement.style.bottom = '';
            TerminalStickyScrollContribution.get(this._instance)?.hideUnlock();
        }
        else {
            this._terminalElement.style.position = 'relative';
            this._terminalElement.style.bottom = `${offset}px`;
            TerminalStickyScrollContribution.get(this._instance)?.hideLock();
        }
    }
    focus() {
        this.inlineChatWidget.focus();
    }
    hasFocus() {
        return this._inlineChatWidget.hasFocus();
    }
    setValue(value) {
        this._inlineChatWidget.value = value ?? '';
    }
    async acceptCommand(shouldExecute) {
        const code = await this.inlineChatWidget.getCodeBlockInfo(0);
        if (!code) {
            return;
        }
        const value = code.getValue();
        this._instance.runCommand(value, shouldExecute);
        this.clear();
    }
    get focusTracker() {
        return this._focusTracker;
    }
    async _createSession(viewState) {
        this._sessionCtor = createCancelablePromise(async (token) => {
            if (!this._model.value) {
                this._model.value = this._chatService.startSession(ChatAgentLocation.Terminal, token);
                const model = this._model.value;
                if (model) {
                    this._inlineChatWidget.setChatModel(model, this._loadViewState());
                    this._resetPlaceholder();
                }
                if (!this._model.value) {
                    throw new Error('Failed to start chat session');
                }
            }
        });
        this._register(toDisposable(() => this._sessionCtor?.cancel()));
    }
    _loadViewState() {
        const rawViewState = this._storageService.get(this._viewStateStorageKey, 0 /* StorageScope.PROFILE */, undefined);
        let viewState;
        if (rawViewState) {
            try {
                viewState = JSON.parse(rawViewState);
            }
            catch {
                viewState = undefined;
            }
        }
        return viewState;
    }
    _saveViewState() {
        this._storageService.store(this._viewStateStorageKey, JSON.stringify(this._inlineChatWidget.chatWidget.getViewState()), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    clear() {
        this.cancel();
        this._model.clear();
        this._responseContainsCodeBlockContextKey.reset();
        this._requestActiveContextKey.reset();
        this.hide();
        this.setValue(undefined);
    }
    async acceptInput(query, options) {
        if (!this._model.value) {
            await this.reveal();
        }
        this._messages.fire(32 /* Message.AcceptInput */);
        const lastInput = this._inlineChatWidget.value;
        if (!lastInput) {
            return;
        }
        this._activeRequestCts?.cancel();
        this._activeRequestCts = new CancellationTokenSource();
        const store = new DisposableStore();
        this._requestActiveContextKey.set(true);
        const response = await this._inlineChatWidget.chatWidget.acceptInput(lastInput, { isVoiceInput: options?.isVoiceInput });
        this._currentRequestId = response?.requestId;
        const responsePromise = new DeferredPromise();
        try {
            this._requestActiveContextKey.set(true);
            if (response) {
                store.add(response.onDidChange(async () => {
                    if (response.isCanceled) {
                        this._requestActiveContextKey.set(false);
                        responsePromise.complete(undefined);
                        return;
                    }
                    if (response.isComplete) {
                        this._requestActiveContextKey.set(false);
                        this._requestActiveContextKey.set(false);
                        const firstCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(0);
                        const secondCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(1);
                        this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                        this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                        this._inlineChatWidget.updateToolbar(true);
                        responsePromise.complete(response);
                    }
                }));
            }
            await responsePromise.p;
            this._lastResponseContent = response?.response.getMarkdown();
            return response;
        }
        catch {
            this._lastResponseContent = undefined;
            return;
        }
        finally {
            store.dispose();
        }
    }
    cancel() {
        this._sessionCtor?.cancel();
        this._sessionCtor = undefined;
        this._activeRequestCts?.cancel();
        this._requestActiveContextKey.set(false);
        const model = this._inlineChatWidget.getChatModel();
        if (!model?.sessionId) {
            return;
        }
        this._chatService.cancelCurrentRequestForSession(model?.sessionId);
    }
    async viewInChat() {
        const widget = await showChatView(this._viewsService);
        const currentRequest = this._inlineChatWidget.chatWidget.viewModel?.model.getRequests().find(r => r.id === this._currentRequestId);
        if (!widget || !currentRequest?.response) {
            return;
        }
        const message = [];
        for (const item of currentRequest.response.response.value) {
            if (item.kind === 'textEditGroup') {
                for (const group of item.edits) {
                    message.push({
                        kind: 'textEdit',
                        edits: group,
                        uri: item.uri
                    });
                }
            }
            else if (item.kind === 'notebookEditGroup') {
                for (const group of item.edits) {
                    if (isCellTextEditOperation(group)) {
                        message.push({
                            kind: 'textEdit',
                            edits: [group.edit],
                            uri: group.uri
                        });
                    }
                    else {
                        message.push({
                            kind: 'notebookEdit',
                            edits: [group],
                            uri: item.uri
                        });
                    }
                }
            }
            else {
                message.push(item);
            }
        }
        this._chatService.addCompleteRequest(widget.viewModel.sessionId, `@${this._terminalAgentName} ${currentRequest.message.text}`, currentRequest.variableData, currentRequest.attempt, {
            message,
            result: currentRequest.response.result,
            followups: currentRequest.response.followups
        });
        widget.focusLastMessage();
        this.hide();
    }
};
TerminalChatWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IStorageService),
    __param(6, IViewsService),
    __param(7, IInstantiationService),
    __param(8, IChatAgentService)
], TerminalChatWidget);
export { TerminalChatWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBaUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0csT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLDBDQUEwQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFt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