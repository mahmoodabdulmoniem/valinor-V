/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow } from '../../../../../base/browser/dom.js';
import { basicMarkupHtmlTags, defaultAllowedAttrs } from '../../../../../base/browser/domSanitize.js';
import { renderMarkdown } from '../../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MarkedKatexSupport } from '../../browser/markedKatexSupport.js';
suite('Markdown Katex Support Test', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    async function renderMarkdownWithKatex(str) {
        const katex = await MarkedKatexSupport.loadExtension(getWindow(document), {});
        const rendered = store.add(renderMarkdown(new MarkdownString(str), {
            sanitizerOptions: MarkedKatexSupport.getSanitizerOptions({
                allowedTags: basicMarkupHtmlTags,
                allowedAttributes: defaultAllowedAttrs,
            }),
            markedOptions: {
                markedExtensions: [katex],
            }
        }));
        return rendered;
    }
    test('Basic inline equation', async () => {
        const rendered = await renderMarkdownWithKatex('Hello $\\frac{1}{2}$ World!');
        await assertSnapshot(rendered.element.innerHTML);
    });
    test('Should support inline equation wrapped in parans', async () => {
        const rendered = await renderMarkdownWithKatex('Hello ($\\frac{1}{2}$) World!');
        await assertSnapshot(rendered.element.innerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25LYXRleFN1cHBvcnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Rvd24vdGVzdC9icm93c2VyL21hcmtkb3duS2F0ZXhTdXBwb3J0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3pFLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxLQUFLLFVBQVUsdUJBQXVCLENBQUMsR0FBVztRQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEUsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUMsbUJBQW1CLENBQUM7Z0JBQ3hELFdBQVcsRUFBRSxtQkFBbUI7Z0JBQ2hDLGlCQUFpQixFQUFFLG1CQUFtQjthQUN0QyxDQUFDO1lBQ0YsYUFBYSxFQUFFO2dCQUNkLGdCQUFnQixFQUFFLENBQUMsS0FBSyxDQUFDO2FBQ3pCO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQXVCLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUM5RSxNQUFNLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQXVCLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNoRixNQUFNLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==