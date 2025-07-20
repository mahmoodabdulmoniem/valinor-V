/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { MarkdownLink } from '../tokens/markdownLink.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { FormFeed } from '../../simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
import { RightBracket } from '../../simpleCodec/tokens/brackets.js';
import { ParserBase } from '../../simpleCodec/parserBase.js';
import { LeftParenthesis, RightParenthesis } from '../../simpleCodec/tokens/parentheses.js';
/**
 * List of characters that are not allowed in links so stop a markdown link sequence abruptly.
 */
const MARKDOWN_LINK_STOP_CHARACTERS = [CarriageReturn, NewLine, VerticalTab, FormFeed]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `markdown link caption` part of a markdown
 * link (e.g., the `[caption text]` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with single `[` token and collects all tokens until
 * the first `]` token is encountered. In this successful case, the parser transitions
 * into the {@link MarkdownLinkCaption} parser type which continues the general
 * parsing process of the markdown link.
 *
 * Otherwise, if one of the stop characters defined in the {@link MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the `]` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 */
export class PartialMarkdownLinkCaption extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // any of stop characters is are breaking a markdown link caption sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the `]` character ends the caption of a markdown link
        if (token instanceof RightBracket) {
            return {
                result: 'success',
                nextParser: new MarkdownLinkCaption([...this.tokens, token]),
                wasTokenConsumed: true,
            };
        }
        // otherwise, include the token in the sequence
        // and keep the current parser object instance
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
/**
 * The parser responsible for transitioning from a {@link PartialMarkdownLinkCaption}
 * parser to the {@link PartialMarkdownLink} one, therefore serves a parser glue between
 * the `[caption]` and the `(./some/path)` parts of the `[caption](./some/path)` link.
 *
 * The only successful case of this parser is the `(` token that initiated the process
 * of parsing the `reference` part of a markdown link and in this case the parser
 * transitions into the `PartialMarkdownLink` parser type.
 *
 * Any other character is considered a failure result. In this case, the caller is assumed
 * to be responsible for re-emitting the {@link tokens} accumulated so far as standalone
 * entities since they are no longer represent a coherent token entity of a larger size.
 */
export class MarkdownLinkCaption extends ParserBase {
    accept(token) {
        // the `(` character starts the link part of a markdown link
        // that is the only character that can follow the caption
        if (token instanceof LeftParenthesis) {
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: new PartialMarkdownLink([...this.tokens], token),
            };
        }
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
/**
 * The parser responsible for parsing a `link reference` part of a markdown link
 * (e.g., the `(./some/path)` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with tokens that represent the `[caption]` part of a markdown
 * link, followed by the `(` token. The parser collects all subsequent tokens until final closing
 * parenthesis (`)`) is encountered (*\*see [1] below*). In this successful case, the parser object
 * transitions into the {@link MarkdownLink} token type which signifies the end of the entire
 * parsing process of the link text.
 *
 * Otherwise, if one of the stop characters defined in the {@link MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the final `)` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 *
 * `[1]` The `reference` part of the markdown link can contain any number of nested parenthesis, e.g.,
 * 	  `[caption](/some/p(th/file.md)` is a valid markdown link and a valid folder name, hence number
 *     of open parenthesis must match the number of closing ones and the path sequence is considered
 *     to be complete as soon as this requirement is met. Therefore the `final` word is used in
 *     the description comments above to highlight this important detail.
 */
export class PartialMarkdownLink extends ParserBase {
    constructor(captionTokens, token) {
        super([token]);
        this.captionTokens = captionTokens;
        /**
         * Number of open parenthesis in the sequence.
         * See comment in the {@link accept} method for more details.
         */
        this.openParensCount = 1;
    }
    get tokens() {
        return [...this.captionTokens, ...this.currentTokens];
    }
    accept(token) {
        // markdown links allow for nested parenthesis inside the link reference part, but
        // the number of open parenthesis must match the number of closing parenthesis, e.g.:
        // 	- `[caption](/some/p()th/file.md)` is a valid markdown link
        // 	- `[caption](/some/p(th/file.md)` is an invalid markdown link
        // hence we use the `openParensCount` variable to keep track of the number of open
        // parenthesis encountered so far; then upon encountering a closing parenthesis we
        // decrement the `openParensCount` and if it reaches 0 - we consider the link reference
        // to be complete
        if (token instanceof LeftParenthesis) {
            this.openParensCount += 1;
        }
        if (token instanceof RightParenthesis) {
            this.openParensCount -= 1;
            // sanity check! this must alway hold true because we return a complete markdown
            // link as soon as we encounter matching number of closing parenthesis, hence
            // we must never have `openParensCount` that is less than 0
            assert(this.openParensCount >= 0, `Unexpected right parenthesis token encountered: '${token}'.`);
            // the markdown link is complete as soon as we get the same number of closing parenthesis
            if (this.openParensCount === 0) {
                const { startLineNumber, startColumn } = this.captionTokens[0].range;
                // create link caption string
                const caption = BaseToken.render(this.captionTokens);
                // create link reference string
                this.currentTokens.push(token);
                const reference = BaseToken.render(this.currentTokens);
                // return complete markdown link object
                return {
                    result: 'success',
                    wasTokenConsumed: true,
                    nextParser: new MarkdownLink(startLineNumber, startColumn, caption, reference),
                };
            }
        }
        // any of stop characters is are breaking a markdown link reference sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the rest of the tokens can be included in the sequence
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duTGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTVGOztHQUVHO0FBQ0gsTUFBTSw2QkFBNkIsR0FBc0IsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUM7S0FDdkcsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUzQzs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNI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