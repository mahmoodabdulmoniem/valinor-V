/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text } from '../../textToken.js';
import { BaseToken } from '../../baseToken.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
import { FrontMatterMarker } from './frontMatterMarker.js';
/**
 * Token that represents a `Front Matter` header in a text.
 */
export class FrontMatterHeader extends MarkdownExtensionsToken {
    constructor(range, startMarker, content, endMarker) {
        super(range);
        this.startMarker = startMarker;
        this.content = content;
        this.endMarker = endMarker;
    }
    /**
     * Return complete text representation of the token.
     */
    get text() {
        const text = [
            this.startMarker.text,
            this.content.text,
            this.endMarker.text,
        ];
        return text.join('');
    }
    /**
     * Range of the content of the Front Matter header.
     */
    get contentRange() {
        return this.content.range;
    }
    /**
     * Content token of the Front Matter header.
     */
    get contentToken() {
        return this.content;
    }
    /**
     * Create new instance of the token from the given tokens.
     */
    static fromTokens(startMarkerTokens, contentTokens, endMarkerTokens) {
        const range = BaseToken.fullRange([...startMarkerTokens, ...endMarkerTokens]);
        return new FrontMatterHeader(range, FrontMatterMarker.fromTokens(startMarkerTokens), new Text(contentTokens), FrontMatterMarker.fromTokens(endMarkerTokens));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `frontmatter("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9tYXJrZG93bkV4dGVuc2lvbnNDb2RlYy90b2tlbnMvZnJvbnRNYXR0ZXJIZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWdCLE1BQU0sd0JBQXdCLENBQUM7QUFFekU7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsdUJBQXVCO0lBQzdELFlBQ0MsS0FBWSxFQUNJLFdBQThCLEVBQzlCLE9BQWEsRUFDYixTQUE0QjtRQUU1QyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFKRyxnQkFBVyxHQUFYLFdBQVcsQ0FBbUI7UUFDOUIsWUFBTyxHQUFQLE9BQU8sQ0FBTTtRQUNiLGNBQVMsR0FBVCxTQUFTLENBQW1CO0lBRzdDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE1BQU0sSUFBSSxHQUFhO1lBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSTtZQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUk7WUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJO1NBQ25CLENBQUM7UUFFRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsVUFBVSxDQUN2QixpQkFBMEMsRUFDMUMsYUFBNkMsRUFDN0MsZUFBd0M7UUFFeEMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FDaEMsQ0FBQyxHQUFHLGlCQUFpQixFQUFFLEdBQUcsZUFBZSxDQUFDLENBQzFDLENBQUM7UUFFRixPQUFPLElBQUksaUJBQWlCLENBQzNCLEtBQUssRUFDTCxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFDL0MsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQ3ZCLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FDN0MsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxnQkFBZ0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxRCxDQUFDO0NBQ0QifQ==