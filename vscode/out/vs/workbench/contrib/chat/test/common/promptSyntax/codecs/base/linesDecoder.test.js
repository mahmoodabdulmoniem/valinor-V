/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { Line } from '../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/line.js';
import { TestDecoder } from './utils/testDecoder.js';
import { NewLine } from '../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { newWriteableStream } from '../../../../../../../../base/common/stream.js';
import { CarriageReturn } from '../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../../../../../common/promptSyntax/codecs/base/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
/**
 * Note! This decoder is also often used to test common logic of abstract {@link BaseDecoder}
 * class, because the {@link LinesDecoder} is one of the simplest non-abstract decoders we have.
 */
suite('LinesDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test the core logic with specific method of consuming
     * tokens that are produced by a lines decoder instance.
     */
    suite('core logic', () => {
        testLinesDecoder('async-generator', disposables);
        testLinesDecoder('consume-all-method', disposables);
        testLinesDecoder('on-data-event', disposables);
    });
    suite('settled promise', () => {
        test('throws if accessed on not-yet-started decoder instance', () => {
            const test = disposables.add(new TestLinesDecoder());
            assert.throws(() => {
                // testing the field access that throws here, so
                // its OK to not use the returned value afterwards
                // eslint-disable-next-line local/code-no-unused-expressions
                test.decoder.settled;
            }, [
                'Cannot get `settled` promise of a stream that has not been started.',
                'Please call `start()` first.',
            ].join(' '));
        });
    });
    suite('start', () => {
        test('throws if the decoder object is already `disposed`', () => {
            const test = disposables.add(new TestLinesDecoder());
            const { decoder } = test;
            decoder.dispose();
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already disposed.');
        });
        test('throws if the decoder object is already `ended`', async () => {
            const inputStream = newWriteableStream(null);
            const test = disposables.add(new TestLinesDecoder(inputStream));
            const { decoder } = test;
            setTimeout(() => {
                test.sendData([
                    'hello',
                    'world :wave:',
                ]);
            }, 5);
            const receivedTokens = await decoder.start()
                .consumeAll();
            // a basic sanity check for received tokens
            assert.strictEqual(receivedTokens.length, 3, 'Must produce the correct number of tokens.');
            // validate that calling `start()` after stream has ended throws
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already ended.');
        });
    });
});
/**
 * A reusable test utility that asserts that a `LinesDecoder` instance
 * correctly decodes `inputData` into a stream of `TLineToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = disposables.add(new TestLinesDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 *     new Line(1, ' hello world'),
 *     new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestLinesDecoder extends TestDecoder {
    constructor(inputStream) {
        const stream = (inputStream)
            ? inputStream
            : newWriteableStream(null);
        const decoder = new LinesDecoder(stream);
        super(stream, decoder);
    }
}
/**
 * Common reusable test utility to validate {@link LinesDecoder} logic with
 * the provided {@link tokensConsumeMethod} way of consuming decoder-produced tokens.
 *
 * @throws if a test fails, please see thrown error for failure details.
 * @param tokensConsumeMethod The way to consume tokens produced by the decoder.
 * @param disposables Test disposables store.
 */
function testLinesDecoder(tokensConsumeMethod, disposables) {
    suite(tokensConsumeMethod, () => {
        suite('produces expected tokens', () => {
            test('input starts with line data', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run(' hello world\nhow are you doing?\n\n 😊 \r', [
                    new Line(1, ' hello world'),
                    new NewLine(new Range(1, 13, 1, 14)),
                    new Line(2, 'how are you doing?'),
                    new NewLine(new Range(2, 19, 2, 20)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ' 😊 '),
                    new NewLine(new Range(4, 5, 4, 6)),
                ]);
            });
            test('standalone \\r is treated as new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run(' hello world\nhow are you doing?\n\n 😊 \r ', [
                    new Line(1, ' hello world'),
                    new NewLine(new Range(1, 13, 1, 14)),
                    new Line(2, 'how are you doing?'),
                    new NewLine(new Range(2, 19, 2, 20)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ' 😊 '),
                    new NewLine(new Range(4, 5, 4, 6)),
                    new Line(5, ' '),
                ]);
            });
            test('input starts with a new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\nsome text on this line\n\n\nanother 💬 on this line\r\n🤫\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, 'some text on this line'),
                    new NewLine(new Range(2, 23, 2, 24)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ''),
                    new NewLine(new Range(4, 1, 4, 2)),
                    new Line(5, 'another 💬 on this line'),
                    new CarriageReturn(new Range(5, 24, 5, 25)),
                    new NewLine(new Range(5, 25, 5, 26)),
                    new Line(6, '🤫'),
                    new NewLine(new Range(6, 3, 6, 4)),
                ]);
            });
            test('input starts and ends with multiple new lines', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\n\n\r\nciao! 🗯️\t💭 💥 come\tva?\n\n\n\n\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new NewLine(new Range(2, 1, 2, 2)),
                    new Line(3, ''),
                    new CarriageReturn(new Range(3, 1, 3, 2)),
                    new NewLine(new Range(3, 2, 3, 3)),
                    new Line(4, 'ciao! 🗯️\t💭 💥 come\tva?'),
                    new NewLine(new Range(4, 25, 4, 26)),
                    new Line(5, ''),
                    new NewLine(new Range(5, 1, 5, 2)),
                    new Line(6, ''),
                    new NewLine(new Range(6, 1, 6, 2)),
                    new Line(7, ''),
                    new NewLine(new Range(7, 1, 7, 2)),
                    new Line(8, ''),
                    new NewLine(new Range(8, 1, 8, 2)),
                ]);
            });
            test('single carriage return is treated as new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\r\rhaalo! 💥💥 how\'re you?\r ?!\r\n\r\n ', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new NewLine(new Range(2, 1, 2, 2)),
                    new Line(3, 'haalo! 💥💥 how\'re you?'),
                    new NewLine(new Range(3, 24, 3, 25)),
                    new Line(4, ' ?!'),
                    new CarriageReturn(new Range(4, 4, 4, 5)),
                    new NewLine(new Range(4, 5, 4, 6)),
                    new Line(5, ''),
                    new CarriageReturn(new Range(5, 1, 5, 2)),
                    new NewLine(new Range(5, 2, 5, 3)),
                    new Line(6, ' '),
                ]);
            });
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2xpbmVzRGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFHNUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQXdCLE1BQU0sd0JBQXdCLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBbUIsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDcEgsT0FBTyxFQUFFLFlBQVksRUFBYyxNQUFNLDJFQUEyRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTVHOzs7R0FHRztBQUNILEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDakQsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxD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QyxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2YsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2YsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsNEJBQTRCLENBQUM7b0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNsQyxDQUNELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDaEUsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFFckQsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiLDRDQUE0QyxFQUM1QztvQkFDQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsMEJBQTBCLENBQUM7b0JBQ3ZDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO29CQUNsQixJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2YsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO2lCQUNoQixDQUNELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=