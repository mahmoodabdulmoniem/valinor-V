/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDataChannelService } from '../common/dataChannel.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export class DataChannelService extends Disposable {
    constructor() {
        super();
        this._onDidSendData = this._register(new Emitter());
        this.onDidSendData = this._onDidSendData.event;
    }
    getDataChannel(channelId) {
        return new CoreDataChannelImpl(channelId, this._onDidSendData);
    }
}
class CoreDataChannelImpl {
    constructor(channelId, _onDidSendData) {
        this.channelId = channelId;
        this._onDidSendData = _onDidSendData;
    }
    sendData(data) {
        this._onDidSendData.fire({
            channelId: this.channelId,
            data
        });
    }
}
registerSingleton(IDataChannelService, DataChannelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YUNoYW5uZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGF0YUNoYW5uZWwvYnJvd3Nlci9kYXRhQ2hhbm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQXNDLE1BQU0sMEJBQTBCLENBQUM7QUFDbkcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRS9HLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBTWpEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFKUSxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXFCLENBQUMsQ0FBQztRQUMxRSxrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0lBSW5ELENBQUM7SUFFRCxjQUFjLENBQUksU0FBaUI7UUFDbEMsT0FBTyxJQUFJLG1CQUFtQixDQUFJLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBbUI7SUFDeEIsWUFDa0IsU0FBaUIsRUFDakIsY0FBMEM7UUFEMUMsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixtQkFBYyxHQUFkLGNBQWMsQ0FBNEI7SUFDeEQsQ0FBQztJQUVMLFFBQVEsQ0FBQyxJQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDeEIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLElBQUk7U0FDSixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0Isb0NBQTRCLENBQUMifQ==