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
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../../baseToken.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { MarkdownComment } from '../tokens/markdownComment.js';
import { ExclamationMark } from '../../simpleCodec/tokens/exclamationMark.js';
import { LeftAngleBracket, RightAngleBracket } from '../../simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * The parser responsible for parsing the `<!--` sequence - the start of a `markdown comment`.
 */
export class PartialMarkdownCommentStart extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // if received `!` after `<`, continue the parsing process
        if (token instanceof ExclamationMark && lastToken instanceof LeftAngleBracket) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if received `-` after, check that previous token either `!` or `-`,
        // which allows to continue the parsing process, otherwise fail
        if (token instanceof Dash) {
            this.currentTokens.push(token);
            if (lastToken instanceof ExclamationMark) {
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            if (lastToken instanceof Dash) {
                const token1 = this.currentTokens[0];
                const token2 = this.currentTokens[1];
                const token3 = this.currentTokens[2];
                const token4 = this.currentTokens[3];
                // sanity checks
                assert(token1 instanceof LeftAngleBracket, `The first token must be a '<', got '${token1}'.`);
                assert(token2 instanceof ExclamationMark, `The second token must be a '!', got '${token2}'.`);
                assert(token3 instanceof Dash, `The third token must be a '-', got '${token3}'.`);
                assert(token4 instanceof Dash, `The fourth token must be a '-', got '${token4}'.`);
                this.isConsumed = true;
                return {
                    result: 'success',
                    nextParser: new MarkdownCommentStart([token1, token2, token3, token4]),
                    wasTokenConsumed: true,
                };
            }
        }
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownCommentStart.prototype, "accept", null);
/**
 * The parser responsible for a `markdown comment` sequence of tokens.
 * E.g. `<!-- some comment` which may or may not end with `-->`. If it does,
 * then the parser transitions to the {@link MarkdownComment} token.
 */
export class MarkdownCommentStart extends ParserBase {
    constructor(tokens) {
        super(tokens);
    }
    accept(token) {
        // if received `>` while current token sequence ends with `--`,
        // then this is the end of the comment sequence
        if (token instanceof RightAngleBracket && this.endsWithDashes) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this.asMarkdownComment(),
                wasTokenConsumed: true,
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
     * Convert the current token sequence into a {@link MarkdownComment} token.
     *
     * Note! that this method marks the current parser object as "consumed"
     *       hence it should not be used after this method is called.
     */
    asMarkdownComment() {
        this.isConsumed = true;
        return new MarkdownComment(this.range, BaseToken.render(this.currentTokens));
    }
    /**
     * Get range of current token sequence.
     */
    get range() {
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        const range = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
        return range;
    }
    /**
     * Whether the current token sequence ends with two dashes.
     */
    get endsWithDashes() {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        if (!(lastToken instanceof Dash)) {
            return false;
        }
        const secondLastToken = this.currentTokens[this.currentTokens.length - 2];
        if (!(secondLastToken instanceof Dash)) {
            return false;
        }
        return true;
    }
}
__decorate([
    assertNotConsumed
], MarkdownCommentStart.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Db21tZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duQ29tbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBRXBHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQW1GO0lBQ25JLFlBQVksS0FBdUI7UUFDbEMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBR00sTUFBTSxDQUFDLEtBQTBCO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEUsMERBQTBEO1FBQzFELElBQUksS0FBSyxZQUFZ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