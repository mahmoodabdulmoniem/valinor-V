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
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, transaction } from '../../../../../base/common/observable.js';
import { assertType } from '../../../../../base/common/types.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { SingleModelEditStackElement } from '../../../../../editor/common/model/editStack.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextFileService, isTextFileEditorModel, stringToSnapshot } from '../../../../services/textfile/common/textfiles.js';
import { IChatService } from '../../common/chatService.js';
import { ChatEditingCodeEditorIntegration } from './chatEditingCodeEditorIntegration.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingTextModelChangeService } from './chatEditingTextModelChangeService.js';
import { ChatEditingSnapshotTextModelContentProvider, ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
let ChatEditingModifiedDocumentEntry = class ChatEditingModifiedDocumentEntry extends AbstractChatEditingModifiedFileEntry {
    get changesCount() {
        return this._textModelChangeService.diffInfo.map(diff => diff.changes.length);
    }
    constructor(resourceRef, _multiDiffEntryDelegate, telemetryInfo, kind, initialContent, markerService, modelService, textModelService, languageService, configService, fileConfigService, chatService, _textFileService, fileService, undoRedoService, instantiationService) {
        super(resourceRef.object.textEditorModel.uri, telemetryInfo, kind, configService, fileConfigService, chatService, fileService, undoRedoService, instantiationService);
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this._textFileService = _textFileService;
        this._docFileEditorModel = this._register(resourceRef).object;
        this.modifiedModel = resourceRef.object.textEditorModel;
        this.originalURI = ChatEditingTextModelContentProvider.getFileURI(telemetryInfo.sessionId, this.entryId, this.modifiedURI.path);
        this.initialContent = initialContent ?? this.modifiedModel.getValue();
        const docSnapshot = this.originalModel = this._register(modelService.createModel(createTextBufferFactoryFromSnapshot(initialContent ? stringToSnapshot(initialContent) : this.modifiedModel.createSnapshot()), languageService.createById(this.modifiedModel.getLanguageId()), this.originalURI, false));
        this._textModelChangeService = this._register(instantiationService.createInstance(ChatEditingTextModelChangeService, this.originalModel, this.modifiedModel, this._stateObs));
        this._register(this._textModelChangeService.onDidAcceptOrRejectAllHunks(action => {
            this._stateObs.set(action, undefined);
            this._notifyAction(action === 1 /* ModifiedFileEntryState.Accepted */ ? 'accepted' : 'rejected');
        }));
        // Create a reference to this model to avoid it being disposed from under our nose
        (async () => {
            const reference = await textModelService.createModelReference(docSnapshot.uri);
            if (this._store.isDisposed) {
                reference.dispose();
                return;
            }
            this._register(reference);
        })();
        this._register(this._textModelChangeService.onDidUserEditModel(() => {
            this._userEditScheduler.schedule();
            const didResetToOriginalContent = this.modifiedModel.getValue() === this.initialContent;
            if (this._stateObs.get() === 0 /* ModifiedFileEntryState.Modified */ && didResetToOriginalContent) {
                this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, undefined);
            }
        }));
        const resourceFilter = this._register(new MutableDisposable());
        this._register(autorun(r => {
            const inProgress = this._waitsForLastEdits.read(r);
            if (inProgress) {
                const res = this._lastModifyingResponseObs.read(r);
                const req = res && res.session.getRequests().find(value => value.id === res.requestId);
                resourceFilter.value = markerService.installResourceFilter(this.modifiedURI, req?.message.text || localize('default', "Chat Edits"));
            }
            else {
                resourceFilter.clear();
            }
        }));
    }
    equalsSnapshot(snapshot) {
        return !!snapshot &&
            this.modifiedURI.toString() === snapshot.resource.toString() &&
            this.modifiedModel.getLanguageId() === snapshot.languageId &&
            this.originalModel.getValue() === snapshot.original &&
            this.modifiedModel.getValue() === snapshot.current &&
            this.state.get() === snapshot.state;
    }
    createSnapshot(requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: this.modifiedModel.getLanguageId(),
            snapshotUri: ChatEditingSnapshotTextModelContentProvider.getSnapshotFileURI(this._telemetryInfo.sessionId, requestId, undoStop, this.modifiedURI.path),
            original: this.originalModel.getValue(),
            current: this.modifiedModel.getValue(),
            state: this.state.get(),
            telemetryInfo: this._telemetryInfo
        };
    }
    async restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this._stateObs.set(snapshot.state, undefined);
        await this._textModelChangeService.resetDocumentValues(snapshot.original, restoreToDisk ? snapshot.current : undefined);
    }
    async resetToInitialContent() {
        await this._textModelChangeService.resetDocumentValues(undefined, this.initialContent);
    }
    async _areOriginalAndModifiedIdentical() {
        return this._textModelChangeService.areOriginalAndModifiedIdentical();
    }
    _resetEditsState(tx) {
        super._resetEditsState(tx);
        this._textModelChangeService.clearCurrentEditLineDecoration();
    }
    _createUndoRedoElement(response) {
        const request = response.session.getRequests().find(req => req.id === response.requestId);
        const label = request?.message.text ? localize('chatEditing1', "Chat Edit: '{0}'", request.message.text) : localize('chatEditing2', "Chat Edit");
        return new SingleModelEditStackElement(label, 'chat.edit', this.modifiedModel, null);
    }
    async acceptAgentEdits(resource, textEdits, isLastEdits, responseModel) {
        const result = await this._textModelChangeService.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
        transaction((tx) => {
            this._waitsForLastEdits.set(!isLastEdits, tx);
            this._stateObs.set(0 /* ModifiedFileEntryState.Modified */, tx);
            if (!isLastEdits) {
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                this._rewriteRatioObs.set(result.rewriteRatio, tx);
            }
            else {
                this._resetEditsState(tx);
                this._rewriteRatioObs.set(1, tx);
            }
        });
        if (isLastEdits) {
            await this._textFileService.save(this.modifiedModel.uri, {
                reason: 2 /* SaveReason.AUTO */,
                skipSaveParticipants: true,
            });
        }
    }
    async _doAccept() {
        this._textModelChangeService.keep();
        this._multiDiffEntryDelegate.collapse(undefined);
        const config = this._fileConfigService.getAutoSaveConfiguration(this.modifiedURI);
        if (!config.autoSave || !this._textFileService.isDirty(this.modifiedURI)) {
            // SAVE after accept for manual-savers, for auto-savers
            // trigger explict save to get save participants going
            try {
                await this._textFileService.save(this.modifiedURI, {
                    reason: 1 /* SaveReason.EXPLICIT */,
                    force: true,
                    ignoreErrorHandler: true
                });
            }
            catch {
                // ignored
            }
        }
    }
    async _doReject() {
        if (this.createdInRequestId === this._telemetryInfo.requestId) {
            if (isTextFileEditorModel(this._docFileEditorModel)) {
                await this._docFileEditorModel.revert({ soft: true });
                await this._fileService.del(this.modifiedURI);
            }
            this._onDidDelete.fire();
        }
        else {
            this._textModelChangeService.undo();
            if (this._textModelChangeService.allEditsAreFromUs && isTextFileEditorModel(this._docFileEditorModel)) {
                // save the file after discarding so that the dirty indicator goes away
                // and so that an intermediate saved state gets reverted
                await this._docFileEditorModel.save({ reason: 1 /* SaveReason.EXPLICIT */, skipSaveParticipants: true });
            }
            this._multiDiffEntryDelegate.collapse(undefined);
        }
    }
    _createEditorIntegration(editor) {
        const codeEditor = getCodeEditor(editor.getControl());
        assertType(codeEditor);
        const diffInfo = this._textModelChangeService.diffInfo;
        return this._instantiationService.createInstance(ChatEditingCodeEditorIntegration, this, codeEditor, diffInfo, false);
    }
};
ChatEditingModifiedDocumentEntry = __decorate([
    __param(5, IMarkerService),
    __param(6, IModelService),
    __param(7, ITextModelService),
    __param(8, ILanguageService),
    __param(9, IConfigurationService),
    __param(10, IFilesConfigurationService),
    __param(11, IChatService),
    __param(12, ITextFileService),
    __param(13, IFileService),
    __param(14, IUndoRedoService),
    __param(15, IInstantiationService)
], ChatEditingModifiedDocumentEntry);
export { ChatEditingModifiedDocumentEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZERvY3VtZW50RW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ01vZGlmaWVkRG9jdW1lbnRFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWMsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RixPQUFPLEVBQWdCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM5RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQTRCLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDdkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1E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