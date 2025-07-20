/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../base/common/async.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import * as DOM from '../../../../base/browser/dom.js';
export class NotebookCellLayoutManager extends Disposable {
    constructor(notebookWidget, _list, loggingService) {
        super();
        this.notebookWidget = notebookWidget;
        this._list = _list;
        this.loggingService = loggingService;
        this._pendingLayouts = new WeakMap();
        this._layoutDisposables = new Set();
        this._layoutStack = [];
        this._isDisposed = false;
    }
    checkStackDepth() {
        if (this._layoutStack.length > 30) {
            const layoutTrace = this._layoutStack.join(' -> ');
            throw new Error('NotebookCellLayoutManager: layout stack is too deep: ' + layoutTrace);
        }
    }
    async layoutNotebookCell(cell, height) {
        const layoutTag = `cell:${cell.handle}, height:${height}`;
        this.loggingService.debug('cell layout', layoutTag);
        const viewIndex = this._list.getViewIndex(cell);
        if (viewIndex === undefined) {
            // the cell is hidden
            return;
        }
        if (this._pendingLayouts?.has(cell)) {
            this._pendingLayouts?.get(cell).dispose();
        }
        const deferred = new DeferredPromise();
        const doLayout = () => {
            const pendingLayout = this._pendingLayouts?.get(cell);
            this._pendingLayouts?.delete(cell);
            this._layoutStack.push(layoutTag);
            try {
                if (this._isDisposed) {
                    return;
                }
                if (!this.notebookWidget.viewModel?.hasCell(cell)) {
                    // Cell removed in the meantime?
                    return;
                }
                if (this._list.getViewIndex(cell) === undefined) {
                    // Cell can be hidden
                    return;
                }
                if (this._list.elementHeight(cell) === height) {
                    return;
                }
                this.checkStackDepth();
                if (!this.notebookWidget.hasEditorFocus()) {
                    // Do not scroll inactive notebook
                    // https://github.com/microsoft/vscode/issues/145340
                    const cellIndex = this.notebookWidget.viewModel?.getCellIndex(cell);
                    const visibleRanges = this.notebookWidget.visibleRanges;
                    if (cellIndex !== undefined
                        && visibleRanges && visibleRanges.length && visibleRanges[0].start === cellIndex
                        // cell is partially visible
                        && this._list.scrollTop > this.notebookWidget.getAbsoluteTopOfElement(cell)) {
                        return this._list.updateElementHeight2(cell, height, Math.min(cellIndex + 1, this.notebookWidget.getLength() - 1));
                    }
                }
                this._list.updateElementHeight2(cell, height);
            }
            finally {
                this._layoutStack.pop();
                deferred.complete(undefined);
                if (pendingLayout) {
                    pendingLayout.dispose();
                    this._layoutDisposables.delete(pendingLayout);
                }
            }
        };
        if (this._list.inRenderingTransaction) {
            const layoutDisposable = DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.notebookWidget.getDomNode()), doLayout);
            const disposable = toDisposable(() => {
                layoutDisposable.dispose();
                deferred.complete(undefined);
            });
            this._pendingLayouts?.set(cell, disposable);
            this._layoutDisposables.add(disposable);
        }
        else {
            doLayout();
        }
        return deferred.p;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
        this._layoutDisposables.forEach(d => d.dispose());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGF5b3V0TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0NlbGxMYXlvdXRNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSTdGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFHdkQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFLeEQsWUFDUyxjQUFvQyxFQUNwQyxLQUF3QixFQUN4QixjQUF1QztRQUUvQyxLQUFLLEVBQUUsQ0FBQztRQUpBLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtRQUNwQyxVQUFLLEdBQUwsS0FBSyxDQUFtQjtRQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFQeEMsb0JBQWUsR0FBZ0QsSUFBSSxPQUFPLEVBQStCLENBQUM7UUFDMUcsdUJBQWtCLEdBQXFCLElBQUksR0FBRyxFQUFlLENBQUM7UUFDckQsaUJBQVksR0FBYSxFQUFFLENBQUM7UUFDckMsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUFPNUIsQ0FBQztJQUVPLGVBQWU7UUFDdEIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7SUFD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