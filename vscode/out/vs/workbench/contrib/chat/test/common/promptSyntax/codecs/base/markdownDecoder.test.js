/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestDecoder } from './utils/testDecoder.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { newWriteableStream } from '../../../../../../../../base/common/stream.js';
import { Tab } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tab.js';
import { Word } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/word.js';
import { Dash } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/dash.js';
import { Space } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/space.js';
import { Slash } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/slash.js';
import { NewLine } from '../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { FormFeed } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/verticalTab.js';
import { MarkdownLink } from '../../../../../common/promptSyntax/codecs/base/markdownCodec/tokens/markdownLink.js';
import { CarriageReturn } from '../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { MarkdownImage } from '../../../../../common/promptSyntax/codecs/base/markdownCodec/tokens/markdownImage.js';
import { ExclamationMark } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/exclamationMark.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
import { MarkdownComment } from '../../../../../common/promptSyntax/codecs/base/markdownCodec/tokens/markdownComment.js';
import { LeftBracket, RightBracket } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/brackets.js';
import { MarkdownDecoder } from '../../../../../common/promptSyntax/codecs/base/markdownCodec/markdownDecoder.js';
import { LeftParenthesis, RightParenthesis } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/parentheses.js';
import { LeftAngleBracket, RightAngleBracket } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/angleBrackets.js';
/**
 * A reusable test utility that asserts that a `TestMarkdownDecoder` instance
 * correctly decodes `inputData` into a stream of `TMarkdownToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestMarkdownDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello [world](/etc/hosts)!',
 *   [
 *     new Space(new Range(1, 1, 1, 2)),
 *     new Word(new Range(1, 2, 1, 7), 'hello'),
 *     new Space(new Range(1, 7, 1, 8)),
 *     new MarkdownLink(1, 8, '[world]', '(/etc/hosts)'),
 *     new Word(new Range(1, 27, 1, 28), '!'),
 *     new NewLine(new Range(1, 28, 1, 29)),
 *   ],
 * );
 */
export class TestMarkdownDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        super(stream, new MarkdownDecoder(stream));
    }
}
suite('MarkdownDecoder', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('general', () => {
        test('base cases', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            await test.run([
                // basic text
                ' hello world',
                // text with markdown link and special characters in the filename
                'how are\t you [caption text](./some/file/path/refer🎨nce.md)?\v',
                // empty line
                '',
                // markdown link with special characters in the link caption and path
                '[(example!)](another/path/with[-and-]-chars/folder)\t ',
                // markdown link `#file` variable in the caption and with absolute path
                '\t[#file:something.txt](/absolute/path/to/something.txt)',
                // text with a commented out markdown link
                '\v\f machines must <!-- [computer rights](/do/not/exist) --> suffer',
            ], [
                // first line
                new Space(new Range(1, 1, 1, 2)),
                new Word(new Range(1, 2, 1, 7), 'hello'),
                new Space(new Range(1, 7, 1, 8)),
                new Word(new Range(1, 8, 1, 13), 'world'),
                new NewLine(new Range(1, 13, 1, 14)),
                // second line
                new Word(new Range(2, 1, 2, 4), 'how'),
                new Space(new Range(2, 4, 2, 5)),
                new Word(new Range(2, 5, 2, 8), 'are'),
                new Tab(new Range(2, 8, 2, 9)),
                new Space(new Range(2, 9, 2, 10)),
                new Word(new Range(2, 10, 2, 13), 'you'),
                new Space(new Range(2, 13, 2, 14)),
                new MarkdownLink(2, 14, '[caption text]', '(./some/file/path/refer🎨nce.md)'),
                new Word(new Range(2, 60, 2, 61), '?'),
                new VerticalTab(new Range(2, 61, 2, 62)),
                new NewLine(new Range(2, 62, 2, 63)),
                // third line
                new NewLine(new Range(3, 1, 3, 2)),
                // fourth line
                new MarkdownLink(4, 1, '[(example!)]', '(another/path/with[-and-]-chars/folder)'),
                new Tab(new Range(4, 52, 4, 53)),
                new Space(new Range(4, 53, 4, 54)),
                new NewLine(new Range(4, 54, 4, 55)),
                // fifth line
                new Tab(new Range(5, 1, 5, 2)),
                new MarkdownLink(5, 2, '[#file:something.txt]', '(/absolute/path/to/something.txt)'),
                new NewLine(new Range(5, 56, 5, 57)),
                // sixth line
                new VerticalTab(new Range(6, 1, 6, 2)),
                new FormFeed(new Range(6, 2, 6, 3)),
                new Space(new Range(6, 3, 6, 4)),
                new Word(new Range(6, 4, 6, 12), 'machines'),
                new Space(new Range(6, 12, 6, 13)),
                new Word(new Range(6, 13, 6, 17), 'must'),
                new Space(new Range(6, 17, 6, 18)),
                new MarkdownComment(new Range(6, 18, 6, 18 + 41), '<!-- [computer rights](/do/not/exist) -->'),
                new Space(new Range(6, 59, 6, 60)),
                new Word(new Range(6, 60, 6, 66), 'suffer'),
            ]);
        });
        test('nuanced', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            const inputLines = [
                // tests that the link caption contain a chat prompt `#file:` reference, while
                // the file path can contain other `graphical characters`
                '\v\t[#file:./another/path/to/file.txt](./real/file!path/file◆name.md)',
                // tests that the link file path contain a chat prompt `#file:` reference,
                // `spaces`, `emojies`, and other `graphical characters`
                ' [reference ∘ label](/absolute/pa th/to-#file:file.txt/f🥸⚡️le.md)',
                // tests that link caption and file path can contain `parentheses`, `spaces`, and
                // `emojies`
                '\f[!(hello)!](./w(())rld/nice-🦚-filen(a)<me>.git))\n\t',
                // tests that the link caption can be empty, while the file path can contain `square brackets`
                '[<test>](./s[]me/pa[h!) ',
            ];
            await test.run(inputLines, [
                // `1st` line
                new VerticalTab(new Range(1, 1, 1, 2)),
                new Tab(new Range(1, 2, 1, 3)),
                new MarkdownLink(1, 3, '[#file:./another/path/to/file.txt]', '(./real/file!path/file◆name.md)'),
                new NewLine(new Range(1, 68, 1, 69)),
                // `2nd` line
                new Space(new Range(2, 1, 2, 2)),
                new MarkdownLink(2, 2, '[reference ∘ label]', '(/absolute/pa th/to-#file:file.txt/f🥸⚡️le.md)'),
                new NewLine(new Range(2, 67, 2, 68)),
                // `3rd` line
                new FormFeed(new Range(3, 1, 3, 2)),
                new MarkdownLink(3, 2, '[!(hello)!]', '(./w(())rld/nice-🦚-filen(a)<me>.git)'),
                new RightParenthesis(new Range(3, 50, 3, 51)),
                new NewLine(new Range(3, 51, 3, 52)),
                // `4th` line
                new Tab(new Range(4, 1, 4, 2)),
                new NewLine(new Range(4, 2, 4, 3)),
                // `5th` line
                new MarkdownLink(5, 1, '[<test>]', '(./s[]me/pa[h!)'),
                new Space(new Range(5, 24, 5, 25)),
            ]);
        });
    });
    suite('links', () => {
        suite('broken', () => {
            test('invalid', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputLines = [
                    // incomplete link reference with empty caption
                    '[ ](./real/file path/file⇧name.md',
                    // space between caption and reference is disallowed
                    '[link text] (./file path/name.txt)',
                ];
                await test.run(inputLines, [
                    // `1st` line
                    new LeftBracket(new Range(1, 1, 1, 2)),
                    new Space(new Range(1, 2, 1, 3)),
                    new RightBracket(new Range(1, 3, 1, 4)),
                    new LeftParenthesis(new Range(1, 4, 1, 5)),
                    new Word(new Range(1, 5, 1, 5 + 1), '.'),
                    new Slash(new Range(1, 6, 1, 7)),
                    new Word(new Range(1, 7, 1, 7 + 4), 'real'),
                    new Slash(new Range(1, 11, 1, 12)),
                    new Word(new Range(1, 12, 1, 12 + 4), 'file'),
                    new Space(new Range(1, 16, 1, 17)),
                    new Word(new Range(1, 17, 1, 17 + 4), 'path'),
                    new Slash(new Range(1, 21, 1, 22)),
                    new Word(new Range(1, 22, 1, 22 + 12), 'file⇧name.md'),
                    new NewLine(new Range(1, 34, 1, 35)),
                    // `2nd` line
                    new LeftBracket(new Range(2, 1, 2, 2)),
                    new Word(new Range(2, 2, 2, 2 + 4), 'link'),
                    new Space(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 7 + 4), 'text'),
                    new RightBracket(new Range(2, 11, 2, 12)),
                    new Space(new Range(2, 12, 2, 13)),
                    new LeftParenthesis(new Range(2, 13, 2, 14)),
                    new Word(new Range(2, 14, 2, 14 + 1), '.'),
                    new Slash(new Range(2, 15, 2, 16)),
                    new Word(new Range(2, 16, 2, 16 + 4), 'file'),
                    new Space(new Range(2, 20, 2, 21)),
                    new Word(new Range(2, 21, 2, 21 + 4), 'path'),
                    new Slash(new Range(2, 25, 2, 26)),
                    new Word(new Range(2, 26, 2, 26 + 8), 'name.txt'),
                    new RightParenthesis(new Range(2, 34, 2, 35)),
                ]);
            });
            suite('stop characters inside caption/reference (new lines)', () => {
                for (const StopCharacter of [CarriageReturn, NewLine]) {
                    let characterName = '';
                    if (StopCharacter === CarriageReturn) {
                        characterName = '\\r';
                    }
                    if (StopCharacter === NewLine) {
                        characterName = '\\n';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `[haa${StopCharacter.symbol}loů](./real/💁/name.txt)`,
                            // stop character inside link reference
                            `[ref text](/etc/pat${StopCharacter.symbol}h/to/file.md)`,
                            // stop character between line caption and link reference is disallowed
                            `[text]${StopCharacter.symbol}(/etc/ path/main.mdc)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new LeftBracket(new Range(1, 1, 1, 2)),
                            new Word(new Range(1, 2, 1, 2 + 3), 'haa'),
                            new NewLine(new Range(1, 5, 1, 6)), // a single CR token is treated as a `new line`
                            new Word(new Range(2, 1, 2, 1 + 3), 'loů'),
                            new RightBracket(new Range(2, 4, 2, 5)),
                            new LeftParenthesis(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 1), '.'),
                            new Slash(new Range(2, 7, 2, 8)),
                            new Word(new Range(2, 8, 2, 8 + 4), 'real'),
                            new Slash(new Range(2, 12, 2, 13)),
                            new Word(new Range(2, 13, 2, 13 + 2), '💁'),
                            new Slash(new Range(2, 15, 2, 16)),
                            new Word(new Range(2, 16, 2, 16 + 8), 'name.txt'),
                            new RightParenthesis(new Range(2, 24, 2, 25)),
                            new NewLine(new Range(2, 25, 2, 26)),
                            // `2nd` input line
                            new LeftBracket(new Range(3, 1, 3, 2)),
                            new Word(new Range(3, 2, 3, 2 + 3), 'ref'),
                            new Space(new Range(3, 5, 3, 6)),
                            new Word(new Range(3, 6, 3, 6 + 4), 'text'),
                            new RightBracket(new Range(3, 10, 3, 11)),
                            new LeftParenthesis(new Range(3, 11, 3, 12)),
                            new Slash(new Range(3, 12, 3, 13)),
                            new Word(new Range(3, 13, 3, 13 + 3), 'etc'),
                            new Slash(new Range(3, 16, 3, 17)),
                            new Word(new Range(3, 17, 3, 17 + 3), 'pat'),
                            new NewLine(new Range(3, 20, 3, 21)), // a single CR token is treated as a `new line`
                            new Word(new Range(4, 1, 4, 1 + 1), 'h'),
                            new Slash(new Range(4, 2, 4, 3)),
                            new Word(new Range(4, 3, 4, 3 + 2), 'to'),
                            new Slash(new Range(4, 5, 4, 6)),
                            new Word(new Range(4, 6, 4, 6 + 7), 'file.md'),
                            new RightParenthesis(new Range(4, 13, 4, 14)),
                            new NewLine(new Range(4, 14, 4, 15)),
                            // `3nd` input line
                            new LeftBracket(new Range(5, 1, 5, 2)),
                            new Word(new Range(5, 2, 5, 2 + 4), 'text'),
                            new RightBracket(new Range(5, 6, 5, 7)),
                            new NewLine(new Range(5, 7, 5, 8)), // a single CR token is treated as a `new line`
                            new LeftParenthesis(new Range(6, 1, 6, 2)),
                            new Slash(new Range(6, 2, 6, 3)),
                            new Word(new Range(6, 3, 6, 3 + 3), 'etc'),
                            new Slash(new Range(6, 6, 6, 7)),
                            new Space(new Range(6, 7, 6, 8)),
                            new Word(new Range(6, 8, 6, 8 + 4), 'path'),
                            new Slash(new Range(6, 12, 6, 13)),
                            new Word(new Range(6, 13, 6, 13 + 8), 'main.mdc'),
                            new RightParenthesis(new Range(6, 21, 6, 22)),
                        ]);
                    });
                }
            });
            /**
             * Same as above but these stop characters do not move the caret to the next line.
             */
            suite('stop characters inside caption/reference (same line)', () => {
                for (const StopCharacter of [VerticalTab, FormFeed]) {
                    let characterName = '';
                    if (StopCharacter === VerticalTab) {
                        characterName = '\\v';
                    }
                    if (StopCharacter === FormFeed) {
                        characterName = '\\f';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `[haa${StopCharacter.symbol}loů](./real/💁/name.txt)`,
                            // stop character inside link reference
                            `[ref text](/etc/pat${StopCharacter.symbol}h/to/file.md)`,
                            // stop character between line caption and link reference is disallowed
                            `[text]${StopCharacter.symbol}(/etc/ path/file.md)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new LeftBracket(new Range(1, 1, 1, 2)),
                            new Word(new Range(1, 2, 1, 2 + 3), 'haa'),
                            new StopCharacter(new Range(1, 5, 1, 6)), // <- stop character
                            new Word(new Range(1, 6, 1, 6 + 3), 'loů'),
                            new RightBracket(new Range(1, 9, 1, 10)),
                            new LeftParenthesis(new Range(1, 10, 1, 11)),
                            new Word(new Range(1, 11, 1, 11 + 1), '.'),
                            new Slash(new Range(1, 12, 1, 13)),
                            new Word(new Range(1, 13, 1, 13 + 4), 'real'),
                            new Slash(new Range(1, 17, 1, 18)),
                            new Word(new Range(1, 18, 1, 18 + 2), '💁'),
                            new Slash(new Range(1, 20, 1, 21)),
                            new Word(new Range(1, 21, 1, 21 + 8), 'name.txt'),
                            new RightParenthesis(new Range(1, 29, 1, 30)),
                            new NewLine(new Range(1, 30, 1, 31)),
                            // `2nd` input line
                            new LeftBracket(new Range(2, 1, 2, 2)),
                            new Word(new Range(2, 2, 2, 2 + 3), 'ref'),
                            new Space(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 4), 'text'),
                            new RightBracket(new Range(2, 10, 2, 11)),
                            new LeftParenthesis(new Range(2, 11, 2, 12)),
                            new Slash(new Range(2, 12, 2, 13)),
                            new Word(new Range(2, 13, 2, 13 + 3), 'etc'),
                            new Slash(new Range(2, 16, 2, 17)),
                            new Word(new Range(2, 17, 2, 17 + 3), 'pat'),
                            new StopCharacter(new Range(2, 20, 2, 21)), // <- stop character
                            new Word(new Range(2, 21, 2, 21 + 1), 'h'),
                            new Slash(new Range(2, 22, 2, 23)),
                            new Word(new Range(2, 23, 2, 23 + 2), 'to'),
                            new Slash(new Range(2, 25, 2, 26)),
                            new Word(new Range(2, 26, 2, 26 + 7), 'file.md'),
                            new RightParenthesis(new Range(2, 33, 2, 34)),
                            new NewLine(new Range(2, 34, 2, 35)),
                            // `3nd` input line
                            new LeftBracket(new Range(3, 1, 3, 2)),
                            new Word(new Range(3, 2, 3, 2 + 4), 'text'),
                            new RightBracket(new Range(3, 6, 3, 7)),
                            new StopCharacter(new Range(3, 7, 3, 8)), // <- stop character
                            new LeftParenthesis(new Range(3, 8, 3, 9)),
                            new Slash(new Range(3, 9, 3, 10)),
                            new Word(new Range(3, 10, 3, 10 + 3), 'etc'),
                            new Slash(new Range(3, 13, 3, 14)),
                            new Space(new Range(3, 14, 3, 15)),
                            new Word(new Range(3, 15, 3, 15 + 4), 'path'),
                            new Slash(new Range(3, 19, 3, 20)),
                            new Word(new Range(3, 20, 3, 20 + 7), 'file.md'),
                            new RightParenthesis(new Range(3, 27, 3, 28)),
                        ]);
                    });
                }
            });
        });
    });
    suite('images', () => {
        suite('general', () => {
            test('base cases', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    '\t![alt text](./some/path/to/file.jpg) ',
                    'plain text \f![label](./image.png)\v and more text',
                    '![](/var/images/default) following text',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownImage(1, 2, '![alt text]', '(./some/path/to/file.jpg)'),
                    new Space(new Range(1, 38, 1, 39)),
                    new NewLine(new Range(1, 39, 1, 40)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 6), 'plain'),
                    new Space(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 11), 'text'),
                    new Space(new Range(2, 11, 2, 12)),
                    new FormFeed(new Range(2, 12, 2, 13)),
                    new MarkdownImage(2, 13, '![label]', '(./image.png)'),
                    new VerticalTab(new Range(2, 34, 2, 35)),
                    new Space(new Range(2, 35, 2, 36)),
                    new Word(new Range(2, 36, 2, 39), 'and'),
                    new Space(new Range(2, 39, 2, 40)),
                    new Word(new Range(2, 40, 2, 44), 'more'),
                    new Space(new Range(2, 44, 2, 45)),
                    new Word(new Range(2, 45, 2, 49), 'text'),
                    new NewLine(new Range(2, 49, 2, 50)),
                    // `3rd`
                    new MarkdownImage(3, 1, '![]', '(/var/images/default)'),
                    new Space(new Range(3, 25, 3, 26)),
                    new Word(new Range(3, 26, 3, 35), 'following'),
                    new Space(new Range(3, 35, 3, 36)),
                    new Word(new Range(3, 36, 3, 40), 'text'),
                ]);
            });
            test('nuanced', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    '\t![<!-- comment -->](./s☻me/path/to/file.jpeg) ',
                    'raw text \f![(/1.png)](./image-🥸.png)\v and more text',
                    // '![](/var/images/default) following text',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownImage(1, 2, '![<!-- comment -->]', '(./s☻me/path/to/file.jpeg)'),
                    new Space(new Range(1, 47, 1, 48)),
                    new NewLine(new Range(1, 48, 1, 49)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 4), 'raw'),
                    new Space(new Range(2, 4, 2, 5)),
                    new Word(new Range(2, 5, 2, 9), 'text'),
                    new Space(new Range(2, 9, 2, 10)),
                    new FormFeed(new Range(2, 10, 2, 11)),
                    new MarkdownImage(2, 11, '![(/1.png)]', '(./image-🥸.png)'),
                    new VerticalTab(new Range(2, 38, 2, 39)),
                    new Space(new Range(2, 39, 2, 40)),
                    new Word(new Range(2, 40, 2, 43), 'and'),
                    new Space(new Range(2, 43, 2, 44)),
                    new Word(new Range(2, 44, 2, 48), 'more'),
                    new Space(new Range(2, 48, 2, 49)),
                    new Word(new Range(2, 49, 2, 53), 'text'),
                ]);
            });
        });
        suite('broken', () => {
            test('invalid', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputLines = [
                    // incomplete link reference with empty caption
                    '![ ](./real/file path/file★name.webp',
                    // space between caption and reference is disallowed
                    '\f![link text] (./file path/name.jpg)',
                    // new line inside the link reference
                    '\v![ ](./file\npath/name.jpeg )',
                ];
                await test.run(inputLines, [
                    // `1st` line
                    new ExclamationMark(new Range(1, 1, 1, 2)),
                    new LeftBracket(new Range(1, 2, 1, 3)),
                    new Space(new Range(1, 3, 1, 4)),
                    new RightBracket(new Range(1, 4, 1, 5)),
                    new LeftParenthesis(new Range(1, 5, 1, 6)),
                    new Word(new Range(1, 6, 1, 6 + 1), '.'),
                    new Slash(new Range(1, 7, 1, 8)),
                    new Word(new Range(1, 8, 1, 8 + 4), 'real'),
                    new Slash(new Range(1, 12, 1, 13)),
                    new Word(new Range(1, 13, 1, 13 + 4), 'file'),
                    new Space(new Range(1, 17, 1, 18)),
                    new Word(new Range(1, 18, 1, 18 + 4), 'path'),
                    new Slash(new Range(1, 22, 1, 23)),
                    new Word(new Range(1, 23, 1, 23 + 14), 'file★name.webp'),
                    new NewLine(new Range(1, 37, 1, 38)),
                    // `2nd` line
                    new FormFeed(new Range(2, 1, 2, 2)),
                    new ExclamationMark(new Range(2, 2, 2, 3)),
                    new LeftBracket(new Range(2, 3, 2, 4)),
                    new Word(new Range(2, 4, 2, 4 + 4), 'link'),
                    new Space(new Range(2, 8, 2, 9)),
                    new Word(new Range(2, 9, 2, 9 + 4), 'text'),
                    new RightBracket(new Range(2, 13, 2, 14)),
                    new Space(new Range(2, 14, 2, 15)),
                    new LeftParenthesis(new Range(2, 15, 2, 16)),
                    new Word(new Range(2, 16, 2, 16 + 1), '.'),
                    new Slash(new Range(2, 17, 2, 18)),
                    new Word(new Range(2, 18, 2, 18 + 4), 'file'),
                    new Space(new Range(2, 22, 2, 23)),
                    new Word(new Range(2, 23, 2, 23 + 4), 'path'),
                    new Slash(new Range(2, 27, 2, 28)),
                    new Word(new Range(2, 28, 2, 28 + 8), 'name.jpg'),
                    new RightParenthesis(new Range(2, 36, 2, 37)),
                    new NewLine(new Range(2, 37, 2, 38)),
                    // `3rd` line
                    new VerticalTab(new Range(3, 1, 3, 2)),
                    new ExclamationMark(new Range(3, 2, 3, 3)),
                    new LeftBracket(new Range(3, 3, 3, 4)),
                    new Space(new Range(3, 4, 3, 5)),
                    new RightBracket(new Range(3, 5, 3, 6)),
                    new LeftParenthesis(new Range(3, 6, 3, 7)),
                    new Word(new Range(3, 7, 3, 7 + 1), '.'),
                    new Slash(new Range(3, 8, 3, 9)),
                    new Word(new Range(3, 9, 3, 9 + 4), 'file'),
                    new NewLine(new Range(3, 13, 3, 14)),
                    new Word(new Range(4, 1, 4, 1 + 4), 'path'),
                    new Slash(new Range(4, 5, 4, 6)),
                    new Word(new Range(4, 6, 4, 6 + 9), 'name.jpeg'),
                    new Space(new Range(4, 15, 4, 16)),
                    new RightParenthesis(new Range(4, 16, 4, 17)),
                ]);
            });
            suite('stop characters inside caption/reference (new lines)', () => {
                for (const StopCharacter of [CarriageReturn, NewLine]) {
                    let characterName = '';
                    if (StopCharacter === CarriageReturn) {
                        characterName = '\\r';
                    }
                    if (StopCharacter === NewLine) {
                        characterName = '\\n';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `![haa${StopCharacter.symbol}loů](./real/💁/name.png)`,
                            // stop character inside link reference
                            `![ref text](/etc/pat${StopCharacter.symbol}h/to/file.webp)`,
                            // stop character between line caption and link reference is disallowed
                            `![text]${StopCharacter.symbol}(/etc/ path/file.jpeg)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new ExclamationMark(new Range(1, 1, 1, 2)),
                            new LeftBracket(new Range(1, 2, 1, 3)),
                            new Word(new Range(1, 3, 1, 3 + 3), 'haa'),
                            new NewLine(new Range(1, 6, 1, 7)), // a single CR token is treated as a `new line`
                            new Word(new Range(2, 1, 2, 1 + 3), 'loů'),
                            new RightBracket(new Range(2, 4, 2, 5)),
                            new LeftParenthesis(new Range(2, 5, 2, 6)),
                            new Word(new Range(2, 6, 2, 6 + 1), '.'),
                            new Slash(new Range(2, 7, 2, 8)),
                            new Word(new Range(2, 8, 2, 8 + 4), 'real'),
                            new Slash(new Range(2, 12, 2, 13)),
                            new Word(new Range(2, 13, 2, 13 + 2), '💁'),
                            new Slash(new Range(2, 15, 2, 16)),
                            new Word(new Range(2, 16, 2, 16 + 8), 'name.png'),
                            new RightParenthesis(new Range(2, 24, 2, 25)),
                            new NewLine(new Range(2, 25, 2, 26)),
                            // `2nd` input line
                            new ExclamationMark(new Range(3, 1, 3, 2)),
                            new LeftBracket(new Range(3, 2, 3, 3)),
                            new Word(new Range(3, 3, 3, 3 + 3), 'ref'),
                            new Space(new Range(3, 6, 3, 7)),
                            new Word(new Range(3, 7, 3, 7 + 4), 'text'),
                            new RightBracket(new Range(3, 11, 3, 12)),
                            new LeftParenthesis(new Range(3, 12, 3, 13)),
                            new Slash(new Range(3, 13, 3, 14)),
                            new Word(new Range(3, 14, 3, 14 + 3), 'etc'),
                            new Slash(new Range(3, 17, 3, 18)),
                            new Word(new Range(3, 18, 3, 18 + 3), 'pat'),
                            new NewLine(new Range(3, 21, 3, 22)), // a single CR token is treated as a `new line`
                            new Word(new Range(4, 1, 4, 1 + 1), 'h'),
                            new Slash(new Range(4, 2, 4, 3)),
                            new Word(new Range(4, 3, 4, 3 + 2), 'to'),
                            new Slash(new Range(4, 5, 4, 6)),
                            new Word(new Range(4, 6, 4, 6 + 9), 'file.webp'),
                            new RightParenthesis(new Range(4, 15, 4, 16)),
                            new NewLine(new Range(4, 16, 4, 17)),
                            // `3nd` input line
                            new ExclamationMark(new Range(5, 1, 5, 2)),
                            new LeftBracket(new Range(5, 2, 5, 3)),
                            new Word(new Range(5, 3, 5, 3 + 4), 'text'),
                            new RightBracket(new Range(5, 7, 5, 8)),
                            new NewLine(new Range(5, 8, 5, 9)), // a single CR token is treated as a `new line`
                            new LeftParenthesis(new Range(6, 1, 6, 2)),
                            new Slash(new Range(6, 2, 6, 3)),
                            new Word(new Range(6, 3, 6, 3 + 3), 'etc'),
                            new Slash(new Range(6, 6, 6, 7)),
                            new Space(new Range(6, 7, 6, 8)),
                            new Word(new Range(6, 8, 6, 8 + 4), 'path'),
                            new Slash(new Range(6, 12, 6, 13)),
                            new Word(new Range(6, 13, 6, 13 + 9), 'file.jpeg'),
                            new RightParenthesis(new Range(6, 22, 6, 23)),
                        ]);
                    });
                }
            });
            /**
             * Same as above but these stop characters do not move the caret to the next line.
             */
            suite('stop characters inside caption/reference (same line)', () => {
                for (const stopCharacter of [VerticalTab, FormFeed]) {
                    let characterName = '';
                    if (stopCharacter === VerticalTab) {
                        characterName = '\\v';
                    }
                    if (stopCharacter === FormFeed) {
                        characterName = '\\f';
                    }
                    assert(characterName !== '', 'The "characterName" must be set, got "empty line".');
                    test(`stop character - "${characterName}"`, async () => {
                        const test = testDisposables.add(new TestMarkdownDecoder());
                        const inputLines = [
                            // stop character inside link caption
                            `![haa${stopCharacter.symbol}loů](./real/💁/name)`,
                            // stop character inside link reference
                            `![ref text](/etc/pat${stopCharacter.symbol}h/to/file.webp)`,
                            // stop character between line caption and link reference is disallowed
                            `![text]${stopCharacter.symbol}(/etc/ path/image.gif)`,
                        ];
                        await test.run(inputLines, [
                            // `1st` input line
                            new ExclamationMark(new Range(1, 1, 1, 2)),
                            new LeftBracket(new Range(1, 2, 1, 3)),
                            new Word(new Range(1, 3, 1, 3 + 3), 'haa'),
                            new stopCharacter(new Range(1, 6, 1, 7)), // <- stop character
                            new Word(new Range(1, 7, 1, 7 + 3), 'loů'),
                            new RightBracket(new Range(1, 10, 1, 11)),
                            new LeftParenthesis(new Range(1, 11, 1, 12)),
                            new Word(new Range(1, 12, 1, 12 + 1), '.'),
                            new Slash(new Range(1, 13, 1, 14)),
                            new Word(new Range(1, 14, 1, 14 + 4), 'real'),
                            new Slash(new Range(1, 18, 1, 19)),
                            new Word(new Range(1, 19, 1, 19 + 2), '💁'),
                            new Slash(new Range(1, 21, 1, 22)),
                            new Word(new Range(1, 22, 1, 22 + 4), 'name'),
                            new RightParenthesis(new Range(1, 26, 1, 27)),
                            new NewLine(new Range(1, 27, 1, 28)),
                            // `2nd` input line
                            new ExclamationMark(new Range(2, 1, 2, 2)),
                            new LeftBracket(new Range(2, 2, 2, 3)),
                            new Word(new Range(2, 3, 2, 3 + 3), 'ref'),
                            new Space(new Range(2, 6, 2, 7)),
                            new Word(new Range(2, 7, 2, 7 + 4), 'text'),
                            new RightBracket(new Range(2, 11, 2, 12)),
                            new LeftParenthesis(new Range(2, 12, 2, 13)),
                            new Slash(new Range(2, 13, 2, 14)),
                            new Word(new Range(2, 14, 2, 14 + 3), 'etc'),
                            new Slash(new Range(2, 17, 2, 18)),
                            new Word(new Range(2, 18, 2, 18 + 3), 'pat'),
                            new stopCharacter(new Range(2, 21, 2, 22)), // <- stop character
                            new Word(new Range(2, 22, 2, 22 + 1), 'h'),
                            new Slash(new Range(2, 23, 2, 24)),
                            new Word(new Range(2, 24, 2, 24 + 2), 'to'),
                            new Slash(new Range(2, 26, 2, 27)),
                            new Word(new Range(2, 27, 2, 27 + 9), 'file.webp'),
                            new RightParenthesis(new Range(2, 36, 2, 37)),
                            new NewLine(new Range(2, 37, 2, 38)),
                            // `3nd` input line
                            new ExclamationMark(new Range(3, 1, 3, 2)),
                            new LeftBracket(new Range(3, 2, 3, 3)),
                            new Word(new Range(3, 3, 3, 3 + 4), 'text'),
                            new RightBracket(new Range(3, 7, 3, 8)),
                            new stopCharacter(new Range(3, 8, 3, 9)), // <- stop character
                            new LeftParenthesis(new Range(3, 9, 3, 10)),
                            new Slash(new Range(3, 10, 3, 11)),
                            new Word(new Range(3, 11, 3, 11 + 3), 'etc'),
                            new Slash(new Range(3, 14, 3, 15)),
                            new Space(new Range(3, 15, 3, 16)),
                            new Word(new Range(3, 16, 3, 16 + 4), 'path'),
                            new Slash(new Range(3, 20, 3, 21)),
                            new Word(new Range(3, 21, 3, 21 + 9), 'image.gif'),
                            new RightParenthesis(new Range(3, 30, 3, 31)),
                        ]);
                    });
                }
            });
        });
    });
    suite('comments', () => {
        suite('general', () => {
            test('base cases', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    // comment with text inside it
                    '\t<!-- hello world -->',
                    // comment with a link inside
                    'some text<!-- \v[link label](/some/path/to/file.md)\f --> and more text ',
                    // comment new lines inside it
                    '<!-- comment\r\ntext\n\ngoes here --> usual text follows',
                    // an empty comment
                    '\t<!---->\t',
                    // comment that was not closed properly
                    'haalo\t<!-- [link label](/some/path/to/file.md)',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Tab(new Range(1, 1, 1, 2)),
                    new MarkdownComment(new Range(1, 2, 1, 2 + 20), '<!-- hello world -->'),
                    new NewLine(new Range(1, 22, 1, 23)),
                    // `2nd`
                    new Word(new Range(2, 1, 2, 5), 'some'),
                    new Space(new Range(2, 5, 2, 6)),
                    new Word(new Range(2, 6, 2, 10), 'text'),
                    new MarkdownComment(new Range(2, 10, 2, 10 + 46), '<!-- \v[link label](/some/path/to/file.md)\f -->'),
                    new Space(new Range(2, 56, 2, 57)),
                    new Word(new Range(2, 57, 2, 60), 'and'),
                    new Space(new Range(2, 60, 2, 61)),
                    new Word(new Range(2, 61, 2, 65), 'more'),
                    new Space(new Range(2, 65, 2, 66)),
                    new Word(new Range(2, 66, 2, 70), 'text'),
                    new Space(new Range(2, 70, 2, 71)),
                    new NewLine(new Range(2, 71, 2, 72)),
                    // `3rd`
                    new MarkdownComment(new Range(3, 1, 3 + 3, 1 + 13), '<!-- comment\r\ntext\n\ngoes here -->'),
                    new Space(new Range(6, 14, 6, 15)),
                    new Word(new Range(6, 15, 6, 15 + 5), 'usual'),
                    new Space(new Range(6, 20, 6, 21)),
                    new Word(new Range(6, 21, 6, 21 + 4), 'text'),
                    new Space(new Range(6, 25, 6, 26)),
                    new Word(new Range(6, 26, 6, 26 + 7), 'follows'),
                    new NewLine(new Range(6, 33, 6, 34)),
                    // `4rd`
                    new Tab(new Range(7, 1, 7, 2)),
                    new MarkdownComment(new Range(7, 2, 7, 2 + 7), '<!---->'),
                    new Tab(new Range(7, 9, 7, 10)),
                    new NewLine(new Range(7, 10, 7, 11)),
                    // `5th`
                    new Word(new Range(8, 1, 8, 6), 'haalo'),
                    new Tab(new Range(8, 6, 8, 7)),
                    new MarkdownComment(new Range(8, 7, 8, 7 + 40), '<!-- [link label](/some/path/to/file.md)'),
                ]);
            });
            test('nuanced', async () => {
                const test = testDisposables.add(new TestMarkdownDecoder());
                const inputData = [
                    // comment inside `<>` brackets
                    ' \f <<!--commen\t-->>',
                    // comment contains `<[]>` brackets and `!`
                    '<!--<[!c⚽︎mment!]>-->\t\t',
                    // comment contains `<!--` and new lines
                    '\v<!--some\r\ntext\n\t<!--inner\r\ntext-->\t\t',
                    // comment contains `<!--` and never closed properly
                    ' <!--<!--inner\r\ntext-- >\t\v\f ',
                ];
                await test.run(inputData, [
                    // `1st`
                    new Space(new Range(1, 1, 1, 2)),
                    new FormFeed(new Range(1, 2, 1, 3)),
                    new Space(new Range(1, 3, 1, 4)),
                    new LeftAngleBracket(new Range(1, 4, 1, 5)),
                    new MarkdownComment(new Range(1, 5, 1, 5 + 14), '<!--commen\t-->'),
                    new RightAngleBracket(new Range(1, 19, 1, 20)),
                    new NewLine(new Range(1, 20, 1, 21)),
                    // `2nd`
                    new MarkdownComment(new Range(2, 1, 2, 1 + 21), '<!--<[!c⚽︎mment!]>-->'),
                    new Tab(new Range(2, 22, 2, 23)),
                    new Tab(new Range(2, 23, 2, 24)),
                    new NewLine(new Range(2, 24, 2, 25)),
                    // `3rd`
                    new VerticalTab(new Range(3, 1, 3, 2)),
                    new MarkdownComment(new Range(3, 2, 3 + 3, 1 + 7), '<!--some\r\ntext\n\t<!--inner\r\ntext-->'),
                    new Tab(new Range(6, 8, 6, 9)),
                    new Tab(new Range(6, 9, 6, 10)),
                    new NewLine(new Range(6, 10, 6, 11)),
                    // `4rd`
                    new Space(new Range(7, 1, 7, 2)),
                    // note! comment does not have correct closing `-->`, hence the comment extends
                    //       to the end of the text, and therefore includes the \t\v\f and space at the end
                    new MarkdownComment(new Range(7, 2, 8, 1 + 12), '<!--<!--inner\r\ntext-- >\t\v\f '),
                ]);
            });
        });
        test('invalid', async () => {
            const test = testDisposables.add(new TestMarkdownDecoder());
            const inputData = [
                '\t<! -- mondo --> ',
                ' < !-- світ -->\t',
                '\v<!- - terra -->\f',
                '<!--mundo - -> ',
            ];
            await test.run(inputData, [
                // `1st`
                new Tab(new Range(1, 1, 1, 2)),
                new LeftAngleBracket(new Range(1, 2, 1, 3)),
                new ExclamationMark(new Range(1, 3, 1, 4)),
                new Space(new Range(1, 4, 1, 5)),
                new Dash(new Range(1, 5, 1, 6)),
                new Dash(new Range(1, 6, 1, 7)),
                new Space(new Range(1, 7, 1, 8)),
                new Word(new Range(1, 8, 1, 8 + 5), 'mondo'),
                new Space(new Range(1, 13, 1, 14)),
                new Dash(new Range(1, 14, 1, 15)),
                new Dash(new Range(1, 15, 1, 16)),
                new RightAngleBracket(new Range(1, 16, 1, 17)),
                new Space(new Range(1, 17, 1, 18)),
                new NewLine(new Range(1, 18, 1, 19)),
                // `2nd`
                new Space(new Range(2, 1, 2, 2)),
                new LeftAngleBracket(new Range(2, 2, 2, 3)),
                new Space(new Range(2, 3, 2, 4)),
                new ExclamationMark(new Range(2, 4, 2, 5)),
                new Dash(new Range(2, 5, 2, 6)),
                new Dash(new Range(2, 6, 2, 7)),
                new Space(new Range(2, 7, 2, 8)),
                new Word(new Range(2, 8, 2, 8 + 4), 'світ'),
                new Space(new Range(2, 12, 2, 13)),
                new Dash(new Range(2, 13, 2, 14)),
                new Dash(new Range(2, 14, 2, 15)),
                new RightAngleBracket(new Range(2, 15, 2, 16)),
                new Tab(new Range(2, 16, 2, 17)),
                new NewLine(new Range(2, 17, 2, 18)),
                // `3rd`
                new VerticalTab(new Range(3, 1, 3, 2)),
                new LeftAngleBracket(new Range(3, 2, 3, 3)),
                new ExclamationMark(new Range(3, 3, 3, 4)),
                new Dash(new Range(3, 4, 3, 5)),
                new Space(new Range(3, 5, 3, 6)),
                new Dash(new Range(3, 6, 3, 7)),
                new Space(new Range(3, 7, 3, 8)),
                new Word(new Range(3, 8, 3, 8 + 5), 'terra'),
                new Space(new Range(3, 13, 3, 14)),
                new Dash(new Range(3, 14, 3, 15)),
                new Dash(new Range(3, 15, 3, 16)),
                new RightAngleBracket(new Range(3, 16, 3, 17)),
                new FormFeed(new Range(3, 17, 3, 18)),
                new NewLine(new Range(3, 18, 3, 19)),
                // `4rd`
                // note! comment does not have correct closing `-->`, hence the comment extends
                //       to the end of the text, and therefore includes the `space` at the end
                new MarkdownComment(new Range(4, 1, 4, 1 + 15), '<!--mundo - -> '),
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25EZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL21hcmtkb3duRGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUMvRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDakcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUNwSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFD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QUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDN0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQzdDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsY0FBYyxDQUFDO29CQUN0RCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsYUFBYTtvQkFDYixJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQzVDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7b0JBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUM3QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxL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Q0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUN6QyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDNUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUM1QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLCtDQUErQzs0QkFDckYsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzs0QkFDeEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFB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b0I7NEJBQzlELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzFDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUN4QyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzs0QkFDMUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzdDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQzs0QkFDakQsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDN0MsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ3BDLG1CQUFtQjs0QkFDbkIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUMzQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDekMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUM1QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQzs0QkFDNUMsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxvQkFBb0I7NEJBQ2hFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7NEJBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQzs0QkFDaEQsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDN0MsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ3BDLG1CQUFtQjs0QkFDbkIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUN2QyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLG9CQUFvQjs0QkFDOUQsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNqQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUM1QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzdDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDOzRCQUNoRCxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3lCQUM3QyxDQUNELENBQUM7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUdILEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ3BCLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQy9CLElBQUksbUJBQW1CLEVBQUUsQ0FDekIsQ0FBQztnQkFFRixNQUFNLFNBQVMsR0FBRztvQkFDakIseUNBQXlDO29CQUN6QyxvREFBb0Q7b0JBQ3BELHlDQUF5QztpQkFDekMsQ0FBQztnQkFFRixNQUFNLElBQUksQ0FBQyxHQUFHLENBQ2IsU0FBUyxFQUNUO29CQUNDLFFBQVE7b0JBQ1IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzlCLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixDQUFDO29CQUNuRSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3BDLFFBQVE7b0JBQ1IsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3JDLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQztvQkFDckQsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUM7b0JBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQ3pDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxRQUFRO29CQUNSLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixDQUFDO29CQUN2RCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDO29CQUM5QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO2lCQUN6QyxDQUNELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQy9CLElBQUksbUJBQW1CLEVBQUUsQ0FDekIsQ0FBQztnQkFFRixNQUFNLFNBQVMsR0FBRztvQkFDakIsa0RBQWtEO29CQUNsRCx3REFBd0Q7b0JBQ3hELDZDQUE2QztpQkFDN0MsQ0FBQztnQkFFRixNQUFNLElBQUksQ0FBQyxHQUFHLENBQ2IsU0FBUyxFQUNUO29CQUNDLFFBQVE7b0JBQ1IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzlCLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLENBQUM7b0JBQzVFLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsUUFBUTtvQkFDUixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7b0JBQ3RDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQ3ZDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNqQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDckMsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUM7b0JBQzNELElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDO29CQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO2lCQUN6QyxDQUNELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxtQkFBbUIsRUFBRSxDQUN6QixDQUFDO2dCQUVGLE1BQU0sVUFBVSxHQUFHO29CQUNsQiwrQ0FBK0M7b0JBQy9DLHNDQUFzQztvQkFDdEMsb0RBQW9EO29CQUNwRCx1Q0FBdUM7b0JBQ3ZDLHFDQUFxQztvQkFDckMsaUNBQWlDO2lCQUNqQyxDQUFDO2dCQUVGLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FDYixVQUFVLEVBQ1Y7b0JBQ0MsYUFBYTtvQkFDYixJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdkMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7b0JBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDN0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQzdDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUM7b0JBQ3hELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxhQUFhO29CQUNiLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQzNDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUMzQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUMxQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDN0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENB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S0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzFDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsK0NBQStDOzRCQUNuRixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUMxQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDdkMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQzFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7NEJBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQzs0QkFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUM7NEJBQ2pELElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzdDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNwQyxtQkFBbUI7NEJBQ25CLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUMxQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDdEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQzs0QkFDMUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFD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QUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUMxQyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDekMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzVDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7NEJBQzFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUM3QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQzs0QkFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzdDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzdDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNwQyxtQkFBbUI7NEJBQ25CLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUMxQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDdEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQzs0QkFDMUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUN6QyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDNUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUM1QyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLG9CQUFvQjs0QkFDaEUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQzs0QkFDMUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7NEJBQzNDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDOzRCQUNsRCxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUM3QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDcEMsbUJBQW1COzRCQUNuQixJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDMUMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7NEJBQzNDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUN2QyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLG9CQUFvQjs0QkFDOUQsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQzNDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDOzRCQUM1QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxL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SSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxRQUFRO29CQUNSLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsdUNBQXVDLENBQUM7b0JBQzVGLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO29CQUM5QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMs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LENBQUMsQ0FBQztnQkFDaEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztnQkFDNUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQyxRQUFRO2dCQUNSLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pDLElBQUksaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzlDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEMsUUFBUTtnQkFDUixJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUM1QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLGlCQUFpQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3BDLFFBQVE7Z0JBQ1IsK0VBQStFO2dCQUMvRSw4RUFBOEU7Z0JBQzlFLElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQzthQUNsRSxDQUNELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==