/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
import { Word, SpacingToken } from '../../simpleCodec/tokens/tokens.js';
/**
 * Token represents a generic sequence of tokens in a Front Matter header.
 */
export class FrontMatterSequence extends FrontMatterValueToken {
    /**
     * @override Because this token represent a generic sequence of tokens,
     *           the type name is represented by the sequence of tokens itself
     */
    get valueTypeName() {
        return this;
    }
    /**
     * Text of the sequence value. The method exists to provide a
     * consistent interface with {@link FrontMatterString} token.
     *
     * Note! that this method does not automatically trim spacing tokens
     *       in the sequence. If you need to get a trimmed value, call
     *       {@link trimEnd} method first.
     */
    get cleanText() {
        return this.text;
    }
    /**
     * Trim spacing tokens at the end of the sequence.
     */
    trimEnd() {
        const trimmedTokens = [];
        // iterate the tokens list from the end to the start, collecting
        // all the spacing tokens we encounter until we reach a non-spacing token
        let lastNonSpace = this.childTokens.length - 1;
        while (lastNonSpace >= 0) {
            const token = this.childTokens[lastNonSpace];
            if (token instanceof SpacingToken) {
                trimmedTokens.push(token);
                lastNonSpace--;
                continue;
            }
            break;
        }
        this.childTokens.length = lastNonSpace + 1;
        // if there are only spacing tokens were present add a single
        // empty token to the sequence, so it has something to work with
        if (this.childTokens.length === 0) {
            this.collapseRangeToStart();
            this.childTokens.push(new Word(this.range, ''));
        }
        // update the current range to reflect the current trimmed value
        this.withRange(BaseToken.fullRange(this.childTokens));
        // trimmed tokens are collected starting from the end,
        // moving to the start, hence reverse them before returning
        return trimmedTokens.reverse();
    }
    toString() {
        return `front-matter-sequence(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvdG9rZW5zL2Zyb250TWF0dGVyU2VxdWVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFJeEU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEscUJBQTBFO0lBQ2xIOzs7T0FHRztJQUNILElBQW9CLGFBQWE7UUFDaEMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksT0FBTztRQUNiLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUV6QixnRUFBZ0U7UUFDaEUseUVBQXlFO1FBQ3pFLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUMvQyxPQUFPLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTdDLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUNuQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQixZQUFZLEVBQUUsQ0FBQztnQkFFZixTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUUzQyw2REFBNkQ7UUFDN0QsZ0VBQWdFO1FBQ2hFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCxnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FDckMsQ0FBQztRQUVGLHNEQUFzRDtRQUN0RCwyREFBMkQ7UUFDM0QsT0FBTyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVlLFFBQVE7UUFDdkIsT0FBTyx5QkFBeUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNsRSxDQUFDO0NBQ0QifQ==