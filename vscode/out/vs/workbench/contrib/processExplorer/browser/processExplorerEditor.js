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
var ProcessExplorerEditor_1;
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { BrowserProcessExplorerControl } from './processExplorerControl.js';
let ProcessExplorerEditor = class ProcessExplorerEditor extends EditorPane {
    static { ProcessExplorerEditor_1 = this; }
    static { this.ID = 'workbench.editor.processExplorer'; }
    constructor(group, telemetryService, themeService, storageService, instantiationService) {
        super(ProcessExplorerEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.processExplorerControl = undefined;
    }
    createEditor(parent) {
        this.processExplorerControl = this._register(this.instantiationService.createInstance(BrowserProcessExplorerControl, parent));
    }
    focus() {
        this.processExplorerControl?.focus();
    }
    layout(dimension) {
        this.processExplorerControl?.layout(dimension);
    }
};
ProcessExplorerEditor = ProcessExplorerEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService)
], ProcessExplorerEditor);
export { ProcessExplorerEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcm9jZXNzRXhwbG9yZXIvYnJvd3Nlci9wcm9jZXNzRXhwbG9yZXJFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSw2QkFBNkIsRUFBMEIsTUFBTSw2QkFBNkIsQ0FBQztBQUU3RixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7O2FBRXBDLE9BQUUsR0FBVyxrQ0FBa0MsQUFBN0MsQ0FBOEM7SUFJaEUsWUFDQyxLQUFtQixFQUNBLGdCQUFtQyxFQUN2QyxZQUEyQixFQUN6QixjQUErQixFQUN6QixvQkFBOEQ7UUFFckYsS0FBSyxDQUFDLHVCQUFxQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRjdDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFQNUUsMkJBQXNCLEdBQXVDLFNBQVMsQ0FBQztJQVVqRixDQUFDO0lBRWtCLFlBQVksQ0FBQyxNQUFtQjtRQUNsRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDL0gsQ0FBQztJQUVRLEtBQUs7UUFDYixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUVRLE1BQU0sQ0FBQyxTQUFvQjtRQUNuQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7O0FBMUJXLHFCQUFxQjtJQVEvQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0dBWFgscUJBQXFCLENBMkJqQyJ9