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
import { addDisposableListener, getActiveWindow, isHTMLElement } from '../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { EditorFontLigatures } from '../../../../common/config/editorOptions.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { StringBuilder } from '../../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../common/viewLayout/viewLineRenderer.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IME } from '../../../../../base/common/ime.js';
import { getColumnOfNodeOffset } from '../../../viewParts/viewLines/viewLine.js';
const ttPolicy = createTrustedTypesPolicy('richScreenReaderContent', { createHTML: value => value });
const LINE_NUMBER_ATTRIBUTE = 'data-line-number';
let RichScreenReaderContent = class RichScreenReaderContent extends Disposable {
    constructor(_domNode, _context, _viewController, _accessibilityService) {
        super();
        this._domNode = _domNode;
        this._context = _context;
        this._viewController = _viewController;
        this._accessibilityService = _accessibilityService;
        this._selectionChangeListener = this._register(new MutableDisposable());
        this._accessibilityPageSize = 1;
        this._ignoreSelectionChangeTime = 0;
        this._state = new RichScreenReaderState([]);
        this._strategy = new RichPagedScreenReaderStrategy();
        this._renderedLines = new Map();
        this._renderedSelection = new Selection(1, 1, 1, 1);
        this.onConfigurationChanged(this._context.configuration.options);
    }
    updateScreenReaderContent(primarySelection) {
        const focusedElement = getActiveWindow().document.activeElement;
        if (!focusedElement || focusedElement !== this._domNode.domNode) {
            return;
        }
        const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (isScreenReaderOptimized) {
            const state = this._getScreenReaderContentLineIntervals(primarySelection);
            if (!this._state.equals(state)) {
                this._state = state;
                this._renderedLines = this._renderScreenReaderContent(state);
            }
            if (!this._renderedSelection.equalsSelection(primarySelection)) {
                this._renderedSelection = primarySelection;
                this._setSelectionOnScreenReaderContent(this._context, this._renderedLines, primarySelection);
            }
        }
        else {
            this._state = new RichScreenReaderState([]);
            this._setIgnoreSelectionChangeTime('setValue');
            this._domNode.domNode.textContent = '';
        }
    }
    updateScrollTop(primarySelection) {
        const intervals = this._state.intervals;
        if (!intervals.length) {
            return;
        }
        const viewLayout = this._context.viewModel.viewLayout;
        const stateStartLineNumber = intervals[0].startLine;
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
            const activeElement = getActiveWindow().document.activeElement;
            const isFocused = activeElement === this._domNode.domNode;
            if (!isFocused) {
                return;
            }
            const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!isScreenReaderOptimized || !IME.enabled) {
                return;
            }
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
            const selection = this._getEditorSelectionFromDomRange();
            if (!selection) {
                return;
            }
            this._viewController.setSelection(selection);
        });
    }
    _renderScreenReaderContent(state) {
        const nodes = [];
        const renderedLines = new Map();
        for (const interval of state.intervals) {
            for (let lineNumber = interval.startLine; lineNumber <= interval.endLine; lineNumber++) {
                const renderedLine = this._renderLine(lineNumber);
                renderedLines.set(lineNumber, renderedLine);
                nodes.push(renderedLine.domNode);
            }
        }
        this._setIgnoreSelectionChangeTime('setValue');
        this._domNode.domNode.replaceChildren(...nodes);
        return renderedLines;
    }
    _renderLine(viewLineNumber) {
        const viewModel = this._context.viewModel;
        const positionLineData = viewModel.getViewLineRenderingData(viewLineNumber);
        const options = this._context.configuration.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const stopRenderingLineAfter = options.get(132 /* EditorOption.stopRenderingLineAfter */);
        const renderControlCharacters = options.get(107 /* EditorOption.renderControlCharacters */);
        const fontLigatures = options.get(60 /* EditorOption.fontLigatures */);
        const disableMonospaceOptimizations = options.get(40 /* EditorOption.disableMonospaceOptimizations */);
        const lineDecorations = LineDecoration.filter(positionLineData.inlineDecorations, viewLineNumber, positionLineData.minColumn, positionLineData.maxColumn);
        const useMonospaceOptimizations = fontInfo.isMonospace && !disableMonospaceOptimizations;
        const useFontLigatures = fontLigatures !== EditorFontLigatures.OFF;
        let renderWhitespace;
        const experimentalWhitespaceRendering = options.get(47 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            renderWhitespace = options.get(112 /* EditorOption.renderWhitespace */);
        }
        else {
            renderWhitespace = 'none';
        }
        const renderLineInput = new RenderLineInput(useMonospaceOptimizations, fontInfo.canUseHalfwidthRightwardsArrow, positionLineData.content, positionLineData.continuesWithWrappedLine, positionLineData.isBasicASCII, positionLineData.containsRTL, positionLineData.minColumn - 1, positionLineData.tokens, lineDecorations, positionLineData.tabSize, positionLineData.startVisibleColumn, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, useFontLigatures, null, null, 0, true);
        const htmlBuilder = new StringBuilder(10000);
        const renderOutput = renderViewLine(renderLineInput, htmlBuilder);
        const html = htmlBuilder.build();
        const trustedhtml = ttPolicy?.createHTML(html) ?? html;
        const lineHeight = viewModel.viewLayout.getLineHeightForLineNumber(viewLineNumber) + 'px';
        const domNode = document.createElement('div');
        domNode.innerHTML = trustedhtml;
        domNode.style.lineHeight = lineHeight;
        domNode.style.height = lineHeight;
        domNode.setAttribute(LINE_NUMBER_ATTRIBUTE, viewLineNumber.toString());
        return new RichRenderedScreenReaderLine(domNode, renderOutput.characterMapping);
    }
    _setSelectionOnScreenReaderContent(context, renderedLines, viewSelection) {
        const activeDocument = getActiveWindow().document;
        const activeDocumentSelection = activeDocument.getSelection();
        if (!activeDocumentSelection) {
            return;
        }
        const startLineNumber = viewSelection.startLineNumber;
        const endLineNumber = viewSelection.endLineNumber;
        const startRenderedLine = renderedLines.get(startLineNumber);
        const endRenderedLine = renderedLines.get(endLineNumber);
        if (!startRenderedLine || !endRenderedLine) {
            return;
        }
        const range = new globalThis.Range();
        const viewModel = context.viewModel;
        const model = viewModel.model;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const startRange = new Range(startLineNumber, 1, startLineNumber, viewSelection.startColumn);
        const modelStartRange = coordinatesConverter.convertViewRangeToModelRange(startRange);
        const characterCountForStart = model.getCharacterCountInRange(modelStartRange);
        const endRange = new Range(endLineNumber, 1, endLineNumber, viewSelection.endColumn);
        const modelEndRange = coordinatesConverter.convertViewRangeToModelRange(endRange);
        const characterCountForEnd = model.getCharacterCountInRange(modelEndRange);
        const startDomPosition = startRenderedLine.characterMapping.getDomPosition(characterCountForStart);
        const endDomPosition = endRenderedLine.characterMapping.getDomPosition(characterCountForEnd);
        const startDomNode = startRenderedLine.domNode.firstChild;
        const endDomNode = endRenderedLine.domNode.firstChild;
        const startChildren = startDomNode.childNodes;
        const endChildren = endDomNode.childNodes;
        const startNode = startChildren.item(startDomPosition.partIndex);
        const endNode = endChildren.item(endDomPosition.partIndex);
        if (!startNode.firstChild || !endNode.firstChild) {
            return;
        }
        range.setStart(startNode.firstChild, viewSelection.startColumn === 1 ? 0 : startDomPosition.charIndex + 1);
        range.setEnd(endNode.firstChild, viewSelection.endColumn === 1 ? 0 : endDomPosition.charIndex + 1);
        this._setIgnoreSelectionChangeTime('setRange');
        activeDocumentSelection.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
    }
    _getScreenReaderContentLineIntervals(primarySelection) {
        return this._strategy.fromEditorSelection(this._context.viewModel, primarySelection, this._accessibilityPageSize);
    }
    _getEditorSelectionFromDomRange() {
        if (!this._renderedLines) {
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
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startSpanElement = startContainer.parentElement;
        const endSpanElement = endContainer.parentElement;
        if (!startSpanElement || !isHTMLElement(startSpanElement) || !endSpanElement || !isHTMLElement(endSpanElement)) {
            return;
        }
        const startLineDomNode = startSpanElement.parentElement?.parentElement;
        const endLineDomNode = endSpanElement.parentElement?.parentElement;
        if (!startLineDomNode || !endLineDomNode) {
            return;
        }
        const startLineNumberAttribute = startLineDomNode.getAttribute(LINE_NUMBER_ATTRIBUTE);
        const endLineNumberAttribute = endLineDomNode.getAttribute(LINE_NUMBER_ATTRIBUTE);
        if (!startLineNumberAttribute || !endLineNumberAttribute) {
            return;
        }
        const startLineNumber = parseInt(startLineNumberAttribute);
        const endLineNumber = parseInt(endLineNumberAttribute);
        const startMapping = this._renderedLines.get(startLineNumber)?.characterMapping;
        const endMapping = this._renderedLines.get(endLineNumber)?.characterMapping;
        if (!startMapping || !endMapping) {
            return;
        }
        const startColumn = getColumnOfNodeOffset(startMapping, startSpanElement, range.startOffset);
        const endColumn = getColumnOfNodeOffset(endMapping, endSpanElement, range.endOffset);
        return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
    }
};
RichScreenReaderContent = __decorate([
    __param(3, IAccessibilityService)
], RichScreenReaderContent);
export { RichScreenReaderContent };
class RichRenderedScreenReaderLine {
    constructor(domNode, characterMapping) {
        this.domNode = domNode;
        this.characterMapping = characterMapping;
    }
}
class LineInterval {
    constructor(startLine, endLine) {
        this.startLine = startLine;
        this.endLine = endLine;
    }
}
class RichScreenReaderState {
    constructor(intervals) {
        this.intervals = intervals;
    }
    equals(other) {
        if (this.intervals.length !== other.intervals.length) {
            return false;
        }
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i].startLine !== other.intervals[i].startLine || this.intervals[i].endLine !== other.intervals[i].endLine) {
                return false;
            }
        }
        return true;
    }
}
class RichPagedScreenReaderStrategy {
    constructor() { }
    _getPageOfLine(lineNumber, linesPerPage) {
        return Math.floor((lineNumber - 1) / linesPerPage);
    }
    _getRangeForPage(context, page, linesPerPage) {
        const offset = page * linesPerPage;
        const startLineNumber = offset + 1;
        const endLineNumber = Math.min(offset + linesPerPage, context.getLineCount());
        return new LineInterval(startLineNumber, endLineNumber);
    }
    fromEditorSelection(context, viewSelection, linesPerPage) {
        const selectionStartPage = this._getPageOfLine(viewSelection.startLineNumber, linesPerPage);
        const selectionStartPageRange = this._getRangeForPage(context, selectionStartPage, linesPerPage);
        const selectionEndPage = this._getPageOfLine(viewSelection.endLineNumber, linesPerPage);
        const selectionEndPageRange = this._getRangeForPage(context, selectionEndPage, linesPerPage);
        const lineIntervals = [{ startLine: selectionStartPageRange.startLine, endLine: selectionStartPageRange.endLine }];
        if (selectionStartPage + 1 < selectionEndPage) {
            lineIntervals.push({ startLine: selectionEndPageRange.startLine, endLine: selectionEndPageRange.endLine });
        }
        return new RichScreenReaderState(lineIntervals);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyQ29udGVudFJpY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL3NjcmVlblJlYWRlckNvbnRlbnRSaWNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFM0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUEyRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFKLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQW9CLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUl0SCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRWpGLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLHlCQUF5QixFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FB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