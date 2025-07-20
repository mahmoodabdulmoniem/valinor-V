/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * Token representing a line of text with a `range` which
 * reflects the line's position in the original data.
 */
export class Line extends BaseToken {
    constructor(
    // the line index
    // Note! 1-based indexing
    lineNumber, 
    // the line contents
    text) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        super(new Range(lineNumber, 1, lineNumber, text.length + 1));
        this.text = text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `line("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2xpbmVzQ29kZWMvdG9rZW5zL2xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFL0U7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxTQUFTO0lBQ2xDO0lBQ0MsaUJBQWlCO0lBQ2pCLHlCQUF5QjtJQUN6QixVQUFrQjtJQUNsQixvQkFBb0I7SUFDSixJQUFZO1FBRTVCLE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFDbEIsb0NBQW9DLENBQ3BDLENBQUM7UUFFRixNQUFNLENBQ0wsVUFBVSxHQUFHLENBQUMsRUFDZCxzQ0FBc0MsVUFBVSxJQUFJLENBQ3BELENBQUM7UUFFRixLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLENBQUMsRUFDRCxVQUFVLEVBQ1YsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQ2YsQ0FDRCxDQUFDO1FBbkJjLFNBQUksR0FBSixJQUFJLENBQVE7SUFvQjdCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxTQUFTLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkQsQ0FBQztDQUNEIn0=