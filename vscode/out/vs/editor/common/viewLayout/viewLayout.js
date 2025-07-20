/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Scrollable } from '../../../base/common/scrollable.js';
import { LinesLayout } from './linesLayout.js';
import { Viewport } from '../viewModel.js';
import { ContentSizeChangedEvent } from '../viewModelEventDispatcher.js';
const SMOOTH_SCROLLING_TIME = 125;
class EditorScrollDimensions {
    constructor(width, contentWidth, height, contentHeight) {
        width = width | 0;
        contentWidth = contentWidth | 0;
        height = height | 0;
        contentHeight = contentHeight | 0;
        if (width < 0) {
            width = 0;
        }
        if (contentWidth < 0) {
            contentWidth = 0;
        }
        if (height < 0) {
            height = 0;
        }
        if (contentHeight < 0) {
            contentHeight = 0;
        }
        this.width = width;
        this.contentWidth = contentWidth;
        this.scrollWidth = Math.max(width, contentWidth);
        this.height = height;
        this.contentHeight = contentHeight;
        this.scrollHeight = Math.max(height, contentHeight);
    }
    equals(other) {
        return (this.width === other.width
            && this.contentWidth === other.contentWidth
            && this.height === other.height
            && this.contentHeight === other.contentHeight);
    }
}
class EditorScrollable extends Disposable {
    constructor(smoothScrollDuration, scheduleAtNextAnimationFrame) {
        super();
        this._onDidContentSizeChange = this._register(new Emitter());
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._dimensions = new EditorScrollDimensions(0, 0, 0, 0);
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration,
            scheduleAtNextAnimationFrame
        }));
        this.onDidScroll = this._scrollable.onScroll;
    }
    getScrollable() {
        return this._scrollable;
    }
    setSmoothScrollDuration(smoothScrollDuration) {
        this._scrollable.setSmoothScrollDuration(smoothScrollDuration);
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    getScrollDimensions() {
        return this._dimensions;
    }
    setScrollDimensions(dimensions) {
        if (this._dimensions.equals(dimensions)) {
            return;
        }
        const oldDimensions = this._dimensions;
        this._dimensions = dimensions;
        this._scrollable.setScrollDimensions({
            width: dimensions.width,
            scrollWidth: dimensions.scrollWidth,
            height: dimensions.height,
            scrollHeight: dimensions.scrollHeight
        }, true);
        const contentWidthChanged = (oldDimensions.contentWidth !== dimensions.contentWidth);
        const contentHeightChanged = (oldDimensions.contentHeight !== dimensions.contentHeight);
        if (contentWidthChanged || contentHeightChanged) {
            this._onDidContentSizeChange.fire(new ContentSizeChangedEvent(oldDimensions.contentWidth, oldDimensions.contentHeight, dimensions.contentWidth, dimensions.contentHeight));
        }
    }
    getFutureScrollPosition() {
        return this._scrollable.getFutureScrollPosition();
    }
    getCurrentScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    setScrollPositionNow(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    setScrollPositionSmooth(update) {
        this._scrollable.setScrollPositionSmooth(update);
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
}
export class ViewLayout extends Disposable {
    constructor(configuration, lineCount, customLineHeightData, scheduleAtNextAnimationFrame) {
        super();
        this._configuration = configuration;
        const options = this._configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const padding = options.get(95 /* EditorOption.padding */);
        this._linesLayout = new LinesLayout(lineCount, options.get(75 /* EditorOption.lineHeight */), padding.top, padding.bottom, customLineHeightData);
        this._maxLineWidth = 0;
        this._overlayWidgetsMinWidth = 0;
        this._scrollable = this._register(new EditorScrollable(0, scheduleAtNextAnimationFrame));
        this._configureSmoothScrollDuration();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(layoutInfo.contentWidth, 0, layoutInfo.height, 0));
        this.onDidScroll = this._scrollable.onDidScroll;
        this.onDidContentSizeChange = this._scrollable.onDidContentSizeChange;
        this._updateHeight();
    }
    dispose() {
        super.dispose();
    }
    getScrollable() {
        return this._scrollable.getScrollable();
    }
    onHeightMaybeChanged() {
        this._updateHeight();
    }
    _configureSmoothScrollDuration() {
        this._scrollable.setSmoothScrollDuration(this._configuration.options.get(129 /* EditorOption.smoothScrolling */) ? SMOOTH_SCROLLING_TIME : 0);
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._configuration.options;
        if (e.hasChanged(75 /* EditorOption.lineHeight */)) {
            this._linesLayout.setDefaultLineHeight(options.get(75 /* EditorOption.lineHeight */));
        }
        if (e.hasChanged(95 /* EditorOption.padding */)) {
            const padding = options.get(95 /* EditorOption.padding */);
            this._linesLayout.setPadding(padding.top, padding.bottom);
        }
        if (e.hasChanged(164 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
            const width = layoutInfo.contentWidth;
            const height = layoutInfo.height;
            const scrollDimensions = this._scrollable.getScrollDimensions();
            const contentWidth = scrollDimensions.contentWidth;
            this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
        }
        else {
            this._updateHeight();
        }
        if (e.hasChanged(129 /* EditorOption.smoothScrolling */)) {
            this._configureSmoothScrollDuration();
        }
    }
    onFlushed(lineCount, customLineHeightData) {
        this._linesLayout.onFlushed(lineCount, customLineHeightData);
    }
    onLinesDeleted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesDeleted(fromLineNumber, toLineNumber);
    }
    onLinesInserted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesInserted(fromLineNumber, toLineNumber);
    }
    // ---- end view event handlers
    _getHorizontalScrollbarHeight(width, scrollWidth) {
        const options = this._configuration.options;
        const scrollbar = options.get(116 /* EditorOption.scrollbar */);
        if (scrollbar.horizontal === 2 /* ScrollbarVisibility.Hidden */) {
            // horizontal scrollbar not visible
            return 0;
        }
        if (width >= scrollWidth) {
            // horizontal scrollbar not visible
            return 0;
        }
        return scrollbar.horizontalScrollbarSize;
    }
    _getContentHeight(width, height, contentWidth) {
        const options = this._configuration.options;
        let result = this._linesLayout.getLinesTotalHeight();
        if (options.get(118 /* EditorOption.scrollBeyondLastLine */)) {
            result += Math.max(0, height - options.get(75 /* EditorOption.lineHeight */) - options.get(95 /* EditorOption.padding */).bottom);
        }
        else if (!options.get(116 /* EditorOption.scrollbar */).ignoreHorizontalScrollbarInContentHeight) {
            result += this._getHorizontalScrollbarHeight(width, contentWidth);
        }
        return result;
    }
    _updateHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const width = scrollDimensions.width;
        const height = scrollDimensions.height;
        const contentWidth = scrollDimensions.contentWidth;
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
    }
    // ---- Layouting logic
    getCurrentViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    getFutureViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    _computeContentWidth() {
        const options = this._configuration.options;
        const maxLineWidth = this._maxLineWidth;
        const wrappingInfo = options.get(165 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        if (wrappingInfo.isViewportWrapping) {
            const minimap = options.get(81 /* EditorOption.minimap */);
            if (maxLineWidth > layoutInfo.contentWidth + fontInfo.typicalHalfwidthCharacterWidth) {
                // This is a case where viewport wrapping is on, but the line extends above the viewport
                if (minimap.enabled && minimap.side === 'right') {
                    // We need to accomodate the scrollbar width
                    return maxLineWidth + layoutInfo.verticalScrollbarWidth;
                }
            }
            return maxLineWidth;
        }
        else {
            const extraHorizontalSpace = options.get(117 /* EditorOption.scrollBeyondLastColumn */) * fontInfo.typicalHalfwidthCharacterWidth;
            const whitespaceMinWidth = this._linesLayout.getWhitespaceMinWidth();
            return Math.max(maxLineWidth + extraHorizontalSpace + layoutInfo.verticalScrollbarWidth, whitespaceMinWidth, this._overlayWidgetsMinWidth);
        }
    }
    setMaxLineWidth(maxLineWidth) {
        this._maxLineWidth = maxLineWidth;
        this._updateContentWidth();
    }
    setOverlayWidgetsMinWidth(maxMinWidth) {
        this._overlayWidgetsMinWidth = maxMinWidth;
        this._updateContentWidth();
    }
    _updateContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(scrollDimensions.width, this._computeContentWidth(), scrollDimensions.height, scrollDimensions.contentHeight));
        // The height might depend on the fact that there is a horizontal scrollbar or not
        this._updateHeight();
    }
    // ---- view state
    saveState() {
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        const scrollTop = currentScrollPosition.scrollTop;
        const firstLineNumberInViewport = this._linesLayout.getLineNumberAtOrAfterVerticalOffset(scrollTop);
        const whitespaceAboveFirstLine = this._linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(firstLineNumberInViewport);
        return {
            scrollTop: scrollTop,
            scrollTopWithoutViewZones: scrollTop - whitespaceAboveFirstLine,
            scrollLeft: currentScrollPosition.scrollLeft
        };
    }
    // ----
    changeWhitespace(callback) {
        const hadAChange = this._linesLayout.changeWhitespace(callback);
        if (hadAChange) {
            this.onHeightMaybeChanged();
        }
        return hadAChange;
    }
    changeSpecialLineHeights(callback) {
        const hadAChange = this._linesLayout.changeLineHeights(callback);
        if (hadAChange) {
            this.onHeightMaybeChanged();
        }
        return hadAChange;
    }
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetForLineNumber(lineNumber, includeViewZones);
    }
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones);
    }
    getLineHeightForLineNumber(lineNumber) {
        return this._linesLayout.getLineHeightForLineNumber(lineNumber);
    }
    isAfterLines(verticalOffset) {
        return this._linesLayout.isAfterLines(verticalOffset);
    }
    isInTopPadding(verticalOffset) {
        return this._linesLayout.isInTopPadding(verticalOffset);
    }
    isInBottomPadding(verticalOffset) {
        return this._linesLayout.isInBottomPadding(verticalOffset);
    }
    getLineNumberAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getLineNumberAtOrAfterVerticalOffset(verticalOffset);
    }
    getWhitespaceAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getWhitespaceAtVerticalOffset(verticalOffset);
    }
    getLinesViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getLinesViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getLinesViewportDataAtScrollTop(scrollTop) {
        // do some minimal validations on scrollTop
        const scrollDimensions = this._scrollable.getScrollDimensions();
        if (scrollTop + scrollDimensions.height > scrollDimensions.scrollHeight) {
            scrollTop = scrollDimensions.scrollHeight - scrollDimensions.height;
        }
        if (scrollTop < 0) {
            scrollTop = 0;
        }
        return this._linesLayout.getLinesViewportData(scrollTop, scrollTop + scrollDimensions.height);
    }
    getWhitespaceViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getWhitespaceViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getWhitespaces() {
        return this._linesLayout.getWhitespaces();
    }
    // ----
    getContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentWidth;
    }
    getScrollWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollWidth;
    }
    getContentHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentHeight;
    }
    getScrollHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollHeight;
    }
    getCurrentScrollLeft() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollLeft;
    }
    getCurrentScrollTop() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollTop;
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    setScrollPosition(position, type) {
        if (type === 1 /* ScrollType.Immediate */) {
            this._scrollable.setScrollPositionNow(position);
        }
        else {
            this._scrollable.setScrollPositionSmooth(position);
        }
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
    deltaScrollNow(deltaScrollLeft, deltaScrollTop) {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        this._scrollable.setScrollPositionNow({
            scrollLeft: currentScrollPosition.scrollLeft + deltaScrollLeft,
            scrollTop: currentScrollPosition.scrollTop + deltaScrollTop
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheW91dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L3ZpZXdMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQWdDLFVBQVUsRUFBMkMsTUFBTSxvQ0FBb0MsQ0FBQztBQUl2SSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFvSixRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3TCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUd6RSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQUVsQyxNQUFNLHNCQUFzQjtJQVUzQixZQUNDLEtBQWEsRUFDYixZQUFvQixFQUNwQixNQUFjLEVBQ2QsYUFBcUI7UUFFckIsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDbEIsWUFBWSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEIsYUFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFFbEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUNELElBQUksWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDO1FBQ0QsSUFBSSxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxNQUFNLENBQUMsS0FBNkI7UUFDMUMsT0FBTyxDQUNOLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUs7ZUFDdkIsSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLLENBQUMsWUFBWTtlQUN4QyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNO2VBQzVCLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FDN0MsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQVV4QyxZQUFZLG9CQUE0QixFQUFFLDRCQUFtRTtRQUM1RyxLQUFLLEVBQUUsQ0FBQztRQUpRLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTJCLENBQUMsQ0FBQztRQUNsRiwyQkFBc0IsR0FBbUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztRQUkzRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDO1lBQ2hELGtCQUFrQixFQUFFLElBQUk7WUFDeEIsb0JBQW9CO1lBQ3BCLDRCQUE0QjtTQUM1QixDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7SUFDOUMsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFTSx1QkFBdUIsQ0FBQyxvQkFBNEI7UUFDMUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxjQUFrQztRQUMvRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFVBQWtDO1FBQzVELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDdkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFFOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztZQUNwQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7WUFDdkIsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXO1lBQ25DLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVk7U0FDckMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVULE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxhQUFhLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRixNQUFNLG9CQUFvQixHQUFHLENBQUMsYUFBYSxDQUFDLGFBQWEsS0FBSyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEYsSUFBSSxtQkFBbUIsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSx1QkFBdUIsQ0FDNUQsYUFBYSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsYUFBYSxFQUN2RCxVQUFVLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQ2pELENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU0sdUJBQXVCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDcEQsQ0FBQztJQUVNLG9CQUFvQixDQUFDLE1BQTBCO1FBQ3JELElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLHVCQUF1QixDQUFDLE1BQTBCO1FBQ3hELElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLHlCQUF5QjtRQUMvQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLFVBQVU7SUFXekMsWUFBWSxhQUFtQyxFQUFFLFNBQWlCLEVBQUUsb0JBQTZDLEVBQUUsNEJBQW1FO1FBQ3JMLEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7UUFDNUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXNCLENBQUM7UUFFbEQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDeEksSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1FBRXRDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxzQkFBc0IsQ0FDOUQsVUFBVSxDQUFDLFlBQVksRUFDdkIsQ0FBQyxFQUNELFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLENBQUMsQ0FDRCxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDO1FBQ2hELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDO1FBRXRFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRWUsT0FBTztRQUN0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLHdDQUE4QixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckksQ0FBQztJQUVELGlDQUFpQztJQUUxQixzQkFBc0IsQ0FBQyxDQUE0QjtRQUN6RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUM1QyxJQUFJLENBQUMsQ0FBQyxVQUFVLGtDQUF5QixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLCtCQUFzQixFQUFFLENBQUM7WUFDeEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXNCLENBQUM7WUFDbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLFVBQVUsbUNBQXlCLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztZQUN4RCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDaEUsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1lBQ25ELElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxzQkFBc0IsQ0FDOUQsS0FBSyxFQUNMLGdCQUFnQixDQUFDLFlBQVksRUFDN0IsTUFBTSxFQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUNuRCxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsVUFBVSx3Q0FBOEIsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBQ00sU0FBUyxDQUFDLFNBQWlCLEVBQUUsb0JBQTZDO1FBQ2hGLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFDTSxjQUFjLENBQUMsY0FBc0IsRUFBRSxZQUFvQjtRQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUNNLGVBQWUsQ0FBQyxjQUFzQixFQUFFLFlBQW9CO1FBQ2xFLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsK0JBQStCO0lBRXZCLDZCQUE2QixDQUFDLEtBQWEsRUFBRSxXQUFtQjtRQUN2RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUM1QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBd0IsQ0FBQztRQUN0RCxJQUFJLFNBQVMsQ0FBQyxVQUFVLHVDQUErQixFQUFFLENBQUM7WUFDekQsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUNELElBQUksS0FBSyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQzFCLG1DQUFtQztZQUNuQyxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQztJQUMxQyxDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxZQUFvQjtRQUM1RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUU1QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDckQsSUFBSSxPQUFPLENBQUMsR0FBRyw2Q0FBbUMsRUFBRSxDQUFDO1lBQ3BELE1BQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakgsQ0FBQzthQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxrQ0FBd0IsQ0FBQyx3Q0FBd0MsRUFBRSxDQUFDO1lBQzFGLE1BQU0sSUFBSSxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1FBQ25ELElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxzQkFBc0IsQ0FDOUQsS0FBSyxFQUNMLGdCQUFnQixDQUFDLFlBQVksRUFDN0IsTUFBTSxFQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUNuRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsdUJBQXVCO0lBRWhCLGtCQUFrQjtRQUN4QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNoRSxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUMxRSxPQUFPLElBQUksUUFBUSxDQUNsQixxQkFBcUIsQ0FBQyxTQUFTLEVBQy9CLHFCQUFxQixDQUFDLFVBQVUsRUFDaEMsZ0JBQWdCLENBQUMsS0FBSyxFQUN0QixnQkFBZ0IsQ0FBQyxNQUFNLENBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxRQUFRLENBQ2xCLHFCQUFxQixDQUFDLFNBQVMsRUFDL0IscUJBQXFCLENBQUMsVUFBVSxFQUNoQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQ3RCLGdCQUFnQixDQUFDLE1BQU0sQ0FDdkIsQ0FBQztJQUNILENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7UUFDNUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUN4QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxxQ0FBMkIsQ0FBQztRQUM1RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztRQUN4RCxJQUFJLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLCtCQUFzQixDQUFDO1lBQ2xELElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixFQUFFLENBQUM7Z0JBQ3RGLHdGQUF3RjtnQkFDeEYsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ2pELDRDQUE0QztvQkFDNUMsT0FBTyxZQUFZLEdBQUcsVUFBVSxDQUFDLHNCQUFzQixDQUFDO2dCQUN6RCxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sWUFBWSxDQUFDO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRywrQ0FBcUMsR0FBRyxRQUFRLENBQUMsOEJBQThCLENBQUM7WUFDeEgsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDckUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxvQkFBb0IsR0FBRyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDNUksQ0FBQztJQUNGLENBQUM7SUFFTSxlQUFlLENBQUMsWUFBb0I7UUFDMUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVNLHlCQUF5QixDQUFDLFdBQW1CO1FBQ25ELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxXQUFXLENBQUM7UUFDM0MsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNoRSxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksc0JBQXNCLENBQzlELGdCQUFnQixDQUFDLEtBQUssRUFDdEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEVBQzNCLGdCQUFnQixDQUFDLE1BQU0sRUFDdkIsZ0JBQWdCLENBQUMsYUFBYSxDQUM5QixDQUFDLENBQUM7UUFFSCxrRkFBa0Y7UUFDbEYsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxrQkFBa0I7SUFFWCxTQUFTO1FBQ2YsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDekUsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsU0FBUyxDQUFDO1FBQ2xELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxvQ0FBb0MsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRyxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsOENBQThDLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3SCxPQUFPO1lBQ04sU0FBUyxFQUFFLFNBQVM7WUFDcEIseUJBQXlCLEVBQUUsU0FBUyxHQUFHLHdCQUF3QjtZQUMvRCxVQUFVLEVBQUUscUJBQXFCLENBQUMsVUFBVTtTQUM1QyxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87SUFDQSxnQkFBZ0IsQ0FBQyxRQUF1RDtRQUM5RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxRQUF1RDtRQUN0RixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxVQUFrQixFQUFFLG1CQUE0QixLQUFLO1FBQzFGLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUN2RixDQUFDO0lBQ00sZ0NBQWdDLENBQUMsVUFBa0IsRUFBRSxtQkFBNEIsS0FBSztRQUM1RixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDekYsQ0FBQztJQUNNLDBCQUEwQixDQUFDLFVBQWtCO1FBQ25ELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBQ00sWUFBWSxDQUFDLGNBQXNCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNNLGNBQWMsQ0FBQyxjQUFzQjtRQUMzQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFDTSxpQkFBaUIsQ0FBQyxjQUFzQjtRQUM5QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVNLDZCQUE2QixDQUFDLGNBQXNCO1FBQzFELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxvQ0FBb0MsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRU0sNkJBQTZCLENBQUMsY0FBc0I7UUFDMUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFDTSxvQkFBb0I7UUFDMUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDN0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkcsQ0FBQztJQUNNLCtCQUErQixDQUFDLFNBQWlCO1FBQ3ZELDJDQUEyQztRQUMzQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNoRSxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekUsU0FBUyxHQUFHLGdCQUFnQixDQUFDLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7UUFDckUsQ0FBQztRQUNELElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25CLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDZixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUNNLHlCQUF5QjtRQUMvQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUM3QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RyxDQUFDO0lBQ00sY0FBYztRQUNwQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELE9BQU87SUFFQSxlQUFlO1FBQ3JCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLE9BQU8sZ0JBQWdCLENBQUMsWUFBWSxDQUFDO0lBQ3RDLENBQUM7SUFDTSxjQUFjO1FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2hFLE9BQU8sZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0lBQ3JDLENBQUM7SUFDTSxnQkFBZ0I7UUFDdEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDaEUsT0FBTyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUM7SUFDdkMsQ0FBQztJQUNNLGVBQWU7UUFDckIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDaEUsT0FBTyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7SUFDdEMsQ0FBQztJQUVNLG9CQUFvQjtRQUMxQixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUMxRSxPQUFPLHFCQUFxQixDQUFDLFVBQVUsQ0FBQztJQUN6QyxDQUFDO0lBQ00sbUJBQW1CO1FBQ3pCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQzFFLE9BQU8scUJBQXFCLENBQUMsU0FBUyxDQUFDO0lBQ3hDLENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxjQUFrQztRQUMvRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFFBQTRCLEVBQUUsSUFBZ0I7UUFDdEUsSUFBSSxJQUFJLGlDQUF5QixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFTSx5QkFBeUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDckQsQ0FBQztJQUVNLGNBQWMsQ0FBQyxlQUF1QixFQUFFLGNBQXNCO1FBQ3BFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQzFFLElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUM7WUFDckMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLFVBQVUsR0FBRyxlQUFlO1lBQzlELFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLEdBQUcsY0FBYztTQUMzRCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==