/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './tokens/markdownToken.js';
import { LeftBracket } from '../simpleCodec/tokens/brackets.js';
import { PartialMarkdownImage } from './parsers/markdownImage.js';
import { LeftAngleBracket } from '../simpleCodec/tokens/angleBrackets.js';
import { ExclamationMark } from '../simpleCodec/tokens/exclamationMark.js';
import { BaseDecoder } from '../baseDecoder.js';
import { MarkdownCommentStart, PartialMarkdownCommentStart } from './parsers/markdownComment.js';
import { MarkdownExtensionsDecoder } from '../markdownExtensionsCodec/markdownExtensionsDecoder.js';
import { PartialMarkdownLinkCaption } from './parsers/markdownLink.js';
/**
 * Decoder capable of parsing markdown entities (e.g., links) from a sequence of simple tokens.
 */
export class MarkdownDecoder extends BaseDecoder {
    constructor(stream) {
        super(new MarkdownExtensionsDecoder(stream));
    }
    onStreamData(token) {
        // `markdown links` start with `[` character, so here we can
        // initiate the process of parsing a markdown link
        if (token instanceof LeftBracket && !this.current) {
            this.current = new PartialMarkdownLinkCaption(token);
            return;
        }
        // `markdown comments` start with `<` character, so here we can
        // initiate the process of parsing a markdown comment
        if (token instanceof LeftAngleBracket && !this.current) {
            this.current = new PartialMarkdownCommentStart(token);
            return;
        }
        // `markdown image links` start with `!` character, so here we can
        // initiate the process of parsing a markdown image
        if (token instanceof ExclamationMark && !this.current) {
            this.current = new PartialMarkdownImage(token);
            return;
        }
        // if current parser was not initiated before, - we are not inside a sequence
        // of tokens we care about, therefore re-emit the token immediately and continue
        if (!this.current) {
            this._onData.fire(token);
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        if (parseResult.result === 'success') {
            const { nextParser } = parseResult;
            // if got a fully parsed out token back, emit it and reset
            // the current parser object so a new parsing process can start
            if (nextParser instanceof MarkdownToken) {
                this._onData.fire(nextParser);
                delete this.current;
            }
            else {
                // otherwise, update the current parser object
                this.current = nextParser;
            }
        }
        else {
            // if failed to parse a sequence of a tokens as a single markdown
            // entity (e.g., a link), re-emit the tokens accumulated so far
            // then reset the current parser object
            for (const currentToken of this.current.tokens) {
                this._onData.fire(currentToken);
            }
            delete this.current;
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        // if the stream has ended and there is a current incomplete parser
        // object present, handle the remaining parser object
        if (this.current) {
            // if a `markdown comment` does not have an end marker `-->`
            // it is still a comment that extends to the end of the file
            // so re-emit the current parser as a comment token
            if (this.current instanceof MarkdownCommentStart) {
                this._onData.fire(this.current.asMarkdownComment());
                delete this.current;
                this.onStreamEnd();
                return;
            }
            // in all other cases, re-emit existing parser tokens
            const { tokens } = this.current;
            for (const token of [...tokens]) {
                this._onData.fire(token);
            }
            delete this.current;
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25EZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25Db2RlYy9tYXJrZG93bkRlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUdsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3BHLE9BQU8sRUFBNEMsMEJBQTBCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQU9qSDs7R0FFRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQWdEO0lBVXBGLFlBQ0MsTUFBZ0M7UUFFaEMsS0FBSyxDQUFDLElBQUkseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRWtCLFlBQVksQ0FBQyxLQUEwQjtRQUN6RCw0REFBNEQ7UUFDNUQsa0RBQWtEO1FBQ2xELElBQUksS0FBSyxZQUFZLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUs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