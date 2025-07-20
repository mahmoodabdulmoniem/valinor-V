/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableSignal, runOnChange } from '../../../../base/common/observable.js';
import { AnnotatedStringEdit } from '../../../../editor/common/core/edits/stringEdit.js';
/**
 * Tracks a single document.
*/
export class DocumentEditSourceTracker extends Disposable {
    constructor(_doc, data) {
        super();
        this._doc = _doc;
        this.data = data;
        this._edits = AnnotatedStringEdit.empty;
        this._pendingExternalEdits = AnnotatedStringEdit.empty;
        this._update = observableSignal(this);
        this._sumAddedCharactersPerKey = new Map();
        this._register(runOnChange(this._doc.value, (_val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => e.edit));
            if (eComposed.replacements.every(e => e.data.source.category === 'external')) {
                if (this._edits.isEmpty()) {
                    // Ignore initial external edits
                }
                else {
                    // queue pending external edits
                    this._pendingExternalEdits = this._pendingExternalEdits.compose(eComposed);
                }
            }
            else {
                if (!this._pendingExternalEdits.isEmpty()) {
                    this._applyEdit(this._pendingExternalEdits);
                    this._pendingExternalEdits = AnnotatedStringEdit.empty;
                }
                this._applyEdit(eComposed);
            }
            this._update.trigger(undefined);
        }));
    }
    _applyEdit(e) {
        for (const r of e.replacements) {
            const existing = this._sumAddedCharactersPerKey.get(r.data.key) ?? 0;
            const newCount = existing + r.getNewLength();
            this._sumAddedCharactersPerKey.set(r.data.key, newCount);
        }
        this._edits = this._edits.compose(e);
    }
    async waitForQueue() {
        await this._doc.waitForQueue();
    }
    getChangedCharactersCount(key) {
        const val = this._sumAddedCharactersPerKey.get(key);
        return val ?? 0;
    }
    getTrackedRanges(reader) {
        this._update.read(reader);
        const ranges = this._edits.getNewRanges();
        return ranges.map((r, idx) => {
            const e = this._edits.replacements[idx];
            const te = new TrackedEdit(e.replaceRange, r, e.data.key, e.data.source, e.data.representative);
            return te;
        });
    }
    isEmpty() {
        return this._edits.isEmpty();
    }
    reset() {
        this._edits = AnnotatedStringEdit.empty;
    }
    _getDebugVisualization() {
        const ranges = this.getTrackedRanges();
        const txt = this._doc.value.get().value;
        return {
            ...{ $fileExtension: 'text.w' },
            'value': txt,
            'decorations': ranges.map(r => {
                return {
                    range: [r.range.start, r.range.endExclusive],
                    color: r.source.getColor(),
                };
            })
        };
    }
}
export class TrackedEdit {
    constructor(originalRange, range, sourceKey, source, sourceRepresentative) {
        this.originalRange = originalRange;
        this.range = range;
        this.sourceKey = sourceKey;
        this.source = source;
        this.sourceRepresentative = sourceRepresentative;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFRyYWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9lZGl0VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBVyxNQUFNLHVDQUF1QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBS3pGOztFQUVFO0FBQ0YsTUFBTSxPQUFPLHlCQUFvQyxTQUFRLFVBQVU7SUFPbEUsWUFDa0IsSUFBaUMsRUFDbEMsSUFBTztRQUV2QixLQUFLLEVBQUUsQ0FBQztRQUhTLFNBQUksR0FBSixJQUFJLENBQTZCO1FBQ2xDLFNBQUksR0FBSixJQUFJLENBQUc7UUFSaEIsV0FBTSxHQUEyQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7UUFDM0UsMEJBQXFCLEdBQTJDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQUVqRixZQUFPLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsOEJBQXlCLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFRM0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3JFLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEUs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