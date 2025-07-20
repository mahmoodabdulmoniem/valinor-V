/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../../common/core/position.js';
import { getSecondaryEdits } from '../../browser/model/inlineCompletionsModel.js';
import { TextEdit, TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isDefined } from '../../../../../base/common/types.js';
suite('getSecondaryEdits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('basic', async function () {
        const textModel = createTextModel([
            'function fib(',
            'function fib('
        ].join('\n'));
        const positions = [
            new Position(1, 14),
            new Position(2, 14)
        ];
        const primaryEdit = new TextReplacement(new Range(1, 1, 1, 14), 'function fib() {');
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new TextReplacement(new Range(2, 14, 2, 14), ') {')]);
        textModel.dispose();
    });
    test('cursor not on same line as primary edit 1', async function () {
        const textModel = createTextModel([
            'function fib(',
            '',
            'function fib(',
            ''
        ].join('\n'));
        const positions = [
            new Position(2, 1),
            new Position(4, 1)
        ];
        const primaryEdit = new TextReplacement(new Range(1, 1, 2, 1), [
            'function fib() {',
            '	return 0;',
            '}'
        ].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(TextEdit.fromParallelReplacementsUnsorted(secondaryEdits.filter(isDefined)).toString(textModel.getValue()), "...ction fib(❰\n↦) {\n\t... 0;\n}❱");
        textModel.dispose();
    });
    test('cursor not on same line as primary edit 2', async function () {
        const textModel = createTextModel([
            'class A {',
            '',
            'class B {',
            '',
            'function f() {}'
        ].join('\n'));
        const positions = [
            new Position(2, 1),
            new Position(4, 1)
        ];
        const primaryEdit = new TextReplacement(new Range(1, 1, 2, 1), [
            'class A {',
            '	public x: number = 0;',
            '   public y: number = 0;',
            '}'
        ].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new TextReplacement(new Range(4, 1, 4, 1), [
                '	public x: number = 0;',
                '   public y: number = 0;',
                '}'
            ].join('\n'))]);
        textModel.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2Vjb25kYXJ5RWRpdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2dldFNlY29uZGFyeUVkaXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFFL0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUs7UUFFbEIsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDO1lBQ2pDLGVBQWU7WUFDZixlQUFlO1NBQ2YsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNkLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkIsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNuQixDQUFDO1FBQ0Ys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