/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../core/ranges/offsetRange.js';
import { LineTokens } from './lineTokens.js';
/**
 * This class represents a sequence of tokens.
 * Conceptually, each token has a length and a metadata number.
 * A token array might be used to annotate a string with metadata.
 * Use {@link TokenWithTextArrayBuilder} to efficiently create a token array.
 *
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
*/
export class TokenWithTextArray {
    static fromLineTokens(lineTokens) {
        const tokenInfo = [];
        for (let i = 0; i < lineTokens.getCount(); i++) {
            tokenInfo.push(new TokenWithTextInfo(lineTokens.getTokenText(i), lineTokens.getMetadata(i)));
        }
        return TokenWithTextArray.create(tokenInfo);
    }
    static create(tokenInfo) {
        return new TokenWithTextArray(tokenInfo);
    }
    constructor(_tokenInfo) {
        this._tokenInfo = _tokenInfo;
    }
    toLineTokens(decoder) {
        return LineTokens.createFromTextAndMetadata(this.map((_r, t) => ({ text: t.text, metadata: t.metadata })), decoder);
    }
    forEach(cb) {
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.text.length);
            cb(range, tokenInfo);
            lengthSum += tokenInfo.text.length;
        }
    }
    map(cb) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.text.length);
            result.push(cb(range, tokenInfo));
            lengthSum += tokenInfo.text.length;
        }
        return result;
    }
    slice(range) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const tokenStart = lengthSum;
            const tokenEndEx = tokenStart + tokenInfo.text.length;
            if (tokenEndEx > range.start) {
                if (tokenStart >= range.endExclusive) {
                    break;
                }
                const deltaBefore = Math.max(0, range.start - tokenStart);
                const deltaAfter = Math.max(0, tokenEndEx - range.endExclusive);
                result.push(new TokenWithTextInfo(tokenInfo.text.slice(deltaBefore, tokenInfo.text.length - deltaAfter), tokenInfo.metadata));
            }
            lengthSum += tokenInfo.text.length;
        }
        return TokenWithTextArray.create(result);
    }
    append(other) {
        const result = this._tokenInfo.concat(other._tokenInfo);
        return TokenWithTextArray.create(result);
    }
}
export class TokenWithTextInfo {
    constructor(text, metadata) {
        this.text = text;
        this.metadata = metadata;
    }
}
/**
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
*/
export class TokenWithTextArrayBuilder {
    constructor() {
        this._tokens = [];
    }
    add(text, metadata) {
        this._tokens.push(new TokenWithTextInfo(text, metadata));
    }
    build() {
        return TokenWithTextArray.create(this._tokens);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5XaXRoVGV4dEFycmF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy90b2tlbldpdGhUZXh0QXJyYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3Qzs7Ozs7OztFQU9FO0FBQ0YsTUFBTSxPQUFPLGtCQUFrQjtJQUN2QixNQUFNLENBQUMsY0FBYyxDQUFDLFVBQXNCO1FBQ2xELE1BQU0sU0FBUyxHQUF3QixFQUFFLENBQUM7UUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlGLENBQUM7UUFDRCxPQUFPLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUE4QjtRQUNsRCxPQUFPLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELFlBQ2tCLFVBQStCO1FBQS9CLGVBQVUsR0FBVixVQUFVLENBQXFCO0lBQzdDLENBQUM7SUFFRSxZQUFZLENBQUMsT0FBeUI7UUFDNUMsT0FBTyxVQUFVLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcs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