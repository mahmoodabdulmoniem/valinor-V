/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';
/**
 * Token that represent a `carriage return` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class CarriageReturn extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\r'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(CarriageReturn.symbol); }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return CarriageReturn.byte;
    }
    /**
     * Return text representation of the token.
     */
    get text() {
        return CarriageReturn.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `CR${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FycmlhZ2VSZXR1cm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9saW5lc0NvZGVjL3Rva2Vucy9jYXJyaWFnZVJldHVybi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXRFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxjQUFlLFNBQVEsV0FBaUI7SUFDcEQ7O09BRUc7YUFDNkIsV0FBTSxHQUFTLElBQUksQ0FBQztJQUVwRDs7T0FFRzthQUNvQixTQUFJLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFekU7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLGNBQWMsQ0FBQyxNQUFNLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzFCLENBQUMifQ==