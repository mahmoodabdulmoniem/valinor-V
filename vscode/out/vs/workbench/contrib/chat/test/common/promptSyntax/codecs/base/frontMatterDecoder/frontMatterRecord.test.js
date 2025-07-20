/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { Colon, LeftBracket, Quote, RightBracket, Space, Tab, VerticalTab, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterArray, FrontMatterBoolean, FrontMatterRecord, FrontMatterRecordDelimiter, FrontMatterRecordName, FrontMatterString } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
suite('FrontMatterBoolean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('trimValueEnd()', () => {
        test('trims space tokens at the end of record\'s value', () => {
            const recordName = new FrontMatterRecordName([
                new Word(new Range(4, 10, 4, 10 + 3), 'key'),
            ]);
            const recordDelimiter = new FrontMatterRecordDelimiter([
                new Colon(new Range(4, 14, 4, 15)),
                new VerticalTab(new Range(4, 15, 4, 16)),
            ]);
            const recordValue = new FrontMatterSequence([
                new Word(new Range(4, 18, 4, 18 + 10), 'some-value'),
                new VerticalTab(new Range(4, 28, 4, 29)),
                new Tab(new Range(4, 29, 4, 30)),
                new Space(new Range(4, 30, 4, 31)),
                new Tab(new Range(4, 31, 4, 32)),
            ]);
            const record = new FrontMatterRecord([
                recordName, recordDelimiter, recordValue,
            ]);
            const trimmed = record.trimValueEnd();
            assert.deepStrictEqual(trimmed, [
                new VerticalTab(new Range(4, 28, 4, 29)),
                new Tab(new Range(4, 29, 4, 30)),
                new Space(new Range(4, 30, 4, 31)),
                new Tab(new Range(4, 31, 4, 32)),
            ], 'Must return correct trimmed list of spacing tokens.');
            assert(record.range.equalsRange(new Range(4, 10, 4, 28)), 'Must correctly update token range.');
        });
        suite('does not trim non-sequence value tokens', () => {
            test('boolean', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'yke'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterBoolean(new Word(new Range(4, 18, 4, 18 + 4), 'true'));
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 22)), 'Must not update token range.');
            });
            test('quoted string', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'eyk'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterString([
                    new Quote(new Range(4, 18, 4, 19)),
                    new Word(new Range(4, 19, 4, 19 + 10), 'some text'),
                    new Quote(new Range(4, 29, 4, 30)),
                ]);
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 30)), 'Must not update token range.');
            });
            test('array', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'yek'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterArray([
                    new LeftBracket(new Range(4, 18, 4, 19)),
                    new FrontMatterString([
                        new Quote(new Range(4, 18, 4, 19)),
                        new Word(new Range(4, 19, 4, 19 + 10), 'some text'),
                        new Quote(new Range(4, 29, 4, 30)),
                    ]),
                    new FrontMatterBoolean(new Word(new Range(4, 34, 4, 34 + 4), 'true')),
                    new RightBracket(new Range(4, 38, 4, 39)),
                ]);
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 39)), 'Must not update token range.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJEZWNvZGVyL2Zyb250TWF0dGVyUmVjb3JkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrR0FBa0csQ0FBQztBQUN2SSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3hLLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSwwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBRW5PLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7WUFDN0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQztnQkFDNUMsSUFBSSxJQUFJLENBQ1AsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxD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