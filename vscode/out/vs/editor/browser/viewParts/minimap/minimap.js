/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './minimap.css';
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { GlobalPointerMoveMonitor } from '../../../../base/browser/globalPointerMoveMonitor.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { RenderedLinesCollection } from '../../view/viewLayer.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { MINIMAP_GUTTER_WIDTH, EditorLayoutInfoComputer } from '../../../common/config/editorOptions.js';
import { Range } from '../../../common/core/range.js';
import { RGBA8 } from '../../../common/core/misc/rgba.js';
import { MinimapTokensColorTracker } from '../../../common/viewModel/minimapTokensColorTracker.js';
import { minimapSelection, minimapBackground, minimapForegroundOpacity, editorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { Selection } from '../../../common/core/selection.js';
import { EventType, Gesture } from '../../../../base/browser/touch.js';
import { MinimapCharRendererFactory } from './minimapCharRendererFactory.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { LRUCache } from '../../../../base/common/map.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { ViewModelDecoration } from '../../../common/viewModel/viewModelDecoration.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const POINTER_DRAG_RESET_DISTANCE = 140;
const GUTTER_DECORATION_WIDTH = 2;
class MinimapOptions {
    constructor(configuration, theme, tokensColorTracker) {
        const options = configuration.options;
        const pixelRatio = options.get(162 /* EditorOption.pixelRatio */);
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const minimapLayout = layoutInfo.minimap;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const minimapOpts = options.get(81 /* EditorOption.minimap */);
        this.renderMinimap = minimapLayout.renderMinimap;
        this.size = minimapOpts.size;
        this.minimapHeightIsEditorHeight = minimapLayout.minimapHeightIsEditorHeight;
        this.scrollBeyondLastLine = options.get(118 /* EditorOption.scrollBeyondLastLine */);
        this.paddingTop = options.get(95 /* EditorOption.padding */).top;
        this.paddingBottom = options.get(95 /* EditorOption.padding */).bottom;
        this.showSlider = minimapOpts.showSlider;
        this.autohide = minimapOpts.autohide;
        this.pixelRatio = pixelRatio;
        this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this.lineHeight = options.get(75 /* EditorOption.lineHeight */);
        this.minimapLeft = minimapLayout.minimapLeft;
        this.minimapWidth = minimapLayout.minimapWidth;
        this.minimapHeight = layoutInfo.height;
        this.canvasInnerWidth = minimapLayout.minimapCanvasInnerWidth;
        this.canvasInnerHeight = minimapLayout.minimapCanvasInnerHeight;
        this.canvasOuterWidth = minimapLayout.minimapCanvasOuterWidth;
        this.canvasOuterHeight = minimapLayout.minimapCanvasOuterHeight;
        this.isSampling = minimapLayout.minimapIsSampling;
        this.editorHeight = layoutInfo.height;
        this.fontScale = minimapLayout.minimapScale;
        this.minimapLineHeight = minimapLayout.minimapLineHeight;
        this.minimapCharWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.fontScale;
        this.sectionHeaderFontFamily = DEFAULT_FONT_FAMILY;
        this.sectionHeaderFontSize = minimapOpts.sectionHeaderFontSize * pixelRatio;
        this.sectionHeaderLetterSpacing = minimapOpts.sectionHeaderLetterSpacing; // intentionally not multiplying by pixelRatio
        this.sectionHeaderFontColor = MinimapOptions._getSectionHeaderColor(theme, tokensColorTracker.getColor(1 /* ColorId.DefaultForeground */));
        this.charRenderer = createSingleCallFunction(() => MinimapCharRendererFactory.create(this.fontScale, fontInfo.fontFamily));
        this.defaultBackgroundColor = tokensColorTracker.getColor(2 /* ColorId.DefaultBackground */);
        this.backgroundColor = MinimapOptions._getMinimapBackground(theme, this.defaultBackgroundColor);
        this.foregroundAlpha = MinimapOptions._getMinimapForegroundOpacity(theme);
    }
    static _getMinimapBackground(theme, defaultBackgroundColor) {
        const themeColor = theme.getColor(minimapBackground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultBackgroundColor;
    }
    static _getMinimapForegroundOpacity(theme) {
        const themeColor = theme.getColor(minimapForegroundOpacity);
        if (themeColor) {
            return RGBA8._clamp(Math.round(255 * themeColor.rgba.a));
        }
        return 255;
    }
    static _getSectionHeaderColor(theme, defaultForegroundColor) {
        const themeColor = theme.getColor(editorForeground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultForegroundColor;
    }
    equals(other) {
        return (this.renderMinimap === other.renderMinimap
            && this.size === other.size
            && this.minimapHeightIsEditorHeight === other.minimapHeightIsEditorHeight
            && this.scrollBeyondLastLine === other.scrollBeyondLastLine
            && this.paddingTop === other.paddingTop
            && this.paddingBottom === other.paddingBottom
            && this.showSlider === other.showSlider
            && this.autohide === other.autohide
            && this.pixelRatio === other.pixelRatio
            && this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth
            && this.lineHeight === other.lineHeight
            && this.minimapLeft === other.minimapLeft
            && this.minimapWidth === other.minimapWidth
            && this.minimapHeight === other.minimapHeight
            && this.canvasInnerWidth === other.canvasInnerWidth
            && this.canvasInnerHeight === other.canvasInnerHeight
            && this.canvasOuterWidth === other.canvasOuterWidth
            && this.canvasOuterHeight === other.canvasOuterHeight
            && this.isSampling === other.isSampling
            && this.editorHeight === other.editorHeight
            && this.fontScale === other.fontScale
            && this.minimapLineHeight === other.minimapLineHeight
            && this.minimapCharWidth === other.minimapCharWidth
            && this.sectionHeaderFontSize === other.sectionHeaderFontSize
            && this.sectionHeaderLetterSpacing === other.sectionHeaderLetterSpacing
            && this.defaultBackgroundColor && this.defaultBackgroundColor.equals(other.defaultBackgroundColor)
            && this.backgroundColor && this.backgroundColor.equals(other.backgroundColor)
            && this.foregroundAlpha === other.foregroundAlpha);
    }
}
class MinimapLayout {
    constructor(
    /**
     * The given editor scrollTop (input).
     */
    scrollTop, 
    /**
     * The given editor scrollHeight (input).
     */
    scrollHeight, sliderNeeded, _computedSliderRatio, 
    /**
     * slider dom node top (in CSS px)
     */
    sliderTop, 
    /**
     * slider dom node height (in CSS px)
     */
    sliderHeight, 
    /**
     * empty lines to reserve at the top of the minimap.
     */
    topPaddingLineCount, 
    /**
     * minimap render start line number.
     */
    startLineNumber, 
    /**
     * minimap render end line number.
     */
    endLineNumber) {
        this.scrollTop = scrollTop;
        this.scrollHeight = scrollHeight;
        this.sliderNeeded = sliderNeeded;
        this._computedSliderRatio = _computedSliderRatio;
        this.sliderTop = sliderTop;
        this.sliderHeight = sliderHeight;
        this.topPaddingLineCount = topPaddingLineCount;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
    /**
     * Compute a desired `scrollPosition` such that the slider moves by `delta`.
     */
    getDesiredScrollTopFromDelta(delta) {
        return Math.round(this.scrollTop + delta / this._computedSliderRatio);
    }
    getDesiredScrollTopFromTouchLocation(pageY) {
        return Math.round((pageY - this.sliderHeight / 2) / this._computedSliderRatio);
    }
    /**
     * Intersect a line range with `this.startLineNumber` and `this.endLineNumber`.
     */
    intersectWithViewport(range) {
        const startLineNumber = Math.max(this.startLineNumber, range.startLineNumber);
        const endLineNumber = Math.min(this.endLineNumber, range.endLineNumber);
        if (startLineNumber > endLineNumber) {
            // entirely outside minimap's viewport
            return null;
        }
        return [startLineNumber, endLineNumber];
    }
    /**
     * Get the inner minimap y coordinate for a line number.
     */
    getYForLineNumber(lineNumber, minimapLineHeight) {
        return +(lineNumber - this.startLineNumber + this.topPaddingLineCount) * minimapLineHeight;
    }
    static create(options, viewportStartLineNumber, viewportEndLineNumber, viewportStartLineNumberVerticalOffset, viewportHeight, viewportContainsWhitespaceGaps, lineCount, realLineCount, scrollTop, scrollHeight, previousLayout) {
        const pixelRatio = options.pixelRatio;
        const minimapLineHeight = options.minimapLineHeight;
        const minimapLinesFitting = Math.floor(options.canvasInnerHeight / minimapLineHeight);
        const lineHeight = options.lineHeight;
        if (options.minimapHeightIsEditorHeight) {
            let logicalScrollHeight = (realLineCount * options.lineHeight
                + options.paddingTop
                + options.paddingBottom);
            if (options.scrollBeyondLastLine) {
                logicalScrollHeight += Math.max(0, viewportHeight - options.lineHeight - options.paddingBottom);
            }
            const sliderHeight = Math.max(1, Math.floor(viewportHeight * viewportHeight / logicalScrollHeight));
            const maxMinimapSliderTop = Math.max(0, options.minimapHeight - sliderHeight);
            // The slider can move from 0 to `maxMinimapSliderTop`
            // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
            const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
            const sliderTop = (scrollTop * computedSliderRatio);
            const sliderNeeded = (maxMinimapSliderTop > 0);
            const maxLinesFitting = Math.floor(options.canvasInnerHeight / options.minimapLineHeight);
            const topPaddingLineCount = Math.floor(options.paddingTop / options.lineHeight);
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, topPaddingLineCount, 1, Math.min(lineCount, maxLinesFitting));
        }
        // The visible line count in a viewport can change due to a number of reasons:
        //  a) with the same viewport width, different scroll positions can result in partial lines being visible:
        //    e.g. for a line height of 20, and a viewport height of 600
        //          * scrollTop = 0  => visible lines are [1, 30]
        //          * scrollTop = 10 => visible lines are [1, 31] (with lines 1 and 31 partially visible)
        //          * scrollTop = 20 => visible lines are [2, 31]
        //  b) whitespace gaps might make their way in the viewport (which results in a decrease in the visible line count)
        //  c) we could be in the scroll beyond last line case (which also results in a decrease in the visible line count, down to possibly only one line being visible)
        // We must first establish a desirable slider height.
        let sliderHeight;
        if (viewportContainsWhitespaceGaps && viewportEndLineNumber !== lineCount) {
            // case b) from above: there are whitespace gaps in the viewport.
            // In this case, the height of the slider directly reflects the visible line count.
            const viewportLineCount = viewportEndLineNumber - viewportStartLineNumber + 1;
            sliderHeight = Math.floor(viewportLineCount * minimapLineHeight / pixelRatio);
        }
        else {
            // The slider has a stable height
            const expectedViewportLineCount = viewportHeight / lineHeight;
            sliderHeight = Math.floor(expectedViewportLineCount * minimapLineHeight / pixelRatio);
        }
        const extraLinesAtTheTop = Math.floor(options.paddingTop / lineHeight);
        let extraLinesAtTheBottom = Math.floor(options.paddingBottom / lineHeight);
        if (options.scrollBeyondLastLine) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            extraLinesAtTheBottom = Math.max(extraLinesAtTheBottom, expectedViewportLineCount - 1);
        }
        let maxMinimapSliderTop;
        if (extraLinesAtTheBottom > 0) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            // The minimap slider, when dragged all the way down, will contain the last line at its top
            maxMinimapSliderTop = (extraLinesAtTheTop + lineCount + extraLinesAtTheBottom - expectedViewportLineCount - 1) * minimapLineHeight / pixelRatio;
        }
        else {
            // The minimap slider, when dragged all the way down, will contain the last line at its bottom
            maxMinimapSliderTop = Math.max(0, (extraLinesAtTheTop + lineCount) * minimapLineHeight / pixelRatio - sliderHeight);
        }
        maxMinimapSliderTop = Math.min(options.minimapHeight - sliderHeight, maxMinimapSliderTop);
        // The slider can move from 0 to `maxMinimapSliderTop`
        // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
        const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
        const sliderTop = (scrollTop * computedSliderRatio);
        if (minimapLinesFitting >= extraLinesAtTheTop + lineCount + extraLinesAtTheBottom) {
            // All lines fit in the minimap
            const sliderNeeded = (maxMinimapSliderTop > 0);
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, extraLinesAtTheTop, 1, lineCount);
        }
        else {
            let consideringStartLineNumber;
            if (viewportStartLineNumber > 1) {
                consideringStartLineNumber = viewportStartLineNumber + extraLinesAtTheTop;
            }
            else {
                consideringStartLineNumber = Math.max(1, scrollTop / lineHeight);
            }
            let topPaddingLineCount;
            let startLineNumber = Math.max(1, Math.floor(consideringStartLineNumber - sliderTop * pixelRatio / minimapLineHeight));
            if (startLineNumber < extraLinesAtTheTop) {
                topPaddingLineCount = extraLinesAtTheTop - startLineNumber + 1;
                startLineNumber = 1;
            }
            else {
                topPaddingLineCount = 0;
                startLineNumber = Math.max(1, startLineNumber - extraLinesAtTheTop);
            }
            // Avoid flickering caused by a partial viewport start line
            // by being consistent w.r.t. the previous layout decision
            if (previousLayout && previousLayout.scrollHeight === scrollHeight) {
                if (previousLayout.scrollTop > scrollTop) {
                    // Scrolling up => never increase `startLineNumber`
                    startLineNumber = Math.min(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.max(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
                if (previousLayout.scrollTop < scrollTop) {
                    // Scrolling down => never decrease `startLineNumber`
                    startLineNumber = Math.max(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.min(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
            }
            const endLineNumber = Math.min(lineCount, startLineNumber - topPaddingLineCount + minimapLinesFitting - 1);
            const partialLine = (scrollTop - viewportStartLineNumberVerticalOffset) / lineHeight;
            let sliderTopAligned;
            if (scrollTop >= options.paddingTop) {
                sliderTopAligned = (viewportStartLineNumber - startLineNumber + topPaddingLineCount + partialLine) * minimapLineHeight / pixelRatio;
            }
            else {
                sliderTopAligned = (scrollTop / options.paddingTop) * (topPaddingLineCount + partialLine) * minimapLineHeight / pixelRatio;
            }
            return new MinimapLayout(scrollTop, scrollHeight, true, computedSliderRatio, sliderTopAligned, sliderHeight, topPaddingLineCount, startLineNumber, endLineNumber);
        }
    }
}
class MinimapLine {
    static { this.INVALID = new MinimapLine(-1); }
    constructor(dy) {
        this.dy = dy;
    }
    onContentChanged() {
        this.dy = -1;
    }
    onTokensChanged() {
        this.dy = -1;
    }
}
class RenderData {
    constructor(renderedLayout, imageData, lines) {
        this.renderedLayout = renderedLayout;
        this._imageData = imageData;
        this._renderedLines = new RenderedLinesCollection({
            createLine: () => MinimapLine.INVALID
        });
        this._renderedLines._set(renderedLayout.startLineNumber, lines);
    }
    /**
     * Check if the current RenderData matches accurately the new desired layout and no painting is needed.
     */
    linesEquals(layout) {
        if (!this.scrollEquals(layout)) {
            return false;
        }
        const tmp = this._renderedLines._get();
        const lines = tmp.lines;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].dy === -1) {
                // This line is invalid
                return false;
            }
        }
        return true;
    }
    /**
     * Check if the current RenderData matches the new layout's scroll position
     */
    scrollEquals(layout) {
        return this.renderedLayout.startLineNumber === layout.startLineNumber
            && this.renderedLayout.endLineNumber === layout.endLineNumber;
    }
    _get() {
        const tmp = this._renderedLines._get();
        return {
            imageData: this._imageData,
            rendLineNumberStart: tmp.rendLineNumberStart,
            lines: tmp.lines
        };
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        return this._renderedLines.onLinesChanged(changeFromLineNumber, changeCount);
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._renderedLines.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._renderedLines.onLinesInserted(insertFromLineNumber, insertToLineNumber);
    }
    onTokensChanged(ranges) {
        return this._renderedLines.onTokensChanged(ranges);
    }
}
/**
 * Some sort of double buffering.
 *
 * Keeps two buffers around that will be rotated for painting.
 * Always gives a buffer that is filled with the background color.
 */
class MinimapBuffers {
    constructor(ctx, WIDTH, HEIGHT, background) {
        this._backgroundFillData = MinimapBuffers._createBackgroundFillData(WIDTH, HEIGHT, background);
        this._buffers = [
            ctx.createImageData(WIDTH, HEIGHT),
            ctx.createImageData(WIDTH, HEIGHT)
        ];
        this._lastUsedBuffer = 0;
    }
    getBuffer() {
        // rotate buffers
        this._lastUsedBuffer = 1 - this._lastUsedBuffer;
        const result = this._buffers[this._lastUsedBuffer];
        // fill with background color
        result.data.set(this._backgroundFillData);
        return result;
    }
    static _createBackgroundFillData(WIDTH, HEIGHT, background) {
        const backgroundR = background.r;
        const backgroundG = background.g;
        const backgroundB = background.b;
        const backgroundA = background.a;
        const result = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
        let offset = 0;
        for (let i = 0; i < HEIGHT; i++) {
            for (let j = 0; j < WIDTH; j++) {
                result[offset] = backgroundR;
                result[offset + 1] = backgroundG;
                result[offset + 2] = backgroundB;
                result[offset + 3] = backgroundA;
                offset += 4;
            }
        }
        return result;
    }
}
class MinimapSamplingState {
    static compute(options, viewLineCount, oldSamplingState) {
        if (options.renderMinimap === 0 /* RenderMinimap.None */ || !options.isSampling) {
            return [null, []];
        }
        // ratio is intentionally not part of the layout to avoid the layout changing all the time
        // so we need to recompute it again...
        const { minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
            viewLineCount: viewLineCount,
            scrollBeyondLastLine: options.scrollBeyondLastLine,
            paddingTop: options.paddingTop,
            paddingBottom: options.paddingBottom,
            height: options.editorHeight,
            lineHeight: options.lineHeight,
            pixelRatio: options.pixelRatio
        });
        const ratio = viewLineCount / minimapLineCount;
        const halfRatio = ratio / 2;
        if (!oldSamplingState || oldSamplingState.minimapLines.length === 0) {
            const result = [];
            result[0] = 1;
            if (minimapLineCount > 1) {
                for (let i = 0, lastIndex = minimapLineCount - 1; i < lastIndex; i++) {
                    result[i] = Math.round(i * ratio + halfRatio);
                }
                result[minimapLineCount - 1] = viewLineCount;
            }
            return [new MinimapSamplingState(ratio, result), []];
        }
        const oldMinimapLines = oldSamplingState.minimapLines;
        const oldLength = oldMinimapLines.length;
        const result = [];
        let oldIndex = 0;
        let oldDeltaLineCount = 0;
        let minViewLineNumber = 1;
        const MAX_EVENT_COUNT = 10; // generate at most 10 events, if there are more than 10 changes, just flush all previous data
        let events = [];
        let lastEvent = null;
        for (let i = 0; i < minimapLineCount; i++) {
            const fromViewLineNumber = Math.max(minViewLineNumber, Math.round(i * ratio));
            const toViewLineNumber = Math.max(fromViewLineNumber, Math.round((i + 1) * ratio));
            while (oldIndex < oldLength && oldMinimapLines[oldIndex] < fromViewLineNumber) {
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                        lastEvent.deleteToLineNumber++;
                    }
                    else {
                        lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumber: oldMinimapLineNumber, deleteToLineNumber: oldMinimapLineNumber };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount--;
                }
                oldIndex++;
            }
            let selectedViewLineNumber;
            if (oldIndex < oldLength && oldMinimapLines[oldIndex] <= toViewLineNumber) {
                // reuse the old sampled line
                selectedViewLineNumber = oldMinimapLines[oldIndex];
                oldIndex++;
            }
            else {
                if (i === 0) {
                    selectedViewLineNumber = 1;
                }
                else if (i + 1 === minimapLineCount) {
                    selectedViewLineNumber = viewLineCount;
                }
                else {
                    selectedViewLineNumber = Math.round(i * ratio + halfRatio);
                }
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'inserted' && lastEvent._i === i - 1) {
                        lastEvent.insertToLineNumber++;
                    }
                    else {
                        lastEvent = { type: 'inserted', _i: i, insertFromLineNumber: oldMinimapLineNumber, insertToLineNumber: oldMinimapLineNumber };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount++;
                }
            }
            result[i] = selectedViewLineNumber;
            minViewLineNumber = selectedViewLineNumber;
        }
        if (events.length < MAX_EVENT_COUNT) {
            while (oldIndex < oldLength) {
                const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                    lastEvent.deleteToLineNumber++;
                }
                else {
                    lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumber: oldMinimapLineNumber, deleteToLineNumber: oldMinimapLineNumber };
                    events.push(lastEvent);
                }
                oldDeltaLineCount--;
                oldIndex++;
            }
        }
        else {
            // too many events, just give up
            events = [{ type: 'flush' }];
        }
        return [new MinimapSamplingState(ratio, result), events];
    }
    constructor(samplingRatio, minimapLines // a map of 0-based minimap line indexes to 1-based view line numbers
    ) {
        this.samplingRatio = samplingRatio;
        this.minimapLines = minimapLines;
    }
    modelLineToMinimapLine(lineNumber) {
        return Math.min(this.minimapLines.length, Math.max(1, Math.round(lineNumber / this.samplingRatio)));
    }
    /**
     * Will return null if the model line ranges are not intersecting with a sampled model line.
     */
    modelLineRangeToMinimapLineRange(fromLineNumber, toLineNumber) {
        let fromLineIndex = this.modelLineToMinimapLine(fromLineNumber) - 1;
        while (fromLineIndex > 0 && this.minimapLines[fromLineIndex - 1] >= fromLineNumber) {
            fromLineIndex--;
        }
        let toLineIndex = this.modelLineToMinimapLine(toLineNumber) - 1;
        while (toLineIndex + 1 < this.minimapLines.length && this.minimapLines[toLineIndex + 1] <= toLineNumber) {
            toLineIndex++;
        }
        if (fromLineIndex === toLineIndex) {
            const sampledLineNumber = this.minimapLines[fromLineIndex];
            if (sampledLineNumber < fromLineNumber || sampledLineNumber > toLineNumber) {
                // This line is not part of the sampled lines ==> nothing to do
                return null;
            }
        }
        return [fromLineIndex + 1, toLineIndex + 1];
    }
    /**
     * Will always return a range, even if it is not intersecting with a sampled model line.
     */
    decorationLineRangeToMinimapLineRange(startLineNumber, endLineNumber) {
        let minimapLineStart = this.modelLineToMinimapLine(startLineNumber);
        let minimapLineEnd = this.modelLineToMinimapLine(endLineNumber);
        if (startLineNumber !== endLineNumber && minimapLineEnd === minimapLineStart) {
            if (minimapLineEnd === this.minimapLines.length) {
                if (minimapLineStart > 1) {
                    minimapLineStart--;
                }
            }
            else {
                minimapLineEnd++;
            }
        }
        return [minimapLineStart, minimapLineEnd];
    }
    onLinesDeleted(e) {
        // have the mapping be sticky
        const deletedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        let changeStartIndex = this.minimapLines.length;
        let changeEndIndex = 0;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            if (this.minimapLines[i] <= e.toLineNumber) {
                // this line got deleted => move to previous available
                this.minimapLines[i] = Math.max(1, e.fromLineNumber - 1);
                changeStartIndex = Math.min(changeStartIndex, i);
                changeEndIndex = Math.max(changeEndIndex, i);
            }
            else {
                this.minimapLines[i] -= deletedLineCount;
            }
        }
        return [changeStartIndex, changeEndIndex];
    }
    onLinesInserted(e) {
        // have the mapping be sticky
        const insertedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            this.minimapLines[i] += insertedLineCount;
        }
    }
}
/**
 * The minimap appears beside the editor scroll bar and visualizes a zoomed out
 * view of the file.
 */
export class Minimap extends ViewPart {
    constructor(context) {
        super(context);
        this._sectionHeaderCache = new LRUCache(10, 1.5);
        this.tokensColorTracker = MinimapTokensColorTracker.getInstance();
        this._selections = [];
        this._minimapSelections = null;
        this.options = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        const [samplingState,] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), null);
        this._samplingState = samplingState;
        this._shouldCheckSampling = false;
        this._actual = new InnerMinimap(context.theme, this);
    }
    dispose() {
        this._actual.dispose();
        super.dispose();
    }
    getDomNode() {
        return this._actual.getDomNode();
    }
    _onOptionsMaybeChanged() {
        const opts = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        if (this.options.equals(opts)) {
            return false;
        }
        this.options = opts;
        this._recreateLineSampling();
        this._actual.onDidChangeOptions();
        return true;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        return this._onOptionsMaybeChanged();
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        this._minimapSelections = null;
        return this._actual.onSelectionChanged();
    }
    onDecorationsChanged(e) {
        if (e.affectsMinimap) {
            return this._actual.onDecorationsChanged();
        }
        return false;
    }
    onFlushed(e) {
        if (this._samplingState) {
            this._shouldCheckSampling = true;
        }
        return this._actual.onFlushed();
    }
    onLinesChanged(e) {
        if (this._samplingState) {
            const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(e.fromLineNumber, e.fromLineNumber + e.count - 1);
            if (minimapLineRange) {
                return this._actual.onLinesChanged(minimapLineRange[0], minimapLineRange[1] - minimapLineRange[0] + 1);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onLinesChanged(e.fromLineNumber, e.count);
        }
    }
    onLinesDeleted(e) {
        if (this._samplingState) {
            const [changeStartIndex, changeEndIndex] = this._samplingState.onLinesDeleted(e);
            if (changeStartIndex <= changeEndIndex) {
                this._actual.onLinesChanged(changeStartIndex + 1, changeEndIndex - changeStartIndex + 1);
            }
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onLinesInserted(e) {
        if (this._samplingState) {
            this._samplingState.onLinesInserted(e);
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesInserted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onScrollChanged(e) {
        return this._actual.onScrollChanged(e);
    }
    onThemeChanged(e) {
        this._actual.onThemeChanged();
        this._onOptionsMaybeChanged();
        return true;
    }
    onTokensChanged(e) {
        if (this._samplingState) {
            const ranges = [];
            for (const range of e.ranges) {
                const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(range.fromLineNumber, range.toLineNumber);
                if (minimapLineRange) {
                    ranges.push({ fromLineNumber: minimapLineRange[0], toLineNumber: minimapLineRange[1] });
                }
            }
            if (ranges.length) {
                return this._actual.onTokensChanged(ranges);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onTokensChanged(e.ranges);
        }
    }
    onTokensColorsChanged(e) {
        this._onOptionsMaybeChanged();
        return this._actual.onTokensColorsChanged();
    }
    onZonesChanged(e) {
        return this._actual.onZonesChanged();
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (this._shouldCheckSampling) {
            this._shouldCheckSampling = false;
            this._recreateLineSampling();
        }
    }
    render(ctx) {
        let viewportStartLineNumber = ctx.visibleRange.startLineNumber;
        let viewportEndLineNumber = ctx.visibleRange.endLineNumber;
        if (this._samplingState) {
            viewportStartLineNumber = this._samplingState.modelLineToMinimapLine(viewportStartLineNumber);
            viewportEndLineNumber = this._samplingState.modelLineToMinimapLine(viewportEndLineNumber);
        }
        const minimapCtx = {
            viewportContainsWhitespaceGaps: (ctx.viewportData.whitespaceViewportData.length > 0),
            scrollWidth: ctx.scrollWidth,
            scrollHeight: ctx.scrollHeight,
            viewportStartLineNumber: viewportStartLineNumber,
            viewportEndLineNumber: viewportEndLineNumber,
            viewportStartLineNumberVerticalOffset: ctx.getVerticalOffsetForLineNumber(viewportStartLineNumber),
            scrollTop: ctx.scrollTop,
            scrollLeft: ctx.scrollLeft,
            viewportWidth: ctx.viewportWidth,
            viewportHeight: ctx.viewportHeight,
        };
        this._actual.render(minimapCtx);
    }
    //#region IMinimapModel
    _recreateLineSampling() {
        this._minimapSelections = null;
        const wasSampling = Boolean(this._samplingState);
        const [samplingState, events] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), this._samplingState);
        this._samplingState = samplingState;
        if (wasSampling && this._samplingState) {
            // was sampling, is sampling
            for (const event of events) {
                switch (event.type) {
                    case 'deleted':
                        this._actual.onLinesDeleted(event.deleteFromLineNumber, event.deleteToLineNumber);
                        break;
                    case 'inserted':
                        this._actual.onLinesInserted(event.insertFromLineNumber, event.insertToLineNumber);
                        break;
                    case 'flush':
                        this._actual.onFlushed();
                        break;
                }
            }
        }
    }
    getLineCount() {
        if (this._samplingState) {
            return this._samplingState.minimapLines.length;
        }
        return this._context.viewModel.getLineCount();
    }
    getRealLineCount() {
        return this._context.viewModel.getLineCount();
    }
    getLineContent(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineContent(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineContent(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineMaxColumn(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineMaxColumn(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        if (this._samplingState) {
            const result = [];
            for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
                if (needed[lineIndex]) {
                    result[lineIndex] = this._context.viewModel.getViewLineData(this._samplingState.minimapLines[startLineNumber + lineIndex - 1]);
                }
                else {
                    result[lineIndex] = null;
                }
            }
            return result;
        }
        return this._context.viewModel.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed).data;
    }
    getSelections() {
        if (this._minimapSelections === null) {
            if (this._samplingState) {
                this._minimapSelections = [];
                for (const selection of this._selections) {
                    const [minimapLineStart, minimapLineEnd] = this._samplingState.decorationLineRangeToMinimapLineRange(selection.startLineNumber, selection.endLineNumber);
                    this._minimapSelections.push(new Selection(minimapLineStart, selection.startColumn, minimapLineEnd, selection.endColumn));
                }
            }
            else {
                this._minimapSelections = this._selections;
            }
        }
        return this._minimapSelections;
    }
    getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber)
            .filter(decoration => !decoration.options.minimap?.sectionHeaderStyle);
    }
    getSectionHeaderDecorationsInViewport(startLineNumber, endLineNumber) {
        const headerHeightInMinimapLines = this.options.sectionHeaderFontSize / this.options.minimapLineHeight;
        startLineNumber = Math.floor(Math.max(1, startLineNumber - headerHeightInMinimapLines));
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber)
            .filter(decoration => !!decoration.options.minimap?.sectionHeaderStyle);
    }
    _getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        let visibleRange;
        if (this._samplingState) {
            const modelStartLineNumber = this._samplingState.minimapLines[startLineNumber - 1];
            const modelEndLineNumber = this._samplingState.minimapLines[endLineNumber - 1];
            visibleRange = new Range(modelStartLineNumber, 1, modelEndLineNumber, this._context.viewModel.getLineMaxColumn(modelEndLineNumber));
        }
        else {
            visibleRange = new Range(startLineNumber, 1, endLineNumber, this._context.viewModel.getLineMaxColumn(endLineNumber));
        }
        const decorations = this._context.viewModel.getMinimapDecorationsInRange(visibleRange);
        if (this._samplingState) {
            const result = [];
            for (const decoration of decorations) {
                if (!decoration.options.minimap) {
                    continue;
                }
                const range = decoration.range;
                const minimapStartLineNumber = this._samplingState.modelLineToMinimapLine(range.startLineNumber);
                const minimapEndLineNumber = this._samplingState.modelLineToMinimapLine(range.endLineNumber);
                result.push(new ViewModelDecoration(new Range(minimapStartLineNumber, range.startColumn, minimapEndLineNumber, range.endColumn), decoration.options));
            }
            return result;
        }
        return decorations;
    }
    getSectionHeaderText(decoration, fitWidth) {
        const headerText = decoration.options.minimap?.sectionHeaderText;
        if (!headerText) {
            return null;
        }
        const cachedText = this._sectionHeaderCache.get(headerText);
        if (cachedText) {
            return cachedText;
        }
        const fittedText = fitWidth(headerText);
        this._sectionHeaderCache.set(headerText, fittedText);
        return fittedText;
    }
    getOptions() {
        return this._context.viewModel.model.getOptions();
    }
    revealLineNumber(lineNumber) {
        if (this._samplingState) {
            lineNumber = this._samplingState.minimapLines[lineNumber - 1];
        }
        this._context.viewModel.revealRange('mouse', false, new Range(lineNumber, 1, lineNumber, 1), 1 /* viewEvents.VerticalRevealType.Center */, 0 /* ScrollType.Smooth */);
    }
    setScrollTop(scrollTop) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollTop
        }, 1 /* ScrollType.Immediate */);
    }
}
class InnerMinimap extends Disposable {
    constructor(theme, model) {
        super();
        this._renderDecorations = false;
        this._gestureInProgress = false;
        this._isMouseOverMinimap = false;
        this._theme = theme;
        this._model = model;
        this._lastRenderData = null;
        this._buffers = null;
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._domNode, 9 /* PartFingerprint.Minimap */);
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
        this._domNode.setPosition('absolute');
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._shadow = createFastDomNode(document.createElement('div'));
        this._shadow.setClassName('minimap-shadow-hidden');
        this._domNode.appendChild(this._shadow);
        this._canvas = createFastDomNode(document.createElement('canvas'));
        this._canvas.setPosition('absolute');
        this._canvas.setLeft(0);
        this._domNode.appendChild(this._canvas);
        this._decorationsCanvas = createFastDomNode(document.createElement('canvas'));
        this._decorationsCanvas.setPosition('absolute');
        this._decorationsCanvas.setClassName('minimap-decorations-layer');
        this._decorationsCanvas.setLeft(0);
        this._domNode.appendChild(this._decorationsCanvas);
        this._slider = createFastDomNode(document.createElement('div'));
        this._slider.setPosition('absolute');
        this._slider.setClassName('minimap-slider');
        this._slider.setLayerHinting(true);
        this._slider.setContain('strict');
        this._domNode.appendChild(this._slider);
        this._sliderHorizontal = createFastDomNode(document.createElement('div'));
        this._sliderHorizontal.setPosition('absolute');
        this._sliderHorizontal.setClassName('minimap-slider-horizontal');
        this._slider.appendChild(this._sliderHorizontal);
        this._applyLayout();
        this._hideDelayedScheduler = this._register(new RunOnceScheduler(() => this._hideImmediatelyIfMouseIsOutside(), 500));
        this._register(dom.addStandardDisposableListener(this._domNode.domNode, dom.EventType.MOUSE_OVER, () => {
            this._isMouseOverMinimap = true;
        }));
        this._register(dom.addStandardDisposableListener(this._domNode.domNode, dom.EventType.MOUSE_LEAVE, () => {
            this._isMouseOverMinimap = false;
        }));
        this._pointerDownListener = dom.addStandardDisposableListener(this._domNode.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            const isMouse = (e.pointerType === 'mouse');
            const isLeftClick = (e.button === 0);
            const renderMinimap = this._model.options.renderMinimap;
            if (renderMinimap === 0 /* RenderMinimap.None */) {
                return;
            }
            if (!this._lastRenderData) {
                return;
            }
            if (this._model.options.size !== 'proportional') {
                if (isLeftClick && this._lastRenderData) {
                    // pretend the click occurred in the center of the slider
                    const position = dom.getDomNodePagePosition(this._slider.domNode);
                    const initialPosY = position.top + position.height / 2;
                    this._startSliderDragging(e, initialPosY, this._lastRenderData.renderedLayout);
                }
                return;
            }
            if (isLeftClick || !isMouse) {
                const minimapLineHeight = this._model.options.minimapLineHeight;
                const internalOffsetY = (this._model.options.canvasInnerHeight / this._model.options.canvasOuterHeight) * e.offsetY;
                const lineIndex = Math.floor(internalOffsetY / minimapLineHeight);
                let lineNumber = lineIndex + this._lastRenderData.renderedLayout.startLineNumber - this._lastRenderData.renderedLayout.topPaddingLineCount;
                lineNumber = Math.min(lineNumber, this._model.getLineCount());
                this._model.revealLineNumber(lineNumber);
            }
        });
        this._sliderPointerMoveMonitor = new GlobalPointerMoveMonitor();
        this._sliderPointerDownListener = dom.addStandardDisposableListener(this._slider.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.button === 0 && this._lastRenderData) {
                this._startSliderDragging(e, e.pageY, this._lastRenderData.renderedLayout);
            }
        });
        this._gestureDisposable = Gesture.addTarget(this._domNode.domNode);
        this._sliderTouchStartListener = dom.addDisposableListener(this._domNode.domNode, EventType.Start, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData) {
                this._slider.toggleClassName('active', true);
                this._gestureInProgress = true;
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchMoveListener = dom.addDisposableListener(this._domNode.domNode, EventType.Change, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData && this._gestureInProgress) {
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchEndListener = dom.addStandardDisposableListener(this._domNode.domNode, EventType.End, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._gestureInProgress = false;
            this._slider.toggleClassName('active', false);
        });
    }
    _hideSoon() {
        this._hideDelayedScheduler.cancel();
        this._hideDelayedScheduler.schedule();
    }
    _hideImmediatelyIfMouseIsOutside() {
        if (this._isMouseOverMinimap) {
            this._hideSoon();
            return;
        }
        this._domNode.toggleClassName('active', false);
    }
    _startSliderDragging(e, initialPosY, initialSliderState) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const initialPosX = e.pageX;
        this._slider.toggleClassName('active', true);
        const handlePointerMove = (posy, posx) => {
            const minimapPosition = dom.getDomNodePagePosition(this._domNode.domNode);
            const pointerOrthogonalDelta = Math.min(Math.abs(posx - initialPosX), Math.abs(posx - minimapPosition.left), Math.abs(posx - minimapPosition.left - minimapPosition.width));
            if (platform.isWindows && pointerOrthogonalDelta > POINTER_DRAG_RESET_DISTANCE) {
                // The pointer has wondered away from the scrollbar => reset dragging
                this._model.setScrollTop(initialSliderState.scrollTop);
                return;
            }
            const pointerDelta = posy - initialPosY;
            this._model.setScrollTop(initialSliderState.getDesiredScrollTopFromDelta(pointerDelta));
        };
        if (e.pageY !== initialPosY) {
            handlePointerMove(e.pageY, initialPosX);
        }
        this._sliderPointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, pointerMoveData => handlePointerMove(pointerMoveData.pageY, pointerMoveData.pageX), () => {
            this._slider.toggleClassName('active', false);
        });
    }
    scrollDueToTouchEvent(touch) {
        const startY = this._domNode.domNode.getBoundingClientRect().top;
        const scrollTop = this._lastRenderData.renderedLayout.getDesiredScrollTopFromTouchLocation(touch.pageY - startY);
        this._model.setScrollTop(scrollTop);
    }
    dispose() {
        this._pointerDownListener.dispose();
        this._sliderPointerMoveMonitor.dispose();
        this._sliderPointerDownListener.dispose();
        this._gestureDisposable.dispose();
        this._sliderTouchStartListener.dispose();
        this._sliderTouchMoveListener.dispose();
        this._sliderTouchEndListener.dispose();
        super.dispose();
    }
    _getMinimapDomNodeClassName() {
        const class_ = ['minimap'];
        if (this._model.options.showSlider === 'always') {
            class_.push('slider-always');
        }
        else {
            class_.push('slider-mouseover');
        }
        if (this._model.options.autohide === 'mouseover') {
            class_.push('minimap-autohide-mouseover');
        }
        else if (this._model.options.autohide === 'scroll') {
            class_.push('minimap-autohide-scroll');
        }
        return class_.join(' ');
    }
    getDomNode() {
        return this._domNode;
    }
    _applyLayout() {
        this._domNode.setLeft(this._model.options.minimapLeft);
        this._domNode.setWidth(this._model.options.minimapWidth);
        this._domNode.setHeight(this._model.options.minimapHeight);
        this._shadow.setHeight(this._model.options.minimapHeight);
        this._canvas.setWidth(this._model.options.canvasOuterWidth);
        this._canvas.setHeight(this._model.options.canvasOuterHeight);
        this._canvas.domNode.width = this._model.options.canvasInnerWidth;
        this._canvas.domNode.height = this._model.options.canvasInnerHeight;
        this._decorationsCanvas.setWidth(this._model.options.canvasOuterWidth);
        this._decorationsCanvas.setHeight(this._model.options.canvasOuterHeight);
        this._decorationsCanvas.domNode.width = this._model.options.canvasInnerWidth;
        this._decorationsCanvas.domNode.height = this._model.options.canvasInnerHeight;
        this._slider.setWidth(this._model.options.minimapWidth);
    }
    _getBuffer() {
        if (!this._buffers) {
            if (this._model.options.canvasInnerWidth > 0 && this._model.options.canvasInnerHeight > 0) {
                this._buffers = new MinimapBuffers(this._canvas.domNode.getContext('2d'), this._model.options.canvasInnerWidth, this._model.options.canvasInnerHeight, this._model.options.backgroundColor);
            }
        }
        return this._buffers ? this._buffers.getBuffer() : null;
    }
    // ---- begin view event handlers
    onDidChangeOptions() {
        this._lastRenderData = null;
        this._buffers = null;
        this._applyLayout();
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
    }
    onSelectionChanged() {
        this._renderDecorations = true;
        return true;
    }
    onDecorationsChanged() {
        this._renderDecorations = true;
        return true;
    }
    onFlushed() {
        this._lastRenderData = null;
        return true;
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        if (this._lastRenderData) {
            return this._lastRenderData.onLinesChanged(changeFromLineNumber, changeCount);
        }
        return false;
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._lastRenderData?.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
        return true;
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._lastRenderData?.onLinesInserted(insertFromLineNumber, insertToLineNumber);
        return true;
    }
    onScrollChanged(e) {
        if (this._model.options.autohide === 'scroll' && (e.scrollTopChanged || e.scrollHeightChanged)) {
            this._domNode.toggleClassName('active', true);
            this._hideSoon();
        }
        this._renderDecorations = true;
        return true;
    }
    onThemeChanged() {
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._renderDecorations = true;
        return true;
    }
    onTokensChanged(ranges) {
        if (this._lastRenderData) {
            return this._lastRenderData.onTokensChanged(ranges);
        }
        return false;
    }
    onTokensColorsChanged() {
        this._lastRenderData = null;
        this._buffers = null;
        return true;
    }
    onZonesChanged() {
        this._lastRenderData = null;
        return true;
    }
    // --- end event handlers
    render(renderingCtx) {
        const renderMinimap = this._model.options.renderMinimap;
        if (renderMinimap === 0 /* RenderMinimap.None */) {
            this._shadow.setClassName('minimap-shadow-hidden');
            this._sliderHorizontal.setWidth(0);
            this._sliderHorizontal.setHeight(0);
            return;
        }
        if (renderingCtx.scrollLeft + renderingCtx.viewportWidth >= renderingCtx.scrollWidth) {
            this._shadow.setClassName('minimap-shadow-hidden');
        }
        else {
            this._shadow.setClassName('minimap-shadow-visible');
        }
        const layout = MinimapLayout.create(this._model.options, renderingCtx.viewportStartLineNumber, renderingCtx.viewportEndLineNumber, renderingCtx.viewportStartLineNumberVerticalOffset, renderingCtx.viewportHeight, renderingCtx.viewportContainsWhitespaceGaps, this._model.getLineCount(), this._model.getRealLineCount(), renderingCtx.scrollTop, renderingCtx.scrollHeight, this._lastRenderData ? this._lastRenderData.renderedLayout : null);
        this._slider.setDisplay(layout.sliderNeeded ? 'block' : 'none');
        this._slider.setTop(layout.sliderTop);
        this._slider.setHeight(layout.sliderHeight);
        // Compute horizontal slider coordinates
        this._sliderHorizontal.setLeft(0);
        this._sliderHorizontal.setWidth(this._model.options.minimapWidth);
        this._sliderHorizontal.setTop(0);
        this._sliderHorizontal.setHeight(layout.sliderHeight);
        this.renderDecorations(layout);
        this._lastRenderData = this.renderLines(layout);
    }
    renderDecorations(layout) {
        if (this._renderDecorations) {
            this._renderDecorations = false;
            const selections = this._model.getSelections();
            selections.sort(Range.compareRangesUsingStarts);
            const decorations = this._model.getMinimapDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
            decorations.sort((a, b) => (a.options.zIndex || 0) - (b.options.zIndex || 0));
            const { canvasInnerWidth, canvasInnerHeight } = this._model.options;
            const minimapLineHeight = this._model.options.minimapLineHeight;
            const minimapCharWidth = this._model.options.minimapCharWidth;
            const tabSize = this._model.getOptions().tabSize;
            const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
            canvasContext.clearRect(0, 0, canvasInnerWidth, canvasInnerHeight);
            // We first need to render line highlights and then render decorations on top of those.
            // But we need to pick a single color for each line, and use that as a line highlight.
            // This needs to be the color of the decoration with the highest `zIndex`, but priority
            // is given to the selection.
            const highlightedLines = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, false);
            this._renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight);
            this._renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight);
            const lineOffsetMap = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, null);
            this._renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderSectionHeaders(layout);
        }
    }
    _renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        canvasContext.fillStyle = this._selectionColor.transparent(0.5).toString();
        let y1 = 0;
        let y2 = 0;
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                highlightedLines.set(line, true);
            }
            const yy1 = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
            const yy2 = layout.getYForLineNumber(endLineNumber, minimapLineHeight);
            if (y2 >= yy1) {
                // merge into previous
                y2 = yy2;
            }
            else {
                if (y2 > y1) {
                    // flush
                    canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
                }
                y1 = yy1;
                y2 = yy2;
            }
        }
        if (y2 > y1) {
            // flush
            canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
        }
    }
    _renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight) {
        const highlightColors = new Map();
        // Loop backwards to hit first decorations with higher `zIndex`
        for (let i = decorations.length - 1; i >= 0; i--) {
            const decoration = decorations[i];
            const minimapOptions = decoration.options.minimap;
            if (!minimapOptions || minimapOptions.position !== 1 /* MinimapPosition.Inline */) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            let highlightColor = highlightColors.get(decorationColor.toString());
            if (!highlightColor) {
                highlightColor = decorationColor.transparent(0.5).toString();
                highlightColors.set(decorationColor.toString(), highlightColor);
            }
            canvasContext.fillStyle = highlightColor;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                if (highlightedLines.has(line)) {
                    continue;
                }
                highlightedLines.set(line, true);
                const y = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
                canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y, canvasContext.canvas.width, minimapLineHeight);
            }
        }
    }
    _renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, lineHeight, tabSize, characterWidth, canvasInnerWidth) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                this.renderDecorationOnLine(canvasContext, lineOffsetMap, selection, this._selectionColor, layout, line, lineHeight, lineHeight, tabSize, characterWidth, canvasInnerWidth);
            }
        }
    }
    _renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth) {
        // Loop forwards to hit first decorations with lower `zIndex`
        for (const decoration of decorations) {
            const minimapOptions = decoration.options.minimap;
            if (!minimapOptions) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                switch (minimapOptions.position) {
                    case 1 /* MinimapPosition.Inline */:
                        this.renderDecorationOnLine(canvasContext, lineOffsetMap, decoration.range, decorationColor, layout, line, minimapLineHeight, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth);
                        continue;
                    case 2 /* MinimapPosition.Gutter */: {
                        const y = layout.getYForLineNumber(line, minimapLineHeight);
                        const x = 2;
                        this.renderDecoration(canvasContext, decorationColor, x, y, GUTTER_DECORATION_WIDTH, minimapLineHeight);
                        continue;
                    }
                }
            }
        }
    }
    renderDecorationOnLine(canvasContext, lineOffsetMap, decorationRange, decorationColor, layout, lineNumber, height, minimapLineHeight, tabSize, charWidth, canvasInnerWidth) {
        const y = layout.getYForLineNumber(lineNumber, minimapLineHeight);
        // Skip rendering the line if it's vertically outside our viewport
        if (y + height < 0 || y > this._model.options.canvasInnerHeight) {
            return;
        }
        const { startLineNumber, endLineNumber } = decorationRange;
        const startColumn = (startLineNumber === lineNumber ? decorationRange.startColumn : 1);
        const endColumn = (endLineNumber === lineNumber ? decorationRange.endColumn : this._model.getLineMaxColumn(lineNumber));
        const x1 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, startColumn, tabSize, charWidth, canvasInnerWidth);
        const x2 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, endColumn, tabSize, charWidth, canvasInnerWidth);
        this.renderDecoration(canvasContext, decorationColor, x1, y, x2 - x1, height);
    }
    getXOffsetForPosition(lineOffsetMap, lineNumber, column, tabSize, charWidth, canvasInnerWidth) {
        if (column === 1) {
            return MINIMAP_GUTTER_WIDTH;
        }
        const minimumXOffset = (column - 1) * charWidth;
        if (minimumXOffset >= canvasInnerWidth) {
            // there is no need to look at actual characters,
            // as this column is certainly after the minimap width
            return canvasInnerWidth;
        }
        // Cache line offset data so that it is only read once per line
        let lineIndexToXOffset = lineOffsetMap.get(lineNumber);
        if (!lineIndexToXOffset) {
            const lineData = this._model.getLineContent(lineNumber);
            lineIndexToXOffset = [MINIMAP_GUTTER_WIDTH];
            let prevx = MINIMAP_GUTTER_WIDTH;
            for (let i = 1; i < lineData.length + 1; i++) {
                const charCode = lineData.charCodeAt(i - 1);
                const dx = charCode === 9 /* CharCode.Tab */
                    ? tabSize * charWidth
                    : strings.isFullWidthCharacter(charCode)
                        ? 2 * charWidth
                        : charWidth;
                const x = prevx + dx;
                if (x >= canvasInnerWidth) {
                    // no need to keep on going, as we've hit the canvas width
                    lineIndexToXOffset[i] = canvasInnerWidth;
                    break;
                }
                lineIndexToXOffset[i] = x;
                prevx = x;
            }
            lineOffsetMap.set(lineNumber, lineIndexToXOffset);
        }
        if (column - 1 < lineIndexToXOffset.length) {
            return lineIndexToXOffset[column - 1];
        }
        // goes over the canvas width
        return canvasInnerWidth;
    }
    renderDecoration(canvasContext, decorationColor, x, y, width, height) {
        canvasContext.fillStyle = decorationColor && decorationColor.toString() || '';
        canvasContext.fillRect(x, y, width, height);
    }
    _renderSectionHeaders(layout) {
        const minimapLineHeight = this._model.options.minimapLineHeight;
        const sectionHeaderFontSize = this._model.options.sectionHeaderFontSize;
        const sectionHeaderLetterSpacing = this._model.options.sectionHeaderLetterSpacing;
        const backgroundFillHeight = sectionHeaderFontSize * 1.5;
        const { canvasInnerWidth } = this._model.options;
        const backgroundColor = this._model.options.backgroundColor;
        const backgroundFill = `rgb(${backgroundColor.r} ${backgroundColor.g} ${backgroundColor.b} / .7)`;
        const foregroundColor = this._model.options.sectionHeaderFontColor;
        const foregroundFill = `rgb(${foregroundColor.r} ${foregroundColor.g} ${foregroundColor.b})`;
        const separatorStroke = foregroundFill;
        const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
        canvasContext.letterSpacing = sectionHeaderLetterSpacing + 'px';
        canvasContext.font = '500 ' + sectionHeaderFontSize + 'px ' + this._model.options.sectionHeaderFontFamily;
        canvasContext.strokeStyle = separatorStroke;
        canvasContext.lineWidth = 0.4;
        const decorations = this._model.getSectionHeaderDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
        decorations.sort((a, b) => a.range.startLineNumber - b.range.startLineNumber);
        const fitWidth = InnerMinimap._fitSectionHeader.bind(null, canvasContext, canvasInnerWidth - MINIMAP_GUTTER_WIDTH);
        for (const decoration of decorations) {
            const y = layout.getYForLineNumber(decoration.range.startLineNumber, minimapLineHeight) + sectionHeaderFontSize;
            const backgroundFillY = y - sectionHeaderFontSize;
            const separatorY = backgroundFillY + 2;
            const headerText = this._model.getSectionHeaderText(decoration, fitWidth);
            InnerMinimap._renderSectionLabel(canvasContext, headerText, decoration.options.minimap?.sectionHeaderStyle === 2 /* MinimapSectionHeaderStyle.Underlined */, backgroundFill, foregroundFill, canvasInnerWidth, backgroundFillY, backgroundFillHeight, y, separatorY);
        }
    }
    static _fitSectionHeader(target, maxWidth, headerText) {
        if (!headerText) {
            return headerText;
        }
        const ellipsis = '…';
        const width = target.measureText(headerText).width;
        const ellipsisWidth = target.measureText(ellipsis).width;
        if (width <= maxWidth || width <= ellipsisWidth) {
            return headerText;
        }
        const len = headerText.length;
        const averageCharWidth = width / headerText.length;
        const maxCharCount = Math.floor((maxWidth - ellipsisWidth) / averageCharWidth) - 1;
        // Find a halfway point that isn't after whitespace
        let halfCharCount = Math.ceil(maxCharCount / 2);
        while (halfCharCount > 0 && /\s/.test(headerText[halfCharCount - 1])) {
            --halfCharCount;
        }
        // Split with ellipsis
        return headerText.substring(0, halfCharCount)
            + ellipsis + headerText.substring(len - (maxCharCount - halfCharCount));
    }
    static _renderSectionLabel(target, headerText, hasSeparatorLine, backgroundFill, foregroundFill, minimapWidth, backgroundFillY, backgroundFillHeight, textY, separatorY) {
        if (headerText) {
            target.fillStyle = backgroundFill;
            target.fillRect(0, backgroundFillY, minimapWidth, backgroundFillHeight);
            target.fillStyle = foregroundFill;
            target.fillText(headerText, MINIMAP_GUTTER_WIDTH, textY);
        }
        if (hasSeparatorLine) {
            target.beginPath();
            target.moveTo(0, separatorY);
            target.lineTo(minimapWidth, separatorY);
            target.closePath();
            target.stroke();
        }
    }
    renderLines(layout) {
        const startLineNumber = layout.startLineNumber;
        const endLineNumber = layout.endLineNumber;
        const minimapLineHeight = this._model.options.minimapLineHeight;
        // Check if nothing changed w.r.t. lines from last frame
        if (this._lastRenderData && this._lastRenderData.linesEquals(layout)) {
            const _lastData = this._lastRenderData._get();
            // Nice!! Nothing changed from last frame
            return new RenderData(layout, _lastData.imageData, _lastData.lines);
        }
        // Oh well!! We need to repaint some lines...
        const imageData = this._getBuffer();
        if (!imageData) {
            // 0 width or 0 height canvas, nothing to do
            return null;
        }
        // Render untouched lines by using last rendered data.
        const [_dirtyY1, _dirtyY2, needed] = InnerMinimap._renderUntouchedLines(imageData, layout.topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, this._lastRenderData);
        // Fetch rendering info from view model for rest of lines that need rendering.
        const lineInfo = this._model.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed);
        const tabSize = this._model.getOptions().tabSize;
        const defaultBackground = this._model.options.defaultBackgroundColor;
        const background = this._model.options.backgroundColor;
        const foregroundAlpha = this._model.options.foregroundAlpha;
        const tokensColorTracker = this._model.tokensColorTracker;
        const useLighterFont = tokensColorTracker.backgroundIsLight();
        const renderMinimap = this._model.options.renderMinimap;
        const charRenderer = this._model.options.charRenderer();
        const fontScale = this._model.options.fontScale;
        const minimapCharWidth = this._model.options.minimapCharWidth;
        const baseCharHeight = (renderMinimap === 1 /* RenderMinimap.Text */ ? 2 /* Constants.BASE_CHAR_HEIGHT */ : 2 /* Constants.BASE_CHAR_HEIGHT */ + 1);
        const renderMinimapLineHeight = baseCharHeight * fontScale;
        const innerLinePadding = (minimapLineHeight > renderMinimapLineHeight ? Math.floor((minimapLineHeight - renderMinimapLineHeight) / 2) : 0);
        // Render the rest of lines
        const backgroundA = background.a / 255;
        const renderBackground = new RGBA8(Math.round((background.r - defaultBackground.r) * backgroundA + defaultBackground.r), Math.round((background.g - defaultBackground.g) * backgroundA + defaultBackground.g), Math.round((background.b - defaultBackground.b) * backgroundA + defaultBackground.b), 255);
        let dy = layout.topPaddingLineCount * minimapLineHeight;
        const renderedLines = [];
        for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
            if (needed[lineIndex]) {
                InnerMinimap._renderLine(imageData, renderBackground, background.a, useLighterFont, renderMinimap, minimapCharWidth, tokensColorTracker, foregroundAlpha, charRenderer, dy, innerLinePadding, tabSize, lineInfo[lineIndex], fontScale, minimapLineHeight);
            }
            renderedLines[lineIndex] = new MinimapLine(dy);
            dy += minimapLineHeight;
        }
        const dirtyY1 = (_dirtyY1 === -1 ? 0 : _dirtyY1);
        const dirtyY2 = (_dirtyY2 === -1 ? imageData.height : _dirtyY2);
        const dirtyHeight = dirtyY2 - dirtyY1;
        // Finally, paint to the canvas
        const ctx = this._canvas.domNode.getContext('2d');
        ctx.putImageData(imageData, 0, 0, 0, dirtyY1, imageData.width, dirtyHeight);
        // Save rendered data for reuse on next frame if possible
        return new RenderData(layout, imageData, renderedLines);
    }
    static _renderUntouchedLines(target, topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, lastRenderData) {
        const needed = [];
        if (!lastRenderData) {
            for (let i = 0, len = endLineNumber - startLineNumber + 1; i < len; i++) {
                needed[i] = true;
            }
            return [-1, -1, needed];
        }
        const _lastData = lastRenderData._get();
        const lastTargetData = _lastData.imageData.data;
        const lastStartLineNumber = _lastData.rendLineNumberStart;
        const lastLines = _lastData.lines;
        const lastLinesLength = lastLines.length;
        const WIDTH = target.width;
        const targetData = target.data;
        const maxDestPixel = (endLineNumber - startLineNumber + 1) * minimapLineHeight * WIDTH * 4;
        let dirtyPixel1 = -1; // the pixel offset up to which all the data is equal to the prev frame
        let dirtyPixel2 = -1; // the pixel offset after which all the data is equal to the prev frame
        let copySourceStart = -1;
        let copySourceEnd = -1;
        let copyDestStart = -1;
        let copyDestEnd = -1;
        let dest_dy = topPaddingLineCount * minimapLineHeight;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - startLineNumber;
            const lastLineIndex = lineNumber - lastStartLineNumber;
            const source_dy = (lastLineIndex >= 0 && lastLineIndex < lastLinesLength ? lastLines[lastLineIndex].dy : -1);
            if (source_dy === -1) {
                needed[lineIndex] = true;
                dest_dy += minimapLineHeight;
                continue;
            }
            const sourceStart = source_dy * WIDTH * 4;
            const sourceEnd = (source_dy + minimapLineHeight) * WIDTH * 4;
            const destStart = dest_dy * WIDTH * 4;
            const destEnd = (dest_dy + minimapLineHeight) * WIDTH * 4;
            if (copySourceEnd === sourceStart && copyDestEnd === destStart) {
                // contiguous zone => extend copy request
                copySourceEnd = sourceEnd;
                copyDestEnd = destEnd;
            }
            else {
                if (copySourceStart !== -1) {
                    // flush existing copy request
                    targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
                    if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                        dirtyPixel1 = copySourceEnd;
                    }
                    if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
                        dirtyPixel2 = copySourceStart;
                    }
                }
                copySourceStart = sourceStart;
                copySourceEnd = sourceEnd;
                copyDestStart = destStart;
                copyDestEnd = destEnd;
            }
            needed[lineIndex] = false;
            dest_dy += minimapLineHeight;
        }
        if (copySourceStart !== -1) {
            // flush existing copy request
            targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
            if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                dirtyPixel1 = copySourceEnd;
            }
            if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
                dirtyPixel2 = copySourceStart;
            }
        }
        const dirtyY1 = (dirtyPixel1 === -1 ? -1 : dirtyPixel1 / (WIDTH * 4));
        const dirtyY2 = (dirtyPixel2 === -1 ? -1 : dirtyPixel2 / (WIDTH * 4));
        return [dirtyY1, dirtyY2, needed];
    }
    static _renderLine(target, backgroundColor, backgroundAlpha, useLighterFont, renderMinimap, charWidth, colorTracker, foregroundAlpha, minimapCharRenderer, dy, innerLinePadding, tabSize, lineData, fontScale, minimapLineHeight) {
        const content = lineData.content;
        const tokens = lineData.tokens;
        const maxDx = target.width - charWidth;
        const force1pxHeight = (minimapLineHeight === 1);
        let dx = MINIMAP_GUTTER_WIDTH;
        let charIndex = 0;
        let tabsCharDelta = 0;
        for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
            const tokenEndIndex = tokens.getEndOffset(tokenIndex);
            const tokenColorId = tokens.getForeground(tokenIndex);
            const tokenColor = colorTracker.getColor(tokenColorId);
            for (; charIndex < tokenEndIndex; charIndex++) {
                if (dx > maxDx) {
                    // hit edge of minimap
                    return;
                }
                const charCode = content.charCodeAt(charIndex);
                if (charCode === 9 /* CharCode.Tab */) {
                    const insertSpacesCount = tabSize - (charIndex + tabsCharDelta) % tabSize;
                    tabsCharDelta += insertSpacesCount - 1;
                    // No need to render anything since tab is invisible
                    dx += insertSpacesCount * charWidth;
                }
                else if (charCode === 32 /* CharCode.Space */) {
                    // No need to render anything since space is invisible
                    dx += charWidth;
                }
                else {
                    // Render twice for a full width character
                    const count = strings.isFullWidthCharacter(charCode) ? 2 : 1;
                    for (let i = 0; i < count; i++) {
                        if (renderMinimap === 2 /* RenderMinimap.Blocks */) {
                            minimapCharRenderer.blockRenderChar(target, dx, dy + innerLinePadding, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, force1pxHeight);
                        }
                        else { // RenderMinimap.Text
                            minimapCharRenderer.renderChar(target, dx, dy + innerLinePadding, charCode, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, fontScale, useLighterFont, force1pxHeight);
                        }
                        dx += charWidth;
                        if (dx > maxDx) {
                            // hit edge of minimap
                            return;
                        }
                    }
                }
            }
        }
    }
}
class ContiguousLineMap {
    constructor(startLineNumber, endLineNumber, defaultValue) {
        this._startLineNumber = startLineNumber;
        this._endLineNumber = endLineNumber;
        this._defaultValue = defaultValue;
        this._values = [];
        for (let i = 0, count = this._endLineNumber - this._startLineNumber + 1; i < count; i++) {
            this._values[i] = defaultValue;
        }
    }
    has(lineNumber) {
        return (this.get(lineNumber) !== this._defaultValue);
    }
    set(lineNumber, value) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return;
        }
        this._values[lineNumber - this._startLineNumber] = value;
    }
    get(lineNumber) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return this._defaultValue;
        }
        return this._values[lineNumber - this._startLineNumber];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL21pbmltYXAvbWluaW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGVBQWUsQ0FBQztBQUN2QixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRWhHLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFTLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDekUsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNyRixPQUFPLEVBQStCLG9CQUFvQixFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQU0xRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQU1uRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVySixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsT0FB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