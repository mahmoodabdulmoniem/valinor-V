/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `"` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class DoubleQuote extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '"'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return DoubleQuote.symbol;
    }
    /**
     * Checks if the provided token is of the same type
     * as the current one.
     */
    sameType(other) {
        return (other instanceof this.constructor);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `double-quote${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG91YmxlUXVvdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvZG91YmxlUXVvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DOzs7R0FHRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsV0FBZ0I7SUFDaEQ7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxRQUFRLENBQUMsS0FBZ0I7UUFDL0IsT0FBTyxDQUFDLEtBQUssWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGVBQWUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BDLENBQUMifQ==