/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SpacingToken } from './simpleToken.js';
/**
 * A token that represent a `tab` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Tab extends SpacingToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\t'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Tab.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `tab${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL3RhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFaEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLEdBQUksU0FBUSxZQUFrQjtJQUMxQzs7T0FFRzthQUM2QixXQUFNLEdBQVMsSUFBSSxDQUFDO0lBRXBEOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzNCLENBQUMifQ==