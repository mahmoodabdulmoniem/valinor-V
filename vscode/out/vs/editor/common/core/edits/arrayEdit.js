/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../ranges/offsetRange.js';
import { BaseEdit, BaseReplacement } from './edit.js';
/**
 * Represents a set of replacements to an array.
 * All these replacements are applied at once.
*/
export class ArrayEdit extends BaseEdit {
    static { this.empty = new ArrayEdit([]); }
    static create(replacements) {
        return new ArrayEdit(replacements);
    }
    static single(replacement) {
        return new ArrayEdit([replacement]);
    }
    static replace(range, replacement) {
        return new ArrayEdit([new ArrayReplacement(range, replacement)]);
    }
    static insert(offset, replacement) {
        return new ArrayEdit([new ArrayReplacement(OffsetRange.emptyAt(offset), replacement)]);
    }
    static delete(range) {
        return new ArrayEdit([new ArrayReplacement(range, [])]);
    }
    _createNew(replacements) {
        return new ArrayEdit(replacements);
    }
    apply(data) {
        const resultData = [];
        let pos = 0;
        for (const edit of this.replacements) {
            resultData.push(...data.slice(pos, edit.replaceRange.start));
            resultData.push(...edit.newValue);
            pos = edit.replaceRange.endExclusive;
        }
        resultData.push(...data.slice(pos));
        return resultData;
    }
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(baseVal) {
        const edits = [];
        let offset = 0;
        for (const e of this.replacements) {
            edits.push(new ArrayReplacement(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newValue.length), baseVal.slice(e.replaceRange.start, e.replaceRange.endExclusive)));
            offset += e.newValue.length - e.replaceRange.length;
        }
        return new ArrayEdit(edits);
    }
}
export class ArrayReplacement extends BaseReplacement {
    constructor(range, newValue) {
        super(range);
        this.newValue = newValue;
    }
    equals(other) {
        return this.replaceRange.equals(other.replaceRange) && this.newValue.length === other.newValue.length && this.newValue.every((v, i) => v === other.newValue[i]);
    }
    getNewLength() { return this.newValue.length; }
    tryJoinTouching(other) {
        return new ArrayReplacement(this.replaceRange.joinRightTouching(other.replaceRange), this.newValue.concat(other.newValue));
    }
    slice(range, rangeInReplacement) {
        return new ArrayReplacement(range, rangeInReplacement.slice(this.newValue));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlFZGl0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvZWRpdHMvYXJyYXlFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUV0RDs7O0VBR0U7QUFDRixNQUFNLE9BQU8sU0FBYSxTQUFRLFFBQTJDO2FBQ3JELFVBQUssR0FBRyxJQUFJLFNBQVMsQ0FBUSxFQUFFLENBQUMsQ0FBQztJQUVqRCxNQUFNLENBQUMsTUFBTSxDQUFJLFlBQTRDO1FBQ25FLE9BQU8sSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUksV0FBZ0M7UUFDdkQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUksS0FBa0IsRUFBRSxXQUF5QjtRQUNyRSxPQUFPLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFJLE1BQWMsRUFBRSxXQUF5QjtRQUNoRSxPQUFPLElBQUksU0FBUyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBSSxLQUFrQjtRQUN6QyxP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