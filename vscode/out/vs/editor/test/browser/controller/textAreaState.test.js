/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TextAreaState } from '../../../browser/controller/editContext/textArea/textAreaEditContextState.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { createTextModel } from '../../common/testTextModel.js';
import { SimplePagedScreenReaderStrategy } from '../../../browser/controller/editContext/screenReaderUtils.js';
class MockTextAreaWrapper extends Disposable {
    constructor() {
        super();
        this._value = '';
        this._selectionStart = 0;
        this._selectionEnd = 0;
    }
    getValue() {
        return this._value;
    }
    setValue(reason, value) {
        this._value = value;
        this._selectionStart = this._value.length;
        this._selectionEnd = this._value.length;
    }
    getSelectionStart() {
        return this._selectionStart;
    }
    getSelectionEnd() {
        return this._selectionEnd;
    }
    setSelectionRange(reason, selectionStart, selectionEnd) {
        if (selectionStart < 0) {
            selectionStart = 0;
        }
        if (selectionStart > this._value.length) {
            selectionStart = this._value.length;
        }
        if (selectionEnd < 0) {
            selectionEnd = 0;
        }
        if (selectionEnd > this._value.length) {
            selectionEnd = this._value.length;
        }
        this._selectionStart = selectionStart;
        this._selectionEnd = selectionEnd;
    }
}
function equalsTextAreaState(a, b) {
    return (a.value === b.value
        && a.selectionStart === b.selectionStart
        && a.selectionEnd === b.selectionEnd
        && Range.equalsRange(a.selection, b.selection)
        && a.newlineCountBeforeSelection === b.newlineCountBeforeSelection);
}
suite('TextAreaState', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertTextAreaState(actual, value, selectionStart, selectionEnd) {
        const desired = new TextAreaState(value, selectionStart, selectionEnd, null, undefined);
        assert.ok(equalsTextAreaState(desired, actual), desired.toString() + ' == ' + actual.toString());
    }
    test('fromTextArea', () => {
        const textArea = new MockTextAreaWrapper();
        textArea._value = 'Hello world!';
        textArea._selectionStart = 1;
        textArea._selectionEnd = 12;
        let actual = TextAreaState.readFromTextArea(textArea, null);
        assertTextAreaState(actual, 'Hello world!', 1, 12);
        assert.strictEqual(actual.value, 'Hello world!');
        assert.strictEqual(actual.selectionStart, 1);
        actual = actual.collapseSelection();
        assertTextAreaState(actual, 'Hello world!', 12, 12);
        textArea.dispose();
    });
    test('applyToTextArea', () => {
        const textArea = new MockTextAreaWrapper();
        textArea._value = 'Hello world!';
        textArea._selectionStart = 1;
        textArea._selectionEnd = 12;
        let state = new TextAreaState('Hi world!', 2, 2, null, undefined);
        state.writeToTextArea('test', textArea, false);
        assert.strictEqual(textArea._value, 'Hi world!');
        assert.strictEqual(textArea._selectionStart, 9);
        assert.strictEqual(textArea._selectionEnd, 9);
        state = new TextAreaState('Hi world!', 3, 3, null, undefined);
        state.writeToTextArea('test', textArea, false);
        assert.strictEqual(textArea._value, 'Hi world!');
        assert.strictEqual(textArea._selectionStart, 9);
        assert.strictEqual(textArea._selectionEnd, 9);
        state = new TextAreaState('Hi world!', 0, 2, null, undefined);
        state.writeToTextArea('test', textArea, true);
        assert.strictEqual(textArea._value, 'Hi world!');
        assert.strictEqual(textArea._selectionStart, 0);
        assert.strictEqual(textArea._selectionEnd, 2);
        textArea.dispose();
    });
    function testDeduceInput(prevState, value, selectionStart, selectionEnd, couldBeEmojiInput, expected, expectedCharReplaceCnt) {
        prevState = prevState || TextAreaState.EMPTY;
        const textArea = new MockTextAreaWrapper();
        textArea._value = value;
        textArea._selectionStart = selectionStart;
        textArea._selectionEnd = selectionEnd;
        const newState = TextAreaState.readFromTextArea(textArea, null);
        const actual = TextAreaState.deduceInput(prevState, newState, couldBeEmojiInput);
        assert.deepStrictEqual(actual, {
            text: expected,
            replacePrevCharCnt: expectedCharReplaceCnt,
            replaceNextCharCnt: 0,
            positionDelta: 0,
        });
        textArea.dispose();
    }
    test('extractNewText - no previous state with selection', () => {
        testDeduceInput(null, 'a', 0, 1, true, 'a', 0);
    });
    test('issue #2586: Replacing selected end-of-line with newline locks up the document', () => {
        testDeduceInput(new TextAreaState(']\n', 1, 2, null, undefined), ']\n', 2, 2, true, '\n', 0);
    });
    test('extractNewText - no previous state without selection', () => {
        testDeduceInput(null, 'a', 1, 1, true, 'a', 0);
    });
    test('extractNewText - typing does not cause a selection', () => {
        testDeduceInput(TextAreaState.EMPTY, 'a', 0, 1, true, 'a', 0);
    });
    test('extractNewText - had the textarea empty', () => {
        testDeduceInput(TextAreaState.EMPTY, 'a', 1, 1, true, 'a', 0);
    });
    test('extractNewText - had the entire line selected', () => {
        testDeduceInput(new TextAreaState('Hello world!', 0, 12, null, undefined), 'H', 1, 1, true, 'H', 0);
    });
    test('extractNewText - had previous text 1', () => {
        testDeduceInput(new TextAreaState('Hello world!', 12, 12, null, undefined), 'Hello world!a', 13, 13, true, 'a', 0);
    });
    test('extractNewText - had previous text 2', () => {
        testDeduceInput(new TextAreaState('Hello world!', 0, 0, null, undefined), 'aHello world!', 1, 1, true, 'a', 0);
    });
    test('extractNewText - had previous text 3', () => {
        testDeduceInput(new TextAreaState('Hello world!', 6, 11, null, undefined), 'Hello other!', 11, 11, true, 'other', 0);
    });
    test('extractNewText - IME', () => {
        testDeduceInput(TextAreaState.EMPTY, 'これは', 3, 3, true, 'これは', 0);
    });
    test('extractNewText - isInOverwriteMode', () => {
        testDeduceInput(new TextAreaState('Hello world!', 0, 0, null, undefined), 'Aello world!', 1, 1, true, 'A', 0);
    });
    test('extractMacReplacedText - does nothing if there is selection', () => {
        testDeduceInput(new TextAreaState('Hello world!', 5, 5, null, undefined), 'Hellö world!', 4, 5, true, 'ö', 0);
    });
    test('extractMacReplacedText - does nothing if there is more than one extra char', () => {
        testDeduceInput(new TextAreaState('Hello world!', 5, 5, null, undefined), 'Hellöö world!', 5, 5, true, 'öö', 1);
    });
    test('extractMacReplacedText - does nothing if there is more than one changed char', () => {
        testDeduceInput(new TextAreaState('Hello world!', 5, 5, null, undefined), 'Helöö world!', 5, 5, true, 'öö', 2);
    });
    test('extractMacReplacedText', () => {
        testDeduceInput(new TextAreaState('Hello world!', 5, 5, null, undefined), 'Hellö world!', 5, 5, true, 'ö', 1);
    });
    test('issue #25101 - First key press ignored', () => {
        testDeduceInput(new TextAreaState('a', 0, 1, null, undefined), 'a', 1, 1, true, 'a', 0);
    });
    test('issue #16520 - Cmd-d of single character followed by typing same character as has no effect', () => {
        testDeduceInput(new TextAreaState('x x', 0, 1, null, undefined), 'x x', 1, 1, true, 'x', 0);
    });
    function testDeduceAndroidCompositionInput(prevState, value, selectionStart, selectionEnd, expected, expectedReplacePrevCharCnt, expectedReplaceNextCharCnt, expectedPositionDelta) {
        prevState = prevState || TextAreaState.EMPTY;
        const textArea = new MockTextAreaWrapper();
        textArea._value = value;
        textArea._selectionStart = selectionStart;
        textArea._selectionEnd = selectionEnd;
        const newState = TextAreaState.readFromTextArea(textArea, null);
        const actual = TextAreaState.deduceAndroidCompositionInput(prevState, newState);
        assert.deepStrictEqual(actual, {
            text: expected,
            replacePrevCharCnt: expectedReplacePrevCharCnt,
            replaceNextCharCnt: expectedReplaceNextCharCnt,
            positionDelta: expectedPositionDelta,
        });
        textArea.dispose();
    }
    test('Android composition input 1', () => {
        testDeduceAndroidCompositionInput(new TextAreaState('Microsoft', 4, 4, null, undefined), 'Microsoft', 4, 4, '', 0, 0, 0);
    });
    test('Android composition input 2', () => {
        testDeduceAndroidCompositionInput(new TextAreaState('Microsoft', 4, 4, null, undefined), 'Microsoft', 0, 9, '', 0, 0, 5);
    });
    test('Android composition input 3', () => {
        testDeduceAndroidCompositionInput(new TextAreaState('Microsoft', 0, 9, null, undefined), 'Microsoft\'s', 11, 11, '\'s', 0, 0, 0);
    });
    test('Android backspace', () => {
        testDeduceAndroidCompositionInput(new TextAreaState('undefinedVariable', 2, 2, null, undefined), 'udefinedVariable', 1, 1, '', 1, 0, 0);
    });
    suite('SimplePagedScreenReaderStrategy', () => {
        function testPagedScreenReaderStrategy(lines, selection, expected) {
            const model = createTextModel(lines.join('\n'));
            const screenReaderStrategy = new SimplePagedScreenReaderStrategy();
            const screenReaderContentState = screenReaderStrategy.fromEditorSelection(model, selection, 10, true);
            const textAreaState = TextAreaState.fromScreenReaderContentState(screenReaderContentState);
            assert.ok(equalsTextAreaState(textAreaState, expected));
            model.dispose();
        }
        test('simple', () => {
            testPagedScreenReaderStrategy([
                'Hello world!'
            ], new Selection(1, 13, 1, 13), new TextAreaState('Hello world!', 12, 12, new Range(1, 13, 1, 13), 0));
            testPagedScreenReaderStrategy([
                'Hello world!'
            ], new Selection(1, 1, 1, 1), new TextAreaState('Hello world!', 0, 0, new Range(1, 1, 1, 1), 0));
            testPagedScreenReaderStrategy([
                'Hello world!'
            ], new Selection(1, 1, 1, 6), new TextAreaState('Hello world!', 0, 5, new Range(1, 1, 1, 6), 0));
        });
        test('multiline', () => {
            testPagedScreenReaderStrategy([
                'Hello world!',
                'How are you?'
            ], new Selection(1, 1, 1, 1), new TextAreaState('Hello world!\nHow are you?', 0, 0, new Range(1, 1, 1, 1), 0));
            testPagedScreenReaderStrategy([
                'Hello world!',
                'How are you?'
            ], new Selection(2, 1, 2, 1), new TextAreaState('Hello world!\nHow are you?', 13, 13, new Range(2, 1, 2, 1), 1));
        });
        test('page', () => {
            testPagedScreenReaderStrategy([
                'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21'
            ], new Selection(1, 1, 1, 1), new TextAreaState('L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\n', 0, 0, new Range(1, 1, 1, 1), 0));
            testPagedScreenReaderStrategy([
                'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21'
            ], new Selection(11, 1, 11, 1), new TextAreaState('L11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\n', 0, 0, new Range(11, 1, 11, 1), 0));
            testPagedScreenReaderStrategy([
                'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21'
            ], new Selection(12, 1, 12, 1), new TextAreaState('L11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\n', 4, 4, new Range(12, 1, 12, 1), 1));
            testPagedScreenReaderStrategy([
                'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21'
            ], new Selection(21, 1, 21, 1), new TextAreaState('L21', 0, 0, new Range(21, 1, 21, 1), 0));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFTdGF0ZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvdGV4dEFyZWFTdGF0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFvQixhQUFhLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUMvSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUUvRyxNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFNM0M7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFTSxRQUFRLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFD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