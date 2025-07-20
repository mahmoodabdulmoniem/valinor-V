/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIterable } from './types.js';
export var Iterable;
(function (Iterable) {
    function is(thing) {
        return !!thing && typeof thing === 'object' && typeof thing[Symbol.iterator] === 'function';
    }
    Iterable.is = is;
    const _empty = Object.freeze([]);
    function empty() {
        return _empty;
    }
    Iterable.empty = empty;
    function* single(element) {
        yield element;
    }
    Iterable.single = single;
    function wrap(iterableOrElement) {
        if (is(iterableOrElement)) {
            return iterableOrElement;
        }
        else {
            return single(iterableOrElement);
        }
    }
    Iterable.wrap = wrap;
    function from(iterable) {
        return iterable || _empty;
    }
    Iterable.from = from;
    function* reverse(array) {
        for (let i = array.length - 1; i >= 0; i--) {
            yield array[i];
        }
    }
    Iterable.reverse = reverse;
    function isEmpty(iterable) {
        return !iterable || iterable[Symbol.iterator]().next().done === true;
    }
    Iterable.isEmpty = isEmpty;
    function first(iterable) {
        return iterable[Symbol.iterator]().next().value;
    }
    Iterable.first = first;
    function some(iterable, predicate) {
        let i = 0;
        for (const element of iterable) {
            if (predicate(element, i++)) {
                return true;
            }
        }
        return false;
    }
    Iterable.some = some;
    function every(iterable, predicate) {
        let i = 0;
        for (const element of iterable) {
            if (!predicate(element, i++)) {
                return false;
            }
        }
        return true;
    }
    Iterable.every = every;
    function find(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                return element;
            }
        }
        return undefined;
    }
    Iterable.find = find;
    function* filter(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                yield element;
            }
        }
    }
    Iterable.filter = filter;
    function* map(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield fn(element, index++);
        }
    }
    Iterable.map = map;
    function* flatMap(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield* fn(element, index++);
        }
    }
    Iterable.flatMap = flatMap;
    function* concat(...iterables) {
        for (const item of iterables) {
            if (isIterable(item)) {
                yield* item;
            }
            else {
                yield item;
            }
        }
    }
    Iterable.concat = concat;
    function reduce(iterable, reducer, initialValue) {
        let value = initialValue;
        for (const element of iterable) {
            value = reducer(value, element);
        }
        return value;
    }
    Iterable.reduce = reduce;
    function length(iterable) {
        let count = 0;
        for (const _ of iterable) {
            count++;
        }
        return count;
    }
    Iterable.length = length;
    /**
     * Returns an iterable slice of the array, with the same semantics as `array.slice()`.
     */
    function* slice(arr, from, to = arr.length) {
        if (from < -arr.length) {
            from = 0;
        }
        if (from < 0) {
            from += arr.length;
        }
        if (to < 0) {
            to += arr.length;
        }
        else if (to > arr.length) {
            to = arr.length;
        }
        for (; from < to; from++) {
            yield arr[from];
        }
    }
    Iterable.slice = slice;
    /**
     * Consumes `atMost` elements from iterable and returns the consumed elements,
     * and an iterable for the rest of the elements.
     */
    function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
        const consumed = [];
        if (atMost === 0) {
            return [consumed, iterable];
        }
        const iterator = iterable[Symbol.iterator]();
        for (let i = 0; i < atMost; i++) {
            const next = iterator.next();
            if (next.done) {
                return [consumed, Iterable.empty()];
            }
            consumed.push(next.value);
        }
        return [consumed, { [Symbol.iterator]() { return iterator; } }];
    }
    Iterable.consume = consume;
    async function asyncToArray(iterable) {
        const result = [];
        for await (const item of iterable) {
            result.push(item);
        }
        return result;
    }
    Iterable.asyncToArray = asyncToArray;
    async function asyncToArrayFlat(iterable) {
        let result = [];
        for await (const item of iterable) {
            result = result.concat(item);
        }
        return result;
    }
    Iterable.asyncToArrayFlat = asyncToArrayFlat;
})(Iterable || (Iterable = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2l0ZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFeEMsTUFBTSxLQUFXLFFBQVEsQ0EwTHhCO0FBMUxELFdBQWlCLFFBQVE7SUFFeEIsU0FBZ0IsRUFBRSxDQUFVLEtBQWM7UUFDekMsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFRLEtBQXFCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFVBQVUsQ0FBQztJQUM5RyxDQUFDO0lBRmUsV0FBRSxLQUVqQixDQUFBO0lBRUQsTUFBTSxNQUFNLEdBQWtCLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEQsU0FBZ0IsS0FBSztRQUNwQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFGZSxjQUFLLFFBRXBCLENBQUE7SUFFRCxRQUFlLENBQUMsQ0FBQyxNQUFNLENBQUksT0FBVTtRQUNwQyxNQUFNLE9BQU8sQ0FBQztJQUNmLENBQUM7SUFGZ0IsZUFBTSxTQUV0QixDQUFBO0lBRUQsU0FBZ0IsSUFBSSxDQUFJLGlCQUFrQztRQUN6RCxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxpQkFBaUIsQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFOZSxhQUFJLE9BTW5CLENBQUE7SUFFRCxTQUFnQixJQUFJLENBQUksUUFBd0M7UUFDL0QsT0FBTyxRQUFRLElBQUksTUFB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