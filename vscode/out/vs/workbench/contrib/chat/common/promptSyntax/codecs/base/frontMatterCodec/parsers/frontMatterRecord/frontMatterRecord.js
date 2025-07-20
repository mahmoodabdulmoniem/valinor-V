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
import { NewLine } from '../../../linesCodec/tokens/newLine.js';
import { PartialFrontMatterValue } from '../frontMatterValue.js';
import { assertNever } from '../../../../../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../../../../../base/common/types.js';
import { PartialFrontMatterSequence } from '../frontMatterSequence.js';
import { CarriageReturn } from '../../../linesCodec/tokens/carriageReturn.js';
import { Word, FormFeed, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
import { FrontMatterValueToken, FrontMatterRecord } from '../../tokens/index.js';
/**
 * Parser for a `record` inside a Front Matter header.
 *
 *  * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * isExample: true
 * ---
 * ```
 */
export class PartialFrontMatterRecord extends ParserBase {
    constructor(factory, tokens) {
        super(tokens);
        this.factory = factory;
        this.recordNameToken = tokens[0];
        this.recordDelimiterToken = tokens[1];
    }
    accept(token) {
        if (this.valueParser !== undefined) {
            const acceptResult = this.valueParser.accept(token);
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
                delete this.valueParser;
                this.isConsumed = true;
                try {
                    return {
                        result: 'success',
                        nextParser: new FrontMatterRecord([
                            this.recordNameToken,
                            this.recordDelimiterToken,
                            nextParser,
                        ]),
                        wasTokenConsumed,
                    };
                }
                catch (_error) {
                    return {
                        result: 'failure',
                        wasTokenConsumed,
                    };
                }
            }
            this.valueParser = nextParser;
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed,
            };
        }
        // iterate until the first non-space token is found
        if (token instanceof SpacingToken) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if token can start a "value" sequence, parse the value
        if (PartialFrontMatterValue.isValueStartToken(token)) {
            this.valueParser = this.factory.createValue(shouldEndTokenSequence);
            return this.accept(token);
        }
        // in all other cases, collect all the subsequent tokens into
        // a "sequence of tokens" until a new line is found
        this.valueParser = this.factory.createSequence(shouldEndTokenSequence);
        // if we reached this "generic sequence" parser point, but the current token is
        // already of a type that stops such sequence, we must have accumulated some
        // spacing tokens, hence pass those to the parser and end the sequence immediately
        if (shouldEndTokenSequence(token)) {
            const spaceTokens = this.currentTokens
                .slice(this.startTokensCount);
            // if no space tokens accumulated at all, create an "empty" one this is needed
            // to ensure that the parser always has at least one token hence it can have
            // a valid range and can be interpreted as a real "value" token of the record
            if (spaceTokens.length === 0) {
                spaceTokens.push(Word.newOnLine('', token.range.startLineNumber, token.range.startColumn));
            }
            this.valueParser.addTokens(spaceTokens);
            return {
                result: 'success',
                nextParser: this.asRecordToken(),
                wasTokenConsumed: false,
            };
        }
        // otherwise use the "generic sequence" parser moving on
        return this.accept(token);
    }
    /**
     * Convert current parser into a {@link FrontMatterRecord} token.
     *
     * @throws if no current parser is present, or it is not of the {@link PartialFrontMatterValue}
     *         or {@link PartialFrontMatterSequence} types
     */
    asRecordToken() {
        assertDefined(this.valueParser, 'Current value parser must be defined.');
        if ((this.valueParser instanceof PartialFrontMatterValue)
            || (this.valueParser instanceof PartialFrontMatterSequence)) {
            const valueToken = this.valueParser.asSequenceToken();
            this.currentTokens.push(valueToken);
            this.isConsumed = true;
            return new FrontMatterRecord([
                this.recordNameToken,
                this.recordDelimiterToken,
                valueToken,
            ]);
        }
        assertNever(this.valueParser, `Unexpected value parser '${this.valueParser}'.`);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecord.prototype, "accept", null);
/**
 * Callback to check if a current token should end a
 * record value that is a generic sequence of tokens.
 */
function shouldEndTokenSequence(token) {
    return ((token instanceof NewLine)
        || (token instanceof CarriageReturn)
        || (token instanceof FormFeed));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJSZWNvcmQvZnJvbnRNYXR0ZXJSZWNvcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQTJCLE1BQU0sb0NBQW9DLENBQUM7QUFDNUcsT0FBTyxFQUFFLHFCQUFxQixFQUFxRCxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBUXBJOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQTRDO0lBV3pGLFlBQ2tCLE9BQWlDLEVBQ2xELE1BQTJEO1FBRTNELEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUhHLFlBQU8sR0FBUCxPQUFPLENBQTBCO1FBSWxELElBQUksQ0FBQyxlQUFl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