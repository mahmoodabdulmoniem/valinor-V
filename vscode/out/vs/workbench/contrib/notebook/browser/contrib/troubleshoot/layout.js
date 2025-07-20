/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../../nls.js';
import { Categories } from '../../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { n } from '../../../../../../base/browser/dom.js';
export class TroubleshootController extends Disposable {
    static { this.id = 'workbench.notebook.troubleshoot'; }
    constructor(_notebookEditor) {
        super();
        this._notebookEditor = _notebookEditor;
        this._localStore = this._register(new DisposableStore());
        this._cellDisposables = [];
        this._enabled = false;
        this._cellStatusItems = [];
        this._register(this._notebookEditor.onDidChangeModel(() => {
            this._update();
        }));
        this._update();
    }
    toggle() {
        this._enabled = !this._enabled;
        this._update();
    }
    _update() {
        this._localStore.clear();
        this._cellDisposables.forEach(d => d.dispose());
        this._cellDisposables = [];
        this._removeNotebookOverlay();
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        if (this._enabled) {
            this._updateListener();
            this._createNotebookOverlay();
            this._createCellOverlays();
        }
    }
    _log(cell, e) {
        if (this._enabled) {
            const oldHeight = this._notebookEditor.getViewHeight(cell);
            console.log(`cell#${cell.handle}`, e, `${oldHeight} -> ${cell.layoutInfo.totalHeight}`);
        }
    }
    _createCellOverlays() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        for (let i = 0; i < this._notebookEditor.getLength(); i++) {
            const cell = this._notebookEditor.cellAt(i);
            this._createCellOverlay(cell, i);
        }
        // Add listener for new cells
        this._localStore.add(this._notebookEditor.onDidChangeViewCells(e => {
            const addedCells = e.splices.reduce((acc, [, , newCells]) => [...acc, ...newCells], []);
            for (let i = 0; i < addedCells.length; i++) {
                const cellIndex = this._notebookEditor.getCellIndex(addedCells[i]);
                if (cellIndex !== undefined) {
                    this._createCellOverlay(addedCells[i], cellIndex);
                }
            }
        }));
    }
    _createNotebookOverlay() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const listViewTop = this._notebookEditor.getLayoutInfo().listViewOffsetTop;
        const scrollTop = this._notebookEditor.scrollTop;
        const overlay = n.div({
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: '1000'
            }
        }, [
            // Top line
            n.div({
                style: {
                    position: 'absolute',
                    top: `${listViewTop}px`,
                    left: '0',
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'rgba(0, 0, 255, 0.7)'
                }
            }),
            // Text label for the notebook overlay
            n.div({
                style: {
                    position: 'absolute',
                    top: `${listViewTop}px`,
                    left: '10px',
                    backgroundColor: 'rgba(0, 0, 255, 0.7)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: '1001'
                }
            }, [`ScrollTop: ${scrollTop}px`])
        ]).keepUpdated(this._store);
        this._notebookOverlayDomNode = overlay.element;
        if (this._notebookOverlayDomNode) {
            this._notebookEditor.getDomNode().appendChild(this._notebookOverlayDomNode);
        }
        this._localStore.add(this._notebookEditor.onDidScroll(() => {
            const scrollTop = this._notebookEditor.scrollTop;
            const listViewTop = this._notebookEditor.getLayoutInfo().listViewOffsetTop;
            if (this._notebookOverlayDomNode) {
                // Update label
                const labelElement = this._notebookOverlayDomNode.querySelector('div:nth-child(2)');
                if (labelElement) {
                    labelElement.textContent = `ScrollTop: ${scrollTop}px`;
                    labelElement.style.top = `${listViewTop}px`;
                }
                // Update top line
                const topLineElement = this._notebookOverlayDomNode.querySelector('div:first-child');
                if (topLineElement) {
                    topLineElement.style.top = `${listViewTop}px`;
                }
            }
        }));
    }
    _createCellOverlay(cell, index) {
        const overlayContainer = document.createElement('div');
        overlayContainer.style.position = 'absolute';
        overlayContainer.style.top = '0';
        overlayContainer.style.left = '0';
        overlayContainer.style.width = '100%';
        overlayContainer.style.height = '100%';
        overlayContainer.style.pointerEvents = 'none';
        overlayContainer.style.zIndex = '1000';
        const topLine = document.createElement('div');
        topLine.style.position = 'absolute';
        topLine.style.top = '0';
        topLine.style.left = '0';
        topLine.style.width = '100%';
        topLine.style.height = '2px';
        topLine.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        overlayContainer.appendChild(topLine);
        const getLayoutInfo = () => {
            const eol = cell.textBuffer.getEOL() === '\n' ? 'LF' : 'CRLF';
            let scrollTop = '';
            if (cell.layoutInfo.layoutState > 0) {
                scrollTop = `| AbsoluteTopOfElement: ${this._notebookEditor.getAbsoluteTopOfElement(cell)}px`;
            }
            return `cell #${index} (handle: ${cell.handle}) ${scrollTop} | EOL: ${eol}`;
        };
        const label = document.createElement('div');
        label.textContent = getLayoutInfo();
        label.style.position = 'absolute';
        label.style.top = '0px';
        label.style.right = '10px';
        label.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        label.style.color = 'white';
        label.style.fontSize = '11px';
        label.style.fontWeight = 'bold';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '3px';
        label.style.whiteSpace = 'nowrap';
        label.style.pointerEvents = 'none';
        label.style.zIndex = '1001';
        overlayContainer.appendChild(label);
        let overlayId = undefined;
        this._notebookEditor.changeCellOverlays((accessor) => {
            overlayId = accessor.addOverlay({
                cell,
                domNode: overlayContainer
            });
        });
        if (overlayId) {
            // Update overlay when layout changes
            const updateLayout = () => {
                // Update label text
                label.textContent = getLayoutInfo();
                // Refresh the overlay position
                if (overlayId) {
                    this._notebookEditor.changeCellOverlays((accessor) => {
                        accessor.layoutOverlay(overlayId);
                    });
                }
            };
            const disposables = this._cellDisposables[index];
            disposables.add(cell.onDidChangeLayout((e) => {
                updateLayout();
            }));
            disposables.add(cell.textBuffer.onDidChangeContent(() => {
                updateLayout();
            }));
            if (cell.textModel) {
                disposables.add(cell.textModel.onDidChangeContent(() => {
                    updateLayout();
                }));
            }
            disposables.add(this._notebookEditor.onDidChangeLayout(() => {
                updateLayout();
            }));
            disposables.add(toDisposable(() => {
                this._notebookEditor.changeCellOverlays((accessor) => {
                    if (overlayId) {
                        accessor.removeOverlay(overlayId);
                    }
                });
            }));
        }
    }
    _removeNotebookOverlay() {
        if (this._notebookOverlayDomNode) {
            this._notebookOverlayDomNode.remove();
            this._notebookOverlayDomNode = undefined;
        }
    }
    _updateListener() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        for (let i = 0; i < this._notebookEditor.getLength(); i++) {
            const cell = this._notebookEditor.cellAt(i);
            const disposableStore = new DisposableStore();
            this._cellDisposables.push(disposableStore);
            disposableStore.add(cell.onDidChangeLayout(e => {
                this._log(cell, e);
            }));
        }
        this._localStore.add(this._notebookEditor.onDidChangeViewCells(e => {
            [...e.splices].reverse().forEach(splice => {
                const [start, deleted, newCells] = splice;
                const deletedCells = this._cellDisposables.splice(start, deleted, ...newCells.map(cell => {
                    const disposableStore = new DisposableStore();
                    disposableStore.add(cell.onDidChangeLayout(e => {
                        this._log(cell, e);
                    }));
                    return disposableStore;
                }));
                dispose(deletedCells);
            });
            // Add the overlays
            const addedCells = e.splices.reduce((acc, [, , newCells]) => [...acc, ...newCells], []);
            for (let i = 0; i < addedCells.length; i++) {
                const cellIndex = this._notebookEditor.getCellIndex(addedCells[i]);
                if (cellIndex !== undefined) {
                    this._createCellOverlay(addedCells[i], cellIndex);
                }
            }
        }));
        const vm = this._notebookEditor.getViewModel();
        let items = [];
        if (this._enabled) {
            items = this._getItemsForCells();
        }
        this._cellStatusItems = vm.deltaCellStatusBarItems(this._cellStatusItems, items);
    }
    _getItemsForCells() {
        const items = [];
        for (let i = 0; i < this._notebookEditor.getLength(); i++) {
            items.push({
                handle: i,
                items: [
                    {
                        text: `index: ${i}`,
                        alignment: 1 /* CellStatusbarAlignment.Left */,
                        priority: Number.MAX_SAFE_INTEGER
                    }
                ]
            });
        }
        return items;
    }
    dispose() {
        dispose(this._cellDisposables);
        this._removeNotebookOverlay();
        this._localStore.clear();
        super.dispose();
    }
}
registerNotebookContribution(TroubleshootController.id, TroubleshootController);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleLayoutTroubleshoot',
            title: localize2('workbench.notebook.toggleLayoutTroubleshoot', "Toggle Notebook Layout Troubleshoot"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(TroubleshootController.id);
        controller?.toggle();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.inspectLayout',
            title: localize2('workbench.notebook.inspectLayout', "Inspect Notebook Layout"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor || !editor.hasModel()) {
            return;
        }
        for (let i = 0; i < editor.getLength(); i++) {
            const cell = editor.cellAt(i);
            console.log(`cell#${cell.handle}`, cell.layoutInfo);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.clearNotebookEdtitorTypeCache',
            title: localize2('workbench.notebook.clearNotebookEdtitorTypeCache', "Clear Notebook Editor Type Cache"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const notebookService = accessor.get(INotebookService);
        notebookService.clearEditorCache();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvdHJvdWJsZXNob290L2xheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRWhHLE9BQU8sRUFBRSwrQkFBK0IsRUFBa0csTUFBTSwwQkFBMEIsQ0FBQztBQUMzSyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUdqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTFELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO2FBQzlDLE9BQUUsR0FBVyxpQ0FBaUMsQUFBNUMsQ0FBNkM7SUFRdEQsWUFBNkIsZUFBZ0M7UUFDNUQsS0FBSyxFQUFFLENBQUM7UUFEb0Isb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBTjVDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDN0QscUJBQWdCLEdBQXNCLEVBQUUsQ0FBQztRQUN6QyxhQUFR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