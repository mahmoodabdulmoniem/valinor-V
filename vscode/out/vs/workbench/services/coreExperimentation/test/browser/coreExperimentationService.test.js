/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { CoreExperimentationService, startupExpContext } from '../../common/coreExperimentationService.js';
import { firstSessionDateStorageKey } from '../../../../../platform/telemetry/common/telemetry.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
class MockTelemetryService {
    constructor() {
        this.events = [];
        this.telemetryLevel = 3 /* TelemetryLevel.USAGE */;
        this.sessionId = 'test-session';
        this.machineId = 'test-machine';
        this.sqmId = 'test-sqm';
        this.devDeviceId = 'test-device';
        this.firstSessionDate = 'test-date';
        this.sendErrorTelemetry = true;
    }
    publicLog2(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLog(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLogError(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLogError2(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    setExperimentProperty() { }
}
class MockProductService {
    constructor() {
        this.quality = 'stable';
    }
    get version() { return '1.0.0'; }
    get commit() { return 'test-commit'; }
    get nameLong() { return 'Test VSCode'; }
    get nameShort() { return 'VSCode'; }
    get applicationName() { return 'test-vscode'; }
    get serverApplicationName() { return 'test-server'; }
    get dataFolderName() { return '.test-vscode'; }
    get urlProtocol() { return 'test-vscode'; }
    get extensionAllowedProposedApi() { return []; }
    get extensionProperties() { return {}; }
}
suite('CoreExperimentationService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let telemetryService;
    let productService;
    let contextKeyService;
    let environmentService;
    setup(() => {
        storageService = disposables.add(new TestStorageService());
        telemetryService = new MockTelemetryService();
        productService = new MockProductService();
        contextKeyService = new MockContextKeyService();
        environmentService = {};
    });
    test('should return experiment from storage if it exists', () => {
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Set that user has already seen the experiment
        const existingExperiment = {
            cohort: 0.5,
            subCohort: 0.5,
            experimentGroup: 'control',
            iteration: 1,
            isInExperiment: true
        };
        storageService.store('coreExperimentation.startup', JSON.stringify(existingExperiment), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
        // Should not return experiment again
        assert.deepStrictEqual(service.getExperiment(), existingExperiment);
        // No telemetry should be sent for new experiment
        assert.strictEqual(telemetryService.events.length, 0);
    });
    test('should initialize experiment for new user in first session and set context key', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Mock Math.random to return a value that puts user in experiment
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% - should be in experiment for all quality levels
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            // Should create experiment
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            assert.strictEqual(experiment.isInExperiment, true);
            assert.strictEqual(experiment.iteration, 1);
            assert(experiment.cohort >= 0 && experiment.cohort < 1, 'Cohort should be between 0 and 1');
            assert(['control', 'maximizedChat', 'splitEmptyEditorChat', 'splitWelcomeChat'].includes(experiment.experimentGroup), 'Experiment group should be one of the defined treatments');
            // Context key should be set to experiment group
            const contextValue = startupExpContext.getValue(contextKeyService);
            assert.strictEqual(contextValue, experiment.experimentGroup, 'Context key should be set to experiment group');
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should emit telemetry when experiment is created', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Mock Math.random to return a value that puts user in experiment
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% - should be in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Check that telemetry was sent
            assert.strictEqual(telemetryService.events.length, 1);
            const telemetryEvent = telemetryService.events[0];
            assert.strictEqual(telemetryEvent.eventName, 'coreExperimentation.experimentCohort');
            // Verify telemetry data
            const data = telemetryEvent.data;
            assert.strictEqual(data.experimentName, 'startup');
            assert.strictEqual(data.cohort, experiment.cohort);
            assert.strictEqual(data.subCohort, experiment.subCohort);
            assert.strictEqual(data.experimentGroup, experiment.experimentGroup);
            assert.strictEqual(data.iteration, experiment.iteration);
            assert.strictEqual(data.isInExperiment, experiment.isInExperiment);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should not include user in experiment if random value exceeds target percentage', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        // Mock Math.random to return a value outside experiment range
        const originalMathRandom = Math.random;
        Math.random = () => 0.25; // 25% - should be outside 20% target for stable
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            // Should not create experiment
            const experiment = service.getExperiment();
            assert.strictEqual(experiment, undefined);
            // No telemetry should be sent
            assert.strictEqual(telemetryService.events.length, 0);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should assign correct experiment group based on cohort normalization', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        const testCases = [
            { random: 0.02, expectedGroup: 'control' }, // 2% -> 10% normalized -> first 25% of experiment
            { random: 0.07, expectedGroup: 'maximizedChat' }, // 7% -> 35% normalized -> second 25% of experiment
            { random: 0.12, expectedGroup: 'splitEmptyEditorChat' }, // 12% -> 60% normalized -> third 25% of experiment
            { random: 0.17, expectedGroup: 'splitWelcomeChat' } // 17% -> 85% normalized -> fourth 25% of experiment
        ];
        const originalMathRandom = Math.random;
        try {
            for (const testCase of testCases) {
                Math.random = () => testCase.random;
                storageService.remove('coreExperimentation.startup', -1 /* StorageScope.APPLICATION */);
                telemetryService.events = []; // Reset telemetry events
                const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
                const experiment = service.getExperiment();
                assert(experiment, `Experiment should be defined for random ${testCase.random}`);
                assert.strictEqual(experiment.experimentGroup, testCase.expectedGroup, `Expected group ${testCase.expectedGroup} for random ${testCase.random}, got ${experiment.experimentGroup}`);
            }
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should store experiment in storage when created', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // Ensure user is in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Check that experiment was stored
            const storedValue = storageService.get('coreExperimentation.startup', -1 /* StorageScope.APPLICATION */);
            assert(storedValue, 'Experiment should be stored');
            const storedExperiment = JSON.parse(storedValue);
            assert.strictEqual(storedExperiment.experimentGroup, experiment.experimentGroup);
            assert.strictEqual(storedExperiment.iteration, experiment.iteration);
            assert.strictEqual(storedExperiment.isInExperiment, experiment.isInExperiment);
            assert.strictEqual(storedExperiment.cohort, experiment.cohort);
            assert.strictEqual(storedExperiment.subCohort, experiment.subCohort);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should handle missing first session date by using current date', () => {
        // Don't set first session date - service should use current date
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // Ensure user would be in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined when first session date is missing');
            assert.strictEqual(telemetryService.events.length, 1);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should handle sub-cohort calculation correctly', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% cohort -> 50% normalized sub-cohort
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Verify sub-cohort calculation
            const expectedSubCohort = 0.1 / (20 / 100); // 0.1 / 0.2 = 0.5
            assert.strictEqual(experiment.subCohort, expectedSubCohort, 'Sub-cohort should be correctly normalized');
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUV4cGVyaW1lbnRhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvcmVFeHBlcmltZW50YXRpb24vdGVzdC9icm93c2VyL2NvcmVFeHBlcmltZW50YXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNHLE9BQU8sRUFBRSwwQkFBMEIsRUFBcUQsTUFBTSx1REFBdUQsQ0FBQztBQUV0SixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQVN0RixNQUFNLG9CQUFvQjtJQUExQjtRQUdRLFdBQU0sR0FBc0IsRUFBRSxDQUFDO1FBQ3RCLG1CQUFjLGdDQUF3QjtRQUN0QyxjQUFTLEdBQUcsY0FBYyxDQUFDO1FBQzNCLGNBQVMsR0FBRyxjQUFjLENBQUM7UUFDM0IsVUFBSyxHQUFHLFVBQVUsQ0FBQztRQUNuQixnQkFBVyxHQUFHLGFBQWEsQ0FBQztRQUM1QixxQkFBZ0IsR0FBRyxXQUFXLENBQUM7UUFDL0IsdUJBQWtCLEdBQUcsSUFBSSxDQUFDO0lBbUIzQyxDQUFDO0lBakJBLFVBQVUsQ0FBTyxTQUFpQixFQUFFLElBQVE7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFHLElBQXVCLElBQUksRUFBRSxFQUFF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