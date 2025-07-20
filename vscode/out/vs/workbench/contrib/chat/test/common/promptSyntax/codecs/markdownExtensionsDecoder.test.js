/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../base/common/assert.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { Text } from '../../../../common/promptSyntax/codecs/base/textToken.js';
import { newWriteableStream } from '../../../../../../../base/common/stream.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { TestDecoder } from './base/utils/testDecoder.js';
import { Word } from '../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/word.js';
import { NewLine } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { TestSimpleDecoder } from './base/simpleDecoder.test.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { CarriageReturn } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { FrontMatterHeader } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { Colon, Dash, DoubleQuote, Space, Tab, VerticalTab } from '../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { MarkdownExtensionsDecoder } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/markdownExtensionsDecoder.js';
import { FrontMatterMarker } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/tokens/frontMatterMarker.js';
/**
 * End-of-line utility class for convenience.
 */
class TestEndOfLine extends Text {
    /**
     * Create a new instance with provided end-of line type and
     * a starting position.
     */
    static create(type, lineNumber, startColumn) {
        // sanity checks
        assert(lineNumber >= 1, `Line number must be greater than or equal to 1, got '${lineNumber}'.`);
        assert(startColumn >= 1, `Start column must be greater than or equal to 1, got '${startColumn}'.`);
        const tokens = [];
        if (type === '\r\n') {
            tokens.push(new CarriageReturn(new Range(lineNumber, startColumn, lineNumber, startColumn + 1)));
            startColumn += 1;
        }
        tokens.push(new NewLine(new Range(lineNumber, startColumn, lineNumber, startColumn + 1)));
        return new TestEndOfLine(tokens);
    }
}
/**
 * Test decoder for the `MarkdownExtensionsDecoder` class.
 */
export class TestMarkdownExtensionsDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new MarkdownExtensionsDecoder(stream);
        super(stream, decoder);
    }
}
/**
 * Front Matter marker utility class for testing purposes.
 */
class TestFrontMatterMarker extends FrontMatterMarker {
    /**
     * Create a new instance with provided dashes count,
     * line number, and an end-of-line type.
     */
    static create(dashCount, lineNumber, endOfLine) {
        const tokens = [];
        let columnNumber = 1;
        while (columnNumber <= dashCount) {
            tokens.push(new Dash(new Range(lineNumber, columnNumber, lineNumber, columnNumber + 1)));
            columnNumber++;
        }
        if (endOfLine !== undefined) {
            const endOfLineTokens = TestEndOfLine.create(endOfLine, lineNumber, columnNumber);
            tokens.push(...endOfLineTokens.children);
        }
        return TestFrontMatterMarker.fromTokens(tokens);
    }
}
suite('MarkdownExtensionsDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Create a Front Matter header start/end marker with a random length.
     */
    const randomMarker = (maxDashCount = 10, minDashCount = 1) => {
        const dashCount = randomInt(maxDashCount, minDashCount);
        return new Array(dashCount).fill('-').join('');
    };
    suite('Front Matter header', () => {
        suite('successful cases', () => {
            test('produces expected tokens', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 3);
                const promptContents = [
                    new Array(markerLength).fill('-').join(''),
                    'variables: ',
                    '  - name: value\v',
                    new Array(markerLength).fill('-').join(''),
                    'some text',
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 4, newLine);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 4, 1 + markerLength + newLine.length), startMarker, new Text([
                        new Word(new Range(2, 1, 2, 1 + 9), 'variables'),
                        new Colon(new Range(2, 10, 2, 11)),
                        new Space(new Range(2, 11, 2, 12)),
                        ...TestEndOfLine.create(newLine, 2, 12).children,
                        new Space(new Range(3, 1, 3, 2)),
                        new Space(new Range(3, 2, 3, 3)),
                        new Dash(new Range(3, 3, 3, 4)),
                        new Space(new Range(3, 4, 3, 5)),
                        new Word(new Range(3, 5, 3, 5 + 4), 'name'),
                        new Colon(new Range(3, 9, 3, 10)),
                        new Space(new Range(3, 10, 3, 11)),
                        new Word(new Range(3, 11, 3, 11 + 5), 'value'),
                        new VerticalTab(new Range(3, 16, 3, 17)),
                        ...TestEndOfLine.create(newLine, 3, 17).children,
                    ]), endMarker),
                    // content after the header
                    new Word(new Range(5, 1, 5, 1 + 4), 'some'),
                    new Space(new Range(5, 5, 5, 6)),
                    new Word(new Range(5, 6, 5, 6 + 4), 'text'),
                ]);
            });
            test('can contain dashes in the header contents', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 4);
                // number of dashes inside the header contents it should not matter how many
                // dashes are there, but the count should not be equal to `markerLength`
                const dashesLength = (randomBoolean())
                    ? randomInt(markerLength - 1, 1)
                    : randomInt(2 * markerLength, markerLength + 1);
                const promptContents = [
                    // start marker
                    new Array(markerLength).fill('-').join(''),
                    // contents
                    'variables: ',
                    new Array(dashesLength).fill('-').join(''), // dashes inside the contents
                    '  - name: value\t',
                    // end marker
                    new Array(markerLength).fill('-').join(''),
                    'some text',
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 4, newLine);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 5, 1 + markerLength + newLine.length), startMarker, new Text([
                        new Word(new Range(2, 1, 2, 1 + 9), 'variables'),
                        new Colon(new Range(2, 10, 2, 11)),
                        new Space(new Range(2, 11, 2, 12)),
                        ...TestEndOfLine.create(newLine, 2, 12).children,
                        // dashes inside the header
                        ...TestFrontMatterMarker.create(dashesLength, 3, newLine).dashTokens,
                        ...TestEndOfLine.create(newLine, 3, dashesLength + 1).children,
                        // -
                        new Space(new Range(4, 1, 4, 2)),
                        new Space(new Range(4, 2, 4, 3)),
                        new Dash(new Range(4, 3, 4, 4)),
                        new Space(new Range(4, 4, 4, 5)),
                        new Word(new Range(4, 5, 4, 5 + 4), 'name'),
                        new Colon(new Range(4, 9, 4, 10)),
                        new Space(new Range(4, 10, 4, 11)),
                        new Word(new Range(4, 11, 4, 11 + 5), 'value'),
                        new Tab(new Range(4, 16, 4, 17)),
                        ...TestEndOfLine.create(newLine, 4, 17).children,
                    ]), endMarker),
                    // content after the header
                    new Word(new Range(6, 1, 6, 1 + 4), 'some'),
                    new Space(new Range(6, 5, 6, 6)),
                    new Word(new Range(6, 6, 6, 6 + 4), 'text'),
                ]);
            });
            test('can be at the end of the file', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 4);
                const promptContents = [
                    // start marker
                    new Array(markerLength).fill('-').join(''),
                    // contents
                    '	description: "my description"',
                    // end marker
                    new Array(markerLength).fill('-').join(''),
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 3);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 3, 1 + markerLength), startMarker, new Text([
                        new Tab(new Range(2, 1, 2, 2)),
                        new Word(new Range(2, 2, 2, 2 + 11), 'description'),
                        new Colon(new Range(2, 13, 2, 14)),
                        new Space(new Range(2, 14, 2, 15)),
                        new DoubleQuote(new Range(2, 15, 2, 16)),
                        new Word(new Range(2, 16, 2, 16 + 2), 'my'),
                        new Space(new Range(2, 18, 2, 19)),
                        new Word(new Range(2, 19, 2, 19 + 11), 'description'),
                        new DoubleQuote(new Range(2, 30, 2, 31)),
                        ...TestEndOfLine.create(newLine, 2, 31).children,
                    ]), endMarker),
                ]);
            });
        });
        suite('failure cases', () => {
            test('fails if header starts not on the first line', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                // prompt contents
                const contents = [
                    '',
                    marker,
                    'variables:',
                    '  - name: value',
                    marker,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = contents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
            test('fails if header markers do not match (start marker is longer)', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                // prompt contents
                const contents = [
                    `${marker}${marker}`,
                    'variables:',
                    '  - name: value',
                    marker,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = contents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
            test('fails if header markers do not match (end marker is longer)', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                const promptContents = [
                    marker,
                    'variables:',
                    '  - name: value',
                    `${marker}${marker}`,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = promptContents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25FeHRlbnNpb25zRGVjb2Rlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvbWFya2Rvd25FeHRlbnNpb25zRGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFFbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlGQUFpRixDQUFDO0FBQ2pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlHQUFpRyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUs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LGlCQUFpQixDQUNwQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLEVBQ3BDLFdBQVcsRUFDWCxJQUFJLElBQUksQ0FBQzt3QkFDUixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQzt3QkFDbkQsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ2xDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQzt3QkFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxhQUFhLENBQUM7d0JBQ3JELElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FB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