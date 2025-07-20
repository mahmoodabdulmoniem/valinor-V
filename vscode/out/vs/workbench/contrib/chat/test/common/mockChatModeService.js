/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { ChatMode } from '../../common/chatModes.js';
export class MockChatModeService {
    constructor() {
        this._modes = { builtin: [ChatMode.Ask], custom: [] };
        this.onDidChangeChatModes = Event.None;
    }
    getModes() {
        return this._modes;
    }
    findModeById(id) {
        return this.getFlatModes().find(mode => mode.id === id);
    }
    findModeByName(name) {
        return this.getFlatModes().find(mode => mode.name === name);
    }
    getFlatModes() {
        const allModes = this.getModes();
        return [...allModes.builtin, ...allModes.custom];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRNb2RlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrQ2hhdE1vZGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUErQixNQUFNLDJCQUEyQixDQUFDO0FBRWxGLE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFHUyxXQUFNLEdBQW9FLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUUxRyx5QkFBb0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBa0JuRCxDQUFDO0lBaEJBLFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELFlBQVksQ0FBQyxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELGNBQWMsQ0FBQyxJQUFZO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVPLFlBQVk7UUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUNEIn0=