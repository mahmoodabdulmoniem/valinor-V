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
import { assert } from '../../../../../../../../../base/common/assert.js';
import { FrontMatterArray } from '../tokens/frontMatterArray.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { VALID_INTER_RECORD_SPACING_TOKENS } from '../constants.js';
import { FrontMatterValueToken } from '../tokens/frontMatterToken.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { Comma, RightBracket } from '../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * List of tokens that can go in-between array items
 * and array brackets.
 */
const VALID_DELIMITER_TOKENS = Object.freeze([
    ...VALID_INTER_RECORD_SPACING_TOKENS,
    Comma,
]);
/**
 * Responsible for parsing an array syntax (or "inline sequence"
 * in YAML terms), e.g. `[1, '2', true, 2.54]`
*/
export class PartialFrontMatterArray extends ParserBase {
    constructor(factory, startToken) {
        super([startToken]);
        this.factory = factory;
        this.startToken = startToken;
        /**
         * Whether an array item is allowed in the current position of the token
         * sequence. E.g., items are allowed after a command or a open bracket,
         * but not immediately after another item in the array.
         */
        this.arrayItemAllowed = true;
    }
    accept(token) {
        if (this.currentValueParser !== undefined) {
            const acceptResult = this.currentValueParser.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            if (result === 'failure') {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed,
                };
            }
            const { nextParser } = acceptResult;
            if (nextParser instanceof FrontMatterValueToken) {
                this.currentTokens.push(nextParser);
                delete this.currentValueParser;
                // if token was not consume, call the `accept()` method
                // recursively so that the current parser can re-process
                // the token (e.g., a comma or a closing square bracket)
                if (wasTokenConsumed === false) {
                    return this.accept(token);
                }
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed,
                };
            }
            this.currentValueParser = nextParser;
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed,
            };
        }
        if (token instanceof RightBracket) {
            // sanity check in case this block moves around
            // to a different place in the code
            assert(this.currentValueParser === undefined, `Unexpected end of array. Last value is not finished.`);
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asArrayToken(),
                wasTokenConsumed: true,
            };
        }
        // iterate until a valid value start token is found
        for (const ValidToken of VALID_DELIMITER_TOKENS) {
            if (token instanceof ValidToken) {
                this.currentTokens.push(token);
                if ((this.arrayItemAllowed === false) && token instanceof Comma) {
                    this.arrayItemAllowed = true;
                }
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
        }
        // is an array item value is allowed at this position, create a new
        // value parser and start the value parsing process using it
        if (this.arrayItemAllowed === true) {
            this.currentValueParser = this.factory.createValue((currentToken) => {
                // comma or a closing square bracket must stop the parsing
                // process of the value represented by a generic sequence of tokens
                return ((currentToken instanceof RightBracket)
                    || (currentToken instanceof Comma));
            });
            this.arrayItemAllowed = false;
            return this.accept(token);
        }
        // in all other cases fail because of the unexpected token type
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
    /**
     * Convert current parser into a {@link FrontMatterArray} token,
     * if possible.
     *
     * @throws if the last token in the accumulated token list
     * 		   is not a closing bracket ({@link RightBracket}).
     */
    asArrayToken() {
        const endToken = this.currentTokens[this.currentTokens.length - 1];
        assertDefined(endToken, 'No tokens found.');
        assert(endToken instanceof RightBracket, 'Cannot find a closing bracket of the array.');
        const valueTokens = [];
        for (const currentToken of this.currentTokens) {
            if ((currentToken instanceof FrontMatterValueToken) === false) {
                continue;
            }
            // the generic sequence tokens can have trailing spacing tokens,
            // hence trim them to ensure the array contains only "clean" values
            if (currentToken instanceof FrontMatterSequence) {
                currentToken.trimEnd();
            }
            valueTokens.push(currentToken);
        }
        this.isConsumed = true;
        return new FrontMatterArray([
            this.startToken,
            ...valueTokens,
            endToken,
        ]);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterArray.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJBcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlckFycmF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUUxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdkUsT0FBTyxFQUFFLEtBQUssRUFBZSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBR3BHOzs7R0FHRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM1QyxHQUFHLGlDQUFpQztJQUNwQyxLQUFLO0NBQ0wsQ0FBQyxDQUFDO0FBRUg7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQTJFO0lBYXZILFlBQ2tCLE9BQWlDLEVBQ2pDLFVBQXVCO1FBRXhDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFISCxZQUFPLEdBQVAsT0FBTyxDQUEwQjtRQUNqQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBVHpDOzs7O1dBSUc7UUFDSyxxQkFBZ0IsR0FBRyxJQUFJLENBQUM7SUFPaEMsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUEwQjtRQUN2QyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNELE1BQU0sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxZQUFZLENBQUM7WUFFbEQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO2dCQUV2QixPQUFPO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixnQkFBZ0I7aUJBQ2hCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLFlBQVksQ0FBQztZQUVwQyxJQUFJLFVBQVUsWUFBWSxxQkFBcUIsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDcEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7Z0JBRS9CLHVEQUF1RDtnQkFDdkQsd0RBQXdEO2dCQUN4RCx3REFBd0Q7Z0JBQ3hELElBQUksZ0JBQWdCLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQ2hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztnQkFFRCxPQUFPO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCO2lCQUNoQixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUM7WUFDckMsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGdCQUFnQjthQUNoQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQ25DLCtDQUErQztZQUMvQyxtQ0FBbUM7WUFDbkMsTUFBTSxDQUNMLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQ3JDLHNEQUFzRCxDQUN0RCxDQUFDO1lBRUYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDdkIsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQy9CLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsS0FBSyxNQUFNLFVBQVUsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pELElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLLENBQUMsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7b0JBQ2pFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7Z0JBQzlCLENBQUM7Z0JBRUQsT0FBTztvQkFDTixNQUFNLEVBQUUsU0FBUztvQkFDakIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLGdCQUFnQixFQUFFLElBQUk7aUJBQ3RCLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELG1FQUFtRTtRQUNuRSw0REFBNEQ7UUFDNUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUNqRCxDQUFDLFlBQVksRUFBRSxFQUFFO2dCQUNoQiwwREFBMEQ7Z0JBQzFELG1FQUFtRTtnQkFDbkUsT0FBTyxDQUNOLENBQUMsWUFBWSxZQUFZLFlBQVksQ0FBQzt1QkFDbkMsQ0FBQyxZQUFZLFlBQVksS0FBSyxDQUFDLENBQ2xDLENBQUM7WUFDSCxDQUFDLENBQ0QsQ0FBQztZQUNGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7WUFFOUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsT0FBTztZQUNOLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLGdCQUFnQixFQUFFLEtBQUs7U0FDdkIsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxZQUFZO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFbkUsYUFBYSxDQUNaLFFBQVEsRUFDUixrQkFBa0IsQ0FDbEIsQ0FBQztRQUVGLE1BQU0sQ0FDTCxRQUFRLFlBQVksWUFBWSxFQUNoQyw2Q0FBNkMsQ0FDN0MsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUE0QixFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLFlBQVksWUFBWSxxQkFBcUIsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMvRCxTQUFTO1lBQ1YsQ0FBQztZQUVELGdFQUFnRTtZQUNoRSxtRUFBbUU7WUFDbkUsSUFBSSxZQUFZLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztnQkFDakQsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixPQUFPLElBQUksZ0JBQWdCLENBQUM7WUFDM0IsSUFBSSxDQUFDLFVBQVU7WUFDZixHQUFHLFdBQVc7WUFDZCxRQUFRO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBakpPO0lBRE4saUJBQWlCO3FEQXNHakIifQ==