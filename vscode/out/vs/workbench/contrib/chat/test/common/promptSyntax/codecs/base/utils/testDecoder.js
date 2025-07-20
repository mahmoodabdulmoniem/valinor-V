/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../../../../base/common/lifecycle.js';
import { SimpleToken } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/simpleToken.js';
/**
 * A reusable test utility that asserts that the given decoder
 * produces the expected `expectedTokens` sequence of tokens.
 *
 * ## Examples
 *
 * ```typescript
 * const stream = newWriteableStream<VSBuffer>(null);
 * const decoder = testDisposables.add(new LinesDecoder(stream));
 *
 * // create a new test utility instance
 * const test = testDisposables.add(new TestDecoder(stream, decoder));
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 * 	   new Line(1, ' hello world'),
 * 	   new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestDecoder extends Disposable {
    constructor(stream, decoder) {
        super();
        this.stream = stream;
        this.decoder = decoder;
        this._register(this.decoder);
    }
    /**
     * Write provided {@linkcode inputData} data to the input byte stream
     * asynchronously in the background in small random-length chunks.
     *
     * @param inputData Input data to send.
     */
    sendData(inputData) {
        // if input data was passed as an array of lines,
        // join them into a single string with newlines
        if (Array.isArray(inputData)) {
            inputData = inputData.join('\n');
        }
        // write the input data to the stream in multiple random-length
        // chunks to simulate real input stream data flows
        let inputDataBytes = VSBuffer.fromString(inputData);
        const interval = setInterval(() => {
            if (inputDataBytes.byteLength <= 0) {
                clearInterval(interval);
                this.stream.end();
                return;
            }
            const dataToSend = inputDataBytes.slice(0, randomInt(inputDataBytes.byteLength));
            this.stream.write(dataToSend);
            inputDataBytes = inputDataBytes.slice(dataToSend.byteLength);
        }, randomInt(5));
        return this;
    }
    /**
     * Run the test sending the `inputData` data to the stream and asserting
     * that the decoder produces the `expectedTokens` sequence of tokens.
     *
     * @param inputData Input data of the input byte stream.
     * @param expectedTokens List of expected tokens the test token must produce.
     * @param tokensConsumeMethod *Optional* method of consuming the decoder stream.
     *       					  Defaults to a random method (see {@linkcode randomTokensConsumeMethod}).
     */
    async run(inputData, expectedTokens, tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        try {
            // initiate the data sending flow
            this.sendData(inputData);
            // receive tokens from the decoder stream
            const receivedTokens = await this.receiveTokens(tokensConsumeMethod);
            // validate the received tokens
            this.validateReceivedTokens(receivedTokens, expectedTokens);
        }
        catch (error) {
            assertDefined(error, `An non-nullable error must be thrown.`);
            assert(error instanceof Error, `An error error instance must be thrown.`);
            // add the tokens consume method to the error message so we
            // would know which method of consuming the tokens failed exactly
            error.message = `[${tokensConsumeMethod}] ${error.message}`;
            throw error;
        }
    }
    /**
     * Randomly generate a tokens consume method type for the test.
     */
    randomTokensConsumeMethod() {
        const testConsumeMethodIndex = randomInt(2);
        switch (testConsumeMethodIndex) {
            // test the `async iterator` code path
            case 0: {
                return 'async-generator';
            }
            // test the `.consumeAll()` method code path
            case 1: {
                return 'consume-all-method';
            }
            // test the `.onData()` event consume flow
            case 2: {
                return 'on-data-event';
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method index '${testConsumeMethodIndex}'.`);
            }
        }
    }
    /**
     * Receive all tokens from the decoder stream using the specified consume method.
     */
    async receiveTokens(tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        // consume the decoder tokens based on specified
        // (or randomly generated) tokens consume method
        const receivedTokens = [];
        switch (tokensConsumeMethod) {
            // test the `async iterator` code path
            case 'async-generator': {
                for await (const token of this.decoder) {
                    if (token === null) {
                        break;
                    }
                    receivedTokens.push(token);
                }
                break;
            }
            // test the `.consumeAll()` method code path
            case 'consume-all-method': {
                receivedTokens.push(...(await this.decoder.consumeAll()));
                break;
            }
            // test the `.onData()` event consume flow
            case 'on-data-event': {
                this.decoder.onData((token) => {
                    receivedTokens.push(token);
                });
                this.decoder.start();
                // in this case we also test the `settled` promise of the decoder
                await this.decoder.settled;
                break;
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method '${tokensConsumeMethod}'.`);
            }
        }
        return receivedTokens;
    }
    /**
     * Validate that received tokens list is equal to the expected one.
     */
    validateReceivedTokens(receivedTokens, expectedTokens) {
        for (let i = 0; i < expectedTokens.length; i++) {
            const expectedToken = expectedTokens[i];
            const receivedToken = receivedTokens[i];
            assertDefined(receivedToken, `Expected token '${i}' to be '${expectedToken}', got 'undefined'.`);
            const expectedTokenString = (expectedToken instanceof SimpleToken)
                ? `${expectedToken} `
                : `\n  "${expectedToken.text}"(${expectedToken.range})\n`;
            const receivedTokenString = (receivedToken instanceof SimpleToken)
                ? receivedToken.toString()
                : `\n  "${receivedToken.text}"(${receivedToken.range})\n`;
            assert(receivedToken.equals(expectedToken), `Expected token '${i}' to be: ${expectedTokenString}got: ${receivedTokenString}`);
        }
        if (receivedTokens.length === expectedTokens.length) {
            return;
        }
        // sanity check - if received/expected list lengths are not equal, the received
        // list must be longer than the expected one, because the other way around case
        // must have been caught by the comparison loop above
        assert(receivedTokens.length > expectedTokens.length, 'Must have received more tokens than expected.');
        const index = expectedTokens.length;
        throw new Error([
            `Expected no '${index}' token present, got '${receivedTokens[index]}'.`,
            `(received ${receivedTokens.length} tokens in total)`,
        ].join(' '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3V0aWxzL3Rlc3REZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFJakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBU2xIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxNQUFNLE9BQU8sV0FBMkQsU0FBUSxVQUFVO0lBQ3pGLFlBQ2tCLE1BQWlDLEVBQ2xDLE9BQVU7UUFFMUIsS0FBSyxFQUFFLENBQUM7UUFIUyxXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUNsQyxZQUFPLEdBQVAsT0FBTyxDQUFHO1FBSTFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLFFBQVEsQ0FDZCxTQUE0QjtRQUU1QixpREFBaUQ7UUFDakQsK0NBQStDO1FBQy9DLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzlCLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFF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