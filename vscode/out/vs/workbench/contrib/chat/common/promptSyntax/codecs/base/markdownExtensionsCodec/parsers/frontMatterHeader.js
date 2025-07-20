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
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { FrontMatterHeader } from '../tokens/frontMatterHeader.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { assert, assertNever } from '../../../../../../../../../base/common/assert.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
import { FrontMatterMarker } from '../tokens/frontMatterMarker.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parses the start marker of a Front Matter header.
 */
export class PartialFrontMatterStartMarker extends ParserBase {
    constructor(token) {
        const { range } = token;
        assert(range.startLineNumber === 1, `Front Matter header must start at the first line, but it starts at line #${range.startLineNumber}.`);
        assert(range.startColumn === 1, `Front Matter header must start at the beginning of the line, but it starts at ${range.startColumn}.`);
        super([token]);
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        // collect a sequence of dash tokens that may end with a CR token
        if ((token instanceof Dash) || (token instanceof CarriageReturn)) {
            // a dash or CR tokens can go only after another dash token
            if ((previousToken instanceof Dash) === false) {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // stop collecting dash tokens when a new line token is encountered
        if (token instanceof NewLine) {
            this.isConsumed = true;
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: new PartialFrontMatterHeader(FrontMatterMarker.fromTokens([
                    ...this.currentTokens,
                    token,
                ])),
            };
        }
        // any other token is invalid for the `start marker`
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
    /**
     * Check if provided dash token can be a start of a Front Matter header.
     */
    static mayStartHeader(token) {
        return (token instanceof Dash)
            && (token.range.startLineNumber === 1)
            && (token.range.startColumn === 1);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterStartMarker.prototype, "accept", null);
/**
 * Parses a Front Matter header that already has a start marker
 * and possibly some content that follows.
 */
export class PartialFrontMatterHeader extends ParserBase {
    constructor(startMarker) {
        super([]);
        this.startMarker = startMarker;
    }
    get tokens() {
        const endMarkerTokens = (this.maybeEndMarker !== undefined)
            ? this.maybeEndMarker.tokens
            : [];
        return [
            ...this.startMarker.tokens,
            ...this.currentTokens,
            ...endMarkerTokens,
        ];
    }
    /**
     * Convert the current token sequence into a {@link FrontMatterHeader} token.
     *
     * Note! that this method marks the current parser object as "consumed"
     *       hence it should not be used after this method is called.
     */
    asFrontMatterHeader() {
        assertDefined(this.maybeEndMarker, 'Cannot convert to Front Matter header token without an end marker.');
        assert(this.maybeEndMarker.dashCount === this.startMarker.dashTokens.length, [
            'Start and end markers must have the same number of dashes',
            `, got ${this.startMarker.dashTokens.length} / ${this.maybeEndMarker.dashCount}.`,
        ].join(''));
        this.isConsumed = true;
        return FrontMatterHeader.fromTokens(this.startMarker.tokens, this.currentTokens, this.maybeEndMarker.tokens);
    }
    accept(token) {
        // if in the mode of parsing the end marker sequence, forward
        // the token to the current end marker parser instance
        if (this.maybeEndMarker !== undefined) {
            return this.acceptEndMarkerToken(token);
        }
        // collect all tokens until a `dash token at the beginning of a line` is found
        if (((token instanceof Dash) === false) || (token.range.startColumn !== 1)) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // a dash token at the beginning of the line might be a start of the `end marker`
        // sequence of the front matter header, hence initialize appropriate parser object
        assert(this.maybeEndMarker === undefined, `End marker parser must not be present.`);
        this.maybeEndMarker = new PartialFrontMatterEndMarker(token);
        return {
            result: 'success',
            wasTokenConsumed: true,
            nextParser: this,
        };
    }
    /**
     * When a end marker parser is present, we pass all tokens to it
     * until it is completes the parsing process(either success or failure).
     */
    acceptEndMarkerToken(token) {
        assertDefined(this.maybeEndMarker, `Partial end marker parser must be initialized.`);
        // if we have a partial end marker, we are in the process of parsing
        // the end marker, so just pass the token to it and return
        const acceptResult = this.maybeEndMarker.accept(token);
        const { result, wasTokenConsumed } = acceptResult;
        if (result === 'success') {
            const { nextParser } = acceptResult;
            const endMarkerParsingComplete = (nextParser instanceof FrontMatterMarker);
            if (endMarkerParsingComplete === false) {
                return {
                    result: 'success',
                    wasTokenConsumed,
                    nextParser: this,
                };
            }
            const endMarker = nextParser;
            // start and end markers must have the same number of dashes, hence
            // if they don't match, we would like to continue parsing the header
            // until we find an end marker with the same number of dashes
            if (endMarker.dashTokens.length !== this.startMarker.dashTokens.length) {
                return this.handleEndMarkerParsingFailure(endMarker.tokens, wasTokenConsumed);
            }
            this.isConsumed = true;
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: FrontMatterHeader.fromTokens(this.startMarker.tokens, this.currentTokens, this.maybeEndMarker.tokens),
            };
        }
        // if failed to parse the end marker, we would like to continue parsing
        // the header until we find a valid end marker
        if (result === 'failure') {
            return this.handleEndMarkerParsingFailure(this.maybeEndMarker.tokens, wasTokenConsumed);
        }
        assertNever(result, `Unexpected result '${result}' while parsing the end marker.`);
    }
    /**
     * On failure to parse the end marker, we need to continue parsing
     * the header because there might be another valid end marker in
     * the stream of tokens. Therefore we copy over the end marker tokens
     * into the list of "content" tokens and reset the end marker parser.
     */
    handleEndMarkerParsingFailure(tokens, wasTokenConsumed) {
        this.currentTokens.push(...tokens);
        delete this.maybeEndMarker;
        return {
            result: 'success',
            wasTokenConsumed,
            nextParser: this,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterHeader.prototype, "accept", null);
/**
 * Parser the end marker sequence of a Front Matter header.
 */
class PartialFrontMatterEndMarker extends ParserBase {
    constructor(token) {
        const { range } = token;
        assert(range.startColumn === 1, `Front Matter header must start at the beginning of the line, but it starts at ${range.startColumn}.`);
        super([token]);
    }
    /**
     * Number of dashes in the marker.
     */
    get dashCount() {
        return this.tokens
            .filter((token) => { return token instanceof Dash; })
            .length;
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        // collect a sequence of dash tokens that may end with a CR token
        if ((token instanceof Dash) || (token instanceof CarriageReturn)) {
            // a dash or CR tokens can go only after another dash token
            if ((previousToken instanceof Dash) === false) {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // stop collecting dash tokens when a new line token is encountered
        if (token instanceof NewLine) {
            this.isConsumed = true;
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: FrontMatterMarker.fromTokens([
                    ...this.currentTokens,
                ]),
            };
        }
        // any other token is invalid for the `start marker`
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterEndMarker.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9tYXJrZG93bkV4dGVuc2lvbnNDb2RlYy9wYXJzZXJzL2Zyb250TWF0dGVySGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBZ0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQXVCLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUV6SDs7R0FFRztBQUNILE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxVQUFrRjtJQUNwSSxZQUFZLEtBQVc7UUFDdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV4QixNQUFNLENBQ0wsS0FBSyxDQUFDLGVBQWUsS0FBSyxDQUFDLEVBQzNCLDRFQUE0RSxLQUFLLENBQUMsZUFBZSxHQUFHLENBQ3BHLENBQUM7UUFFRixNQUFNLENBQ0wsS0FBSyxDQUFDLFdBQVcsS0FBSyxDQUFDLEVBQ3ZCLGlGQUFp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