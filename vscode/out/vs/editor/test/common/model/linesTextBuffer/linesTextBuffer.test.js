/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { PieceTreeTextBuffer } from '../../../../common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.js';
import { createTextBufferFactory } from '../../../../common/model/textModel.js';
suite('PieceTreeTextBuffer._getInverseEdits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, text) {
        return {
            sortIndex: 0,
            identifier: null,
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            rangeOffset: 0,
            rangeLength: 0,
            text: text ? text.join('\n') : '',
            eolCount: text ? text.length - 1 : 0,
            firstLineLength: text ? text[0].length : 0,
            lastLineLength: text ? text[text.length - 1].length : 0,
            forceMoveMarkers: false,
            isAutoWhitespaceEdit: false
        };
    }
    function inverseEditOp(startLineNumber, startColumn, endLineNumber, endColumn) {
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    function assertInverseEdits(ops, expected) {
        const actual = PieceTreeTextBuffer._getInverseEditRanges(ops);
        assert.deepStrictEqual(actual, expected);
    }
    test('single insert', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello'])
        ], [
            inverseEditOp(1, 1, 1, 6)
        ]);
    });
    test('Bug 19872: Undo is funky', () => {
        assertInverseEdits([
            editOp(2, 1, 2, 2, ['']),
            editOp(3, 1, 4, 2, [''])
        ], [
            inverseEditOp(2, 1, 2, 1),
            inverseEditOp(3, 1, 3, 1)
        ]);
    });
    test('two single unrelated inserts', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello']),
            editOp(2, 1, 2, 1, ['world'])
        ], [
            inverseEditOp(1, 1, 1, 6),
            inverseEditOp(2, 1, 2, 6)
        ]);
    });
    test('two single inserts 1', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello']),
            editOp(1, 2, 1, 2, ['world'])
        ], [
            inverseEditOp(1, 1, 1, 6),
            inverseEditOp(1, 7, 1, 12)
        ]);
    });
    test('two single inserts 2', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello']),
            editOp(1, 4, 1, 4, ['world'])
        ], [
            inverseEditOp(1, 1, 1, 6),
            inverseEditOp(1, 9, 1, 14)
        ]);
    });
    test('multiline insert', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello', 'world'])
        ], [
            inverseEditOp(1, 1, 2, 6)
        ]);
    });
    test('two unrelated multiline inserts', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello', 'world']),
            editOp(2, 1, 2, 1, ['how', 'are', 'you?']),
        ], [
            inverseEditOp(1, 1, 2, 6),
            inverseEditOp(3, 1, 5, 5),
        ]);
    });
    test('two multiline inserts 1', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 1, ['hello', 'world']),
            editOp(1, 2, 1, 2, ['how', 'are', 'you?']),
        ], [
            inverseEditOp(1, 1, 2, 6),
            inverseEditOp(2, 7, 4, 5),
        ]);
    });
    test('single delete', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, null)
        ], [
            inverseEditOp(1, 1, 1, 1)
        ]);
    });
    test('two single unrelated deletes', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, null),
            editOp(2, 1, 2, 6, null)
        ], [
            inverseEditOp(1, 1, 1, 1),
            inverseEditOp(2, 1, 2, 1)
        ]);
    });
    test('two single deletes 1', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, null),
            editOp(1, 7, 1, 12, null)
        ], [
            inverseEditOp(1, 1, 1, 1),
            inverseEditOp(1, 2, 1, 2)
        ]);
    });
    test('two single deletes 2', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, null),
            editOp(1, 9, 1, 14, null)
        ], [
            inverseEditOp(1, 1, 1, 1),
            inverseEditOp(1, 4, 1, 4)
        ]);
    });
    test('multiline delete', () => {
        assertInverseEdits([
            editOp(1, 1, 2, 6, null)
        ], [
            inverseEditOp(1, 1, 1, 1)
        ]);
    });
    test('two unrelated multiline deletes', () => {
        assertInverseEdits([
            editOp(1, 1, 2, 6, null),
            editOp(3, 1, 5, 5, null),
        ], [
            inverseEditOp(1, 1, 1, 1),
            inverseEditOp(2, 1, 2, 1),
        ]);
    });
    test('two multiline deletes 1', () => {
        assertInverseEdits([
            editOp(1, 1, 2, 6, null),
            editOp(2, 7, 4, 5, null),
        ], [
            inverseEditOp(1, 1, 1, 1),
            inverseEditOp(1, 2, 1, 2),
        ]);
    });
    test('single replace', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, ['Hello world'])
        ], [
            inverseEditOp(1, 1, 1, 12)
        ]);
    });
    test('two replaces', () => {
        assertInverseEdits([
            editOp(1, 1, 1, 6, ['Hello world']),
            editOp(1, 7, 1, 8, ['How are you?']),
        ], [
            inverseEditOp(1, 1, 1, 12),
            inverseEditOp(1, 13, 1, 25)
        ]);
    });
    test('many edits', () => {
        assertInverseEdits([
            editOp(1, 2, 1, 2, ['', '  ']),
            editOp(1, 5, 1, 6, ['']),
            editOp(1, 9, 1, 9, ['', ''])
        ], [
            inverseEditOp(1, 2, 2, 3),
            inverseEditOp(2, 6, 2, 6),
            inverseEditOp(2, 9, 3, 1)
        ]);
    });
});
suite('PieceTreeTextBuffer._toSingleEditOperation', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function editOp(startLineNumber, startColumn, endLineNumber, endColumn, rangeOffset, rangeLength, text) {
        return {
            sortIndex: 0,
            identifier: null,
            range: new Range(startLineNumber, startColumn, endLineNumber, endColumn),
            rangeOffset: rangeOffset,
            rangeLength: rangeLength,
            text: text ? text.join('\n') : '',
            eolCount: text ? text.length - 1 : 0,
            firstLineLength: text ? text[0].length : 0,
            lastLineLength: text ? text[text.length - 1].length : 0,
            forceMoveMarkers: false,
            isAutoWhitespaceEdit: false
        };
    }
    function testToSingleEditOperation(original, edits, expected) {
        const { disposable, textBuffer } = createTextBufferFactory(original.join('\n')).create(1 /* DefaultEndOfLine.LF */);
        const actual = textBuffer._toSingleEditOperation(edits);
        assert.deepStrictEqual(actual, expected);
        disposable.dispose();
    }
    test('one edit op is unchanged', () => {
        testToSingleEditOperation([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, 2, 0, [' new line', 'No longer'])
        ], editOp(1, 3, 1, 3, 2, 0, [' new line', 'No longer']));
    });
    test('two edits on one line', () => {
        testToSingleEditOperation([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 3, 0, 2, ['Your']),
            editOp(1, 4, 1, 4, 3, 0, ['Interesting ']),
            editOp(2, 3, 2, 6, 16, 3, null)
        ], editOp(1, 1, 2, 6, 0, 19, [
            'Your Interesting First Line',
            '\t\t'
        ]));
    });
    test('insert multiple newlines', () => {
        testToSingleEditOperation([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 3, 1, 3, 2, 0, ['', '', '', '', '']),
            editOp(3, 15, 3, 15, 45, 0, ['a', 'b'])
        ], editOp(1, 3, 3, 15, 2, 43, [
            '',
            '',
            '',
            '',
            ' First Line',
            '\t\tMy Second Line',
            '    Third Linea',
            'b'
        ]));
    });
    test('delete empty text', () => {
        testToSingleEditOperation([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '1'
        ], [
            editOp(1, 1, 1, 1, 0, 0, [''])
        ], editOp(1, 1, 1, 1, 0, 0, ['']));
    });
    test('two unrelated edits', () => {
        testToSingleEditOperation([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], [
            editOp(2, 1, 2, 3, 14, 2, ['\t']),
            editOp(3, 1, 3, 5, 31, 4, [''])
        ], editOp(2, 1, 3, 5, 14, 21, ['\tMy Second Line', '']));
    });
    test('many edits', () => {
        testToSingleEditOperation([
            '{"x" : 1}'
        ], [
            editOp(1, 2, 1, 2, 1, 0, ['\n  ']),
            editOp(1, 5, 1, 6, 4, 1, ['']),
            editOp(1, 9, 1, 9, 8, 0, ['\n'])
        ], editOp(1, 2, 1, 9, 1, 7, [
            '',
            '  "x": 1',
            ''
        ]));
    });
    test('many edits reversed', () => {
        testToSingleEditOperation([
            '{',
            '  "x": 1',
            '}'
        ], [
            editOp(1, 2, 2, 3, 1, 3, ['']),
            editOp(2, 6, 2, 6, 7, 0, [' ']),
            editOp(2, 9, 3, 1, 10, 1, [''])
        ], editOp(1, 2, 3, 1, 1, 10, ['"x" : 1']));
    });
    test('replacing newlines 1', () => {
        testToSingleEditOperation([
            '{',
            '"a": true,',
            '',
            '"b": true',
            '}'
        ], [
            editOp(1, 2, 2, 1, 1, 1, ['', '\t']),
            editOp(2, 11, 4, 1, 12, 2, ['', '\t'])
        ], editOp(1, 2, 4, 1, 1, 13, [
            '',
            '\t"a": true,',
            '\t'
        ]));
    });
    test('replacing newlines 2', () => {
        testToSingleEditOperation([
            'some text',
            'some more text',
            'now comes an empty line',
            '',
            'after empty line',
            'and the last line'
        ], [
            editOp(1, 5, 3, 1, 4, 21, [' text', 'some more text', 'some more text']),
            editOp(3, 2, 4, 1, 26, 23, ['o more lines', 'asd', 'asd', 'asd']),
            editOp(5, 1, 5, 6, 50, 5, ['zzzzzzzz']),
            editOp(5, 11, 6, 16, 60, 22, ['1', '2', '3', '4'])
        ], editOp(1, 5, 6, 16, 4, 78, [
            ' text',
            'some more text',
            'some more textno more lines',
            'asd',
            'asd',
            'asd',
            'zzzzzzzz empt1',
            '2',
            '3',
            '4'
        ]));
    });
    test('advanced', () => {
        testToSingleEditOperation([
            ' {       "d": [',
            '             null',
            '        ] /*comment*/',
            '        ,"e": /*comment*/ [null] }',
        ], [
            editOp(1, 1, 1, 2, 0, 1, ['']),
            editOp(1, 3, 1, 10, 2, 7, ['', '  ']),
            editOp(1, 16, 2, 14, 15, 14, ['', '    ']),
            editOp(2, 18, 3, 9, 33, 9, ['', '  ']),
            editOp(3, 22, 4, 9, 55, 9, ['']),
            editOp(4, 10, 4, 10, 65, 0, ['', '  ']),
            editOp(4, 28, 4, 28, 83, 0, ['', '    ']),
            editOp(4, 32, 4, 32, 87, 0, ['', '  ']),
            editOp(4, 33, 4, 34, 88, 1, ['', ''])
        ], editOp(1, 1, 4, 34, 0, 89, [
            '{',
            '  "d": [',
            '    null',
            '  ] /*comment*/,',
            '  "e": /*comment*/ [',
            '    null',
            '  ]',
            ''
        ]));
    });
    test('advanced simplified', () => {
        testToSingleEditOperation([
            '   abc',
            ' ,def'
        ], [
            editOp(1, 1, 1, 4, 0, 3, ['']),
            editOp(1, 7, 2, 2, 6, 2, ['']),
            editOp(2, 3, 2, 3, 9, 0, ['', ''])
        ], editOp(1, 1, 2, 3, 0, 9, [
            'abc,',
            ''
        ]));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNUZXh0QnVmZmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9saW5lc1RleHRCdWZmZXIvbGluZXNUZXh0QnVmZmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQTJCLG1CQUFtQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDbkksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEYsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUVsRCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsTUFBTSxDQUFDLGVBQXVCLEVBQUUsV0FBbUIsRUFBRSxhQUFxQixFQUFFLFNBQWlCLEVBQUUsSUFBcUI7UUFDNUgsT0FBTztZQUNOLFNBQVMsRUFBRSxDQUFDO1lBQ1osVUFBVSxFQUFFLElBQUk7WUFDaEIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQztZQUN4RSxXQUFXLEVBQUUsQ0FBQztZQUNkLFdBQVcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxD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QUFDO1lBQ3JDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JDLEVBQ0QsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQzFCLEdBQUc7WUFDSCxVQUFVO1lBQ1YsVUFBVTtZQUNWLGtCQUFrQjtZQUNsQixzQkFBc0I7WUFDdEIsVUFBVTtZQUNWLEtBQUs7WUFDTCxFQUFFO1NBQ0YsQ0FBQyxDQUNGLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMseUJBQXlCLENBQ3hCO1lBQ0MsUUFBUTtZQUNSLE9BQU87U0FDUCxFQUNEO1lBQ0MsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUIsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUIsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2xDLEVBQ0QsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3hCLE1BQU07WUFDTixFQUFFO1NBQ0YsQ0FBQyxDQUNGLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=