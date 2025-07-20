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
import { addDisposableListener, getActiveWindow } from '../../../../../base/browser/dom.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Selection } from '../../../../common/core/selection.js';
import { SimplePagedScreenReaderStrategy } from '../screenReaderUtils.js';
import { PositionOffsetTransformer } from '../../../../common/core/text/positionToOffset.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IME } from '../../../../../base/common/ime.js';
let SimpleScreenReaderContent = class SimpleScreenReaderContent extends Disposable {
    constructor(_domNode, _context, _viewController, _accessibilityService) {
        super();
        this._domNode = _domNode;
        this._context = _context;
        this._viewController = _viewController;
        this._accessibilityService = _accessibilityService;
        this._selectionChangeListener = this._register(new MutableDisposable());
        this._accessibilityPageSize = 1;
        this._ignoreSelectionChangeTime = 0;
        this._strategy = new SimplePagedScreenReaderStrategy();
        this.onConfigurationChanged(this._context.configuration.options);
    }
    updateScreenReaderContent(primarySelection) {
        const domNode = this._domNode.domNode;
        const focusedElement = getActiveWindow().document.activeElement;
        if (!focusedElement || focusedElement !== domNode) {
            return;
        }
        const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (isScreenReaderOptimized) {
            this._state = this._getScreenReaderContentState(primarySelection);
            if (domNode.textContent !== this._state.value) {
                this._setIgnoreSelectionChangeTime('setValue');
                domNode.textContent = this._state.value;
            }
            const selection = getActiveWindow().document.getSelection();
            if (!selection) {
                return;
            }
            const range = this._getScreenReaderRange(this._state.selectionStart, this._state.selectionEnd);
            if (!range) {
                return;
            }
            this._setIgnoreSelectionChangeTime('setRange');
            selection.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
        }
        else {
            this._state = undefined;
            this._setIgnoreSelectionChangeTime('setValue');
            this._domNode.domNode.textContent = '';
        }
    }
    updateScrollTop(primarySelection) {
        if (!this._state) {
            return;
        }
        const viewLayout = this._context.viewModel.viewLayout;
        const stateStartLineNumber = this._state.startPositionWithinEditor.lineNumber;
        const verticalOffsetOfStateStartLineNumber = viewLayout.getVerticalOffsetForLineNumber(stateStartLineNumber);
        const verticalOffsetOfPositionLineNumber = viewLayout.getVerticalOffsetForLineNumber(primarySelection.positionLineNumber);
        this._domNode.domNode.scrollTop = verticalOffsetOfPositionLineNumber - verticalOffsetOfStateStartLineNumber;
    }
    onFocusChange(newFocusValue) {
        if (newFocusValue) {
            this._selectionChangeListener.value = this._setSelectionChangeListener();
        }
        else {
            this._selectionChangeListener.value = undefined;
        }
    }
    onConfigurationChanged(options) {
        this._accessibilityPageSize = options.get(3 /* EditorOption.accessibilityPageSize */);
    }
    onWillCut() {
        this._setIgnoreSelectionChangeTime('onCut');
    }
    onWillPaste() {
        this._setIgnoreSelectionChangeTime('onWillPaste');
    }
    // --- private methods
    _setIgnoreSelectionChangeTime(reason) {
        this._ignoreSelectionChangeTime = Date.now();
    }
    _setSelectionChangeListener() {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display or NVDA for example, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event and needs to be reflected within the editor.
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return addDisposableListener(this._domNode.domNode.ownerDocument, 'selectionchange', () => {
            const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!this._state || !isScreenReaderOptimized || !IME.enabled) {
                return;
            }
            const activeElement = getActiveWindow().document.activeElement;
            const isFocused = activeElement === this._domNode.domNode;
            if (!isFocused) {
                return;
            }
            const selection = getActiveWindow().document.getSelection();
            if (!selection) {
                return;
            }
            const rangeCount = selection.rangeCount;
            if (rangeCount === 0) {
                return;
            }
            const range = selection.getRangeAt(0);
            const now = Date.now();
            const delta1 = now - previousSelectionChangeEventTime;
            previousSelectionChangeEventTime = now;
            if (delta1 < 5) {
                // received another `selectionchange` event within 5ms of the previous `selectionchange` event
                // => ignore it
                return;
            }
            const delta2 = now - this._ignoreSelectionChangeTime;
            this._ignoreSelectionChangeTime = 0;
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the hidden div
                // => ignore it, since we caused it
                return;
            }
            this._viewController.setSelection(this._getEditorSelectionFromDomRange(this._context, this._state, range));
        });
    }
    _getScreenReaderContentState(primarySelection) {
        const state = this._strategy.fromEditorSelection(this._context.viewModel, primarySelection, this._accessibilityPageSize, this._accessibilityService.getAccessibilitySupport() === 0 /* AccessibilitySupport.Unknown */);
        const endPosition = this._context.viewModel.model.getPositionAt(Infinity);
        let value = state.value;
        if (endPosition.column === 1 && primarySelection.getEndPosition().equals(endPosition)) {
            value += '\n';
        }
        state.value = value;
        return state;
    }
    _getScreenReaderRange(selectionOffsetStart, selectionOffsetEnd) {
        const textContent = this._domNode.domNode.firstChild;
        if (!textContent) {
            return;
        }
        const range = new globalThis.Range();
        range.setStart(textContent, selectionOffsetStart);
        range.setEnd(textContent, selectionOffsetEnd);
        return range;
    }
    _getEditorSelectionFromDomRange(context, state, range) {
        const viewModel = context.viewModel;
        const model = viewModel.model;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const modelScreenReaderContentStartPositionWithinEditor = coordinatesConverter.convertViewPositionToModelPosition(state.startPositionWithinEditor);
        const offsetOfStartOfScreenReaderContent = model.getOffsetAt(modelScreenReaderContentStartPositionWithinEditor);
        let offsetOfSelectionStart = range.startOffset + offsetOfStartOfScreenReaderContent;
        let offsetOfSelectionEnd = range.endOffset + offsetOfStartOfScreenReaderContent;
        const modelUsesCRLF = model.getEndOfLineSequence() === 1 /* EndOfLineSequence.CRLF */;
        if (modelUsesCRLF) {
            const screenReaderContentText = state.value;
            const offsetTransformer = new PositionOffsetTransformer(screenReaderContentText);
            const positionOfStartWithinText = offsetTransformer.getPosition(range.startOffset);
            const positionOfEndWithinText = offsetTransformer.getPosition(range.endOffset);
            offsetOfSelectionStart += positionOfStartWithinText.lineNumber - 1;
            offsetOfSelectionEnd += positionOfEndWithinText.lineNumber - 1;
        }
        const positionOfSelectionStart = model.getPositionAt(offsetOfSelectionStart);
        const positionOfSelectionEnd = model.getPositionAt(offsetOfSelectionEnd);
        return Selection.fromPositions(positionOfSelectionStart, positionOfSelectionEnd);
    }
};
SimpleScreenReaderContent = __decorate([
    __param(3, IAccessibilityService)
], SimpleScreenReaderContent);
export { SimpleScreenReaderContent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyQ29udGVudFNpbXBsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9uYXRpdmUvc2NyZWVuUmVhZGVyQ29udGVudFNpbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUYsT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSTVILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsK0JBQStCLEVBQW1DLE1BQU0seUJBQXlCLENBQUM7QUFDM0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUlqRCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFVeEQsWUFDa0IsUUFBa0MsRUFDbEMsUUFBcUIsRUFDckIsZUFBK0IsRUFDekIscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBTFMsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDbEMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7UUFDUiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBWnBFLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFF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