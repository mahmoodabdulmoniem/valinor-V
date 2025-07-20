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
var ChatEditingModifiedNotebookEntry_1;
import { streamToBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { observableValue, autorun, transaction, ObservablePromise } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { assertType } from '../../../../../base/common/types.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping, RangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { NotebookTextDiffEditor } from '../../../notebook/browser/diff/notebookDiffEditor.js';
import { getNotebookEditorFromEditorPane } from '../../../notebook/browser/notebookBrowser.js';
import { NotebookCellsChangeType, NotebookSetting } from '../../../notebook/common/notebookCommon.js';
import { computeDiff } from '../../../notebook/common/notebookDiff.js';
import { INotebookEditorModelResolverService } from '../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../notebook/common/notebookLoggingService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { INotebookEditorWorkerService } from '../../../notebook/common/services/notebookWorkerService.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { createSnapshot, deserializeSnapshot, getNotebookSnapshotFileURI, restoreSnapshot, SnapshotComparer } from './notebook/chatEditingModifiedNotebookSnapshot.js';
import { ChatEditingNewNotebookContentEdits } from './notebook/chatEditingNewNotebookContentEdits.js';
import { ChatEditingNotebookCellEntry } from './notebook/chatEditingNotebookCellEntry.js';
import { ChatEditingNotebookDiffEditorIntegration, ChatEditingNotebookEditorIntegration } from './notebook/chatEditingNotebookEditorIntegration.js';
import { ChatEditingNotebookFileSystemProvider } from './notebook/chatEditingNotebookFileSystemProvider.js';
import { adjustCellDiffAndOriginalModelBasedOnCellAddDelete, adjustCellDiffAndOriginalModelBasedOnCellMovements, adjustCellDiffForKeepingAnInsertedCell, adjustCellDiffForRevertingADeletedCell, adjustCellDiffForRevertingAnInsertedCell, calculateNotebookRewriteRatio, getCorrespondingOriginalCellIndex, isTransientIPyNbExtensionEvent } from './notebook/helpers.js';
import { countChanges, sortCellChanges } from './notebook/notebookCellChanges.js';
const SnapshotLanguageId = 'VSCodeChatNotebookSnapshotLanguage';
let ChatEditingModifiedNotebookEntry = class ChatEditingModifiedNotebookEntry extends AbstractChatEditingModifiedFileEntry {
    static { ChatEditingModifiedNotebookEntry_1 = this; }
    static { this.NewModelCounter = 0; }
    get isProcessingResponse() {
        return this._isProcessingResponse;
    }
    get cellsDiffInfo() {
        return this._cellsDiffInfo;
    }
    static async create(uri, _multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, instantiationService) {
        return instantiationService.invokeFunction(async (accessor) => {
            const notebookService = accessor.get(INotebookService);
            const resolver = accessor.get(INotebookEditorModelResolverService);
            const configurationServie = accessor.get(IConfigurationService);
            const resourceRef = await resolver.resolve(uri);
            const notebook = resourceRef.object.notebook;
            const originalUri = getNotebookSnapshotFileURI(telemetryInfo.sessionId, telemetryInfo.requestId, generateUuid(), notebook.uri.scheme === Schemas.untitled ? `/${notebook.uri.path}` : notebook.uri.path, notebook.viewType);
            const [options, buffer] = await Promise.all([
                notebookService.withNotebookDataProvider(resourceRef.object.notebook.notebookType),
                notebookService.createNotebookTextDocumentSnapshot(notebook.uri, 2 /* SnapshotContext.Backup */, CancellationToken.None).then(s => streamToBuffer(s))
            ]);
            const disposables = new DisposableStore();
            // Register so that we can load this from file system.
            disposables.add(ChatEditingNotebookFileSystemProvider.registerFile(originalUri, buffer));
            const originalRef = await resolver.resolve(originalUri, notebook.viewType);
            if (initialContent) {
                try {
                    restoreSnapshot(originalRef.object.notebook, initialContent);
                }
                catch (ex) {
                    console.error(`Error restoring snapshot: ${initialContent}`, ex);
                    initialContent = createSnapshot(notebook, options.serializer.options, configurationServie);
                }
            }
            else {
                initialContent = createSnapshot(notebook, options.serializer.options, configurationServie);
                // Both models are the same, ensure the cell ids are the same, this way we get a perfect diffing.
                // No need to generate edits for this.
                // We want to ensure they are identitcal, possible original notebook was open and got modified.
                // Or something gets changed between serialization & deserialization of the snapshot into the original.
                // E.g. in jupyter notebooks the metadata contains transient data that gets updated after deserialization.
                restoreSnapshot(originalRef.object.notebook, initialContent);
                const edits = [];
                notebook.cells.forEach((cell, index) => {
                    const internalId = generateCellHash(cell.uri);
                    edits.push({ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } });
                });
                resourceRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                originalRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
            }
            const instance = instantiationService.createInstance(ChatEditingModifiedNotebookEntry_1, resourceRef, originalRef, _multiDiffEntryDelegate, options.serializer.options, telemetryInfo, chatKind, initialContent);
            instance._register(disposables);
            return instance;
        });
    }
    static canHandleSnapshotContent(initialContent) {
        if (!initialContent) {
            return false;
        }
        try {
            deserializeSnapshot(initialContent);
            return true;
        }
        catch (ex) {
            // not a valid snapshot
            return false;
        }
    }
    static canHandleSnapshot(snapshot) {
        if (snapshot.languageId === SnapshotLanguageId && ChatEditingModifiedNotebookEntry_1.canHandleSnapshotContent(snapshot.current)) {
            return true;
        }
        return false;
    }
    constructor(modifiedResourceRef, originalResourceRef, _multiDiffEntryDelegate, transientOptions, telemetryInfo, kind, initialContent, configurationService, fileConfigService, chatService, fileService, instantiationService, textModelService, modelService, undoRedoService, notebookEditorWorkerService, loggingService, notebookResolver) {
        super(modifiedResourceRef.object.notebook.uri, telemetryInfo, kind, configurationService, fileConfigService, chatService, fileService, undoRedoService, instantiationService);
        this.modifiedResourceRef = modifiedResourceRef;
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this.transientOptions = transientOptions;
        this.configurationService = configurationService;
        this.textModelService = textModelService;
        this.modelService = modelService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.loggingService = loggingService;
        this.notebookResolver = notebookResolver;
        /**
         * Whether we're still generating diffs from a response.
         */
        this._isProcessingResponse = observableValue('isProcessingResponse', false);
        this._isEditFromUs = false;
        /**
         * Whether all edits are from us, e.g. is possible a user has made edits, then this will be false.
         */
        this._allEditsAreFromUs = true;
        this._changesCount = observableValue(this, 0);
        this.changesCount = this._changesCount;
        this.cellEntryMap = new ResourceMap();
        this.modifiedToOriginalCell = new ResourceMap();
        this._cellsDiffInfo = observableValue('diffInfo', []);
        /**
         * List of Cell URIs that are edited,
         * Will be cleared once all edits have been accepted.
         * I.e. this will only contain URIS while acceptAgentEdits is being called & before `isLastEdit` is sent.
         * I.e. this is populated only when edits are being streamed.
         */
        this.editedCells = new ResourceSet();
        this.computeRequestId = 0;
        this.cellTextModelMap = new ResourceMap();
        this.initialContentComparer = new SnapshotComparer(initialContent);
        this.modifiedModel = this._register(modifiedResourceRef).object.notebook;
        this.originalModel = this._register(originalResourceRef).object.notebook;
        this.originalURI = this.originalModel.uri;
        this.initialContent = initialContent;
        this.initializeModelsFromDiff();
        this._register(this.modifiedModel.onDidChangeContent(this.mirrorNotebookEdits, this));
    }
    initializeModelsFromDiffImpl(cellsDiffInfo) {
        this.cellEntryMap.forEach(entry => entry.dispose());
        this.cellEntryMap.clear();
        const diffs = cellsDiffInfo.map((cellDiff, i) => {
            switch (cellDiff.type) {
                case 'delete':
                    return this.createDeleteCellDiffInfo(cellDiff.originalCellIndex);
                case 'insert':
                    return this.createInsertedCellDiffInfo(cellDiff.modifiedCellIndex);
                default:
                    return this.createModifiedCellDiffInfo(cellDiff.modifiedCellIndex, cellDiff.originalCellIndex);
            }
        });
        this._cellsDiffInfo.set(diffs, undefined);
        this._changesCount.set(countChanges(diffs), undefined);
    }
    async initializeModelsFromDiff() {
        const id = ++this.computeRequestId;
        if (this._areOriginalAndModifiedIdenticalImpl()) {
            const cellsDiffInfo = this.modifiedModel.cells.map((_, index) => {
                return { type: 'unchanged', originalCellIndex: index, modifiedCellIndex: index };
            });
            this.initializeModelsFromDiffImpl(cellsDiffInfo);
            return;
        }
        const cellsDiffInfo = [];
        try {
            this._isProcessingResponse.set(true, undefined);
            const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.originalURI, this.modifiedURI);
            if (id !== this.computeRequestId) {
                return;
            }
            const result = computeDiff(this.originalModel, this.modifiedModel, notebookDiff);
            if (result.cellDiffInfo.length) {
                cellsDiffInfo.push(...result.cellDiffInfo);
            }
        }
        catch (ex) {
            this.loggingService.error('Notebook Chat', 'Error computing diff:\n' + ex);
        }
        finally {
            this._isProcessingResponse.set(false, undefined);
        }
        this.initializeModelsFromDiffImpl(cellsDiffInfo);
    }
    updateCellDiffInfo(cellsDiffInfo, transcation) {
        this._cellsDiffInfo.set(sortCellChanges(cellsDiffInfo), transcation);
        this._changesCount.set(countChanges(cellsDiffInfo), transcation);
    }
    mirrorNotebookEdits(e) {
        if (this._isEditFromUs || Array.from(this.cellEntryMap.values()).some(entry => entry.isEditFromUs)) {
            return;
        }
        // Possible user reverted the changes from SCM or the like.
        // Or user just reverted the changes made via edits (e.g. edit made a change in a cell and user undid that change either by typing over or other).
        // Computing snapshot is too slow, as this event gets triggered for every key stroke in a cell,
        // const didResetToOriginalContent = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService) === this.initialContent;
        let didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        const currentState = this._stateObs.get();
        if (currentState === 0 /* ModifiedFileEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            this._notifyAction('rejected');
            return;
        }
        if (!e.rawEvents.length) {
            return;
        }
        if (currentState === 2 /* ModifiedFileEntryState.Rejected */) {
            return;
        }
        if (isTransientIPyNbExtensionEvent(this.modifiedModel.notebookType, e)) {
            return;
        }
        this._allEditsAreFromUs = false;
        this._userEditScheduler.schedule();
        // Changes to cell text is sync'ed and handled separately.
        // See ChatEditingNotebookCellEntry._mirrorEdits
        for (const event of e.rawEvents.filter(event => event.kind !== NotebookCellsChangeType.ChangeCellContent)) {
            switch (event.kind) {
                case NotebookCellsChangeType.ChangeDocumentMetadata: {
                    const edit = {
                        editType: 5 /* CellEditType.DocumentMetadata */,
                        metadata: this.modifiedModel.metadata
                    };
                    this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    break;
                }
                case NotebookCellsChangeType.ModelChange: {
                    let cellDiffs = sortCellChanges(this._cellsDiffInfo.get());
                    // Ensure the new notebook cells have internalIds
                    this._applyEditsSync(() => {
                        event.changes.forEach(change => {
                            change[2].forEach((cell, i) => {
                                if (cell.internalMetadata.internalId) {
                                    return;
                                }
                                const index = change[0] + i;
                                const internalId = generateCellHash(cell.uri);
                                const edits = [{ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } }];
                                this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                                cell.internalMetadata ??= {};
                                cell.internalMetadata.internalId = internalId;
                            });
                        });
                    });
                    event.changes.forEach(change => {
                        cellDiffs = adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffs, this.modifiedModel.cells.length, this.originalModel.cells.length, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
                    });
                    this.updateCellDiffInfo(cellDiffs, undefined);
                    this.disposeDeletedCellEntries();
                    break;
                }
                case NotebookCellsChangeType.ChangeCellLanguage: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 4 /* CellEditType.CellLanguage */,
                            index,
                            language: event.language
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMetadata: {
                    // ipynb and other extensions can alter metadata, ensure we update the original model in the corresponding cell.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 3 /* CellEditType.Metadata */,
                            index,
                            metadata: event.metadata
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMime:
                    break;
                case NotebookCellsChangeType.ChangeCellInternalMetadata: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 9 /* CellEditType.PartialInternalMetadata */,
                            index,
                            internalMetadata: event.internalMetadata
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Output: {
                    // User can run cells.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 2 /* CellEditType.Output */,
                            index,
                            append: event.append,
                            outputs: event.outputs
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.OutputItem: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 7 /* CellEditType.OutputItems */,
                            outputId: event.outputId,
                            append: event.append,
                            items: event.outputItems
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Move: {
                    const result = adjustCellDiffAndOriginalModelBasedOnCellMovements(event, this._cellsDiffInfo.get().slice());
                    if (result) {
                        this.originalModel.applyEdits(result[1], true, undefined, () => undefined, undefined, false);
                        this._cellsDiffInfo.set(result[0], undefined);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
        didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        if (currentState === 0 /* ModifiedFileEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            return;
        }
    }
    async _doAccept() {
        this.updateCellDiffInfo([], undefined);
        const snapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        restoreSnapshot(this.originalModel, snapshot);
        this.initializeModelsFromDiff();
        await this._collapse(undefined);
        const config = this._fileConfigService.getAutoSaveConfiguration(this.modifiedURI);
        if (this.modifiedModel.uri.scheme !== Schemas.untitled && (!config.autoSave || !this.notebookResolver.isDirty(this.modifiedURI))) {
            // SAVE after accept for manual-savers, for auto-savers
            // trigger explict save to get save participants going
            await this._applyEdits(async () => {
                try {
                    await this.modifiedResourceRef.object.save({
                        reason: 1 /* SaveReason.EXPLICIT */,
                        force: true,
                    });
                }
                catch {
                    // ignored
                }
            });
        }
    }
    async _doReject() {
        this.updateCellDiffInfo([], undefined);
        if (this.createdInRequestId === this._telemetryInfo.requestId) {
            await this._applyEdits(async () => {
                await this.modifiedResourceRef.object.revert({ soft: true });
                await this._fileService.del(this.modifiedURI);
            });
            this._onDidDelete.fire();
        }
        else {
            await this._applyEdits(async () => {
                const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
                this.restoreSnapshotInModifiedModel(snapshot);
                if (this._allEditsAreFromUs && Array.from(this.cellEntryMap.values()).every(entry => entry.allEditsAreFromUs)) {
                    // save the file after discarding so that the dirty indicator goes away
                    // and so that an intermediate saved state gets reverted
                    await this.modifiedResourceRef.object.save({ reason: 1 /* SaveReason.EXPLICIT */, skipSaveParticipants: true });
                }
            });
            this.initializeModelsFromDiff();
            await this._collapse(undefined);
        }
    }
    async _collapse(transaction) {
        this._multiDiffEntryDelegate.collapse(transaction);
    }
    _createEditorIntegration(editor) {
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        if (!notebookEditor && editor.getId() === NotebookTextDiffEditor.ID) {
            const diffEditor = editor.getControl();
            return this._instantiationService.createInstance(ChatEditingNotebookDiffEditorIntegration, diffEditor, this._cellsDiffInfo);
        }
        assertType(notebookEditor);
        return this._instantiationService.createInstance(ChatEditingNotebookEditorIntegration, this, editor, this.modifiedModel, this.originalModel, this._cellsDiffInfo);
    }
    _resetEditsState(tx) {
        super._resetEditsState(tx);
        this.cellEntryMap.forEach(entry => !entry.isDisposed && entry.clearCurrentEditLineDecoration());
    }
    _createUndoRedoElement(response) {
        const request = response.session.getRequests().find(req => req.id === response.requestId);
        const label = request?.message.text ? localize('chatNotebookEdit1', "Chat Edit: '{0}'", request.message.text) : localize('chatNotebookEdit2', "Chat Edit");
        const transientOptions = this.transientOptions;
        const outputSizeLimit = this.configurationService.getValue(NotebookSetting.outputBackupSizeLimit) * 1024;
        // create a snapshot of the current state of the model, before the next set of edits
        let initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
        let last = '';
        let redoState = 2 /* ModifiedFileEntryState.Rejected */;
        return {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.modifiedURI,
            label,
            code: 'chat.edit',
            confirmBeforeUndo: false,
            undo: async () => {
                last = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                this._isEditFromUs = true;
                try {
                    restoreSnapshot(this.modifiedModel, initial);
                    restoreSnapshot(this.originalModel, initial);
                }
                finally {
                    this._isEditFromUs = false;
                }
                redoState = this._stateObs.get() === 1 /* ModifiedFileEntryState.Accepted */ ? 1 /* ModifiedFileEntryState.Accepted */ : 2 /* ModifiedFileEntryState.Rejected */;
                this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, undefined);
                this.updateCellDiffInfo([], undefined);
                this.initializeModelsFromDiff();
                this._notifyAction('userModified');
            },
            redo: async () => {
                initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                this._isEditFromUs = true;
                try {
                    restoreSnapshot(this.modifiedModel, last);
                    restoreSnapshot(this.originalModel, last);
                }
                finally {
                    this._isEditFromUs = false;
                }
                this._stateObs.set(redoState, undefined);
                this.updateCellDiffInfo([], undefined);
                this.initializeModelsFromDiff();
                this._notifyAction('userModified');
            }
        };
    }
    async _areOriginalAndModifiedIdentical() {
        return this._areOriginalAndModifiedIdenticalImpl();
    }
    _areOriginalAndModifiedIdenticalImpl() {
        const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
        return new SnapshotComparer(snapshot).isEqual(this.modifiedModel);
    }
    async acceptAgentEdits(resource, edits, isLastEdits, responseModel) {
        const isCellUri = resource.scheme === Schemas.vscodeNotebookCell;
        const cell = isCellUri && this.modifiedModel.cells.find(cell => isEqual(cell.uri, resource));
        let cellEntry;
        if (cell) {
            const index = this.modifiedModel.cells.indexOf(cell);
            const entry = this._cellsDiffInfo.get().slice().find(entry => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                console.error('Original cell model not found');
                return;
            }
            cellEntry = this.getOrCreateModifiedTextFileEntryForCell(cell, await entry.modifiedModel.promise, await entry.originalModel.promise);
        }
        // For all cells that were edited, send the `isLastEdits` flag.
        const finishPreviousCells = async () => {
            await Promise.all(Array.from(this.editedCells).map(async (uri) => {
                const cell = this.modifiedModel.cells.find(cell => isEqual(cell.uri, uri));
                const cellEntry = cell && this.cellEntryMap.get(cell.uri);
                await cellEntry?.acceptAgentEdits([], true, responseModel);
            }));
            this.editedCells.clear();
        };
        this._applyEdits(async () => {
            await Promise.all(edits.map(async (edit, idx) => {
                const last = isLastEdits && idx === edits.length - 1;
                if (TextEdit.isTextEdit(edit)) {
                    // Possible we're getting the raw content for the notebook.
                    if (isEqual(resource, this.modifiedModel.uri)) {
                        this.newNotebookEditGenerator ??= this._instantiationService.createInstance(ChatEditingNewNotebookContentEdits, this.modifiedModel);
                        this.newNotebookEditGenerator.acceptTextEdits([edit]);
                    }
                    else {
                        // If we get cell edits, its impossible to get text edits for the notebook uri.
                        this.newNotebookEditGenerator = undefined;
                        if (!this.editedCells.has(resource)) {
                            await finishPreviousCells();
                            this.editedCells.add(resource);
                        }
                        await cellEntry?.acceptAgentEdits([edit], last, responseModel);
                    }
                }
                else {
                    // If we notebook edits, its impossible to get text edits for the notebook uri.
                    this.newNotebookEditGenerator = undefined;
                    this.acceptNotebookEdit(edit);
                }
            }));
        });
        // If the last edit for a cell was sent, then handle it
        if (isLastEdits) {
            await finishPreviousCells();
        }
        // isLastEdits can be true for cell Uris, but when its true for Cells edits.
        // It cannot be true for the notebook itself.
        isLastEdits = !isCellUri && isLastEdits;
        // If this is the last edit and & we got regular text edits for generating new notebook content
        // Then generate notebook edits from those text edits & apply those notebook edits.
        if (isLastEdits && this.newNotebookEditGenerator) {
            const notebookEdits = await this.newNotebookEditGenerator.generateEdits();
            this.newNotebookEditGenerator = undefined;
            notebookEdits.forEach(edit => this.acceptNotebookEdit(edit));
        }
        transaction((tx) => {
            this._stateObs.set(0 /* ModifiedFileEntryState.Modified */, tx);
            this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
            if (!isLastEdits) {
                const newRewriteRation = Math.max(this._rewriteRatioObs.get(), calculateNotebookRewriteRatio(this._cellsDiffInfo.get(), this.originalModel, this.modifiedModel));
                this._rewriteRatioObs.set(Math.min(1, newRewriteRation), tx);
            }
            else {
                this.editedCells.clear();
                this._resetEditsState(tx);
                this._rewriteRatioObs.set(1, tx);
            }
        });
    }
    disposeDeletedCellEntries() {
        const cellsUris = new ResourceSet(this.modifiedModel.cells.map(cell => cell.uri));
        Array.from(this.cellEntryMap.keys()).forEach(uri => {
            if (cellsUris.has(uri)) {
                return;
            }
            this.cellEntryMap.get(uri)?.dispose();
            this.cellEntryMap.delete(uri);
        });
    }
    acceptNotebookEdit(edit) {
        // make the actual edit
        this.modifiedModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        this.disposeDeletedCellEntries();
        if (edit.editType !== 1 /* CellEditType.Replace */) {
            return;
        }
        // Ensure cells have internal Ids.
        edit.cells.forEach((_, i) => {
            const index = edit.index + i;
            const cell = this.modifiedModel.cells[index];
            if (cell.internalMetadata.internalId) {
                return;
            }
            const internalId = generateCellHash(cell.uri);
            const edits = [{ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } }];
            this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
        });
        let diff = [];
        if (edit.count === 0) {
            // All existing indexes are shifted by number of cells added.
            diff = sortCellChanges(this._cellsDiffInfo.get());
            diff.forEach(d => {
                if (d.type !== 'delete' && d.modifiedCellIndex >= edit.index) {
                    d.modifiedCellIndex += edit.cells.length;
                }
            });
            const diffInsert = edit.cells.map((_, i) => this.createInsertedCellDiffInfo(edit.index + i));
            diff.splice(edit.index, 0, ...diffInsert);
        }
        else {
            // All existing indexes are shifted by number of cells removed.
            // And unchanged cells should be converted to deleted cells.
            diff = sortCellChanges(this._cellsDiffInfo.get()).map((d) => {
                if (d.type === 'unchanged' && d.modifiedCellIndex >= edit.index && d.modifiedCellIndex <= (edit.index + edit.count - 1)) {
                    return this.createDeleteCellDiffInfo(d.originalCellIndex);
                }
                if (d.type !== 'delete' && d.modifiedCellIndex >= (edit.index + edit.count)) {
                    d.modifiedCellIndex -= edit.count;
                    return d;
                }
                return d;
            });
        }
        this.updateCellDiffInfo(diff, undefined);
    }
    computeStateAfterAcceptingRejectingChanges(accepted) {
        const currentSnapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        if (new SnapshotComparer(currentSnapshot).isEqual(this.originalModel)) {
            const state = accepted ? 1 /* ModifiedFileEntryState.Accepted */ : 2 /* ModifiedFileEntryState.Rejected */;
            this._stateObs.set(state, undefined);
            this._notifyAction(accepted ? 'accepted' : 'rejected');
        }
    }
    createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
        const modifiedCell = this.modifiedModel.cells[modifiedCellIndex];
        const originalCell = this.originalModel.cells[originalCellIndex];
        this.modifiedToOriginalCell.set(modifiedCell.uri, originalCell.uri);
        const modifiedCellModelPromise = this.resolveCellModel(modifiedCell.uri);
        const originalCellModelPromise = this.resolveCellModel(originalCell.uri);
        Promise.all([modifiedCellModelPromise, originalCellModelPromise]).then(([modifiedCellModel, originalCellModel]) => {
            this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
        });
        const diff = observableValue('diff', nullDocumentDiff);
        const unchangedCell = {
            type: 'unchanged',
            modifiedCellIndex,
            originalCellIndex,
            keep: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([modifiedCellModelPromise, originalCellModelPromise]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.keep(changes) : false;
            },
            undo: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([modifiedCellModelPromise, originalCellModelPromise]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.undo(changes) : false;
            },
            modifiedModel: new ObservablePromise(modifiedCellModelPromise),
            originalModel: new ObservablePromise(originalCellModelPromise),
            diff
        };
        return unchangedCell;
    }
    createInsertedCellDiffInfo(modifiedCellIndex) {
        const cell = this.modifiedModel.cells[modifiedCellIndex];
        const lines = cell.getValue().split(/\r?\n/);
        const originalRange = new Range(1, 0, 1, 0);
        const modifiedRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const innerChanges = new RangeMapping(originalRange, modifiedRange);
        const changes = [new DetailedLineRangeMapping(new LineRange(1, 1), new LineRange(1, lines.length), [innerChanges])];
        // When a new cell is inserted, we use the ChatEditingCodeEditorIntegration to handle the edits.
        // & to also display undo/redo and decorations.
        // However that needs a modified and original model.
        // For inserted cells there's no original model, so we create a new empty text model and pass that as the original.
        const originalModelUri = this.modifiedModel.uri.with({ query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(), scheme: 'emptyCell' });
        const originalModel = this.modelService.getModel(originalModelUri) || this._register(this.modelService.createModel('', null, originalModelUri));
        this.modifiedToOriginalCell.set(cell.uri, originalModelUri);
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        this.resolveCellModel(cell.uri).then(modifiedModel => {
            // We want decorators for the cell just as we display decorators for modified cells.
            // This way we have the ability to accept/reject the entire cell.
            this.getOrCreateModifiedTextFileEntryForCell(cell, modifiedModel, originalModel);
        });
        return {
            type: 'insert',
            originalCellIndex: undefined,
            modifiedCellIndex: modifiedCellIndex,
            keep,
            undo,
            modifiedModel: new ObservablePromise(this.resolveCellModel(cell.uri)),
            originalModel: new ObservablePromise(Promise.resolve(originalModel)),
            diff: observableValue('deletedCellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            })
        };
    }
    createDeleteCellDiffInfo(originalCellIndex) {
        const originalCell = this.originalModel.cells[originalCellIndex];
        const lines = new Array(originalCell.textBuffer.getLineCount()).fill(0).map((_, i) => originalCell.textBuffer.getLineContent(i + 1));
        const originalRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const modifiedRange = new Range(1, 0, 1, 0);
        const innerChanges = new RangeMapping(modifiedRange, originalRange);
        const changes = [new DetailedLineRangeMapping(new LineRange(1, lines.length), new LineRange(1, 1), [innerChanges])];
        const modifiedModelUri = this.modifiedModel.uri.with({ query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(), scheme: 'emptyCell' });
        const modifiedModel = this.modelService.getModel(modifiedModelUri) || this._register(this.modelService.createModel('', null, modifiedModelUri));
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell)));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell), originalCell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        // This will be deleted.
        return {
            type: 'delete',
            modifiedCellIndex: undefined,
            originalCellIndex,
            originalModel: new ObservablePromise(this.resolveCellModel(originalCell.uri)),
            modifiedModel: new ObservablePromise(Promise.resolve(modifiedModel)),
            keep,
            undo,
            diff: observableValue('cellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            })
        };
    }
    undoPreviouslyInsertedCell(cell) {
        let diffs = [];
        this._applyEditsSync(() => {
            const index = this.modifiedModel.cells.indexOf(cell);
            diffs = adjustCellDiffForRevertingAnInsertedCell(index, this._cellsDiffInfo.get(), this.modifiedModel.applyEdits.bind(this.modifiedModel));
        });
        this.disposeDeletedCellEntries();
        this.updateCellDiffInfo(diffs, undefined);
    }
    keepPreviouslyInsertedCell(cell) {
        const modifiedCellIndex = this.modifiedModel.cells.indexOf(cell);
        if (modifiedCellIndex === -1) {
            // Not possible.
            return;
        }
        const cellToInsert = {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: cell.mime,
            internalMetadata: {
                internalId: cell.internalMetadata.internalId
            }
        };
        this.cellEntryMap.get(cell.uri)?.dispose();
        this.cellEntryMap.delete(cell.uri);
        const cellDiffs = adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, this._cellsDiffInfo.get().slice(), cellToInsert, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    undoPreviouslyDeletedCell(deletedOriginalIndex, originalCell) {
        const cellToInsert = {
            cellKind: originalCell.cellKind,
            language: originalCell.language,
            metadata: originalCell.metadata,
            outputs: originalCell.outputs,
            source: originalCell.getValue(),
            mime: originalCell.mime,
            internalMetadata: {
                internalId: originalCell.internalMetadata.internalId
            }
        };
        let cellDiffs = [];
        this._applyEditsSync(() => {
            cellDiffs = adjustCellDiffForRevertingADeletedCell(deletedOriginalIndex, this._cellsDiffInfo.get(), cellToInsert, this.modifiedModel.applyEdits.bind(this.modifiedModel), this.createModifiedCellDiffInfo.bind(this));
        });
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    keepPreviouslyDeletedCell(deletedOriginalIndex) {
        // Delete this cell from original as well.
        const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: deletedOriginalIndex, };
        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        const diffs = sortCellChanges(this._cellsDiffInfo.get())
            .filter(d => !(d.type === 'delete' && d.originalCellIndex === deletedOriginalIndex))
            .map(diff => {
            if (diff.type !== 'insert' && diff.originalCellIndex > deletedOriginalIndex) {
                return {
                    ...diff,
                    originalCellIndex: diff.originalCellIndex - 1,
                };
            }
            return diff;
        });
        this.updateCellDiffInfo(diffs, undefined);
    }
    async _applyEdits(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            await operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    _applyEditsSync(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    createSnapshot(requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: SnapshotLanguageId,
            snapshotUri: getNotebookSnapshotFileURI(this._telemetryInfo.sessionId, requestId, undoStop, this.modifiedURI.path, this.modifiedModel.viewType),
            original: createSnapshot(this.originalModel, this.transientOptions, this.configurationService),
            current: createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService),
            state: this.state.get(),
            telemetryInfo: this.telemetryInfo,
        };
    }
    equalsSnapshot(snapshot) {
        return !!snapshot &&
            isEqual(this.modifiedURI, snapshot.resource) &&
            this.state.get() === snapshot.state &&
            new SnapshotComparer(snapshot.original).isEqual(this.originalModel) &&
            new SnapshotComparer(snapshot.current).isEqual(this.modifiedModel);
    }
    async restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this.updateCellDiffInfo([], undefined);
        this._stateObs.set(snapshot.state, undefined);
        restoreSnapshot(this.originalModel, snapshot.original);
        if (restoreToDisk) {
            this.restoreSnapshotInModifiedModel(snapshot.current);
        }
        this.initializeModelsFromDiff();
    }
    async resetToInitialContent() {
        this.updateCellDiffInfo([], undefined);
        this.restoreSnapshotInModifiedModel(this.initialContent);
        this.initializeModelsFromDiff();
    }
    restoreSnapshotInModifiedModel(snapshot) {
        if (snapshot === createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService)) {
            return;
        }
        this._applyEditsSync(() => {
            // See private _setDocValue in chatEditingModifiedDocumentEntry.ts
            this.modifiedModel.pushStackElement();
            restoreSnapshot(this.modifiedModel, snapshot);
            this.modifiedModel.pushStackElement();
        });
    }
    async resolveCellModel(cellURI) {
        const cell = this.originalModel.cells.concat(this.modifiedModel.cells).find(cell => isEqual(cell.uri, cellURI));
        if (!cell) {
            throw new Error('Cell not found');
        }
        const model = this.cellTextModelMap.get(cell.uri) || this._register(await this.textModelService.createModelReference(cell.uri)).object.textEditorModel;
        this.cellTextModelMap.set(cell.uri, model);
        return model;
    }
    getOrCreateModifiedTextFileEntryForCell(cell, modifiedCellModel, originalCellModel) {
        let cellEntry = this.cellEntryMap.get(cell.uri);
        if (cellEntry) {
            return cellEntry;
        }
        const disposables = new DisposableStore();
        cellEntry = this._register(this._instantiationService.createInstance(ChatEditingNotebookCellEntry, this.modifiedResourceRef.object.resource, cell, modifiedCellModel, originalCellModel, disposables));
        this.cellEntryMap.set(cell.uri, cellEntry);
        disposables.add(autorun(r => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const diffs = this.cellsDiffInfo.get().slice();
            const index = this.modifiedModel.cells.indexOf(cell);
            let entry = diffs.find(entry => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                return;
            }
            const entryIndex = diffs.indexOf(entry);
            entry.diff.set(cellEntry.diffInfo.read(r), undefined);
            if (cellEntry.diffInfo.get().identical && entry.type === 'modified') {
                entry = {
                    ...entry,
                    type: 'unchanged',
                };
            }
            if (!cellEntry.diffInfo.get().identical && entry.type === 'unchanged') {
                entry = {
                    ...entry,
                    type: 'modified',
                };
            }
            diffs.splice(entryIndex, 1, { ...entry });
            transaction(tx => {
                this.updateCellDiffInfo(diffs, tx);
            });
        }));
        disposables.add(autorun(r => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const cellState = cellEntry.state.read(r);
            if (cellState === 1 /* ModifiedFileEntryState.Accepted */) {
                this.computeStateAfterAcceptingRejectingChanges(true);
            }
            else if (cellState === 2 /* ModifiedFileEntryState.Rejected */) {
                this.computeStateAfterAcceptingRejectingChanges(false);
            }
        }));
        return cellEntry;
    }
};
ChatEditingModifiedNotebookEntry = ChatEditingModifiedNotebookEntry_1 = __decorate([
    __param(7, IConfigurationService),
    __param(8, IFilesConfigurationService),
    __param(9, IChatService),
    __param(10, IFileService),
    __param(11, IInstantiationService),
    __param(12, ITextModelService),
    __param(13, IModelService),
    __param(14, IUndoRedoService),
    __param(15, INotebookEditorWorkerService),
    __param(16, INotebookLoggingService),
    __param(17, INotebookEditorModelResolverService)
], ChatEditingModifiedNotebookEntry);
export { ChatEditingModifiedNotebookEntry };
function generateCellHash(cellUri) {
    const hash = new StringSHA1();
    hash.update(cellUri.toString());
    return hash.digest().substring(0, 8);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ01vZGlmaWVkTm90ZWJvb2tFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFjLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUE2QixlQUFlLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9JLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDN0YsT0FBTyxFQUFF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