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
import { asBoolean, FrontMatterBoolean } from '../tokens/frontMatterBoolean.js';
import { FrontMatterValueToken } from '../tokens/frontMatterToken.js';
import { PartialFrontMatterSequence } from './frontMatterSequence.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { Word, Quote, DoubleQuote, LeftBracket } from '../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * List of tokens that can start a "value" sequence.
 *
 * - {@link Word} - can be a `boolean` value
 * - {@link Quote}, {@link DoubleQuote} - can start a `string` value
 * - {@link LeftBracket} - can start an `array` value
 */
export const VALID_VALUE_START_TOKENS = Object.freeze([
    Quote,
    DoubleQuote,
    LeftBracket,
]);
/**
 * Parser responsible for parsing a "value" sequence in a Front Matter header.
 */
export class PartialFrontMatterValue extends ParserBase {
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens() {
        if (this.currentValueParser === undefined) {
            return [];
        }
        return this.currentValueParser.tokens;
    }
    constructor(factory, 
    /**
     * Callback function to pass to the {@link PartialFrontMatterSequence}
     * if the current "value" sequence is not of a specific type.
     */
    shouldStop) {
        super();
        this.factory = factory;
        this.shouldStop = shouldStop;
    }
    accept(token) {
        if (this.currentValueParser !== undefined) {
            const acceptResult = this.currentValueParser.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            // current value parser is consumed with its child value parser
            this.isConsumed = this.currentValueParser.consumed;
            if (result === 'success') {
                const { nextParser } = acceptResult;
                if (nextParser instanceof FrontMatterValueToken) {
                    return {
                        result: 'success',
                        nextParser,
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
            return {
                result: 'failure',
                wasTokenConsumed,
            };
        }
        // if the first token represents a `quote` character, try to parse a string value
        if ((token instanceof Quote) || (token instanceof DoubleQuote)) {
            this.currentValueParser = this.factory.createString(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if the first token represents a `[` character, try to parse an array value
        if (token instanceof LeftBracket) {
            this.currentValueParser = this.factory.createArray(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if the first token represents a `word` try to parse a boolean
        const maybeBoolean = FrontMatterBoolean.tryFromToken(token);
        if (maybeBoolean !== null) {
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: maybeBoolean,
                wasTokenConsumed: true,
            };
        }
        // in all other cases, collect all the subsequent tokens into
        // a generic sequence of tokens until stopped by the `this.shouldStop`
        // callback or the call to the 'this.asSequenceToken' method
        this.currentValueParser = this.factory.createSequence(this.shouldStop);
        return this.accept(token);
    }
    /**
     * Check if provided token can be a start of a "value" sequence.
     * See {@link VALID_VALUE_START_TOKENS} for the list of valid tokens.
     */
    static isValueStartToken(token) {
        for (const ValidToken of VALID_VALUE_START_TOKENS) {
            if (token instanceof ValidToken) {
                return true;
            }
        }
        if ((token instanceof Word) && (asBoolean(token) !== null)) {
            return true;
        }
        return false;
    }
    /**
     * Check if the current 'value' sequence does not have a specific type
     * and is represented by a generic sequence of tokens ({@link PartialFrontMatterSequence}).
     */
    get isSequence() {
        if (this.currentValueParser === undefined) {
            return false;
        }
        return (this.currentValueParser instanceof PartialFrontMatterSequence);
    }
    /**
     * Convert current parser into a generic sequence of tokens.
     */
    asSequenceToken() {
        this.isConsumed = true;
        return new FrontMatterSequence(this.tokens);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterValue.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJWYWx1ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlclZhbHVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUdwRzs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3JELEtBQUs7SUFDTCxXQUFXO0lBQ1gsV0FBVztDQUNYLENBQUMsQ0FBQztBQU9IOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQWdGO0lBTzVIOztPQUVHO0lBQ0gsSUFBb0IsTUFBTTtRQUN6QixJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFN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