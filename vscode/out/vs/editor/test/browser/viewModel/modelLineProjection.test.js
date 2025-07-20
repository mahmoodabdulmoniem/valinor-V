/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as languages from '../../../common/languages.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { ModelLineProjectionData } from '../../../common/modelLineProjectionData.js';
import { createModelLineProjection } from '../../../common/viewModel/modelLineProjection.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModelLinesFromProjectedModel } from '../../../common/viewModel/viewModelLines.js';
import { TestConfiguration } from '../config/testConfiguration.js';
import { createTextModel } from '../../common/testTextModel.js';
suite('Editor ViewModel - SplitLinesCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('SplitLine', () => {
        let model1 = createModel('My First LineMy Second LineAnd another one');
        let line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 0);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), 'My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), 'And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 15);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 16);
        for (let col = 1; col <= 14; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(0, col), col, 'getInputColumnOfOutputPosition(0, ' + col + ')');
        }
        for (let col = 1; col <= 15; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(1, col), 13 + col, 'getInputColumnOfOutputPosition(1, ' + col + ')');
        }
        for (let col = 1; col <= 16; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(2, col), 13 + 14 + col, 'getInputColumnOfOutputPosition(2, ' + col + ')');
        }
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, col - 13), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, col - 13 - 14), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        model1 = createModel('My First LineMy Second LineAnd another one');
        line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 4);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), '    My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), '    And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 19);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 20);
        const actualViewColumnMapping = [];
        for (let lineIndex = 0; lineIndex < line1.getViewLineCount(); lineIndex++) {
            const actualLineViewColumnMapping = [];
            for (let col = 1; col <= line1.getViewLineMaxColumn(model1, 1, lineIndex); col++) {
                actualLineViewColumnMapping.push(line1.getModelColumnOfViewPosition(lineIndex, col));
            }
            actualViewColumnMapping.push(actualLineViewColumnMapping);
        }
        assert.deepStrictEqual(actualViewColumnMapping, [
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            [14, 14, 14, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            [28, 28, 28, 28, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
        ]);
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), '6.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, 4 + col - 13), '7.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, 4 + col - 13 - 14), '8.getOutputPositionOfInputPosition(' + col + ')');
        }
    });
    function withSplitLinesCollection(text, callback) {
        const config = new TestConfiguration({});
        const wrappingInfo = config.options.get(165 /* EditorOption.wrappingInfo */);
        const fontInfo = config.options.get(59 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = config.options.get(149 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = config.options.get(150 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = config.options.get(154 /* EditorOption.wrappingIndent */);
        const wordBreak = config.options.get(145 /* EditorOption.wordBreak */);
        const wrapOnEscapedLineFeeds = config.options.get(159 /* EditorOption.wrapOnEscapedLineFeeds */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const model = createTextModel([
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n'));
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds);
        callback(model, linesCollection);
        linesCollection.dispose();
        model.dispose();
        config.dispose();
    }
    test('Invalid line numbers', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            assert.strictEqual(linesCollection.getViewLineCount(), 6);
            // getOutputIndentGuide
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(-1, -1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 0), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(1, 1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(2, 2), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(3, 3), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(4, 4), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(5, 5), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(6, 6), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(7, 7), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 7), [0, 1, 0, 0, 1, 0]);
            // getOutputLineContent
            assert.strictEqual(linesCollection.getViewLineContent(-1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(0), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(2), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(3), '}');
            assert.strictEqual(linesCollection.getViewLineContent(4), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(5), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(6), '}');
            assert.strictEqual(linesCollection.getViewLineContent(7), '}');
            // getOutputLineMinColumn
            assert.strictEqual(linesCollection.getViewLineMinColumn(-1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(0), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(2), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(3), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(4), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(5), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(6), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(7), 1);
            // getOutputLineMaxColumn
            assert.strictEqual(linesCollection.getViewLineMaxColumn(-1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(0), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(2), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(3), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(4), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(5), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(6), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(7), 2);
            // convertOutputPositionToInputPosition
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(-1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(0, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(2, 1), new Position(2, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(3, 1), new Position(3, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(4, 1), new Position(4, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(5, 1), new Position(5, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(6, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(7, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(8, 1), new Position(6, 1));
        });
    });
    test('issue #3662', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            linesCollection.setHiddenAreas([
                new Range(1, 1, 3, 1),
                new Range(5, 1, 6, 1)
            ]);
            const viewLineCount = linesCollection.getViewLineCount();
            assert.strictEqual(viewLineCount, 1, 'getOutputLineCount()');
            const modelLineCount = model.getLineCount();
            for (let lineNumber = 0; lineNumber <= modelLineCount + 1; lineNumber++) {
                const lineMinColumn = (lineNumber >= 1 && lineNumber <= modelLineCount) ? model.getLineMinColumn(lineNumber) : 1;
                const lineMaxColumn = (lineNumber >= 1 && lineNumber <= modelLineCount) ? model.getLineMaxColumn(lineNumber) : 1;
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const viewPosition = linesCollection.convertModelPositionToViewPosition(lineNumber, column);
                    // validate view position
                    let viewLineNumber = viewPosition.lineNumber;
                    let viewColumn = viewPosition.column;
                    if (viewLineNumber < 1) {
                        viewLineNumber = 1;
                    }
                    const lineCount = linesCollection.getViewLineCount();
                    if (viewLineNumber > lineCount) {
                        viewLineNumber = lineCount;
                    }
                    const viewMinColumn = linesCollection.getViewLineMinColumn(viewLineNumber);
                    const viewMaxColumn = linesCollection.getViewLineMaxColumn(viewLineNumber);
                    if (viewColumn < viewMinColumn) {
                        viewColumn = viewMinColumn;
                    }
                    if (viewColumn > viewMaxColumn) {
                        viewColumn = viewMaxColumn;
                    }
                    const validViewPosition = new Position(viewLineNumber, viewColumn);
                    assert.strictEqual(viewPosition.toString(), validViewPosition.toString(), 'model->view for ' + lineNumber + ', ' + column);
                }
            }
            for (let lineNumber = 0; lineNumber <= viewLineCount + 1; lineNumber++) {
                const lineMinColumn = linesCollection.getViewLineMinColumn(lineNumber);
                const lineMaxColumn = linesCollection.getViewLineMaxColumn(lineNumber);
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const modelPosition = linesCollection.convertViewPositionToModelPosition(lineNumber, column);
                    const validModelPosition = model.validatePosition(modelPosition);
                    assert.strictEqual(modelPosition.toString(), validModelPosition.toString(), 'view->model for ' + lineNumber + ', ' + column);
                }
            }
        });
    });
});
suite('SplitLinesCollection', () => {
    const _text = [
        'class Nice {',
        '	function hi() {',
        '		console.log("Hello world");',
        '	}',
        '	function hello() {',
        '		console.log("Hello world, this is a somewhat longer line");',
        '	}',
        '}',
    ];
    const _tokens = [
        [
            { startIndex: 0, value: 1 },
            { startIndex: 5, value: 2 },
            { startIndex: 6, value: 3 },
            { startIndex: 10, value: 4 },
        ],
        [
            { startIndex: 0, value: 5 },
            { startIndex: 1, value: 6 },
            { startIndex: 9, value: 7 },
            { startIndex: 10, value: 8 },
            { startIndex: 12, value: 9 },
        ],
        [
            { startIndex: 0, value: 10 },
            { startIndex: 2, value: 11 },
            { startIndex: 9, value: 12 },
            { startIndex: 10, value: 13 },
            { startIndex: 13, value: 14 },
            { startIndex: 14, value: 15 },
            { startIndex: 27, value: 16 },
        ],
        [
            { startIndex: 0, value: 17 },
        ],
        [
            { startIndex: 0, value: 18 },
            { startIndex: 1, value: 19 },
            { startIndex: 9, value: 20 },
            { startIndex: 10, value: 21 },
            { startIndex: 15, value: 22 },
        ],
        [
            { startIndex: 0, value: 23 },
            { startIndex: 2, value: 24 },
            { startIndex: 9, value: 25 },
            { startIndex: 10, value: 26 },
            { startIndex: 13, value: 27 },
            { startIndex: 14, value: 28 },
            { startIndex: 59, value: 29 },
        ],
        [
            { startIndex: 0, value: 30 },
        ],
        [
            { startIndex: 0, value: 31 },
        ]
    ];
    let model;
    let languageRegistration;
    setup(() => {
        let _lineIndex = 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokens = _tokens[_lineIndex++];
                const result = new Uint32Array(2 * tokens.length);
                for (let i = 0; i < tokens.length; i++) {
                    result[2 * i] = tokens[i].startIndex;
                    result[2 * i + 1] = (tokens[i].value << 15 /* MetadataConsts.FOREGROUND_OFFSET */);
                }
                return new languages.EncodedTokenizationResult(result, state);
            }
        };
        const LANGUAGE_ID = 'modelModeTest1';
        languageRegistration = languages.TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        model = createTextModel(_text.join('\n'), LANGUAGE_ID);
        // force tokenization
        model.tokenization.forceTokenization(model.getLineCount());
    });
    teardown(() => {
        model.dispose();
        languageRegistration.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertViewLineTokens(_actual, expected) {
        const actual = [];
        for (let i = 0, len = _actual.getCount(); i < len; i++) {
            actual[i] = {
                endIndex: _actual.getEndOffset(i),
                value: _actual.getForeground(i)
            };
        }
        assert.deepStrictEqual(actual, expected);
    }
    function assertMinimapLineRenderingData(actual, expected) {
        if (actual === null && expected === null) {
            assert.ok(true);
            return;
        }
        if (expected === null) {
            assert.ok(false);
        }
        assert.strictEqual(actual.content, expected.content);
        assert.strictEqual(actual.minColumn, expected.minColumn);
        assert.strictEqual(actual.maxColumn, expected.maxColumn);
        assertViewLineTokens(actual.tokens, expected.tokens);
    }
    function assertMinimapLinesRenderingData(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assertMinimapLineRenderingData(actual[i], expected[i]);
        }
    }
    function assertAllMinimapLinesRenderingData(splitLinesCollection, all) {
        const lineCount = all.length;
        for (let line = 1; line <= lineCount; line++) {
            assert.strictEqual(splitLinesCollection.getViewLineData(line).content, splitLinesCollection.getViewLineContent(line));
        }
        for (let start = 1; start <= lineCount; start++) {
            for (let end = start; end <= lineCount; end++) {
                const count = end - start + 1;
                for (let desired = Math.pow(2, count) - 1; desired >= 0; desired--) {
                    const needed = [];
                    const expected = [];
                    for (let i = 0; i < count; i++) {
                        needed[i] = (desired & (1 << i)) ? true : false;
                        expected[i] = (needed[i] ? all[start - 1 + i] : null);
                    }
                    const actual = splitLinesCollection.getViewLinesData(start, end, needed);
                    assertMinimapLinesRenderingData(actual, expected);
                    // Comment out next line to test all possible combinations
                    break;
                }
            }
        }
    }
    test('getViewLinesData - no wrapping', () => {
        withSplitLinesCollection(model, 'off', 0, false, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello world");',
                    minColumn: 1,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 27, value: 15 },
                        { endIndex: 29, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello world, this is a somewhat longer line");',
                    minColumn: 1,
                    maxColumn: 62,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 59, value: 28 },
                        { endIndex: 61, value: 29 },
                    ]
                },
                {
                    minColumn: 1,
                    maxColumn: 3,
                    content: '	}',
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    minColumn: 1,
                    maxColumn: 2,
                    content: '}',
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 5);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
        });
    });
    test('getViewLinesData - with wrapping', () => {
        withSplitLinesCollection(model, 'wordWrapColumn', 30, false, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 12);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ]
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ]
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 29, value: 28 },
                    ]
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [
                        { endIndex: 28, value: 28 },
                    ]
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
        });
    });
    test('getViewLinesData - with wrapping and injected text', () => {
        model.deltaDecorations([], [{
                range: new Range(1, 9, 1, 9),
                options: {
                    description: 'example',
                    after: {
                        content: 'very very long injected text that causes a line break',
                        inlineClassName: 'myClassName'
                    },
                    showIfCollapsed: true,
                }
            }]);
        withSplitLinesCollection(model, 'wordWrapColumn', 30, false, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 14);
            assert.strictEqual(splitLinesCollection.getViewLineMaxColumn(1), 24);
            const _expected = [
                {
                    content: 'class Nivery very long ',
                    minColumn: 1,
                    maxColumn: 24,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 8, value: 3 },
                        { endIndex: 23, value: 1 },
                    ]
                },
                {
                    content: '    injected text that causes ',
                    minColumn: 5,
                    maxColumn: 31,
                    tokens: [{ endIndex: 30, value: 1 }]
                },
                {
                    content: '    a line breakce {',
                    minColumn: 5,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 16, value: 1 },
                        { endIndex: 18, value: 3 },
                        { endIndex: 20, value: 4 }
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ]
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ]
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 29, value: 28 },
                    ]
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [
                        { endIndex: 28, value: 28 },
                    ]
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            const data = splitLinesCollection.getViewLinesData(1, 14, new Array(14).fill(true));
            assert.deepStrictEqual(data.map((d) => ({
                inlineDecorations: d.inlineDecorations?.map((d) => ({
                    startOffset: d.startOffset,
                    endOffset: d.endOffset,
                })),
            })), [
                { inlineDecorations: [{ startOffset: 8, endOffset: 23 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 30 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 16 }] },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
            ]);
        });
    });
    function withSplitLinesCollection(model, wordWrap, wordWrapColumn, wrapOnEscapedLineFeeds, callback) {
        const configuration = new TestConfiguration({
            wordWrap: wordWrap,
            wordWrapColumn: wordWrapColumn,
            wrappingIndent: 'indent'
        });
        const wrappingInfo = configuration.options.get(165 /* EditorOption.wrappingInfo */);
        const fontInfo = configuration.options.get(59 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = configuration.options.get(149 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = configuration.options.get(150 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = configuration.options.get(154 /* EditorOption.wrappingIndent */);
        const wordBreak = configuration.options.get(145 /* EditorOption.wordBreak */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds);
        callback(linesCollection);
        configuration.dispose();
    }
});
function pos(lineNumber, column) {
    return new Position(lineNumber, column);
}
function createSplitLine(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth, isVisible = true) {
    return createModelLineProjection(createLineBreakData(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth), isVisible);
}
function createLineBreakData(breakingLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth) {
    const sums = [];
    for (let i = 0; i < breakingLengths.length; i++) {
        sums[i] = (i > 0 ? sums[i - 1] : 0) + breakingLengths[i];
    }
    return new ModelLineProjectionData(null, null, sums, breakingOffsetsVisibleColumn, wrappedTextIndentWidth);
}
function createModel(text) {
    return {
        tokenization: {
            getLineTokens: (lineNumber) => {
                return null;
            },
        },
        getLineContent: (lineNumber) => {
            return text;
        },
        getLineLength: (lineNumber) => {
            return text.length;
        },
        getLineMinColumn: (lineNumber) => {
            return 1;
        },
        getLineMaxColumn: (lineNumber) => {
            return text.length + 1;
        },
        getValueInRange: (range, eol) => {
            return text.substring(range.startColumn - 1, range.endColumn - 1);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3ZpZXdNb2RlbC9tb2RlbExpbmVQcm9qZWN0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFOUQsT0FBTyxLQUFLLFNBQVMsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHckYsT0FBTyxFQUFzQyx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVoRSxLQUFLLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO0lBRXJELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFD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RUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQy9DLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQzVFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNoRixDQUFDLENBQUM7UUFFSCxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUscUNBQXFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3RJLENBQUM7UUFDRCxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLHFDQUFxQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMvSSxDQUFDO1FBQ0QsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxxQ0FBcUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDcEosQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyx3QkFBd0IsQ0FBQyxJQUFZLEVBQUUsUUFBdUY7UUFDdEksTUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QyxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcscUNBQTJCLENBQUM7UUFDbkUsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO1FBQzNELE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLHFEQUEyQyxDQUFDO1FBQ25HLE1BQU0sNkJBQTZCLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLHNEQUE0QyxDQUFDO1FBQ3JHLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyx1Q0FBNkIsQ0FBQztRQUN2RSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsa0NBQXdCLENBQUM7UUFDN0QsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsK0NBQXFDLENBQUM7UUFDdkYsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGtDQUFrQyxDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFFdEksTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO1lBQzdCLGNBQWM7WUFDZCwyQkFBMkI7WUFDM0IsR0FBRztZQUNILGNBQWM7WUFDZCwyQkFBMkI7WUFDM0IsR0FBRztTQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFZCxNQUFNLGVBQWUsR0FBRyxJQUFJLGdDQUFnQyxDQUMzRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsUUFBUSxFQUNSLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQzFCLFFBQVEsRUFDUixZQUFZLENBQUMsY0FBYyxFQUMzQixjQUFjLEVBQ2QsU0FBUyxFQUNULHNCQUFzQixDQUN0QixDQUFDO1FBRUYsUUFBUSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUVqQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUVqQyxNQUFNLElBQUksR0FBRztZQUNaLGNBQWM7WUFDZCwyQkFBMkI7WUFDM0IsR0FBRztZQUNILGNBQWM7WUFDZCwyQkFBMkI7WUFDM0IsR0FBRztTQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWIsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFO1lBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFMUQsdUJBQXVCO1lBQ3ZCLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFM0YsdUJBQXVCO1lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztZQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRS9ELHlCQUF5QjtZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9ELHlCQUF5QjtZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9ELHVDQUF1QztZQUN2QyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JHLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JHLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JHLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFFeEIs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LEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzQixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtTQUM1QjtRQUNEO1lBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDM0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDM0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDM0IsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDNUIsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7U0FDNUI7UUFDRDtZQUNDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzdCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzdCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzdCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1NBQzdCO1FBQ0Q7WUFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtTQUM1QjtRQUNEO1lBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsRUFBRSxVQUFVLEVB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