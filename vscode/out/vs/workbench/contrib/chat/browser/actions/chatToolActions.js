/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatModeKind } from '../../common/constants.js';
import { ToolSet } from '../../common/languageModelToolsService.js';
import { IChatWidgetService } from '../chat.js';
import { ToolsScope } from '../chatSelectedTools.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { showToolsPicker } from './chatToolPicker.js';
export const AcceptToolConfirmationActionId = 'workbench.action.chat.acceptTool';
class AcceptToolConfirmation extends Action2 {
    constructor() {
        super({
            id: AcceptToolConfirmationActionId,
            title: localize2('chat.accept', "Accept"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        const lastItem = widget?.viewModel?.getItems().at(-1);
        if (!isResponseVM(lastItem)) {
            return;
        }
        const unconfirmedToolInvocation = lastItem.model.response.value.find((item) => item.kind === 'toolInvocation' && !item.isConfirmed);
        if (unconfirmedToolInvocation) {
            unconfirmedToolInvocation.confirmed.complete(true);
        }
        // Return focus to the chat input, in case it was in the tool confirmation editor
        widget?.focusInput();
    }
}
class ConfigureToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.configureTools',
            title: localize('label', "Configure Tools..."),
            icon: Codicon.tools,
            f1: false,
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
            menu: [{
                    when: ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent),
                    id: MenuId.ChatExecute,
                    group: 'navigation',
                    order: 1,
                }]
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const telemetryService = accessor.get(ITelemetryService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            function isChatActionContext(obj) {
                return obj && typeof obj === 'object' && obj.widget;
            }
            const context = args[0];
            if (isChatActionContext(context)) {
                widget = context.widget;
            }
        }
        if (!widget) {
            return;
        }
        let placeholder;
        let description;
        const { entriesScope, entriesMap } = widget.input.selectedToolsModel;
        switch (entriesScope) {
            case ToolsScope.Session:
                placeholder = localize('chat.tools.placeholder.session', "Select tools for this chat session");
                description = localize('chat.tools.description.session', "The selected tools were configured by a prompt command and only apply to this chat session.");
                break;
            case ToolsScope.Mode:
                placeholder = localize('chat.tools.placeholder.mode', "Select tools for this chat mode");
                description = localize('chat.tools.description.mode', "The selected tools are configured by the '{0}' chat mode. Changes to the tools will be applied to the mode file as well.", widget.input.currentModeObs.get().name);
                break;
            case ToolsScope.Global:
                placeholder = localize('chat.tools.placeholder.global', "Select tools that are available to chat.");
                description = undefined;
                break;
        }
        const result = await instaService.invokeFunction(showToolsPicker, placeholder, description, entriesMap.get(), newEntriesMap => {
            const disableToolSets = [];
            const disableTools = [];
            for (const [item, enabled] of newEntriesMap) {
                if (!enabled) {
                    if (item instanceof ToolSet) {
                        disableToolSets.push(item);
                    }
                    else {
                        disableTools.push(item);
                    }
                }
            }
        });
        if (result) {
            widget.input.selectedToolsModel.set(result, false);
        }
        telemetryService.publicLog2('chat/selectedTools', {
            total: widget.input.selectedToolsModel.entriesMap.get().size,
            enabled: widget.input.selectedToolsModel.entries.get().size,
        });
    }
}
export function registerChatToolActions() {
    registerAction2(AcceptToolConfirmation);
    registerAction2(ConfigureToolsAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0VG9vbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBYSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFjdEQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcs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