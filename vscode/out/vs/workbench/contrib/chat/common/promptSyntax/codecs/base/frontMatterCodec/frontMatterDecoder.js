/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Word } from '../simpleCodec/tokens/tokens.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { VALID_INTER_RECORD_SPACING_TOKENS } from './constants.js';
import { FrontMatterToken, FrontMatterRecord } from './tokens/index.js';
import { BaseDecoder } from '../baseDecoder.js';
import { SimpleDecoder } from '../simpleCodec/simpleDecoder.js';
import { ObjectStream } from '../utils/objectStream.js';
import { PartialFrontMatterRecord } from './parsers/frontMatterRecord/frontMatterRecord.js';
import { FrontMatterParserFactory } from './parsers/frontMatterParserFactory.js';
/**
 * Decoder capable of parsing Front Matter contents from a sequence of simple tokens.
 */
export class FrontMatterDecoder extends BaseDecoder {
    constructor(stream) {
        if (stream instanceof ObjectStream) {
            super(stream);
        }
        else {
            super(new SimpleDecoder(stream));
        }
        this.parserFactory = new FrontMatterParserFactory();
    }
    onStreamData(token) {
        if (this.current !== undefined) {
            const acceptResult = this.current.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            if (result === 'failure') {
                this.reEmitCurrentTokens();
                if (wasTokenConsumed === false) {
                    this._onData.fire(token);
                }
                delete this.current;
                return;
            }
            const { nextParser } = acceptResult;
            if (nextParser instanceof FrontMatterToken) {
                // front matter record token is the spacial case - because it can
                // contain trailing space tokens, we want to emit "trimmed" record
                // token and the trailing spaces tokens separately
                const trimmedTokens = (nextParser instanceof FrontMatterRecord)
                    ? nextParser.trimValueEnd()
                    : [];
                this._onData.fire(nextParser);
                // re-emit all trailing space tokens if present
                for (const trimmedToken of trimmedTokens) {
                    this._onData.fire(trimmedToken);
                }
                if (wasTokenConsumed === false) {
                    this._onData.fire(token);
                }
                delete this.current;
                return;
            }
            this.current = nextParser;
            if (wasTokenConsumed === false) {
                this._onData.fire(token);
            }
            return;
        }
        // a word token starts a new record
        if (token instanceof Word) {
            this.current = this.parserFactory.createRecordName(token);
            return;
        }
        // re-emit all "space" tokens immediately as all of them
        // are valid while we are not in the "record parsing" mode
        for (const ValidToken of VALID_INTER_RECORD_SPACING_TOKENS) {
            if (token instanceof ValidToken) {
                this._onData.fire(token);
                return;
            }
        }
        // unexpected token type, re-emit existing tokens and continue
        this.reEmitCurrentTokens();
    }
    onStreamEnd() {
        try {
            if (this.current === undefined) {
                return;
            }
            assert(this.current instanceof PartialFrontMatterRecord, 'Only partial front matter records can be processed on stream end.');
            const record = this.current.asRecordToken();
            const trimmedTokens = record.trimValueEnd();
            this._onData.fire(record);
            for (const trimmedToken of trimmedTokens) {
                this._onData.fire(trimmedToken);
            }
        }
        catch (_error) {
            this.reEmitCurrentTokens();
        }
        finally {
            delete this.current;
            super.onStreamEnd();
        }
    }
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    reEmitCurrentTokens() {
        if (this.current === undefined) {
            return;
        }
        for (const token of this.current.tokens) {
            this._onData.fire(token);
        }
        delete this.current;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9mcm9udE1hdHRlckRlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUVuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFFLGFBQWEsRUFBNEIsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFPakY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsV0FBbUQ7SUFTMUYsWUFDQyxNQUFvRTtRQUVwRSxJQUFJLE1BQU0sWUFBWSxZQUFZLEVBQUUsQ0FBQztZQUNwQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDZixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENB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