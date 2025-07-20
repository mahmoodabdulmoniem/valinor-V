/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { wrapInHotClass1 } from '../../../../platform/observable/common/wrapInHotClass.js';
import { registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { AcceptInlineCompletion, AcceptNextLineOfInlineCompletion, AcceptNextWordOfInlineCompletion, DevExtractReproSample, HideInlineCompletion, JumpToNextInlineEdit, ShowNextInlineSuggestionAction, ShowPreviousInlineSuggestionAction, ToggleAlwaysShowInlineSuggestionToolbar, ExplicitTriggerInlineEditAction, TriggerInlineSuggestionAction, TriggerInlineEditAction, ToggleInlineCompletionShowCollapsed } from './controller/commands.js';
import { InlineCompletionsController } from './controller/inlineCompletionsController.js';
import { InlineCompletionsHoverParticipant } from './hintsWidget/hoverParticipant.js';
import { InlineCompletionsAccessibleView } from './inlineCompletionsAccessibleView.js';
import { CancelSnoozeInlineCompletion, SnoozeInlineCompletion } from '../../../browser/services/inlineCompletionsService.js';
registerEditorContribution(InlineCompletionsController.ID, wrapInHotClass1(InlineCompletionsController.hot), 3 /* EditorContributionInstantiation.Eventually */);
registerEditorAction(TriggerInlineSuggestionAction);
registerEditorAction(ExplicitTriggerInlineEditAction);
registerEditorCommand(new TriggerInlineEditAction());
registerEditorAction(ShowNextInlineSuggestionAction);
registerEditorAction(ShowPreviousInlineSuggestionAction);
registerEditorAction(AcceptNextWordOfInlineCompletion);
registerEditorAction(AcceptNextLineOfInlineCompletion);
registerEditorAction(AcceptInlineCompletion);
registerEditorAction(ToggleInlineCompletionShowCollapsed);
registerEditorAction(HideInlineCompletion);
registerEditorAction(JumpToNextInlineEdit);
registerAction2(ToggleAlwaysShowInlineSuggestionToolbar);
registerEditorAction(DevExtractReproSample);
registerAction2(SnoozeInlineCompletion);
registerAction2(CancelSnoozeInlineCompletion);
HoverParticipantRegistry.register(InlineCompletionsHoverParticipant);
AccessibleViewRegistry.register(new InlineCompletionsAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2lubGluZUNvbXBsZXRpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBbUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsa0NBQWtDLEVBQUUsdUNBQXVDLEVBQUUsK0JBQStCLEVBQUUsNkJBQTZCLEVBQUUsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwYixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUU3SCwwQkFBMEIsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxxREFBNkMsQ0FBQztBQUV6SixvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3BELG9CQUFvQixDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDdEQscUJBQXFCLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7QUFDckQsb0JBQW9CLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUNyRCxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBQ3pELG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDdkQsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN2RCxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzdDLG9CQUFvQixDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDMUQsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUMzQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzNDLGVBQWUsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ3pELG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDNUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDeEMsZUFBZSxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFFOUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDckUsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksK0JBQStCLEVBQUUsQ0FBQyxDQUFDIn0=