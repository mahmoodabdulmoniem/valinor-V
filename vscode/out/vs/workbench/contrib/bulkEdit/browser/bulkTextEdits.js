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
import { dispose } from '../../../../base/common/lifecycle.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { SingleModelEditStackElement, MultiModelEditStackElement } from '../../../../editor/common/model/editStack.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SnippetParser } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
class ModelEditTask {
    constructor(_modelReference) {
        this._modelReference = _modelReference;
        this.model = this._modelReference.object.textEditorModel;
        this._edits = [];
    }
    dispose() {
        this._modelReference.dispose();
    }
    isNoOp() {
        if (this._edits.length > 0) {
            // contains textual edits
            return false;
        }
        if (this._newEol !== undefined && this._newEol !== this.model.getEndOfLineSequence()) {
            // contains an eol change that is a real change
            return false;
        }
        return true;
    }
    addEdit(resourceEdit) {
        this._expectedModelVersionId = resourceEdit.versionId;
        const { textEdit } = resourceEdit;
        if (typeof textEdit.eol === 'number') {
            // honor eol-change
            this._newEol = textEdit.eol;
        }
        if (!textEdit.range && !textEdit.text) {
            // lacks both a range and the text
            return;
        }
        if (Range.isEmpty(textEdit.range) && !textEdit.text) {
            // no-op edit (replace empty range with empty text)
            return;
        }
        // create edit operation
        let range;
        if (!textEdit.range) {
            range = this.model.getFullModelRange();
        }
        else {
            range = Range.lift(textEdit.range);
        }
        this._edits.push({ ...EditOperation.replaceMove(range, textEdit.text), insertAsSnippet: textEdit.insertAsSnippet, keepWhitespace: textEdit.keepWhitespace });
    }
    validate() {
        if (typeof this._expectedModelVersionId === 'undefined' || this.model.getVersionId() === this._expectedModelVersionId) {
            return { canApply: true };
        }
        return { canApply: false, reason: this.model.uri };
    }
    getBeforeCursorState() {
        return null;
    }
    apply(reason) {
        if (this._edits.length > 0) {
            this._edits = this._edits
                .map(this._transformSnippetStringToInsertText, this) // no editor -> no snippet mode
                .sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
            this.model.pushEditOperations(null, this._edits, () => null, undefined, reason);
        }
        if (this._newEol !== undefined) {
            this.model.pushEOL(this._newEol);
        }
    }
    _transformSnippetStringToInsertText(edit) {
        // transform a snippet edit (and only those) into a normal text edit
        // for that we need to parse the snippet and get its actual text, e.g without placeholder
        // or variable syntaxes
        if (!edit.insertAsSnippet) {
            return edit;
        }
        if (!edit.text) {
            return edit;
        }
        const text = SnippetParser.asInsertText(edit.text);
        return { ...edit, insertAsSnippet: false, text };
    }
}
class EditorEditTask extends ModelEditTask {
    constructor(modelReference, editor) {
        super(modelReference);
        this._editor = editor;
    }
    getBeforeCursorState() {
        return this._canUseEditor() ? this._editor.getSelections() : null;
    }
    apply(reason) {
        // Check that the editor is still for the wanted model. It might have changed in the
        // meantime and that means we cannot use the editor anymore (instead we perform the edit through the model)
        if (!this._canUseEditor()) {
            super.apply();
            return;
        }
        if (this._edits.length > 0) {
            const snippetCtrl = SnippetController2.get(this._editor);
            if (snippetCtrl && this._edits.some(edit => edit.insertAsSnippet)) {
                // some edit is a snippet edit -> use snippet controller and ISnippetEdits
                const snippetEdits = [];
                for (const edit of this._edits) {
                    if (edit.range && edit.text !== null) {
                        snippetEdits.push({
                            range: Range.lift(edit.range),
                            template: edit.insertAsSnippet ? edit.text : SnippetParser.escape(edit.text),
                            keepWhitespace: edit.keepWhitespace
                        });
                    }
                }
                snippetCtrl.apply(snippetEdits, { undoStopBefore: false, undoStopAfter: false });
            }
            else {
                // normal edit
                this._edits = this._edits
                    .map(this._transformSnippetStringToInsertText, this) // mixed edits (snippet and normal) -> no snippet mode
                    .sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
                this._editor.executeEdits(reason, this._edits);
            }
        }
        if (this._newEol !== undefined) {
            if (this._editor.hasModel()) {
                this._editor.getModel().pushEOL(this._newEol);
            }
        }
    }
    _canUseEditor() {
        return this._editor?.getModel()?.uri.toString() === this.model.uri.toString();
    }
}
let BulkTextEdits = class BulkTextEdits {
    constructor(_label, _code, _editor, _undoRedoGroup, _undoRedoSource, _progress, _token, edits, _editorWorker, _modelService, _textModelResolverService, _undoRedoService) {
        this._label = _label;
        this._code = _code;
        this._editor = _editor;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._progress = _progress;
        this._token = _token;
        this._editorWorker = _editorWorker;
        this._modelService = _modelService;
        this._textModelResolverService = _textModelResolverService;
        this._undoRedoService = _undoRedoService;
        this._edits = new ResourceMap();
        for (const edit of edits) {
            let array = this._edits.get(edit.resource);
            if (!array) {
                array = [];
                this._edits.set(edit.resource, array);
            }
            array.push(edit);
        }
    }
    _validateBeforePrepare() {
        // First check if loaded models were not changed in the meantime
        for (const array of this._edits.values()) {
            for (const edit of array) {
                if (typeof edit.versionId === 'number') {
                    const model = this._modelService.getModel(edit.resource);
                    if (model && model.getVersionId() !== edit.versionId) {
                        // model changed in the meantime
                        throw new Error(`${model.uri.toString()} has changed in the meantime`);
                    }
                }
            }
        }
    }
    async _createEditsTasks() {
        const tasks = [];
        const promises = [];
        for (const [key, edits] of this._edits) {
            const promise = this._textModelResolverService.createModelReference(key).then(async (ref) => {
                let task;
                let makeMinimal = false;
                if (this._editor?.getModel()?.uri.toString() === ref.object.textEditorModel.uri.toString()) {
                    task = new EditorEditTask(ref, this._editor);
                    makeMinimal = true;
                }
                else {
                    task = new ModelEditTask(ref);
                }
                tasks.push(task);
                if (!makeMinimal) {
                    edits.forEach(task.addEdit, task);
                    return;
                }
                // group edits by type (snippet, metadata, or simple) and make simple groups more minimal
                const makeGroupMoreMinimal = async (start, end) => {
                    const oldEdits = edits.slice(start, end);
                    const newEdits = await this._editorWorker.computeMoreMinimalEdits(ref.object.textEditorModel.uri, oldEdits.map(e => e.textEdit), false);
                    if (!newEdits) {
                        oldEdits.forEach(task.addEdit, task);
                    }
                    else {
                        newEdits.forEach(edit => task.addEdit(new ResourceTextEdit(ref.object.textEditorModel.uri, edit, undefined, undefined)));
                    }
                };
                let start = 0;
                let i = 0;
                for (; i < edits.length; i++) {
                    if (edits[i].textEdit.insertAsSnippet || edits[i].metadata) {
                        await makeGroupMoreMinimal(start, i); // grouped edits until now
                        task.addEdit(edits[i]); // this edit
                        start = i + 1;
                    }
                }
                await makeGroupMoreMinimal(start, i);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        return tasks;
    }
    _validateTasks(tasks) {
        for (const task of tasks) {
            const result = task.validate();
            if (!result.canApply) {
                return result;
            }
        }
        return { canApply: true };
    }
    async apply(reason) {
        this._validateBeforePrepare();
        const tasks = await this._createEditsTasks();
        try {
            if (this._token.isCancellationRequested) {
                return [];
            }
            const resources = [];
            const validation = this._validateTasks(tasks);
            if (!validation.canApply) {
                throw new Error(`${validation.reason.toString()} has changed in the meantime`);
            }
            if (tasks.length === 1) {
                // This edit touches a single model => keep things simple
                const task = tasks[0];
                if (!task.isNoOp()) {
                    const singleModelEditStackElement = new SingleModelEditStackElement(this._label, this._code, task.model, task.getBeforeCursorState());
                    this._undoRedoService.pushElement(singleModelEditStackElement, this._undoRedoGroup, this._undoRedoSource);
                    task.apply(reason);
                    singleModelEditStackElement.close();
                    resources.push(task.model.uri);
                }
                this._progress.report(undefined);
            }
            else {
                // prepare multi model undo element
                const multiModelEditStackElement = new MultiModelEditStackElement(this._label, this._code, tasks.map(t => new SingleModelEditStackElement(this._label, this._code, t.model, t.getBeforeCursorState())));
                this._undoRedoService.pushElement(multiModelEditStackElement, this._undoRedoGroup, this._undoRedoSource);
                for (const task of tasks) {
                    task.apply();
                    this._progress.report(undefined);
                    resources.push(task.model.uri);
                }
                multiModelEditStackElement.close();
            }
            return resources;
        }
        finally {
            dispose(tasks);
        }
    }
};
BulkTextEdits = __decorate([
    __param(8, IEditorWorkerService),
    __param(9, IModelService),
    __param(10, ITextModelService),
    __param(11, IUndoRedoService)
], BulkTextEdits);
export { BulkTextEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa1RleHRFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9idWxrVGV4dEVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQTJCLE1BQU0sc0NBQXNDLENBQUM7QUFHeEYsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxpREFBaUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHaEUsT0FBTyxFQUFFLGlCQUFpQixFQUE0QixNQUFNLHVEQUF1RCxDQUFDO0FBRXBILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBaUMsTUFBTSxrREFBa0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN2SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQVE1RixNQUFNLGFBQWE7SUFRbEIsWUFBNkIsZUFBcUQ7UUFBckQsb0JBQWUsR0FBZixlQUFlLENBQXNDO1FBQ2pGLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsZUFBZSxD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