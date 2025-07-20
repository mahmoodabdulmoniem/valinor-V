/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
export const IChatWidgetService = createDecorator('chatWidgetService');
export async function showChatView(viewsService) {
    return (await viewsService.openView(ChatViewId))?.widget;
}
export function showCopilotView(viewsService, layoutService) {
    // Ensure main window is in front
    if (layoutService.activeContainer !== layoutService.mainContainer) {
        layoutService.mainContainer.focus();
    }
    return showChatView(viewsService);
}
export const IQuickChatService = createDecorator('quickChatService');
export const IChatAccessibilityService = createDecorator('chatAccessibilityService');
export const IChatCodeBlockContextProviderService = createDecorator('chatCodeBlockContextProviderService');
export const ChatViewId = `workbench.panel.chat.view.${CHAT_PROVIDER_ID}`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBVTVFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQztBQW1CM0YsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQUMsWUFBMkI7SUFDN0QsT0FBTyxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN4RSxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxZQUEyQixFQUFFLGFBQXNDO0lBRWxHLGlDQUFpQztJQUNqQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEtBQUssYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25FLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELE9BQU8sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUM7QUE0QnhGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMEJBQTBCLENBQUMsQ0FBQztBQThJaEgsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsZUFBZSxDQUF1QyxxQ0FBcUMsQ0FBQyxDQUFDO0FBT2pKLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsZ0JBQWdCLEVBQUUsQ0FBQyJ9