/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseDecoder } from '../baseDecoder.js';
import { MarkdownExtensionsToken } from './tokens/markdownExtensionsToken.js';
import { SimpleDecoder } from '../simpleCodec/simpleDecoder.js';
import { PartialFrontMatterHeader, PartialFrontMatterStartMarker } from './parsers/frontMatterHeader.js';
/**
 * Decoder responsible for decoding extensions of markdown syntax,
 * e.g., a `Front Matter` header, etc.
 */
export class MarkdownExtensionsDecoder extends BaseDecoder {
    constructor(stream) {
        super(new SimpleDecoder(stream));
    }
    onStreamData(token) {
        // front matter headers start with a `-` at the first column of the first line
        if ((this.current === undefined) && PartialFrontMatterStartMarker.mayStartHeader(token)) {
            this.current = new PartialFrontMatterStartMarker(token);
            return;
        }
        // if current parser is not initiated, - we are not inside a sequence of tokens
        // we care about, therefore re-emit the token immediately and continue
        if (this.current === undefined) {
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
            if (nextParser instanceof MarkdownExtensionsToken) {
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
            // then reset the currently initialized parser object
            this.reEmitCurrentTokens();
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        try {
            if (this.current === undefined) {
                return;
            }
            // if current parser can be converted into a valid Front Matter
            // header, then emit it and reset the current parser object
            if (this.current instanceof PartialFrontMatterHeader) {
                this._onData.fire(this.current.asFrontMatterHeader());
                delete this.current;
                return;
            }
        }
        catch {
            // if failed to convert current parser object to a token,
            // re-emit the tokens accumulated so far
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25FeHRlbnNpb25zRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL21hcmtkb3duRXh0ZW5zaW9uc0NvZGVjL21hcmtkb3duRXh0ZW5zaW9uc0RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQXVCLE1BQU0saUNBQWlDLENBQUM7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFPekc7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFdBQTBEO0lBT3hHLFlBQ0MsTUFBZ0M7UUFFaEMsS0FBSyxDQUFDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVrQixZQUFZLENBQUMsS0FBMEI7UUFDekQsOEVBQThFO1FBQzlFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxJQUFJLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pGLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV4RCxPQUFPO1FBQ1IsQ0FBQztRQUVELCtFQUErRTtRQUMvRSxzRUFBc0U7UUFDdEUsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLE9BQU87UUFDUixDQUFDO1FBRUQsOERBQThEO1FBQzlELHNEQUFzRDtRQUN0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLFdBQVcsQ0FBQztZQUVuQywwREFBMEQ7WUFDMUQsK0RBQStEO1lBQy9ELElBQUksVUFBVSxZQUFZLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM5QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDckIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLDhDQUE4QztnQkFDOUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7WUFDM0IsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUVBQWlFO1lBQ2pFLCtEQUErRDtZQUMvRCxxREFBcUQ7WUFDckQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDNUIsQ0FBQztRQUVELHFFQUFxRTtRQUNyRSxxRUFBcUU7UUFDckUsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRWtCLFdBQVc7UUFDN0IsSUFBSSxDQUFDO1lBQ0osSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPO1lBQ1IsQ0FBQztZQUVELCtEQUErRDtZQUMvRCwyREFBMkQ7WUFDM0QsSUFBSSxJQUFJLENBQUMsT0FBTyxZQUFZLHdCQUF3QixFQUFFLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLENBQ2xDLENBQUM7Z0JBQ0YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUNwQixPQUFPO1lBQ1IsQ0FBQztRQUVGLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUix5REFBeUQ7WUFDekQsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzVCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNwQixLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNPLG1CQUFtQjtRQUM1QixJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsT0FBTztRQUNSLENBQUM7UUFFRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0NBQ0QifQ==