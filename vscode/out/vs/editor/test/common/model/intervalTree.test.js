/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IntervalNode, IntervalTree, SENTINEL, getNodeColor, intervalCompare, nodeAcceptEdit, setNodeStickiness } from '../../../common/model/intervalTree.js';
const GENERATE_TESTS = false;
const TEST_COUNT = GENERATE_TESTS ? 10000 : 0;
const PRINT_TREE = false;
const MIN_INTERVAL_START = 1;
const MAX_INTERVAL_END = 100;
const MIN_INSERTS = 1;
const MAX_INSERTS = 30;
const MIN_CHANGE_CNT = 10;
const MAX_CHANGE_CNT = 20;
suite('IntervalTree 1', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Interval {
        constructor(start, end) {
            this._intervalBrand = undefined;
            this.start = start;
            this.end = end;
        }
    }
    class Oracle {
        constructor() {
            this.intervals = [];
        }
        insert(interval) {
            this.intervals.push(interval);
            this.intervals.sort((a, b) => {
                if (a.start === b.start) {
                    return a.end - b.end;
                }
                return a.start - b.start;
            });
            return interval;
        }
        delete(interval) {
            for (let i = 0, len = this.intervals.length; i < len; i++) {
                if (this.intervals[i] === interval) {
                    this.intervals.splice(i, 1);
                    return;
                }
            }
        }
        search(interval) {
            const result = [];
            for (let i = 0, len = this.intervals.length; i < len; i++) {
                const int = this.intervals[i];
                if (int.start <= interval.end && int.end >= interval.start) {
                    result.push(int);
                }
            }
            return result;
        }
    }
    class TestState {
        constructor() {
            this._oracle = new Oracle();
            this._tree = new IntervalTree();
            this._lastNodeId = -1;
            this._treeNodes = [];
            this._oracleNodes = [];
        }
        acceptOp(op) {
            if (op.type === 'insert') {
                if (PRINT_TREE) {
                    console.log(`insert: {${JSON.stringify(new Interval(op.begin, op.end))}}`);
                }
                const nodeId = (++this._lastNodeId);
                this._treeNodes[nodeId] = new IntervalNode(null, op.begin, op.end);
                this._tree.insert(this._treeNodes[nodeId]);
                this._oracleNodes[nodeId] = this._oracle.insert(new Interval(op.begin, op.end));
            }
            else if (op.type === 'delete') {
                if (PRINT_TREE) {
                    console.log(`delete: {${JSON.stringify(this._oracleNodes[op.id])}}`);
                }
                this._tree.delete(this._treeNodes[op.id]);
                this._oracle.delete(this._oracleNodes[op.id]);
                this._treeNodes[op.id] = null;
                this._oracleNodes[op.id] = null;
            }
            else if (op.type === 'change') {
                this._tree.delete(this._treeNodes[op.id]);
                this._treeNodes[op.id].reset(0, op.begin, op.end, null);
                this._tree.insert(this._treeNodes[op.id]);
                this._oracle.delete(this._oracleNodes[op.id]);
                this._oracleNodes[op.id].start = op.begin;
                this._oracleNodes[op.id].end = op.end;
                this._oracle.insert(this._oracleNodes[op.id]);
            }
            else {
                const actualNodes = this._tree.intervalSearch(op.begin, op.end, 0, false, false, 0, false);
                const actual = actualNodes.map(n => new Interval(n.cachedAbsoluteStart, n.cachedAbsoluteEnd));
                const expected = this._oracle.search(new Interval(op.begin, op.end));
                assert.deepStrictEqual(actual, expected);
                return;
            }
            if (PRINT_TREE) {
                printTree(this._tree);
            }
            assertTreeInvariants(this._tree);
            const actual = this._tree.getAllInOrder().map(n => new Interval(n.cachedAbsoluteStart, n.cachedAbsoluteEnd));
            const expected = this._oracle.intervals;
            assert.deepStrictEqual(actual, expected);
        }
        getExistingNodeId(index) {
            let currIndex = -1;
            for (let i = 0; i < this._treeNodes.length; i++) {
                if (this._treeNodes[i] === null) {
                    continue;
                }
                currIndex++;
                if (currIndex === index) {
                    return i;
                }
            }
            throw new Error('unexpected');
        }
    }
    function testIntervalTree(ops) {
        const state = new TestState();
        for (let i = 0; i < ops.length; i++) {
            state.acceptOp(ops[i]);
        }
    }
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function getRandomRange(min, max) {
        const begin = getRandomInt(min, max);
        let length;
        if (getRandomInt(1, 10) <= 2) {
            // large range
            length = getRandomInt(0, max - begin);
        }
        else {
            // small range
            length = getRandomInt(0, Math.min(max - begin, 10));
        }
        return [begin, begin + length];
    }
    class AutoTest {
        constructor() {
            this._ops = [];
            this._state = new TestState();
            this._insertCnt = getRandomInt(MIN_INSERTS, MAX_INSERTS);
            this._changeCnt = getRandomInt(MIN_CHANGE_CNT, MAX_CHANGE_CNT);
            this._deleteCnt = 0;
        }
        _doRandomInsert() {
            const range = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
            this._run({
                type: 'insert',
                begin: range[0],
                end: range[1]
            });
        }
        _doRandomDelete() {
            const idx = getRandomInt(Math.floor(this._deleteCnt / 2), this._deleteCnt - 1);
            this._run({
                type: 'delete',
                id: this._state.getExistingNodeId(idx)
            });
        }
        _doRandomChange() {
            const idx = getRandomInt(0, this._deleteCnt - 1);
            const range = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
            this._run({
                type: 'change',
                id: this._state.getExistingNodeId(idx),
                begin: range[0],
                end: range[1]
            });
        }
        run() {
            while (this._insertCnt > 0 || this._deleteCnt > 0 || this._changeCnt > 0) {
                if (this._insertCnt > 0) {
                    this._doRandomInsert();
                    this._insertCnt--;
                    this._deleteCnt++;
                }
                else if (this._changeCnt > 0) {
                    this._doRandomChange();
                    this._changeCnt--;
                }
                else {
                    this._doRandomDelete();
                    this._deleteCnt--;
                }
                // Let's also search for something...
                const searchRange = getRandomRange(MIN_INTERVAL_START, MAX_INTERVAL_END);
                this._run({
                    type: 'search',
                    begin: searchRange[0],
                    end: searchRange[1]
                });
            }
        }
        _run(op) {
            this._ops.push(op);
            this._state.acceptOp(op);
        }
        print() {
            console.log(`testIntervalTree(${JSON.stringify(this._ops)})`);
        }
    }
    suite('generated', () => {
        test('gen01', () => {
            testIntervalTree([
                { type: 'insert', begin: 28, end: 35 },
                { type: 'insert', begin: 52, end: 54 },
                { type: 'insert', begin: 63, end: 69 }
            ]);
        });
        test('gen02', () => {
            testIntervalTree([
                { type: 'insert', begin: 80, end: 89 },
                { type: 'insert', begin: 92, end: 100 },
                { type: 'insert', begin: 99, end: 99 }
            ]);
        });
        test('gen03', () => {
            testIntervalTree([
                { type: 'insert', begin: 89, end: 96 },
                { type: 'insert', begin: 71, end: 74 },
                { type: 'delete', id: 1 }
            ]);
        });
        test('gen04', () => {
            testIntervalTree([
                { type: 'insert', begin: 44, end: 46 },
                { type: 'insert', begin: 85, end: 88 },
                { type: 'delete', id: 0 }
            ]);
        });
        test('gen05', () => {
            testIntervalTree([
                { type: 'insert', begin: 82, end: 90 },
                { type: 'insert', begin: 69, end: 73 },
                { type: 'delete', id: 0 },
                { type: 'delete', id: 1 }
            ]);
        });
        test('gen06', () => {
            testIntervalTree([
                { type: 'insert', begin: 41, end: 63 },
                { type: 'insert', begin: 98, end: 98 },
                { type: 'insert', begin: 47, end: 51 },
                { type: 'delete', id: 2 }
            ]);
        });
        test('gen07', () => {
            testIntervalTree([
                { type: 'insert', begin: 24, end: 26 },
                { type: 'insert', begin: 11, end: 28 },
                { type: 'insert', begin: 27, end: 30 },
                { type: 'insert', begin: 80, end: 85 },
                { type: 'delete', id: 1 }
            ]);
        });
        test('gen08', () => {
            testIntervalTree([
                { type: 'insert', begin: 100, end: 100 },
                { type: 'insert', begin: 100, end: 100 }
            ]);
        });
        test('gen09', () => {
            testIntervalTree([
                { type: 'insert', begin: 58, end: 65 },
                { type: 'insert', begin: 82, end: 96 },
                { type: 'insert', begin: 58, end: 65 }
            ]);
        });
        test('gen10', () => {
            testIntervalTree([
                { type: 'insert', begin: 32, end: 40 },
                { type: 'insert', begin: 25, end: 29 },
                { type: 'insert', begin: 24, end: 32 }
            ]);
        });
        test('gen11', () => {
            testIntervalTree([
                { type: 'insert', begin: 25, end: 70 },
                { type: 'insert', begin: 99, end: 100 },
                { type: 'insert', begin: 46, end: 51 },
                { type: 'insert', begin: 57, end: 57 },
                { type: 'delete', id: 2 }
            ]);
        });
        test('gen12', () => {
            testIntervalTree([
                { type: 'insert', begin: 20, end: 26 },
                { type: 'insert', begin: 10, end: 18 },
                { type: 'insert', begin: 99, end: 99 },
                { type: 'insert', begin: 37, end: 59 },
                { type: 'delete', id: 2 }
            ]);
        });
        test('gen13', () => {
            testIntervalTree([
                { type: 'insert', begin: 3, end: 91 },
                { type: 'insert', begin: 57, end: 57 },
                { type: 'insert', begin: 35, end: 44 },
                { type: 'insert', begin: 72, end: 81 },
                { type: 'delete', id: 2 }
            ]);
        });
        test('gen14', () => {
            testIntervalTree([
                { type: 'insert', begin: 58, end: 61 },
                { type: 'insert', begin: 34, end: 35 },
                { type: 'insert', begin: 56, end: 62 },
                { type: 'insert', begin: 69, end: 78 },
                { type: 'delete', id: 0 }
            ]);
        });
        test('gen15', () => {
            testIntervalTree([
                { type: 'insert', begin: 63, end: 69 },
                { type: 'insert', begin: 17, end: 24 },
                { type: 'insert', begin: 3, end: 13 },
                { type: 'insert', begin: 84, end: 94 },
                { type: 'insert', begin: 18, end: 23 },
                { type: 'insert', begin: 96, end: 98 },
                { type: 'delete', id: 1 }
            ]);
        });
        test('gen16', () => {
            testIntervalTree([
                { type: 'insert', begin: 27, end: 27 },
                { type: 'insert', begin: 42, end: 87 },
                { type: 'insert', begin: 42, end: 49 },
                { type: 'insert', begin: 69, end: 71 },
                { type: 'insert', begin: 20, end: 27 },
                { type: 'insert', begin: 8, end: 9 },
                { type: 'insert', begin: 42, end: 49 },
                { type: 'delete', id: 1 }
            ]);
        });
        test('gen17', () => {
            testIntervalTree([
                { type: 'insert', begin: 21, end: 23 },
                { type: 'insert', begin: 83, end: 87 },
                { type: 'insert', begin: 56, end: 58 },
                { type: 'insert', begin: 1, end: 55 },
                { type: 'insert', begin: 56, end: 59 },
                { type: 'insert', begin: 58, end: 60 },
                { type: 'insert', begin: 56, end: 65 },
                { type: 'delete', id: 1 },
                { type: 'delete', id: 0 },
                { type: 'delete', id: 6 }
            ]);
        });
        test('gen18', () => {
            testIntervalTree([
                { type: 'insert', begin: 25, end: 25 },
                { type: 'insert', begin: 67, end: 79 },
                { type: 'delete', id: 0 },
                { type: 'search', begin: 65, end: 75 }
            ]);
        });
        test('force delta overflow', () => {
            // Search the IntervalNode ctor for FORCE_OVERFLOWING_TEST
            // to force that this test leads to a delta normalization
            testIntervalTree([
                { type: 'insert', begin: 686081138593427, end: 733009856502260 },
                { type: 'insert', begin: 591031326181669, end: 591031326181672 },
                { type: 'insert', begin: 940037682731896, end: 940037682731903 },
                { type: 'insert', begin: 598413641151120, end: 598413641151128 },
                { type: 'insert', begin: 800564156553344, end: 800564156553351 },
                { type: 'insert', begin: 894198957565481, end: 894198957565491 }
            ]);
        });
    });
    // TEST_COUNT = 0;
    // PRINT_TREE = true;
    for (let i = 0; i < TEST_COUNT; i++) {
        if (i % 100 === 0) {
            console.log(`TEST ${i + 1}/${TEST_COUNT}`);
        }
        const test = new AutoTest();
        try {
            test.run();
        }
        catch (err) {
            console.log(err);
            test.print();
            return;
        }
    }
    suite('searching', () => {
        function createCormenTree() {
            const r = new IntervalTree();
            const data = [
                [16, 21],
                [8, 9],
                [25, 30],
                [5, 8],
                [15, 23],
                [17, 19],
                [26, 26],
                [0, 3],
                [6, 10],
                [19, 20]
            ];
            data.forEach((int) => {
                const node = new IntervalNode(null, int[0], int[1]);
                r.insert(node);
            });
            return r;
        }
        const T = createCormenTree();
        function assertIntervalSearch(start, end, expected) {
            const actualNodes = T.intervalSearch(start, end, 0, false, false, 0, false);
            const actual = actualNodes.map((n) => [n.cachedAbsoluteStart, n.cachedAbsoluteEnd]);
            assert.deepStrictEqual(actual, expected);
        }
        test('cormen 1->2', () => {
            assertIntervalSearch(1, 2, [
                [0, 3],
            ]);
        });
        test('cormen 4->8', () => {
            assertIntervalSearch(4, 8, [
                [5, 8],
                [6, 10],
                [8, 9],
            ]);
        });
        test('cormen 10->15', () => {
            assertIntervalSearch(10, 15, [
                [6, 10],
                [15, 23],
            ]);
        });
        test('cormen 21->25', () => {
            assertIntervalSearch(21, 25, [
                [15, 23],
                [16, 21],
                [25, 30],
            ]);
        });
        test('cormen 24->24', () => {
            assertIntervalSearch(24, 24, []);
        });
    });
});
suite('IntervalTree 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertNodeAcceptEdit(msg, nodeStart, nodeEnd, nodeStickiness, start, end, textLength, forceMoveMarkers, expectedNodeStart, expectedNodeEnd) {
        const node = new IntervalNode('', nodeStart, nodeEnd);
        setNodeStickiness(node, nodeStickiness);
        nodeAcceptEdit(node, start, end, textLength, forceMoveMarkers);
        assert.deepStrictEqual([node.start, node.end], [expectedNodeStart, expectedNodeEnd], msg);
    }
    test('nodeAcceptEdit', () => {
        // A. collapsed decoration
        {
            // no-op
            assertNodeAcceptEdit('A.000', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.001', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.002', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.003', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, false, 0, 0);
            assertNodeAcceptEdit('A.004', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.005', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.006', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, true, 0, 0);
            assertNodeAcceptEdit('A.007', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, true, 0, 0);
            // insertion
            assertNodeAcceptEdit('A.008', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, false, 0, 1);
            assertNodeAcceptEdit('A.009', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, false, 1, 1);
            assertNodeAcceptEdit('A.010', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, false, 0, 0);
            assertNodeAcceptEdit('A.011', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, false, 1, 1);
            assertNodeAcceptEdit('A.012', 0, 0, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.013', 0, 0, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.014', 0, 0, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, true, 1, 1);
            assertNodeAcceptEdit('A.015', 0, 0, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, true, 1, 1);
        }
        // B. non collapsed decoration
        {
            // no-op
            assertNodeAcceptEdit('B.000', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.001', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.002', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.003', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, false, 0, 5);
            assertNodeAcceptEdit('B.004', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.005', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.006', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 0, true, 0, 5);
            assertNodeAcceptEdit('B.007', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 0, true, 0, 5);
            // insertion at start
            assertNodeAcceptEdit('B.008', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, false, 0, 6);
            assertNodeAcceptEdit('B.009', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, false, 1, 6);
            assertNodeAcceptEdit('B.010', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, false, 0, 6);
            assertNodeAcceptEdit('B.011', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, false, 1, 6);
            assertNodeAcceptEdit('B.012', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.013', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.014', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 0, 0, 1, true, 1, 6);
            assertNodeAcceptEdit('B.015', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 0, 0, 1, true, 1, 6);
            // insertion in middle
            assertNodeAcceptEdit('B.016', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.017', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.018', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.019', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 2, 2, 1, false, 0, 6);
            assertNodeAcceptEdit('B.020', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.021', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.022', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 2, 2, 1, true, 0, 6);
            assertNodeAcceptEdit('B.023', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 2, 2, 1, true, 0, 6);
            // insertion at end
            assertNodeAcceptEdit('B.024', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 5, 1, false, 0, 6);
            assertNodeAcceptEdit('B.025', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 5, 1, false, 0, 5);
            assertNodeAcceptEdit('B.026', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 5, 1, false, 0, 5);
            assertNodeAcceptEdit('B.027', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 5, 1, false, 0, 6);
            assertNodeAcceptEdit('B.028', 0, 5, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.029', 0, 5, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.030', 0, 5, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 5, 1, true, 0, 6);
            assertNodeAcceptEdit('B.031', 0, 5, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 5, 1, true, 0, 6);
            // replace with larger text until start
            assertNodeAcceptEdit('B.032', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 2, false, 5, 11);
            assertNodeAcceptEdit('B.033', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 2, false, 6, 11);
            assertNodeAcceptEdit('B.034', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 2, false, 5, 11);
            assertNodeAcceptEdit('B.035', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 2, false, 6, 11);
            assertNodeAcceptEdit('B.036', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.037', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.038', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 2, true, 6, 11);
            assertNodeAcceptEdit('B.039', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 2, true, 6, 11);
            // replace with smaller text until start
            assertNodeAcceptEdit('B.040', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.041', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.042', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.043', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 3, 5, 1, false, 4, 9);
            assertNodeAcceptEdit('B.044', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.045', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.046', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 3, 5, 1, true, 4, 9);
            assertNodeAcceptEdit('B.047', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 3, 5, 1, true, 4, 9);
            // replace with larger text select start
            assertNodeAcceptEdit('B.048', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.049', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.050', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.051', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 3, false, 5, 11);
            assertNodeAcceptEdit('B.052', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.053', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.054', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 3, true, 7, 11);
            assertNodeAcceptEdit('B.055', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 3, true, 7, 11);
            // replace with smaller text select start
            assertNodeAcceptEdit('B.056', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.057', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.058', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.059', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 1, false, 5, 9);
            assertNodeAcceptEdit('B.060', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.061', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.062', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 1, true, 5, 9);
            assertNodeAcceptEdit('B.063', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 1, true, 5, 9);
            // replace with larger text from start
            assertNodeAcceptEdit('B.064', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.065', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.066', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.067', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 2, false, 5, 11);
            assertNodeAcceptEdit('B.068', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.069', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.070', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 2, true, 7, 11);
            assertNodeAcceptEdit('B.071', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 2, true, 7, 11);
            // replace with smaller text from start
            assertNodeAcceptEdit('B.072', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.073', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.074', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.075', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 7, 1, false, 5, 9);
            assertNodeAcceptEdit('B.076', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.077', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.078', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 7, 1, true, 6, 9);
            assertNodeAcceptEdit('B.079', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 7, 1, true, 6, 9);
            // replace with larger text to end
            assertNodeAcceptEdit('B.080', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 2, false, 5, 11);
            assertNodeAcceptEdit('B.081', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 2, false, 5, 10);
            assertNodeAcceptEdit('B.082', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 2, false, 5, 10);
            assertNodeAcceptEdit('B.083', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 2, false, 5, 11);
            assertNodeAcceptEdit('B.084', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.085', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.086', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 2, true, 5, 11);
            assertNodeAcceptEdit('B.087', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 2, true, 5, 11);
            // replace with smaller text to end
            assertNodeAcceptEdit('B.088', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.089', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.090', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.091', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 8, 10, 1, false, 5, 9);
            assertNodeAcceptEdit('B.092', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.093', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.094', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 8, 10, 1, true, 5, 9);
            assertNodeAcceptEdit('B.095', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 8, 10, 1, true, 5, 9);
            // replace with larger text select end
            assertNodeAcceptEdit('B.096', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.097', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.098', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.099', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.100', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.101', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.102', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 3, true, 5, 12);
            assertNodeAcceptEdit('B.103', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 3, true, 5, 12);
            // replace with smaller text select end
            assertNodeAcceptEdit('B.104', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.105', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.106', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.107', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 1, false, 5, 10);
            assertNodeAcceptEdit('B.108', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.109', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.110', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 1, true, 5, 10);
            assertNodeAcceptEdit('B.111', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 1, true, 5, 10);
            // replace with larger text from end
            assertNodeAcceptEdit('B.112', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.113', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.114', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.115', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 3, false, 5, 10);
            assertNodeAcceptEdit('B.116', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.117', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.118', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 3, true, 5, 13);
            assertNodeAcceptEdit('B.119', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 3, true, 5, 13);
            // replace with smaller text from end
            assertNodeAcceptEdit('B.120', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.121', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.122', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.123', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 12, 1, false, 5, 10);
            assertNodeAcceptEdit('B.124', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.125', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.126', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 12, 1, true, 5, 11);
            assertNodeAcceptEdit('B.127', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 12, 1, true, 5, 11);
            // delete until start
            assertNodeAcceptEdit('B.128', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.129', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.130', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.131', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 0, false, 4, 9);
            assertNodeAcceptEdit('B.132', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.133', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.134', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 5, 0, true, 4, 9);
            assertNodeAcceptEdit('B.135', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 5, 0, true, 4, 9);
            // delete select start
            assertNodeAcceptEdit('B.136', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.137', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.138', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.139', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 0, false, 4, 8);
            assertNodeAcceptEdit('B.140', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.141', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.142', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 4, 6, 0, true, 4, 8);
            assertNodeAcceptEdit('B.143', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 4, 6, 0, true, 4, 8);
            // delete from start
            assertNodeAcceptEdit('B.144', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.145', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.146', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.147', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 0, false, 5, 9);
            assertNodeAcceptEdit('B.148', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.149', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.150', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 6, 0, true, 5, 9);
            assertNodeAcceptEdit('B.151', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 6, 0, true, 5, 9);
            // delete to end
            assertNodeAcceptEdit('B.152', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.153', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.154', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.155', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 0, false, 5, 9);
            assertNodeAcceptEdit('B.156', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.157', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.158', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 10, 0, true, 5, 9);
            assertNodeAcceptEdit('B.159', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 10, 0, true, 5, 9);
            // delete select end
            assertNodeAcceptEdit('B.160', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.161', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.162', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.163', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 0, false, 5, 9);
            assertNodeAcceptEdit('B.164', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.165', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.166', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 9, 11, 0, true, 5, 9);
            assertNodeAcceptEdit('B.167', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 9, 11, 0, true, 5, 9);
            // delete from end
            assertNodeAcceptEdit('B.168', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.169', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.170', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.171', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 0, false, 5, 10);
            assertNodeAcceptEdit('B.172', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.173', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.174', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 10, 11, 0, true, 5, 10);
            assertNodeAcceptEdit('B.175', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 10, 11, 0, true, 5, 10);
            // replace with larger text entire
            assertNodeAcceptEdit('B.176', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.177', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.178', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.179', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 3, false, 5, 8);
            assertNodeAcceptEdit('B.180', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.181', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.182', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 3, true, 8, 8);
            assertNodeAcceptEdit('B.183', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 3, true, 8, 8);
            // replace with smaller text entire
            assertNodeAcceptEdit('B.184', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 7, false, 5, 12);
            assertNodeAcceptEdit('B.185', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 7, false, 5, 10);
            assertNodeAcceptEdit('B.186', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 7, false, 5, 10);
            assertNodeAcceptEdit('B.187', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 7, false, 5, 12);
            assertNodeAcceptEdit('B.188', 5, 10, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.189', 5, 10, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.190', 5, 10, 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */, 5, 10, 7, true, 12, 12);
            assertNodeAcceptEdit('B.191', 5, 10, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */, 5, 10, 7, true, 12, 12);
        }
    });
});
function printTree(T) {
    if (T.root === SENTINEL) {
        console.log(`~~ empty`);
        return;
    }
    const out = [];
    _printTree(T, T.root, '', 0, out);
    console.log(out.join(''));
}
function _printTree(T, n, indent, delta, out) {
    out.push(`${indent}[${getNodeColor(n) === 1 /* NodeColor.Red */ ? 'R' : 'B'},${n.delta}, ${n.start}->${n.end}, ${n.maxEnd}] : {${delta + n.start}->${delta + n.end}}, maxEnd: ${n.maxEnd + delta}\n`);
    if (n.left !== SENTINEL) {
        _printTree(T, n.left, indent + '    ', delta, out);
    }
    else {
        out.push(`${indent}    NIL\n`);
    }
    if (n.right !== SENTINEL) {
        _printTree(T, n.right, indent + '    ', delta + n.delta, out);
    }
    else {
        out.push(`${indent}    NIL\n`);
    }
}
//#region Assertion
function assertTreeInvariants(T) {
    assert(getNodeColor(SENTINEL) === 0 /* NodeColor.Black */);
    assert(SENTINEL.parent === SENTINEL);
    assert(SENTINEL.left === SENTINEL);
    assert(SENTINEL.right === SENTINEL);
    assert(SENTINEL.start === 0);
    assert(SENTINEL.end === 0);
    assert(SENTINEL.delta === 0);
    assert(T.root.parent === SENTINEL);
    assertValidTree(T);
}
function depth(n) {
    if (n === SENTINEL) {
        // The leafs are black
        return 1;
    }
    assert(depth(n.left) === depth(n.right));
    return (getNodeColor(n) === 0 /* NodeColor.Black */ ? 1 : 0) + depth(n.left);
}
function assertValidNode(n, delta) {
    if (n === SENTINEL) {
        return;
    }
    const l = n.left;
    const r = n.right;
    if (getNodeColor(n) === 1 /* NodeColor.Red */) {
        assert(getNodeColor(l) === 0 /* NodeColor.Black */);
        assert(getNodeColor(r) === 0 /* NodeColor.Black */);
    }
    let expectedMaxEnd = n.end;
    if (l !== SENTINEL) {
        assert(intervalCompare(l.start + delta, l.end + delta, n.start + delta, n.end + delta) <= 0);
        expectedMaxEnd = Math.max(expectedMaxEnd, l.maxEnd);
    }
    if (r !== SENTINEL) {
        assert(intervalCompare(n.start + delta, n.end + delta, r.start + delta + n.delta, r.end + delta + n.delta) <= 0);
        expectedMaxEnd = Math.max(expectedMaxEnd, r.maxEnd + n.delta);
    }
    assert(n.maxEnd === expectedMaxEnd);
    assertValidNode(l, delta);
    assertValidNode(r, delta + n.delta);
}
function assertValidTree(T) {
    if (T.root === SENTINEL) {
        return;
    }
    assert(getNodeColor(T.root) === 0 /* NodeColor.Black */);
    assert(depth(T.root.left) === depth(T.root.right));
    assertValidNode(T.root, 0);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWxUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9pbnRlcnZhbFRyZWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQWEsUUFBUSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUssTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDO0FBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ3pCLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDO0FBQzdCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQztBQUN0QixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFDdkIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO0FBQzFCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztBQUUxQixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxRQUFRO1FBTWIsWUFBWSxLQUFhLEVBQUUsR0FBVztZQUx0QyxtQkFBYyxHQUFTLFNBQVMsQ0FBQztZQU1oQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNuQixJQUFJ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RyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTthQUN4QyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2xCLGdCQUFnQixDQUFDO2dCQUNoQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUN0QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2FBQ3RDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbEIsZ0JBQWdCLENBQUM7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7YUFDdEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDdkMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQztnQkFDaEIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtnQkFDcEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDdEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNsQixnQkFB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