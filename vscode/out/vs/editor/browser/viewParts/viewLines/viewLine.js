/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import * as platform from '../../../../base/common/platform.js';
import { RangeUtil } from './rangeUtil.js';
import { FloatHorizontalRange, VisibleRanges } from '../../view/renderingContext.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, DomPosition } from '../../../common/viewLayout/viewLineRenderer.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { EditorFontLigatures } from '../../../common/config/editorOptions.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
import { TextDirection } from '../../../common/model.js';
const canUseFastRenderedViewLine = (function () {
    if (platform.isNative) {
        // In VSCode we know very well when the zoom level changes
        return true;
    }
    if (platform.isLinux || browser.isFirefox || browser.isSafari) {
        // On Linux, it appears that zooming affects char widths (in pixels), which is unexpected.
        // --
        // Even though we read character widths correctly, having read them at a specific zoom level
        // does not mean they are the same at the current zoom level.
        // --
        // This could be improved if we ever figure out how to get an event when browsers zoom,
        // but until then we have to stick with reading client rects.
        // --
        // The same has been observed with Firefox on Windows7
        // --
        // The same has been oversved with Safari
        return false;
    }
    return true;
})();
let monospaceAssumptionsAreValid = true;
export class ViewLine {
    static { this.CLASS_NAME = 'view-line'; }
    constructor(_viewGpuContext, options) {
        this._viewGpuContext = _viewGpuContext;
        this._options = options;
        this._isMaybeInvalid = true;
        this._renderedViewLine = null;
    }
    // --- begin IVisibleLineData
    getDomNode() {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            return this._renderedViewLine.domNode.domNode;
        }
        return null;
    }
    setDomNode(domNode) {
        if (this._renderedViewLine) {
            this._renderedViewLine.domNode = createFastDomNode(domNode);
        }
        else {
            throw new Error('I have no rendered view line to set the dom node to...');
        }
    }
    onContentChanged() {
        this._isMaybeInvalid = true;
    }
    onTokensChanged() {
        this._isMaybeInvalid = true;
    }
    onDecorationsChanged() {
        this._isMaybeInvalid = true;
    }
    onOptionsChanged(newOptions) {
        this._isMaybeInvalid = true;
        this._options = newOptions;
    }
    onSelectionChanged() {
        if (isHighContrast(this._options.themeType) || this._renderedViewLine?.input.renderWhitespace === 2 /* RenderWhitespace.Selection */) {
            this._isMaybeInvalid = true;
            return true;
        }
        return false;
    }
    renderLine(lineNumber, deltaTop, lineHeight, viewportData, sb) {
        if (this._options.useGpu && this._viewGpuContext?.canRender(this._options, viewportData, lineNumber)) {
            this._renderedViewLine?.domNode?.domNode.remove();
            this._renderedViewLine = null;
            return false;
        }
        if (this._isMaybeInvalid === false) {
            // it appears that nothing relevant has changed
            return false;
        }
        this._isMaybeInvalid = false;
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const options = this._options;
        const actualInlineDecorations = LineDecoration.filter(lineData.inlineDecorations, lineNumber, lineData.minColumn, lineData.maxColumn);
        const renderWhitespace = (lineData.hasVariableFonts || options.experimentalWhitespaceRendering === 'off') ? options.renderWhitespace : 'none';
        const allowFastRendering = !lineData.hasVariableFonts;
        // Only send selection information when needed for rendering whitespace
        let selectionsOnLine = null;
        if (isHighContrast(options.themeType) || renderWhitespace === 'selection') {
            const selections = viewportData.selections;
            for (const selection of selections) {
                if (selection.endLineNumber < lineNumber || selection.startLineNumber > lineNumber) {
                    // Selection does not intersect line
                    continue;
                }
                const startColumn = (selection.startLineNumber === lineNumber ? selection.startColumn : lineData.minColumn);
                const endColumn = (selection.endLineNumber === lineNumber ? selection.endColumn : lineData.maxColumn);
                if (startColumn < endColumn) {
                    if (isHighContrast(options.themeType)) {
                        actualInlineDecorations.push(new LineDecoration(startColumn, endColumn, 'inline-selected-text', 0 /* InlineDecorationType.Regular */));
                    }
                    if (renderWhitespace === 'selection') {
                        if (!selectionsOnLine) {
                            selectionsOnLine = [];
                        }
                        selectionsOnLine.push(new OffsetRange(startColumn - 1, endColumn - 1));
                    }
                }
            }
        }
        const renderLineInput = new RenderLineInput(options.useMonospaceOptimizations, options.canUseHalfwidthRightwardsArrow, lineData.content, lineData.continuesWithWrappedLine, lineData.isBasicASCII, lineData.containsRTL, lineData.minColumn - 1, lineData.tokens, actualInlineDecorations, lineData.tabSize, lineData.startVisibleColumn, options.spaceWidth, options.middotWidth, options.wsmiddotWidth, options.stopRenderingLineAfter, renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, selectionsOnLine, lineData.textDirection, options.verticalScrollbarSize);
        if (this._renderedViewLine && this._renderedViewLine.input.equals(renderLineInput)) {
            // no need to do anything, we have the same render input
            return false;
        }
        sb.appendString('<div ');
        if (lineData.textDirection === TextDirection.RTL) {
            sb.appendString('dir="rtl" ');
        }
        else if (lineData.containsRTL) {
            sb.appendString('dir="ltr" ');
        }
        sb.appendString('style="top:');
        sb.appendString(String(deltaTop));
        sb.appendString('px;height:');
        sb.appendString(String(lineHeight));
        sb.appendString('px;line-height:');
        sb.appendString(String(lineHeight));
        if (lineData.textDirection === TextDirection.RTL) {
            sb.appendString('px;padding-right:');
            sb.appendString(String(options.verticalScrollbarSize));
        }
        sb.appendString('px;" class="');
        sb.appendString(ViewLine.CLASS_NAME);
        sb.appendString('">');
        const output = renderViewLine(renderLineInput, sb);
        sb.appendString('</div>');
        let renderedViewLine = null;
        if (allowFastRendering
            && monospaceAssumptionsAreValid
            && canUseFastRenderedViewLine
            && lineData.isBasicASCII
            && renderLineInput.isLTR
            && options.useMonospaceOptimizations
            && output.containsForeignElements === 0 /* ForeignElementType.None */) {
            renderedViewLine = new FastRenderedViewLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping);
        }
        if (!renderedViewLine) {
            renderedViewLine = createRenderedLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping, output.containsForeignElements);
        }
        this._renderedViewLine = renderedViewLine;
        return true;
    }
    layoutLine(lineNumber, deltaTop, lineHeight) {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            this._renderedViewLine.domNode.setTop(deltaTop);
            this._renderedViewLine.domNode.setHeight(lineHeight);
            this._renderedViewLine.domNode.setLineHeight(lineHeight);
        }
    }
    // --- end IVisibleLineData
    isRenderedRTL() {
        if (!this._renderedViewLine) {
            return false;
        }
        return this._renderedViewLine.input.textDirection === TextDirection.RTL;
    }
    getWidth(context) {
        if (!this._renderedViewLine) {
            return 0;
        }
        return this._renderedViewLine.getWidth(context);
    }
    getWidthIsFast() {
        if (!this._renderedViewLine) {
            return true;
        }
        return this._renderedViewLine.getWidthIsFast();
    }
    needsMonospaceFontCheck() {
        if (!this._renderedViewLine) {
            return false;
        }
        return (this._renderedViewLine instanceof FastRenderedViewLine);
    }
    monospaceAssumptionsAreValid() {
        if (!this._renderedViewLine) {
            return monospaceAssumptionsAreValid;
        }
        if (this._renderedViewLine instanceof FastRenderedViewLine) {
            return this._renderedViewLine.monospaceAssumptionsAreValid();
        }
        return monospaceAssumptionsAreValid;
    }
    onMonospaceAssumptionsInvalidated() {
        if (this._renderedViewLine && this._renderedViewLine instanceof FastRenderedViewLine) {
            this._renderedViewLine = this._renderedViewLine.toSlowRenderedLine();
        }
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this._renderedViewLine) {
            return null;
        }
        startColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, startColumn));
        endColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, endColumn));
        const stopRenderingLineAfter = this._renderedViewLine.input.stopRenderingLineAfter;
        if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1 && endColumn > stopRenderingLineAfter + 1) {
            // This range is obviously not visible
            return new VisibleRanges(true, [new FloatHorizontalRange(this.getWidth(context), 0)]);
        }
        if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1) {
            startColumn = stopRenderingLineAfter + 1;
        }
        if (stopRenderingLineAfter !== -1 && endColumn > stopRenderingLineAfter + 1) {
            endColumn = stopRenderingLineAfter + 1;
        }
        const horizontalRanges = this._renderedViewLine.getVisibleRangesForRange(lineNumber, startColumn, endColumn, context);
        if (horizontalRanges && horizontalRanges.length > 0) {
            return new VisibleRanges(false, horizontalRanges);
        }
        return null;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        if (!this._renderedViewLine) {
            return 1;
        }
        return this._renderedViewLine.getColumnOfNodeOffset(spanNode, offset);
    }
}
var Constants;
(function (Constants) {
    /**
     * It seems that rounding errors occur with long lines, so the purely multiplication based
     * method is only viable for short lines. For longer lines, we look up the real position of
     * every 300th character and use multiplication based on that.
     *
     * See https://github.com/microsoft/vscode/issues/33178
     */
    Constants[Constants["MaxMonospaceDistance"] = 300] = "MaxMonospaceDistance";
})(Constants || (Constants = {}));
/**
 * A rendered line which is guaranteed to contain only regular ASCII and is rendered with a monospace font.
 */
class FastRenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping) {
        this._cachedWidth = -1;
        this.domNode = domNode;
        this.input = renderLineInput;
        const keyColumnCount = Math.floor(renderLineInput.lineContent.length / 300 /* Constants.MaxMonospaceDistance */);
        if (keyColumnCount > 0) {
            this._keyColumnPixelOffsetCache = new Float32Array(keyColumnCount);
            for (let i = 0; i < keyColumnCount; i++) {
                this._keyColumnPixelOffsetCache[i] = -1;
            }
        }
        else {
            this._keyColumnPixelOffsetCache = null;
        }
        this._characterMapping = characterMapping;
        this._charWidth = renderLineInput.spaceWidth;
    }
    getWidth(context) {
        if (!this.domNode || this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(this._characterMapping.length);
            return Math.round(this._charWidth * horizontalOffset);
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        return (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) || this._cachedWidth !== -1;
    }
    monospaceAssumptionsAreValid() {
        if (!this.domNode) {
            return monospaceAssumptionsAreValid;
        }
        if (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const expectedWidth = this.getWidth(null);
            const actualWidth = this.domNode.domNode.firstChild.offsetWidth;
            if (Math.abs(expectedWidth - actualWidth) >= 2) {
                // more than 2px off
                console.warn(`monospace assumptions have been violated, therefore disabling monospace optimizations!`);
                monospaceAssumptionsAreValid = false;
            }
        }
        return monospaceAssumptionsAreValid;
    }
    toSlowRenderedLine() {
        return createRenderedLine(this.domNode, this.input, this._characterMapping, 0 /* ForeignElementType.None */);
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        const startPosition = this._getColumnPixelOffset(lineNumber, startColumn, context);
        const endPosition = this._getColumnPixelOffset(lineNumber, endColumn, context);
        return [new FloatHorizontalRange(startPosition, endPosition - startPosition)];
    }
    _getColumnPixelOffset(lineNumber, column, context) {
        if (column <= 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnOrdinal = Math.floor((column - 1) / 300 /* Constants.MaxMonospaceDistance */) - 1;
        const keyColumn = (keyColumnOrdinal + 1) * 300 /* Constants.MaxMonospaceDistance */ + 1;
        let keyColumnPixelOffset = -1;
        if (this._keyColumnPixelOffsetCache) {
            keyColumnPixelOffset = this._keyColumnPixelOffsetCache[keyColumnOrdinal];
            if (keyColumnPixelOffset === -1) {
                keyColumnPixelOffset = this._actualReadPixelOffset(lineNumber, keyColumn, context);
                this._keyColumnPixelOffsetCache[keyColumnOrdinal] = keyColumnPixelOffset;
            }
        }
        if (keyColumnPixelOffset === -1) {
            // Could not read actual key column pixel offset
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnHorizontalOffset = this._characterMapping.getHorizontalOffset(keyColumn);
        const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
        return keyColumnPixelOffset + this._charWidth * (horizontalOffset - keyColumnHorizontalOffset);
    }
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    _actualReadPixelOffset(lineNumber, column, context) {
        if (!this.domNode) {
            return -1;
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(this.domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        return r[0].left;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
/**
 * Every time we render a line, we save what we have rendered in an instance of this class.
 */
class RenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping, containsForeignElements) {
        this.domNode = domNode;
        this.input = renderLineInput;
        this._characterMapping = characterMapping;
        this._isWhitespaceOnly = /^\s*$/.test(renderLineInput.lineContent);
        this._containsForeignElements = containsForeignElements;
        this._cachedWidth = -1;
        this._pixelOffsetCache = null;
        if (renderLineInput.isLTR) {
            this._pixelOffsetCache = new Float32Array(Math.max(2, this._characterMapping.length + 1));
            for (let column = 0, len = this._characterMapping.length; column <= len; column++) {
                this._pixelOffsetCache[column] = -1;
            }
        }
    }
    // --- Reading from the DOM methods
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    /**
     * Width of the line in pixels
     */
    getWidth(context) {
        if (!this.domNode) {
            return 0;
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        if (this._cachedWidth === -1) {
            return false;
        }
        return true;
    }
    /**
     * Visible ranges for a model range
     */
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this.domNode) {
            return null;
        }
        if (this._pixelOffsetCache !== null) {
            // the text is guaranteed to be entirely LTR
            const startOffset = this._readPixelOffset(this.domNode, lineNumber, startColumn, context);
            if (startOffset === -1) {
                return null;
            }
            const endOffset = this._readPixelOffset(this.domNode, lineNumber, endColumn, context);
            if (endOffset === -1) {
                return null;
            }
            return [new FloatHorizontalRange(startOffset, endOffset - startOffset)];
        }
        return this._readVisibleRangesForRange(this.domNode, lineNumber, startColumn, endColumn, context);
    }
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        if (startColumn === endColumn) {
            const pixelOffset = this._readPixelOffset(domNode, lineNumber, startColumn, context);
            if (pixelOffset === -1) {
                return null;
            }
            else {
                return [new FloatHorizontalRange(pixelOffset, 0)];
            }
        }
        else {
            return this._readRawVisibleRangesForRange(domNode, startColumn, endColumn, context);
        }
    }
    _readPixelOffset(domNode, lineNumber, column, context) {
        if (this.input.isLTR && this._characterMapping.length === 0) {
            // This line has no content
            if (this._containsForeignElements === 0 /* ForeignElementType.None */) {
                // We can assume the line is really empty
                return 0;
            }
            if (this._containsForeignElements === 2 /* ForeignElementType.After */) {
                // We have foreign elements after the (empty) line
                return 0;
            }
            if (this._containsForeignElements === 1 /* ForeignElementType.Before */) {
                // We have foreign elements before the (empty) line
                return this.getWidth(context);
            }
            // We have foreign elements before & after the (empty) line
            const readingTarget = this._getReadingTarget(domNode);
            if (readingTarget.firstChild) {
                context.markDidDomLayout();
                return readingTarget.firstChild.offsetWidth;
            }
            else {
                return 0;
            }
        }
        if (this._pixelOffsetCache !== null) {
            // the text is guaranteed to be LTR
            const cachedPixelOffset = this._pixelOffsetCache[column];
            if (cachedPixelOffset !== -1) {
                return cachedPixelOffset;
            }
            const result = this._actualReadPixelOffset(domNode, lineNumber, column, context);
            this._pixelOffsetCache[column] = result;
            return result;
        }
        return this._actualReadPixelOffset(domNode, lineNumber, column, context);
    }
    _actualReadPixelOffset(domNode, lineNumber, column, context) {
        if (this._characterMapping.length === 0) {
            // This line has no content
            const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), 0, 0, 0, 0, context);
            if (!r || r.length === 0) {
                return -1;
            }
            return r[0].left;
        }
        if (this.input.isLTR && column === this._characterMapping.length && this._isWhitespaceOnly && this._containsForeignElements === 0 /* ForeignElementType.None */) {
            // This branch helps in the case of whitespace only lines which have a width set
            return this.getWidth(context);
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        const result = r[0].left;
        if (this.input.isBasicASCII) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            const expectedResult = Math.round(this.input.spaceWidth * horizontalOffset);
            if (Math.abs(expectedResult - result) <= 1) {
                return expectedResult;
            }
        }
        return result;
    }
    _readRawVisibleRangesForRange(domNode, startColumn, endColumn, context) {
        if (this.input.isLTR && startColumn === 1 && endColumn === this._characterMapping.length) {
            // This branch helps IE with bidi text & gives a performance boost to other browsers when reading visible ranges for an entire line
            return [new FloatHorizontalRange(0, this.getWidth(context))];
        }
        const startDomPosition = this._characterMapping.getDomPosition(startColumn);
        const endDomPosition = this._characterMapping.getDomPosition(endColumn);
        return RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), startDomPosition.partIndex, startDomPosition.charIndex, endDomPosition.partIndex, endDomPosition.charIndex, context);
    }
    /**
     * Returns the column for the text found at a specific offset inside a rendered dom node
     */
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
class WebKitRenderedViewLine extends RenderedViewLine {
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        const output = super._readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context);
        if (!output || output.length === 0 || startColumn === endColumn || (startColumn === 1 && endColumn === this._characterMapping.length)) {
            return output;
        }
        // WebKit is buggy and returns an expanded range (to contain words in some cases)
        // The last client rect is enlarged (I think)
        if (this.input.isLTR) {
            // This is an attempt to patch things up
            // Find position of last column
            const endPixelOffset = this._readPixelOffset(domNode, lineNumber, endColumn, context);
            if (endPixelOffset !== -1) {
                const lastRange = output[output.length - 1];
                if (lastRange.left < endPixelOffset) {
                    // Trim down the width of the last visible range to not go after the last column's position
                    lastRange.width = endPixelOffset - lastRange.left;
                }
            }
        }
        return output;
    }
}
const createRenderedLine = (function () {
    if (browser.isWebKit) {
        return createWebKitRenderedLine;
    }
    return createNormalRenderedLine;
})();
function createWebKitRenderedLine(domNode, renderLineInput, characterMapping, containsForeignElements) {
    return new WebKitRenderedViewLine(domNode, renderLineInput, characterMapping, containsForeignElements);
}
function createNormalRenderedLine(domNode, renderLineInput, characterMapping, containsForeignElements) {
    return new RenderedViewLine(domNode, renderLineInput, characterMapping, containsForeignElements);
}
export function getColumnOfNodeOffset(characterMapping, spanNode, offset) {
    const spanNodeTextContentLength = spanNode.textContent.length;
    let spanIndex = -1;
    while (spanNode) {
        spanNode = spanNode.previousSibling;
        spanIndex++;
    }
    return characterMapping.getColumn(new DomPosition(spanIndex, offset), spanNodeTextContentLength);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3TGluZXMvdmlld0xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUUzQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBd0MsZUFBZSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQW9CLE1BQU0sZ0RBQWdELENBQUM7QUFFdEssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSTlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFekQsTUFBTSwwQkFBMEIsR0FBRyxDQUFDO0lBQ25DLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZCLDBEQUEwRDtRQUMxRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFD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