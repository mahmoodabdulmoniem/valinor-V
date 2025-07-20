/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, concatArrays, numberComparator } from '../../../../../base/common/arrays.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { LineRangeEdit } from './editing.js';
import { MergeEditorLineRange } from './lineRange.js';
import { addLength, lengthBetweenPositions, rangeContainsPosition, rangeIsBeforeOrTouching } from './rangeUtils.js';
/**
 * Represents a mapping of an input line range to an output line range.
*/
export class LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => acc ? acc.join(cur) : cur, undefined);
    }
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    extendInputRange(extendedInputRange) {
        if (!extendedInputRange.containsRange(this.inputRange)) {
            throw new BugIndicatingError();
        }
        const startDelta = extendedInputRange.startLineNumber - this.inputRange.startLineNumber;
        const endDelta = extendedInputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
        return new LineRangeMapping(extendedInputRange, MergeEditorLineRange.fromLength(this.outputRange.startLineNumber + startDelta, this.outputRange.length - startDelta + endDelta));
    }
    join(other) {
        return new LineRangeMapping(this.inputRange.join(other.inputRange), this.outputRange.join(other.outputRange));
    }
    get resultingDeltaFromOriginalToModified() {
        return this.outputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
    }
    toString() {
        return `${this.inputRange.toString()} -> ${this.outputRange.toString()}`;
    }
    addOutputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange, this.outputRange.delta(delta));
    }
    addInputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange.delta(delta), this.outputRange);
    }
    reverse() {
        return new LineRangeMapping(this.outputRange, this.inputRange);
    }
}
/**
* Represents a total monotonous mapping of line ranges in one document to another document.
*/
export class DocumentLineRangeMap {
    static betweenOutputs(inputToOutput1, inputToOutput2, inputLineCount) {
        const alignments = MappingAlignment.compute(inputToOutput1, inputToOutput2);
        const mappings = alignments.map((m) => new LineRangeMapping(m.output1Range, m.output2Range));
        return new DocumentLineRangeMap(mappings, inputLineCount);
    }
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * The space between two input ranges must equal the space between two output ranges.
     * These holes act as dense sequence of 1:1 line mappings.
    */
    lineRangeMappings, inputLineCount) {
        this.lineRangeMappings = lineRangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => {
            return checkAdjacentItems(lineRangeMappings, (m1, m2) => m1.inputRange.isBefore(m2.inputRange) && m1.outputRange.isBefore(m2.outputRange) &&
                m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive === m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive);
        });
    }
    project(lineNumber) {
        const lastBefore = findLast(this.lineRangeMappings, r => r.inputRange.startLineNumber <= lineNumber);
        if (!lastBefore) {
            return new LineRangeMapping(MergeEditorLineRange.fromLength(lineNumber, 1), MergeEditorLineRange.fromLength(lineNumber, 1));
        }
        if (lastBefore.inputRange.contains(lineNumber)) {
            return lastBefore;
        }
        const containingRange = MergeEditorLineRange.fromLength(lineNumber, 1);
        const mappedRange = MergeEditorLineRange.fromLength(lineNumber +
            lastBefore.outputRange.endLineNumberExclusive -
            lastBefore.inputRange.endLineNumberExclusive, 1);
        return new LineRangeMapping(containingRange, mappedRange);
    }
    get outputLineCount() {
        const last = this.lineRangeMappings.at(-1);
        const diff = last ? last.outputRange.endLineNumberExclusive - last.inputRange.endLineNumberExclusive : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentLineRangeMap(this.lineRangeMappings.map(r => r.reverse()), this.outputLineCount);
    }
}
/**
 * Aligns two mappings with a common input range.
 */
export class MappingAlignment {
    static compute(fromInputToOutput1, fromInputToOutput2) {
        const compareByStartLineNumber = compareBy((d) => d.inputRange.startLineNumber, numberComparator);
        const combinedDiffs = concatArrays(fromInputToOutput1.map((diff) => ({ source: 0, diff })), fromInputToOutput2.map((diff) => ({ source: 1, diff }))).sort(compareBy((d) => d.diff, compareByStartLineNumber));
        const currentDiffs = [new Array(), new Array()];
        const deltaFromBaseToInput = [0, 0];
        const alignments = new Array();
        function pushAndReset(inputRange) {
            const mapping1 = LineRangeMapping.join(currentDiffs[0]) || new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[0]));
            const mapping2 = LineRangeMapping.join(currentDiffs[1]) || new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[1]));
            alignments.push(new MappingAlignment(currentInputRange, mapping1.extendInputRange(currentInputRange).outputRange, currentDiffs[0], mapping2.extendInputRange(currentInputRange).outputRange, currentDiffs[1]));
            currentDiffs[0] = [];
            currentDiffs[1] = [];
        }
        let currentInputRange;
        for (const diff of combinedDiffs) {
            const range = diff.diff.inputRange;
            if (currentInputRange && !currentInputRange.intersectsOrTouches(range)) {
                pushAndReset(currentInputRange);
                currentInputRange = undefined;
            }
            deltaFromBaseToInput[diff.source] =
                diff.diff.resultingDeltaFromOriginalToModified;
            currentInputRange = currentInputRange ? currentInputRange.join(range) : range;
            currentDiffs[diff.source].push(diff.diff);
        }
        if (currentInputRange) {
            pushAndReset(currentInputRange);
        }
        return alignments;
    }
    constructor(inputRange, output1Range, output1LineMappings, output2Range, output2LineMappings) {
        this.inputRange = inputRange;
        this.output1Range = output1Range;
        this.output1LineMappings = output1LineMappings;
        this.output2Range = output2Range;
        this.output2LineMappings = output2LineMappings;
    }
    toString() {
        return `${this.output1Range} <- ${this.inputRange} -> ${this.output2Range}`;
    }
}
/**
 * A line range mapping with inner range mappings.
*/
export class DetailedLineRangeMapping extends LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => acc ? acc.join(cur) : cur, undefined);
    }
    constructor(inputRange, inputTextModel, outputRange, outputTextModel, rangeMappings) {
        super(inputRange, outputRange);
        this.inputTextModel = inputTextModel;
        this.outputTextModel = outputTextModel;
        this.rangeMappings = rangeMappings || [new RangeMapping(this.inputRange.toExclusiveRange(), this.outputRange.toExclusiveRange())];
    }
    addOutputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange, this.inputTextModel, this.outputRange.delta(delta), this.outputTextModel, this.rangeMappings.map(d => d.addOutputLineDelta(delta)));
    }
    addInputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange.delta(delta), this.inputTextModel, this.outputRange, this.outputTextModel, this.rangeMappings.map(d => d.addInputLineDelta(delta)));
    }
    join(other) {
        return new DetailedLineRangeMapping(this.inputRange.join(other.inputRange), this.inputTextModel, this.outputRange.join(other.outputRange), this.outputTextModel);
    }
    getLineEdit() {
        return new LineRangeEdit(this.inputRange, this.getOutputLines());
    }
    getReverseLineEdit() {
        return new LineRangeEdit(this.outputRange, this.getInputLines());
    }
    getOutputLines() {
        return this.outputRange.getLines(this.outputTextModel);
    }
    getInputLines() {
        return this.inputRange.getLines(this.inputTextModel);
    }
}
/**
 * Represents a mapping of an input range to an output range.
*/
export class RangeMapping {
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    toString() {
        function rangeToString(range) {
            // TODO@hediet make this the default Range.toString
            return `[${range.startLineNumber}:${range.startColumn}, ${range.endLineNumber}:${range.endColumn})`;
        }
        return `${rangeToString(this.inputRange)} -> ${rangeToString(this.outputRange)}`;
    }
    addOutputLineDelta(deltaLines) {
        return new RangeMapping(this.inputRange, new Range(this.outputRange.startLineNumber + deltaLines, this.outputRange.startColumn, this.outputRange.endLineNumber + deltaLines, this.outputRange.endColumn));
    }
    addInputLineDelta(deltaLines) {
        return new RangeMapping(new Range(this.inputRange.startLineNumber + deltaLines, this.inputRange.startColumn, this.inputRange.endLineNumber + deltaLines, this.inputRange.endColumn), this.outputRange);
    }
    reverse() {
        return new RangeMapping(this.outputRange, this.inputRange);
    }
}
/**
* Represents a total monotonous mapping of ranges in one document to another document.
*/
export class DocumentRangeMap {
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * Can have holes.
    */
    rangeMappings, inputLineCount) {
        this.rangeMappings = rangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => checkAdjacentItems(rangeMappings, (m1, m2) => rangeIsBeforeOrTouching(m1.inputRange, m2.inputRange) &&
            rangeIsBeforeOrTouching(m1.outputRange, m2.outputRange) /*&&
        lengthBetweenPositions(m1.inputRange.getEndPosition(), m2.inputRange.getStartPosition()).equals(
            lengthBetweenPositions(m1.outputRange.getEndPosition(), m2.outputRange.getStartPosition())
        )*/));
    }
    project(position) {
        const lastBefore = findLast(this.rangeMappings, r => r.inputRange.getStartPosition().isBeforeOrEqual(position));
        if (!lastBefore) {
            return new RangeMapping(Range.fromPositions(position, position), Range.fromPositions(position, position));
        }
        if (rangeContainsPosition(lastBefore.inputRange, position)) {
            return lastBefore;
        }
        const dist = lengthBetweenPositions(lastBefore.inputRange.getEndPosition(), position);
        const outputPos = addLength(lastBefore.outputRange.getEndPosition(), dist);
        return new RangeMapping(Range.fromPositions(position), Range.fromPositions(outputPos));
    }
    projectRange(range) {
        const start = this.project(range.getStartPosition());
        const end = this.project(range.getEndPosition());
        return new RangeMapping(start.inputRange.plusRange(end.inputRange), start.outputRange.plusRange(end.outputRange));
    }
    get outputLineCount() {
        const last = this.rangeMappings.at(-1);
        const diff = last ? last.outputRange.endLineNumber - last.inputRange.endLineNumber : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentRangeMap(this.rangeMappings.map(m => m.reverse()), this.outputLineCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9tYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFcEg7O0VBRUU7QUFDRixNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBcUM7UUFDdkQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUErQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzFHLENBQUM7SUFDRCxZQUNpQixVQUFnQyxFQUNoQyxXQUFpQztR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