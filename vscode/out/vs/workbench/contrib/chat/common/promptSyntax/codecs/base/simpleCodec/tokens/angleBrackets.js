/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `<` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftAngleBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '<'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftAngleBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-angle-bracket${this.range}`;
    }
}
/**
 * A token that represent a `>` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightAngleBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '>'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightAngleBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-angle-bracket${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5nbGVCcmFja2V0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3Rva2Vucy9hbmdsZUJyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsV0FBZ0I7SUFDckQ7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLHFCQUFxQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUMsQ0FBQzs7QUFHRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsV0FBZ0I7SUFDdEQ7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLHNCQUFzQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDM0MsQ0FBQyJ9