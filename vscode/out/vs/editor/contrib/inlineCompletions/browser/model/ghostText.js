/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../../base/common/arrays.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement, TextEdit } from '../../../../common/core/edits/textEdit.js';
import { LineDecoration } from '../../../../common/viewLayout/lineDecorations.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
export class GhostText {
    constructor(lineNumber, parts) {
        this.lineNumber = lineNumber;
        this.parts = parts;
        assertFn(() => checkAdjacentItems(parts, (p1, p2) => p1.column <= p2.column));
    }
    equals(other) {
        return this.lineNumber === other.lineNumber &&
            this.parts.length === other.parts.length &&
            this.parts.every((part, index) => part.equals(other.parts[index]));
    }
    /**
     * Only used for testing/debugging.
    */
    render(documentText, debug = false) {
        return new TextEdit([
            ...this.parts.map(p => new TextReplacement(Range.fromPositions(new Position(this.lineNumber, p.column)), debug ? `[${p.lines.map(line => line.line).join('\n')}]` : p.lines.map(line => line.line).join('\n'))),
        ]).applyToString(documentText);
    }
    renderForScreenReader(lineText) {
        if (this.parts.length === 0) {
            return '';
        }
        const lastPart = this.parts[this.parts.length - 1];
        const cappedLineText = lineText.substr(0, lastPart.column - 1);
        const text = new TextEdit([
            ...this.parts.map(p => new TextReplacement(Range.fromPositions(new Position(1, p.column)), p.lines.map(line => line.line).join('\n'))),
        ]).applyToString(cappedLineText);
        return text.substring(this.parts[0].column - 1);
    }
    isEmpty() {
        return this.parts.every(p => p.lines.length === 0);
    }
    get lineCount() {
        return 1 + this.parts.reduce((r, p) => r + p.lines.length - 1, 0);
    }
}
export class GhostTextPart {
    constructor(column, text, 
    /**
     * Indicates if this part is a preview of an inline suggestion when a suggestion is previewed.
    */
    preview, _inlineDecorations = []) {
        this.column = column;
        this.text = text;
        this.preview = preview;
        this._inlineDecorations = _inlineDecorations;
        this.lines = splitLines(this.text).map((line, i) => ({
            line,
            lineDecorations: LineDecoration.filter(this._inlineDecorations, i + 1, 1, line.length + 1)
        }));
    }
    equals(other) {
        return this.column === other.column &&
            this.lines.length === other.lines.length &&
            this.lines.every((line, index) => line.line === other.lines[index].line &&
                LineDecoration.equalsArr(line.lineDecorations, other.lines[index].lineDecorations));
    }
}
export class GhostTextReplacement {
    constructor(lineNumber, columnRange, text, additionalReservedLineCount = 0) {
        this.lineNumber = lineNumber;
        this.columnRange = columnRange;
        this.text = text;
        this.additionalReservedLineCount = additionalReservedLineCount;
        this.parts = [
            new GhostTextPart(this.columnRange.endColumnExclusive, this.text, false),
        ];
        this.newLines = splitLines(this.text);
    }
    renderForScreenReader(_lineText) {
        return this.newLines.join('\n');
    }
    render(documentText, debug = false) {
        const replaceRange = this.columnRange.toRange(this.lineNumber);
        if (debug) {
            return new TextEdit([
                new TextReplacement(Range.fromPositions(replaceRange.getStartPosition()), '('),
                new TextReplacement(Range.fromPositions(replaceRange.getEndPosition()), `)[${this.newLines.join('\n')}]`),
            ]).applyToString(documentText);
        }
        else {
            return new TextEdit([
                new TextReplacement(replaceRange, this.newLines.join('\n')),
            ]).applyToString(documentText);
        }
    }
    get lineCount() {
        return this.newLines.length;
    }
    isEmpty() {
        return this.parts.every(p => p.lines.length === 0);
    }
    equals(other) {
        return this.lineNumber === other.lineNumber &&
            this.columnRange.equals(other.columnRange) &&
            this.newLines.length === other.newLines.length &&
            this.newLines.every((line, index) => line === other.newLines[index]) &&
            this.additionalReservedLineCount === other.additionalReservedLineCount;
    }
}
export function ghostTextsOrReplacementsEqual(a, b) {
    return equals(a, b, ghostTextOrReplacementEquals);
}
export function ghostTextOrReplacementEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a instanceof GhostText && b instanceof GhostText) {
        return a.equals(b);
    }
    if (a instanceof GhostTextReplacement && b instanceof GhostTextReplacement) {
        return a.equals(b);
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2dob3N0VGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3BGLE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQ2lCLFVBQWtCLEVBQ2xCLEtBQXNCO1FBRHRCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsVUFBSyxHQUFMLEtBQUssQ0FBaUI7UUFFdEMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFnQjtRQUN0QixPQUFPLElBQUksQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFVBQVU7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQ7O01BRUU7SUFDRixNQUFNLENBQUMsWUFBb0IsRUFBRSxRQUFpQixLQUFLO1FBQ2xELE9BQU8sSUFBSSxRQUFRLENBQUM7WUFDbkIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksZUFBZSxDQUN6QyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQzVELEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNwRyxDQUFDO1NBQ0YsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBZ0I7UUFDckMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDekIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksZUFBZSxDQUN6QyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN6QyxDQUFDO1NBQ0YsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVqQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRSxDQUFDO0NBQ0Q7QUFRRCxNQUFNLE9BQU8sYUFBYTtJQUl6QixZQUNVLE1BQWMsRUFDZCxJQUFZO0lBQ3JCOztNQUVFO0lBQ08sT0FBZ0IsRUFDakIscUJBQXlDLEVBQUU7UUFOMUMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVE7UUFJWixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2pCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBeUI7UUFFbkQsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEQsSUFBSTtZQUNKLGVBQWUsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUMxRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBb0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNO1lBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUN4QyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUNoQyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTtnQkFDckMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQ2xGLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQW9CO0lBSWhDLFlBQ1UsVUFBa0IsRUFDbEIsV0FBd0IsRUFDeEIsSUFBWSxFQUNMLDhCQUFzQyxDQUFDO1FBSDlDLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNMLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBWTtRQUV2RCxJQUFJLENBQUMsS0FBSyxHQUFHO1lBQ1osSUFBSSxhQUFhLENBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQ25DLElBQUksQ0FBQyxJQUFJLEVBQ1QsS0FBSyxDQUNMO1NBQ0QsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQscUJBQXFCLENBQUMsU0FBaUI7UUFDdEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFlBQW9CLEVBQUUsUUFBaUIsS0FBSztRQUNsRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxRQUFRLENBQUM7Z0JBQ25CLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxHQUFHLENBQUM7Z0JBQzlFLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2FBQ3pHLENBQUMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksUUFBUSxDQUFDO2dCQUNuQixJQUFJLGVBQWUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0QsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7SUFDN0IsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUEyQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFVBQVU7WUFDMUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztZQUMxQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07WUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsMkJBQTJCLEtBQUssS0FBSyxDQUFDLDJCQUEyQixDQUFDO0lBQ3pFLENBQUM7Q0FDRDtBQUlELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxDQUFnRCxFQUFFLENBQWdEO0lBQy9JLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLENBQXFDLEVBQUUsQ0FBcUM7SUFDeEgsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLENBQUMsWUFBWSxTQUFTLElBQUksQ0FBQyxZQUFZLFNBQVMsRUFBRSxDQUFDO1FBQ3RELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsSUFBSSxDQUFDLFlBQVksb0JBQW9CLElBQUksQ0FBQyxZQUFZLG9CQUFvQixFQUFFLENBQUM7UUFDNUUsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUMifQ==