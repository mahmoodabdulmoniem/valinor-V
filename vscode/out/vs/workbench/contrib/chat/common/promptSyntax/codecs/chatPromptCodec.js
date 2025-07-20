/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatPromptDecoder } from './chatPromptDecoder.js';
/**
 * Codec that is capable to encode and decode tokens of an AI chatbot prompt message.
 */
export const ChatPromptCodec = Object.freeze({
    /**
     * Encode a stream of `TChatPromptToken`s into a stream of `VSBuffer`s.
     *
     * @see {@link ReadableStream}
     * @see {@link VSBuffer}
     */
    encode: (_stream) => {
        throw new Error('The `encode` method is not implemented.');
    },
    /**
     * Decode a of `VSBuffer`s into a readable of `TChatPromptToken`s.
     *
     * @see {@link TChatPromptToken}
     * @see {@link VSBuffer}
     * @see {@link ChatPromptDecoder}
     * @see {@link ReadableStream}
     */
    decode: (stream) => {
        return new ChatPromptDecoder(stream);
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdENvZGVjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHRDb2RlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sd0JBQXdCLENBQUM7QUF3QzdFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFxQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzlEOzs7OztPQUtHO0lBQ0gsTUFBTSxFQUFFLENBQUMsT0FBeUMsRUFBNEIsRUFBRTtRQUMvRSxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxNQUFNLEVBQUUsQ0FBQyxNQUFnQyxFQUFxQixFQUFFO1FBQy9ELE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=