/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, equals } from '../../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../../base/common/assert.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { commonPrefixLength, commonSuffixLength } from '../../../../base/common/strings.js';
import { Position } from '../position.js';
import { Range } from '../range.js';
import { TextLength } from '../text/textLength.js';
import { StringText } from '../text/abstractText.js';
export class TextEdit {
    static fromStringEdit(edit, initialState) {
        const edits = edit.replacements.map(e => TextReplacement.fromStringReplacement(e, initialState));
        return new TextEdit(edits);
    }
    static replace(originalRange, newText) {
        return new TextEdit([new TextReplacement(originalRange, newText)]);
    }
    static delete(range) {
        return new TextEdit([new TextReplacement(range, '')]);
    }
    static insert(position, newText) {
        return new TextEdit([new TextReplacement(Range.fromPositions(position, position), newText)]);
    }
    static fromParallelReplacementsUnsorted(replacements) {
        const r = replacements.slice().sort(compareBy(i => i.range, Range.compareRangesUsingStarts));
        return new TextEdit(r);
    }
    constructor(replacements) {
        this.replacements = replacements;
        assertFn(() => checkAdjacentItems(replacements, (a, b) => a.range.getEndPosition().isBeforeOrEqual(b.range.getStartPosition())));
    }
    /**
     * Joins touching edits and removes empty edits.
     */
    normalize() {
        const replacements = [];
        for (const r of this.replacements) {
            if (replacements.length > 0 && replacements[replacements.length - 1].range.getEndPosition().equals(r.range.getStartPosition())) {
                const last = replacements[replacements.length - 1];
                replacements[replacements.length - 1] = new TextReplacement(last.range.plusRange(r.range), last.text + r.text);
            }
            else if (!r.isEmpty) {
                replacements.push(r);
            }
        }
        return new TextEdit(replacements);
    }
    mapPosition(position) {
        let lineDelta = 0;
        let curLine = 0;
        let columnDeltaInCurLine = 0;
        for (const replacement of this.replacements) {
            const start = replacement.range.getStartPosition();
            if (position.isBeforeOrEqual(start)) {
                break;
            }
            const end = replacement.range.getEndPosition();
            const len = TextLength.ofText(replacement.text);
            if (position.isBefore(end)) {
                const startPos = new Position(start.lineNumber + lineDelta, start.column + (start.lineNumber + lineDelta === curLine ? columnDeltaInCurLine : 0));
                const endPos = len.addToPosition(startPos);
                return rangeFromPositions(startPos, endPos);
            }
            if (start.lineNumber + lineDelta !== curLine) {
                columnDeltaInCurLine = 0;
            }
            lineDelta += len.lineCount - (replacement.range.endLineNumber - replacement.range.startLineNumber);
            if (len.lineCount === 0) {
                if (end.lineNumber !== start.lineNumber) {
                    columnDeltaInCurLine += len.columnCount - (end.column - 1);
                }
                else {
                    columnDeltaInCurLine += len.columnCount - (end.column - start.column);
                }
            }
            else {
                columnDeltaInCurLine = len.columnCount;
            }
            curLine = end.lineNumber + lineDelta;
        }
        return new Position(position.lineNumber + lineDelta, position.column + (position.lineNumber + lineDelta === curLine ? columnDeltaInCurLine : 0));
    }
    mapRange(range) {
        function getStart(p) {
            return p instanceof Position ? p : p.getStartPosition();
        }
        function getEnd(p) {
            return p instanceof Position ? p : p.getEndPosition();
        }
        const start = getStart(this.mapPosition(range.getStartPosition()));
        const end = getEnd(this.mapPosition(range.getEndPosition()));
        return rangeFromPositions(start, end);
    }
    // TODO: `doc` is not needed for this!
    inverseMapPosition(positionAfterEdit, doc) {
        const reversed = this.inverse(doc);
        return reversed.mapPosition(positionAfterEdit);
    }
    inverseMapRange(range, doc) {
        const reversed = this.inverse(doc);
        return reversed.mapRange(range);
    }
    apply(text) {
        let result = '';
        let lastEditEnd = new Position(1, 1);
        for (const replacement of this.replacements) {
            const editRange = replacement.range;
            const editStart = editRange.getStartPosition();
            const editEnd = editRange.getEndPosition();
            const r = rangeFromPositions(lastEditEnd, editStart);
            if (!r.isEmpty()) {
                result += text.getValueOfRange(r);
            }
            result += replacement.text;
            lastEditEnd = editEnd;
        }
        const r = rangeFromPositions(lastEditEnd, text.endPositionExclusive);
        if (!r.isEmpty()) {
            result += text.getValueOfRange(r);
        }
        return result;
    }
    applyToString(str) {
        const strText = new StringText(str);
        return this.apply(strText);
    }
    inverse(doc) {
        const ranges = this.getNewRanges();
        return new TextEdit(this.replacements.map((e, idx) => new TextReplacement(ranges[idx], doc.getValueOfRange(e.range))));
    }
    getNewRanges() {
        const newRanges = [];
        let previousEditEndLineNumber = 0;
        let lineOffset = 0;
        let columnOffset = 0;
        for (const replacement of this.replacements) {
            const textLength = TextLength.ofText(replacement.text);
            const newRangeStart = Position.lift({
                lineNumber: replacement.range.startLineNumber + lineOffset,
                column: replacement.range.startColumn + (replacement.range.startLineNumber === previousEditEndLineNumber ? columnOffset : 0)
            });
            const newRange = textLength.createRange(newRangeStart);
            newRanges.push(newRange);
            lineOffset = newRange.endLineNumber - replacement.range.endLineNumber;
            columnOffset = newRange.endColumn - replacement.range.endColumn;
            previousEditEndLineNumber = replacement.range.endLineNumber;
        }
        return newRanges;
    }
    toReplacement(text) {
        if (this.replacements.length === 0) {
            throw new BugIndicatingError();
        }
        if (this.replacements.length === 1) {
            return this.replacements[0];
        }
        const startPos = this.replacements[0].range.getStartPosition();
        const endPos = this.replacements[this.replacements.length - 1].range.getEndPosition();
        let newText = '';
        for (let i = 0; i < this.replacements.length; i++) {
            const curEdit = this.replacements[i];
            newText += curEdit.text;
            if (i < this.replacements.length - 1) {
                const nextEdit = this.replacements[i + 1];
                const gapRange = Range.fromPositions(curEdit.range.getEndPosition(), nextEdit.range.getStartPosition());
                const gapText = text.getValueOfRange(gapRange);
                newText += gapText;
            }
        }
        return new TextReplacement(Range.fromPositions(startPos, endPos), newText);
    }
    equals(other) {
        return equals(this.replacements, other.replacements, (a, b) => a.equals(b));
    }
    toString(text) {
        if (text === undefined) {
            return this.replacements.map(edit => edit.toString()).join('\n');
        }
        if (typeof text === 'string') {
            return this.toString(new StringText(text));
        }
        if (this.replacements.length === 0) {
            return '';
        }
        return this.replacements.map(r => {
            const maxLength = 10;
            const originalText = text.getValueOfRange(r.range);
            // Get text before the edit
            const beforeRange = Range.fromPositions(new Position(Math.max(1, r.range.startLineNumber - 1), 1), r.range.getStartPosition());
            let beforeText = text.getValueOfRange(beforeRange);
            if (beforeText.length > maxLength) {
                beforeText = '...' + beforeText.substring(beforeText.length - maxLength);
            }
            // Get text after the edit
            const afterRange = Range.fromPositions(r.range.getEndPosition(), new Position(r.range.endLineNumber + 1, 1));
            let afterText = text.getValueOfRange(afterRange);
            if (afterText.length > maxLength) {
                afterText = afterText.substring(0, maxLength) + '...';
            }
            // Format the replaced text
            let replacedText = originalText;
            if (replacedText.length > maxLength) {
                const halfMax = Math.floor(maxLength / 2);
                replacedText = replacedText.substring(0, halfMax) + '...' +
                    replacedText.substring(replacedText.length - halfMax);
            }
            // Format the new text
            let newText = r.text;
            if (newText.length > maxLength) {
                const halfMax = Math.floor(maxLength / 2);
                newText = newText.substring(0, halfMax) + '...' +
                    newText.substring(newText.length - halfMax);
            }
            if (replacedText.length === 0) {
                // allow-any-unicode-next-line
                return `${beforeText}❰${newText}❱${afterText}`;
            }
            // allow-any-unicode-next-line
            return `${beforeText}❰${replacedText}↦${newText}❱${afterText}`;
        }).join('\n');
    }
}
export class TextReplacement {
    static joinReplacements(replacements, initialValue) {
        if (replacements.length === 0) {
            throw new BugIndicatingError();
        }
        if (replacements.length === 1) {
            return replacements[0];
        }
        const startPos = replacements[0].range.getStartPosition();
        const endPos = replacements[replacements.length - 1].range.getEndPosition();
        let newText = '';
        for (let i = 0; i < replacements.length; i++) {
            const curEdit = replacements[i];
            newText += curEdit.text;
            if (i < replacements.length - 1) {
                const nextEdit = replacements[i + 1];
                const gapRange = Range.fromPositions(curEdit.range.getEndPosition(), nextEdit.range.getStartPosition());
                const gapText = initialValue.getValueOfRange(gapRange);
                newText += gapText;
            }
        }
        return new TextReplacement(Range.fromPositions(startPos, endPos), newText);
    }
    static fromStringReplacement(replacement, initialState) {
        return new TextReplacement(initialState.getTransformer().getRange(replacement.replaceRange), replacement.newText);
    }
    static delete(range) {
        return new TextReplacement(range, '');
    }
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
    get isEmpty() {
        return this.range.isEmpty() && this.text.length === 0;
    }
    static equals(first, second) {
        return first.range.equalsRange(second.range) && first.text === second.text;
    }
    toSingleEditOperation() {
        return {
            range: this.range,
            text: this.text,
        };
    }
    toEdit() {
        return new TextEdit([this]);
    }
    equals(other) {
        return TextReplacement.equals(this, other);
    }
    extendToCoverRange(range, initialValue) {
        if (this.range.containsRange(range)) {
            return this;
        }
        const newRange = this.range.plusRange(range);
        const textBefore = initialValue.getValueOfRange(Range.fromPositions(newRange.getStartPosition(), this.range.getStartPosition()));
        const textAfter = initialValue.getValueOfRange(Range.fromPositions(this.range.getEndPosition(), newRange.getEndPosition()));
        const newText = textBefore + this.text + textAfter;
        return new TextReplacement(newRange, newText);
    }
    extendToFullLine(initialValue) {
        const newRange = new Range(this.range.startLineNumber, 1, this.range.endLineNumber, initialValue.getTransformer().getLineLength(this.range.endLineNumber) + 1);
        return this.extendToCoverRange(newRange, initialValue);
    }
    removeCommonPrefixAndSuffix(text) {
        const prefix = this.removeCommonPrefix(text);
        const suffix = prefix.removeCommonSuffix(text);
        return suffix;
    }
    removeCommonPrefix(text) {
        const normalizedOriginalText = text.getValueOfRange(this.range).replaceAll('\r\n', '\n');
        const normalizedModifiedText = this.text.replaceAll('\r\n', '\n');
        const commonPrefixLen = commonPrefixLength(normalizedOriginalText, normalizedModifiedText);
        const start = TextLength.ofText(normalizedOriginalText.substring(0, commonPrefixLen))
            .addToPosition(this.range.getStartPosition());
        const newText = normalizedModifiedText.substring(commonPrefixLen);
        const range = Range.fromPositions(start, this.range.getEndPosition());
        return new TextReplacement(range, newText);
    }
    removeCommonSuffix(text) {
        const normalizedOriginalText = text.getValueOfRange(this.range).replaceAll('\r\n', '\n');
        const normalizedModifiedText = this.text.replaceAll('\r\n', '\n');
        const commonSuffixLen = commonSuffixLength(normalizedOriginalText, normalizedModifiedText);
        const end = TextLength.ofText(normalizedOriginalText.substring(0, normalizedOriginalText.length - commonSuffixLen))
            .addToPosition(this.range.getStartPosition());
        const newText = normalizedModifiedText.substring(0, normalizedModifiedText.length - commonSuffixLen);
        const range = Range.fromPositions(this.range.getStartPosition(), end);
        return new TextReplacement(range, newText);
    }
    isEffectiveDeletion(text) {
        let newText = this.text.replaceAll('\r\n', '\n');
        let existingText = text.getValueOfRange(this.range).replaceAll('\r\n', '\n');
        const l = commonPrefixLength(newText, existingText);
        newText = newText.substring(l);
        existingText = existingText.substring(l);
        const r = commonSuffixLength(newText, existingText);
        newText = newText.substring(0, newText.length - r);
        existingText = existingText.substring(0, existingText.length - r);
        return newText === '';
    }
    toString() {
        const start = this.range.getStartPosition();
        const end = this.range.getEndPosition();
        return `(${start.lineNumber},${start.column} -> ${end.lineNumber},${end.column}): "${this.text}"`;
    }
}
function rangeFromPositions(start, end) {
    if (start.lineNumber === end.lineNumber && start.column === Number.MAX_SAFE_INTEGER) {
        return Range.fromPositions(end, end);
    }
    else if (!start.isBeforeOrEqual(end)) {
        throw new BugIndicatingError('start must be before end');
    }
    return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9lZGl0cy90ZXh0RWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUc1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbkQsT0FBTyxFQUFnQixVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVuRSxNQUFNLE9BQU8sUUFBUTtJQUNiLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBZ0IsRUFBRSxZQUEwQjtRQUN4RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNqRyxPQUFPLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQW9CLEVBQUUsT0FBZTtRQUMxRCxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFZO1FBQ2hDLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQWtCLEVBQUUsT0FBZTtRQUN2RCxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFTSxNQUFNLENBQUMsZ0NBQWdDLENBQUMsWUFBd0M7UUFDdEYsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDN0YsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsWUFDaUIsWUFBd0M7UUFBeEMsaUJBQVksR0FBWixZQUFZLENBQTRCO1FBRXhELFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEksQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUztRQUNSLE1BQU0sWUFBWSxHQUFzQixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkMsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hJLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEgsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWtCO1FBQzdCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxvQkFBb0IsR0FBRyxDQUFDLENBQUM7UUFFN0IsS0FBSyxNQUFNLFdBQVcsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0MsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBRW5ELElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxNQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDL0MsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsSixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDOUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFFRCxTQUFTLElBQUksR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFbkcsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLEdBQUcsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUN6QyxvQkFBb0IsSUFBSSxHQUFHLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLG9CQUFvQixJQUFJLEdBQUcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkUsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxvQkFBb0IsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDO1lBQ3hDLENBQUM7WUFDRCxPQUFPLEdBQUcsR0FBRyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDdEMsQ0FBQztRQUVELE9BQU8sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsU0FBUyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEosQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFZO1FBQ3BCLFNBQVMsUUFBUSxDQUFDLENBQW1CO1lBQ3BDLE9BQU8sQ0FBQyxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6RCxDQUFDO1FBRUQsU0FBUyxNQUFNLENBQUMsQ0FBbUI7WUFDbEMsT0FBTyxDQUFDLFlBQVksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN2RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0QsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELHNDQUFzQztJQUN0QyxrQkFBa0IsQ0FBQyxpQkFBMkIsRUFBRSxHQUFpQjtRQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxlQUFlLENBQUMsS0FBWSxFQUFFLEdBQWlCO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBa0I7UUFDdkIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLElBQUksV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ3BDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQy9DLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUUzQyxNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUNsQixNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsTUFBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUM7WUFDM0IsV0FBVyxHQUFHLE9BQU8sQ0FBQztRQUN2QixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsYUFBYSxDQUFDLEdBQVc7UUFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBaUI7UUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25DLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEgsQ0FBQztJQUVELFlBQVk7UUFDWCxNQUFNLFNBQVMsR0FBWSxFQUFFLENBQUM7UUFDOUIsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztRQUNyQixLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNuQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsVUFBVTtnQkFDMUQsTUFBTSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUsseUJBQXlCLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVILENBQUMsQ0FBQztZQUNILE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdkQsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6QixVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUN0RSxZQUFZLEdBQUcsUUFBUSxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNoRSx5QkFBeUIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztRQUM3RCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFrQjtRQUMvQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQUMsTUFBTSxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFBQyxDQUFDO1FBQ3ZFLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFBQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBRXBFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDL0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEYsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBRWpCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7Z0JBQ3hHLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQy9DLE9BQU8sSUFBSSxPQUFPLENBQUM7WUFDcEIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBZTtRQUNyQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUF1QztRQUMvQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDaEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5ELDJCQUEyQjtZQUMzQixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUN0QyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUMxQixDQUFDO1lBQ0YsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7Z0JBQ25DLFVBQVUsR0FBRyxLQUFLLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1lBQzFFLENBQUM7WUFFRCwwQkFBMEI7WUFDMUIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FDckMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFDeEIsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUMxQyxDQUFDO1lBQ0YsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDdkQsQ0FBQztZQUVELDJCQUEyQjtZQUMzQixJQUFJLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDaEMsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUs7b0JBQ3hELFlBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQztZQUN4RCxDQUFDO1lBRUQsc0JBQXNCO1lBQ3RCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckIsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUs7b0JBQzlDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBRUQsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMvQiw4QkFBOEI7Z0JBQzlCLE9BQU8sR0FBRyxVQUFVLElBQUksT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2hELENBQUM7WUFDRCw4QkFBOEI7WUFDOUIsT0FBTyxHQUFHLFVBQVUsSUFBSSxZQUFZLElBQUksT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2hFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNmLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBQ3BCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUErQixFQUFFLFlBQTBCO1FBQ3pGLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUFDLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQUMsQ0FBQztRQUNsRSxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFBQyxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFFMUQsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzFELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUU1RSxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5QyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDckMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLElBQUksT0FBTyxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU0sTUFBTSxDQUFDLHFCQUFxQixDQUFDLFdBQThCLEVBQUUsWUFBMEI7UUFDN0YsT0FBTyxJQUFJLGVBQWUsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkgsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBWTtRQUNoQyxPQUFPLElBQUksZUFBZSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsWUFDaUIsS0FBWSxFQUNaLElBQVk7UUFEWixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtJQUU3QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFzQixFQUFFLE1BQXVCO1FBQzVELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQztJQUM1RSxDQUFDO0lBRU0scUJBQXFCO1FBQzNCLE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ2YsQ0FBQztJQUNILENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFzQjtRQUNuQyxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxLQUFZLEVBQUUsWUFBMEI7UUFDakUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQUMsT0FBTyxJQUFJLENBQUM7UUFBQyxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pJLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUgsTUFBTSxPQUFPLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQ25ELE9BQU8sSUFBSSxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxZQUEwQjtRQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQzFCLENBQUMsRUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDeEIsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FDekUsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sMkJBQTJCLENBQUMsSUFBa0I7UUFDcEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxJQUFrQjtRQUMzQyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekYsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbEUsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUMzRixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7YUFDbkYsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sT0FBTyxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNsRSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdEUsT0FBTyxJQUFJLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLGtCQUFrQixDQUFDLElBQWtCO1FBQzNDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RixNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVsRSxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLENBQUM7YUFDakgsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sT0FBTyxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sSUFBSSxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxJQUFrQjtRQUM1QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsWUFBWSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3BELE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25ELFlBQVksR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sT0FBTyxLQUFLLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU0sUUFBUTtRQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLE9BQU8sR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsTUFBTSxPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQztJQUNuRyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEtBQWUsRUFBRSxHQUFhO0lBQ3pELElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDckYsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDO1NBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN4QyxNQUFNLElBQUksa0JBQWtCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUUsQ0FBQyJ9