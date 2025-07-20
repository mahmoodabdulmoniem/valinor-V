/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { TestDecoder } from '../utils/testDecoder.js';
import { newWriteableStream } from '../../../../../../../../../base/common/stream.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { DoubleQuote } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/doubleQuote.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { LeftBracket, RightBracket } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/brackets.js';
import { FrontMatterDecoder } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/frontMatterDecoder.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { ExclamationMark, Quote, Tab, Word, Space, Colon, VerticalTab, Comma, Dash } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterBoolean, FrontMatterString, FrontMatterArray, FrontMatterRecord, FrontMatterRecordDelimiter, FrontMatterRecordName } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Front Matter decoder for testing purposes.
 */
export class TestFrontMatterDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new FrontMatterDecoder(stream);
        super(stream, decoder);
    }
}
suite('FrontMatterDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('produces expected tokens', async () => {
        const test = disposables.add(new TestFrontMatterDecoder());
        await test.run([
            'just: "write some yaml "',
            'write-some :\t[ \' just\t \',  "yaml!", true, , ,]',
            'anotherField \t\t\t  :  FALSE ',
        ], [
            // first record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(1, 5, 1, 6)),
                    new Space(new Range(1, 6, 1, 7)),
                ]),
                new FrontMatterString([
                    new DoubleQuote(new Range(1, 7, 1, 8)),
                    new Word(new Range(1, 8, 1, 8 + 5), 'write'),
                    new Space(new Range(1, 13, 1, 14)),
                    new Word(new Range(1, 14, 1, 14 + 4), 'some'),
                    new Space(new Range(1, 18, 1, 19)),
                    new Word(new Range(1, 19, 1, 19 + 4), 'yaml'),
                    new Space(new Range(1, 23, 1, 24)),
                    new DoubleQuote(new Range(1, 24, 1, 25)),
                ]),
            ]),
            new NewLine(new Range(1, 25, 1, 26)),
            // second record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(2, 1, 2, 1 + 5), 'write'),
                    new Dash(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 7 + 4), 'some'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(2, 12, 2, 13)),
                    new Tab(new Range(2, 13, 2, 14)),
                ]),
                new FrontMatterArray([
                    new LeftBracket(new Range(2, 14, 2, 15)),
                    new FrontMatterString([
                        new Quote(new Range(2, 16, 2, 17)),
                        new Space(new Range(2, 17, 2, 18)),
                        new Word(new Range(2, 18, 2, 18 + 4), 'just'),
                        new Tab(new Range(2, 22, 2, 23)),
                        new Space(new Range(2, 23, 2, 24)),
                        new Quote(new Range(2, 24, 2, 25)),
                    ]),
                    new FrontMatterString([
                        new DoubleQuote(new Range(2, 28, 2, 29)),
                        new Word(new Range(2, 29, 2, 29 + 4), 'yaml'),
                        new ExclamationMark(new Range(2, 33, 2, 34)),
                        new DoubleQuote(new Range(2, 34, 2, 35)),
                    ]),
                    new FrontMatterBoolean(new Word(new Range(2, 37, 2, 37 + 4), 'true')),
                    new RightBracket(new Range(2, 46, 2, 47)),
                ]),
            ]),
            new NewLine(new Range(2, 47, 2, 48)),
            // third record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(3, 1, 3, 1 + 12), 'anotherField'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(3, 19, 3, 20)),
                    new Space(new Range(3, 20, 3, 21)),
                ]),
                new FrontMatterBoolean(new Word(new Range(3, 22, 3, 22 + 5), 'FALSE')),
            ]),
            new Space(new Range(3, 27, 3, 28)),
        ]);
    });
    suite('record', () => {
        suite('values', () => {
            test('unquoted string', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    'just: write some yaml ',
                    'anotherField \t\t :  fal\v \t',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 5, 1, 6)),
                            new Space(new Range(1, 6, 1, 7)),
                        ]),
                        new FrontMatterSequence([
                            new Word(new Range(1, 7, 1, 7 + 5), 'write'),
                            new Space(new Range(1, 12, 1, 13)),
                            new Word(new Range(1, 13, 1, 13 + 4), 'some'),
                            new Space(new Range(1, 17, 1, 18)),
                            new Word(new Range(1, 18, 1, 18 + 4), 'yaml'),
                        ]),
                    ]),
                    new Space(new Range(1, 22, 1, 23)),
                    new NewLine(new Range(1, 23, 1, 24)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(2, 1, 2, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(2, 17, 2, 18)),
                            new Space(new Range(2, 18, 2, 19)),
                        ]),
                        new FrontMatterSequence([
                            new Word(new Range(2, 20, 2, 20 + 3), 'fal'),
                        ]),
                    ]),
                    new VerticalTab(new Range(2, 23, 2, 24)),
                    new Space(new Range(2, 24, 2, 25)),
                    new Tab(new Range(2, 25, 2, 26)),
                ]);
            });
            test('quoted string', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    `just\t:\t'\vdo\tsome\ntesting, please\v' `,
                    'anotherField \t\t :\v\v"fal\nse"',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 6, 1, 7)),
                            new Tab(new Range(1, 7, 1, 8)),
                        ]),
                        new FrontMatterString([
                            new Quote(new Range(1, 8, 1, 9)),
                            new VerticalTab(new Range(1, 9, 1, 10)),
                            new Word(new Range(1, 10, 1, 10 + 2), 'do'),
                            new Tab(new Range(1, 12, 1, 13)),
                            new Word(new Range(1, 13, 1, 13 + 4), 'some'),
                            new NewLine(new Range(1, 17, 1, 18)),
                            new Word(new Range(2, 1, 2, 1 + 7), 'testing'),
                            new Comma(new Range(2, 8, 2, 9)),
                            new Space(new Range(2, 9, 2, 10)),
                            new Word(new Range(2, 10, 2, 10 + 6), 'please'),
                            new VerticalTab(new Range(2, 16, 2, 17)),
                            new Quote(new Range(2, 17, 2, 18)),
                        ]),
                    ]),
                    new Space(new Range(2, 18, 2, 19)),
                    new NewLine(new Range(2, 19, 2, 20)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(3, 1, 3, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(3, 17, 3, 18)),
                            new VerticalTab(new Range(3, 18, 3, 19)),
                        ]),
                        new FrontMatterString([
                            new DoubleQuote(new Range(3, 20, 3, 21)),
                            new Word(new Range(3, 21, 3, 21 + 3), 'fal'),
                            new NewLine(new Range(3, 24, 3, 25)),
                            new Word(new Range(4, 1, 4, 1 + 2), 'se'),
                            new DoubleQuote(new Range(4, 3, 4, 4)),
                        ]),
                    ]),
                ]);
            });
            test('boolean', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    'anotherField \t\t :  FALSE ',
                    'my-field: true\t ',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 17, 1, 18)),
                            new Space(new Range(1, 18, 1, 19)),
                        ]),
                        new FrontMatterBoolean(new Word(new Range(1, 20, 1, 20 + 5), 'FALSE')),
                    ]),
                    new Space(new Range(1, 25, 1, 26)),
                    new NewLine(new Range(1, 26, 1, 27)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(2, 1, 2, 1 + 2), 'my'),
                            new Dash(new Range(2, 3, 2, 4)),
                            new Word(new Range(2, 4, 2, 4 + 5), 'field'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(2, 9, 2, 10)),
                            new Space(new Range(2, 10, 2, 11)),
                        ]),
                        new FrontMatterBoolean(new Word(new Range(2, 11, 2, 11 + 4), 'true')),
                    ]),
                    new Tab(new Range(2, 15, 2, 16)),
                    new Space(new Range(2, 16, 2, 17)),
                ]);
            });
            suite('array', () => {
                test('empty', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t []`,
                        'anotherField \t\t :\v\v"fal\nse"',
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                new RightBracket(new Range(1, 11, 1, 12)),
                            ]),
                        ]),
                        new NewLine(new Range(1, 12, 1, 13)),
                        // second record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(2, 1, 2, 1 + 12), 'anotherField'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(2, 17, 2, 18)),
                                new VerticalTab(new Range(2, 18, 2, 19)),
                            ]),
                            new FrontMatterString([
                                new DoubleQuote(new Range(2, 20, 2, 21)),
                                new Word(new Range(2, 21, 2, 21 + 3), 'fal'),
                                new NewLine(new Range(2, 24, 2, 25)),
                                new Word(new Range(3, 1, 3, 1 + 2), 'se'),
                                new DoubleQuote(new Range(3, 3, 3, 4)),
                            ]),
                        ]),
                    ]);
                });
                test('mixed values', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t [true , 'toolName', some-tool]`,
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                // first array value
                                new FrontMatterBoolean(new Word(new Range(1, 11, 1, 11 + 4), 'true')),
                                // second array value
                                new FrontMatterString([
                                    new Quote(new Range(1, 18, 1, 19)),
                                    new Word(new Range(1, 19, 1, 19 + 8), 'toolName'),
                                    new Quote(new Range(1, 27, 1, 28)),
                                ]),
                                // third array value
                                new FrontMatterSequence([
                                    new Word(new Range(1, 30, 1, 30 + 4), 'some'),
                                    new Dash(new Range(1, 34, 1, 35)),
                                    new Word(new Range(1, 35, 1, 35 + 4), 'tool'),
                                ]),
                                new RightBracket(new Range(1, 39, 1, 40)),
                            ]),
                        ]),
                    ]);
                });
                test('redundant commas', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t [true ,, 'toolName', , , some-tool  ,]`,
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                // first array value
                                new FrontMatterBoolean(new Word(new Range(1, 11, 1, 11 + 4), 'true')),
                                // second array value
                                new FrontMatterString([
                                    new Quote(new Range(1, 19, 1, 20)),
                                    new Word(new Range(1, 20, 1, 20 + 8), 'toolName'),
                                    new Quote(new Range(1, 28, 1, 29)),
                                ]),
                                // third array value
                                new FrontMatterSequence([
                                    new Word(new Range(1, 35, 1, 35 + 4), 'some'),
                                    new Dash(new Range(1, 39, 1, 40)),
                                    new Word(new Range(1, 40, 1, 40 + 4), 'tool'),
                                ]),
                                new RightBracket(new Range(1, 47, 1, 48)),
                            ]),
                        ]),
                    ]);
                });
            });
        });
    });
    test('empty', async () => {
        const test = disposables.add(new TestFrontMatterDecoder());
        await test.run('', []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyRGVjb2Rlci9mcm9udE1hdHRlckRlY29kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN6RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUZBQXFGLENBQUM7QUFFbEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM3SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQztBQUM5SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrR0FBa0csQ0FBQztBQUN2SSxPQUFPLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUMzSyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVB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SSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzdDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDOzRCQUM5QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7NEJBQy9DLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt5QkFDbEMsQ0FBQztxQkFDRixDQUFDO29CQUNGLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE9BQU8sQ0FBQyxJ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