/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
import { Range } from '../range.js';
import { findFirstIdxMonotonousOrArrLen, findLastIdxMonotonous, findLastMonotonous } from '../../../../base/common/arraysFind.js';
import { compareBy, numberComparator } from '../../../../base/common/arrays.js';
/**
 * A range of lines (1-based).
 */
export class LineRange {
    static ofLength(startLineNumber, length) {
        return new LineRange(startLineNumber, startLineNumber + length);
    }
    static fromRange(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber);
    }
    static fromRangeInclusive(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber + 1);
    }
    static { this.compareByStart = compareBy(l => l.startLineNumber, numberComparator); }
    static subtract(a, b) {
        if (!b) {
            return [a];
        }
        if (a.startLineNumber < b.startLineNumber && b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [
                new LineRange(a.startLineNumber, b.startLineNumber),
                new LineRange(b.endLineNumberExclusive, a.endLineNumberExclusive)
            ];
        }
        else if (b.startLineNumber <= a.startLineNumber && a.endLineNumberExclusive <= b.endLineNumberExclusive) {
            return [];
        }
        else if (b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [new LineRange(Math.max(b.endLineNumberExclusive, a.startLineNumber), a.endLineNumberExclusive)];
        }
        else {
            return [new LineRange(a.startLineNumber, Math.min(b.startLineNumber, a.endLineNumberExclusive))];
        }
    }
    /**
     * @param lineRanges An array of arrays of of sorted line ranges.
     */
    static joinMany(lineRanges) {
        if (lineRanges.length === 0) {
            return [];
        }
        let result = new LineRangeSet(lineRanges[0].slice());
        for (let i = 1; i < lineRanges.length; i++) {
            result = result.getUnion(new LineRangeSet(lineRanges[i].slice()));
        }
        return result.ranges;
    }
    static join(lineRanges) {
        if (lineRanges.length === 0) {
            throw new BugIndicatingError('lineRanges cannot be empty');
        }
        let startLineNumber = lineRanges[0].startLineNumber;
        let endLineNumberExclusive = lineRanges[0].endLineNumberExclusive;
        for (let i = 1; i < lineRanges.length; i++) {
            startLineNumber = Math.min(startLineNumber, lineRanges[i].startLineNumber);
            endLineNumberExclusive = Math.max(endLineNumberExclusive, lineRanges[i].endLineNumberExclusive);
        }
        return new LineRange(startLineNumber, endLineNumberExclusive);
    }
    /**
     * @internal
     */
    static deserialize(lineRange) {
        return new LineRange(lineRange[0], lineRange[1]);
    }
    constructor(startLineNumber, endLineNumberExclusive) {
        if (startLineNumber > endLineNumberExclusive) {
            throw new BugIndicatingError(`startLineNumber ${startLineNumber} cannot be after endLineNumberExclusive ${endLineNumberExclusive}`);
        }
        this.startLineNumber = startLineNumber;
        this.endLineNumberExclusive = endLineNumberExclusive;
    }
    /**
     * Indicates if this line range contains the given line number.
     */
    contains(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    containsRange(range) {
        return this.startLineNumber <= range.startLineNumber && range.endLineNumberExclusive <= this.endLineNumberExclusive;
    }
    /**
     * Indicates if this line range is empty.
     */
    get isEmpty() {
        return this.startLineNumber === this.endLineNumberExclusive;
    }
    /**
     * Moves this line range by the given offset of line numbers.
     */
    delta(offset) {
        return new LineRange(this.startLineNumber + offset, this.endLineNumberExclusive + offset);
    }
    deltaLength(offset) {
        return new LineRange(this.startLineNumber, this.endLineNumberExclusive + offset);
    }
    /**
     * The number of lines this line range spans.
     */
    get length() {
        return this.endLineNumberExclusive - this.startLineNumber;
    }
    /**
     * Creates a line range that combines this and the given line range.
     */
    join(other) {
        return new LineRange(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
    }
    toString() {
        return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
    }
    /**
     * The resulting range is empty if the ranges do not intersect, but touch.
     * If the ranges don't even touch, the result is undefined.
     */
    intersect(other) {
        const startLineNumber = Math.max(this.startLineNumber, other.startLineNumber);
        const endLineNumberExclusive = Math.min(this.endLineNumberExclusive, other.endLineNumberExclusive);
        if (startLineNumber <= endLineNumberExclusive) {
            return new LineRange(startLineNumber, endLineNumberExclusive);
        }
        return undefined;
    }
    intersectsStrict(other) {
        return this.startLineNumber < other.endLineNumberExclusive && other.startLineNumber < this.endLineNumberExclusive;
    }
    intersectsOrTouches(other) {
        return this.startLineNumber <= other.endLineNumberExclusive && other.startLineNumber <= this.endLineNumberExclusive;
    }
    equals(b) {
        return this.startLineNumber === b.startLineNumber && this.endLineNumberExclusive === b.endLineNumberExclusive;
    }
    toInclusiveRange() {
        if (this.isEmpty) {
            return null;
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
    }
    /**
     * @deprecated Using this function is discouraged because it might lead to bugs: The end position is not guaranteed to be a valid position!
    */
    toExclusiveRange() {
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
    }
    mapToLineArray(f) {
        const result = [];
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            result.push(f(lineNumber));
        }
        return result;
    }
    forEach(f) {
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            f(lineNumber);
        }
    }
    /**
     * @internal
     */
    serialize() {
        return [this.startLineNumber, this.endLineNumberExclusive];
    }
    /**
     * Converts this 1-based line range to a 0-based offset range (subtracts 1!).
     * @internal
     */
    toOffsetRange() {
        return new OffsetRange(this.startLineNumber - 1, this.endLineNumberExclusive - 1);
    }
    distanceToRange(other) {
        if (this.endLineNumberExclusive <= other.startLineNumber) {
            return other.startLineNumber - this.endLineNumberExclusive;
        }
        if (other.endLineNumberExclusive <= this.startLineNumber) {
            return this.startLineNumber - other.endLineNumberExclusive;
        }
        return 0;
    }
    distanceToLine(lineNumber) {
        if (this.contains(lineNumber)) {
            return 0;
        }
        if (lineNumber < this.startLineNumber) {
            return this.startLineNumber - lineNumber;
        }
        return lineNumber - this.endLineNumberExclusive;
    }
    addMargin(marginTop, marginBottom) {
        return new LineRange(this.startLineNumber - marginTop, this.endLineNumberExclusive + marginBottom);
    }
}
export class LineRangeSet {
    constructor(
    /**
     * Sorted by start line number.
     * No two line ranges are touching or intersecting.
     */
    _normalizedRanges = []) {
        this._normalizedRanges = _normalizedRanges;
    }
    get ranges() {
        return this._normalizedRanges;
    }
    addRange(range) {
        if (range.length === 0) {
            return;
        }
        // Idea: Find joinRange such that:
        // replaceRange = _normalizedRanges.replaceRange(joinRange, range.joinAll(joinRange.map(idx => this._normalizedRanges[idx])))
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            // If there is no element that touches range, then joinRangeStartIdx === joinRangeEndIdxExclusive and that value is the index of the element after range
            this._normalizedRanges.splice(joinRangeStartIdx, 0, range);
        }
        else if (joinRangeStartIdx === joinRangeEndIdxExclusive - 1) {
            // Else, there is an element that touches range and in this case it is both the first and last element. Thus we can replace it
            const joinRange = this._normalizedRanges[joinRangeStartIdx];
            this._normalizedRanges[joinRangeStartIdx] = joinRange.join(range);
        }
        else {
            // First and last element are different - we need to replace the entire range
            const joinRange = this._normalizedRanges[joinRangeStartIdx].join(this._normalizedRanges[joinRangeEndIdxExclusive - 1]).join(range);
            this._normalizedRanges.splice(joinRangeStartIdx, joinRangeEndIdxExclusive - joinRangeStartIdx, joinRange);
        }
    }
    contains(lineNumber) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, r => r.startLineNumber <= lineNumber);
        return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > lineNumber;
    }
    intersects(range) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, r => r.startLineNumber < range.endLineNumberExclusive);
        return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > range.startLineNumber;
    }
    getUnion(other) {
        if (this._normalizedRanges.length === 0) {
            return other;
        }
        if (other._normalizedRanges.length === 0) {
            return this;
        }
        const result = [];
        let i1 = 0;
        let i2 = 0;
        let current = null;
        while (i1 < this._normalizedRanges.length || i2 < other._normalizedRanges.length) {
            let next = null;
            if (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
                const lineRange1 = this._normalizedRanges[i1];
                const lineRange2 = other._normalizedRanges[i2];
                if (lineRange1.startLineNumber < lineRange2.startLineNumber) {
                    next = lineRange1;
                    i1++;
                }
                else {
                    next = lineRange2;
                    i2++;
                }
            }
            else if (i1 < this._normalizedRanges.length) {
                next = this._normalizedRanges[i1];
                i1++;
            }
            else {
                next = other._normalizedRanges[i2];
                i2++;
            }
            if (current === null) {
                current = next;
            }
            else {
                if (current.endLineNumberExclusive >= next.startLineNumber) {
                    // merge
                    current = new LineRange(current.startLineNumber, Math.max(current.endLineNumberExclusive, next.endLineNumberExclusive));
                }
                else {
                    // push
                    result.push(current);
                    current = next;
                }
            }
        }
        if (current !== null) {
            result.push(current);
        }
        return new LineRangeSet(result);
    }
    /**
     * Subtracts all ranges in this set from `range` and returns the result.
     */
    subtractFrom(range) {
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, r => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, r => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            return new LineRangeSet([range]);
        }
        const result = [];
        let startLineNumber = range.startLineNumber;
        for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
            const r = this._normalizedRanges[i];
            if (r.startLineNumber > startLineNumber) {
                result.push(new LineRange(startLineNumber, r.startLineNumber));
            }
            startLineNumber = r.endLineNumberExclusive;
        }
        if (startLineNumber < range.endLineNumberExclusive) {
            result.push(new LineRange(startLineNumber, range.endLineNumberExclusive));
        }
        return new LineRangeSet(result);
    }
    toString() {
        return this._normalizedRanges.map(r => r.toString()).join(', ');
    }
    getIntersection(other) {
        const result = [];
        let i1 = 0;
        let i2 = 0;
        while (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
            const r1 = this._normalizedRanges[i1];
            const r2 = other._normalizedRanges[i2];
            const i = r1.intersect(r2);
            if (i && !i.isEmpty) {
                result.push(i);
            }
            if (r1.endLineNumberExclusive < r2.endLineNumberExclusive) {
                i1++;
            }
            else {
                i2++;
            }
        }
        return new LineRangeSet(result);
    }
    getWithDelta(value) {
        return new LineRangeSet(this._normalizedRanges.map(r => r.delta(value)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvcmFuZ2VzL2xpbmVSYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwQyxPQUFPLEVBQUUsOEJBQThCLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsSSxPQUFPLEVBQWMsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQUNkLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBdUIsRUFBRSxNQUFjO1FBQzdELE9BQU8sSUFBSSxTQUFTLENBQUMsZUFBZSxFQUFFLGVBQWUsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFZO1FBQ25DLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFZO1FBQzVDLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7YUFFc0IsbUJBQWMsR0FBMEIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVB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