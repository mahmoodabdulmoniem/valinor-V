/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { InlineChatController, InlineChatController1, InlineChatController2 } from './inlineChatController.js';
import * as InlineChatActions from './inlineChatActions.js';
import { CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, INLINE_CHAT_ID, MENU_INLINE_CHAT_WIDGET_STATUS } from '../common/inlineChat.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { InlineChatNotebookContribution } from './inlineChatNotebook.js';
import { registerWorkbenchContribution2, Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { InlineChatAccessibleView } from './inlineChatAccessibleView.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { InlineChatEnabler, InlineChatSessionServiceImpl } from './inlineChatSessionServiceImpl.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { CancelAction, ChatSubmitAction } from '../../chat/browser/actions/chatExecuteActions.js';
import { localize } from '../../../../nls.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatAccessibilityHelp } from './inlineChatAccessibilityHelp.js';
import { InlineChatExpandLineAction, InlineChatHintsController, HideInlineChatHintAction, ShowInlineChatHintAction } from './inlineChatCurrentLine.js';
registerEditorContribution(InlineChatController2.ID, InlineChatController2, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(INLINE_CHAT_ID, InlineChatController1, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(InlineChatController.ID, InlineChatController, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerAction2(InlineChatActions.KeepSessionAction2);
registerAction2(InlineChatActions.UndoSessionAction2);
registerAction2(InlineChatActions.CloseSessionAction2);
registerAction2(InlineChatActions.RevealWidget);
registerAction2(InlineChatActions.CancelRequestAction);
// --- browser
registerSingleton(IInlineChatSessionService, InlineChatSessionServiceImpl, 1 /* InstantiationType.Delayed */);
registerAction2(InlineChatExpandLineAction);
registerAction2(ShowInlineChatHintAction);
registerAction2(HideInlineChatHintAction);
registerEditorContribution(InlineChatHintsController.ID, InlineChatHintsController, 3 /* EditorContributionInstantiation.Eventually */);
// --- MENU special ---
const editActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.edit', "Edit Code"),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_HAS_AGENT),
};
const generateActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.generate', "Generate"),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING.toNegated(), CTX_INLINE_CHAT_HAS_AGENT),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, editActionMenuItem);
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, generateActionMenuItem);
const cancelActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: CancelAction.ID,
        title: localize('cancel', "Cancel Request"),
        shortTitle: localize('cancelShort', "Cancel"),
    },
    when: ContextKeyExpr.and(CTX_INLINE_CHAT_REQUEST_IN_PROGRESS),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, cancelActionMenuItem);
// --- actions ---
registerAction2(InlineChatActions.StartSessionAction);
registerAction2(InlineChatActions.CloseAction);
registerAction2(InlineChatActions.ConfigureInlineChatAction);
registerAction2(InlineChatActions.UnstashSessionAction);
registerAction2(InlineChatActions.DiscardHunkAction);
registerAction2(InlineChatActions.RerunAction);
registerAction2(InlineChatActions.MoveToNextHunk);
registerAction2(InlineChatActions.MoveToPreviousHunk);
registerAction2(InlineChatActions.ArrowOutUpAction);
registerAction2(InlineChatActions.ArrowOutDownAction);
registerAction2(InlineChatActions.FocusInlineChat);
registerAction2(InlineChatActions.ViewInChatAction);
registerAction2(InlineChatActions.ToggleDiffForChange);
registerAction2(InlineChatActions.AcceptChanges);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(InlineChatNotebookContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(InlineChatEnabler.Id, InlineChatEnabler, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new InlineChatAccessibleView());
AccessibleViewRegistry.register(new InlineChatAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0gsT0FBTyxFQUFhLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRyxPQUFPLEtBQUssaUJBQWlCLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLG1DQUFtQyxFQUFFLGNBQWMsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2xMLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDekUsT0FBTyxFQUFtQyw4QkFBOEIsRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDdEssT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEcs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