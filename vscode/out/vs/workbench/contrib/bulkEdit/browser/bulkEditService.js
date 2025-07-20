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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { IBulkEditService, ResourceFileEdit, ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UndoRedoGroup } from '../../../../platform/undoRedo/common/undoRedo.js';
import { BulkCellEdits, ResourceNotebookCellEdit } from './bulkCellEdits.js';
import { BulkFileEdits } from './bulkFileEdits.js';
import { BulkTextEdits } from './bulkTextEdits.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { OpaqueEdits, ResourceAttachmentEdit } from './opaqueEdits.js';
import { isMacintosh } from '../../../../base/common/platform.js';
function liftEdits(edits) {
    return edits.map(edit => {
        if (ResourceTextEdit.is(edit)) {
            return ResourceTextEdit.lift(edit);
        }
        if (ResourceFileEdit.is(edit)) {
            return ResourceFileEdit.lift(edit);
        }
        if (ResourceNotebookCellEdit.is(edit)) {
            return ResourceNotebookCellEdit.lift(edit);
        }
        if (ResourceAttachmentEdit.is(edit)) {
            return ResourceAttachmentEdit.lift(edit);
        }
        throw new Error('Unsupported edit');
    });
}
let BulkEdit = class BulkEdit {
    constructor(_label, _code, _editor, _progress, _token, _edits, _undoRedoGroup, _undoRedoSource, _confirmBeforeUndo, _instaService, _logService) {
        this._label = _label;
        this._code = _code;
        this._editor = _editor;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._confirmBeforeUndo = _confirmBeforeUndo;
        this._instaService = _instaService;
        this._logService = _logService;
    }
    ariaMessage() {
        const otherResources = new ResourceMap();
        const textEditResources = new ResourceMap();
        let textEditCount = 0;
        for (const edit of this._edits) {
            if (edit instanceof ResourceTextEdit) {
                textEditCount += 1;
                textEditResources.set(edit.resource, true);
            }
            else if (edit instanceof ResourceFileEdit) {
                otherResources.set(edit.oldResource ?? edit.newResource, true);
            }
        }
        if (this._edits.length === 0) {
            return localize('summary.0', "Made no edits");
        }
        else if (otherResources.size === 0) {
            if (textEditCount > 1 && textEditResources.size > 1) {
                return localize('summary.nm', "Made {0} text edits in {1} files", textEditCount, textEditResources.size);
            }
            else {
                return localize('summary.n0', "Made {0} text edits in one file", textEditCount);
            }
        }
        else {
            return localize('summary.textFiles', "Made {0} text edits in {1} files, also created or deleted {2} files", textEditCount, textEditResources.size, otherResources.size);
        }
    }
    async perform(reason) {
        if (this._edits.length === 0) {
            return [];
        }
        const ranges = [1];
        for (let i = 1; i < this._edits.length; i++) {
            if (Object.getPrototypeOf(this._edits[i - 1]) === Object.getPrototypeOf(this._edits[i])) {
                ranges[ranges.length - 1]++;
            }
            else {
                ranges.push(1);
            }
        }
        // Show infinte progress when there is only 1 item since we do not know how long it takes
        const increment = this._edits.length > 1 ? 0 : undefined;
        this._progress.report({ increment, total: 100 });
        // Increment by percentage points since progress API expects that
        const progress = { report: _ => this._progress.report({ increment: 100 / this._edits.length }) };
        const resources = [];
        let index = 0;
        for (const range of ranges) {
            if (this._token.isCancellationRequested) {
                break;
            }
            const group = this._edits.slice(index, index + range);
            if (group[0] instanceof ResourceFileEdit) {
                resources.push(await this._performFileEdits(group, this._undoRedoGroup, this._undoRedoSource, this._confirmBeforeUndo, progress));
            }
            else if (group[0] instanceof ResourceTextEdit) {
                resources.push(await this._performTextEdits(group, this._undoRedoGroup, this._undoRedoSource, progress, reason));
            }
            else if (group[0] instanceof ResourceNotebookCellEdit) {
                resources.push(await this._performCellEdits(group, this._undoRedoGroup, this._undoRedoSource, progress));
            }
            else if (group[0] instanceof ResourceAttachmentEdit) {
                resources.push(await this._performOpaqueEdits(group, this._undoRedoGroup, this._undoRedoSource, progress));
            }
            else {
                console.log('UNKNOWN EDIT');
            }
            index = index + range;
        }
        return resources.flat();
    }
    async _performFileEdits(edits, undoRedoGroup, undoRedoSource, confirmBeforeUndo, progress) {
        this._logService.debug('_performFileEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkFileEdits, this._label || localize('workspaceEdit', "Workspace Edit"), this._code || 'undoredo.workspaceEdit', undoRedoGroup, undoRedoSource, confirmBeforeUndo, progress, this._token, edits);
        return await model.apply();
    }
    async _performTextEdits(edits, undoRedoGroup, undoRedoSource, progress, reason) {
        this._logService.debug('_performTextEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkTextEdits, this._label || localize('workspaceEdit', "Workspace Edit"), this._code || 'undoredo.workspaceEdit', this._editor, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply(reason);
    }
    async _performCellEdits(edits, undoRedoGroup, undoRedoSource, progress) {
        this._logService.debug('_performCellEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(BulkCellEdits, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply();
    }
    async _performOpaqueEdits(edits, undoRedoGroup, undoRedoSource, progress) {
        this._logService.debug('_performOpaqueEdits', JSON.stringify(edits));
        const model = this._instaService.createInstance(OpaqueEdits, undoRedoGroup, undoRedoSource, progress, this._token, edits);
        return await model.apply();
    }
};
BulkEdit = __decorate([
    __param(9, IInstantiationService),
    __param(10, ILogService)
], BulkEdit);
let BulkEditService = class BulkEditService {
    constructor(_instaService, _logService, _editorService, _lifecycleService, _dialogService, _workingCopyService, _configService) {
        this._instaService = _instaService;
        this._logService = _logService;
        this._editorService = _editorService;
        this._lifecycleService = _lifecycleService;
        this._dialogService = _dialogService;
        this._workingCopyService = _workingCopyService;
        this._configService = _configService;
        this._activeUndoRedoGroups = new LinkedList();
    }
    setPreviewHandler(handler) {
        this._previewHandler = handler;
        return toDisposable(() => {
            if (this._previewHandler === handler) {
                this._previewHandler = undefined;
            }
        });
    }
    hasPreviewHandler() {
        return Boolean(this._previewHandler);
    }
    async apply(editsIn, options) {
        let edits = liftEdits(Array.isArray(editsIn) ? editsIn : editsIn.edits);
        if (edits.length === 0) {
            return { ariaSummary: localize('nothing', "Made no edits"), isApplied: false };
        }
        if (this._previewHandler && (options?.showPreview || edits.some(value => value.metadata?.needsConfirmation))) {
            edits = await this._previewHandler(edits, options);
        }
        let codeEditor = options?.editor;
        // try to find code editor
        if (!codeEditor) {
            const candidate = this._editorService.activeTextEditorControl;
            if (isCodeEditor(candidate)) {
                codeEditor = candidate;
            }
            else if (isDiffEditor(candidate)) {
                codeEditor = candidate.getModifiedEditor();
            }
        }
        if (codeEditor && codeEditor.getOption(103 /* EditorOption.readOnly */)) {
            // If the code editor is readonly still allow bulk edits to be applied #68549
            codeEditor = undefined;
        }
        // undo-redo-group: if a group id is passed then try to find it
        // in the list of active edits. otherwise (or when not found)
        // create a separate undo-redo-group
        let undoRedoGroup;
        let undoRedoGroupRemove = () => { };
        if (typeof options?.undoRedoGroupId === 'number') {
            for (const candidate of this._activeUndoRedoGroups) {
                if (candidate.id === options.undoRedoGroupId) {
                    undoRedoGroup = candidate;
                    break;
                }
            }
        }
        if (!undoRedoGroup) {
            undoRedoGroup = new UndoRedoGroup();
            undoRedoGroupRemove = this._activeUndoRedoGroups.push(undoRedoGroup);
        }
        const label = options?.quotableLabel || options?.label;
        const bulkEdit = this._instaService.createInstance(BulkEdit, label, options?.code, codeEditor, options?.progress ?? Progress.None, options?.token ?? CancellationToken.None, edits, undoRedoGroup, options?.undoRedoSource, !!options?.confirmBeforeUndo);
        let listener;
        try {
            listener = this._lifecycleService.onBeforeShutdown(e => e.veto(this._shouldVeto(label, e.reason), 'veto.blukEditService'));
            const resources = await bulkEdit.perform(options?.reason);
            // when enabled (option AND setting) loop over all dirty working copies and trigger save
            // for those that were involved in this bulk edit operation.
            if (options?.respectAutoSaveConfig && this._configService.getValue(autoSaveSetting) === true && resources.length > 1) {
                await this._saveAll(resources);
            }
            return { ariaSummary: bulkEdit.ariaMessage(), isApplied: edits.length > 0 };
        }
        catch (err) {
            // console.log('apply FAILED');
            // console.log(err);
            this._logService.error(err);
            throw err;
        }
        finally {
            listener?.dispose();
            undoRedoGroupRemove();
        }
    }
    async _saveAll(resources) {
        const set = new ResourceSet(resources);
        const saves = this._workingCopyService.dirtyWorkingCopies.map(async (copy) => {
            if (set.has(copy.resource)) {
                await copy.save();
            }
        });
        const result = await Promise.allSettled(saves);
        for (const item of result) {
            if (item.status === 'rejected') {
                this._logService.warn(item.reason);
            }
        }
    }
    async _shouldVeto(label, reason) {
        let message;
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                message = localize('closeTheWindow.message', "Are you sure you want to close the window?");
                break;
            case 4 /* ShutdownReason.LOAD */:
                message = localize('changeWorkspace.message', "Are you sure you want to change the workspace?");
                break;
            case 3 /* ShutdownReason.RELOAD */:
                message = localize('reloadTheWindow.message', "Are you sure you want to reload the window?");
                break;
            default:
                message = isMacintosh ? localize('quitMessageMac', "Are you sure you want to quit?") : localize('quitMessage', "Are you sure you want to exit?");
                break;
        }
        const result = await this._dialogService.confirm({
            message,
            detail: localize('areYouSureQuiteBulkEdit.detail', "'{0}' is in progress.", label || localize('fileOperation', "File operation")),
        });
        return !result.confirmed;
    }
};
BulkEditService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService),
    __param(2, IEditorService),
    __param(3, ILifecycleService),
    __param(4, IDialogService),
    __param(5, IWorkingCopyService),
    __param(6, IConfigurationService)
], BulkEditService);
export { BulkEditService };
registerSingleton(IBulkEditService, BulkEditService, 1 /* InstantiationType.Delayed */);
const autoSaveSetting = 'files.refactoring.autoSave';
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'files',
    properties: {
        [autoSaveSetting]: {
            description: localize('refactoring.autoSave', "Controls if files that were part of a refactoring are saved automatically"),
            default: true,
            type: 'boolean'
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC9icm93c2VyL2J1bGtFZGl0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUUsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQThELGdCQUFnQixFQUFnQixnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBR3hNLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBNEIsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFD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