/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown comment` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownComment extends MarkdownToken {
    constructor(range, text) {
        assert(text.startsWith('<!--'), `The comment must start with '<!--', got '${text.substring(0, 10)}'.`);
        super(range);
        this.text = text;
    }
    /**
     * Whether the comment has an end comment marker `-->`.
     */
    get hasEndMarker() {
        return this.text.endsWith('-->');
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-comment("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Db21tZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25Db2RlYy90b2tlbnMvbWFya2Rvd25Db21tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFMUU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsYUFBYTtJQUNqRCxZQUNDLEtBQVksRUFDSSxJQUFZO1FBRTVCLE1BQU0sQ0FDTCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUN2Qiw0Q0FBNEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FDckUsQ0FBQztRQUVGLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQVBHLFNBQUksR0FBSixJQUFJLENBQVE7SUFRN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGVBQWUsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0NBQ0QifQ==