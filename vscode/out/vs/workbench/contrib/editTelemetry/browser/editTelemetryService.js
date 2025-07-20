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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { ITelemetryService, telemetryLevelEnabled } from '../../../../platform/telemetry/common/telemetry.js';
import { EditTrackingFeature } from './editSourceTrackingFeature.js';
import { EDIT_TELEMETRY_SETTING_ID } from './settings.js';
import { VSCodeWorkspace } from './vscodeObservableWorkspace.js';
let EditTelemetryService = class EditTelemetryService extends Disposable {
    constructor(_instantiationService, _configurationService, _telemetryService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._editSourceTrackingEnabled = observableConfigValue(EDIT_TELEMETRY_SETTING_ID, true, this._configurationService);
        this._register(autorun(r => {
            const enabled = this._editSourceTrackingEnabled.read(r);
            if (!enabled || !telemetryLevelEnabled(this._telemetryService, 3 /* TelemetryLevel.USAGE */)) {
                return;
            }
            const workspace = this._instantiationService.createInstance(VSCodeWorkspace);
            r.store.add(this._instantiationService.createInstance(EditTrackingFeature, workspace));
        }));
    }
};
EditTelemetryService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, ITelemetryService)
], EditTelemetryService);
export { EditTelemetryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFRlbGVtZXRyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9lZGl0VGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQUduRCxZQUN5QyxxQkFBNEMsRUFDNUMscUJBQTRDLEVBQ2hELGlCQUFvQztRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUpnQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDaEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUl4RSxJQUFJLENBQUMsMEJBQTBCLEdBQUcscUJBQXFCLENBQUMseUJBQXlCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRXJILElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsK0JBQXVCLEVBQUUsQ0FBQztnQkFDdEYsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRTdFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNELENBQUE7QUF2Qlksb0JBQW9CO0lBSTlCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBTlAsb0JBQW9CLENBdUJoQyJ9