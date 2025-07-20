/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from './baseToken.js';
/**
 * Composite token consists of a list of other tokens.
 * Composite token consists of a list of other tokens.
 */
export class CompositeToken extends BaseToken {
    constructor(tokens) {
        super(BaseToken.fullRange(tokens));
        this.childTokens = [...tokens];
    }
    get text() {
        return BaseToken.render(this.childTokens);
    }
    /**
     * Tokens that this composite token consists of.
     */
    get children() {
        return this.childTokens;
    }
    /**
     * Check if this token is equal to another one,
     * including all of its child tokens.
     */
    equals(other) {
        if (super.equals(other) === false) {
            return false;
        }
        if (this.children.length !== other.children.length) {
            return false;
        }
        for (let i = 0; i < this.children.length; i++) {
            const childToken = this.children[i];
            const otherChildToken = other.children[i];
            if (childToken.equals(otherChildToken) === false) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlVG9rZW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9jb21wb3NpdGVUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFM0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixjQUVwQixTQUFRLFNBQVM7SUFNbEIsWUFDQyxNQUFlO1FBRWYsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUVuQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBb0IsSUFBSTtRQUN2QixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7T0FHRztJQUNhLE1BQU0sQ0FBQyxLQUFnQjtRQUN0QyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEMsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQ2xELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9