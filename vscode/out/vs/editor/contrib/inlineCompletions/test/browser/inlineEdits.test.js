/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AnnotatedText, InlineEditContext, MockSearchReplaceCompletionsProvider, withAsyncTestCodeEditorAndInlineCompletionsModel } from './utils.js';
suite('Inline Edits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const val = new AnnotatedText(`
class Point {
	constructor(public x: number, public y: number) {}

	getLength2D(): number {
		return↓ Math.sqrt(this.x * this.x + this.y * this.y↓);
	}
}
`);
    async function runTest(cb) {
        const provider = new MockSearchReplaceCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel(val.value, { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async (ctx) => {
            const view = new InlineEditContext(ctx.model, ctx.editor);
            ctx.store.add(view);
            await cb(ctx, provider, view);
        });
    }
    test('Can Accept Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            model.accept();
            assert.deepStrictEqual(editor.getValue(), `
class Point {
	constructor(public x: number, public y: number) {}

	getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
}
`);
        });
    });
    test('Can Type Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            editor.setPosition(val.getMarkerPosition(1));
            editorViewModel.type(' + t');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...this.y + t❰his.z...his.z❱);\n"
            ]));
            editorViewModel.type('his.z * this.z');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe..."
            ]));
        });
    });
    test('Inline Edit Stays On Unrelated Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            editor.setPosition(val.getMarkerPosition(0));
            editorViewModel.type('/* */');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined
            ]));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2lubGluZUVkaXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFxRCxvQ0FBb0MsRUFBRSxnREFBZ0QsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV6TSxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDOzs7Ozs7OztDQVE5QixDQUFDLENBQUM7SUFFRixLQUFLLFVBQVUsT0FBTyxDQUFDLEVBQXNKO1FBQzVLLE1BQU0sUUFBUSxHQUFHLElBQUksb0NBQW9DLEVBQUUsQ0FBQztRQUM1RCxNQUFNLGdEQUFnRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQy9ELEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQy9ELEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNiLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFB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