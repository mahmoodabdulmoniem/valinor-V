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
import { assert } from '../../../../../../../base/common/assert.js';
import { PromptSlashCommand } from '../tokens/promptSlashCommand.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../base/baseToken.js';
import { At } from '../base/simpleCodec/tokens/at.js';
import { Tab } from '../base/simpleCodec/tokens/tab.js';
import { Hash } from '../base/simpleCodec/tokens/hash.js';
import { Slash } from '../base/simpleCodec/tokens/slash.js';
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
export const STOP_CHARACTERS = [Space, Tab, NewLine, CarriageReturn, VerticalTab, FormFeed, Colon, At, Hash, Slash]
    .map((token) => { return token.symbol; });
/**
 * List of characters that cannot be in an at-mention name (excluding the {@link STOP_CHARACTERS}).
 */
export const INVALID_NAME_CHARACTERS = [ExclamationMark, LeftAngleBracket, RightAngleBracket, LeftBracket, RightBracket]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `prompt /command` sequences.
 * E.g., `/search` or `/explain` command.
 */
export class PartialPromptSlashCommand extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            try {
                // if it is possible to convert current parser to `PromptSlashCommand`, return success result
                return {
                    result: 'success',
                    nextParser: this.asPromptSlashCommand(),
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
     * Try to convert current parser instance into a fully-parsed {@link PromptSlashCommand} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `/` token is available.
     */
    asPromptSlashCommand() {
        // if there is only one token before the stop character
        // must be the starting `/` one), then fail
        assert(this.currentTokens.length > 1, 'Cannot create a prompt /command out of incomplete token sequence.');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // render the characters above into strings, excluding the starting `/` character
        const nameTokens = this.currentTokens.slice(1);
        const atMentionName = BaseToken.render(nameTokens);
        return new PromptSlashCommand(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), atMentionName);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptSlashCommand.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0U2xhc2hDb21tYW5kUGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3BhcnNlcnMvcHJvbXB0U2xhc2hDb21tYW5kUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxF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