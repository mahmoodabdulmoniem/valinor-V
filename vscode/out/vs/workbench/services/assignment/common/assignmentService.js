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
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Memento } from '../../../common/memento.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ASSIGNMENT_REFETCH_INTERVAL, ASSIGNMENT_STORAGE_KEY, AssignmentFilterProvider, TargetPopulation } from '../../../../platform/assignment/common/assignment.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { timeout } from '../../../../base/common/async.js';
export const IWorkbenchAssignmentService = createDecorator('assignmentService');
class MementoKeyValueStorage {
    constructor(memento) {
        this.memento = memento;
        this.mementoObj = memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoObj[key];
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoObj[key] = value;
        this.memento.saveMemento();
    }
}
class WorkbenchAssignmentServiceTelemetry {
    get assignmentContext() {
        return this._lastAssignmentContext?.split(';');
    }
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    // __GDPR__COMMON__ "abexp.assignmentcontext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    setSharedProperty(name, value) {
        if (name === this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this._lastAssignmentContext = value;
        }
        this.telemetryService.setExperimentProperty(name, value);
    }
    postEvent(eventName, props) {
        const data = {};
        for (const [key, value] of props.entries()) {
            data[key] = value;
        }
        /* __GDPR__
            "query-expfeature" : {
                "owner": "sbatten",
                "comment": "Logs queries to the experiment service by feature for metric calculations",
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The experimental feature being queried" }
            }
        */
        this.telemetryService.publicLog(eventName, data);
    }
}
let WorkbenchAssignmentService = class WorkbenchAssignmentService {
    constructor(telemetryService, storageService, configurationService, productService, environmentService) {
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.productService = productService;
        this.networkInitialized = false;
        this.experimentsEnabled = getTelemetryLevel(configurationService) === 3 /* TelemetryLevel.USAGE */ &&
            !environmentService.disableExperiments &&
            !environmentService.extensionTestsLocationURI &&
            !environmentService.enableSmokeTestDriver &&
            configurationService.getValue('workbench.enableExperiments') === true;
        if (productService.tasConfig && this.experimentsEnabled) {
            this.tasClient = this.setupTASClient();
        }
        this.telemetry = new WorkbenchAssignmentServiceTelemetry(telemetryService, productService);
        this.keyValueStorage = new MementoKeyValueStorage(new Memento('experiment.service.memento', storageService));
        // For development purposes, configure the delay until tas local tas treatment ovverrides are available
        const overrideDelaySetting = configurationService.getValue('experiments.overrideDelay');
        const overrideDelay = typeof overrideDelaySetting === 'number' ? overrideDelaySetting : 0;
        this.overrideInitDelay = timeout(overrideDelay);
    }
    async getTreatment(name) {
        const result = await this.doGetTreatment(name);
        this.telemetryService.publicLog2('tasClientReadTreatmentComplete', {
            treatmentName: name,
            treatmentValue: JSON.stringify(result)
        });
        return result;
    }
    async doGetTreatment(name) {
        await this.overrideInitDelay; // For development purposes, allow overriding tas assignments to test variants locally.
        const override = this.configurationService.getValue(`experiments.override.${name}`);
        if (override !== undefined) {
            return override;
        }
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        let result;
        const client = await this.tasClient;
        // The TAS client is initialized but we need to check if the initial fetch has completed yet
        // If it is complete, return a cached value for the treatment
        // If not, use the async call with `checkCache: true`. This will allow the module to return a cached value if it is present.
        // Otherwise it will await the initial fetch to return the most up to date value.
        if (this.networkInitialized) {
            result = client.getTreatmentVariable('vscode', name);
        }
        else {
            result = await client.getTreatmentVariableAsync('vscode', name, true);
        }
        result = client.getTreatmentVariable('vscode', name);
        return result;
    }
    async setupTASClient() {
        const targetPopulation = this.productService.quality === 'stable' ?
            TargetPopulation.Public : (this.productService.quality === 'exploration' ?
            TargetPopulation.Exploration : TargetPopulation.Insiders);
        const filterProvider = new AssignmentFilterProvider(this.productService.version, this.productService.nameLong, this.telemetryService.machineId, targetPopulation);
        const tasConfig = this.productService.tasConfig;
        const tasClient = new (await importAMDNodeModule('tas-client-umd', 'lib/tas-client-umd.js')).ExperimentationService({
            filterProviders: [filterProvider],
            telemetry: this.telemetry,
            storageKey: ASSIGNMENT_STORAGE_KEY,
            keyValueStorage: this.keyValueStorage,
            assignmentContextTelemetryPropertyName: tasConfig.assignmentContextTelemetryPropertyName,
            telemetryEventName: tasConfig.telemetryEventName,
            endpoint: tasConfig.endpoint,
            refetchInterval: ASSIGNMENT_REFETCH_INTERVAL,
        });
        await tasClient.initializePromise;
        tasClient.initialFetch.then(() => this.networkInitialized = true);
        return tasClient;
    }
    async getCurrentExperiments() {
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        await this.tasClient;
        return this.telemetry.assignmentContext;
    }
};
WorkbenchAssignmentService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IProductService),
    __param(4, IWorkbenchEnvironmentService)
], WorkbenchAssignmentService);
export { WorkbenchAssignmentService };
registerSingleton(IWorkbenchAssignmentService, WorkbenchAssignmentService, 1 /* InstantiationType.Delayed */);
const registry = Registry.as(ConfigurationExtensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.enableExperiments': {
            'type': 'boolean',
            'description': localize('workbench.enableExperiments', "Fetches experiments to run from a Microsoft online service."),
            'default': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'restricted': true,
            'tags': ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hc3NpZ25tZW50L2NvbW1vbi9hc3NpZ25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE9BQU8sRUFBaUIsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0wsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZLLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFN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