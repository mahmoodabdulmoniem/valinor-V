/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
/**
 * Marker for the start and end of a Front Matter header.
 */
export class FrontMatterMarker extends MarkdownExtensionsToken {
    /**
     * Returns complete text representation of the token.
     */
    get text() {
        return BaseToken.render(this.tokens);
    }
    /**
     * List of {@link Dash} tokens in the marker.
     */
    get dashTokens() {
        return this.tokens
            .filter((token) => { return token instanceof Dash; });
    }
    constructor(range, tokens) {
        super(range);
        this.tokens = tokens;
    }
    /**
     * Create new instance of the token from a provided
     * list of tokens.
     */
    static fromTokens(tokens) {
        const range = BaseToken.fullRange(tokens);
        return new FrontMatterMarker(range, tokens);
    }
    toString() {
        return `frontmatter-marker(${this.dashTokens.length}:${this.range})`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJNYXJrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9tYXJrZG93bkV4dGVuc2lvbnNDb2RlYy90b2tlbnMvZnJvbnRNYXR0ZXJNYXJrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV4RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQVF2RTs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSx1QkFBdUI7SUFDN0Q7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxNQUFNO2FBQ2hCLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsT0FBTyxLQUFLLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELFlBQ0MsS0FBWSxFQUNJLE1BQStCO1FBRS9DLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUZHLFdBQU0sR0FBTixNQUFNLENBQXlCO0lBR2hELENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsVUFBVSxDQUN2QixNQUErQjtRQUUvQixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTFDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLHNCQUFzQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUM7SUFDdEUsQ0FBQztDQUNEIn0=