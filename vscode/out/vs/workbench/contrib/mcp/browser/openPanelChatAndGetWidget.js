/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { ChatViewId } from '../../chat/browser/chat.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
export async function openPanelChatAndGetWidget(viewsService, chatService) {
    await viewsService.openView(ChatViewId, true);
    const widgets = chatService.getWidgetsByLocations(ChatAgentLocation.Panel);
    if (widgets.length) {
        return widgets[0];
    }
    const eventPromise = Event.toPromise(Event.filter(chatService.onDidAddWidget, e => e.location === ChatAgentLocation.Panel));
    return await raceTimeout(eventPromise, 10000, // should be enough time for chat to initialize...
    () => eventPromise.cancel());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlblBhbmVsQ2hhdEFuZEdldFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvb3BlblBhbmVsQ2hhdEFuZEdldFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBbUMsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHbkUsTUFBTSxDQUFDLEtBQUssVUFBVSx5QkFBeUIsQ0FBQyxZQUEyQixFQUFFLFdBQStCO0lBQzNHLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNFLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUU1SCxPQUFPLE1BQU0sV0FBVyxDQUN2QixZQUFZLEVBQ1osS0FBSyxFQUFFLGtEQUFrRDtJQUN6RCxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQzNCLENBQUM7QUFDSCxDQUFDIn0=