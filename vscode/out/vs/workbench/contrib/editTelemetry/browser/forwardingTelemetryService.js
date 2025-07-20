/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDataChannelService } from '../../../services/dataChannel/common/dataChannel.js';
export class InterceptingTelemetryService {
    constructor(_baseService, _intercept) {
        this._baseService = _baseService;
        this._intercept = _intercept;
    }
    get telemetryLevel() {
        return this._baseService.telemetryLevel;
    }
    get sessionId() {
        return this._baseService.sessionId;
    }
    get machineId() {
        return this._baseService.machineId;
    }
    get sqmId() {
        return this._baseService.sqmId;
    }
    get devDeviceId() {
        return this._baseService.devDeviceId;
    }
    get firstSessionDate() {
        return this._baseService.firstSessionDate;
    }
    get msftInternal() {
        return this._baseService.msftInternal;
    }
    get sendErrorTelemetry() {
        return this._baseService.sendErrorTelemetry;
    }
    publicLog(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLog2(eventName, data);
    }
    publicLogError(errorEventName, data) {
        this._intercept(errorEventName, data);
        this._baseService.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLogError2(eventName, data);
    }
    setExperimentProperty(name, value) {
        this._baseService.setExperimentProperty(name, value);
    }
}
let DataChannelForwardingTelemetryService = class DataChannelForwardingTelemetryService extends InterceptingTelemetryService {
    constructor(telemetryService, dataChannelService) {
        super(telemetryService, (eventName, data) => {
            dataChannelService.getDataChannel('editTelemetry').sendData({ eventName, data: data });
        });
    }
};
DataChannelForwardingTelemetryService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IDataChannelService)
], DataChannelForwardingTelemetryService);
export { DataChannelForwardingTelemetryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yd2FyZGluZ1RlbGVtZXRyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9mb3J3YXJkaW5nVGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQWtCLGlCQUFpQixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTFGLE1BQU0sT0FBTyw0QkFBNEI7SUFHeEMsWUFDa0IsWUFBK0IsRUFDL0IsVUFBOEQ7UUFEOUQsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBQy9CLGVBQVUsR0FBVixVQUFVLENBQW9EO0lBQzVFLENBQUM7SUFFTCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO0lBQzNDLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUM7SUFDN0MsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFpQixFQUFFLElBQXFCO1FBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsVUFBVSxDQUFzRixTQUFpQixFQUFFLElBQWdDO1FBQ2xKLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsY0FBYyxDQUFDLGNBQXNCLEVBQUUsSUFBcUI7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxlQUFlLENBQXNGLFNBQWlCLEVBQUUsSUFBZ0M7UUFDdkosSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxJQUFZLEVBQUUsS0FBYTtRQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Q7QUFPTSxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFzQyxTQUFRLDRCQUE0QjtJQUN0RixZQUNvQixnQkFBbUMsRUFDakMsa0JBQXVDO1FBRTVELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQyxrQkFBa0IsQ0FBQyxjQUFjLENBQXFCLGVBQWUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBVyxFQUFFLENBQUMsQ0FBQztRQUNuSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBVFkscUNBQXFDO0lBRS9DLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxtQkFBbUIsQ0FBQTtHQUhULHFDQUFxQyxDQVNqRCJ9