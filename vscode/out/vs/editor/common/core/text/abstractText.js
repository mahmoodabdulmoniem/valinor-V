/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../base/common/assert.js';
import { splitLines } from '../../../../base/common/strings.js';
import { Position } from '../position.js';
import { PositionOffsetTransformer } from './positionToOffsetImpl.js';
import { Range } from '../range.js';
import { TextLength } from '../text/textLength.js';
export class AbstractText {
    constructor() {
        this._transformer = undefined;
    }
    get endPositionExclusive() {
        return this.length.addToPosition(new Position(1, 1));
    }
    get lineRange() {
        return this.length.toLineRange();
    }
    getValue() {
        return this.getValueOfRange(this.length.toRange());
    }
    getValueOfOffsetRange(range) {
        return this.getValueOfRange(this.getTransformer().getRange(range));
    }
    getLineLength(lineNumber) {
        return this.getValueOfRange(new Range(lineNumber, 1, lineNumber, Number.MAX_SAFE_INTEGER)).length;
    }
    getTransformer() {
        if (!this._transformer) {
            this._transformer = new PositionOffsetTransformer(this.getValue());
        }
        return this._transformer;
    }
    getLineAt(lineNumber) {
        return this.getValueOfRange(new Range(lineNumber, 1, lineNumber, Number.MAX_SAFE_INTEGER));
    }
    getLines() {
        const value = this.getValue();
        return splitLines(value);
    }
    getLinesOfRange(range) {
        return range.mapToLineArray(lineNumber => this.getLineAt(lineNumber));
    }
    equals(other) {
        if (this === other) {
            return true;
        }
        return this.getValue() === other.getValue();
    }
}
export class LineBasedText extends AbstractText {
    constructor(_getLineContent, _lineCount) {
        assert(_lineCount >= 1);
        super();
        this._getLineContent = _getLineContent;
        this._lineCount = _lineCount;
    }
    getValueOfRange(range) {
        if (range.startLineNumber === range.endLineNumber) {
            return this._getLineContent(range.startLineNumber).substring(range.startColumn - 1, range.endColumn - 1);
        }
        let result = this._getLineContent(range.startLineNumber).substring(range.startColumn - 1);
        for (let i = range.startLineNumber + 1; i < range.endLineNumber; i++) {
            result += '\n' + this._getLineContent(i);
        }
        result += '\n' + this._getLineContent(range.endLineNumber).substring(0, range.endColumn - 1);
        return result;
    }
    getLineLength(lineNumber) {
        return this._getLineContent(lineNumber).length;
    }
    get length() {
        const lastLine = this._getLineContent(this._lineCount);
        return new TextLength(this._lineCount - 1, lastLine.length);
    }
}
export class ArrayText extends LineBasedText {
    constructor(lines) {
        super(lineNumber => lines[lineNumber - 1], lines.length);
    }
}
export class StringText extends AbstractText {
    constructor(value) {
        super();
        this.value = value;
        this._t = new PositionOffsetTransformer(this.value);
    }
    getValueOfRange(range) {
        return this._t.getOffsetRange(range).substring(this.value);
    }
    get length() {
        return this._t.textLength;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvdGV4dC9hYnN0cmFjdFRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHbkQsTUFBTSxPQUFnQixZQUFZO0lBQWxDO1FBd0JTLGlCQUFZLEdBQTBDLFNBQVMsQ0FBQztJQTRCekUsQ0FBQztJQWhEQSxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxLQUFrQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsQ0FB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