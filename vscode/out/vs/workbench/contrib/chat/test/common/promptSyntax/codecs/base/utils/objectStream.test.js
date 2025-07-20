/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from '../../../../../../../../../base/common/uri.js';
import { createTextModel } from '../../../../../../../../../editor/test/common/testTextModel.js';
import { randomTokens } from '../testUtils/randomTokens.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { CancellationTokenSource } from '../../../../../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { arrayToGenerator, ObjectStream } from '../../../../../../common/promptSyntax/codecs/base/utils/objectStream.js';
import { objectStreamFromTextModel } from '../../../../../../common/promptSyntax/codecs/base/utils/objectStreamFromTextModel.js';
suite('ObjectStream', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('fromArray()', () => {
        test('sends objects in the array', async () => {
            const tokens = randomTokens();
            const stream = disposables.add(ObjectStream.fromArray(tokens));
            const receivedTokens = await consume(stream);
            assertTokensEqual(receivedTokens, tokens);
        });
    });
    suite('fromTextModel()', () => {
        test('sends data in text model', async () => {
            const initialContents = [
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
            ];
            // both line endings should yield the same results
            const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
            const model = disposables.add(createTextModel(initialContents.join(lineEnding), 'unknown', undefined, URI.file('/foo.js')));
            const stream = disposables.add(objectStreamFromTextModel(model));
            const receivedData = await consume(stream);
            assert.strictEqual(receivedData.join(''), initialContents.join(lineEnding), 'Received data must be equal to the initial contents.');
        });
    });
    suite('cancellation token', () => {
        test('can be cancelled', async () => {
            const initialContents = [
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
            ];
            // both line endings should yield the same results
            const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
            const model = disposables.add(createTextModel(initialContents.join(lineEnding), 'unknown', undefined, URI.file('/foo.js')));
            const stopAtLine = randomInt(5, 2);
            const cancellation = disposables.add(new CancellationTokenSource());
            // override the `getLineContent` method to cancel the stream
            // when a specific line number is being read from the model
            const originalGetLineContent = model.getLineContent.bind(model);
            model.getLineContent = (lineNumber) => {
                // cancel the stream when we reach this specific line number
                if (lineNumber === stopAtLine) {
                    cancellation.cancel();
                }
                return originalGetLineContent(lineNumber);
            };
            const stream = disposables.add(objectStreamFromTextModel(model, cancellation.token));
            const receivedData = await consume(stream);
            const expectedData = initialContents
                .slice(0, stopAtLine - 1)
                .join(lineEnding);
            assert.strictEqual(receivedData.join(''), 
            // because the stream is cancelled before the last line,
            // the last message always ends with the line ending
            expectedData + lineEnding, 'Received data must be equal to the contents before cancel.');
        });
    });
    suite('helpers', () => {
        suite('arrayToGenerator()', () => {
            test('sends tokens in the array', async () => {
                const tokens = randomTokens();
                const generator = arrayToGenerator(tokens);
                const receivedTokens = [];
                for (const token of generator) {
                    receivedTokens.push(token);
                }
                assertTokensEqual(receivedTokens, tokens);
            });
        });
    });
});
/**
 * Asserts that two tokens lists are equal.
 */
function assertTokensEqual(receivedTokens, expectedTokens) {
    for (let i = 0; i < expectedTokens.length; i++) {
        const receivedToken = receivedTokens[i];
        assertDefined(receivedToken, `Expected token #${i} to be '${expectedTokens[i]}', got 'undefined'.`);
        assert.ok(expectedTokens[i].equals(receivedTokens[i]), `Expected token #${i} to be '${expectedTokens[i]}', got '${receivedToken}'.`);
    }
}
/**
 * Consume a provided stream and return a list of received data objects.
 */
function consume(stream) {
    return new Promise((resolve, reject) => {
        const receivedData = [];
        stream.on('data', (token) => {
            receivedData.push(token);
        });
        stream.on('end', () => {
            resolve(receivedData);
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3V0aWxzL29iamVjdFN0cmVhbS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDakcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUN6SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzRkFBc0YsQ0FBQztBQUdqSSxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtZ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