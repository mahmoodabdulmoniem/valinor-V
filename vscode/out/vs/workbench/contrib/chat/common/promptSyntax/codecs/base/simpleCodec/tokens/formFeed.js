/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * Token that represent a `form feed` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class FormFeed extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\f'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return FormFeed.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `formfeed${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybUZlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvZm9ybUZlZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DOzs7R0FHRztBQUNILE1BQU0sT0FBTyxRQUFTLFNBQVEsV0FBaUI7SUFDOUM7O09BRUc7YUFDNkIsV0FBTSxHQUFTLElBQUksQ0FBQztJQUVwRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxXQUFXLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNoQyxDQUFDIn0=