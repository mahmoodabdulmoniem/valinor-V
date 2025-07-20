/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a "generic sequence of tokens"
 * of an arbitrary length in a Front Matter header.
 */
export class PartialFrontMatterSequence extends ParserBase {
    constructor(
    /**
     * Callback function that is called to check if the current token
     * should stop the parsing process of the current generic "value"
     * sequence of arbitrary tokens by returning `true`.
     *
     * When this happens, the parser *will not consume* the token that
     * was passed to the `shouldStop` callback or to its `accept` method.
     * On the other hand, the parser will be "consumed" hence using it
     * to process other tokens will yield an error.
     */
    shouldStop) {
        super([]);
        this.shouldStop = shouldStop;
    }
    accept(token) {
        // collect all tokens until an end of the sequence is found
        if (this.shouldStop(token)) {
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asSequenceToken(),
                wasTokenConsumed: false,
            };
        }
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Add provided tokens to the list of the current parsed tokens.
     */
    addTokens(tokens) {
        this.currentTokens.push(...tokens);
        return this;
    }
    /**
     * Convert the current parser into a {@link FrontMatterSequence} token.
     */
    asSequenceToken() {
        this.isConsumed = true;
        return new FrontMatterSequence(this.currentTokens);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterSequence.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlclNlcXVlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFFcEc7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBRy9DO0lBQ0E7SUFDQzs7Ozs7Ozs7O09BU0c7SUFDYyxVQUF5QztRQUUxRCxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFGTyxlQUFVLEdBQVYsVUFBVSxDQUErQjtJQUczRCxDQUFDO0lBR00sTUFBTSxDQUNaLEtBQTBCO1FBRzFCLDJEQUEyRDtRQUMzRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUV2QixPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDbEMsZ0JBQWdCLEVBQUUsS0FBSzthQUN2QixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTixNQUFNLEVBQUUsU0FBUztZQUNqQixVQUFVLEVBQUUsSUFBSTtZQUNoQixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxTQUFTLENBQ2YsTUFBc0M7UUFFdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUVuQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNJLGVBQWU7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFdkIsT0FBTyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0Q7QUExQ087SUFETixpQkFBaUI7d0RBc0JqQiJ9