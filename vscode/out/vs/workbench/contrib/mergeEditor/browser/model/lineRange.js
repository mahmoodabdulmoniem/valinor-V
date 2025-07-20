/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../editor/common/core/range.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
/**
 * TODO: Deprecate in favor of LineRange!
 */
export class MergeEditorLineRange extends LineRange {
    static fromLineNumbers(startLineNumber, endExclusiveLineNumber) {
        return MergeEditorLineRange.fromLength(startLineNumber, endExclusiveLineNumber - startLineNumber);
    }
    static fromLength(startLineNumber, length) {
        return new MergeEditorLineRange(startLineNumber, startLineNumber + length);
    }
    join(other) {
        return MergeEditorLineRange.fromLineNumbers(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
    }
    isAfter(range) {
        return this.startLineNumber >= range.endLineNumberExclusive;
    }
    isBefore(range) {
        return range.startLineNumber >= this.endLineNumberExclusive;
    }
    delta(lineDelta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber + lineDelta, this.length);
    }
    deltaEnd(delta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber, this.length + delta);
    }
    deltaStart(lineDelta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber + lineDelta, this.length - lineDelta);
    }
    getLines(model) {
        const result = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = model.getLineContent(this.startLineNumber + i);
        }
        return result;
    }
    toInclusiveRangeOrEmpty() {
        if (this.isEmpty) {
            return new Range(this.startLineNumber, 1, this.startLineNumber, 1);
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL2xpbmVSYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBR2xGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUF1QixFQUFFLHNCQUE4QjtRQUM3RSxPQUFPLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLEdBQUcsZUFBZSxDQUFDLENBQUM7SUFDbkcsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsZUFBdUIsRUFBRSxNQUFjO1FBQ3hELE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsZUFBZSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFZSxJQUFJLENBQUMsS0FBMkI7UUFDL0MsT0FBTyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBQ3pLLENBQUM7SUFFTSxPQUFPLENBQUMsS0FBMkI7UUFDekMsT0FBTyxJQUFJLENBQUMsZUFBZSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztJQUM3RCxDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQTJCO1FBQzFDLE9BQU8sS0FBSyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUM7SUFDN0QsQ0FBQztJQUVlLEtBQUssQ0FBQyxTQUFpQjtRQUN0QyxPQUFPLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFhO1FBQzVCLE9BQU8sb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRU0sVUFBVSxDQUFDLFNBQWlCO1FBQ2xDLE9BQU8sb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDbkcsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFpQjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSx1QkFBdUI7UUFDN0IsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLG9EQUFtQyxDQUFDO0lBQzlHLENBQUM7Q0FDRCJ9