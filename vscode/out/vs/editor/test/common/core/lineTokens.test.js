/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { LanguageIdCodec } from '../../../common/services/languagesRegistry.js';
import { LineTokens } from '../../../common/tokens/lineTokens.js';
suite('LineTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createLineTokens(text, tokens) {
        const binTokens = new Uint32Array(tokens.length << 1);
        for (let i = 0, len = tokens.length; i < len; i++) {
            binTokens[(i << 1)] = (i + 1 < len ? tokens[i + 1].startIndex : text.length);
            binTokens[(i << 1) + 1] = (tokens[i].foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
        }
        return new LineTokens(binTokens, text, new LanguageIdCodec());
    }
    function createTestLineTokens() {
        return createLineTokens('Hello world, this is a lovely day', [
            { startIndex: 0, foreground: 1 }, // Hello_
            { startIndex: 6, foreground: 2 }, // world,_
            { startIndex: 13, foreground: 3 }, // this_
            { startIndex: 18, foreground: 4 }, // is_
            { startIndex: 21, foreground: 5 }, // a_
            { startIndex: 23, foreground: 6 }, // lovely_
            { startIndex: 30, foreground: 7 }, // day
        ]);
    }
    function renderLineTokens(tokens) {
        let result = '';
        const str = tokens.getLineContent();
        let lastOffset = 0;
        for (let i = 0; i < tokens.getCount(); i++) {
            result += str.substring(lastOffset, tokens.getEndOffset(i));
            result += `(${tokens.getMetadata(i)})`;
            lastOffset = tokens.getEndOffset(i);
        }
        return result;
    }
    test('withInserted 1', () => {
        const lineTokens = createTestLineTokens();
        assert.strictEqual(renderLineTokens(lineTokens), 'Hello (32768)world, (65536)this (98304)is (131072)a (163840)lovely (196608)day(229376)');
        const lineTokens2 = lineTokens.withInserted([
            { offset: 0, text: '1', tokenMetadata: 0, },
            { offset: 6, text: '2', tokenMetadata: 0, },
            { offset: 9, text: '3', tokenMetadata: 0, },
        ]);
        assert.strictEqual(renderLineTokens(lineTokens2), '1(0)Hello (32768)2(0)wor(65536)3(0)ld, (65536)this (98304)is (131072)a (163840)lovely (196608)day(229376)');
    });
    test('withInserted (tokens at the same position)', () => {
        const lineTokens = createTestLineTokens();
        assert.strictEqual(renderLineTokens(lineTokens), 'Hello (32768)world, (65536)this (98304)is (131072)a (163840)lovely (196608)day(229376)');
        const lineTokens2 = lineTokens.withInserted([
            { offset: 0, text: '1', tokenMetadata: 0, },
            { offset: 0, text: '2', tokenMetadata: 0, },
            { offset: 0, text: '3', tokenMetadata: 0, },
        ]);
        assert.strictEqual(renderLineTokens(lineTokens2), '1(0)2(0)3(0)Hello (32768)world, (65536)this (98304)is (131072)a (163840)lovely (196608)day(229376)');
    });
    test('withInserted (tokens at the end)', () => {
        const lineTokens = createTestLineTokens();
        assert.strictEqual(renderLineTokens(lineTokens), 'Hello (32768)world, (65536)this (98304)is (131072)a (163840)lovely (196608)day(229376)');
        const lineTokens2 = lineTokens.withInserted([
            { offset: 'Hello world, this is a lovely day'.length - 1, text: '1', tokenMetadata: 0, },
            { offset: 'Hello world, this is a lovely day'.length, text: '2', tokenMetadata: 0, },
        ]);
        assert.strictEqual(renderLineTokens(lineTokens2), 'Hello (32768)world, (65536)this (98304)is (131072)a (163840)lovely (196608)da(229376)1(0)y(229376)2(0)');
    });
    test('basics', () => {
        const lineTokens = createTestLineTokens();
        assert.strictEqual(lineTokens.getLineContent(), 'Hello world, this is a lovely day');
        assert.strictEqual(lineTokens.getLineContent().length, 33);
        assert.strictEqual(lineTokens.getCount(), 7);
        assert.strictEqual(lineTokens.getStartOffset(0), 0);
        assert.strictEqual(lineTokens.getEndOffset(0), 6);
        assert.strictEqual(lineTokens.getStartOffset(1), 6);
        assert.strictEqual(lineTokens.getEndOffset(1), 13);
        assert.strictEqual(lineTokens.getStartOffset(2), 13);
        assert.strictEqual(lineTokens.getEndOffset(2), 18);
        assert.strictEqual(lineTokens.getStartOffset(3), 18);
        assert.strictEqual(lineTokens.getEndOffset(3), 21);
        assert.strictEqual(lineTokens.getStartOffset(4), 21);
        assert.strictEqual(lineTokens.getEndOffset(4), 23);
        assert.strictEqual(lineTokens.getStartOffset(5), 23);
        assert.strictEqual(lineTokens.getEndOffset(5), 30);
        assert.strictEqual(lineTokens.getStartOffset(6), 30);
        assert.strictEqual(lineTokens.getEndOffset(6), 33);
    });
    test('findToken', () => {
        const lineTokens = createTestLineTokens();
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(0), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(1), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(2), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(3), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(4), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(5), 0);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(6), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(7), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(8), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(9), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(10), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(11), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(12), 1);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(13), 2);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(14), 2);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(15), 2);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(16), 2);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(17), 2);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(18), 3);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(19), 3);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(20), 3);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(21), 4);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(22), 4);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(23), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(24), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(25), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(26), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(27), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(28), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(29), 5);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(30), 6);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(31), 6);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(32), 6);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(33), 6);
        assert.strictEqual(lineTokens.findTokenIndexAtOffset(34), 6);
    });
    function assertViewLineTokens(_actual, expected) {
        const actual = [];
        for (let i = 0, len = _actual.getCount(); i < len; i++) {
            actual[i] = {
                endIndex: _actual.getEndOffset(i),
                foreground: _actual.getForeground(i)
            };
        }
        assert.deepStrictEqual(actual, expected);
    }
    test('inflate', () => {
        const lineTokens = createTestLineTokens();
        assertViewLineTokens(lineTokens.inflate(), [
            { endIndex: 6, foreground: 1 },
            { endIndex: 13, foreground: 2 },
            { endIndex: 18, foreground: 3 },
            { endIndex: 21, foreground: 4 },
            { endIndex: 23, foreground: 5 },
            { endIndex: 30, foreground: 6 },
            { endIndex: 33, foreground: 7 },
        ]);
    });
    test('sliceAndInflate', () => {
        const lineTokens = createTestLineTokens();
        assertViewLineTokens(lineTokens.sliceAndInflate(0, 33, 0), [
            { endIndex: 6, foreground: 1 },
            { endIndex: 13, foreground: 2 },
            { endIndex: 18, foreground: 3 },
            { endIndex: 21, foreground: 4 },
            { endIndex: 23, foreground: 5 },
            { endIndex: 30, foreground: 6 },
            { endIndex: 33, foreground: 7 },
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(0, 32, 0), [
            { endIndex: 6, foreground: 1 },
            { endIndex: 13, foreground: 2 },
            { endIndex: 18, foreground: 3 },
            { endIndex: 21, foreground: 4 },
            { endIndex: 23, foreground: 5 },
            { endIndex: 30, foreground: 6 },
            { endIndex: 32, foreground: 7 },
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(0, 30, 0), [
            { endIndex: 6, foreground: 1 },
            { endIndex: 13, foreground: 2 },
            { endIndex: 18, foreground: 3 },
            { endIndex: 21, foreground: 4 },
            { endIndex: 23, foreground: 5 },
            { endIndex: 30, foreground: 6 }
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(0, 30, 1), [
            { endIndex: 7, foreground: 1 },
            { endIndex: 14, foreground: 2 },
            { endIndex: 19, foreground: 3 },
            { endIndex: 22, foreground: 4 },
            { endIndex: 24, foreground: 5 },
            { endIndex: 31, foreground: 6 }
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(6, 18, 0), [
            { endIndex: 7, foreground: 2 },
            { endIndex: 12, foreground: 3 }
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(7, 18, 0), [
            { endIndex: 6, foreground: 2 },
            { endIndex: 11, foreground: 3 }
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(6, 17, 0), [
            { endIndex: 7, foreground: 2 },
            { endIndex: 11, foreground: 3 }
        ]);
        assertViewLineTokens(lineTokens.sliceAndInflate(6, 19, 0), [
            { endIndex: 7, foreground: 2 },
            { endIndex: 12, foreground: 3 },
            { endIndex: 13, foreground: 4 },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVRva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29yZS9saW5lVG9rZW5zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNoRixPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5GLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBRXhCLHVDQUF1QyxFQUFFLENBQUM7SUFPMUMsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsTUFBb0I7UUFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV0RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FDekIsTUFB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Q0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztR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QUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDL0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQzFELEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQzlCLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1NBQy9CLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMxRCxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUM5QixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUMvQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUMvQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUMvQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUMvQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtTQUMvQixDQUFDLENBQUM7UUFFSCxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDMUQsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDOUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDL0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDL0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDL0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDL0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQzFELEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQzlCLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1NBQy9CLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMxRCxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtZQUM5QixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtTQUMvQixDQUFDLENBQUM7UUFFSCxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDMUQsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7WUFDOUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQzFELEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQzlCLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO1NBQy9CLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==