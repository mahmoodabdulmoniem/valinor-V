/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown image` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownImage extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the image (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the image (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the image, including the `!` and `square brackets`.
     */
    caption, 
    /**
     * The reference of the image, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '!', `The caption must start with '!' character, got "${caption}".`);
        assert(caption[1] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
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
        // note! '+1' for openning `(` of the link
        const startColumn = range.startColumn + this.caption.length + 1;
        const endColumn = startColumn + this.path.length;
        return new Range(range.startLineNumber, startColumn, range.endLineNumber, endColumn);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-image("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL21hcmtkb3duQ29kZWMvdG9rZW5zL21hcmtkb3duSW1hZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFMUU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxhQUFhO0lBTS9DO0lBQ0M7O09BRUc7SUFDSCxVQUFrQjtJQUNsQjs7T0FFRztJQUNILFlBQW9CO0lBQ3BCOztPQUVHO0lBQ2MsT0FBZTtJQUNoQzs7T0FFRztJQUNjLFNBQWlCO1FBRWxDLE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFDbEIsb0NBQW9DLENBQ3BDLENBQUM7UUFFRixNQUFNLENBQ0wsVUFBVSxHQUFHLENBQUMsRUFDZCxzQ0FBc0MsVUFBVSxJQUFJLENBQ3BELENBQUM7UUFFRixNQUFNLENBQ0wsWUFBWSxHQUFHLENBQUMsRUFDaEIsd0NBQXdDLFlBQVksSUFBSSxDQUN4RCxDQUFDO1FBRUYsTUFBTSxDQUNMLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQ2xCLG1EQUFtRCxPQUFPLElBQUksQ0FDOUQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDekQseURBQXlELE9BQU8sSUFBSSxDQUNwRSxDQUFDO1FBRUYsTUFBTSxDQUNMLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUMvRCx1REFBdUQsU0FBUyxJQUFJLENBQ3BFLENBQUM7UUFFRixLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLFlBQVksRUFDWixVQUFVLEVBQ1YsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FDaEQsQ0FDRCxDQUFDO1FBM0NlLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFJZixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBeUNsQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ25CLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQW9CLElBQUk7UUFDdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsU0FBUztRQUNuQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLDBDQUEwQztRQUMxQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNoRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFakQsT0FBTyxJQUFJLEtBQUssQ0FDZixLQUFLLENBQUMsZUFBZSxFQUNyQixXQUFXLEVBQ1gsS0FBSyxDQUFDLGFBQWEsRUFDbkIsU0FBUyxDQUNULENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sYUFBYSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZELENBQUM7Q0FDRCJ9