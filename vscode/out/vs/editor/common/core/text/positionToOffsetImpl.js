/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastIdxMonotonous } from '../../../../base/common/arraysFind.js';
import { OffsetRange } from '../ranges/offsetRange.js';
import { Position } from '../position.js';
import { Range } from '../range.js';
export class PositionOffsetTransformerBase {
    getOffsetRange(range) {
        return new OffsetRange(this.getOffset(range.getStartPosition()), this.getOffset(range.getEndPosition()));
    }
    getRange(offsetRange) {
        return Range.fromPositions(this.getPosition(offsetRange.start), this.getPosition(offsetRange.endExclusive));
    }
    getStringEdit(edit) {
        const edits = edit.replacements.map(e => this.getStringReplacement(e));
        return new Deps.deps.StringEdit(edits);
    }
    getStringReplacement(edit) {
        return new Deps.deps.StringReplacement(this.getOffsetRange(edit.range), edit.text);
    }
    getTextReplacement(edit) {
        return new Deps.deps.TextReplacement(this.getRange(edit.replaceRange), edit.newText);
    }
    getTextEdit(edit) {
        const edits = edit.replacements.map(e => this.getTextReplacement(e));
        return new Deps.deps.TextEdit(edits);
    }
}
class Deps {
    static { this._deps = undefined; }
    static get deps() {
        if (!this._deps) {
            throw new Error('Dependencies not set. Call _setDependencies first.');
        }
        return this._deps;
    }
}
/** This is to break circular module dependencies. */
export function _setPositionOffsetTransformerDependencies(deps) {
    Deps._deps = deps;
}
export class PositionOffsetTransformer extends PositionOffsetTransformerBase {
    constructor(text) {
        super();
        this.text = text;
        this.lineStartOffsetByLineIdx = [];
        this.lineEndOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
                if (i > 0 && text.charAt(i - 1) === '\r') {
                    this.lineEndOffsetByLineIdx.push(i - 1);
                }
                else {
                    this.lineEndOffsetByLineIdx.push(i);
                }
            }
        }
        this.lineEndOffsetByLineIdx.push(text.length);
    }
    getOffset(position) {
        const valPos = this._validatePosition(position);
        return this.lineStartOffsetByLineIdx[valPos.lineNumber - 1] + valPos.column - 1;
    }
    _validatePosition(position) {
        if (position.lineNumber < 1) {
            return new Position(1, 1);
        }
        const lineCount = this.textLength.lineCount + 1;
        if (position.lineNumber > lineCount) {
            const lineLength = this.getLineLength(lineCount);
            return new Position(lineCount, lineLength + 1);
        }
        if (position.column < 1) {
            return new Position(position.lineNumber, 1);
        }
        const lineLength = this.getLineLength(position.lineNumber);
        if (position.column - 1 > lineLength) {
            return new Position(position.lineNumber, lineLength + 1);
        }
        return position;
    }
    getPosition(offset) {
        const idx = findLastIdxMonotonous(this.lineStartOffsetByLineIdx, i => i <= offset);
        const lineNumber = idx + 1;
        const column = offset - this.lineStartOffsetByLineIdx[idx] + 1;
        return new Position(lineNumber, column);
    }
    getTextLength(offsetRange) {
        return Deps.deps.TextLength.ofRange(this.getRange(offsetRange));
    }
    get textLength() {
        const lineIdx = this.lineStartOffsetByLineIdx.length - 1;
        return new Deps.deps.TextLength(lineIdx, this.text.length - this.lineStartOffsetByLineIdx[lineIdx]);
    }
    getLineLength(lineNumber) {
        return this.lineEndOffsetByLineIdx[lineNumber - 1] - this.lineStartOffsetByLineIdx[lineNumber - 1];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb25Ub09mZnNldEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS90ZXh0L3Bvc2l0aW9uVG9PZmZzZXRJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUlwQyxNQUFNLE9BQWdCLDZCQUE2QjtJQUdsRCxjQUFjLENBQUMsS0FBWTtRQUMxQixPQUFPLElBQUksV0FBVyxDQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEVBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQ3RDLENBQUM7SUFDSCxDQUFDO0lBSUQsUUFBUSxDQUFDLFdBQXdCO1FBQ2hDLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUMxQyxDQUFDO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFjO1FBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsT0FBTyxJQUFJLElB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