/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './whitespace.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import * as strings from '../../../../base/common/strings.js';
import { Position } from '../../../common/core/position.js';
import { editorWhitespaces } from '../../../common/core/editorColorRegistry.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
/**
 * The whitespace overlay will visual certain whitespace depending on the
 * current editor configuration (boundary, selection, etc.).
 */
export class WhitespaceOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        this._options = new WhitespaceOptions(this._context.configuration);
        this._selection = [];
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const newOptions = new WhitespaceOptions(this._context.configuration);
        if (this._options.equals(newOptions)) {
            return e.hasChanged(164 /* EditorOption.layoutInfo */);
        }
        this._options = newOptions;
        return true;
    }
    onCursorStateChanged(e) {
        this._selection = e.selections;
        if (this._options.renderWhitespace === 'selection') {
            return true;
        }
        return false;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (this._options.renderWhitespace === 'none') {
            this._renderResult = null;
            return;
        }
        const startLineNumber = ctx.visibleRange.startLineNumber;
        const endLineNumber = ctx.visibleRange.endLineNumber;
        const lineCount = endLineNumber - startLineNumber + 1;
        const needed = new Array(lineCount);
        for (let i = 0; i < lineCount; i++) {
            needed[i] = true;
        }
        this._renderResult = [];
        for (let lineNumber = ctx.viewportData.startLineNumber; lineNumber <= ctx.viewportData.endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - ctx.viewportData.startLineNumber;
            const lineData = this._context.viewModel.getViewLineRenderingData(lineNumber);
            let selectionsOnLine = null;
            if (this._options.renderWhitespace === 'selection') {
                const selections = this._selection;
                for (const selection of selections) {
                    if (selection.endLineNumber < lineNumber || selection.startLineNumber > lineNumber) {
                        // Selection does not intersect line
                        continue;
                    }
                    const startColumn = (selection.startLineNumber === lineNumber ? selection.startColumn : lineData.minColumn);
                    const endColumn = (selection.endLineNumber === lineNumber ? selection.endColumn : lineData.maxColumn);
                    if (startColumn < endColumn) {
                        if (!selectionsOnLine) {
                            selectionsOnLine = [];
                        }
                        selectionsOnLine.push(new OffsetRange(startColumn - 1, endColumn - 1));
                    }
                }
            }
            this._renderResult[lineIndex] = this._applyRenderWhitespace(ctx, lineNumber, selectionsOnLine, lineData);
        }
    }
    _applyRenderWhitespace(ctx, lineNumber, selections, lineData) {
        if (lineData.hasVariableFonts) {
            return '';
        }
        if (this._options.renderWhitespace === 'selection' && !selections) {
            return '';
        }
        if (this._options.renderWhitespace === 'trailing' && lineData.continuesWithWrappedLine) {
            return '';
        }
        const color = this._context.theme.getColor(editorWhitespaces);
        const USE_SVG = this._options.renderWithSVG;
        const lineContent = lineData.content;
        const len = (this._options.stopRenderingLineAfter === -1 ? lineContent.length : Math.min(this._options.stopRenderingLineAfter, lineContent.length));
        const continuesWithWrappedLine = lineData.continuesWithWrappedLine;
        const fauxIndentLength = lineData.minColumn - 1;
        const onlyBoundary = (this._options.renderWhitespace === 'boundary');
        const onlyTrailing = (this._options.renderWhitespace === 'trailing');
        const lineHeight = ctx.getLineHeightForLineNumber(lineNumber);
        const middotWidth = this._options.middotWidth;
        const wsmiddotWidth = this._options.wsmiddotWidth;
        const spaceWidth = this._options.spaceWidth;
        const wsmiddotDiff = Math.abs(wsmiddotWidth - spaceWidth);
        const middotDiff = Math.abs(middotWidth - spaceWidth);
        // U+2E31 - WORD SEPARATOR MIDDLE DOT
        // U+00B7 - MIDDLE DOT
        const renderSpaceCharCode = (wsmiddotDiff < middotDiff ? 0x2E31 : 0xB7);
        const canUseHalfwidthRightwardsArrow = this._options.canUseHalfwidthRightwardsArrow;
        let result = '';
        let lineIsEmptyOrWhitespace = false;
        let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
        let lastNonWhitespaceIndex;
        if (firstNonWhitespaceIndex === -1) {
            lineIsEmptyOrWhitespace = true;
            firstNonWhitespaceIndex = len;
            lastNonWhitespaceIndex = len;
        }
        else {
            lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
        }
        let currentSelectionIndex = 0;
        let currentSelection = selections && selections[currentSelectionIndex];
        let maxLeft = 0;
        for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
            const chCode = lineContent.charCodeAt(charIndex);
            if (currentSelection && currentSelection.endExclusive <= charIndex) {
                currentSelectionIndex++;
                currentSelection = selections && selections[currentSelectionIndex];
            }
            if (chCode !== 9 /* CharCode.Tab */ && chCode !== 32 /* CharCode.Space */) {
                continue;
            }
            if (onlyTrailing && !lineIsEmptyOrWhitespace && charIndex <= lastNonWhitespaceIndex) {
                // If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
                continue;
            }
            if (onlyBoundary && charIndex >= firstNonWhitespaceIndex && charIndex <= lastNonWhitespaceIndex && chCode === 32 /* CharCode.Space */) {
                // rendering only boundary whitespace
                const prevChCode = (charIndex - 1 >= 0 ? lineContent.charCodeAt(charIndex - 1) : 0 /* CharCode.Null */);
                const nextChCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */);
                if (prevChCode !== 32 /* CharCode.Space */ && nextChCode !== 32 /* CharCode.Space */) {
                    continue;
                }
            }
            if (onlyBoundary && continuesWithWrappedLine && charIndex === len - 1) {
                const prevCharCode = (charIndex - 1 >= 0 ? lineContent.charCodeAt(charIndex - 1) : 0 /* CharCode.Null */);
                const isSingleTrailingSpace = (chCode === 32 /* CharCode.Space */ && (prevCharCode !== 32 /* CharCode.Space */ && prevCharCode !== 9 /* CharCode.Tab */));
                if (isSingleTrailingSpace) {
                    continue;
                }
            }
            if (selections && !(currentSelection && currentSelection.start <= charIndex && charIndex < currentSelection.endExclusive)) {
                // If rendering whitespace on selection, check that the charIndex falls within a selection
                continue;
            }
            const visibleRange = ctx.visibleRangeForPosition(new Position(lineNumber, charIndex + 1));
            if (!visibleRange) {
                continue;
            }
            if (USE_SVG) {
                maxLeft = Math.max(maxLeft, visibleRange.left);
                if (chCode === 9 /* CharCode.Tab */) {
                    result += this._renderArrow(lineHeight, spaceWidth, visibleRange.left);
                }
                else {
                    result += `<circle cx="${(visibleRange.left + spaceWidth / 2).toFixed(2)}" cy="${(lineHeight / 2).toFixed(2)}" r="${(spaceWidth / 7).toFixed(2)}" />`;
                }
            }
            else {
                if (chCode === 9 /* CharCode.Tab */) {
                    result += `<div class="mwh" style="left:${visibleRange.left}px;height:${lineHeight}px;">${canUseHalfwidthRightwardsArrow ? String.fromCharCode(0xFFEB) : String.fromCharCode(0x2192)}</div>`;
                }
                else {
                    result += `<div class="mwh" style="left:${visibleRange.left}px;height:${lineHeight}px;">${String.fromCharCode(renderSpaceCharCode)}</div>`;
                }
            }
        }
        if (USE_SVG) {
            maxLeft = Math.round(maxLeft + spaceWidth);
            return (`<svg style="bottom:0;position:absolute;width:${maxLeft}px;height:${lineHeight}px" viewBox="0 0 ${maxLeft} ${lineHeight}" xmlns="http://www.w3.org/2000/svg" fill="${color}">`
                + result
                + `</svg>`);
        }
        return result;
    }
    _renderArrow(lineHeight, spaceWidth, left) {
        const strokeWidth = spaceWidth / 7;
        const width = spaceWidth;
        const dy = lineHeight / 2;
        const dx = left;
        const p1 = { x: 0, y: strokeWidth / 2 };
        const p2 = { x: 100 / 125 * width, y: p1.y };
        const p3 = { x: p2.x - 0.2 * p2.x, y: p2.y + 0.2 * p2.x };
        const p4 = { x: p3.x + 0.1 * p2.x, y: p3.y + 0.1 * p2.x };
        const p5 = { x: p4.x + 0.35 * p2.x, y: p4.y - 0.35 * p2.x };
        const p6 = { x: p5.x, y: -p5.y };
        const p7 = { x: p4.x, y: -p4.y };
        const p8 = { x: p3.x, y: -p3.y };
        const p9 = { x: p2.x, y: -p2.y };
        const p10 = { x: p1.x, y: -p1.y };
        const p = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];
        const parts = p.map((p) => `${(dx + p.x).toFixed(2)} ${(dy + p.y).toFixed(2)}`).join(' L ');
        return `<path d="M ${parts}" />`;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
class WhitespaceOptions {
    constructor(config) {
        const options = config.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const experimentalWhitespaceRendering = options.get(47 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            // whitespace is rendered in the view line
            this.renderWhitespace = 'none';
            this.renderWithSVG = false;
        }
        else if (experimentalWhitespaceRendering === 'svg') {
            this.renderWhitespace = options.get(112 /* EditorOption.renderWhitespace */);
            this.renderWithSVG = true;
        }
        else {
            this.renderWhitespace = options.get(112 /* EditorOption.renderWhitespace */);
            this.renderWithSVG = false;
        }
        this.spaceWidth = fontInfo.spaceWidth;
        this.middotWidth = fontInfo.middotWidth;
        this.wsmiddotWidth = fontInfo.wsmiddotWidth;
        this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
        this.lineHeight = options.get(75 /* EditorOption.lineHeight */);
        this.stopRenderingLineAfter = options.get(132 /* EditorOption.stopRenderingLineAfter */);
    }
    equals(other) {
        return (this.renderWhitespace === other.renderWhitespace
            && this.renderWithSVG === other.renderWithSVG
            && this.spaceWidth === other.spaceWidth
            && this.middotWidth === other.middotWidth
            && this.wsmiddotWidth === other.wsmiddotWidth
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.lineHeight === other.lineHeight
            && this.stopRenderingLineAfter === other.stopRenderingLineAfter);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3doaXRlc3BhY2Uvd2hpdGVzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGtCQUFrQixDQUFDO0FBQzFCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBUXRFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFFOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsa0JBQWtCO0lBT3hELFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzFCLEtBQUssQ0FB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QztRQUNuQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUM7UUFDekIsTUFBTSxFQUFFLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUMxQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFaEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDeEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDMUQsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM1RCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFB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