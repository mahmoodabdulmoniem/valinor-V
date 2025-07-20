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
import { Event } from '../../../../base/common/event.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableValue, recomputeInitiallyAndOnChange } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import './colors.js';
import { DiffEditorItemTemplate } from './diffEditorItemTemplate.js';
import { MultiDiffEditorViewModel } from './multiDiffEditorViewModel.js';
import { MultiDiffEditorWidgetImpl } from './multiDiffEditorWidgetImpl.js';
let MultiDiffEditorWidget = class MultiDiffEditorWidget extends Disposable {
    constructor(_element, _workbenchUIElementFactory, _instantiationService) {
        super();
        this._element = _element;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._instantiationService = _instantiationService;
        this._dimension = observableValue(this, undefined);
        this._viewModel = observableValue(this, undefined);
        this._widgetImpl = derived(this, (reader) => {
            readHotReloadableExport(DiffEditorItemTemplate, reader);
            return reader.store.add(this._instantiationService.createInstance((readHotReloadableExport(MultiDiffEditorWidgetImpl, reader)), this._element, this._dimension, this._viewModel, this._workbenchUIElementFactory));
        });
        this._activeControl = derived(this, (reader) => this._widgetImpl.read(reader).activeControl.read(reader));
        this.onDidChangeActiveControl = Event.fromObservableLight(this._activeControl);
        this._register(recomputeInitiallyAndOnChange(this._widgetImpl));
    }
    reveal(resource, options) {
        this._widgetImpl.get().reveal(resource, options);
    }
    createViewModel(model) {
        return new MultiDiffEditorViewModel(model, this._instantiationService);
    }
    setViewModel(viewModel) {
        this._viewModel.set(viewModel, undefined);
    }
    layout(dimension) {
        this._dimension.set(dimension, undefined);
    }
    getActiveControl() {
        return this._activeControl.get();
    }
    getViewState() {
        return this._widgetImpl.get().getViewState();
    }
    setViewState(viewState) {
        this._widgetImpl.get().setViewState(viewState);
    }
    tryGetCodeEditor(resource) {
        return this._widgetImpl.get().tryGetCodeEditor(resource);
    }
    findDocumentDiffItem(resource) {
        return this._widgetImpl.get().findDocumentDiffItem(resource);
    }
};
MultiDiffEditorWidget = __decorate([
    __param(2, IInstantiationService)
], MultiDiffEditorWidget);
export { MultiDiffEditorWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbXVsdGlEaWZmRWRpdG9yL211bHRpRGlmZkVkaXRvcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFLbkcsT0FBTyxhQUFhLENBQUM7QUFDckIsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFtRCx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JILElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQWVwRCxZQUNrQixRQUFxQixFQUNyQiwwQkFBc0QsRUFDaEQscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSlMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQiwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTRCO1FBQy9CLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFqQnBFLGVBQVUsR0FBRyxlQUFlLENBQXdCLElBQUksRUFBRSxTQUFTLENBQUMsQ0FB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