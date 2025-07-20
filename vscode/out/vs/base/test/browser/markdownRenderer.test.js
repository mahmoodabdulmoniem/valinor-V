/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { fillInIncompleteTokens, renderMarkdown, renderAsPlaintext } from '../../browser/markdownRenderer.js';
import { MarkdownString } from '../../common/htmlContent.js';
import * as marked from '../../common/marked/marked.js';
import { parse } from '../../common/marshalling.js';
import { isWeb } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
function strToNode(str) {
    return new DOMParser().parseFromString(str, 'text/html').body.firstChild;
}
function assertNodeEquals(actualNode, expectedHtml) {
    const expectedNode = strToNode(expectedHtml);
    assert.ok(actualNode.isEqualNode(expectedNode), `Expected: ${expectedNode.outerHTML}\nActual: ${actualNode.outerHTML}`);
}
suite('MarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('Sanitization', () => {
        test('Should not render images with unknown schemes', () => {
            const markdown = { value: `![image](no-such://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assert.strictEqual(result.innerHTML, '<p><img alt="image"></p>');
        });
    });
    suite('Images', () => {
        test('image rendering conforms to default', () => {
            const markdown = { value: `![image](http://example.com/cat.gif 'caption')` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img title="caption" alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image rendering conforms to default without title', () => {
            const markdown = { value: `![image](http://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image width from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|width=100px 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image height from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|height=100 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img height="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image width and height from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|height=200,width=100 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img height="200" width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image with file uri should render as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const result = store.add(renderMarkdown({ value: `![image](file:///images/cat.gif)` })).element;
            assertNodeEquals(result, '<div><p><img src="vscode-file://vscode-app/images/cat.gif" alt="image"></p></div>');
        });
    });
    suite('Code block renderer', () => {
        const simpleCodeBlockRenderer = (lang, code) => {
            const element = document.createElement('code');
            element.textContent = code;
            return Promise.resolve(element);
        };
        test('asyncRenderCallback should be invoked for code blocks', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise(resolve => {
                store.add(renderMarkdown(markdown, {
                    asyncRenderCallback: resolve,
                    codeBlockRenderer: simpleCodeBlockRenderer
                }));
            });
        });
        test('asyncRenderCallback should not be invoked if result is immediately disposed', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: simpleCodeBlockRenderer
                });
                result.dispose();
                setTimeout(resolve, 10);
            });
        });
        test('asyncRenderCallback should not be invoked if dispose is called before code block is rendered', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                let resolveCodeBlockRendering;
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: () => {
                        return new Promise(resolve => {
                            resolveCodeBlockRendering = resolve;
                        });
                    }
                });
                setTimeout(() => {
                    result.dispose();
                    resolveCodeBlockRendering(document.createElement('code'));
                    setTimeout(resolve, 10);
                }, 10);
            });
        });
        test('Code blocks should use leading language id (#157793)', async () => {
            const markdown = { value: '```js some other stuff\n1 + 1;\n```' };
            const lang = await new Promise(resolve => {
                store.add(renderMarkdown(markdown, {
                    codeBlockRenderer: async (lang, value) => {
                        resolve(lang);
                        return simpleCodeBlockRenderer(lang, value);
                    }
                }));
            });
            assert.strictEqual(lang, 'js');
        });
    });
    suite('ThemeIcons Support On', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-zap"></span> $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render icon in link', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`[$(zap)-link](#link)`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></p>`);
        });
        test('render icon in table', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`
| text   | text                 |
|--------|----------------------|
| $(zap) | [$(zap)-link](#link) |`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<table>
<thead>
<tr>
<th>text</th>
<th>text</th>
</tr>
</thead>
<tbody><tr>
<td><span class="codicon codicon-zap"></span></td>
<td><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></td>
</tr>
</tbody></table>
`);
        });
        test('render icon in <a> without href (#152170)', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true, supportHtml: true });
            mds.appendMarkdown(`<a>$(sync)</a>`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-sync"></span></p>`);
        });
    });
    suite('ThemeIcons Support Off', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) $(add)</p>`);
        });
    });
    test('npm Hover Run Script not working #90855', function () {
        const md = JSON.parse('{"value":"[Run Script](command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D \\"Run the script as a task\\")","supportThemeIcons":false,"isTrusted":true,"uris":{"__uri_e49443":{"$mid":1,"fsPath":"c:\\\\Users\\\\jrieken\\\\Code\\\\_sample\\\\foo\\\\package.json","_sep":1,"external":"file:///c%3A/Users/jrieken/Code/_sample/foo/package.json","path":"/c:/Users/jrieken/Code/_sample/foo/package.json","scheme":"file"},"command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D":{"$mid":1,"path":"npm.runScriptFromHover","scheme":"command","query":"{\\"documentUri\\":\\"__uri_e49443\\",\\"script\\":\\"echo\\"}"}}}');
        const element = store.add(renderMarkdown(md)).element;
        const anchor = element.querySelector('a');
        assert.ok(anchor);
        assert.ok(anchor.dataset['href']);
        const uri = URI.parse(anchor.dataset['href']);
        const data = parse(decodeURIComponent(uri.query));
        assert.ok(data);
        assert.strictEqual(data.script, 'echo');
        assert.ok(data.documentUri.toString().startsWith('file:///c%3A/'));
    });
    test('Should not render command links by default', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            supportHtml: true
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p>command1 command2</p>`);
    });
    test('Should render command links in trusted strings', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            isTrusted: true,
            supportHtml: true,
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p><a data-href="command:doFoo" href="" title="command:doFoo" draggable="false">command1</a> <a data-href="command:doFoo" href="">command2</a></p>`);
    });
    suite('PlaintextMarkdownRender', () => {
        test('test code, blockquote, heading, list, listitem, paragraph, table, tablerow, tablecell, strong, em, br, del, text are rendered plaintext', () => {
            const markdown = { value: '`code`\n>quote\n# heading\n- list\n\ntable | table2\n--- | --- \none | two\n\n\nbo**ld**\n_italic_\n~~del~~\nsome text' };
            const expected = 'code\nquote\nheading\nlist\n\ntable table2\none two\nbold\nitalic\ndel\nsome text';
            const result = renderAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test('test html, hr, image, link are rendered plaintext', () => {
            const markdown = { value: '<div>html</div>\n\n---\n![image](imageLink)\n[text](textLink)' };
            const expected = 'text';
            const result = renderAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test(`Should not remove html inside of code blocks`, () => {
            const markdown = {
                value: [
                    '```html',
                    '<form>html</form>',
                    '```',
                ].join('\n')
            };
            const expected = [
                '```',
                '<form>html</form>',
                '```',
            ].join('\n');
            const result = renderAsPlaintext(markdown, { includeCodeBlocksFences: true });
            assert.strictEqual(result, expected);
        });
    });
    suite('supportHtml', () => {
        test('supportHtml is disabled by default', () => {
            const mds = new MarkdownString(undefined, {});
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>abc</p>`);
        });
        test('Renders html when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not include scripts even when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b onclick="alert(1)">b</b><script>alert(2)</script>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not render html appended as text', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendText('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a&lt;b&gt;b&lt;/b&gt;c</p>`);
        });
        test('Should render html images', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="http://example.com/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="http://example.com/cat.gif">`);
        });
        test('Should render html images with file uri as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="file:///images/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="vscode-file://vscode-app/images/cat.gif">`);
        });
    });
    suite('fillInIncompleteTokens', () => {
        function ignoreRaw(...tokenLists) {
            tokenLists.forEach(tokens => {
                tokens.forEach(t => t.raw = '');
            });
        }
        const completeTable = '| a | b |\n| --- | --- |';
        suite('table', () => {
            test('complete table', () => {
                const tokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.equal(newTokens, tokens);
            });
            test('full header only', () => {
                const incompleteTable = '| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header only with trailing space', () => {
                const incompleteTable = '| a | b | ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header', () => {
                const incompleteTable = '| a | b';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header one column', () => {
                const incompleteTable = '| a ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '|\n| --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with extras', () => {
                const incompleteTable = '| a **bold** | b _italics_ |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading text', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = 'here is a table\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading other stuff', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = '```js\nconst xyz = 123;\n```\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator', () => {
                const incompleteTable = '| a | b |\n| ---';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 2', () => {
                const incompleteTable = '| a | b |\n| --- |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 3', () => {
                const incompleteTable = '| a | b |\n|';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('not a table', () => {
                const incompleteTable = '| a | b |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('not a table 2', () => {
                const incompleteTable = '| a | b |\n| --- |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        function simpleMarkdownTestSuite(name, delimiter) {
            test(`incomplete ${name}`, () => {
                const incomplete = `${delimiter}code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`${name} with leading text`, () => {
                const incomplete = `some text and ${delimiter}some code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`${name} with trailing space`, () => {
                const incomplete = `some text and ${delimiter}some code `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete.trimEnd() + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`single loose "${delimiter}"`, () => {
                const text = `some text and ${delimiter}by itself\nmore text here`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`incomplete ${name} after newline`, () => {
                const text = `some text\nmore text here and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete after complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text and ${delimiter}another`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in list`, () => {
                const text = `- list item one\n- list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in asterisk list`, () => {
                const text = `* list item one\n* list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in numbered list`, () => {
                const text = `1. list item one\n2. list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        }
        suite('list', () => {
            test('list with complete codeblock', () => {
                const list = `-
	\`\`\`js
	let x = 1;
	\`\`\`
- list item two
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test.skip('list with incomplete codeblock', () => {
                const incomplete = `- list item one

	\`\`\`js
	let x = 1;`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\n	```');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with subitems', () => {
                const list = `- hello
	- sub item
- text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('ordered list with subitems', () => {
                const list = `1. hello
	- sub item
2. text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with stuff', () => {
                const list = `- list item one \`codespan\` **bold** [link](http://microsoft.com) more text`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with incomplete link text', () => {
                const incomplete = `- list item one
- item two [link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link target', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link target', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with extra whitespace', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with extra whitespace', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link with other stuff', () => {
                const incomplete = `- list item one
- item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link with other stuff', () => {
                const incomplete = `1. list item one
1. item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete subitem', () => {
                const incomplete = `1. list item one
	- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete nested subitem', () => {
                const incomplete = `1. list item one
	- item 2
		- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('text with start of list is not a heading', () => {
                const incomplete = `hello\n- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ' &nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('even more text with start of list is not a heading', () => {
                const incomplete = `# hello\n\ntext\n-`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ' &nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('codespan', () => {
            simpleMarkdownTestSuite('codespan', '`');
            test(`backtick between letters`, () => {
                const text = 'a`b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeCodespanTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeCodespanTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd `abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('star', () => {
            simpleMarkdownTestSuite('star', '*');
            test(`star between letters`, () => {
                const text = 'sldkfjsd a*b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd *abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('double star', () => {
            simpleMarkdownTestSuite('double star', '**');
            test(`double star between letters`, () => {
                const text = 'a**b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '**');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            // TODO trim these patterns from end
            test.skip(`ending in doublestar`, () => {
                const incomplete = `some text and **`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete.trimEnd() + '**');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('underscore', () => {
            simpleMarkdownTestSuite('underscore', '_');
            test(`underscore between letters`, () => {
                const text = `this_not_italics`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('double underscore', () => {
            simpleMarkdownTestSuite('double underscore', '__');
            test(`double underscore between letters`, () => {
                const text = `this__not__bold`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('link', () => {
            test('incomplete link text', () => {
                const incomplete = 'abc [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target', () => {
                const incomplete = 'foo [text](http://microsoft';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target 2', () => {
                const incomplete = 'foo [text](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff', () => {
                const incomplete = '[before `text` after](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff and incomplete arg', () => {
                const incomplete = '[before `text` after](http://microsoft.com "more text ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg 2', () => {
                const incomplete = '[text](command:vscode.openRelativePath "arg';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with complete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here"';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete codespan', () => {
                const incomplete = `text [\`codespan`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete stuff', () => {
                const incomplete = `text [more text \`codespan\` text **bold`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '**](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('Looks like incomplete link target but isn\'t', () => {
                const complete = '**bold** `codespan` text](';
                const tokens = marked.marked.lexer(complete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(complete);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test.skip('incomplete link in list', () => {
                const incomplete = '- [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('square brace between letters', () => {
                const incomplete = 'a[b';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('square brace on previous line', () => {
                const incomplete = 'text[\nmore text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('square braces in text', () => {
                const incomplete = 'hello [what] is going on';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('complete link', () => {
                const incomplete = 'text [link](http://microsoft.com)';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci9tYXJrZG93blJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RyxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlFLE9BQU8sS0FBSyxNQUFNLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsU0FBUyxTQUFTLENBQUMsR0FBVztJQUM3QixPQUFPLElBQUksU0FBUyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBeUIsQ0FBQztBQUN6RixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxVQUF1QixFQUFFLFlBQW9CO0lBQ3RFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQ3BDLGFBQWEsWUFBWSxDQUFDLFNBQVMsYUFBYSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FB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