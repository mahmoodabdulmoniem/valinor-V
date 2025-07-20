/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * A token that represent a word - a set of continuous
 * characters without stop characters, like a `space`,
 * a `tab`, or a `new line`.
 */
export class Word extends BaseToken {
    constructor(
    /**
     * The word range.
     */
    range, 
    /**
     * The string value of the word.
     */
    text) {
        super(range);
        this.text = text;
    }
    /**
     * Create new `Word` token with the given `text` and the range
     * inside the given `Line` at the specified `column number`.
     */
    static newOnLine(text, line, atColumnNumber) {
        const startLineNumber = (typeof line === 'number')
            ? line
            : line.range.startLineNumber;
        const range = new Range(startLineNumber, atColumnNumber, startLineNumber, atColumnNumber + text.length);
        return new Word(range, text);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `word("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3Rva2Vucy93b3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFL0U7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxJQUFvQyxTQUFRLFNBQWdCO0lBQ3hFO0lBQ0M7O09BRUc7SUFDSCxLQUFZO0lBRVo7O09BRUc7SUFDYSxJQUFXO1FBRTNCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUZHLFNBQUksR0FBSixJQUFJLENBQU87SUFHNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLElBQVksRUFDWixJQUFtQixFQUNuQixjQUFzQjtRQUV0QixNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQztZQUNqRCxDQUFDLENBQUMsSUFBSTtZQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQztRQUU5QixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsZUFBZSxFQUFFLGNBQWMsRUFDL0IsZUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUM3QyxDQUFDO1FBRUYsT0FBTyxJQUFJLElBQUksQ0FDZCxLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sU0FBUyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25ELENBQUM7Q0FDRCJ9