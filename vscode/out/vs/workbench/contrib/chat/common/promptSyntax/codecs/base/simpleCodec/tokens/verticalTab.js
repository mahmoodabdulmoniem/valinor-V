/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SpacingToken } from './simpleToken.js';
/**
 * Token that represent a `vertical tab` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class VerticalTab extends SpacingToken {
    /**
     * The underlying symbol of the `VerticalTab` token.
     */
    static { this.symbol = '\v'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return VerticalTab.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `vtab${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVydGljYWxUYWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvdmVydGljYWxUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWhEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsWUFBa0I7SUFDbEQ7O09BRUc7YUFDNkIsV0FBTSxHQUFTLElBQUksQ0FBQztJQUVwRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixDQUFDIn0=