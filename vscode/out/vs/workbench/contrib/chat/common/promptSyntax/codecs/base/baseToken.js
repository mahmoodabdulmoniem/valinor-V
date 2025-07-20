/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Base class for all tokens with a `range` that reflects
 * token position in the original text.
 */
export class BaseToken {
    constructor(tokenRange) {
        this.tokenRange = tokenRange;
    }
    /**
     * Range of the token in the original text.
     */
    get range() {
        return this.tokenRange;
    }
    /**
     * Check if this token has the same range as another one.
     */
    sameRange(other) {
        return this.range.equalsRange(other);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (other.constructor !== this.constructor) {
            return false;
        }
        if (this.text.length !== other.text.length) {
            return false;
        }
        if (this.text !== other.text) {
            return false;
        }
        return this.sameRange(other.range);
    }
    /**
     * Change `range` of the token with provided range components.
     */
    withRange(components) {
        this.tokenRange = new Range(components.startLineNumber ?? this.range.startLineNumber, components.startColumn ?? this.range.startColumn, components.endLineNumber ?? this.range.endLineNumber, components.endColumn ?? this.range.endColumn);
        return this;
    }
    /**
     * Collapse range of the token to its start position.
     * See {@link Range.collapseToStart} for more details.
     */
    collapseRangeToStart() {
        this.tokenRange = this.tokenRange.collapseToStart();
        return this;
    }
    /**
     * Render a list of tokens into a string.
     */
    static render(tokens, delimiter = '') {
        return tokens.map(token => token.text).join(delimiter);
    }
    /**
     * Returns the full range of a list of tokens in which the first token is
     * used as the start of a tokens sequence and the last token reflects the end.
     *
     * @throws if:
     * 	- provided {@link tokens} list is empty
     *  - the first token start number is greater than the start line of the last token
     *  - if the first and last token are on the same line, the first token start column must
     * 	  be smaller than the start column of the last token
     */
    static fullRange(tokens) {
        assert(tokens.length > 0, 'Cannot get full range for an empty list of tokens.');
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        // sanity checks for the full range we would construct
        assert(firstToken.range.startLineNumber <= lastToken.range.startLineNumber, 'First token must start on previous or the same line as the last token.');
        if ((firstToken !== lastToken) && (firstToken.range.startLineNumber === lastToken.range.startLineNumber)) {
            assert(firstToken.range.endColumn <= lastToken.range.startColumn, [
                'First token must end at least on previous or the same column as the last token.',
                `First token: ${firstToken}; Last token: ${lastToken}.`,
            ].join('\n'));
        }
        return new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
    }
    /**
     * Shorten version of the {@link text} property.
     */
    shortText(maxLength = 32) {
        if (this.text.length <= maxLength) {
            return this.text;
        }
        return `${this.text.slice(0, maxLength - 1)}...`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvYmFzZVRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFakY7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixTQUFTO0lBQzlCLFlBQ1MsVUFBaUI7UUFBakIsZUFBVSxHQUFWLFVBQVUsQ0FBTztJQUN0QixDQUFDO0lBRUw7O09BRUc7SUFDSCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQU9EOztPQUVHO0lBQ0ksU0FBUyxDQUFDLEtBQVk7UUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBT0Q7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBZ0I7UUFDN0IsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUks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