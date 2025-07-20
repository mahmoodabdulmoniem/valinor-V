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
import { PromptAtMention } from '../tokens/promptAtMention.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../base/baseToken.js';
import { At } from '../base/simpleCodec/tokens/at.js';
import { Tab } from '../base/simpleCodec/tokens/tab.js';
import { Hash } from '../base/simpleCodec/tokens/hash.js';
import { Space } from '../base/simpleCodec/tokens/space.js';
import { Colon } from '../base/simpleCodec/tokens/colon.js';
import { NewLine } from '../base/linesCodec/tokens/newLine.js';
import { FormFeed } from '../base/simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../base/simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../base/linesCodec/tokens/carriageReturn.js';
import { ExclamationMark } from '../base/simpleCodec/tokens/exclamationMark.js';
import { LeftBracket, RightBracket } from '../base/simpleCodec/tokens/brackets.js';
import { LeftAngleBracket, RightAngleBracket } from '../base/simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase } from '../base/simpleCodec/parserBase.js';
/**
 * List of characters that terminate the prompt at-mention sequence.
 */
export const STOP_CHARACTERS = [Space, Tab, NewLine, CarriageReturn, VerticalTab, FormFeed, At, Colon, Hash]
    .map((token) => { return token.symbol; });
/**
 * List of characters that cannot be in an at-mention name (excluding the {@link STOP_CHARACTERS}).
 */
export const INVALID_NAME_CHARACTERS = [ExclamationMark, LeftAngleBracket, RightAngleBracket, LeftBracket, RightBracket]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `prompt @mention` sequences.
 * E.g., `@workspace` or `@github` participant mention.
 */
export class PartialPromptAtMention extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            try {
                // if it is possible to convert current parser to `PromptAtMention`, return success result
                return {
                    result: 'success',
                    nextParser: this.asPromptAtMention(),
                    wasTokenConsumed: false,
                };
            }
            catch (error) {
                // otherwise fail
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            finally {
                // in any case this is an end of the parsing process
                this.isConsumed = true;
            }
        }
        // variables cannot have {@link INVALID_NAME_CHARACTERS} in their names
        if (INVALID_NAME_CHARACTERS.includes(token.text)) {
            this.isConsumed = true;
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // otherwise it is a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptAtMention} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `@` token is available.
     */
    asPromptAtMention() {
        // if there is only one token before the stop character
        // must be the starting `@` one), then fail
        assert(this.currentTokens.length > 1, 'Cannot create a prompt @mention out of incomplete token sequence.');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // render the characters above into strings, excluding the starting `@` character
        const nameTokens = this.currentTokens.slice(1);
        const atMentionName = BaseToken.render(nameTokens);
        return new PromptAtMention(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), atMentionName);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptAtMention.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXRNZW50aW9uUGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3BhcnNlcnMvcHJvbXB0QXRNZW50aW9uUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLG1DQUFtQyxDQUFDO0FBRXRHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFzQixDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDO0tBQzdILEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBc0IsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQztLQUN6SSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTNDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUF5RTtJQUNwSCxZQUFZLEtBQVM7UUFDcEIsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBR00sTUFBTSxDQUFDLEtBQTBCO1FBQ3ZDLG1FQUFtRTtRQUNuRSxJQUFJLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDO2dCQUNKLDBGQUEwRjtnQkFDMUYsT0FBTztvQkFDTixNQUFNLEVBQUUsU0FBUztvQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtvQkFDcEMsZ0JBQWdCLEVBQUUsS0FBSztpQkFDdkIsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixpQkFBaUI7Z0JBQ2pCLE9BQU87b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLGdCQUFnQixFQUFFLEtBQUs7aUJBQ3ZCLENBQUM7WUFDSCxDQUFDO29CQUFTLENBQUM7Z0JBQ1Ysb0RBQW9EO2dCQUNwRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELHVFQUF1RTtRQUN2RSxJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUV2QixPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3ZCLENBQUM7UUFDSCxDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUvQixPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksaUJBQWlCO1FBQ3ZCLHVEQUF1RDtRQUN2RCwyQ0FBMkM7UUFDM0MsTUFBTSxDQUNMLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDN0IsbUVBQW1FLENBQ25FLENBQUM7UUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEUsaUZBQWlGO1FBQ2pGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbkQsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxLQUFLLENBQ1IsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ2hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUM1QixTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDN0IsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQ3pCLEVBQ0QsYUFBYSxDQUNiLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUExRU87SUFETixpQkFBaUI7b0RBMENqQiJ9