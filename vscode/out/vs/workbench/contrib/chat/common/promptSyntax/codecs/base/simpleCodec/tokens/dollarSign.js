/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `$` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class DollarSign extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '$'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return DollarSign.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `dollarSign${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9sbGFyU2lnbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3Rva2Vucy9kb2xsYXJTaWduLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sVUFBVyxTQUFRLFdBQWdCO0lBQy9DOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUMxQixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sYUFBYSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbEMsQ0FBQyJ9