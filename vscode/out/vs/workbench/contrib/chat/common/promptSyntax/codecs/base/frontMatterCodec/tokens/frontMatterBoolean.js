/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Word } from '../../simpleCodec/tokens/tokens.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
/**
 * Token that represents a `boolean` value in a Front Matter header.
 */
export class FrontMatterBoolean extends FrontMatterValueToken {
    /**
     * @throws if provided {@link Word} cannot be converted to a `boolean` value.
     */
    constructor(token) {
        const value = asBoolean(token);
        assertDefined(value, `Cannot convert '${token}' to a boolean value.`);
        super([token]);
        /**
         * Name of the `boolean` value type.
         */
        this.valueTypeName = 'boolean';
        this.value = value;
    }
    /**
     * Try creating a {@link FrontMatterBoolean} out of provided token.
     * Unlike the constructor, this method does not throw, returning
     * a 'null' value on failure instead.
     */
    static tryFromToken(token) {
        if (token instanceof Word === false) {
            return null;
        }
        try {
            return new FrontMatterBoolean(token);
        }
        catch (_error) {
            // noop
            return null;
        }
    }
    equals(other) {
        if (super.equals(other) === false) {
            return false;
        }
        return this.value === other.value;
    }
    toString() {
        return `front-matter-boolean(${this.shortText()})${this.range}`;
    }
}
/**
 * Try to convert a {@link Word} token to a `boolean` value.
 */
export function asBoolean(token) {
    if (token.text.toLowerCase() === 'true') {
        return true;
    }
    if (token.text.toLowerCase() === 'false') {
        return false;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJCb29sZWFuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy90b2tlbnMvZnJvbnRNYXR0ZXJCb29sZWFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFaEY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEscUJBQWlEO0lBV3hGOztPQUVHO0lBQ0gsWUFBWSxLQUFXO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixhQUFhLENBQ1osS0FBSyxFQUNMLG1CQUFtQixLQUFLLHVCQUF1QixDQUMvQyxDQUFDO1FBRUYsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQXBCaEI7O1dBRUc7UUFDc0Isa0JBQWEsR0FBRyxTQUFTLENBQUM7UUFtQmxELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksTUFBTSxDQUFDLFlBQVksQ0FDekIsS0FBZ0I7UUFFaEIsSUFBSSxLQUFLLFlBQVksSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQUMsT0FBTyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPO1lBQ1AsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVlLE1BQU0sQ0FBQyxLQUFnQjtRQUN0QyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVlLFFBQVE7UUFDdkIsT0FBTyx3QkFBd0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQ3hCLEtBQVc7SUFFWCxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDekMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQzFDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9