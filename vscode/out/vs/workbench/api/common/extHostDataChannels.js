/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const IExtHostDataChannels = createDecorator('IExtHostDataChannels');
export class ExtHostDataChannels {
    constructor() {
        this._channels = new Map();
    }
    createDataChannel(extension, channelId) {
        checkProposedApiEnabled(extension, 'dataChannels');
        let channel = this._channels.get(channelId);
        if (!channel) {
            channel = new DataChannelImpl(channelId);
            this._channels.set(channelId, channel);
        }
        return channel;
    }
    $onDidReceiveData(channelId, data) {
        const channel = this._channels.get(channelId);
        if (channel) {
            channel._fireDidReceiveData(data);
        }
    }
}
class DataChannelImpl extends Disposable {
    constructor(channelId) {
        super();
        this.channelId = channelId;
        this._onDidReceiveData = new Emitter();
        this.onDidReceiveData = this._onDidReceiveData.event;
        this._register(this._onDidReceiveData);
    }
    _fireDidReceiveData(data) {
        this._onDidReceiveData.fire({ data });
    }
    toString() {
        return `DataChannel(${this.channelId})`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERhdGFDaGFubmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERhdGFDaGFubmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQU8xRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHNCQUFzQixDQUFDLENBQUM7QUFFbEcsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQjtRQUZpQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUM7SUFHckUsQ0FBQztJQUVELGlCQUFpQixDQUFJLFNBQWdDLEVBQUUsU0FBaUI7UUFDdkUsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRW5ELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sR0FBRyxJQUFJLGVBQWUsQ0FBSSxTQUFTLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxTQUFpQixFQUFFLElBQVM7UUFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxlQUFtQixTQUFRLFVBQVU7SUFJMUMsWUFBNkIsU0FBaUI7UUFDN0MsS0FBSyxFQUFFLENBQUM7UUFEb0IsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUg3QixzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBOEIsQ0FBQztRQUMvRCxxQkFBZ0IsR0FBc0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQUlsRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxJQUFPO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sZUFBZSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUM7SUFDekMsQ0FBQztDQUNEIn0=