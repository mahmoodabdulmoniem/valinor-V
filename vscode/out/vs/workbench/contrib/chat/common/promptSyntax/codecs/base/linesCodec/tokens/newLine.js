/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';
/**
 * A token that represent a `new line` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class NewLine extends SimpleToken {
    /**
     * The underlying symbol of the `NewLine` token.
     */
    static { this.symbol = '\n'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(NewLine.symbol); }
    /**
     * Return text representation of the token.
     */
    get text() {
        return NewLine.symbol;
    }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return NewLine.byte;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `newline${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3TGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2xpbmVzQ29kZWMvdG9rZW5zL25ld0xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sT0FBUSxTQUFRLFdBQWlCO0lBQzdDOztPQUVHO2FBQzZCLFdBQU0sR0FBUyxJQUFJLENBQUM7SUFFcEQ7O09BRUc7YUFDb0IsU0FBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRWxFOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxVQUFVLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMvQixDQUFDIn0=