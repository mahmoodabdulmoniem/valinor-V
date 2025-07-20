/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `!` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class ExclamationMark extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '!'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return ExclamationMark.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `exclamation-mark${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhjbGFtYXRpb25NYXJrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL2V4Y2xhbWF0aW9uTWFyay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBZ0I7SUFDcEQ7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxtQkFBbUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hDLENBQUMifQ==