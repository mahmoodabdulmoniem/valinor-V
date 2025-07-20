/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Line } from './tokens/line.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { NewLine } from './tokens/newLine.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { CarriageReturn } from './tokens/carriageReturn.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * The `decoder` part of the `LinesCodec` and is able to transform
 * data from a binary stream into a stream of text lines(`Line`).
 */
export class LinesDecoder extends BaseDecoder {
    constructor() {
        super(...arguments);
        /**
         * Buffered received data yet to be processed.
         */
        this.buffer = VSBuffer.alloc(0);
    }
    /**
     * Process data received from the input stream.
     */
    onStreamData(chunk) {
        this.buffer = VSBuffer.concat([this.buffer, chunk]);
        this.processData(false);
    }
    /**
     * Process buffered data.
     *
     * @param streamEnded Flag that indicates if the input stream has ended,
     * 					  which means that is the last call of this method.
     * @throws If internal logic implementation error is detected.
     */
    processData(streamEnded) {
        // iterate over each line of the data buffer, emitting each line
        // as a `Line` token followed by a `NewLine` token, if applies
        while (this.buffer.byteLength > 0) {
            // get line number based on a previously emitted line, if any
            const lineNumber = this.lastEmittedLine
                ? this.lastEmittedLine.range.startLineNumber + 1
                : 1;
            // find the `\r`, `\n`, or `\r\n` tokens in the data
            const endOfLineTokens = this.findEndOfLineTokens(lineNumber, streamEnded);
            const firstToken = endOfLineTokens[0];
            // if no end-of-the-line tokens found, stop the current processing
            // attempt because we either (1) need more data to be received or
            // (2) the stream has ended; in the case (2) remaining data must
            // be emitted as the last line
            if (firstToken === undefined) {
                // (2) if `streamEnded`, we need to emit the whole remaining
                // data as the last line immediately
                if (streamEnded) {
                    this.emitLine(lineNumber, this.buffer.slice(0));
                }
                break;
            }
            // emit the line found in the data as the `Line` token
            this.emitLine(lineNumber, this.buffer.slice(0, firstToken.range.startColumn - 1));
            // must always hold true as the `emitLine` above sets this
            assertDefined(this.lastEmittedLine, 'No last emitted line found.');
            // Note! A standalone `\r` token case is not a well-defined case, and
            // 		 was primarily used by old Mac OSx systems which treated it as
            // 		 a line ending (same as `\n`). Hence for backward compatibility
            // 		 with those systems, we treat it as a new line token as well.
            // 		 We do that by replacing standalone `\r` token with `\n` one.
            if ((endOfLineTokens.length === 1) && (firstToken instanceof CarriageReturn)) {
                endOfLineTokens.splice(0, 1, new NewLine(firstToken.range));
            }
            // emit the end-of-the-line tokens
            let startColumn = this.lastEmittedLine.range.endColumn;
            for (const token of endOfLineTokens) {
                const byteLength = token.byte.byteLength;
                const endColumn = startColumn + byteLength;
                // emit the token updating its column start/end numbers based on
                // the emitted line text length and previous end-of-the-line token
                this._onData.fire(token.withRange({ startColumn, endColumn }));
                // shorten the data buffer by the length of the token
                this.buffer = this.buffer.slice(byteLength);
                // update the start column for the next token
                startColumn = endColumn;
            }
        }
        // if the stream has ended, assert that the input data buffer is now empty
        // otherwise we have a logic error and leaving some buffered data behind
        if (streamEnded) {
            assert(this.buffer.byteLength === 0, 'Expected the input data buffer to be empty when the stream ends.');
        }
    }
    /**
     * Find the end of line tokens in the data buffer.
     * Can return:
     *  - [`\r`, `\n`] tokens if the sequence is found
     *  - [`\r`] token if only the carriage return is found
     *  - [`\n`] token if only the newline is found
     *  - an `empty array` if no end of line tokens found
     */
    findEndOfLineTokens(lineNumber, streamEnded) {
        const result = [];
        // find the first occurrence of the carriage return and newline tokens
        const carriageReturnIndex = this.buffer.indexOf(CarriageReturn.byte);
        const newLineIndex = this.buffer.indexOf(NewLine.byte);
        // if the `\r` comes before the `\n`(if `\n` present at all)
        if (carriageReturnIndex >= 0 && ((carriageReturnIndex < newLineIndex) || (newLineIndex === -1))) {
            // add the carriage return token first
            result.push(new CarriageReturn(new Range(lineNumber, (carriageReturnIndex + 1), lineNumber, (carriageReturnIndex + 1) + CarriageReturn.byte.byteLength)));
            // if the `\r\n` sequence
            if (newLineIndex === carriageReturnIndex + 1) {
                // add the newline token to the result
                result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
            }
            // either `\r` or `\r\n` cases found; if we have the `\r` token, we can return
            // the end-of-line tokens only, if the `\r` is followed by at least one more
            // character (it could be a `\n` or any other character), or if the stream has
            // ended (which means the `\r` is at the end of the line)
            if ((this.buffer.byteLength > carriageReturnIndex + 1) || streamEnded) {
                return result;
            }
            // in all other cases, return the empty array (no lend-of-line tokens found)
            return [];
        }
        // no `\r`, but there is `\n`
        if (newLineIndex >= 0) {
            result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
        }
        // neither `\r` nor `\n` found, no end of line found at all
        return result;
    }
    /**
     * Emit a provided line as the `Line` token to the output stream.
     */
    emitLine(lineNumber, // Note! 1-based indexing
    lineBytes) {
        const line = new Line(lineNumber, lineBytes.toString());
        this._onData.fire(line);
        // store the last emitted line so we can use it when we need
        // to send the remaining line in the `onStreamEnd` method
        this.lastEmittedLine = line;
        // shorten the data buffer by the length of the line emitted
        this.buffer = this.buffer.slice(lineBytes.byteLength);
    }
    /**
     * Handle the end of the input stream - if the buffer still has some data,
     * emit it as the last available line token before firing the `onEnd` event.
     */
    onStreamEnd() {
        // if the input data buffer is not empty when the input stream ends, emit
        // the remaining data as the last line before firing the `onEnd` event
        if (this.buffer.byteLength > 0) {
            this.processData(true);
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbGluZXNDb2RlYy9saW5lc0RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQVloRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLFdBQWlDO0lBQW5FOztRQUNDOztXQUVHO1FBQ0ssV0FBTSxHQUFhLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUE0TTlDLENBQUM7SUFsTUE7O09BRUc7SUFDZ0IsWUFBWSxDQUFDLEtBQWU7UUFDOUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVE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