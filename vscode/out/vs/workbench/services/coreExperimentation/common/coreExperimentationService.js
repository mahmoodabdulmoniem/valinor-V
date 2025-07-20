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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { firstSessionDateStorageKey, ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
export const ICoreExperimentationService = createDecorator('coreExperimentationService');
export const startupExpContext = new RawContextKey('coreExperimentation.startupExpGroup', '');
export var StartupExperimentGroup;
(function (StartupExperimentGroup) {
    StartupExperimentGroup["Control"] = "control";
    StartupExperimentGroup["MaximizedChat"] = "maximizedChat";
    StartupExperimentGroup["SplitEmptyEditorChat"] = "splitEmptyEditorChat";
    StartupExperimentGroup["SplitWelcomeChat"] = "splitWelcomeChat";
})(StartupExperimentGroup || (StartupExperimentGroup = {}));
export const STARTUP_EXPERIMENT_NAME = 'startup';
const EXPERIMENT_CONFIGURATIONS = {
    stable: {
        experimentName: STARTUP_EXPERIMENT_NAME,
        targetPercentage: 20,
        groups: [
            // Bump the iteration each time we change group allocations
            { name: StartupExperimentGroup.Control, min: 0.0, max: 0.25, iteration: 1 },
            { name: StartupExperimentGroup.MaximizedChat, min: 0.25, max: 0.5, iteration: 1 },
            { name: StartupExperimentGroup.SplitEmptyEditorChat, min: 0.5, max: 0.75, iteration: 1 },
            { name: StartupExperimentGroup.SplitWelcomeChat, min: 0.75, max: 1.0, iteration: 1 }
        ]
    },
    insider: {
        experimentName: STARTUP_EXPERIMENT_NAME,
        targetPercentage: 20,
        groups: [
            // Bump the iteration each time we change group allocations
            { name: StartupExperimentGroup.Control, min: 0.0, max: 0.25, iteration: 1 },
            { name: StartupExperimentGroup.MaximizedChat, min: 0.25, max: 0.5, iteration: 1 },
            { name: StartupExperimentGroup.SplitEmptyEditorChat, min: 0.5, max: 0.75, iteration: 1 },
            { name: StartupExperimentGroup.SplitWelcomeChat, min: 0.75, max: 1.0, iteration: 1 }
        ]
    }
};
let CoreExperimentationService = class CoreExperimentationService extends Disposable {
    constructor(storageService, telemetryService, productService, contextKeyService, environmentService) {
        super();
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.experiments = new Map();
        if (environmentService.disableExperiments ||
            environmentService.enableSmokeTestDriver ||
            environmentService.extensionTestsLocationURI) {
            return; //not applicable in this environment
        }
        this.initializeExperiments();
    }
    initializeExperiments() {
        const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) || new Date().toUTCString();
        const daysSinceFirstSession = ((+new Date()) - (+new Date(firstSessionDateString))) / 1000 / 60 / 60 / 24;
        if (daysSinceFirstSession > 1) {
            // not a startup exp candidate.
            return;
        }
        const experimentConfig = this.getExperimentConfiguration();
        if (!experimentConfig) {
            return;
        }
        // also check storage to see if this user has already seen the startup experience
        const storageKey = `coreExperimentation.${experimentConfig.experimentName}`;
        const storedExperiment = this.storageService.get(storageKey, -1 /* StorageScope.APPLICATION */);
        if (storedExperiment) {
            try {
                const parsedExperiment = JSON.parse(storedExperiment);
                this.experiments.set(experimentConfig.experimentName, parsedExperiment);
                startupExpContext.bindTo(this.contextKeyService).set(parsedExperiment.experimentGroup);
                return;
            }
            catch (e) {
                this.storageService.remove(storageKey, -1 /* StorageScope.APPLICATION */);
                return;
            }
        }
        const experiment = this.createStartupExperiment(experimentConfig.experimentName, experimentConfig);
        if (experiment) {
            this.experiments.set(experimentConfig.experimentName, experiment);
            this.sendExperimentTelemetry(experimentConfig.experimentName, experiment);
            startupExpContext.bindTo(this.contextKeyService).set(experiment.experimentGroup);
            this.storageService.store(storageKey, JSON.stringify(experiment), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    getExperimentConfiguration() {
        const quality = this.productService.quality;
        if (!quality) {
            return undefined;
        }
        return EXPERIMENT_CONFIGURATIONS[quality];
    }
    createStartupExperiment(experimentName, experimentConfig) {
        const startupExpGroupOverride = this.environmentService.startupExperimentGroup;
        if (startupExpGroupOverride) {
            // If the user has an override, we use that directly
            const group = experimentConfig.groups.find(g => g.name === startupExpGroupOverride);
            if (group) {
                return {
                    cohort: 1,
                    subCohort: 1,
                    experimentGroup: group.name,
                    iteration: group.iteration,
                    isInExperiment: true
                };
            }
            return undefined;
        }
        const cohort = Math.random();
        if (cohort >= experimentConfig.targetPercentage / 100) {
            return undefined;
        }
        // Normalize the cohort to the experiment range [0, targetPercentage/100]
        const normalizedCohort = cohort / (experimentConfig.targetPercentage / 100);
        // Find which group this user falls into
        for (const group of experimentConfig.groups) {
            if (normalizedCohort >= group.min && normalizedCohort < group.max) {
                return {
                    cohort,
                    subCohort: normalizedCohort,
                    experimentGroup: group.name,
                    iteration: group.iteration,
                    isInExperiment: true
                };
            }
        }
        return undefined;
    }
    sendExperimentTelemetry(experimentName, experiment) {
        this.telemetryService.publicLog2(`coreExperimentation.experimentCohort`, {
            experimentName,
            cohort: experiment.cohort,
            subCohort: experiment.subCohort,
            experimentGroup: experiment.experimentGroup,
            iteration: experiment.iteration,
            isInExperiment: experiment.isInExperiment
        });
    }
    getExperiment() {
        return this.experiments.get(STARTUP_EXPERIMENT_NAME);
    }
};
CoreExperimentationService = __decorate([
    __param(0, IStorageService),
    __param(1, ITelemetryService),
    __param(2, IProductService),
    __param(3, IContextKeyService),
    __param(4, IWorkbenchEnvironmentService)
], CoreExperimentationService);
export { CoreExperimentationService };
registerSingleton(ICoreExperimentationService, CoreExperimentationService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUV4cGVyaW1lbnRhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb3JlRXhwZXJpbWVudGF0aW9uL2NvbW1vbi9jb3JlRXhwZXJpbWVudGF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFOUYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUE4Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3RILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFTLHFDQUFxQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBNEJ0RyxNQUFNLENBQU4sSUFBWSxzQkFLWDtBQUxELFdBQVksc0JBQXNCO0lBQ2pDLDZDQUFtQixDQUFBO0lBQ25CLHlEQUErQixDQUFBO0lBQy9CLHVFQUE2QyxDQUFBO0lBQzdDLCtEQUFxQyxDQUFBO0FB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