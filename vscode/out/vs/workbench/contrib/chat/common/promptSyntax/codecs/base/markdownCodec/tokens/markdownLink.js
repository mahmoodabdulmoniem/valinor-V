/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown link` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownLink extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the link (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the link (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the original link, including the square brackets.
     */
    caption, 
    /**
     * The reference of the original link, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
        assert(reference[0] === '(' && reference[reference.length - 1] === ')', `The reference must be enclosed in parentheses, got "${reference}".`);
        super(new Range(lineNumber, columnNumber, lineNumber, columnNumber + caption.length + reference.length));
        this.caption = caption;
        this.reference = reference;
        // set up the `isURL` flag based on the current
        try {
            new URL(this.path);
            this.isURL = true;
        }
        catch {
            this.isURL = false;
        }
    }
    get text() {
        return `${this.caption}${this.reference}`;
    }
    /**
     * Returns the `reference` part of the link without enclosing parentheses.
     */
    get path() {
        return this.reference.slice(1, this.reference.length - 1);
    }
    /**
     * Get the range of the `link part` of the token.
     */
    get linkRange() {
        if (this.path.length === 0) {
            return undefined;
        }
        const { range } = this;
        // note! '+1' for opening `(` of the link
        const startColumn = range.startColumn + this.caption.length + 1;
        const endColumn = startColumn + this.path.length;
        return new Range(range.startLineNumber, startColumn, range.endLineNumber, endColumn);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-link("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25Db2RlYy90b2tlbnMvbWFya2Rvd25MaW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTFFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxZQUFhLFNBQVEsYUFBYTtJQU05QztJQUNDOztPQUVHO0lBQ0gsVUFBa0I7SUFDbEI7O09BRUc7SUFDSCxZQUFvQjtJQUNwQjs7T0FFRztJQUNhLE9BQWU7SUFDL0I7O09BRUc7SUFDYSxTQUFpQjtRQUVqQyxNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQ2xCLG9DQUFvQyxDQUNwQyxDQUFDO1FBRUYsTUFBTSxDQUNMLFVBQVUsR0FBRyxDQUFDLEVBQ2Qsc0NBQXNDLFVBQVUsSUFBSSxDQUNwRCxDQUFDO1FBRUYsTUFBTSxDQUNMLFlBQVksR0FBRyxDQUFDLEVBQ2hCLHdDQUF3QyxZQUFZLElBQUksQ0FDeEQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDekQseURBQXlELE9BQU8sSUFBSSxDQUNwRSxDQUFDO1FBRUYsTUFBTSxDQUNMLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUMvRCx1REFBdUQsU0FBUyxJQUFJLENBQ3BFLENBQUM7UUFFRixLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLFlBQVksRUFDWixVQUFVLEVBQ1YsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FDaEQsQ0FDRCxDQUFDO1FBdENjLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFJZixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBb0NqQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ25CLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQW9CLElBQUk7UUFDdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsU0FBUztRQUNuQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLHlDQUF5QztRQUN6QyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNoRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFakQsT0FBTyxJQUFJLEtBQUssQ0FDZixLQUFLLENBQUMsZUFBZSxFQUNyQixXQUFXLEVBQ1gsS0FBSyxDQUFDLGFBQWEsRUFDbkIsU0FBUyxDQUNULENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sWUFBWSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RELENBQUM7Q0FDRCJ9