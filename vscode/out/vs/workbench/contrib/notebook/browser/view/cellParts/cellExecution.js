/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as DOM from '../../../../../../base/browser/dom.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { executingStateIcon } from '../../notebookIcons.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
const UPDATE_EXECUTION_ORDER_GRACE_PERIOD = 200;
let CellExecutionPart = class CellExecutionPart extends CellContentPart {
    constructor(_notebookEditor, _executionOrderLabel, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._executionOrderLabel = _executionOrderLabel;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.kernelDisposables = this._register(new DisposableStore());
        // Add class to the outer container for styling
        this._executionOrderLabel.classList.add('cell-execution-order');
        // Create nested div for content
        this._executionOrderContent = DOM.append(this._executionOrderLabel, DOM.$('div'));
        // Add a method to watch for cell execution state changes
        this._register(this._notebookExecutionStateService.onDidChangeExecution(e => {
            if (this.currentCell && 'affectsCell' in e && e.affectsCell(this.currentCell.uri)) {
                this._updatePosition();
            }
        }));
        this._register(this._notebookEditor.onDidChangeActiveKernel(() => {
            if (this.currentCell) {
                this.kernelDisposables.clear();
                if (this._notebookEditor.activeKernel) {
                    this.kernelDisposables.add(this._notebookEditor.activeKernel.onDidChange(() => {
                        if (this.currentCell) {
                            this.updateExecutionOrder(this.currentCell.internalMetadata);
                        }
                    }));
                }
                this.updateExecutionOrder(this.currentCell.internalMetadata);
            }
        }));
        this._register(this._notebookEditor.onDidScroll(() => {
            this._updatePosition();
        }));
    }
    didRenderCell(element) {
        this.updateExecutionOrder(element.internalMetadata, true);
    }
    updateState(element, e) {
        if (e.internalMetadataChanged) {
            this.updateExecutionOrder(element.internalMetadata);
        }
    }
    updateExecutionOrder(internalMetadata, forceClear = false) {
        if (this._notebookEditor.activeKernel?.implementsExecutionOrder || (!this._notebookEditor.activeKernel && typeof internalMetadata.executionOrder === 'number')) {
            // If the executionOrder was just cleared, and the cell is executing, wait just a bit before clearing the view to avoid flashing
            if (typeof internalMetadata.executionOrder !== 'number' && !forceClear && !!this._notebookExecutionStateService.getCellExecution(this.currentCell.uri)) {
                const renderingCell = this.currentCell;
                disposableTimeout(() => {
                    if (this.currentCell === renderingCell) {
                        this.updateExecutionOrder(this.currentCell.internalMetadata, true);
                        this._updatePosition();
                    }
                }, UPDATE_EXECUTION_ORDER_GRACE_PERIOD, this.cellDisposables);
                return;
            }
            const executionOrderLabel = typeof internalMetadata.executionOrder === 'number' ?
                `[${internalMetadata.executionOrder}]` :
                '[ ]';
            this._executionOrderContent.innerText = executionOrderLabel;
            // Call _updatePosition to refresh sticky status
            this._updatePosition();
        }
        else {
            this._executionOrderContent.innerText = '';
        }
    }
    updateInternalLayoutNow(element) {
        this._updatePosition();
    }
    _updatePosition() {
        if (!this.currentCell) {
            return;
        }
        if (this.currentCell.isInputCollapsed) {
            DOM.hide(this._executionOrderLabel);
            return;
        }
        // Only show the execution order label when the cell is running
        const cellIsRunning = !!this._notebookExecutionStateService.getCellExecution(this.currentCell.uri);
        // Store sticky state before potentially removing the class
        const wasSticky = this._executionOrderLabel.classList.contains('sticky');
        if (!cellIsRunning) {
            // Keep showing the execution order label but remove sticky class
            this._executionOrderLabel.classList.remove('sticky');
            // If we were sticky and cell stopped running, restore the proper content
            if (wasSticky) {
                const executionOrder = this.currentCell.internalMetadata.executionOrder;
                const executionOrderLabel = typeof executionOrder === 'number' ?
                    `[${executionOrder}]` :
                    '[ ]';
                this._executionOrderContent.innerText = executionOrderLabel;
            }
        }
        DOM.show(this._executionOrderLabel);
        let top = this.currentCell.layoutInfo.editorHeight - 22 + this.currentCell.layoutInfo.statusBarHeight;
        if (this.currentCell instanceof CodeCellViewModel) {
            const elementTop = this._notebookEditor.getAbsoluteTopOfElement(this.currentCell);
            const editorBottom = elementTop + this.currentCell.layoutInfo.outputContainerOffset;
            const scrollBottom = this._notebookEditor.scrollBottom;
            const lineHeight = 22;
            const statusBarVisible = this.currentCell.layoutInfo.statusBarHeight > 0;
            // Sticky mode: cell is running and editor is not fully visible
            const offset = editorBottom - scrollBottom;
            top -= offset;
            top = clamp(top, lineHeight + 12, // line height + padding for single line
            this.currentCell.layoutInfo.editorHeight - lineHeight + this.currentCell.layoutInfo.statusBarHeight);
            if (scrollBottom <= editorBottom && cellIsRunning) {
                const isAlreadyIcon = this._executionOrderContent.classList.contains('sticky-spinner');
                // Add a class when it's in sticky mode for special styling
                if (!isAlreadyIcon) {
                    this._executionOrderLabel.classList.add('sticky-spinner');
                    // Only recreate the content if we're newly becoming sticky
                    DOM.clearNode(this._executionOrderContent);
                    const icon = ThemeIcon.modify(executingStateIcon, 'spin');
                    DOM.append(this._executionOrderContent, ...renderLabelWithIcons(`$(${icon.id})`));
                }
                // When already sticky, we don't need to recreate the content
            }
            else if (!statusBarVisible && cellIsRunning) {
                // Status bar is hidden but cell is running: show execution order label at the bottom of the editor area
                const wasStickyHere = this._executionOrderLabel.classList.contains('sticky');
                this._executionOrderLabel.classList.remove('sticky');
                top = this.currentCell.layoutInfo.editorHeight - lineHeight; // Place at the bottom of the editor
                // Only update content if we were previously sticky or content is not correct
                const iconIsPresent = this._executionOrderContent.querySelector('.codicon') !== null;
                if (wasStickyHere || iconIsPresent) {
                    const executionOrder = this.currentCell.internalMetadata.executionOrder;
                    const executionOrderLabel = typeof executionOrder === 'number' ?
                        `[${executionOrder}]` :
                        '[ ]';
                    this._executionOrderContent.innerText = executionOrderLabel;
                }
            }
            else {
                // Only update if the current state is sticky
                const currentlySticky = this._executionOrderLabel.classList.contains('sticky');
                this._executionOrderLabel.classList.remove('sticky');
                // When transitioning from sticky to non-sticky, restore the proper content
                if (currentlySticky) {
                    const executionOrder = this.currentCell.internalMetadata.executionOrder;
                    const executionOrderLabel = typeof executionOrder === 'number' ?
                        `[${executionOrder}]` :
                        '[ ]';
                    this._executionOrderContent.innerText = executionOrderLabel;
                }
            }
        }
        this._executionOrderLabel.style.top = `${top}px`;
    }
};
CellExecutionPart = __decorate([
    __param(2, INotebookExecutionStateService)
], CellExecutionPart);
export { CellExecutionPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEV4ZWN1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRXhlY3V0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBR2pHLE1BQU0sbUNBQW1DLEdBQUcsR0FBRyxDQUFDO0FBRXpDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsZUFBZTtJQUlyRCxZQUNrQixlQUF3QyxFQUN4QyxvQkFBaUMsRUFDbEIsOEJBQStFO1FBRS9HLEtBQUssRUFBRSxDQUFDO1FBSlMsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBYTtRQUNELG1DQUE4QixHQUE5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