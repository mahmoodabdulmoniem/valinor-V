/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatModeKind } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction } from '../chatEditing/chatEditingActions.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION, CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
export function registerNewChatActions() {
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2('chat.newChat.label', "New Chat"),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
                menu: [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
                    id,
                    group: 'navigation',
                    when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                    order: 1
                }))
            });
        }
        async run(accessor, ...args) {
            announceChatCleared(accessor.get(IAccessibilitySignalService));
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class NewChatAction extends EditingSessionAction {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2('chat.newEdits.label', "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ChatContext,
                        group: 'z_clear'
                    },
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -1
                    }],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */],
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                        secondary: [256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */]
                    },
                    when: ChatContextKeys.inChatSession
                }
            });
        }
        async runEditingSessionAction(accessor, editingSession, widget, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const dialogService = accessor.get(IDialogService);
            if (!(await handleCurrentEditingSession(editingSession, undefined, dialogService))) {
                return;
            }
            announceChatCleared(accessibilitySignalService);
            await editingSession.stop();
            widget.clear();
            await widget.waitForReady();
            widget.attachmentModel.clear(true);
            widget.input.relatedFiles?.clear();
            widget.focusInput();
            if (!context) {
                return;
            }
            if (typeof context.agentMode === 'boolean') {
                widget.input.setChatMode(context.agentMode ? ChatModeKind.Agent : ChatModeKind.Edit);
            }
            if (context.inputValue) {
                if (context.isPartialQuery) {
                    widget.setInput(context.inputValue);
                }
                else {
                    widget.acceptInput(context.inputValue);
                }
            }
        }
    });
    CommandsRegistry.registerCommandAlias(ACTION_ID_NEW_EDIT_SESSION, ACTION_ID_NEW_CHAT);
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2('chat.undoEdit.label', "Undo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -3,
                        isHiddenByDefault: true
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2('chat.redoEdit.label', "Redo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -2,
                        isHiddenByDefault: true
                    }
                ]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.redoInteraction();
        }
    });
    registerAction2(class RedoChatCheckpoints extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit2',
                title: localize2('chat.redoEdit.label2', "Redo"),
                tooltip: localize2('chat.redoEdit.tooltip', "Reapply discarded workspace changes and chat"),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ChatMessageRestoreCheckpoint,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -1
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const widget = accessor.get(IChatWidgetService);
            while (editingSession.canRedo.get()) {
                await editingSession.redoInteraction();
            }
            widget.lastFocusedWidget?.viewModel?.model.setCheckpoint(undefined);
        }
    });
}
function announceChatCleared(accessibilitySignalService) {
    accessibilitySignalService.playSignal(AccessibilitySignal.clear);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENsZWFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ3JKLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBb0JqRCxNQUFNLFVBQVUsc0JBQXNCO0lBQ3JDLGVBQWUsQ0FBQyxNQUFNLG1CQUFvQixTQUFRLE9BQU87UUFDeEQ7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLHFDQUFxQztnQkFDekMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUM7Z0JBQ2xELElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO2dCQUNyQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3RFLEVBQUU7b0JBQ0YsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQztvQkFDN0QsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQyxDQUFDO2FBQ0gsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDbkQsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7WUFDL0QsTUFBTSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakMsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVILGVBQWUsQ0FBQyxNQUFNLGFBQWMsU0FBUSxvQkFBb0I7UUFDL0Q7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGtCQUFrQjtnQkFDdEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7Z0JBQ3pELEVBQUUsRUFBRSxJQUFJO2dCQUNSLElBQUksRUFBRSxDQUFDO3dCQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVzt3QkFDdEIsS0FBSyxFQUFFLFNBQVM7cUJBQ2hCO29CQUNEO3dCQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUzt3QkFDcEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQzt3QkFDL0MsS0FBSyxFQUFFLFlBQVk7d0JBQ25CLEtBQUssRUFBRSxDQUFDLENBQUM7cUJBQ1QsQ0FBQztnQkFDRixVQUFVLEVBQUU7b0JBQ1gsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO29CQUM3QyxPQUFPLEVBQUUsaURBQTZCO29CQUN0QyxTQUFTLEVBQUUsQ0FBQyxpREFBNkIsQ0FBQztvQkFDMUMsR0FBRyxFQUFFO3dCQUNKLE9BQU8sRUFBRSxpREFBNkI7d0JBQ3RDLFNBQVMsRUFBRSxDQUFDLGdEQUE2QixDQUFDO3FCQUMxQztvQkFDRCxJQUFJLEVBQUUsZUFBZSxDQUFDLGFBQWE7aUJBQ25DO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUdELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUEwQixFQUFFLGNBQW1DLEVBQUUsTUFBbUIsRUFBRSxHQUFHLElBQVc7WUFDakksTUFBTSxPQUFPLEdBQTZDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUM3RSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRW5ELElBQUksQ0FBQyxDQUFDLE1BQU0sMkJBQTJCLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLE9BQU87WUFDUixDQUFDO1lBRUQsbUJBQW1CLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUVoRCxNQUFNLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7WUFFcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0RixDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM1QixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDckMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUM7SUFDSCxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBR3RGLGVBQWUsQ0FBQyxNQUFNLDZCQUE4QixTQUFRLG9CQUFvQjtRQUMvRTtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsZ0NBQWdDO2dCQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDO2dCQUM1RCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO2dCQUNyQixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQztnQkFDN0YsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsSUFBSSxFQUFFLENBQUM7d0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDO3dCQUMvQyxLQUFLLEVBQUUsWUFBWTt3QkFDbkIsS0FBSyxFQUFFLENBQUMsQ0FBQzt3QkFDVCxpQkFBaUIsRUFBRSxJQUFJO3FCQUN2QixDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUEwQixFQUFFLGNBQW1DO1lBQzVGLE1BQU0sY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxlQUFlLENBQUMsTUFBTSw2QkFBOEIsU0FBUSxvQkFBb0I7UUFDL0U7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGdDQUFnQztnQkFDcEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDNUQsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUM7Z0JBQzdGLEVBQUUsRUFBRSxJQUFJO2dCQUNSLElBQUksRUFBRTtvQkFDTDt3QkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7d0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7d0JBQy9DLEtBQUssRUFBRSxZQUFZO3dCQUNuQixLQUFLLEVBQUUsQ0FBQyxDQUFDO3dCQUNULGlCQUFpQixFQUFFLElBQUk7cUJBQ3ZCO2lCQUNEO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUEwQixFQUFFLGNBQW1DO1lBQzVGLE1BQU0sY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxlQUFlLENBQUMsTUFBTSxtQkFBb0IsU0FBUSxvQkFBb0I7UUFDckU7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGlDQUFpQztnQkFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUM7Z0JBQ2hELE9BQU8sRUFBRSxTQUFTLENBQUMsdUJBQXVCLEVBQUUsOENBQThDLENBQUM7Z0JBQzNGLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQztnQkFDN0YsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsSUFBSSxFQUFFLENBQUM7d0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyw0QkFBNEI7d0JBQ3ZDLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7d0JBQy9DLEtBQUssRUFBRSxZQUFZO3dCQUNuQixLQUFLLEVBQUUsQ0FBQyxDQUFDO3FCQUNULENBQUM7YUFDRixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFFBQTBCLEVBQUUsY0FBbUM7WUFDNUYsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRWhELE9BQU8sY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLGNBQWMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QyxDQUFDO1lBQ0QsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7S0FDRCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQywwQkFBdUQ7SUFDbkYsMEJBQTBCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2xFLENBQUMifQ==