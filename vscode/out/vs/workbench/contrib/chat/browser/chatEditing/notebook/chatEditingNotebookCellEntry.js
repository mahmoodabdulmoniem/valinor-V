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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { observableValue, transaction } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CellEditState } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { CellKind } from '../../../../notebook/common/notebookCommon.js';
import { ChatEditingTextModelChangeService } from '../chatEditingTextModelChangeService.js';
/**
 * This is very closely similar to the ChatEditingModifiedDocumentEntry class.
 * Most of the code has been borrowed from there, as a cell is effectively a document.
 * Hence most of the same functionality applies.
 */
let ChatEditingNotebookCellEntry = class ChatEditingNotebookCellEntry extends Disposable {
    get isDisposed() {
        return this._store.isDisposed;
    }
    get isEditFromUs() {
        return this._textModelChangeService.isEditFromUs;
    }
    get allEditsAreFromUs() {
        return this._textModelChangeService.allEditsAreFromUs;
    }
    get diffInfo() {
        return this._textModelChangeService.diffInfo;
    }
    constructor(notebookUri, cell, modifiedModel, originalModel, disposables, notebookEditorService, instantiationService) {
        super();
        this.notebookUri = notebookUri;
        this.cell = cell;
        this.modifiedModel = modifiedModel;
        this.originalModel = originalModel;
        this.notebookEditorService = notebookEditorService;
        this.instantiationService = instantiationService;
        this._maxModifiedLineNumber = observableValue(this, 0);
        this.maxModifiedLineNumber = this._maxModifiedLineNumber;
        this._stateObs = observableValue(this, 0 /* ModifiedFileEntryState.Modified */);
        this.state = this._stateObs;
        this.initialContent = this.originalModel.getValue();
        this._register(disposables);
        this._textModelChangeService = this._register(this.instantiationService.createInstance(ChatEditingTextModelChangeService, this.originalModel, this.modifiedModel, this.state));
        this._register(this._textModelChangeService.onDidAcceptOrRejectAllHunks(action => {
            this.revertMarkdownPreviewState();
            this._stateObs.set(action, undefined);
        }));
        this._register(this._textModelChangeService.onDidUserEditModel(() => {
            const didResetToOriginalContent = this.modifiedModel.getValue() === this.initialContent;
            if (this._stateObs.get() === 0 /* ModifiedFileEntryState.Modified */ && didResetToOriginalContent) {
                this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, undefined);
            }
        }));
    }
    clearCurrentEditLineDecoration() {
        if (this.modifiedModel.isDisposed()) {
            return;
        }
        this._textModelChangeService.clearCurrentEditLineDecoration();
    }
    async acceptAgentEdits(textEdits, isLastEdits, responseModel) {
        const { maxLineNumber } = await this._textModelChangeService.acceptAgentEdits(this.modifiedModel.uri, textEdits, isLastEdits, responseModel);
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* ModifiedFileEntryState.Modified */, tx);
                this._maxModifiedLineNumber.set(maxLineNumber, tx);
            }
            else {
                this._maxModifiedLineNumber.set(0, tx);
            }
        });
    }
    revertMarkdownPreviewState() {
        if (this.cell.cellKind !== CellKind.Markup) {
            return;
        }
        const notebookEditor = this.notebookEditorService.retrieveExistingWidgetFromURI(this.notebookUri)?.value;
        if (notebookEditor) {
            const vm = notebookEditor.getCellByHandle(this.cell.handle);
            if (vm?.getEditState() === CellEditState.Editing &&
                (vm.editStateSource === 'chatEdit' || vm.editStateSource === 'chatEditNavigation')) {
                vm?.updateEditState(CellEditState.Preview, 'chatEdit');
            }
        }
    }
    async keep(change) {
        return this._textModelChangeService.diffInfo.get().keep(change);
    }
    async undo(change) {
        return this._textModelChangeService.diffInfo.get().undo(change);
    }
};
ChatEditingNotebookCellEntry = __decorate([
    __param(5, INotebookEditorService),
    __param(6, IInstantiationService)
], ChatEditingNotebookCellEntry);
export { ChatEditingNotebookCellEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0NlbGxFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tDZWxsRW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RixPQUFPLEVBQWUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBTXhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUV4RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHekUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHNUY7Ozs7R0FJRztBQUNJLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTtJQUMzRCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUMvQixDQUFDO0lBRUQsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQztJQUNsRCxDQUFDO0lBRUQsSUFBVyxpQkFBaUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUM7SUFDdkQsQ0FBQztJQUNELElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FB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