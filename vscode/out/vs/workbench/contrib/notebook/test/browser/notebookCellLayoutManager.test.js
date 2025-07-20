/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotebookCellLayoutManager } from '../../browser/notebookCellLayoutManager.js';
suite('NotebookCellLayoutManager', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const mockCellViewModel = () => {
        return { handle: 'cell1' };
    };
    class MockList {
        constructor() {
            this._height = new Map();
            this.inRenderingTransaction = false;
            this.getViewIndexCalled = false;
            this.cells = [];
        }
        getViewIndex(cell) { return this.cells.indexOf(cell) < 0 ? undefined : this.cells.indexOf(cell); }
        elementHeight(cell) { return this._height.get(cell) ?? 100; }
        updateElementHeight2(cell, height) { this._height.set(cell, height); }
    }
    class MockLoggingService {
        debug() { }
    }
    class MockNotebookWidget {
        constructor() {
            this.viewModel = { hasCell: (cell) => true, getCellIndex: () => 0 };
            this.visibleRanges = [{ start: 0 }];
        }
        hasEditorFocus() { return true; }
        getAbsoluteTopOfElement() { return 0; }
        getLength() { return 1; }
        getDomNode() {
            return {
                style: {
                    height: '100px'
                }
            };
        }
    }
    test('should update cell height', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should schedule updates if already in a rendering transaction', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.inRenderingTransaction = true;
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        const promise = mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
        assert.strictEqual(list.elementHeight(cell2), 100);
        list.inRenderingTransaction = false;
        await promise;
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should not update if cell is hidden', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
    test('should not update if height is unchanged', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 100);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGF5b3V0TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tDZWxsTGF5b3V0TWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXZGLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFFdkMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtRQUM5QixPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBK0IsQ0FBQztJQUN6RCxDQUFDLENBQUM7SUFFRixNQUFNLFFBQVE7UUFBZDtZQUNTLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBRzVCLDJCQUFzQixHQUFHLEtBQUssQ0FBQztZQUUvQix1QkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDM0IsVUFBSyxHQUFxQixFQUFFLENBQUM7UUFDOUIsQ0FBQztRQU5BLFlBQVksQ0FBQyxJQUFvQixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsSCxhQUFhLENBQUMsSUFBb0IsSUFB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