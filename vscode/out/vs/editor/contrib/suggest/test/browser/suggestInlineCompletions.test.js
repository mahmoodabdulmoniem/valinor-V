/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { SuggestInlineCompletions } from '../../browser/suggestInlineCompletions.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
suite('Suggest Inline Completions', function () {
    const disposables = new DisposableStore();
    const services = new ServiceCollection([ISuggestMemoryService, new class extends mock() {
            select() {
                return 0;
            }
        }]);
    let insta;
    let model;
    let editor;
    setup(function () {
        insta = createCodeEditorServices(disposables, services);
        model = createTextModel('he', undefined, undefined, URI.from({ scheme: 'foo', path: 'foo.bar' }));
        editor = instantiateTestCodeEditor(insta, model);
        editor.updateOptions({ quickSuggestions: { comments: 'inline', strings: 'inline', other: 'inline' } });
        insta.invokeFunction(accessor => {
            disposables.add(accessor.get(ILanguageFeaturesService).completionProvider.register({ pattern: '*.bar', scheme: 'foo' }, new class {
                constructor() {
                    this._debugDisplayName = 'test';
                }
                provideCompletionItems(model, position, context, token) {
                    const word = model.getWordUntilPosition(position);
                    const range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    const suggestions = [];
                    suggestions.push({ insertText: 'hello', label: 'hello', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hell', label: 'hell', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hey', label: 'hey', range, kind: 28 /* CompletionItemKind.Snippet */ });
                    return { suggestions };
                }
            }));
        });
    });
    teardown(function () {
        disposables.clear();
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    const context = { triggerKind: InlineCompletionTriggerKind.Explicit, selectedSuggestionInfo: undefined, includeInlineCompletions: true, includeInlineEdits: false, requestUuid: generateUuid(), requestIssuedDateTime: 0 };
    test('Aggressive inline completions when typing within line #146948', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // (1,3), end of word -> suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.disposeInlineCompletions(result);
        }
        {
            // (1,2), middle of word -> NO suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 2), context, CancellationToken.None);
            assert.ok(result === undefined);
        }
    });
    test('Snippets show in inline suggestions even though they are turned off #175190', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // unfiltered
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.disposeInlineCompletions(result);
        }
        {
            // filtered
            editor.updateOptions({ suggest: { showSnippets: false } });
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 2);
            completions.disposeInlineCompletions(result);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3N1Z2dlc3RJbmxpbmVDb21wbGV0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBMEgsMkJBQTJCLEVBQWtCLE1BQU0saUNBQWlDLENBQUM7QUFHdE4sT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHlCQUF5QixFQUFtQixNQUFNLDRDQUE0QyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUV0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHbEUsS0FBSyxDQUFDLDRCQUE0QixFQUFFO0lBRW5DLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLElBQUksS0FBTSxTQUFRLElBQUksRUFBeUI7WUFDcEcsTUFBTTtnQkFDZCxPQUFPLENBQUMsQ0FBQztZQUNWLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUVKLElBQUksS0FBK0IsQ0FBQztJQUNwQyxJQUFJLEtBQWdCLENBQUM7SUFDckIsSUFBSSxNQUF1QixDQUFDO0lBRTVCLEtBQUssQ0FBQztRQUVMLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDeEQsS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdkcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJO2dCQUFBO29CQUMzSCxzQkFBaUIsR0FBRyxNQUFNLENBQUM7Z0JBZ0I1QixDQUFDO2dCQVpBLHNCQUFzQixDQUFDLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxPQUEwQixFQUFFLEtBQXdCO29CQUVqSCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFFcEcsTUFBTSxXQUFXLEdBQXFCLEVBQUUsQ0FBQztvQkFDekMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxrQ0FBMEIsRUFBRSxDQUFDLENBQUM7b0JBQ2pHLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksa0NBQTBCLEVBQUUsQ0FBQyxDQUFDO29CQUMvRixXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLHFDQUE0QixFQUFFLENBQUMsQ0FBQztvQkFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUN4QixDQUFDO2FBRUQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDO1FBQ1IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFHSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sT0FBTyxHQUE0QixFQUFFLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxDQUFDO0lBRXBQLElBQUksQ0FBQywrREFBK0QsRUFBRSxLQUFLO1FBRTFFLE1BQU0sV0FBVyxHQUE2QixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRTlHLENBQUM7WUFDQSxvQ0FBb0M7WUFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QyxXQUFXLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNELENBQUM7WUFDQSwwQ0FBMEM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDakMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEtBQUs7UUFDeEYsTUFBTSxXQUFXLEdBQTZCLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFFOUcsQ0FBQztZQUNBLGFBQWE7WUFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0SCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsQ0FBQztZQUNBLFdBQVc7WUFDWCxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0SCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxDQUFDO0lBRUYsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9