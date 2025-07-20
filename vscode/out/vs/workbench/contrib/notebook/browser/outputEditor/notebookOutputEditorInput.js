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
var NotebookOutputEditorInput_1;
import * as nls from '../../../../../nls.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { isEqual } from '../../../../../base/common/resources.js';
class ResolvedNotebookOutputEditorInputModel {
    constructor(resolvedNotebookEditorModel, notebookUri, cell, outputId) {
        this.resolvedNotebookEditorModel = resolvedNotebookEditorModel;
        this.notebookUri = notebookUri;
        this.cell = cell;
        this.outputId = outputId;
    }
    dispose() {
        this.resolvedNotebookEditorModel.dispose();
    }
}
// TODO @Yoyokrazy -- future feat. for viewing static outputs -- encode mime + data
// export class NotebookOutputViewerInput extends EditorInput {
// 	static readonly ID: string = 'workbench.input.notebookOutputViewerInput';
// }
let NotebookOutputEditorInput = class NotebookOutputEditorInput extends EditorInput {
    static { NotebookOutputEditorInput_1 = this; }
    static { this.ID = 'workbench.input.notebookOutputEditorInput'; }
    constructor(notebookUri, cellIndex, outputId, outputIndex, notebookEditorModelResolverService) {
        super();
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
        this._notebookUri = notebookUri;
        this.cellUri = undefined;
        this.cellIndex = cellIndex;
        this.outputId = outputId;
        this.outputIndex = outputIndex;
    }
    get typeId() {
        return NotebookOutputEditorInput_1.ID;
    }
    async resolve() {
        if (!this._notebookRef) {
            this._notebookRef = await this.notebookEditorModelResolverService.resolve(this._notebookUri);
        }
        const cell = this._notebookRef.object.notebook.cells[this.cellIndex];
        if (!cell) {
            throw new Error('Cell not found');
        }
        this.cellUri = cell.uri;
        const resolvedOutputId = cell.outputs[this.outputIndex]?.outputId;
        if (!resolvedOutputId) {
            throw new Error('Output not found');
        }
        if (!this.outputId) {
            this.outputId = resolvedOutputId;
        }
        return new ResolvedNotebookOutputEditorInputModel(this._notebookRef.object, this._notebookUri, cell, resolvedOutputId);
    }
    getSerializedData() {
        // need to translate from uris -> current indexes
        // uris aren't deterministic across reloads, so indices are best option
        if (!this._notebookRef) {
            return;
        }
        const cellIndex = this._notebookRef.object.notebook.cells.findIndex(c => isEqual(c.uri, this.cellUri));
        const cell = this._notebookRef.object.notebook.cells[cellIndex];
        if (!cell) {
            return;
        }
        const outputIndex = cell.outputs.findIndex(o => o.outputId === this.outputId);
        if (outputIndex === -1) {
            return;
        }
        return {
            notebookUri: this._notebookUri,
            cellIndex: cellIndex,
            outputIndex: outputIndex,
        };
    }
    getName() {
        return nls.localize('notebookOutputEditorInput', "Notebook Output Preview");
    }
    get editorId() {
        return 'notebookOutputEditor';
    }
    get resource() {
        return;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */;
    }
    dispose() {
        super.dispose();
    }
};
NotebookOutputEditorInput = NotebookOutputEditorInput_1 = __decorate([
    __param(4, INotebookEditorModelResolverService)
], NotebookOutputEditorInput);
export { NotebookOutputEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRwdXRFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9vdXRwdXRFZGl0b3Ivbm90ZWJvb2tPdXRwdXRFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUk3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdkUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSWxFLE1BQU0sc0NBQXNDO0lBQzNDLFlBQ1UsMkJBQXlELEVBQ3pELFdBQWdCLEVBQ2hCLElBQTJCLEVBQzNCLFFBQWdCO1FBSGhCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7UUFDekQsZ0JBQVcsR0FBWCxXQUFXLENBQUs7UUFDaEIsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFDM0IsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUN0QixDQUFDO0lBRUwsT0FBTztRQUNOLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0NBQ0Q7QUFFRCxtRkFBbUY7QUFDbkYsK0RBQStEO0FBQy9ELDZFQUE2RTtBQUM3RSxJQUFJO0FBRUcsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxXQUFXOzthQUN6QyxPQUFFLEdBQVcsMkNBQTJDLEFBQXRELENBQXVEO0lBWXpFLFlBQ0MsV0FBZ0IsRUFDaEIsU0FBaUIsRUFDakIsUUFBNEIsRUFDNUIsV0FBbUIsRUFDbUMsa0NBQXVFO1FB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