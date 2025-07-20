/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NewLine } from '../linesCodec/tokens/newLine.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../linesCodec/linesDecoder.js';
import { At, Tab, Word, Hash, Dash, Colon, Slash, Space, Quote, Comma, FormFeed, DollarSign, DoubleQuote, VerticalTab, LeftBracket, RightBracket, LeftCurlyBrace, RightCurlyBrace, ExclamationMark, LeftParenthesis, RightParenthesis, LeftAngleBracket, RightAngleBracket, } from './tokens/tokens.js';
import { SimpleToken } from './tokens/simpleToken.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * List of well-known distinct tokens that this decoder emits (excluding
 * the word stop characters defined below). Everything else is considered
 * an arbitrary "text" sequence and is emitted as a single {@link Word} token.
 */
export const WELL_KNOWN_TOKENS = Object.freeze([
    LeftParenthesis, RightParenthesis, LeftBracket, RightBracket, LeftCurlyBrace, RightCurlyBrace,
    LeftAngleBracket, RightAngleBracket, Space, Tab, VerticalTab, FormFeed, Colon, Hash, Dash,
    ExclamationMark, At, Slash, DollarSign, Quote, DoubleQuote, Comma,
]);
/**
 * A {@link Word} sequence stops when one of the well-known tokens are encountered.
 * Note! the `\r` and `\n` are excluded from the list because this decoder based on
 *       the {@link LinesDecoder} which emits {@link Line} tokens without them.
 */
const WORD_STOP_CHARACTERS = Object.freeze(WELL_KNOWN_TOKENS.map(token => token.symbol));
/**
 * A decoder that can decode a stream of `Line`s into a stream
 * of simple token, - `Word`, `Space`, `Tab`, `NewLine`, etc.
 */
export class SimpleDecoder extends BaseDecoder {
    constructor(stream) {
        super(new LinesDecoder(stream));
    }
    onStreamData(line) {
        // re-emit new line tokens immediately
        if (line instanceof CarriageReturn || line instanceof NewLine) {
            this._onData.fire(line);
            return;
        }
        // loop through the text separating it into `Word` and `well-known` tokens
        const lineText = line.text.split('');
        let i = 0;
        while (i < lineText.length) {
            // index is 0-based, but column numbers are 1-based
            const columnNumber = i + 1;
            const character = lineText[i];
            // check if the current character is a well-known token
            const tokenConstructor = WELL_KNOWN_TOKENS
                .find((wellKnownToken) => {
                return wellKnownToken.symbol === character;
            });
            // if it is a well-known token, emit it and continue to the next one
            if (tokenConstructor) {
                this._onData.fire(SimpleToken.newOnLine(line, columnNumber, tokenConstructor));
                i++;
                continue;
            }
            // otherwise, it is an arbitrary "text" sequence of characters,
            // that needs to be collected into a single `Word` token, hence
            // read all the characters until a stop character is encountered
            let word = '';
            while (i < lineText.length && !(WORD_STOP_CHARACTERS.includes(lineText[i]))) {
                word += lineText[i];
                i++;
            }
            // emit a "text" sequence of characters as a single `Word` token
            this._onData.fire(Word.newOnLine(word, line, columnNumber));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3NpbXBsZURlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsWUFBWSxFQUErQixNQUFNLCtCQUErQixDQUFDO0FBQzFGLE9BQU8sRUFDTixFQUFFLEVBQ0YsR0FBRyxFQUNILElBQUksRUFDSixJQUFJLEVBQ0osSUFBSSxFQUNKLEtBQUssRUFDTCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEtBQUssRUFDTCxLQUFLLEVBQ0wsUUFBUSxFQUNSLFVBQVUsRUFDVixXQUFXLEVBQ1gsV0FBVyxFQUVYLFdBQVcsRUFDWCxZQUFZLEVBRVosY0FBYyxFQUNkLGVBQWUsRUFDZixlQUFlLEVBRWYsZUFBZSxFQUNmLGdCQUFnQixFQUVoQixnQkFBZ0IsRUFDaEIsaUJBQWlCLEdBQ2pCLE1BQU0sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFxQixXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFnQmhEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBK0MsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUMxRixlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsZUFBZTtJQUM3RixnQkFBZ0IsRUFBRSxpQkFBaUIs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