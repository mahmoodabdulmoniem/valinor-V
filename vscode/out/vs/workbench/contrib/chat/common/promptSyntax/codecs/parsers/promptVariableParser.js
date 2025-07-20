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
import { Range } from '../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../base/baseToken.js';
import { PromptVariable, PromptVariableWithData } from '../tokens/promptVariable.js';
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
 * List of characters that terminate the prompt variable sequence.
 */
export const STOP_CHARACTERS = [Space, Tab, NewLine, CarriageReturn, VerticalTab, FormFeed, Hash, At]
    .map((token) => { return token.symbol; });
/**
 * List of characters that cannot be in a variable name (excluding the {@link STOP_CHARACTERS}).
 */
export const INVALID_NAME_CHARACTERS = [Hash, Colon, ExclamationMark, LeftAngleBracket, RightAngleBracket, LeftBracket, RightBracket]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `prompt variable name`.
 * E.g., `#selection` or `#codebase` variable. If the `:` character follows
 * the variable name, the parser transitions to {@link PartialPromptVariableWithData}
 * that is also able to parse the `data` part of the variable. E.g., the `#file` part
 * of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableName extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            try {
                // if it is possible to convert current parser to `PromptVariable`, return success result
                return {
                    result: 'success',
                    nextParser: this.asPromptVariable(),
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
        // if a `:` character is encountered, we might transition to {@link PartialPromptVariableWithData}
        if (token instanceof Colon) {
            this.isConsumed = true;
            // if there is only one token before the `:` character, it must be the starting
            // `#` symbol, therefore fail because there is no variable name present
            if (this.currentTokens.length <= 1) {
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            // otherwise, if there are more characters after `#` available,
            // we have a variable name, so we can transition to {@link PromptVariableWithData}
            return {
                result: 'success',
                nextParser: new PartialPromptVariableWithData([...this.currentTokens, token]),
                wasTokenConsumed: true,
            };
        }
        // variables cannot have {@link INVALID_NAME_CHARACTERS} in their names
        if (INVALID_NAME_CHARACTERS.includes(token.text)) {
            this.isConsumed = true;
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // otherwise, a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptVariable} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `#` token is available.
     */
    asPromptVariable() {
        // if there is only one token before the stop character
        // must be the starting `#` one), then fail
        assert(this.currentTokens.length > 1, 'Cannot create a prompt variable out of incomplete token sequence.');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // render the characters above into strings, excluding the starting `#` character
        const variableNameTokens = this.currentTokens.slice(1);
        const variableName = BaseToken.render(variableNameTokens);
        return new PromptVariable(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableName.prototype, "accept", null);
/**
 * The parser responsible for parsing a `prompt variable name` with `data`.
 * E.g., the `/path/to/something.md` part of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableWithData extends ParserBase {
    constructor(tokens) {
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        // sanity checks of our expectations about the tokens list
        assert(tokens.length > 2, `Tokens list must contain at least 3 items, got '${tokens.length}'.`);
        assert(firstToken instanceof Hash, `The first token must be a '#', got '${firstToken} '.`);
        assert(lastToken instanceof Colon, `The last token must be a ':', got '${lastToken} '.`);
        super([...tokens]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            // in any case, success of failure below, this is an end of the parsing process
            this.isConsumed = true;
            const firstToken = this.currentTokens[0];
            const lastToken = this.currentTokens[this.currentTokens.length - 1];
            // tokens representing variable name without the `#` character at the start and
            // the `:` data separator character at the end
            const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
            // tokens representing variable data without the `:` separator character at the start
            const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
            // compute the full range of the variable token
            const fullRange = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
            // render the characters above into strings
            const variableName = BaseToken.render(variableNameTokens);
            const variableData = BaseToken.render(variableDataTokens);
            return {
                result: 'success',
                nextParser: new PromptVariableWithData(fullRange, variableName, variableData),
                wasTokenConsumed: false,
            };
        }
        // otherwise, token is a valid data character - the data can contain almost any character,
        // including `:` and `#`, hence add it to the list of the current tokens and continue
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link asPromptVariableWithData} token.
     */
    asPromptVariableWithData() {
        // tokens representing variable name without the `#` character at the start and
        // the `:` data separator character at the end
        const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
        // tokens representing variable data without the `:` separator character at the start
        const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
        // render the characters above into strings
        const variableName = BaseToken.render(variableNameTokens);
        const variableData = BaseToken.render(variableDataTokens);
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        return new PromptVariableWithData(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName, variableData);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableWithData.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGVQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvcGFyc2Vycy9wcm9tcHRWYXJpYWJsZVBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckYsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFX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