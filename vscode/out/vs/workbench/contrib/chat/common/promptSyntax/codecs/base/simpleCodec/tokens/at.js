/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `@` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class At extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '@'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return At.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `at${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DOzs7R0FHRztBQUNILE1BQU0sT0FBTyxFQUFHLFNBQVEsV0FBZ0I7SUFDdkM7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDIn0=