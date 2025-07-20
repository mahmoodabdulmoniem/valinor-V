/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupAdjacentBy } from '../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { LineRange } from '../core/ranges/lineRange.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { TextReplacement, TextEdit } from '../core/edits/textEdit.js';
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 */
export class LineRangeMapping {
    static inverse(mapping, originalLineCount, modifiedLineCount) {
        const result = [];
        let lastOriginalEndLineNumber = 1;
        let lastModifiedEndLineNumber = 1;
        for (const m of mapping) {
            const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, m.original.startLineNumber), new LineRange(lastModifiedEndLineNumber, m.modified.startLineNumber));
            if (!r.modified.isEmpty) {
                result.push(r);
            }
            lastOriginalEndLineNumber = m.original.endLineNumberExclusive;
            lastModifiedEndLineNumber = m.modified.endLineNumberExclusive;
        }
        const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, originalLineCount + 1), new LineRange(lastModifiedEndLineNumber, modifiedLineCount + 1));
        if (!r.modified.isEmpty) {
            result.push(r);
        }
        return result;
    }
    static clip(mapping, originalRange, modifiedRange) {
        const result = [];
        for (const m of mapping) {
            const original = m.original.intersect(originalRange);
            const modified = m.modified.intersect(modifiedRange);
            if (original && !original.isEmpty && modified && !modified.isEmpty) {
                result.push(new LineRangeMapping(original, modified));
            }
        }
        return result;
    }
    constructor(originalRange, modifiedRange) {
        this.original = originalRange;
        this.modified = modifiedRange;
    }
    toString() {
        return `{${this.original.toString()}->${this.modified.toString()}}`;
    }
    flip() {
        return new LineRangeMapping(this.modified, this.original);
    }
    join(other) {
        return new LineRangeMapping(this.original.join(other.original), this.modified.join(other.modified));
    }
    get changedLineCount() {
        return Math.max(this.original.length, this.modified.length);
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
    */
    toRangeMapping() {
        const origInclusiveRange = this.original.toInclusiveRange();
        const modInclusiveRange = this.modified.toInclusiveRange();
        if (origInclusiveRange && modInclusiveRange) {
            return new RangeMapping(origInclusiveRange, modInclusiveRange);
        }
        else if (this.original.startLineNumber === 1 || this.modified.startLineNumber === 1) {
            if (!(this.modified.startLineNumber === 1 && this.original.startLineNumber === 1)) {
                // If one line range starts at 1, the other one must start at 1 as well.
                throw new BugIndicatingError('not a valid diff');
            }
            // Because one range is empty and both ranges start at line 1, none of the ranges can cover all lines.
            // Thus, `endLineNumberExclusive` is a valid line number.
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        else {
            // We can assume here that both startLineNumbers are greater than 1.
            return new RangeMapping(new Range(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), new Range(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER));
        }
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
    */
    toRangeMapping2(original, modified) {
        if (isValidLineNumber(this.original.endLineNumberExclusive, original)
            && isValidLineNumber(this.modified.endLineNumberExclusive, modified)) {
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        if (!this.original.isEmpty && !this.modified.isEmpty) {
            return new RangeMapping(Range.fromPositions(new Position(this.original.startLineNumber, 1), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(new Position(this.modified.startLineNumber, 1), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        if (this.original.startLineNumber > 1 && this.modified.startLineNumber > 1) {
            return new RangeMapping(Range.fromPositions(normalizePosition(new Position(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER), original), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(normalizePosition(new Position(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER), modified), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        // Situation now: one range is empty and one range touches the last line and one range starts at line 1.
        // I don't think this can happen.
        throw new BugIndicatingError();
    }
}
function normalizePosition(position, content) {
    if (position.lineNumber < 1) {
        return new Position(1, 1);
    }
    if (position.lineNumber > content.length) {
        return new Position(content.length, content[content.length - 1].length + 1);
    }
    const line = content[position.lineNumber - 1];
    if (position.column > line.length + 1) {
        return new Position(position.lineNumber, line.length + 1);
    }
    return position;
}
function isValidLineNumber(lineNumber, lines) {
    return lineNumber >= 1 && lineNumber <= lines.length;
}
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 * Also contains inner range mappings.
 */
export class DetailedLineRangeMapping extends LineRangeMapping {
    static toTextEdit(mapping, modified) {
        const replacements = [];
        for (const m of mapping) {
            for (const r of m.innerChanges ?? []) {
                const replacement = r.toTextEdit(modified);
                replacements.push(replacement);
            }
        }
        return new TextEdit(replacements);
    }
    static fromRangeMappings(rangeMappings) {
        const originalRange = LineRange.join(rangeMappings.map(r => LineRange.fromRangeInclusive(r.originalRange)));
        const modifiedRange = LineRange.join(rangeMappings.map(r => LineRange.fromRangeInclusive(r.modifiedRange)));
        return new DetailedLineRangeMapping(originalRange, modifiedRange, rangeMappings);
    }
    constructor(originalRange, modifiedRange, innerChanges) {
        super(originalRange, modifiedRange);
        this.innerChanges = innerChanges;
    }
    flip() {
        return new DetailedLineRangeMapping(this.modified, this.original, this.innerChanges?.map(c => c.flip()));
    }
    withInnerChangesFromLineRanges() {
        return new DetailedLineRangeMapping(this.original, this.modified, [this.toRangeMapping()]);
    }
}
/**
 * Maps a range in the original text model to a range in the modified text model.
 */
export class RangeMapping {
    static fromEdit(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.replacements.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return result;
    }
    static fromEditJoin(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.replacements.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return RangeMapping.join(result);
    }
    static join(rangeMappings) {
        if (rangeMappings.length === 0) {
            throw new BugIndicatingError('Cannot join an empty list of range mappings');
        }
        let result = rangeMappings[0];
        for (let i = 1; i < rangeMappings.length; i++) {
            result = result.join(rangeMappings[i]);
        }
        return result;
    }
    static assertSorted(rangeMappings) {
        for (let i = 1; i < rangeMappings.length; i++) {
            const previous = rangeMappings[i - 1];
            const current = rangeMappings[i];
            if (!(previous.originalRange.getEndPosition().isBeforeOrEqual(current.originalRange.getStartPosition())
                && previous.modifiedRange.getEndPosition().isBeforeOrEqual(current.modifiedRange.getStartPosition()))) {
                throw new BugIndicatingError('Range mappings must be sorted');
            }
        }
    }
    constructor(originalRange, modifiedRange) {
        this.originalRange = originalRange;
        this.modifiedRange = modifiedRange;
    }
    toString() {
        return `{${this.originalRange.toString()}->${this.modifiedRange.toString()}}`;
    }
    flip() {
        return new RangeMapping(this.modifiedRange, this.originalRange);
    }
    /**
     * Creates a single text edit that describes the change from the original to the modified text.
    */
    toTextEdit(modified) {
        const newText = modified.getValueOfRange(this.modifiedRange);
        return new TextReplacement(this.originalRange, newText);
    }
    join(other) {
        return new RangeMapping(this.originalRange.plusRange(other.originalRange), this.modifiedRange.plusRange(other.modifiedRange));
    }
}
export function lineRangeMappingFromRangeMappings(alignments, originalLines, modifiedLines, dontAssertStartLine = false) {
    const changes = [];
    for (const g of groupAdjacentBy(alignments.map(a => getLineRangeMapping(a, originalLines, modifiedLines)), (a1, a2) => a1.original.intersectsOrTouches(a2.original)
        || a1.modified.intersectsOrTouches(a2.modified))) {
        const first = g[0];
        const last = g[g.length - 1];
        changes.push(new DetailedLineRangeMapping(first.original.join(last.original), first.modified.join(last.modified), g.map(a => a.innerChanges[0])));
    }
    assertFn(() => {
        if (!dontAssertStartLine && changes.length > 0) {
            if (changes[0].modified.startLineNumber !== changes[0].original.startLineNumber) {
                return false;
            }
            if (modifiedLines.length.lineCount - changes[changes.length - 1].modified.endLineNumberExclusive !== originalLines.length.lineCount - changes[changes.length - 1].original.endLineNumberExclusive) {
                return false;
            }
        }
        return checkAdjacentItems(changes, (m1, m2) => m2.original.startLineNumber - m1.original.endLineNumberExclusive === m2.modified.startLineNumber - m1.modified.endLineNumberExclusive &&
            // There has to be an unchanged line in between (otherwise both diffs should have been joined)
            m1.original.endLineNumberExclusive < m2.original.startLineNumber &&
            m1.modified.endLineNumberExclusive < m2.modified.startLineNumber);
    });
    return changes;
}
export function getLineRangeMapping(rangeMapping, originalLines, modifiedLines) {
    let lineStartDelta = 0;
    let lineEndDelta = 0;
    // rangeMapping describes the edit that replaces `rangeMapping.originalRange` with `newText := getText(modifiedLines, rangeMapping.modifiedRange)`.
    // original: ]xxx \n <- this line is not modified
    // modified: ]xx  \n
    if (rangeMapping.modifiedRange.endColumn === 1 && rangeMapping.originalRange.endColumn === 1
        && rangeMapping.originalRange.startLineNumber + lineStartDelta <= rangeMapping.originalRange.endLineNumber
        && rangeMapping.modifiedRange.startLineNumber + lineStartDelta <= rangeMapping.modifiedRange.endLineNumber) {
        // We can only do this if the range is not empty yet
        lineEndDelta = -1;
    }
    // original: xxx[ \n <- this line is not modified
    // modified: xxx[ \n
    if (rangeMapping.modifiedRange.startColumn - 1 >= modifiedLines.getLineLength(rangeMapping.modifiedRange.startLineNumber)
        && rangeMapping.originalRange.startColumn - 1 >= originalLines.getLineLength(rangeMapping.originalRange.startLineNumber)
        && rangeMapping.originalRange.startLineNumber <= rangeMapping.originalRange.endLineNumber + lineEndDelta
        && rangeMapping.modifiedRange.startLineNumber <= rangeMapping.modifiedRange.endLineNumber + lineEndDelta) {
        // We can only do this if the range is not empty yet
        lineStartDelta = 1;
    }
    const originalLineRange = new LineRange(rangeMapping.originalRange.startLineNumber + lineStartDelta, rangeMapping.originalRange.endLineNumber + 1 + lineEndDelta);
    const modifiedLineRange = new LineRange(rangeMapping.modifiedRange.startLineNumber + lineStartDelta, rangeMapping.modifiedRange.endLineNumber + 1 + lineEndDelta);
    return new DetailedLineRangeMapping(originalLineRange, modifiedLineRange, [rangeMapping]);
}
export function lineRangeMappingFromChange(change) {
    let originalRange;
    if (change.originalEndLineNumber === 0) {
        // Insertion
        originalRange = new LineRange(change.originalStartLineNumber + 1, change.originalStartLineNumber + 1);
    }
    else {
        originalRange = new LineRange(change.originalStartLineNumber, change.originalEndLineNumber + 1);
    }
    let modifiedRange;
    if (change.modifiedEndLineNumber === 0) {
        // Deletion
        modifiedRange = new LineRange(change.modifiedStartLineNumber + 1, change.modifiedStartLineNumber + 1);
    }
    else {
        modifiedRange = new LineRange(change.modifiedStartLineNumber, change.modifiedEndLineNumber + 1);
    }
    return new LineRangeMapping(originalRange, modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvcmFuZ2VNYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUl0RTs7R0FFRztBQUNILE1BQU0sT0FBTyxnQkFBZ0I7SUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFvQyxFQUFFLGlCQUF5QixFQUFFLGlCQUF5QjtRQUMvRyxNQUFNLE1BQU0sR0FBdUIsRUFBRSxDQUFDO1FBQ3RDLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDO1FBRWxDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDN0IsSUFBSSxTQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFDcEUsSUFBSSxTQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FDcEUsQ0FBQztZQUNGLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLENBQUM7WUFDRCx5QkFBeUIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDO1lBQzlELHlCQUF5QixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUM7UUFDL0QsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLElBQUksZ0JBQWdCLENBQzdCLElBQUksU0FBUyxDQUFDLHlCQUF5QixFQUFFLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxFQUMvRCxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FDL0QsQ0FBQztRQUNGLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBb0MsRUFBRSxhQUF3QixFQUFFLGFBQXdCO1FBQzFHLE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFDdEMsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNyRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNyRCxJQUFJLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNwRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdkQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFZRCxZQUNDLGFBQXdCLEVBQ3hCLGFBQXdCO1FBRXhCLElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO1FBQzlCLElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQy9CLENBQUM7SUFHTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO0lBQ3JFLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTSxJQUFJLENBQUMsS0FBdUI7UUFDbEMsT0FBTyxJQUFJLGdCQUFnQixDQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDbEMsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQ7Ozs7TUFJRTtJQUNLLGNBQWM7UUFDcEIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDNUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDM0QsSUFBSSxrQkFBa0IsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBSSxZQUFZLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNoRSxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkYsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25GLHdFQUF3RTtnQkFDeEUsTUFBTSxJQUFJLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUVELHNHQUFzRztZQUN0Ryx5REFBeUQ7WUFDekQsT0FBTyxJQUFJLFlBQVksQ0FDdEIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQ3BGLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUNwRixDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxvRUFBb0U7WUFDcEUsT0FBTyxJQUFJLFlBQVksQ0FDdEIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFDeEksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FDeEksQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7TUFJRTtJQUNLLGVBQWUsQ0FBQyxRQUFrQixFQUFFLFFBQWtCO1FBQzVELElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLENBQUM7ZUFDakUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sSUFBSSxZQUFZLENBQ3RCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxFQUNwRixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FDcEYsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RELE9BQU8sSUFBSSxZQUFZLENBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQ2xCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUM5QyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FDNUcsRUFDRCxLQUFLLENBQUMsYUFBYSxDQUNsQixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFDOUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQzVHLENBQ0QsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1RSxPQUFPLElBQUksWUFBWSxDQUN0QixLQUFLLENBQUMsYUFBYSxDQUNsQixpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQ3JHLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUM1RyxFQUNELEtBQUssQ0FBQyxhQUFhLENBQ2xCLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLENBQUMsRUFDckcsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQzVHLENBQ0QsQ0FBQztRQUNILENBQUM7UUFFRCx3R0FBd0c7UUFDeEcsaUNBQWlDO1FBRWpDLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQ2hDLENBQUM7Q0FDRDtBQUVELFNBQVMsaUJBQWlCLENBQUMsUUFBa0IsRUFBRSxPQUFpQjtJQUMvRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUNELElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDMUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBQ0QsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdkMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsS0FBZTtJQUM3RCxPQUFPLFVBQVUsSUFBSSxDQUFDLElBQUksVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDdEQsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxnQkFBZ0I7SUFDdEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUE0QyxFQUFFLFFBQXNCO1FBQzVGLE1BQU0sWUFBWSxHQUFzQixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsYUFBNkI7UUFDNUQsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUcsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUcsT0FBTyxJQUFJLHdCQUF3QixDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQVVELFlBQ0MsYUFBd0IsRUFDeEIsYUFBd0IsRUFDeEIsWUFBd0M7UUFFeEMsS0FBSyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNsQyxDQUFDO0lBRWUsSUFBSTtRQUNuQixPQUFPLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRyxDQUFDO0lBRU0sOEJBQThCO1FBQ3BDLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDakIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFjO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQWM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FBQyxhQUE2QjtRQUMvQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUFDLGFBQTZCO1FBQ3ZELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0MsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLENBQ0osUUFBUSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO21CQUM5RixRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FDcEcsRUFBRSxDQUFDO2dCQUNILE1BQU0sSUFBSSxrQkFBa0IsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQy9ELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQVlELFlBQ0MsYUFBb0IsRUFDcEIsYUFBb0I7UUFFcEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7SUFDcEMsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7SUFDL0UsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7TUFFRTtJQUNLLFVBQVUsQ0FBQyxRQUFzQjtRQUN2QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM3RCxPQUFPLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVNLElBQUksQ0FBQyxLQUFtQjtRQUM5QixPQUFPLElBQUksWUFBWSxDQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQ2pELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FDakQsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxVQUFtQyxFQUFFLGFBQTJCLEVBQUUsYUFBMkIsRUFBRSxzQkFBK0IsS0FBSztJQUNwTCxNQUFNLE9BQU8sR0FBK0IsRUFBRSxDQUFDO0lBQy9DLEtBQUssTUFBTSxDQUFDLElBQUksZUFBZSxDQUM5QixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUN6RSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUNWLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQztXQUN6QyxFQUFFLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FDaEQsRUFBRSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSx3QkFBd0IsQ0FDeEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUNsQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQ2xDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzlCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsSUFBSSxDQUFDLG1CQUFtQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEQsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNqRixPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsS0FBSyxhQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDbk0sT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sa0JBQWtCLENBQUMsT0FBTyxFQUNoQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEtBQUssRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0I7WUFDaEosOEZBQThGO1lBQzlGLEVBQUUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlO1lBQ2hFLEVBQUUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQ2pFLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsWUFBMEIsRUFBRSxhQUEyQixFQUFFLGFBQTJCO0lBQ3ZILElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztJQUN2QixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7SUFFckIsbUpBQW1KO0lBRW5KLGlEQUFpRDtJQUNqRCxvQkFBb0I7SUFDcEIsSUFBSSxZQUFZLENBQUMsYUFBYSxDQUFDLFNBQVMsS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEtBQUssQ0FBQztXQUN4RixZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsR0FBRyxjQUFjLElBQUksWUFBWSxDQUFDLGFBQWEsQ0FBQyxhQUFhO1dBQ3ZHLFlBQVksQ0FBQyxhQUFhLENBQUMsZUFBZSxHQUFHLGNBQWMsSUFBSSxZQUFZLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzdHLG9EQUFvRDtRQUNwRCxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVELGlEQUFpRDtJQUNqRCxvQkFBb0I7SUFDcEIsSUFBSSxZQUFZLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQztXQUNySCxZQUFZLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQztXQUNySCxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsSUFBSSxZQUFZLENBQUMsYUFBYSxDQUFDLGFBQWEsR0FBRyxZQUFZO1dBQ3JHLFlBQVksQ0FBQyxhQUFhLENBQUMsZUFBZSxJQUFJLFlBQVksQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLFlBQVksRUFBRSxDQUFDO1FBQzNHLG9EQUFvRDtRQUNwRCxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksU0FBUyxDQUN0QyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsR0FBRyxjQUFjLEVBQzNELFlBQVksQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxZQUFZLENBQzNELENBQUM7SUFDRixNQUFNLGlCQUFpQixHQUFHLElBQUksU0FBUyxDQUN0QyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsR0FBRyxjQUFjLEVBQzNELFlBQVksQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxZQUFZLENBQzNELENBQUM7SUFFRixPQUFPLElBQUksd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsTUFBZTtJQUN6RCxJQUFJLGFBQXdCLENBQUM7SUFDN0IsSUFBSSxNQUFNLENBQUMscUJBQXFCLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEMsWUFBWTtRQUNaLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RyxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFFRCxJQUFJLGFBQXdCLENBQUM7SUFDN0IsSUFBSSxNQUFNLENBQUMscUJBQXFCLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEMsV0FBVztRQUNYLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RyxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFFRCxPQUFPLElBQUksZ0JBQWdCLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzNELENBQUMifQ==