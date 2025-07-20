/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatMarkdownRenderer } from '../../browser/chatMarkdownRenderer.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('ChatMarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testRenderer;
    setup(() => {
        const instantiationService = store.add(workbenchInstantiationService(undefined, store));
        testRenderer = instantiationService.createInstance(ChatMarkdownRenderer, {});
    });
    test('simple', async () => {
        const md = new MarkdownString('a');
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.textContent);
    });
    test('supportHtml with one-line markdown', async () => {
        const md = new MarkdownString('**hello**');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
        const md2 = new MarkdownString('1. [_hello_](https://example.com) test **text**');
        md2.supportHtml = true;
        const result2 = store.add(testRenderer.render(md2));
        await assertSnapshot(result2.element.outerHTML);
    });
    test('invalid HTML', async () => {
        const md = new MarkdownString('1<canvas>2<details>3</details></canvas>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('invalid HTML with attributes', async () => {
        const md = new MarkdownString('1<details id="id1" style="display: none">2<details id="my id 2">3</details></details>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('valid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<ul>
	<li>1</li>
	<li><b>hi</b></li>
</ul>
<pre><code>code here</code></pre>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('mixed valid and invalid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<details>
<ul>
	<li><span><details><i>1</i></details></span></li>
	<li><b>hi</b></li>
</ul>
</details>
<pre><canvas>canvas here</canvas></pre><details></details>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('self-closing elements', async () => {
        const md = new MarkdownString('<area><hr><br><input type="text" value="test">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('html comments', async () => {
        const md = new MarkdownString('<!-- comment1 <div></div> --><div>content</div><!-- comment2 -->');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('CDATA', async () => {
        const md = new MarkdownString('<![CDATA[<div>content</div>]]>');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('remote images are disallowed', async () => {
        const md = new MarkdownString('<img src="http://disallowed.com/image.jpg">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWxHLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLFlBQWtDLENBQUM7SUFDdkMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN4RixZQUFZLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QixNQUFNLEVBQUUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVks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