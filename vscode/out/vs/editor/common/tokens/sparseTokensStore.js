/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { LineTokens } from './lineTokens.js';
/**
 * Represents sparse tokens in a text model.
 */
export class SparseTokensStore {
    constructor(languageIdCodec) {
        this._pieces = [];
        this._isComplete = false;
        this._languageIdCodec = languageIdCodec;
    }
    flush() {
        this._pieces = [];
        this._isComplete = false;
    }
    isEmpty() {
        return (this._pieces.length === 0);
    }
    set(pieces, isComplete, textModel = undefined) {
        this._pieces = pieces || [];
        this._isComplete = isComplete;
        if (textModel) {
            for (const p of this._pieces) {
                p.reportIfInvalid(textModel);
            }
        }
    }
    setPartial(_range, pieces) {
        // console.log(`setPartial ${_range} ${pieces.map(p => p.toString()).join(', ')}`);
        let range = _range;
        if (pieces.length > 0) {
            const _firstRange = pieces[0].getRange();
            const _lastRange = pieces[pieces.length - 1].getRange();
            if (!_firstRange || !_lastRange) {
                return _range;
            }
            range = _range.plusRange(_firstRange).plusRange(_lastRange);
        }
        let insertPosition = null;
        for (let i = 0, len = this._pieces.length; i < len; i++) {
            const piece = this._pieces[i];
            if (piece.endLineNumber < range.startLineNumber) {
                // this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // this piece is after the range, so mark the spot before this piece
                // as a good insertion position and stop looping
                insertPosition = insertPosition || { index: i };
                break;
            }
            // this piece might intersect with the range
            piece.removeTokens(range);
            if (piece.isEmpty()) {
                // remove the piece if it became empty
                this._pieces.splice(i, 1);
                i--;
                len--;
                continue;
            }
            if (piece.endLineNumber < range.startLineNumber) {
                // after removal, this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // after removal, this piece is after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            // after removal, this piece contains the range
            const [a, b] = piece.split(range);
            if (a.isEmpty()) {
                // this piece is actually after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            if (b.isEmpty()) {
                // this piece is actually before the range
                continue;
            }
            this._pieces.splice(i, 1, a, b);
            i++;
            len++;
            insertPosition = insertPosition || { index: i };
        }
        insertPosition = insertPosition || { index: this._pieces.length };
        if (pieces.length > 0) {
            this._pieces = arrays.arrayInsert(this._pieces, insertPosition.index, pieces);
        }
        // console.log(`I HAVE ${this._pieces.length} pieces`);
        // console.log(`${this._pieces.map(p => p.toString()).join('\n')}`);
        return range;
    }
    isComplete() {
        return this._isComplete;
    }
    addSparseTokens(lineNumber, aTokens) {
        if (aTokens.getTextLength() === 0) {
            // Don't do anything for empty lines
            return aTokens;
        }
        const pieces = this._pieces;
        if (pieces.length === 0) {
            return aTokens;
        }
        const pieceIndex = SparseTokensStore._findFirstPieceWithLine(pieces, lineNumber);
        const bTokens = pieces[pieceIndex].getLineTokens(lineNumber);
        if (!bTokens) {
            return aTokens;
        }
        const aLen = aTokens.getCount();
        const bLen = bTokens.getCount();
        let aIndex = 0;
        const result = [];
        let resultLen = 0;
        let lastEndOffset = 0;
        const emitToken = (endOffset, metadata) => {
            if (endOffset === lastEndOffset) {
                return;
            }
            lastEndOffset = endOffset;
            result[resultLen++] = endOffset;
            result[resultLen++] = metadata;
        };
        for (let bIndex = 0; bIndex < bLen; bIndex++) {
            // bTokens is not validated yet, but aTokens is. We want to make sure that the LineTokens we return
            // are valid, so we clamp the ranges to ensure that.
            const bStartCharacter = Math.min(bTokens.getStartCharacter(bIndex), aTokens.getTextLength());
            const bEndCharacter = Math.min(bTokens.getEndCharacter(bIndex), aTokens.getTextLength());
            const bMetadata = bTokens.getMetadata(bIndex);
            const bMask = (((bMetadata & 1 /* MetadataConsts.SEMANTIC_USE_ITALIC */) ? 2048 /* MetadataConsts.ITALIC_MASK */ : 0)
                | ((bMetadata & 2 /* MetadataConsts.SEMANTIC_USE_BOLD */) ? 4096 /* MetadataConsts.BOLD_MASK */ : 0)
                | ((bMetadata & 4 /* MetadataConsts.SEMANTIC_USE_UNDERLINE */) ? 8192 /* MetadataConsts.UNDERLINE_MASK */ : 0)
                | ((bMetadata & 8 /* MetadataConsts.SEMANTIC_USE_STRIKETHROUGH */) ? 16384 /* MetadataConsts.STRIKETHROUGH_MASK */ : 0)
                | ((bMetadata & 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */) ? 16744448 /* MetadataConsts.FOREGROUND_MASK */ : 0)
                | ((bMetadata & 32 /* MetadataConsts.SEMANTIC_USE_BACKGROUND */) ? 4278190080 /* MetadataConsts.BACKGROUND_MASK */ : 0)) >>> 0;
            const aMask = (~bMask) >>> 0;
            // push any token from `a` that is before `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) <= bStartCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
                aIndex++;
            }
            // push the token from `a` if it intersects the token from `b`
            if (aIndex < aLen && aTokens.getStartOffset(aIndex) < bStartCharacter) {
                emitToken(bStartCharacter, aTokens.getMetadata(aIndex));
            }
            // skip any tokens from `a` that are contained inside `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) < bEndCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                aIndex++;
            }
            if (aIndex < aLen) {
                emitToken(bEndCharacter, (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                if (aTokens.getEndOffset(aIndex) === bEndCharacter) {
                    // `a` ends exactly at the same spot as `b`!
                    aIndex++;
                }
            }
            else {
                const aMergeIndex = Math.min(Math.max(0, aIndex - 1), aLen - 1);
                // push the token from `b`
                emitToken(bEndCharacter, (aTokens.getMetadata(aMergeIndex) & aMask) | (bMetadata & bMask));
            }
        }
        // push the remaining tokens from `a`
        while (aIndex < aLen) {
            emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
            aIndex++;
        }
        return new LineTokens(new Uint32Array(result), aTokens.getLineContent(), this._languageIdCodec);
    }
    static _findFirstPieceWithLine(pieces, lineNumber) {
        let low = 0;
        let high = pieces.length - 1;
        while (low < high) {
            let mid = low + Math.floor((high - low) / 2);
            if (pieces[mid].endLineNumber < lineNumber) {
                low = mid + 1;
            }
            else if (pieces[mid].startLineNumber > lineNumber) {
                high = mid - 1;
            }
            else {
                while (mid > low && pieces[mid - 1].startLineNumber <= lineNumber && lineNumber <= pieces[mid - 1].endLineNumber) {
                    mid--;
                }
                return mid;
            }
        }
        return low;
    }
    acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        for (const piece of this._pieces) {
            piece.acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlVG9rZW5zU3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL3NwYXJzZVRva2Vuc1N0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBTTdDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQU03QixZQUFZLGVBQWlDO1FBQzVDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7SUFDekMsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRU0sT0FBTztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQXNDLEVBQUUsVUFBbUIsRUFBRSxZQUFvQyxTQUFTO1FBQ3BILElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUU5QixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzlCLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUIsQ0FB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