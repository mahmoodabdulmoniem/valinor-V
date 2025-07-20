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
var VoiceChatSessions_1, ChatSynthesizerSessions_1, KeywordActivationContribution_1, KeywordActivationStatusEntry_1;
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { RunOnceScheduler, disposableTimeout, raceCancellation } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import Severity from '../../../../../base/common/severity.js';
import { isNumber } from '../../../../../base/common/types.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Extensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { contrastBorder, focusBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading, syncing } from '../../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND } from '../../../../common/theme.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { SpeechTimeoutDefault, accessibilityConfigurationNodeBase } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { InlineChatController } from '../../../inlineChat/browser/inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED, MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { NOTEBOOK_EDITOR_FOCUSED } from '../../../notebook/common/notebookContextKeys.js';
import { CONTEXT_SETTINGS_EDITOR } from '../../../preferences/common/preferences.js';
import { SearchContext } from '../../../search/common/constants.js';
import { TextToSpeechInProgress as GlobalTextToSpeechInProgress, HasSpeechProvider, ISpeechService, KeywordRecognitionStatus, SpeechToTextInProgress, SpeechToTextStatus, TextToSpeechStatus } from '../../../speech/common/speechService.js';
import { CHAT_CATEGORY } from '../../browser/actions/chatActions.js';
import { IChatWidgetService, IQuickChatService, showChatView } from '../../browser/chat.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { KEYWORD_ACTIVIATION_SETTING_ID } from '../../common/chatService.js';
import { ChatResponseViewModel, isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { VoiceChatInProgress as GlobalVoiceChatInProgress, IVoiceChatService } from '../../common/voiceChatService.js';
import './media/voiceChatActions.css';
const VoiceChatSessionContexts = ['view', 'inline', 'quick', 'editor'];
// Global Context Keys (set on global context key service)
const CanVoiceChat = ContextKeyExpr.and(ChatContextKeys.enabled, HasSpeechProvider);
const FocusInChatInput = ContextKeyExpr.or(CTX_INLINE_CHAT_FOCUSED, ChatContextKeys.inChatInput);
const AnyChatRequestInProgress = ChatContextKeys.requestInProgress;
// Scoped Context Keys (set on per-chat-context scoped context key service)
const ScopedVoiceChatGettingReady = new RawContextKey('scopedVoiceChatGettingReady', false, { type: 'boolean', description: localize('scopedVoiceChatGettingReady', "True when getting ready for receiving voice input from the microphone for voice chat. This key is only defined scoped, per chat context.") });
const ScopedVoiceChatInProgress = new RawContextKey('scopedVoiceChatInProgress', undefined, { type: 'string', description: localize('scopedVoiceChatInProgress', "Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.") });
const AnyScopedVoiceChatInProgress = ContextKeyExpr.or(...VoiceChatSessionContexts.map(context => ScopedVoiceChatInProgress.isEqualTo(context)));
var VoiceChatSessionState;
(function (VoiceChatSessionState) {
    VoiceChatSessionState[VoiceChatSessionState["Stopped"] = 1] = "Stopped";
    VoiceChatSessionState[VoiceChatSessionState["GettingReady"] = 2] = "GettingReady";
    VoiceChatSessionState[VoiceChatSessionState["Started"] = 3] = "Started";
})(VoiceChatSessionState || (VoiceChatSessionState = {}));
class VoiceChatSessionControllerFactory {
    static async create(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const quickChatService = accessor.get(IQuickChatService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorService = accessor.get(IEditorService);
        const viewsService = accessor.get(IViewsService);
        switch (context) {
            case 'focused': {
                const controller = VoiceChatSessionControllerFactory.doCreateForFocusedChat(chatWidgetService, layoutService);
                return controller ?? VoiceChatSessionControllerFactory.create(accessor, 'view'); // fallback to 'view'
            }
            case 'view': {
                const chatWidget = await showChatView(viewsService);
                if (chatWidget) {
                    return VoiceChatSessionControllerFactory.doCreateForChatWidget('view', chatWidget);
                }
                break;
            }
            case 'inline': {
                const activeCodeEditor = getCodeEditor(editorService.activeTextEditorControl);
                if (activeCodeEditor) {
                    const inlineChat = InlineChatController.get(activeCodeEditor);
                    if (inlineChat) {
                        if (!inlineChat.isActive) {
                            inlineChat.run();
                        }
                        return VoiceChatSessionControllerFactory.doCreateForChatWidget('inline', inlineChat.widget.chatWidget);
                    }
                }
                break;
            }
            case 'quick': {
                quickChatService.open(); // this will populate focused chat widget in the chat widget service
                return VoiceChatSessionControllerFactory.create(accessor, 'focused');
            }
        }
        return undefined;
    }
    static doCreateForFocusedChat(chatWidgetService, layoutService) {
        const chatWidget = chatWidgetService.lastFocusedWidget;
        if (chatWidget?.hasInputFocus()) {
            // Figure out the context of the chat widget by asking
            // layout service for the part that has focus. Unfortunately
            // there is no better way because the widget does not know
            // its location.
            let context;
            if (layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
                context = chatWidget.location === ChatAgentLocation.Panel ? 'editor' : 'inline';
            }
            else if (["workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, "workbench.parts.banner" /* Parts.BANNER_PART */, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */].some(part => layoutService.hasFocus(part))) {
                context = 'view';
            }
            else {
                context = 'quick';
            }
            return VoiceChatSessionControllerFactory.doCreateForChatWidget(context, chatWidget);
        }
        return undefined;
    }
    static createChatContextKeyController(contextKeyService, context) {
        const contextVoiceChatGettingReady = ScopedVoiceChatGettingReady.bindTo(contextKeyService);
        const contextVoiceChatInProgress = ScopedVoiceChatInProgress.bindTo(contextKeyService);
        return (state) => {
            switch (state) {
                case VoiceChatSessionState.GettingReady:
                    contextVoiceChatGettingReady.set(true);
                    contextVoiceChatInProgress.reset();
                    break;
                case VoiceChatSessionState.Started:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.set(context);
                    break;
                case VoiceChatSessionState.Stopped:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.reset();
                    break;
            }
        };
    }
    static doCreateForChatWidget(context, chatWidget) {
        return {
            context,
            scopedContextKeyService: chatWidget.scopedContextKeyService,
            onDidAcceptInput: chatWidget.onDidAcceptInput,
            onDidHideInput: chatWidget.onDidHide,
            focusInput: () => chatWidget.focusInput(),
            acceptInput: () => chatWidget.acceptInput(undefined, { isVoiceInput: true }),
            updateInput: text => chatWidget.setInput(text),
            getInput: () => chatWidget.getInput(),
            setInputPlaceholder: text => chatWidget.setInputPlaceholder(text),
            clearInputPlaceholder: () => chatWidget.resetInputPlaceholder(),
            updateState: VoiceChatSessionControllerFactory.createChatContextKeyController(chatWidget.scopedContextKeyService, context)
        };
    }
}
let VoiceChatSessions = class VoiceChatSessions {
    static { VoiceChatSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!VoiceChatSessions_1.instance) {
            VoiceChatSessions_1.instance = instantiationService.createInstance(VoiceChatSessions_1);
        }
        return VoiceChatSessions_1.instance;
    }
    constructor(voiceChatService, configurationService, instantiationService, accessibilityService) {
        this.voiceChatService = voiceChatService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.accessibilityService = accessibilityService;
        this.currentVoiceChatSession = undefined;
        this.voiceChatSessionIds = 0;
    }
    async start(controller, context) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        ChatSynthesizerSessions.getInstance(this.instantiationService).stop();
        let disableTimeout = false;
        const sessionId = ++this.voiceChatSessionIds;
        const session = this.currentVoiceChatSession = {
            id: sessionId,
            controller,
            hasRecognizedInput: false,
            disposables: new DisposableStore(),
            setTimeoutDisabled: (disabled) => { disableTimeout = disabled; },
            accept: () => this.accept(sessionId),
            stop: () => this.stop(sessionId, controller.context)
        };
        const cts = new CancellationTokenSource();
        session.disposables.add(toDisposable(() => cts.dispose(true)));
        session.disposables.add(controller.onDidAcceptInput(() => this.stop(sessionId, controller.context)));
        session.disposables.add(controller.onDidHideInput(() => this.stop(sessionId, controller.context)));
        controller.focusInput();
        controller.updateState(VoiceChatSessionState.GettingReady);
        const voiceChatSession = await this.voiceChatService.createVoiceChatSession(cts.token, { usesAgents: controller.context !== 'inline', model: context?.widget?.viewModel?.model });
        let inputValue = controller.getInput();
        let voiceChatTimeout = this.configurationService.getValue("accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */);
        if (!isNumber(voiceChatTimeout) || voiceChatTimeout < 0) {
            voiceChatTimeout = SpeechTimeoutDefault;
        }
        const acceptTranscriptionScheduler = session.disposables.add(new RunOnceScheduler(() => this.accept(sessionId), voiceChatTimeout));
        session.disposables.add(voiceChatSession.onDidChange(({ status, text, waitingForInput }) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            switch (status) {
                case SpeechToTextStatus.Started:
                    this.onDidSpeechToTextSessionStart(controller, session.disposables);
                    break;
                case SpeechToTextStatus.Recognizing:
                    if (text) {
                        session.hasRecognizedInput = true;
                        session.controller.updateInput(inputValue ? [inputValue, text].join(' ') : text);
                        if (voiceChatTimeout > 0 && context?.voice?.disableTimeout !== true && !disableTimeout) {
                            acceptTranscriptionScheduler.cancel();
                        }
                    }
                    break;
                case SpeechToTextStatus.Recognized:
                    if (text) {
                        session.hasRecognizedInput = true;
                        inputValue = inputValue ? [inputValue, text].join(' ') : text;
                        session.controller.updateInput(inputValue);
                        if (voiceChatTimeout > 0 && context?.voice?.disableTimeout !== true && !waitingForInput && !disableTimeout) {
                            acceptTranscriptionScheduler.schedule();
                        }
                    }
                    break;
                case SpeechToTextStatus.Stopped:
                    this.stop(session.id, controller.context);
                    break;
            }
        }));
        return session;
    }
    onDidSpeechToTextSessionStart(controller, disposables) {
        controller.updateState(VoiceChatSessionState.Started);
        let dotCount = 0;
        const updatePlaceholder = () => {
            dotCount = (dotCount + 1) % 4;
            controller.setInputPlaceholder(`${localize('listening', "I'm listening")}${'.'.repeat(dotCount)}`);
            placeholderScheduler.schedule();
        };
        const placeholderScheduler = disposables.add(new RunOnceScheduler(updatePlaceholder, 500));
        updatePlaceholder();
    }
    stop(voiceChatSessionId = this.voiceChatSessionIds, context) {
        if (!this.currentVoiceChatSession ||
            this.voiceChatSessionIds !== voiceChatSessionId ||
            (context && this.currentVoiceChatSession.controller.context !== context)) {
            return;
        }
        this.currentVoiceChatSession.controller.clearInputPlaceholder();
        this.currentVoiceChatSession.controller.updateState(VoiceChatSessionState.Stopped);
        this.currentVoiceChatSession.disposables.dispose();
        this.currentVoiceChatSession = undefined;
    }
    async accept(voiceChatSessionId = this.voiceChatSessionIds) {
        if (!this.currentVoiceChatSession ||
            this.voiceChatSessionIds !== voiceChatSessionId) {
            return;
        }
        if (!this.currentVoiceChatSession.hasRecognizedInput) {
            // If we have an active session but without recognized
            // input, we do not want to just accept the input that
            // was maybe typed before. But we still want to stop the
            // voice session because `acceptInput` would do that.
            this.stop(voiceChatSessionId, this.currentVoiceChatSession.controller.context);
            return;
        }
        const controller = this.currentVoiceChatSession.controller;
        const response = await controller.acceptInput();
        if (!response) {
            return;
        }
        const autoSynthesize = this.configurationService.getValue("accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */);
        if (autoSynthesize === 'on' || (autoSynthesize !== 'off' && !this.accessibilityService.isScreenReaderOptimized())) {
            let context;
            if (controller.context === 'inline') {
                // This is ugly, but the lightweight inline chat turns into
                // a different widget as soon as a response comes in, so we fallback to
                // picking up from the focused chat widget
                context = 'focused';
            }
            else {
                context = controller;
            }
            ChatSynthesizerSessions.getInstance(this.instantiationService).start(this.instantiationService.invokeFunction(accessor => ChatSynthesizerSessionController.create(accessor, context, response)));
        }
    }
};
VoiceChatSessions = VoiceChatSessions_1 = __decorate([
    __param(0, IVoiceChatService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IAccessibilityService)
], VoiceChatSessions);
export const VOICE_KEY_HOLD_THRESHOLD = 500;
async function startVoiceChatWithHoldMode(id, accessor, target, context) {
    const instantiationService = accessor.get(IInstantiationService);
    const keybindingService = accessor.get(IKeybindingService);
    const holdMode = keybindingService.enableKeybindingHoldMode(id);
    const controller = await VoiceChatSessionControllerFactory.create(accessor, target);
    if (!controller) {
        return;
    }
    const session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
    let acceptVoice = false;
    const handle = disposableTimeout(() => {
        acceptVoice = true;
        session?.setTimeoutDisabled(true); // disable accept on timeout when hold mode runs for VOICE_KEY_HOLD_THRESHOLD
    }, VOICE_KEY_HOLD_THRESHOLD);
    await holdMode;
    handle.dispose();
    if (acceptVoice) {
        session.accept();
    }
}
class VoiceChatWithHoldModeAction extends Action2 {
    constructor(desc, target) {
        super(desc);
        this.target = target;
    }
    run(accessor, context) {
        return startVoiceChatWithHoldMode(this.desc.id, accessor, this.target, context);
    }
}
export class VoiceChatInChatViewAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.voiceChatInChatView'; }
    constructor() {
        super({
            id: VoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.voiceChatInView.label', "Voice Chat in Chat View"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'view');
    }
}
export class HoldToVoiceChatInChatViewAction extends Action2 {
    static { this.ID = 'workbench.action.chat.holdToVoiceChatInChatView'; }
    constructor() {
        super({
            id: HoldToVoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.holdToVoiceChatInChatView.label', "Hold to Voice Chat in Chat View"),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate(), // disable when a chat request is in progress
                FocusInChatInput?.negate(), // when already in chat input, disable this action and prefer to start voice chat directly
                EditorContextKeys.focus.negate(), // do not steal the inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate(), // do not steal the notebook keybinding
                SearchContext.SearchViewFocusedKey.negate(), // do not steal the search keybinding
                CONTEXT_SETTINGS_EDITOR.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            }
        });
    }
    async run(accessor, context) {
        // The intent of this action is to provide 2 modes to align with what `Ctrlcmd+I` in inline chat:
        // - if the user press and holds, we start voice chat in the chat view
        // - if the user press and releases quickly enough, we just open the chat view without voice chat
        const instantiationService = accessor.get(IInstantiationService);
        const keybindingService = accessor.get(IKeybindingService);
        const viewsService = accessor.get(IViewsService);
        const holdMode = keybindingService.enableKeybindingHoldMode(HoldToVoiceChatInChatViewAction.ID);
        let session;
        const handle = disposableTimeout(async () => {
            const controller = await VoiceChatSessionControllerFactory.create(accessor, 'view');
            if (controller) {
                session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
                session.setTimeoutDisabled(true);
            }
        }, VOICE_KEY_HOLD_THRESHOLD);
        (await showChatView(viewsService))?.focusInput();
        await holdMode;
        handle.dispose();
        if (session) {
            session.accept();
        }
    }
}
export class InlineVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.inlineVoiceChat'; }
    constructor() {
        super({
            id: InlineVoiceChatAction.ID,
            title: localize2('workbench.action.chat.inlineVoiceChat', "Inline Voice Chat"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ActiveEditorContext, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'inline');
    }
}
export class QuickVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.quickVoiceChat'; }
    constructor() {
        super({
            id: QuickVoiceChatAction.ID,
            title: localize2('workbench.action.chat.quickVoiceChat.label', "Quick Voice Chat"),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate() // disable when a chat request is in progress
            ),
            f1: true
        }, 'quick');
    }
}
const primaryVoiceActionMenu = (when) => {
    return [
        {
            id: MenuId.ChatExecute,
            when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), when),
            group: 'navigation',
            order: 3
        },
        {
            id: MenuId.ChatExecute,
            when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel).negate(), when),
            group: 'navigation',
            order: 2
        }
    ];
};
export class StartVoiceChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.startVoiceChat'; }
    constructor() {
        super({
            id: StartVoiceChatAction.ID,
            title: localize2('workbench.action.chat.startVoiceChat.label', "Start Voice Chat"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, // scope this action to chat input fields only
                EditorContextKeys.focus.negate(), // do not steal the editor inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate() // do not steal the notebook inline-chat keybinding
                ),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            icon: Codicon.mic,
            precondition: ContextKeyExpr.and(CanVoiceChat, ScopedVoiceChatGettingReady.negate(), // disable when voice chat is getting ready
            AnyChatRequestInProgress?.negate(), // disable when any chat request is in progress
            SpeechToTextInProgress.negate() // disable when speech to text is in progress
            ),
            menu: primaryVoiceActionMenu(ContextKeyExpr.and(HasSpeechProvider, ScopedChatSynthesisInProgress.negate(), // hide when text to speech is in progress
            AnyScopedVoiceChatInProgress?.negate()))
        });
    }
    async run(accessor, context) {
        const widget = context?.widget;
        if (widget) {
            // if we already get a context when the action is executed
            // from a toolbar within the chat widget, then make sure
            // to move focus into the input field so that the controller
            // is properly retrieved
            widget.focusInput();
        }
        return startVoiceChatWithHoldMode(this.desc.id, accessor, 'focused', context);
    }
}
export class StopListeningAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListening'; }
    constructor() {
        super({
            id: StopListeningAction.ID,
            title: localize2('workbench.action.chat.stopListening.label', "Stop Listening"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: AnyScopedVoiceChatInProgress
            },
            icon: spinningLoading,
            precondition: GlobalVoiceChatInProgress, // need global context here because of `f1: true`
            menu: primaryVoiceActionMenu(AnyScopedVoiceChatInProgress)
        });
    }
    async run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopListeningAndSubmitAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListeningAndSubmit'; }
    constructor() {
        super({
            id: StopListeningAndSubmitAction.ID,
            title: localize2('workbench.action.chat.stopListeningAndSubmit.label', "Stop Listening and Submit"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, AnyScopedVoiceChatInProgress),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            precondition: GlobalVoiceChatInProgress // need global context here because of `f1: true`
        });
    }
    run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).accept();
    }
}
//#endregion
//#region Text to Speech
const ScopedChatSynthesisInProgress = new RawContextKey('scopedChatSynthesisInProgress', false, { type: 'boolean', description: localize('scopedChatSynthesisInProgress', "Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.") });
class ChatSynthesizerSessionController {
    static create(accessor, context, response) {
        if (context === 'focused') {
            return ChatSynthesizerSessionController.doCreateForFocusedChat(accessor, response);
        }
        else {
            return {
                onDidHideChat: context.onDidHideInput,
                contextKeyService: context.scopedContextKeyService,
                response
            };
        }
    }
    static doCreateForFocusedChat(accessor, response) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const contextKeyService = accessor.get(IContextKeyService);
        let chatWidget = chatWidgetService.getWidgetBySessionId(response.session.sessionId);
        if (chatWidget?.location === ChatAgentLocation.Editor) {
            // workaround for https://github.com/microsoft/vscode/issues/212785
            chatWidget = chatWidgetService.lastFocusedWidget;
        }
        return {
            onDidHideChat: chatWidget?.onDidHide ?? Event.None,
            contextKeyService: chatWidget?.scopedContextKeyService ?? contextKeyService,
            response
        };
    }
}
let ChatSynthesizerSessions = class ChatSynthesizerSessions {
    static { ChatSynthesizerSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!ChatSynthesizerSessions_1.instance) {
            ChatSynthesizerSessions_1.instance = instantiationService.createInstance(ChatSynthesizerSessions_1);
        }
        return ChatSynthesizerSessions_1.instance;
    }
    constructor(speechService, configurationService, instantiationService) {
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.activeSession = undefined;
    }
    async start(controller) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        VoiceChatSessions.getInstance(this.instantiationService).stop();
        const activeSession = this.activeSession = new CancellationTokenSource();
        const disposables = new DisposableStore();
        disposables.add(activeSession.token.onCancellationRequested(() => disposables.dispose()));
        const session = await this.speechService.createTextToSpeechSession(activeSession.token, 'chat');
        if (activeSession.token.isCancellationRequested) {
            return;
        }
        disposables.add(controller.onDidHideChat(() => this.stop()));
        const scopedChatToSpeechInProgress = ScopedChatSynthesisInProgress.bindTo(controller.contextKeyService);
        disposables.add(toDisposable(() => scopedChatToSpeechInProgress.reset()));
        disposables.add(session.onDidChange(e => {
            switch (e.status) {
                case TextToSpeechStatus.Started:
                    scopedChatToSpeechInProgress.set(true);
                    break;
                case TextToSpeechStatus.Stopped:
                    scopedChatToSpeechInProgress.reset();
                    break;
            }
        }));
        for await (const chunk of this.nextChatResponseChunk(controller.response, activeSession.token)) {
            if (activeSession.token.isCancellationRequested) {
                return;
            }
            await raceCancellation(session.synthesize(chunk), activeSession.token);
        }
    }
    async *nextChatResponseChunk(response, token) {
        const context = {
            ignoreCodeBlocks: this.configurationService.getValue("accessibility.voice.ignoreCodeBlocks" /* AccessibilityVoiceSettingId.IgnoreCodeBlocks */),
            insideCodeBlock: false
        };
        let totalOffset = 0;
        let complete = false;
        do {
            const responseLength = response.response.toString().length;
            const { chunk, offset } = this.parseNextChatResponseChunk(response, totalOffset, context);
            totalOffset = offset;
            complete = response.isComplete;
            if (chunk) {
                yield chunk;
            }
            if (token.isCancellationRequested) {
                return;
            }
            if (!complete && responseLength === response.response.toString().length) {
                await raceCancellation(Event.toPromise(response.onDidChange), token); // wait for the response to change
            }
        } while (!token.isCancellationRequested && !complete);
    }
    parseNextChatResponseChunk(response, offset, context) {
        let chunk = undefined;
        const text = response.response.toString();
        if (response.isComplete) {
            chunk = text.substring(offset);
            offset = text.length + 1;
        }
        else {
            const res = parseNextChatResponseChunk(text, offset);
            chunk = res.chunk;
            offset = res.offset;
        }
        if (chunk && context.ignoreCodeBlocks) {
            chunk = this.filterCodeBlocks(chunk, context);
        }
        return {
            chunk: chunk ? renderAsPlaintext({ value: chunk }) : chunk, // convert markdown to plain text
            offset
        };
    }
    filterCodeBlocks(chunk, context) {
        return chunk.split('\n')
            .filter(line => {
            if (line.trimStart().startsWith('```')) {
                context.insideCodeBlock = !context.insideCodeBlock;
                return false;
            }
            return !context.insideCodeBlock;
        })
            .join('\n');
    }
    stop() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
};
ChatSynthesizerSessions = ChatSynthesizerSessions_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService)
], ChatSynthesizerSessions);
const sentenceDelimiter = ['.', '!', '?', ':'];
const lineDelimiter = '\n';
const wordDelimiter = ' ';
export function parseNextChatResponseChunk(text, offset) {
    let chunk = undefined;
    for (let i = text.length - 1; i >= offset; i--) { // going from end to start to produce largest chunks
        const cur = text[i];
        const next = text[i + 1];
        if (sentenceDelimiter.includes(cur) && next === wordDelimiter || // end of sentence
            lineDelimiter === cur // end of line
        ) {
            chunk = text.substring(offset, i + 1).trim();
            offset = i + 1;
            break;
        }
    }
    return { chunk, offset };
}
export class ReadChatResponseAloud extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.readChatResponseAloud',
            title: localize2('workbench.action.chat.readChatResponseAloud', "Read Aloud"),
            icon: Codicon.unmute,
            precondition: CanVoiceChat,
            menu: [{
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10 // first
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate() // and not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                }]
        });
    }
    run(accessor, ...args) {
        const instantiationService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        let response = undefined;
        if (args.length > 0) {
            const responseArg = args[0];
            if (isResponseVM(responseArg)) {
                response = responseArg;
            }
        }
        else {
            const chatWidget = chatWidgetService.lastFocusedWidget;
            if (chatWidget) {
                // pick focused response
                const focus = chatWidget.getFocus();
                if (focus instanceof ChatResponseViewModel) {
                    response = focus;
                }
                // pick the last response
                else {
                    const chatViewModel = chatWidget.viewModel;
                    if (chatViewModel) {
                        const items = chatViewModel.getItems();
                        for (let i = items.length - 1; i >= 0; i--) {
                            const item = items[i];
                            if (isResponseVM(item)) {
                                response = item;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!response) {
            return;
        }
        const controller = ChatSynthesizerSessionController.create(accessor, 'focused', response.model);
        ChatSynthesizerSessions.getInstance(instantiationService).start(controller);
    }
}
export class StopReadAloud extends Action2 {
    static { this.ID = 'workbench.action.speech.stopReadAloud'; }
    constructor() {
        super({
            id: StopReadAloud.ID,
            icon: syncing,
            title: localize2('workbench.action.speech.stopReadAloud', "Stop Reading Aloud"),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: GlobalTextToSpeechInProgress, // need global context here because of `f1: true`
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: ScopedChatSynthesisInProgress
            },
            menu: primaryVoiceActionMenu(ScopedChatSynthesisInProgress)
        });
    }
    async run(accessor) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopReadChatItemAloud extends Action2 {
    static { this.ID = 'workbench.action.chat.stopReadChatItemAloud'; }
    constructor() {
        super({
            id: StopReadChatItemAloud.ID,
            icon: Codicon.mute,
            title: localize2('workbench.action.chat.stopReadChatItemAloud', "Stop Reading Aloud"),
            precondition: ScopedChatSynthesisInProgress,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [
                {
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate() // but not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                },
                {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate() // but not when response is filtered
                    ),
                    group: 'navigation',
                    order: -10 // first
                }
            ]
        });
    }
    async run(accessor, ...args) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
//#endregion
//#region Keyword Recognition
function supportsKeywordActivation(configurationService, speechService, chatAgentService) {
    if (!speechService.hasSpeechProvider || !chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
        return false;
    }
    const value = configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
    return typeof value === 'string' && value !== KeywordActivationContribution.SETTINGS_VALUE.OFF;
}
let KeywordActivationContribution = class KeywordActivationContribution extends Disposable {
    static { KeywordActivationContribution_1 = this; }
    static { this.ID = 'workbench.contrib.keywordActivation'; }
    static { this.SETTINGS_VALUE = {
        OFF: 'off',
        INLINE_CHAT: 'inlineChat',
        QUICK_CHAT: 'quickChat',
        VIEW_CHAT: 'chatInView',
        CHAT_IN_CONTEXT: 'chatInContext'
    }; }
    constructor(speechService, configurationService, commandService, instantiationService, editorService, hostService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.editorService = editorService;
        this.hostService = hostService;
        this.chatAgentService = chatAgentService;
        this.activeSession = undefined;
        this._register(instantiationService.createInstance(KeywordActivationStatusEntry));
        this.registerListeners();
    }
    registerListeners() {
        this._register(Event.runAndSubscribe(this.speechService.onDidChangeHasSpeechProvider, () => {
            this.updateConfiguration();
            this.handleKeywordActivation();
        }));
        const onDidAddDefaultAgent = this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
                this.updateConfiguration();
                this.handleKeywordActivation();
                onDidAddDefaultAgent.dispose();
            }
        }));
        this._register(this.speechService.onDidStartSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.speechService.onDidEndSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.handleKeywordActivation();
            }
        }));
    }
    updateConfiguration() {
        if (!this.speechService.hasSpeechProvider || !this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
            return; // these settings require a speech and chat provider
        }
        const registry = Registry.as(Extensions.Configuration);
        registry.registerConfiguration({
            ...accessibilityConfigurationNodeBase,
            properties: {
                [KEYWORD_ACTIVIATION_SETTING_ID]: {
                    'type': 'string',
                    'enum': [
                        KeywordActivationContribution_1.SETTINGS_VALUE.OFF,
                        KeywordActivationContribution_1.SETTINGS_VALUE.VIEW_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT
                    ],
                    'enumDescriptions': [
                        localize('voice.keywordActivation.off', "Keyword activation is disabled."),
                        localize('voice.keywordActivation.chatInView', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the chat view."),
                        localize('voice.keywordActivation.quickChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the quick chat."),
                        localize('voice.keywordActivation.inlineChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor if possible."),
                        localize('voice.keywordActivation.chatInContext', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor or view depending on keyboard focus.")
                    ],
                    'description': localize('voice.keywordActivation', "Controls whether the keyword phrase 'Hey Code' is recognized to start a voice chat session. Enabling this will start recording from the microphone but the audio is processed locally and never sent to a server."),
                    'default': 'off',
                    'tags': ['accessibility']
                }
            }
        });
    }
    handleKeywordActivation() {
        const enabled = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService) &&
            !this.speechService.hasActiveSpeechToTextSession;
        if ((enabled && this.activeSession) ||
            (!enabled && !this.activeSession)) {
            return; // already running or stopped
        }
        // Start keyword activation
        if (enabled) {
            this.enableKeywordActivation();
        }
        // Stop keyword activation
        else {
            this.disableKeywordActivation();
        }
    }
    async enableKeywordActivation() {
        const session = this.activeSession = new CancellationTokenSource();
        const result = await this.speechService.recognizeKeyword(session.token);
        if (session.token.isCancellationRequested || session !== this.activeSession) {
            return; // cancelled
        }
        this.activeSession = undefined;
        if (result === KeywordRecognitionStatus.Recognized) {
            if (this.hostService.hasFocus) {
                this.commandService.executeCommand(this.getKeywordCommand());
            }
            // Immediately start another keyboard activation session
            // because we cannot assume that the command we execute
            // will trigger a speech recognition session.
            this.handleKeywordActivation();
        }
    }
    getKeywordCommand() {
        const setting = this.configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
        switch (setting) {
            case KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT:
                return InlineVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT:
                return QuickVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT: {
                const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
                if (activeCodeEditor?.hasWidgetFocus()) {
                    return InlineVoiceChatAction.ID;
                }
            }
            default:
                return VoiceChatInChatViewAction.ID;
        }
    }
    disableKeywordActivation() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
    dispose() {
        this.activeSession?.dispose();
        super.dispose();
    }
};
KeywordActivationContribution = KeywordActivationContribution_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, ICommandService),
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, IHostService),
    __param(6, IChatAgentService)
], KeywordActivationContribution);
export { KeywordActivationContribution };
let KeywordActivationStatusEntry = class KeywordActivationStatusEntry extends Disposable {
    static { KeywordActivationStatusEntry_1 = this; }
    static { this.STATUS_NAME = localize('keywordActivation.status.name', "Voice Keyword Activation"); }
    static { this.STATUS_COMMAND = 'keywordActivation.status.command'; }
    static { this.STATUS_ACTIVE = localize('keywordActivation.status.active', "Listening to 'Hey Code'..."); }
    static { this.STATUS_INACTIVE = localize('keywordActivation.status.inactive', "Waiting for voice chat to end..."); }
    constructor(speechService, statusbarService, commandService, configurationService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.statusbarService = statusbarService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.chatAgentService = chatAgentService;
        this.entry = this._register(new MutableDisposable());
        this._register(CommandsRegistry.registerCommand(KeywordActivationStatusEntry_1.STATUS_COMMAND, () => this.commandService.executeCommand('workbench.action.openSettings', KEYWORD_ACTIVIATION_SETTING_ID)));
        this.registerListeners();
        this.updateStatusEntry();
    }
    registerListeners() {
        this._register(this.speechService.onDidStartKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.speechService.onDidEndKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.updateStatusEntry();
            }
        }));
    }
    updateStatusEntry() {
        const visible = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService);
        if (visible) {
            if (!this.entry.value) {
                this.createStatusEntry();
            }
            this.updateStatusLabel();
        }
        else {
            this.entry.clear();
        }
    }
    createStatusEntry() {
        this.entry.value = this.statusbarService.addEntry(this.getStatusEntryProperties(), 'status.voiceKeywordActivation', 1 /* StatusbarAlignment.RIGHT */, 103);
    }
    getStatusEntryProperties() {
        return {
            name: KeywordActivationStatusEntry_1.STATUS_NAME,
            text: this.speechService.hasActiveKeywordRecognition ? '$(mic-filled)' : '$(mic)',
            tooltip: this.speechService.hasActiveKeywordRecognition ? KeywordActivationStatusEntry_1.STATUS_ACTIVE : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            ariaLabel: this.speechService.hasActiveKeywordRecognition ? KeywordActivationStatusEntry_1.STATUS_ACTIVE : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            command: KeywordActivationStatusEntry_1.STATUS_COMMAND,
            kind: 'prominent',
            showInAllWindows: true
        };
    }
    updateStatusLabel() {
        this.entry.value?.update(this.getStatusEntryProperties());
    }
};
KeywordActivationStatusEntry = KeywordActivationStatusEntry_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IStatusbarService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IChatAgentService)
], KeywordActivationStatusEntry);
//#endregion
//#region Install Provider Actions
const InstallingSpeechProvider = new RawContextKey('installingSpeechProvider', false, true);
class BaseInstallSpeechProviderAction extends Action2 {
    static { this.SPEECH_EXTENSION_ID = 'ms-vscode.vscode-speech'; }
    async run(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const dialogService = accessor.get(IDialogService);
        try {
            InstallingSpeechProvider.bindTo(contextKeyService).set(true);
            await this.installExtension(extensionsWorkbenchService, dialogService);
        }
        finally {
            InstallingSpeechProvider.bindTo(contextKeyService).reset();
        }
    }
    async installExtension(extensionsWorkbenchService, dialogService) {
        try {
            await extensionsWorkbenchService.install(BaseInstallSpeechProviderAction.SPEECH_EXTENSION_ID, {
                justification: this.getJustification(),
                enable: true
            }, 15 /* ProgressLocation.Notification */);
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            const { confirmed } = await dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSetupError', "An error occurred while setting up voice chat. Would you like to try again?"),
                detail: toErrorMessage(error),
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.installExtension(extensionsWorkbenchService, dialogService);
            }
        }
    }
}
export class InstallSpeechProviderForVoiceChatAction extends BaseInstallSpeechProviderAction {
    static { this.ID = 'workbench.action.chat.installProviderForVoiceChat'; }
    constructor() {
        super({
            id: InstallSpeechProviderForVoiceChatAction.ID,
            title: localize2('workbench.action.chat.installProviderForVoiceChat.label', "Start Voice Chat"),
            icon: Codicon.mic,
            precondition: InstallingSpeechProvider.negate(),
            menu: primaryVoiceActionMenu(HasSpeechProvider.negate())
        });
    }
    getJustification() {
        return localize('installProviderForVoiceChat.justification', "Microphone support requires this extension.");
    }
}
//#endregion
registerThemingParticipant((theme, collector) => {
    let activeRecordingColor;
    let activeRecordingDimmedColor;
    if (theme.type === ColorScheme.LIGHT || theme.type === ColorScheme.DARK) {
        activeRecordingColor = theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND) ?? theme.getColor(focusBorder);
        activeRecordingDimmedColor = activeRecordingColor?.transparent(0.38);
    }
    else {
        activeRecordingColor = theme.getColor(contrastBorder);
        activeRecordingDimmedColor = theme.getColor(contrastBorder);
    }
    // Show a "microphone" or "pulse" icon when speech-to-text or text-to-speech is in progress that glows via outline.
    collector.addRule(`
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled),
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled) {
			color: ${activeRecordingColor};
			outline: 1px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1s infinite;
			border-radius: 50%;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::after,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::after {
			outline: 2px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1500ms cubic-bezier(0.75, 0, 0.25, 1) infinite;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		@keyframes pulseAnimation {
			0% {
				outline-width: 2px;
			}
			62% {
				outline-width: 5px;
				outline-color: ${activeRecordingDimmedColor};
			}
			100% {
				outline-width: 2px;
			}
		}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9lbGVjdHJvbi1icm93c2VyL2FjdGlvbnMvdm9pY2VDaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZILE9BQU8sUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUscUJBQXFC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