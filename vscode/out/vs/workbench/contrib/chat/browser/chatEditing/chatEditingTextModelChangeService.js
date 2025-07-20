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
var ChatEditingTextModelChangeService_1;
import { addDisposableListener, getWindow } from '../../../../../base/browser/dom.js';
import { assert } from '../../../../../base/common/assert.js';
import { DeferredPromise, RunOnceScheduler, timeout } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { StringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { offsetEditFromContentChanges, offsetEditFromLineRangeMapping, offsetEditToEditOperations } from '../../../../../editor/common/model/textModelStringEdit.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { EditSources } from '../../../../../editor/common/textModelEditSource.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { editorSelectionBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { pendingRewriteMinimap } from './chatEditingModifiedFileEntry.js';
let ChatEditingTextModelChangeService = class ChatEditingTextModelChangeService extends Disposable {
    static { ChatEditingTextModelChangeService_1 = this; }
    static { this._lastEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-last-edit',
        className: 'chat-editing-last-edit-line',
        marginClassName: 'chat-editing-last-edit',
        overviewRuler: {
            position: OverviewRulerLane.Full,
            color: themeColorFromId(editorSelectionBackground)
        },
    }); }
    static { this._pendingEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-pending-edit',
        className: 'chat-editing-pending-edit',
        minimap: {
            position: 1 /* MinimapPosition.Inline */,
            color: themeColorFromId(pendingRewriteMinimap)
        }
    }); }
    static { this._atomicEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-atomic-edit',
        className: 'chat-editing-atomic-edit',
        minimap: {
            position: 1 /* MinimapPosition.Inline */,
            color: themeColorFromId(pendingRewriteMinimap)
        }
    }); }
    get isEditFromUs() {
        return this._isEditFromUs;
    }
    get allEditsAreFromUs() {
        return this._allEditsAreFromUs;
    }
    get diffInfo() {
        return this._diffInfo.map(value => {
            return {
                ...value,
                originalModel: this.originalModel,
                modifiedModel: this.modifiedModel,
                keep: changes => this._keepHunk(changes),
                undo: changes => this._undoHunk(changes)
            };
        });
    }
    constructor(originalModel, modifiedModel, state, _editorWorkerService, _accessibilitySignalService) {
        super();
        this.originalModel = originalModel;
        this.modifiedModel = modifiedModel;
        this.state = state;
        this._editorWorkerService = _editorWorkerService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._isEditFromUs = false;
        this._allEditsAreFromUs = true;
        this._diffOperationIds = 0;
        this._diffInfo = observableValue(this, nullDocumentDiff);
        this._editDecorationClear = this._register(new RunOnceScheduler(() => { this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []); }, 500));
        this._editDecorations = [];
        this._didAcceptOrRejectAllHunks = this._register(new Emitter());
        this.onDidAcceptOrRejectAllHunks = this._didAcceptOrRejectAllHunks.event;
        this._didUserEditModel = this._register(new Emitter());
        this.onDidUserEditModel = this._didUserEditModel.event;
        this._originalToModifiedEdit = StringEdit.empty;
        this._register(this.modifiedModel.onDidChangeContent(e => {
            this._mirrorEdits(e);
        }));
        this._register(toDisposable(() => {
            this.clearCurrentEditLineDecoration();
        }));
    }
    clearCurrentEditLineDecoration() {
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []);
    }
    async areOriginalAndModifiedIdentical() {
        const diff = await this._diffOperation;
        return diff ? diff.identical : false;
    }
    async acceptAgentEdits(resource, textEdits, isLastEdits, responseModel) {
        assertType(textEdits.every(TextEdit.isTextEdit), 'INVALID args, can only handle text edits');
        assert(isEqual(resource, this.modifiedModel.uri), ' INVALID args, can only edit THIS document');
        const isAtomicEdits = textEdits.length > 0 && isLastEdits;
        let maxLineNumber = 0;
        let rewriteRatio = 0;
        const sessionId = responseModel.session.sessionId;
        const request = responseModel.session.getRequests().at(-1);
        const source = EditSources.chatApplyEdits({ modelId: request?.modelId, requestId: request?.id, sessionId: sessionId });
        if (isAtomicEdits) {
            // EDIT and DONE
            const minimalEdits = await this._editorWorkerService.computeMoreMinimalEdits(this.modifiedModel.uri, textEdits) ?? textEdits;
            const ops = minimalEdits.map(TextEdit.asEditOperation);
            const undoEdits = this._applyEdits(ops, source);
            if (undoEdits.length > 0) {
                let range;
                for (let i = 0; i < undoEdits.length; i++) {
                    const op = undoEdits[i];
                    if (!range) {
                        range = Range.lift(op.range);
                    }
                    else {
                        range = Range.plusRange(range, op.range);
                    }
                }
                if (range) {
                    const defer = new DeferredPromise();
                    const listener = addDisposableListener(getWindow(undefined), 'animationend', e => {
                        if (e.animationName === 'kf-chat-editing-atomic-edit') { // CHECK with chat.css
                            defer.complete();
                            listener.dispose();
                        }
                    });
                    this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, [{
                            options: ChatEditingTextModelChangeService_1._atomicEditDecorationOptions,
                            range
                        }]);
                    await Promise.any([defer.p, timeout(500)]); // wait for animation to finish but also time-cap it
                    listener.dispose();
                }
            }
        }
        else {
            // EDIT a bit, then DONE
            const ops = textEdits.map(TextEdit.asEditOperation);
            const undoEdits = this._applyEdits(ops, source);
            maxLineNumber = undoEdits.reduce((max, op) => Math.max(max, op.range.startLineNumber), 0);
            rewriteRatio = Math.min(1, maxLineNumber / this.modifiedModel.getLineCount());
            const newDecorations = [
                // decorate pending edit (region)
                {
                    options: ChatEditingTextModelChangeService_1._pendingEditDecorationOptions,
                    range: new Range(maxLineNumber + 1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
                }
            ];
            if (maxLineNumber > 0) {
                // decorate last edit
                newDecorations.push({
                    options: ChatEditingTextModelChangeService_1._lastEditDecorationOptions,
                    range: new Range(maxLineNumber, 1, maxLineNumber, Number.MAX_SAFE_INTEGER)
                });
            }
            this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, newDecorations);
        }
        if (isLastEdits) {
            this._updateDiffInfoSeq();
            this._editDecorationClear.schedule();
        }
        return { rewriteRatio, maxLineNumber };
    }
    _applyEdits(edits, source) {
        try {
            this._isEditFromUs = true;
            // make the actual edit
            let result = [];
            this.modifiedModel.pushEditOperations(null, edits, (undoEdits) => {
                result = undoEdits;
                return null;
            }, undefined, source);
            return result;
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    /**
     * Keeps the current modified document as the final contents.
     */
    keep() {
        this.originalModel.setValue(this.modifiedModel.createSnapshot());
        this._diffInfo.set(nullDocumentDiff, undefined);
        this._originalToModifiedEdit = StringEdit.empty;
    }
    /**
     * Undoes the current modified document as the final contents.
     */
    undo() {
        this.modifiedModel.pushStackElement();
        this._applyEdits([(EditOperation.replace(this.modifiedModel.getFullModelRange(), this.originalModel.getValue()))], EditSources.chatUndoEdits());
        this.modifiedModel.pushStackElement();
        this._originalToModifiedEdit = StringEdit.empty;
        this._diffInfo.set(nullDocumentDiff, undefined);
    }
    async resetDocumentValues(newOriginal, newModified) {
        let didChange = false;
        if (newOriginal !== undefined) {
            this.originalModel.setValue(newOriginal);
            didChange = true;
        }
        if (newModified !== undefined && this.modifiedModel.getValue() !== newModified) {
            // NOTE that this isn't done via `setValue` so that the undo stack is preserved
            this.modifiedModel.pushStackElement();
            this._applyEdits([(EditOperation.replace(this.modifiedModel.getFullModelRange(), newModified))], EditSources.chatReset());
            this.modifiedModel.pushStackElement();
            didChange = true;
        }
        if (didChange) {
            await this._updateDiffInfoSeq();
        }
    }
    _mirrorEdits(event) {
        const edit = offsetEditFromContentChanges(event.changes);
        if (this._isEditFromUs) {
            const e_sum = this._originalToModifiedEdit;
            const e_ai = edit;
            this._originalToModifiedEdit = e_sum.compose(e_ai);
        }
        else {
            //           e_ai
            //   d0 ---------------> s0
            //   |                   |
            //   |                   |
            //   | e_user_r          | e_user
            //   |                   |
            //   |                   |
            //   v       e_ai_r      v
            ///  d1 ---------------> s1
            //
            // d0 - document snapshot
            // s0 - document
            // e_ai - ai edits
            // e_user - user edits
            //
            const e_ai = this._originalToModifiedEdit;
            const e_user = edit;
            const e_user_r = e_user.tryRebase(e_ai.inverse(this.originalModel.getValue()));
            if (e_user_r === undefined) {
                // user edits overlaps/conflicts with AI edits
                this._originalToModifiedEdit = e_ai.compose(e_user);
            }
            else {
                const edits = offsetEditToEditOperations(e_user_r, this.originalModel);
                this.originalModel.applyEdits(edits);
                this._originalToModifiedEdit = e_ai.rebaseSkipConflicting(e_user_r);
            }
            this._allEditsAreFromUs = false;
            this._updateDiffInfoSeq();
            this._didUserEditModel.fire();
        }
    }
    async _keepHunk(change) {
        if (!this._diffInfo.get().changes.includes(change)) {
            // diffInfo should have model version ids and check them (instead of the caller doing that)
            return false;
        }
        const edits = [];
        for (const edit of change.innerChanges ?? []) {
            const newText = this.modifiedModel.getValueInRange(edit.modifiedRange);
            edits.push(EditOperation.replace(edit.originalRange, newText));
        }
        this.originalModel.pushEditOperations(null, edits, _ => null);
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._didAcceptOrRejectAllHunks.fire(1 /* ModifiedFileEntryState.Accepted */);
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
        return true;
    }
    async _undoHunk(change) {
        if (!this._diffInfo.get().changes.includes(change)) {
            return false;
        }
        const edits = [];
        for (const edit of change.innerChanges ?? []) {
            const newText = this.originalModel.getValueInRange(edit.originalRange);
            edits.push(EditOperation.replace(edit.modifiedRange, newText));
        }
        this.modifiedModel.pushEditOperations(null, edits, _ => null);
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._didAcceptOrRejectAllHunks.fire(2 /* ModifiedFileEntryState.Rejected */);
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
        return true;
    }
    async _updateDiffInfoSeq() {
        const myDiffOperationId = ++this._diffOperationIds;
        await Promise.resolve(this._diffOperation);
        if (this._diffOperationIds === myDiffOperationId) {
            const thisDiffOperation = this._updateDiffInfo();
            this._diffOperation = thisDiffOperation;
            await thisDiffOperation;
        }
    }
    async _updateDiffInfo() {
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed() || this._store.isDisposed) {
            return undefined;
        }
        if (this.state.get() !== 0 /* ModifiedFileEntryState.Modified */) {
            this._diffInfo.set(nullDocumentDiff, undefined);
            this._originalToModifiedEdit = StringEdit.empty;
            return nullDocumentDiff;
        }
        const docVersionNow = this.modifiedModel.getVersionId();
        const snapshotVersionNow = this.originalModel.getVersionId();
        const diff = await this._editorWorkerService.computeDiff(this.originalModel.uri, this.modifiedModel.uri, {
            ignoreTrimWhitespace: false, // NEVER ignore whitespace so that undo/accept edits are correct and so that all changes (1 of 2) are spelled out
            computeMoves: false,
            maxComputationTimeMs: 3000
        }, 'advanced');
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed() || this._store.isDisposed) {
            return undefined;
        }
        // only update the diff if the documents didn't change in the meantime
        if (this.modifiedModel.getVersionId() === docVersionNow && this.originalModel.getVersionId() === snapshotVersionNow) {
            const diff2 = diff ?? nullDocumentDiff;
            this._diffInfo.set(diff2, undefined);
            this._originalToModifiedEdit = offsetEditFromLineRangeMapping(this.originalModel, this.modifiedModel, diff2.changes);
            return diff2;
        }
        return undefined;
    }
};
ChatEditingTextModelChangeService = ChatEditingTextModelChangeService_1 = __decorate([
    __param(3, IEditorWorkerService),
    __param(4, IAccessibilitySignalService)
], ChatEditingTextModelChangeService);
export { ChatEditingTextModelChangeService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUZXh0TW9kZWxDaGFuZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdUZXh0TW9kZWxDaGFuZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxvREFBb0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBaUIsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUU1RyxPQUFP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