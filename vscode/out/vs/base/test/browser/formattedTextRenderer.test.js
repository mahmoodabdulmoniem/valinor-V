/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { renderFormattedText, renderText } from '../../browser/formattedTextRenderer.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { $ } from '../../browser/dom.js';
suite('FormattedTextRenderer', () => {
    const store = new DisposableStore();
    setup(() => {
        store.clear();
    });
    teardown(() => {
        store.clear();
    });
    test('render simple element', () => {
        const result = renderText('testing');
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result.textContent, 'testing');
        assert.strictEqual(result.tagName, 'DIV');
    });
    test('render element with target', () => {
        const target = $('div.testClass');
        const result = renderText('testing', {}, target);
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result, target);
        assert.strictEqual(result.className, 'testClass');
    });
    test('simple formatting', () => {
        let result = renderFormattedText('**bold**');
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.firstChild.textContent, 'bold');
        assert.strictEqual(result.firstChild.tagName, 'B');
        assert.strictEqual(result.innerHTML, '<b>bold</b>');
        result = renderFormattedText('__italics__');
        assert.strictEqual(result.innerHTML, '<i>italics</i>');
        result = renderFormattedText('``code``');
        assert.strictEqual(result.innerHTML, '``code``');
        result = renderFormattedText('``code``', { renderCodeSegments: true });
        assert.strictEqual(result.innerHTML, '<code>code</code>');
        result = renderFormattedText('this string has **bold**, __italics__, and ``code``!!', { renderCodeSegments: true });
        assert.strictEqual(result.innerHTML, 'this string has <b>bold</b>, <i>italics</i>, and <code>code</code>!!');
    });
    test('no formatting', () => {
        const result = renderFormattedText('this is just a string');
        assert.strictEqual(result.innerHTML, 'this is just a string');
    });
    test('preserve newlines', () => {
        const result = renderFormattedText('line one\nline two');
        assert.strictEqual(result.innerHTML, 'line one<br>line two');
    });
    test('action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('[[action]]', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<a>action</a>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancy action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('__**[[action]]**__', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<i><b><a>action</a></b></i>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancier action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('``__**[[action]]**__``', {
            renderCodeSegments: true,
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<code><i><b><a>action</a></b></i></code>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('escaped formatting', () => {
        const result = renderFormattedText('\\*\\*bold\\*\\*');
        assert.strictEqual(result.children.length, 0);
        assert.strictEqual(result.innerHTML, '**bold**');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2Zvcm1hdHRlZFRleHRSZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUV6QyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFcEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLE1BQU0sR0FBZ0IsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWxELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xE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