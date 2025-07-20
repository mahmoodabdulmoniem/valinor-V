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
import { DeferredPromise, Sequencer, SequencerByKey, timeout } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { autorun, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { getMultiDiffSourceUri } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatEditingModifiedDocumentEntry } from './chatEditingModifiedDocumentEntry.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { ChatEditingSessionStorage } from './chatEditingSessionStorage.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
import { ChatEditingTimeline } from './chatEditingTimeline.js';
class ThrottledSequencer extends Sequencer {
    constructor(_minDuration, _maxOverallDelay) {
        super();
        this._minDuration = _minDuration;
        this._maxOverallDelay = _maxOverallDelay;
        this._size = 0;
    }
    queue(promiseTask) {
        this._size += 1;
        const noDelay = this._size * this._minDuration > this._maxOverallDelay;
        return super.queue(async () => {
            try {
                const p1 = promiseTask();
                const p2 = noDelay
                    ? Promise.resolve(undefined)
                    : timeout(this._minDuration, CancellationToken.None);
                const [result] = await Promise.all([p1, p2]);
                return result;
            }
            finally {
                this._size -= 1;
            }
        });
    }
}
function getCurrentAndNextStop(requestId, stopId, history) {
    const snapshotIndex = history.findIndex(s => s.requestId === requestId);
    if (snapshotIndex === -1) {
        return undefined;
    }
    const snapshot = history[snapshotIndex];
    const stopIndex = snapshot.stops.findIndex(s => s.stopId === stopId);
    if (stopIndex === -1) {
        return undefined;
    }
    const current = snapshot.stops[stopIndex].entries;
    const next = stopIndex < snapshot.stops.length - 1
        ? snapshot.stops[stopIndex + 1].entries
        : history[snapshotIndex + 1]?.stops[0].entries;
    if (!next) {
        return undefined;
    }
    return { current, next };
}
let ChatEditingSession = class ChatEditingSession extends Disposable {
    get entries() {
        this._assertNotDisposed();
        return this._entriesObs;
    }
    get state() {
        return this._state;
    }
    get onDidDispose() {
        this._assertNotDisposed();
        return this._onDidDispose.event;
    }
    constructor(chatSessionId, isGlobalEditingSession, _lookupExternalEntry, _instantiationService, _modelService, _languageService, _textModelService, _bulkEditService, _editorGroupsService, _editorService, _chatService, _notebookService, _accessibilitySignalService) {
        super();
        this.chatSessionId = chatSessionId;
        this.isGlobalEditingSession = isGlobalEditingSession;
        this._lookupExternalEntry = _lookupExternalEntry;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._textModelService = _textModelService;
        this._bulkEditService = _bulkEditService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._chatService = _chatService;
        this._notebookService = _notebookService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._state = observableValue(this, 0 /* ChatEditingSessionState.Initial */);
        /**
         * Contains the contents of a file when the AI first began doing edits to it.
         */
        this._initialFileContents = new ResourceMap();
        this._entriesObs = observableValue(this, []);
        this._onDidDispose = new Emitter();
        /**
         * A snapshot representing the state of the working set before a new request has been sent
         */
        this._pendingSnapshot = observableValue(this, undefined);
        this._streamingEditLocks = new SequencerByKey();
        this._timeline = _instantiationService.createInstance(ChatEditingTimeline);
        this.canRedo = this._timeline.canRedo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this.canUndo = this._timeline.canUndo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this._register(autorun(reader => {
            const disabled = this._timeline.requestDisablement.read(reader);
            this._chatService.getSession(this.chatSessionId)?.setDisabledRequests(disabled);
        }));
    }
    async init() {
        const restoredSessionState = await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId).restoreState();
        if (restoredSessionState) {
            for (const [uri, content] of restoredSessionState.initialFileContents) {
                this._initialFileContents.set(uri, content);
            }
            await this._restoreSnapshot(restoredSessionState.recentSnapshot, false);
            transaction(tx => {
                this._pendingSnapshot.set(restoredSessionState.pendingSnapshot, tx);
                this._timeline.restoreFromState({ history: restoredSessionState.linearHistory, index: restoredSessionState.linearHistoryIndex }, tx);
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            });
        }
        else {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        this._register(autorun(reader => {
            const entries = this.entries.read(reader);
            entries.forEach(entry => {
                entry.state.read(reader);
            });
        }));
    }
    _getEntry(uri) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
    }
    getEntry(uri) {
        return this._getEntry(uri);
    }
    readEntry(uri, reader) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.read(reader).find(e => isEqual(e.modifiedURI, uri));
    }
    storeState() {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId);
        const timelineState = this._timeline.getStateForPersistence();
        const state = {
            initialFileContents: this._initialFileContents,
            pendingSnapshot: this._pendingSnapshot.get(),
            recentSnapshot: this._createSnapshot(undefined, undefined),
            linearHistoryIndex: timelineState.index,
            linearHistory: timelineState.history,
        };
        return storage.storeState(state);
    }
    _ensurePendingSnapshot() {
        const prev = this._pendingSnapshot.get();
        if (!prev) {
            this._pendingSnapshot.set(this._createSnapshot(undefined, undefined), undefined);
        }
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        return this._timeline.getEntryDiffBetweenStops(uri, requestId, stopId);
    }
    createSnapshot(requestId, undoStop, makeEmpty = undoStop !== undefined) {
        this._timeline.pushSnapshot(requestId, undoStop, makeEmpty ? ChatEditingTimeline.createEmptySnapshot(undoStop) : this._createSnapshot(requestId, undoStop));
    }
    _createSnapshot(requestId, stopId) {
        const entries = new ResourceMap();
        for (const entry of this._entriesObs.get()) {
            entries.set(entry.modifiedURI, entry.createSnapshot(requestId, stopId));
        }
        return { stopId, entries };
    }
    getSnapshot(requestId, undoStop, snapshotUri) {
        const stopRef = this._timeline.getSnapshotForRestore(requestId, undoStop);
        const entries = stopRef?.stop.entries;
        return entries && [...entries.values()].find((e) => isEqual(e.snapshotUri, snapshotUri));
    }
    async getSnapshotModel(requestId, undoStop, snapshotUri) {
        const snapshotEntry = this.getSnapshot(requestId, undoStop, snapshotUri);
        if (!snapshotEntry) {
            return null;
        }
        return this._modelService.createModel(snapshotEntry.current, this._languageService.createById(snapshotEntry.languageId), snapshotUri, false);
    }
    getSnapshotUri(requestId, uri, stopId) {
        // This should be encapsulated in the timeline, but for now, fallback to legacy logic if needed.
        // TODO: Move this logic into a timeline method if required by the design.
        const timelineState = this._timeline.getStateForPersistence();
        const stops = getCurrentAndNextStop(requestId, stopId, timelineState.history);
        return stops?.next.get(uri)?.snapshotUri;
    }
    async restoreSnapshot(requestId, stopId) {
        if (requestId !== undefined) {
            const stopRef = this._timeline.getSnapshotForRestore(requestId, stopId);
            if (stopRef) {
                this._ensurePendingSnapshot();
                await this._restoreSnapshot(stopRef.stop);
                stopRef.apply();
            }
        }
        else {
            const pendingSnapshot = this._pendingSnapshot.get();
            if (!pendingSnapshot) {
                return; // We don't have a pending snapshot that we can restore
            }
            this._pendingSnapshot.set(undefined, undefined);
            await this._restoreSnapshot(pendingSnapshot, undefined);
        }
    }
    async _restoreSnapshot({ entries }, restoreResolvedToDisk = true) {
        // Reset all the files which are modified in this session state
        // but which are not found in the snapshot
        for (const entry of this._entriesObs.get()) {
            const snapshotEntry = entries.get(entry.modifiedURI);
            if (!snapshotEntry) {
                await entry.resetToInitialContent();
                entry.dispose();
            }
        }
        const entriesArr = [];
        // Restore all entries from the snapshot
        for (const snapshotEntry of entries.values()) {
            const entry = await this._getOrCreateModifiedFileEntry(snapshotEntry.resource, snapshotEntry.telemetryInfo);
            const restoreToDisk = snapshotEntry.state === 0 /* ModifiedFileEntryState.Modified */ || restoreResolvedToDisk;
            await entry.restoreFromSnapshot(snapshotEntry, restoreToDisk);
            entriesArr.push(entry);
        }
        this._entriesObs.set(entriesArr, undefined);
    }
    _assertNotDisposed() {
        if (this._state.get() === 3 /* ChatEditingSessionState.Disposed */) {
            throw new BugIndicatingError(`Cannot access a disposed editing session`);
        }
    }
    async accept(...uris) {
        this._assertNotDisposed();
        if (uris.length === 0) {
            await Promise.all(this._entriesObs.get().map(entry => entry.accept()));
        }
        for (const uri of uris) {
            const entry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
            if (entry) {
                await entry.accept();
            }
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
    }
    async reject(...uris) {
        this._assertNotDisposed();
        if (uris.length === 0) {
            await Promise.all(this._entriesObs.get().map(entry => entry.reject()));
        }
        for (const uri of uris) {
            const entry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
            if (entry) {
                await entry.reject();
            }
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
    }
    async show(previousChanges) {
        this._assertNotDisposed();
        if (this._editorPane) {
            if (this._editorPane.isVisible()) {
                return;
            }
            else if (this._editorPane.input) {
                await this._editorGroupsService.activeGroup.openEditor(this._editorPane.input, { pinned: true, activation: EditorActivation.ACTIVATE });
                return;
            }
        }
        const input = MultiDiffEditorInput.fromResourceMultiDiffEditorInput({
            multiDiffSource: getMultiDiffSourceUri(this, previousChanges),
            label: localize('multiDiffEditorInput.name', "Suggested Edits")
        }, this._instantiationService);
        this._editorPane = await this._editorGroupsService.activeGroup.openEditor(input, { pinned: true, activation: EditorActivation.ACTIVATE });
    }
    async stop(clearState = false) {
        this._stopPromise ??= Promise.allSettled([this._performStop(), this.storeState()]).then(() => { });
        await this._stopPromise;
        if (clearState) {
            await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId).clearState();
        }
    }
    async _performStop() {
        // Close out all open files
        const schemes = [AbstractChatEditingModifiedFileEntry.scheme, ChatEditingTextModelContentProvider.scheme];
        await Promise.allSettled(this._editorGroupsService.groups.flatMap(async (g) => {
            return g.editors.map(async (e) => {
                if ((e instanceof MultiDiffEditorInput && e.initialResources?.some(r => r.originalUri && schemes.indexOf(r.originalUri.scheme) !== -1))
                    || (e instanceof DiffEditorInput && e.original.resource && schemes.indexOf(e.original.resource.scheme) !== -1)) {
                    await g.closeEditor(e);
                }
            });
        }));
    }
    dispose() {
        this._assertNotDisposed();
        this._chatService.cancelCurrentRequestForSession(this.chatSessionId);
        dispose(this._entriesObs.get());
        super.dispose();
        this._state.set(3 /* ChatEditingSessionState.Disposed */, undefined);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
    get isDisposed() {
        return this._state.get() === 3 /* ChatEditingSessionState.Disposed */;
    }
    startStreamingEdits(resource, responseModel, inUndoStop) {
        const completePromise = new DeferredPromise();
        const startPromise = new DeferredPromise();
        // Sequence all edits made this this resource in this streaming edits instance,
        // and also sequence the resource overall in the rare (currently invalid?) case
        // that edits are made in parallel to the same resource,
        const sequencer = new ThrottledSequencer(15, 1000);
        sequencer.queue(() => startPromise.p);
        this._streamingEditLocks.queue(resource.toString(), async () => {
            if (!this.isDisposed) {
                await this._acceptStreamingEditsStart(responseModel, inUndoStop, resource);
            }
            startPromise.complete();
            return completePromise.p;
        });
        let didComplete = false;
        return {
            pushText: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebookCellText: (cell, edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(cell, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebook: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            complete: () => {
                if (didComplete) {
                    return;
                }
                didComplete = true;
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, [], true, responseModel);
                        await this._resolve(responseModel.requestId, inUndoStop, resource);
                        completePromise.complete();
                    }
                });
            },
        };
    }
    async undoInteraction() {
        const undo = this._timeline.getUndoSnapshot();
        if (!undo) {
            return;
        }
        this._ensurePendingSnapshot();
        await this._restoreSnapshot(undo.stop);
        undo.apply();
    }
    async redoInteraction() {
        const redo = this._timeline.getRedoSnapshot();
        const nextSnapshot = redo?.stop || this._pendingSnapshot.get();
        if (!nextSnapshot) {
            return;
        }
        await this._restoreSnapshot(nextSnapshot);
        if (redo) {
            redo.apply();
        }
        else {
            this._pendingSnapshot.set(undefined, undefined);
        }
    }
    async _acceptStreamingEditsStart(responseModel, undoStop, resource) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        transaction((tx) => {
            this._state.set(1 /* ChatEditingSessionState.StreamingEdits */, tx);
            entry.acceptStreamingEditsStart(responseModel, tx);
            this._timeline.ensureEditInUndoStopMatches(responseModel.requestId, undoStop, entry, false, tx);
        });
    }
    async _acceptEdits(resource, textEdits, isLastEdits, responseModel) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        await entry.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
    }
    _getTelemetryInfoForModel(responseModel) {
        // Make these getters because the response result is not available when the file first starts to be edited
        return new class {
            get agentId() { return responseModel.agent?.id; }
            get command() { return responseModel.slashCommand?.name; }
            get sessionId() { return responseModel.session.sessionId; }
            get requestId() { return responseModel.requestId; }
            get result() { return responseModel.result; }
        };
    }
    async _resolve(requestId, undoStop, resource) {
        const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => k !== resource.toString());
        if (!hasOtherTasks) {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        const entry = this._getEntry(resource);
        if (!entry) {
            return;
        }
        this._timeline.ensureEditInUndoStopMatches(requestId, undoStop, entry, /* next= */ true, undefined);
        return entry.acceptStreamingEditsEnd();
    }
    /**
     * Retrieves or creates a modified file entry.
     *
     * @returns The modified file entry.
     */
    async _getOrCreateModifiedFileEntry(resource, telemetryInfo) {
        resource = CellUri.parse(resource)?.notebook ?? resource;
        const existingEntry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, resource));
        if (existingEntry) {
            if (telemetryInfo.requestId !== existingEntry.telemetryInfo.requestId) {
                existingEntry.updateTelemetryInfo(telemetryInfo);
            }
            return existingEntry;
        }
        let entry;
        const existingExternalEntry = this._lookupExternalEntry(resource);
        if (existingExternalEntry) {
            entry = existingExternalEntry;
        }
        else {
            const initialContent = this._initialFileContents.get(resource);
            // This gets manually disposed in .dispose() or in .restoreSnapshot()
            entry = await this._createModifiedFileEntry(resource, telemetryInfo, false, initialContent);
            if (!initialContent) {
                this._initialFileContents.set(resource, entry.initialContent);
            }
        }
        // If an entry is deleted e.g. reverting a created file,
        // remove it from the entries and don't show it in the working set anymore
        // so that it can be recreated e.g. through retry
        const listener = entry.onDidDelete(() => {
            const newEntries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, entry.modifiedURI));
            this._entriesObs.set(newEntries, undefined);
            this._editorService.closeEditors(this._editorService.findEditors(entry.modifiedURI));
            if (!existingExternalEntry) {
                // don't dispose entries that are not yours!
                entry.dispose();
            }
            this._store.delete(listener);
        });
        this._store.add(listener);
        const entriesArr = [...this._entriesObs.get(), entry];
        this._entriesObs.set(entriesArr, undefined);
        return entry;
    }
    async _createModifiedFileEntry(resource, telemetryInfo, mustExist = false, initialContent) {
        const multiDiffEntryDelegate = { collapse: (transaction) => this._collapse(resource, transaction) };
        const chatKind = mustExist ? 0 /* ChatEditKind.Created */ : 1 /* ChatEditKind.Modified */;
        const notebookUri = CellUri.parse(resource)?.notebook || resource;
        try {
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(notebookUri, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, this._instantiationService);
            }
            else {
                const ref = await this._textModelService.createModelReference(resource);
                return this._instantiationService.createInstance(ChatEditingModifiedDocumentEntry, ref, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent);
            }
        }
        catch (err) {
            if (mustExist) {
                throw err;
            }
            // this file does not exist yet, create it and try again
            await this._bulkEditService.apply({ edits: [{ newResource: resource }] });
            this._editorService.openEditor({ resource, options: { inactive: true, preserveFocus: true, pinned: true } });
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(resource, multiDiffEntryDelegate, telemetryInfo, 0 /* ChatEditKind.Created */, initialContent, this._instantiationService);
            }
            else {
                return this._createModifiedFileEntry(resource, telemetryInfo, true, initialContent);
            }
        }
    }
    _collapse(resource, transaction) {
        const multiDiffItem = this._editorPane?.findDocumentDiffItem(resource);
        if (multiDiffItem) {
            this._editorPane?.viewModel?.items.get().find((documentDiffItem) => isEqual(documentDiffItem.originalUri, multiDiffItem.originalUri) &&
                isEqual(documentDiffItem.modifiedUri, multiDiffItem.modifiedUri))
                ?.collapsed.set(true, transaction);
        }
    }
};
ChatEditingSession = __decorate([
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, ITextModelService),
    __param(7, IBulkEditService),
    __param(8, IEditorGroupsService),
    __param(9, IEditorService),
    __param(10, IChatService),
    __param(11, INotebookService),
    __param(12, IAccessibilitySignalService)
], ChatEditingSession);
export { ChatEditingSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdTZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQVMsU0FBUyxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQXNDLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNySSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFR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