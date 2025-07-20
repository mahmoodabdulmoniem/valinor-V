/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { formatPII, getExactExpressionStartAndEnd, getVisibleAndSorted } from '../../common/debugUtils.js';
suite('Debug - Utils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('formatPII', () => {
        assert.strictEqual(formatPII('Foo Bar', false, {}), 'Foo Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, {}), 'Foo {key} Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, { 'key': 'yes' }), 'Foo yes Bar');
        assert.strictEqual(formatPII('Foo {_0} Bar {_0}', true, { '_0': 'yes' }), 'Foo yes Bar yes');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes' }), 'Foo yes Bar {1}{2}');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes', '1': 'undefined' }), 'Foo yes Bar undefined{2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', true, { '_key0': 'yes', 'key1': '5', 'key2': 'false' }), 'Foo yes Bar {key1}{key2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', false, { '_key0': 'yes', 'key1': '5', 'key2': 'false' }), 'Foo yes Bar 5false');
        assert.strictEqual(formatPII('Unable to display threads:"{e}"', false, { 'e': 'detached from process' }), 'Unable to display threads:"detached from process"');
    });
    test('getExactExpressionStartAndEnd', () => {
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 2), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('!foo', 2, 3), { start: 2, end: 4 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 3), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 4), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 1, 10), { start: 1, end: 9 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 6, 10), { start: 1, end: 9 });
        // Hovers over "address" should pick up this->address
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this->address = "Main street"', 6, 10), { start: 1, end: 13 });
        // Hovers over "name" should pick up a.b.c.d.name
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 16, 20), { start: 9, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('MyClass::StaticProp', 10, 20), { start: 1, end: 19 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('largeNumber = myVar?.prop', 21, 25), { start: 15, end: 25 });
        // For example in expression 'a.b.c.d', hover was under 'b', 'a.b' should be the exact range
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 11, 12), { start: 9, end: 11 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b;c.d.name', 16, 20), { start: 13, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c-d.name', 16, 20), { start: 15, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var aøñéå文 = a.b.c-d.name', 5, 5), { start: 5, end: 10 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('aøñéå文.aøñéå文.aøñéå文', 9, 9), { start: 1, end: 13 });
        // Spread syntax should extract just the identifier
        assert.deepStrictEqual(getExactExpressionStartAndEnd('[...bar]', 5, 7), { start: 5, end: 7 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('...variable', 5, 5), { start: 4, end: 11 });
    });
    test('config presentation', () => {
        const configs = [];
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'p'
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'a'
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'b',
            presentation: {
                hidden: false
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'c',
            presentation: {
                hidden: true
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'd',
            presentation: {
                group: '2_group',
                order: 5
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'e',
            presentation: {
                group: '2_group',
                order: 52
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'f',
            presentation: {
                group: '1_group',
                order: 500
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'g',
            presentation: {
                group: '5_group',
                order: 500
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'h',
            presentation: {
                order: 700
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'i',
            presentation: {
                order: 1000
            }
        });
        const sorted = getVisibleAndSorted(configs);
        assert.strictEqual(sorted.length, 9);
        assert.strictEqual(sorted[0].name, 'f');
        assert.strictEqual(sorted[1].name, 'd');
        assert.strictEqual(sorted[2].name, 'e');
        assert.strictEqual(sorted[3].name, 'g');
        assert.strictEqual(sorted[4].name, 'h');
        assert.strictEqual(sorted[5].name, 'i');
        assert.strictEqual(sorted[6].name, 'b');
        assert.strictEqual(sorted[7].name, 'p');
        assert.strictEqual(sorted[8].name, 'a');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvZGVidWdVdGlscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFM0csS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVB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QUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFekMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9