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
var ChatEditingTimeline_1;
import { equals as arraysEqual, binarySearch2 } from '../../../../../base/common/arrays.js';
import { equals as objectsEqual } from '../../../../../base/common/objects.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { derived, derivedOpts, ObservablePromise, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { ChatEditingModifiedNotebookDiff } from './notebook/chatEditingModifiedNotebookDiff.js';
/**
 * Timeline/undo-redo stack for ChatEditingSession.
 */
let ChatEditingTimeline = class ChatEditingTimeline {
    static { ChatEditingTimeline_1 = this; }
    static { this.POST_EDIT_STOP_ID = 'd19944f6-f46c-4e17-911b-79a8e843c7c0'; } // randomly generated
    static createEmptySnapshot(undoStop) {
        return {
            stopId: undoStop,
            entries: new ResourceMap(),
        };
    }
    constructor(_editorWorkerService, _instantiationService, configurationService, _textModelService) {
        this._editorWorkerService = _editorWorkerService;
        this._instantiationService = _instantiationService;
        this._textModelService = _textModelService;
        this._linearHistory = observableValue(this, []);
        this._linearHistoryIndex = observableValue(this, 0);
        this._diffsBetweenStops = new Map();
        this._fullDiffs = new Map();
        this.requestDisablement = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, objectsEqual) }, reader => {
            const history = this._linearHistory.read(reader);
            const index = this._linearHistoryIndex.read(reader);
            const undoRequests = [];
            for (const entry of history) {
                if (!entry.requestId) {
                    // ignored
                }
                else if (entry.startIndex >= index) {
                    undoRequests.push({ requestId: entry.requestId });
                }
                else if (entry.startIndex + entry.stops.length > index) {
                    undoRequests.push({ requestId: entry.requestId, afterUndoStop: entry.stops[(index - 1) - entry.startIndex].stopId });
                }
            }
            return undoRequests;
        });
        this._ignoreTrimWhitespaceObservable = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, configurationService);
        this.canUndo = derived(r => {
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex > 1;
        });
        this.canRedo = derived(r => {
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex < getMaxHistoryIndex(this._linearHistory.read(r));
        });
    }
    /**
     * Restore the timeline from a saved state (history array and index).
     */
    restoreFromState(state, tx) {
        this._linearHistory.set(state.history, tx);
        this._linearHistoryIndex.set(state.index, tx);
    }
    /**
     * Get the snapshot and history index for restoring, given requestId and stopId.
     * If requestId is undefined, returns undefined (pending snapshot is managed by session).
     */
    getSnapshotForRestore(requestId, stopId) {
        if (requestId === undefined) {
            return undefined;
        }
        const stopRef = this.findEditStop(requestId, stopId);
        if (!stopRef) {
            return undefined;
        }
        // When rolling back to the first snapshot taken for a request, mark the
        // entire request as undone.
        const toIndex = stopRef.stop.stopId === undefined ? stopRef.historyIndex : stopRef.historyIndex + 1;
        return {
            stop: stopRef.stop,
            apply: () => this._linearHistoryIndex.set(toIndex, undefined)
        };
    }
    /**
     * Ensures the state of the file in the given snapshot matches the current
     * state of the {@param entry}. This is used to handle concurrent file edits.
     *
     * Given the case of two different edits, we will place and undo stop right
     * before we `textEditGroup` in the underlying markdown stream, but at the
     * time those are added the edits haven't been made yet, so both files will
     * simply have the unmodified state.
     *
     * This method is called after each edit, so after the first file finishes
     * being edits, it will update its content in the second undo snapshot such
     * that it can be undone successfully.
     *
     * We ensure that the same file is not concurrently edited via the
     * {@link _streamingEditLocks}, avoiding race conditions.
     *
     * @param next If true, this will edit the snapshot _after_ the undo stop
     */
    ensureEditInUndoStopMatches(requestId, undoStop, entry, next, tx) {
        const history = this._linearHistory.get();
        const snapIndex = history.findIndex((s) => s.requestId === requestId);
        if (snapIndex === -1) {
            return;
        }
        const snap = { ...history[snapIndex] };
        let stopIndex = snap.stops.findIndex((s) => s.stopId === undoStop);
        if (stopIndex === -1) {
            return;
        }
        let linearHistoryIndexIncr = 0;
        if (next) {
            if (stopIndex === snap.stops.length - 1) {
                if (snap.stops[stopIndex].stopId === ChatEditingTimeline_1.POST_EDIT_STOP_ID) {
                    throw new Error('cannot duplicate post-edit stop');
                }
                snap.stops = snap.stops.concat(ChatEditingTimeline_1.createEmptySnapshot(ChatEditingTimeline_1.POST_EDIT_STOP_ID));
                linearHistoryIndexIncr++;
            }
            stopIndex++;
        }
        const stop = snap.stops[stopIndex];
        if (entry.equalsSnapshot(stop.entries.get(entry.modifiedURI))) {
            return;
        }
        const newMap = new ResourceMap(stop.entries);
        newMap.set(entry.modifiedURI, entry.createSnapshot(requestId, stop.stopId));
        const newStop = snap.stops.slice();
        newStop[stopIndex] = { ...stop, entries: newMap };
        snap.stops = newStop;
        const newHistory = history.slice();
        newHistory[snapIndex] = snap;
        this._linearHistory.set(newHistory, tx);
        if (linearHistoryIndexIncr) {
            this._linearHistoryIndex.set(this._linearHistoryIndex.get() + linearHistoryIndexIncr, tx);
        }
    }
    /**
     * Get the undo snapshot (previous in history), or undefined if at start.
     * If the timeline is at the end of the history, it will return the last stop
     * pushed into the history.
     */
    getUndoSnapshot() {
        return this.getUndoRedoSnapshot(-1);
    }
    /**
     * Get the redo snapshot (next in history), or undefined if at end.
     */
    getRedoSnapshot() {
        return this.getUndoRedoSnapshot(1);
    }
    getUndoRedoSnapshot(direction) {
        let idx = this._linearHistoryIndex.get() - 1;
        const max = getMaxHistoryIndex(this._linearHistory.get());
        const startEntry = this.getHistoryEntryByLinearIndex(idx);
        let entry = startEntry;
        if (!startEntry) {
            return undefined;
        }
        do {
            idx += direction;
            entry = this.getHistoryEntryByLinearIndex(idx);
        } while (idx + direction < max &&
            idx + direction >= 0 &&
            entry &&
            !(direction === -1 && entry.entry.requestId !== startEntry.entry.requestId) &&
            !stopProvidesNewData(startEntry.stop, entry.stop));
        if (entry) {
            return { stop: entry.stop, apply: () => this._linearHistoryIndex.set(idx + 1, undefined) };
        }
        return undefined;
    }
    /**
     * Get the state for persistence (history and index).
     */
    getStateForPersistence() {
        return { history: this._linearHistory.get(), index: this._linearHistoryIndex.get() };
    }
    findSnapshot(requestId) {
        return this._linearHistory.get().find((s) => s.requestId === requestId);
    }
    findEditStop(requestId, undoStop) {
        const snapshot = this.findSnapshot(requestId);
        if (!snapshot) {
            return undefined;
        }
        const idx = snapshot.stops.findIndex((s) => s.stopId === undoStop);
        return idx === -1 ? undefined : { stop: snapshot.stops[idx], snapshot, historyIndex: snapshot.startIndex + idx };
    }
    getHistoryEntryByLinearIndex(index) {
        const history = this._linearHistory.get();
        const searchedIndex = binarySearch2(history.length, (e) => history[e].startIndex - index);
        const entry = history[searchedIndex < 0 ? (~searchedIndex) - 1 : searchedIndex];
        if (!entry || index - entry.startIndex >= entry.stops.length) {
            return undefined;
        }
        return {
            entry,
            stop: entry.stops[index - entry.startIndex]
        };
    }
    pushSnapshot(requestId, undoStop, snapshot) {
        const linearHistoryPtr = this._linearHistoryIndex.get();
        const newLinearHistory = [];
        for (const entry of this._linearHistory.get()) {
            if (entry.startIndex >= linearHistoryPtr) {
                break;
            }
            else if (linearHistoryPtr - entry.startIndex < entry.stops.length) {
                newLinearHistory.push({ requestId: entry.requestId, stops: entry.stops.slice(0, linearHistoryPtr - entry.startIndex), startIndex: entry.startIndex });
            }
            else {
                newLinearHistory.push(entry);
            }
        }
        const lastEntry = newLinearHistory.at(-1);
        if (requestId && lastEntry?.requestId === requestId) {
            const hadPostEditStop = lastEntry.stops.at(-1)?.stopId === ChatEditingTimeline_1.POST_EDIT_STOP_ID && undoStop;
            if (hadPostEditStop) {
                const rebaseUri = (uri) => uri.with({ query: uri.query.replace(ChatEditingTimeline_1.POST_EDIT_STOP_ID, undoStop) });
                for (const [uri, prev] of lastEntry.stops.at(-1).entries) {
                    snapshot.entries.set(uri, { ...prev, snapshotUri: rebaseUri(prev.snapshotUri), resource: rebaseUri(prev.resource) });
                }
            }
            newLinearHistory[newLinearHistory.length - 1] = {
                ...lastEntry,
                stops: [...hadPostEditStop ? lastEntry.stops.slice(0, -1) : lastEntry.stops, snapshot]
            };
        }
        else {
            newLinearHistory.push({ requestId, startIndex: lastEntry ? lastEntry.startIndex + lastEntry.stops.length : 0, stops: [snapshot] });
        }
        transaction((tx) => {
            const last = newLinearHistory[newLinearHistory.length - 1];
            this._linearHistory.set(newLinearHistory, tx);
            this._linearHistoryIndex.set(last.startIndex + last.stops.length, tx);
        });
    }
    /**
     * Gets diff for text entries between stops.
     * @param entriesContent Observable that observes either snapshot entry
     * @param modelUrisObservable Observable that observes only the snapshot URIs.
     */
    _entryDiffBetweenTextStops(entriesContent, modelUrisObservable) {
        const modelRefsPromise = derived(this, (reader) => {
            const modelUris = modelUrisObservable.read(reader);
            if (!modelUris) {
                return undefined;
            }
            const store = reader.store.add(new DisposableStore());
            const promise = Promise.all(modelUris.map(u => this._textModelService.createModelReference(u))).then(refs => {
                if (store.isDisposed) {
                    refs.forEach(r => r.dispose());
                }
                else {
                    refs.forEach(r => store.add(r));
                }
                return refs;
            });
            return new ObservablePromise(promise);
        });
        return derived((reader) => {
            const refs2 = modelRefsPromise.read(reader)?.promiseResult.read(reader);
            const refs = refs2?.data;
            if (!refs) {
                return;
            }
            const entries = entriesContent.read(reader); // trigger re-diffing when contents change
            if (entries?.before && ChatEditingModifiedNotebookEntry.canHandleSnapshot(entries.before)) {
                const diffService = this._instantiationService.createInstance(ChatEditingModifiedNotebookDiff, entries.before, entries.after);
                return new ObservablePromise(diffService.computeDiff());
            }
            const ignoreTrimWhitespace = this._ignoreTrimWhitespaceObservable.read(reader);
            const promise = this._editorWorkerService.computeDiff(refs[0].object.textEditorModel.uri, refs[1].object.textEditorModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced').then((diff) => {
                const entryDiff = {
                    originalURI: refs[0].object.textEditorModel.uri,
                    modifiedURI: refs[1].object.textEditorModel.uri,
                    identical: !!diff?.identical,
                    quitEarly: !diff || diff.quitEarly,
                    added: 0,
                    removed: 0,
                };
                if (diff) {
                    for (const change of diff.changes) {
                        entryDiff.removed += change.original.endLineNumberExclusive - change.original.startLineNumber;
                        entryDiff.added += change.modified.endLineNumberExclusive - change.modified.startLineNumber;
                    }
                }
                return entryDiff;
            });
            return new ObservablePromise(promise);
        });
    }
    _createDiffBetweenStopsObservable(uri, requestId, stopId) {
        const entries = derivedOpts({
            equalsFn: (a, b) => snapshotsEqualForDiff(a?.before, b?.before) && snapshotsEqualForDiff(a?.after, b?.after),
        }, reader => {
            const stops = requestId ?
                getCurrentAndNextStop(requestId, stopId, this._linearHistory.read(reader)) :
                getFirstAndLastStop(uri, this._linearHistory.read(reader));
            if (!stops) {
                return undefined;
            }
            const before = stops.current.get(uri);
            const after = stops.next.get(uri);
            if (!before || !after) {
                return undefined;
            }
            return { before, after };
        });
        // Separate observable for model refs to avoid unnecessary disposal
        const modelUrisObservable = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, isEqual) }, reader => {
            const entriesValue = entries.read(reader);
            if (!entriesValue) {
                return undefined;
            }
            return [entriesValue.before.snapshotUri, entriesValue.after.snapshotUri];
        });
        const diff = this._entryDiffBetweenTextStops(entries, modelUrisObservable);
        return derived(reader => {
            return diff.read(reader)?.promiseResult.read(reader)?.data || undefined;
        });
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        if (requestId) {
            const key = `${uri}\0${requestId}\0${stopId}`;
            let observable = this._diffsBetweenStops.get(key);
            if (!observable) {
                observable = this._createDiffBetweenStopsObservable(uri, requestId, stopId);
                this._diffsBetweenStops.set(key, observable);
            }
            return observable;
        }
        else {
            const key = uri.toString();
            let observable = this._fullDiffs.get(key);
            if (!observable) {
                observable = this._createDiffBetweenStopsObservable(uri, requestId, stopId);
                this._fullDiffs.set(key, observable);
            }
            return observable;
        }
    }
};
ChatEditingTimeline = ChatEditingTimeline_1 = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, ITextModelService)
], ChatEditingTimeline);
export { ChatEditingTimeline };
function stopProvidesNewData(origin, target) {
    return Iterable.some(target.entries, ([uri, e]) => origin.entries.get(uri)?.current !== e.current);
}
function getMaxHistoryIndex(history) {
    const lastHistory = history.at(-1);
    return lastHistory ? lastHistory.startIndex + lastHistory.stops.length : 0;
}
function snapshotsEqualForDiff(a, b) {
    if (!a || !b) {
        return a === b;
    }
    return isEqual(a.snapshotUri, b.snapshotUri) && a.current === b.current;
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
    const currentStop = snapshot.stops[stopIndex];
    const current = currentStop.entries;
    const nextStop = stopIndex < snapshot.stops.length - 1
        ? snapshot.stops[stopIndex + 1]
        : undefined;
    if (!nextStop) {
        return undefined;
    }
    return { current, currentStopId: currentStop.stopId, next: nextStop.entries, nextStopId: nextStop.stopId };
}
function getFirstAndLastStop(uri, history) {
    let firstStopWithUri;
    for (const snapshot of history) {
        const stop = snapshot.stops.find(s => s.entries.has(uri));
        if (stop) {
            firstStopWithUri = stop;
            break;
        }
    }
    let lastStopWithUri;
    let lastStopWithUriId;
    for (let i = history.length - 1; i >= 0; i--) {
        const snapshot = history[i];
        const stop = findLast(snapshot.stops, s => s.entries.has(uri));
        if (stop) {
            lastStopWithUri = stop.entries;
            lastStopWithUriId = stop.stopId;
            break;
        }
    }
    if (!firstStopWithUri || !lastStopWithUri) {
        return undefined;
    }
    return { current: firstStopWithUri.entries, currentStopId: firstStopWithUri.stopId, next: lastStopWithUri, nextStopId: lastStopWithUriId };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUaW1lbGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nVGltZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUE2QixpQkFBaUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUosT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBSTdH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