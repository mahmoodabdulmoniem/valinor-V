/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as objects from '../../common/objects.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
const check = (one, other, msg) => {
    assert(objects.equals(one, other), msg);
    assert(objects.equals(other, one), '[reverse] ' + msg);
};
const checkNot = (one, other, msg) => {
    assert(!objects.equals(one, other), msg);
    assert(!objects.equals(other, one), '[reverse] ' + msg);
};
suite('Objects', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('equals', () => {
        check(null, null, 'null');
        check(undefined, undefined, 'undefined');
        check(1234, 1234, 'numbers');
        check('', '', 'empty strings');
        check('1234', '1234', 'strings');
        check([], [], 'empty arrays');
        // check(['', 123], ['', 123], 'arrays');
        check([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]], 'nested arrays');
        check({}, {}, 'empty objects');
        check({ a: 1, b: '123' }, { a: 1, b: '123' }, 'objects');
        check({ a: 1, b: '123' }, { b: '123', a: 1 }, 'objects (key order)');
        check({ a: { b: 1, c: 2 }, b: 3 }, { a: { b: 1, c: 2 }, b: 3 }, 'nested objects');
        checkNot(null, undefined, 'null != undefined');
        checkNot(null, '', 'null != empty string');
        checkNot(null, [], 'null != empty array');
        checkNot(null, {}, 'null != empty object');
        checkNot(null, 0, 'null != zero');
        checkNot(undefined, '', 'undefined != empty string');
        checkNot(undefined, [], 'undefined != empty array');
        checkNot(undefined, {}, 'undefined != empty object');
        checkNot(undefined, 0, 'undefined != zero');
        checkNot('', [], 'empty string != empty array');
        checkNot('', {}, 'empty string != empty object');
        checkNot('', 0, 'empty string != zero');
        checkNot([], {}, 'empty array != empty object');
        checkNot([], 0, 'empty array != zero');
        checkNot(0, [], 'zero != empty array');
        checkNot('1234', 1234, 'string !== number');
        checkNot([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6000]], 'arrays');
        checkNot({ a: { b: 1, c: 2 }, b: 3 }, { b: 3, a: { b: 9, c: 2 } }, 'objects');
    });
    test('mixin - array', function () {
        const foo = {};
        objects.mixin(foo, { bar: [1, 2, 3] });
        assert(foo.bar);
        assert(Array.isArray(foo.bar));
        assert.strictEqual(foo.bar.length, 3);
        assert.strictEqual(foo.bar[0], 1);
        assert.strictEqual(foo.bar[1], 2);
        assert.strictEqual(foo.bar[2], 3);
    });
    test('mixin - no overwrite', function () {
        const foo = {
            bar: '123'
        };
        const bar = {
            bar: '456'
        };
        objects.mixin(foo, bar, false);
        assert.strictEqual(foo.bar, '123');
    });
    test('cloneAndChange', () => {
        const o1 = { something: 'hello' };
        const o = {
            o1: o1,
            o2: o1
        };
        assert.deepStrictEqual(objects.cloneAndChange(o, () => { }), o);
    });
    test('safeStringify', () => {
        const obj1 = {
            friend: null
        };
        const obj2 = {
            friend: null
        };
        obj1.friend = obj2;
        obj2.friend = obj1;
        const arr = [1];
        arr.push(arr);
        const circular = {
            a: 42,
            b: null,
            c: [
                obj1, obj2
            ],
            d: null,
            e: BigInt(42)
        };
        arr.push(circular);
        circular.b = circular;
        circular.d = arr;
        const result = objects.safeStringify(circular);
        assert.deepStrictEqual(JSON.parse(result), {
            a: 42,
            b: '[Circular]',
            c: [
                {
                    friend: {
                        friend: '[Circular]'
                    }
                },
                '[Circular]'
            ],
            d: [1, '[Circular]', '[Circular]'],
            e: '[BigInt 42]'
        });
    });
    test('distinct', () => {
        const base = {
            one: 'one',
            two: 2,
            three: {
                3: true
            },
            four: false
        };
        let diff = objects.distinct(base, base);
        assert.strictEqual(Object.keys(diff).length, 0);
        let obj = {};
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 0);
        obj = {
            one: 'one',
            two: 2
        };
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 0);
        obj = {
            three: {
                3: true
            },
            four: false
        };
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 0);
        obj = {
            one: 'two',
            two: 2,
            three: {
                3: true
            },
            four: true
        };
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 2);
        assert.strictEqual(diff.one, 'two');
        assert.strictEqual(diff.four, true);
        obj = {
            one: null,
            two: 2,
            three: {
                3: true
            },
            four: undefined
        };
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 2);
        assert.strictEqual(diff.one, null);
        assert.strictEqual(diff.four, undefined);
        obj = {
            one: 'two',
            two: 3,
            three: { 3: false },
            four: true
        };
        diff = objects.distinct(base, obj);
        assert.strictEqual(Object.keys(diff).length, 4);
        assert.strictEqual(diff.one, 'two');
        assert.strictEqual(diff.two, 3);
        assert.strictEqual(diff.three?.['3'], false);
        assert.strictEqual(diff.four, true);
    });
    test('getCaseInsensitive', () => {
        const obj1 = {
            lowercase: 123,
            mIxEdCaSe: 456
        };
        assert.strictEqual(obj1.lowercase, objects.getCaseInsensitive(obj1, 'lowercase'));
        assert.strictEqual(obj1.lowercase, objects.getCaseInsensitive(obj1, 'lOwErCaSe'));
        assert.strictEqual(obj1.mIxEdCaSe, objects.getCaseInsensitive(obj1, 'MIXEDCASE'));
        assert.strictEqual(obj1.mIxEdCaSe, objects.getCaseInsensitive(obj1, 'mixedcase'));
    });
});
test('mapValues', () => {
    const obj = {
        a: 1,
        b: 2,
        c: 3
    };
    const result = objects.mapValues(obj, (value, key) => `${key}: ${value * 2}`);
    assert.deepStrictEqual(result, {
        a: 'a: 2',
        b: 'b: 4',
        c: 'c: 6',
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL29iamVjdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLE9BQU8sTUFBTSx5QkFBeUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFRLEVBQUUsS0FBVSxFQUFFLEdBQVcsRUFBRSxFQUFFO0lBQ25ELE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBUSxFQUFFLEtBQVUsRUFBRSxHQUFXLEVBQUUsRUFBRTtJQUN0RCxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN6QyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxZQUFZLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDO0FBRUYsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFFckIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNu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UUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUV2QyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRTVDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0RSxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFO1FBRXJCLE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxD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