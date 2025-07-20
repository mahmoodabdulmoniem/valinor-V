/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { basename } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IRemoteCodingAgentsService } from '../../../remoteCodingAgents/common/remoteCodingAgentsService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { toChatHistoryContent } from '../../common/chatModel.js';
import { IChatModeService } from '../../common/chatModes.js';
import { chatVariableLeader } from '../../common/chatParserTypes.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind, } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { IChatWidgetService } from '../chat.js';
import { getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY, handleCurrentEditingSession, handleModeSwitch } from './chatActions.js';
class SubmitAction extends Action2 {
    async run(accessor, ...args) {
        const context = args[0];
        const telemetryService = accessor.get(ITelemetryService);
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (widget?.viewModel?.editing) {
            const configurationService = accessor.get(IConfigurationService);
            const dialogService = accessor.get(IDialogService);
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(widget.viewModel.sessionId);
            if (!chatModel) {
                return;
            }
            const session = chatModel.editingSession;
            if (!session) {
                return;
            }
            const requestId = widget.viewModel?.editing.id;
            if (requestId) {
                const chatRequests = chatModel.getRequests();
                const itemIndex = chatRequests.findIndex(request => request.id === requestId);
                const editsToUndo = chatRequests.length - itemIndex;
                const requestsToRemove = chatRequests.slice(itemIndex);
                const requestIdsToRemove = new Set(requestsToRemove.map(request => request.id));
                const entriesModifiedInRequestsToRemove = session.entries.get().filter((entry) => requestIdsToRemove.has(entry.lastModifyingRequestId)) ?? [];
                const shouldPrompt = entriesModifiedInRequestsToRemove.length > 0 && configurationService.getValue('chat.editing.confirmEditRequestRemoval') === true;
                let message;
                if (editsToUndo === 1) {
                    if (entriesModifiedInRequestsToRemove.length === 1) {
                        message = localize('chat.removeLast.confirmation.message2', "This will remove your last request and undo the edits made to {0}. Do you want to proceed?", basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                    }
                    else {
                        message = localize('chat.removeLast.confirmation.multipleEdits.message', "This will remove your last request and undo edits made to {0} files in your working set. Do you want to proceed?", entriesModifiedInRequestsToRemove.length);
                    }
                }
                else {
                    if (entriesModifiedInRequestsToRemove.length === 1) {
                        message = localize('chat.remove.confirmation.message2', "This will remove all subsequent requests and undo edits made to {0}. Do you want to proceed?", basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                    }
                    else {
                        message = localize('chat.remove.confirmation.multipleEdits.message', "This will remove all subsequent requests and undo edits made to {0} files in your working set. Do you want to proceed?", entriesModifiedInRequestsToRemove.length);
                    }
                }
                const confirmation = shouldPrompt
                    ? await dialogService.confirm({
                        title: editsToUndo === 1
                            ? localize('chat.removeLast.confirmation.title', "Do you want to undo your last edit?")
                            : localize('chat.remove.confirmation.title', "Do you want to undo {0} edits?", editsToUndo),
                        message: message,
                        primaryButton: localize('chat.remove.confirmation.primaryButton', "Yes"),
                        checkbox: { label: localize('chat.remove.confirmation.checkbox', "Don't ask again"), checked: false },
                        type: 'info'
                    })
                    : { confirmed: true };
                if (!confirmation.confirmed) {
                    telemetryService.publicLog2('chat.undoEditsConfirmation', {
                        editRequestType: configurationService.getValue('chat.editRequests'),
                        outcome: 'cancelled',
                        editsUndoCount: editsToUndo
                    });
                    return;
                }
                else if (editsToUndo > 0) {
                    telemetryService.publicLog2('chat.undoEditsConfirmation', {
                        editRequestType: configurationService.getValue('chat.editRequests'),
                        outcome: 'applied',
                        editsUndoCount: editsToUndo
                    });
                }
                if (confirmation.checkboxChecked) {
                    await configurationService.updateValue('chat.editing.confirmEditRequestRemoval', false);
                }
                // Restore the snapshot to what it was before the request(s) that we deleted
                const snapshotRequestId = chatRequests[itemIndex].id;
                await session.restoreSnapshot(snapshotRequestId, undefined);
            }
        }
        else if (widget?.viewModel?.model.checkpoint) {
            widget.viewModel.model.setCheckpoint(undefined);
        }
        widget?.acceptInput(context?.inputValue);
    }
}
const whenNotInProgressOrPaused = ContextKeyExpr.or(ChatContextKeys.isRequestPaused, ChatContextKeys.requestInProgress.negate());
export class ChatSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.chat.submit'; }
    constructor() {
        const precondition = ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask);
        super({
            id: ChatSubmitAction.ID,
            title: localize2('interactive.submit.label', "Send and Dispatch"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 1,
                    when: precondition
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, precondition),
                    group: 'navigation',
                }
            ]
        });
    }
}
export const ToggleAgentModeActionId = 'workbench.action.chat.toggleAgentMode';
class ToggleChatModeAction extends Action2 {
    static { this.ID = ToggleAgentModeActionId; }
    constructor() {
        super({
            id: ToggleChatModeAction.ID,
            title: localize2('interactive.toggleAgent.label', "Set Chat Mode"),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.requestInProgress.negate()),
            tooltip: localize('setChatMode', "Set Mode"),
            menu: [
                {
                    id: MenuId.ChatInput,
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inQuickChat.negate()),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        const commandService = accessor.get(ICommandService);
        const configurationService = accessor.get(IConfigurationService);
        const instaService = accessor.get(IInstantiationService);
        const modeService = accessor.get(IChatModeService);
        const context = getEditingSessionContext(accessor, args);
        if (!context?.chatWidget) {
            return;
        }
        const arg = args.at(0);
        const chatSession = context.chatWidget.viewModel?.model;
        const requestCount = chatSession?.getRequests().length ?? 0;
        const switchToMode = (arg && modeService.findModeById(arg.modeId)) ?? this.getNextMode(context.chatWidget, requestCount, configurationService, modeService);
        if (switchToMode.id === context.chatWidget.input.currentModeObs.get().id) {
            return;
        }
        const chatModeCheck = await instaService.invokeFunction(handleModeSwitch, context.chatWidget.input.currentModeKind, switchToMode.kind, requestCount, context.editingSession);
        if (!chatModeCheck) {
            return;
        }
        context.chatWidget.input.setChatMode(switchToMode.id);
        if (chatModeCheck.needToClearSession) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
    }
    getNextMode(chatWidget, requestCount, configurationService, modeService) {
        const modes = modeService.getModes();
        const flat = [
            ...modes.builtin.filter(mode => {
                return mode.kind !== ChatModeKind.Edit || configurationService.getValue(ChatConfiguration.Edits2Enabled) || requestCount === 0;
            }),
            ...(modes.custom ?? []),
        ];
        const curModeIndex = flat.findIndex(mode => mode.id === chatWidget.input.currentModeObs.get().id);
        const newMode = flat[(curModeIndex + 1) % flat.length];
        return newMode;
    }
}
export const ToggleRequestPausedActionId = 'workbench.action.chat.toggleRequestPaused';
export class ToggleRequestPausedAction extends Action2 {
    static { this.ID = ToggleRequestPausedActionId; }
    constructor() {
        super({
            id: ToggleRequestPausedAction.ID,
            title: localize2('interactive.toggleRequestPausd.label', "Toggle Request Paused"),
            category: CHAT_CATEGORY,
            icon: Codicon.debugPause,
            toggled: {
                condition: ChatContextKeys.isRequestPaused,
                icon: Codicon.play,
                tooltip: localize('requestIsPaused', "Resume Request"),
            },
            tooltip: localize('requestNotPaused', "Pause Request"),
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 3.5,
                    when: ContextKeyExpr.and(ChatContextKeys.canRequestBePaused, ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ContextKeyExpr.or(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.inputHasText.negate())),
                    group: 'navigation',
                }
            ]
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.togglePaused();
    }
}
class SwitchToNextModelAction extends Action2 {
    static { this.ID = 'workbench.action.chat.switchToNextModel'; }
    constructor() {
        super({
            id: SwitchToNextModelAction.ID,
            title: localize2('interactive.switchToNextModel.label', "Switch to Next Model"),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ChatContextKeys.enabled,
        });
    }
    run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        widget?.input.switchToNextModel();
    }
}
export const ChatOpenModelPickerActionId = 'workbench.action.chat.openModelPicker';
class OpenModelPickerAction extends Action2 {
    static { this.ID = ChatOpenModelPickerActionId; }
    constructor() {
        super({
            id: OpenModelPickerAction.ID,
            title: localize2('interactive.openModelPicker.label', "Open Model Picker"),
            category: CHAT_CATEGORY,
            f1: false,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ChatContextKeys.inChatInput
            },
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatInput,
                order: 3,
                group: 'navigation',
                when: ContextKeyExpr.and(ChatContextKeys.languageModelsAreUserSelectable, ContextKeyExpr.or(ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Editor), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Notebook), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Terminal))),
            }
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openModelPicker();
        }
    }
}
class OpenModePickerAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openModePicker'; }
    constructor() {
        super({
            id: OpenModePickerAction.ID,
            title: localize2('interactive.openModePicker.label', "Open Mode Picker"),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
        });
    }
    async run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (widget) {
            widget.input.openModePicker();
        }
    }
}
export const ChangeChatModelActionId = 'workbench.action.chat.changeModel';
class ChangeChatModelAction extends Action2 {
    static { this.ID = ChangeChatModelActionId; }
    constructor() {
        super({
            id: ChangeChatModelAction.ID,
            title: localize2('interactive.changeModel.label', "Change Model"),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ChatContextKeys.enabled,
        });
    }
    run(accessor, ...args) {
        const modelInfo = args[0];
        // Type check the arg
        assertType(typeof modelInfo.vendor === 'string' && typeof modelInfo.id === 'string' && typeof modelInfo.family === 'string');
        const widgetService = accessor.get(IChatWidgetService);
        const widgets = widgetService.getAllWidgets();
        for (const widget of widgets) {
            widget.input.switchModel(modelInfo);
        }
    }
}
export class ChatEditingSessionSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.edits.submit'; }
    constructor() {
        const precondition = ChatContextKeys.chatModeKind.notEqualsTo(ChatModeKind.Ask);
        super({
            id: ChatEditingSessionSubmitAction.ID,
            title: localize2('edits.submit.label', "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, precondition),
                    order: 1
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.isRequestPaused, ChatContextKeys.inputHasText), ChatContextKeys.requestInProgress.negate()), precondition),
                    group: 'navigation',
                }
            ]
        });
    }
}
class SubmitWithoutDispatchingAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithoutDispatching'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.hasPromptFile), whenNotInProgressOrPaused, ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask));
        super({
            id: SubmitWithoutDispatchingAction.ID,
            title: localize2('interactive.submitWithoutDispatch.label', "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 2,
                    when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask),
                }
            ]
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue, { noCommandDetection: true });
    }
}
export class CreateRemoteAgentJobAction extends Action2 {
    static { this.ID = 'workbench.action.chat.createRemoteAgentJob'; }
    static { this.markdownStringTrustedOptions = {
        isTrusted: {
            enabledCommands: [],
        },
    }; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.hasPromptFile), whenNotInProgressOrPaused, ChatContextKeys.remoteJobCreating.negate());
        super({
            id: CreateRemoteAgentJobAction.ID,
            // TODO(joshspicer): Generalize title, pull from contribution
            title: localize2('actions.chat.createRemoteJob', "Delegate to coding agent"),
            icon: Codicon.cloudUpload,
            precondition,
            toggled: {
                condition: ChatContextKeys.remoteJobCreating,
                icon: Codicon.sync,
                tooltip: localize('remoteJobCreating', "Delegating to coding agent"),
            },
            menu: {
                id: MenuId.ChatExecute,
                group: 'navigation',
                order: 3.4,
                when: ChatContextKeys.hasRemoteCodingAgent
            }
        });
    }
    async run(accessor, ...args) {
        const contextKeyService = accessor.get(IContextKeyService);
        const remoteJobCreatingKey = ChatContextKeys.remoteJobCreating.bindTo(contextKeyService);
        try {
            remoteJobCreatingKey.set(true);
            const remoteCodingAgent = accessor.get(IRemoteCodingAgentsService);
            const commandService = accessor.get(ICommandService);
            const widgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            const widget = widgetService.lastFocusedWidget;
            if (!widget) {
                return;
            }
            const session = widget.viewModel?.sessionId;
            if (!session) {
                return;
            }
            const chatModel = widget.viewModel?.model;
            if (!chatModel) {
                return;
            }
            const userPrompt = widget.getInput();
            if (!userPrompt) {
                return;
            }
            widget.input.acceptInput(true);
            const chatRequests = chatModel.getRequests();
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
            // Complete implementation of adding request back into chat stream
            const instantiationService = accessor.get(IInstantiationService);
            // Parse the request text to create a structured request
            const requestParser = instantiationService.createInstance(ChatRequestParser);
            const parsedRequest = requestParser.parseChatRequest(session, userPrompt, ChatAgentLocation.Panel);
            // Add the request to the model first
            const addedRequest = chatModel.addRequest(parsedRequest, { variables: [] }, 0, defaultAgent);
            const agents = remoteCodingAgent.getAvailableAgents();
            const agent = agents[0]; // TODO: We just pick the first one for now
            if (!agent) {
                return;
            }
            let summary;
            let followup;
            if (defaultAgent && chatRequests.length > 0) {
                chatModel.acceptResponseProgress(addedRequest, {
                    kind: 'progressMessage',
                    content: new MarkdownString(localize('analyzingChatHistory', "Analyzing chat history"), CreateRemoteAgentJobAction.markdownStringTrustedOptions)
                });
                // Forward useful metadata about conversation to the implementing extension
                if (agent.followUpRegex) {
                    const regex = new RegExp(agent.followUpRegex);
                    followup = chatRequests
                        .map(req => req.response?.response.toString() ?? '')
                        .reverse()
                        .find(text => regex.test(text));
                }
                const historyEntries = chatRequests
                    .map(req => ({
                    request: {
                        sessionId: session,
                        requestId: req.id,
                        agentId: req.response?.agent?.id ?? '',
                        message: req.message.text,
                        command: req.response?.slashCommand?.name,
                        variables: req.variableData,
                        location: ChatAgentLocation.Panel,
                        editedFileEvents: req.editedFileEvents,
                    },
                    response: toChatHistoryContent(req.response.response.value),
                    result: req.response?.result ?? {}
                }));
                summary = await chatAgentService.getChatSummary(defaultAgent.id, historyEntries, CancellationToken.None);
            }
            // Show progress for job creation
            chatModel.acceptResponseProgress(addedRequest, {
                kind: 'progressMessage',
                content: new MarkdownString(localize('creatingRemoteJob', "Delegating to coding agent"), CreateRemoteAgentJobAction.markdownStringTrustedOptions)
            });
            // Execute the remote command
            const resultMarkdown = await commandService.executeCommand(agent.command, {
                userPrompt,
                summary: summary || userPrompt,
                followup,
            });
            let content = new MarkdownString(resultMarkdown, CreateRemoteAgentJobAction.markdownStringTrustedOptions);
            if (!resultMarkdown) {
                content = new MarkdownString(localize('remoteAgentError', "Coding agent session cancelled."), CreateRemoteAgentJobAction.markdownStringTrustedOptions);
            }
            chatModel.acceptResponseProgress(addedRequest, { content, kind: 'markdownContent' });
            chatModel.setResponse(addedRequest, {});
            chatModel.completeResponse(addedRequest);
            // Clear chat (start a new chat)
            if (resultMarkdown) {
                widget.clear();
            }
        }
        finally {
            remoteJobCreatingKey.set(false);
        }
    }
}
export class ChatSubmitWithCodebaseAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithCodebase'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.hasPromptFile), whenNotInProgressOrPaused);
        super({
            id: ChatSubmitWithCodebaseAction.ID,
            title: localize2('actions.chat.submitWithCodebase', "Send with {0}", `${chatVariableLeader}codebase`),
            precondition,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_1',
                order: 3,
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel),
            },
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const codebaseTool = languageModelToolsService.getToolByName('codebase');
        if (!codebaseTool) {
            return;
        }
        widget.input.attachmentModel.addContext({
            id: codebaseTool.id,
            name: codebaseTool.displayName ?? '',
            fullName: codebaseTool.displayName ?? '',
            value: undefined,
            icon: ThemeIcon.isThemeIcon(codebaseTool.icon) ? codebaseTool.icon : undefined,
            kind: 'tool'
        });
        widget.acceptInput();
    }
}
class SendToNewChatAction extends Action2 {
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.hasPromptFile), whenNotInProgressOrPaused);
        super({
            id: 'workbench.action.chat.sendToNewChat',
            title: localize2('chat.newChat.label', "Send to New Chat"),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_2',
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel)
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ChatContextKeys.inChatInput,
            }
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const dialogService = accessor.get(IDialogService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const editingSession = widget.viewModel?.model.editingSession;
        if (editingSession) {
            if (!(await handleCurrentEditingSession(editingSession, undefined, dialogService))) {
                return;
            }
        }
        widget.clear();
        await widget.waitForReady();
        widget.acceptInput(context?.inputValue);
    }
}
export const CancelChatActionId = 'workbench.action.chat.cancel';
export class CancelAction extends Action2 {
    static { this.ID = CancelChatActionId; }
    constructor() {
        super({
            id: CancelAction.ID,
            title: localize2('interactive.cancel.label', "Cancel"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.stopCircle,
            menu: [{
                    id: MenuId.ChatExecute,
                    when: ContextKeyExpr.and(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.requestInProgress, ChatContextKeys.remoteJobCreating.negate()),
                    order: 4,
                    group: 'navigation',
                },
            ],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */,
                win: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
            }
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatService = accessor.get(IChatService);
        if (widget.viewModel) {
            chatService.cancelCurrentRequestForSession(widget.viewModel.sessionId);
        }
    }
}
export const CancelChatEditId = 'workbench.edit.chat.cancel';
export class CancelEdit extends Action2 {
    static { this.ID = CancelChatEditId; }
    constructor() {
        super({
            id: CancelEdit.ID,
            title: localize2('interactive.cancelEdit.label', "Cancel Edit"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.x,
            menu: [
                {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.isRequest, ChatContextKeys.currentlyEditing, ContextKeyExpr.equals(`config.${ChatConfiguration.EditRequests}`, 'input'))
                }
            ],
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, EditorContextKeys.hoverVisible.toNegated(), EditorContextKeys.hasNonEmptySelection.toNegated(), EditorContextKeys.hasMultipleSelections.toNegated(), ContextKeyExpr.or(ChatContextKeys.currentlyEditing, ChatContextKeys.currentlyEditingInput)),
                weight: 100 /* KeybindingWeight.EditorContrib */ - 5
            }
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        widget.finishedEditing();
    }
}
export function registerChatExecuteActions() {
    registerAction2(ChatSubmitAction);
    registerAction2(ChatEditingSessionSubmitAction);
    registerAction2(SubmitWithoutDispatchingAction);
    registerAction2(CancelAction);
    registerAction2(SendToNewChatAction);
    registerAction2(ChatSubmitWithCodebaseAction);
    registerAction2(CreateRemoteAgentJobAction);
    registerAction2(ToggleChatModeAction);
    registerAction2(ToggleRequestPausedAction);
    registerAction2(SwitchToNextModelAction);
    registerAction2(OpenModelPickerAction);
    registerAction2(OpenModePickerAction);
    registerAction2(ChangeChatModelAction);
    registerAction2(CancelEdit);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4ZWN1dGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0RXhlY3V0ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8s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