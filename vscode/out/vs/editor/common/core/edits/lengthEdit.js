/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../ranges/offsetRange.js';
import { BaseEdit, BaseReplacement } from './edit.js';
/**
 * Like a normal edit, but only captures the length information.
*/
export class LengthEdit extends BaseEdit {
    static { this.empty = new LengthEdit([]); }
    static fromEdit(edit) {
        return new LengthEdit(edit.replacements.map(r => new LengthReplacement(r.replaceRange, r.getNewLength())));
    }
    static create(replacements) {
        return new LengthEdit(replacements);
    }
    static single(replacement) {
        return new LengthEdit([replacement]);
    }
    static replace(range, newLength) {
        return new LengthEdit([new LengthReplacement(range, newLength)]);
    }
    static insert(offset, newLength) {
        return new LengthEdit([new LengthReplacement(OffsetRange.emptyAt(offset), newLength)]);
    }
    static delete(range) {
        return new LengthEdit([new LengthReplacement(range, 0)]);
    }
    static compose(edits) {
        let e = LengthEdit.empty;
        for (const edit of edits) {
            e = e.compose(edit);
        }
        return e;
    }
    /**
     * Creates an edit that reverts this edit.
     */
    inverse() {
        const edits = [];
        let offset = 0;
        for (const e of this.replacements) {
            edits.push(new LengthReplacement(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newLength), e.replaceRange.length));
            offset += e.newLength - e.replaceRange.length;
        }
        return new LengthEdit(edits);
    }
    _createNew(replacements) {
        return new LengthEdit(replacements);
    }
    applyArray(arr, fillItem) {
        const newArr = new Array(this.getNewDataLength(arr.length));
        let srcPos = 0;
        let dstPos = 0;
        for (const replacement of this.replacements) {
            // Copy items before the current replacement
            for (let i = srcPos; i < replacement.replaceRange.start; i++) {
                newArr[dstPos++] = arr[i];
            }
            // Skip the replaced items in the source array
            srcPos = replacement.replaceRange.endExclusive;
            // Fill with the provided fillItem for insertions
            for (let i = 0; i < replacement.newLength; i++) {
                newArr[dstPos++] = fillItem;
            }
        }
        // Copy any remaining items from the original array
        while (srcPos < arr.length) {
            newArr[dstPos++] = arr[srcPos++];
        }
        return newArr;
    }
}
export class LengthReplacement extends BaseReplacement {
    static create(startOffset, endOffsetExclusive, newLength) {
        return new LengthReplacement(new OffsetRange(startOffset, endOffsetExclusive), newLength);
    }
    constructor(range, newLength) {
        super(range);
        this.newLength = newLength;
    }
    equals(other) {
        return this.replaceRange.equals(other.replaceRange) && this.newLength === other.newLength;
    }
    getNewLength() { return this.newLength; }
    tryJoinTouching(other) {
        return new LengthReplacement(this.replaceRange.joinRightTouching(other.replaceRange), this.newLength + other.newLength);
    }
    slice(range, rangeInReplacement) {
        return new LengthReplacement(range, rangeInReplacement.length);
    }
    toString() {
        return `[${this.replaceRange.start}, +${this.replaceRange.length}) -> +${this.newLength}}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVuZ3RoRWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2VkaXRzL2xlbmd0aEVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBVyxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRS9EOztFQUVFO0FBQ0YsTUFBTSxPQUFPLFVBQVcsU0FBUSxRQUF1QzthQUMvQyxVQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFhO1FBQ25DLE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQTBDO1FBQzlELE9BQU8sSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBOEI7UUFDbEQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBa0IsRUFBRSxTQUFpQjtRQUMxRCxPQUFPLElBQUksVUFBVSxDQUFDLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFF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