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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { IExtensionService } from '../../../../../services/extensions/common/extensions.js';
let NotebookKernelDetection = class NotebookKernelDetection extends Disposable {
    constructor(_notebookKernelService, _extensionService, _notebookLoggingService) {
        super();
        this._notebookKernelService = _notebookKernelService;
        this._extensionService = _extensionService;
        this._notebookLoggingService = _notebookLoggingService;
        this._detectionMap = new Map();
        this._localDisposableStore = this._register(new DisposableStore());
        this._registerListeners();
    }
    _registerListeners() {
        this._localDisposableStore.clear();
        this._localDisposableStore.add(this._extensionService.onWillActivateByEvent(e => {
            if (e.event.startsWith('onNotebook:')) {
                if (this._extensionService.activationEventIsDone(e.event)) {
                    return;
                }
                // parse the event to get the notebook type
                const notebookType = e.event.substring('onNotebook:'.length);
                if (notebookType === '*') {
                    // ignore
                    return;
                }
                let shouldStartDetection = false;
                const extensionStatus = this._extensionService.getExtensionsStatus();
                this._extensionService.extensions.forEach(extension => {
                    if (extensionStatus[extension.identifier.value].activationTimes) {
                        // already activated
                        return;
                    }
                    if (extension.activationEvents?.includes(e.event)) {
                        shouldStartDetection = true;
                    }
                });
                if (shouldStartDetection && !this._detectionMap.has(notebookType)) {
                    this._notebookLoggingService.debug('KernelDetection', `start extension activation for ${notebookType}`);
                    const task = this._notebookKernelService.registerNotebookKernelDetectionTask({
                        notebookType: notebookType
                    });
                    this._detectionMap.set(notebookType, task);
                }
            }
        }));
        let timer = null;
        this._localDisposableStore.add(this._extensionService.onDidChangeExtensionsStatus(() => {
            if (timer) {
                clearTimeout(timer);
            }
            // activation state might not be updated yet, postpone to next frame
            timer = setTimeout(() => {
                const taskToDelete = [];
                for (const [notebookType, task] of this._detectionMap) {
                    if (this._extensionService.activationEventIsDone(`onNotebook:${notebookType}`)) {
                        this._notebookLoggingService.debug('KernelDetection', `finish extension activation for ${notebookType}`);
                        taskToDelete.push(notebookType);
                        task.dispose();
                    }
                }
                taskToDelete.forEach(notebookType => {
                    this._detectionMap.delete(notebookType);
                });
            });
        }));
        this._localDisposableStore.add({
            dispose: () => {
                if (timer) {
                    clearTimeout(timer);
                }
            }
        });
    }
};
NotebookKernelDetection = __decorate([
    __param(0, INotebookKernelService),
    __param(1, IExtensionService),
    __param(2, INotebookLoggingService)
], NotebookKernelDetection);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookKernelDetection, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxEZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9rZXJuZWxEZXRlY3Rpb24vbm90ZWJvb2tLZXJuZWxEZXRlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEYsT0FBTyxFQUEyRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwSixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUc1RixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFJL0MsWUFDeUIsc0JBQStELEVBQ3BFLGlCQUFxRCxFQUMvQyx1QkFBaUU7UUFFMUYsS0FBSyxFQUFFLENBQUM7UUFKaUMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUNuRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzlCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFObkYsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUN0QywwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQVM5RSxJQUFJLENBQUMsa0JBQWtCLEVBQUUs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