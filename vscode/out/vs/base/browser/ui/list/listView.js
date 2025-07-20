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
import { DataTransfers } from '../../dnd.js';
import { addDisposableListener, animate, getActiveElement, getContentHeight, getContentWidth, getDocument, getTopLeftOffset, getWindow, isAncestor, isHTMLElement, isSVGElement, scheduleAtNextAnimationFrame } from '../../dom.js';
import { DomEmitter } from '../../event.js';
import { EventType as TouchEventType, Gesture } from '../../touch.js';
import { SmoothScrollableElement } from '../scrollbar/scrollableElement.js';
import { distinct, equals, splice } from '../../../common/arrays.js';
import { Delayer, disposableTimeout } from '../../../common/async.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import { Range } from '../../../common/range.js';
import { Scrollable } from '../../../common/scrollable.js';
import { RangeMap, shift } from './rangeMap.js';
import { RowCache } from './rowCache.js';
import { BugIndicatingError } from '../../../common/errors.js';
import { clamp } from '../../../common/numbers.js';
import { applyDragImage } from '../dnd/dnd.js';
const StaticDND = {
    CurrentDragAndDropData: undefined
};
export var ListViewTargetSector;
(function (ListViewTargetSector) {
    // drop position relative to the top of the item
    ListViewTargetSector[ListViewTargetSector["TOP"] = 0] = "TOP";
    ListViewTargetSector[ListViewTargetSector["CENTER_TOP"] = 1] = "CENTER_TOP";
    ListViewTargetSector[ListViewTargetSector["CENTER_BOTTOM"] = 2] = "CENTER_BOTTOM";
    ListViewTargetSector[ListViewTargetSector["BOTTOM"] = 3] = "BOTTOM"; // [75%-100%)
})(ListViewTargetSector || (ListViewTargetSector = {}));
const DefaultOptions = {
    useShadows: true,
    verticalScrollMode: 1 /* ScrollbarVisibility.Auto */,
    setRowLineHeight: true,
    setRowHeight: true,
    supportDynamicHeights: false,
    dnd: {
        getDragElements(e) { return [e]; },
        getDragURI() { return null; },
        onDragStart() { },
        onDragOver() { return false; },
        drop() { },
        dispose() { }
    },
    horizontalScrolling: false,
    transformOptimization: true,
    alwaysConsumeMouseWheel: true,
};
export class ElementsDragAndDropData {
    get context() {
        return this._context;
    }
    set context(value) {
        this._context = value;
    }
    constructor(elements) {
        this.elements = elements;
    }
    update() { }
    getData() {
        return this.elements;
    }
}
export class ExternalElementsDragAndDropData {
    constructor(elements) {
        this.elements = elements;
    }
    update() { }
    getData() {
        return this.elements;
    }
}
export class NativeDragAndDropData {
    constructor() {
        this.types = [];
        this.files = [];
    }
    update(dataTransfer) {
        if (dataTransfer.types) {
            this.types.splice(0, this.types.length, ...dataTransfer.types);
        }
        if (dataTransfer.files) {
            this.files.splice(0, this.files.length);
            for (let i = 0; i < dataTransfer.files.length; i++) {
                const file = dataTransfer.files.item(i);
                if (file && (file.size || file.type)) {
                    this.files.push(file);
                }
            }
        }
    }
    getData() {
        return {
            types: this.types,
            files: this.files
        };
    }
}
function equalsDragFeedback(f1, f2) {
    if (Array.isArray(f1) && Array.isArray(f2)) {
        return equals(f1, f2);
    }
    return f1 === f2;
}
class ListViewAccessibilityProvider {
    constructor(accessibilityProvider) {
        if (accessibilityProvider?.getSetSize) {
            this.getSetSize = accessibilityProvider.getSetSize.bind(accessibilityProvider);
        }
        else {
            this.getSetSize = (e, i, l) => l;
        }
        if (accessibilityProvider?.getPosInSet) {
            this.getPosInSet = accessibilityProvider.getPosInSet.bind(accessibilityProvider);
        }
        else {
            this.getPosInSet = (e, i) => i + 1;
        }
        if (accessibilityProvider?.getRole) {
            this.getRole = accessibilityProvider.getRole.bind(accessibilityProvider);
        }
        else {
            this.getRole = _ => 'listitem';
        }
        if (accessibilityProvider?.isChecked) {
            this.isChecked = accessibilityProvider.isChecked.bind(accessibilityProvider);
        }
        else {
            this.isChecked = _ => undefined;
        }
    }
}
/**
 * The {@link ListView} is a virtual scrolling engine.
 *
 * Given that it only renders elements within its viewport, it can hold large
 * collections of elements and stay very performant. The performance bottleneck
 * usually lies within the user's rendering code for each element.
 *
 * @remarks It is a low-level widget, not meant to be used directly. Refer to the
 * List widget instead.
 */
export class ListView {
    static { this.InstanceCount = 0; }
    get contentHeight() { return this.rangeMap.size; }
    get contentWidth() { return this.scrollWidth ?? 0; }
    get onDidScroll() { return this.scrollableElement.onScroll; }
    get onWillScroll() { return this.scrollableElement.onWillScroll; }
    get containerDomNode() { return this.rowsContainer; }
    get scrollableElementDomNode() { return this.scrollableElement.getDomNode(); }
    get horizontalScrolling() { return this._horizontalScrolling; }
    set horizontalScrolling(value) {
        if (value === this._horizontalScrolling) {
            return;
        }
        if (value && this.supportDynamicHeights) {
            throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
        }
        this._horizontalScrolling = value;
        this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);
        if (this._horizontalScrolling) {
            for (const item of this.items) {
                this.measureItemWidth(item);
            }
            this.updateScrollWidth();
            this.scrollableElement.setScrollDimensions({ width: getContentWidth(this.domNode) });
            this.rowsContainer.style.width = `${Math.max(this.scrollWidth || 0, this.renderWidth)}px`;
        }
        else {
            this.scrollableElementWidthDelayer.cancel();
            this.scrollableElement.setScrollDimensions({ width: this.renderWidth, scrollWidth: this.renderWidth });
            this.rowsContainer.style.width = '';
        }
    }
    constructor(container, virtualDelegate, renderers, options = DefaultOptions) {
        this.virtualDelegate = virtualDelegate;
        this.domId = `list_id_${++ListView.InstanceCount}`;
        this.renderers = new Map();
        this.renderWidth = 0;
        this._scrollHeight = 0;
        this.scrollableElementUpdateDisposable = null;
        this.scrollableElementWidthDelayer = new Delayer(50);
        this.splicing = false;
        this.dragOverAnimationStopDisposable = Disposable.None;
        this.dragOverMouseY = 0;
        this.canDrop = false;
        this.currentDragFeedbackDisposable = Disposable.None;
        this.onDragLeaveTimeout = Disposable.None;
        this.currentSelectionDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this._onDidChangeContentHeight = new Emitter();
        this._onDidChangeContentWidth = new Emitter();
        this.onDidChangeContentHeight = Event.latch(this._onDidChangeContentHeight.event, undefined, this.disposables);
        this.onDidChangeContentWidth = Event.latch(this._onDidChangeContentWidth.event, undefined, this.disposables);
        this._horizontalScrolling = false;
        if (options.horizontalScrolling && options.supportDynamicHeights) {
            throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
        }
        this.items = [];
        this.itemId = 0;
        this.rangeMap = this.createRangeMap(options.paddingTop ?? 0);
        for (const renderer of renderers) {
            this.renderers.set(renderer.templateId, renderer);
        }
        this.cache = this.disposables.add(new RowCache(this.renderers));
        this.lastRenderTop = 0;
        this.lastRenderHeight = 0;
        this.domNode = document.createElement('div');
        this.domNode.className = 'monaco-list';
        this.domNode.classList.add(this.domId);
        this.domNode.tabIndex = 0;
        this.domNode.classList.toggle('mouse-support', typeof options.mouseSupport === 'boolean' ? options.mouseSupport : true);
        this._horizontalScrolling = options.horizontalScrolling ?? DefaultOptions.horizontalScrolling;
        this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);
        this.paddingBottom = typeof options.paddingBottom === 'undefined' ? 0 : options.paddingBottom;
        this.accessibilityProvider = new ListViewAccessibilityProvider(options.accessibilityProvider);
        this.rowsContainer = document.createElement('div');
        this.rowsContainer.className = 'monaco-list-rows';
        const transformOptimization = options.transformOptimization ?? DefaultOptions.transformOptimization;
        if (transformOptimization) {
            this.rowsContainer.style.transform = 'translate3d(0px, 0px, 0px)';
            this.rowsContainer.style.overflow = 'hidden';
            this.rowsContainer.style.contain = 'strict';
        }
        this.disposables.add(Gesture.addTarget(this.rowsContainer));
        this.scrollable = this.disposables.add(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: (options.smoothScrolling ?? false) ? 125 : 0,
            scheduleAtNextAnimationFrame: cb => scheduleAtNextAnimationFrame(getWindow(this.domNode), cb)
        }));
        this.scrollableElement = this.disposables.add(new SmoothScrollableElement(this.rowsContainer, {
            alwaysConsumeMouseWheel: options.alwaysConsumeMouseWheel ?? DefaultOptions.alwaysConsumeMouseWheel,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: options.verticalScrollMode ?? DefaultOptions.verticalScrollMode,
            useShadows: options.useShadows ?? DefaultOptions.useShadows,
            mouseWheelScrollSensitivity: options.mouseWheelScrollSensitivity,
            fastScrollSensitivity: options.fastScrollSensitivity,
            scrollByPage: options.scrollByPage
        }, this.scrollable));
        this.domNode.appendChild(this.scrollableElement.getDomNode());
        container.appendChild(this.domNode);
        this.scrollableElement.onScroll(this.onScroll, this, this.disposables);
        this.disposables.add(addDisposableListener(this.rowsContainer, TouchEventType.Change, e => this.onTouchChange(e)));
        this.disposables.add(addDisposableListener(this.scrollableElement.getDomNode(), 'scroll', e => {
            // Make sure the active element is scrolled into view
            const element = e.target;
            const scrollValue = element.scrollTop;
            element.scrollTop = 0;
            if (options.scrollToActiveElement) {
                this.setScrollTop(this.scrollTop + scrollValue);
            }
        }));
        this.disposables.add(addDisposableListener(this.domNode, 'dragover', e => this.onDragOver(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'drop', e => this.onDrop(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'dragleave', e => this.onDragLeave(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'dragend', e => this.onDragEnd(e)));
        if (options.userSelection) {
            if (options.dnd) {
                throw new Error('DND and user selection cannot be used simultaneously');
            }
            this.disposables.add(addDisposableListener(this.domNode, 'mousedown', e => this.onPotentialSelectionStart(e)));
        }
        this.setRowLineHeight = options.setRowLineHeight ?? DefaultOptions.setRowLineHeight;
        this.setRowHeight = options.setRowHeight ?? DefaultOptions.setRowHeight;
        this.supportDynamicHeights = options.supportDynamicHeights ?? DefaultOptions.supportDynamicHeights;
        this.dnd = options.dnd ?? this.disposables.add(DefaultOptions.dnd);
        this.layout(options.initialSize?.height, options.initialSize?.width);
        if (options.scrollToActiveElement) {
            this._setupFocusObserver(container);
        }
    }
    _setupFocusObserver(container) {
        this.disposables.add(addDisposableListener(container, 'focus', () => {
            const element = getActiveElement();
            if (this.activeElement !== element && element !== null) {
                this.activeElement = element;
                this._scrollToActiveElement(this.activeElement, container);
            }
        }, true));
    }
    _scrollToActiveElement(element, container) {
        // The scroll event on the list only fires when scrolling down.
        // If the active element is above the viewport, we need to scroll up.
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const topOffset = elementRect.top - containerRect.top;
        if (topOffset < 0) {
            // Scroll up
            this.setScrollTop(this.scrollTop + topOffset);
        }
    }
    updateOptions(options) {
        if (options.paddingBottom !== undefined) {
            this.paddingBottom = options.paddingBottom;
            this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
        }
        if (options.smoothScrolling !== undefined) {
            this.scrollable.setSmoothScrollDuration(options.smoothScrolling ? 125 : 0);
        }
        if (options.horizontalScrolling !== undefined) {
            this.horizontalScrolling = options.horizontalScrolling;
        }
        let scrollableOptions;
        if (options.scrollByPage !== undefined) {
            scrollableOptions = { ...(scrollableOptions ?? {}), scrollByPage: options.scrollByPage };
        }
        if (options.mouseWheelScrollSensitivity !== undefined) {
            scrollableOptions = { ...(scrollableOptions ?? {}), mouseWheelScrollSensitivity: options.mouseWheelScrollSensitivity };
        }
        if (options.fastScrollSensitivity !== undefined) {
            scrollableOptions = { ...(scrollableOptions ?? {}), fastScrollSensitivity: options.fastScrollSensitivity };
        }
        if (scrollableOptions) {
            this.scrollableElement.updateOptions(scrollableOptions);
        }
        if (options.paddingTop !== undefined && options.paddingTop !== this.rangeMap.paddingTop) {
            // trigger a rerender
            const lastRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
            const offset = options.paddingTop - this.rangeMap.paddingTop;
            this.rangeMap.paddingTop = options.paddingTop;
            this.render(lastRenderRange, Math.max(0, this.lastRenderTop + offset), this.lastRenderHeight, undefined, undefined, true);
            this.setScrollTop(this.lastRenderTop);
            this.eventuallyUpdateScrollDimensions();
            if (this.supportDynamicHeights) {
                this._rerender(this.lastRenderTop, this.lastRenderHeight);
            }
        }
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this.scrollableElement.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.scrollableElement.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    updateElementHeight(index, size, anchorIndex) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        const originalSize = this.items[index].size;
        if (typeof size === 'undefined') {
            if (!this.supportDynamicHeights) {
                console.warn('Dynamic heights not supported', new Error().stack);
                return;
            }
            this.items[index].lastDynamicHeightWidth = undefined;
            size = originalSize + this.probeDynamicHeight(index);
        }
        if (originalSize === size) {
            return;
        }
        const lastRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        let heightDiff = 0;
        if (index < lastRenderRange.start) {
            // do not scroll the viewport if resized element is out of viewport
            heightDiff = size - originalSize;
        }
        else {
            if (anchorIndex !== null && anchorIndex > index && anchorIndex < lastRenderRange.end) {
                // anchor in viewport
                // resized element in viewport and above the anchor
                heightDiff = size - originalSize;
            }
            else {
                heightDiff = 0;
            }
        }
        this.rangeMap.splice(index, 1, [{ size: size }]);
        this.items[index].size = size;
        this.render(lastRenderRange, Math.max(0, this.lastRenderTop + heightDiff), this.lastRenderHeight, undefined, undefined, true);
        this.setScrollTop(this.lastRenderTop);
        this.eventuallyUpdateScrollDimensions();
        if (this.supportDynamicHeights) {
            this._rerender(this.lastRenderTop, this.lastRenderHeight);
        }
        else {
            this._onDidChangeContentHeight.fire(this.contentHeight); // otherwise fired in _rerender()
        }
    }
    createRangeMap(paddingTop) {
        return new RangeMap(paddingTop);
    }
    splice(start, deleteCount, elements = []) {
        if (this.splicing) {
            throw new Error('Can\'t run recursive splices.');
        }
        this.splicing = true;
        try {
            return this._splice(start, deleteCount, elements);
        }
        finally {
            this.splicing = false;
            this._onDidChangeContentHeight.fire(this.contentHeight);
        }
    }
    _splice(start, deleteCount, elements = []) {
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const deleteRange = { start, end: start + deleteCount };
        const removeRange = Range.intersect(previousRenderRange, deleteRange);
        // try to reuse rows, avoid removing them from DOM
        const rowsToDispose = new Map();
        for (let i = removeRange.end - 1; i >= removeRange.start; i--) {
            const item = this.items[i];
            item.dragStartDisposable.dispose();
            item.checkedDisposable.dispose();
            if (item.row) {
                let rows = rowsToDispose.get(item.templateId);
                if (!rows) {
                    rows = [];
                    rowsToDispose.set(item.templateId, rows);
                }
                const renderer = this.renderers.get(item.templateId);
                if (renderer && renderer.disposeElement) {
                    renderer.disposeElement(item.element, i, item.row.templateData, { height: item.size });
                }
                rows.unshift(item.row);
            }
            item.row = null;
            item.stale = true;
        }
        const previousRestRange = { start: start + deleteCount, end: this.items.length };
        const previousRenderedRestRange = Range.intersect(previousRestRange, previousRenderRange);
        const previousUnrenderedRestRanges = Range.relativeComplement(previousRestRange, previousRenderRange);
        const inserted = elements.map(element => ({
            id: String(this.itemId++),
            element,
            templateId: this.virtualDelegate.getTemplateId(element),
            size: this.virtualDelegate.getHeight(element),
            width: undefined,
            hasDynamicHeight: !!this.virtualDelegate.hasDynamicHeight && this.virtualDelegate.hasDynamicHeight(element),
            lastDynamicHeightWidth: undefined,
            row: null,
            uri: undefined,
            dropTarget: false,
            dragStartDisposable: Disposable.None,
            checkedDisposable: Disposable.None,
            stale: false
        }));
        let deleted;
        // TODO@joao: improve this optimization to catch even more cases
        if (start === 0 && deleteCount >= this.items.length) {
            this.rangeMap = this.createRangeMap(this.rangeMap.paddingTop);
            this.rangeMap.splice(0, 0, inserted);
            deleted = this.items;
            this.items = inserted;
        }
        else {
            this.rangeMap.splice(start, deleteCount, inserted);
            deleted = splice(this.items, start, deleteCount, inserted);
        }
        const delta = elements.length - deleteCount;
        const renderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const renderedRestRange = shift(previousRenderedRestRange, delta);
        const updateRange = Range.intersect(renderRange, renderedRestRange);
        for (let i = updateRange.start; i < updateRange.end; i++) {
            this.updateItemInDOM(this.items[i], i);
        }
        const removeRanges = Range.relativeComplement(renderedRestRange, renderRange);
        for (const range of removeRanges) {
            for (let i = range.start; i < range.end; i++) {
                this.removeItemFromDOM(i);
            }
        }
        const unrenderedRestRanges = previousUnrenderedRestRanges.map(r => shift(r, delta));
        const elementsRange = { start, end: start + elements.length };
        const insertRanges = [elementsRange, ...unrenderedRestRanges].map(r => Range.intersect(renderRange, r)).reverse();
        for (const range of insertRanges) {
            for (let i = range.end - 1; i >= range.start; i--) {
                const item = this.items[i];
                const rows = rowsToDispose.get(item.templateId);
                const row = rows?.pop();
                this.insertItemInDOM(i, row);
            }
        }
        for (const rows of rowsToDispose.values()) {
            for (const row of rows) {
                this.cache.release(row);
            }
        }
        this.eventuallyUpdateScrollDimensions();
        if (this.supportDynamicHeights) {
            this._rerender(this.scrollTop, this.renderHeight);
        }
        return deleted.map(i => i.element);
    }
    eventuallyUpdateScrollDimensions() {
        this._scrollHeight = this.contentHeight;
        this.rowsContainer.style.height = `${this._scrollHeight}px`;
        if (!this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable = scheduleAtNextAnimationFrame(getWindow(this.domNode), () => {
                this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
                this.updateScrollWidth();
                this.scrollableElementUpdateDisposable = null;
            });
        }
    }
    eventuallyUpdateScrollWidth() {
        if (!this.horizontalScrolling) {
            this.scrollableElementWidthDelayer.cancel();
            return;
        }
        this.scrollableElementWidthDelayer.trigger(() => this.updateScrollWidth());
    }
    updateScrollWidth() {
        if (!this.horizontalScrolling) {
            return;
        }
        let scrollWidth = 0;
        for (const item of this.items) {
            if (typeof item.width !== 'undefined') {
                scrollWidth = Math.max(scrollWidth, item.width);
            }
        }
        this.scrollWidth = scrollWidth;
        this.scrollableElement.setScrollDimensions({ scrollWidth: scrollWidth === 0 ? 0 : (scrollWidth + 10) });
        this._onDidChangeContentWidth.fire(this.scrollWidth);
    }
    updateWidth(index) {
        if (!this.horizontalScrolling || typeof this.scrollWidth === 'undefined') {
            return;
        }
        const item = this.items[index];
        this.measureItemWidth(item);
        if (typeof item.width !== 'undefined' && item.width > this.scrollWidth) {
            this.scrollWidth = item.width;
            this.scrollableElement.setScrollDimensions({ scrollWidth: this.scrollWidth + 10 });
            this._onDidChangeContentWidth.fire(this.scrollWidth);
        }
    }
    rerender() {
        if (!this.supportDynamicHeights) {
            return;
        }
        for (const item of this.items) {
            item.lastDynamicHeightWidth = undefined;
        }
        this._rerender(this.lastRenderTop, this.lastRenderHeight);
    }
    get length() {
        return this.items.length;
    }
    get renderHeight() {
        const scrollDimensions = this.scrollableElement.getScrollDimensions();
        return scrollDimensions.height;
    }
    get firstVisibleIndex() {
        const range = this.getVisibleRange(this.lastRenderTop, this.lastRenderHeight);
        return range.start;
    }
    get firstMostlyVisibleIndex() {
        const firstVisibleIndex = this.firstVisibleIndex;
        const firstElTop = this.rangeMap.positionAt(firstVisibleIndex);
        const nextElTop = this.rangeMap.positionAt(firstVisibleIndex + 1);
        if (nextElTop !== -1) {
            const firstElMidpoint = (nextElTop - firstElTop) / 2 + firstElTop;
            if (firstElMidpoint < this.scrollTop) {
                return firstVisibleIndex + 1;
            }
        }
        return firstVisibleIndex;
    }
    get lastVisibleIndex() {
        const range = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        return range.end - 1;
    }
    element(index) {
        return this.items[index].element;
    }
    indexOf(element) {
        return this.items.findIndex(item => item.element === element);
    }
    domElement(index) {
        const row = this.items[index].row;
        return row && row.domNode;
    }
    elementHeight(index) {
        return this.items[index].size;
    }
    elementTop(index) {
        return this.rangeMap.positionAt(index);
    }
    indexAt(position) {
        return this.rangeMap.indexAt(position);
    }
    indexAfter(position) {
        return this.rangeMap.indexAfter(position);
    }
    layout(height, width) {
        const scrollDimensions = {
            height: typeof height === 'number' ? height : getContentHeight(this.domNode)
        };
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            scrollDimensions.scrollHeight = this.scrollHeight;
        }
        this.scrollableElement.setScrollDimensions(scrollDimensions);
        if (typeof width !== 'undefined') {
            this.renderWidth = width;
            if (this.supportDynamicHeights) {
                this._rerender(this.scrollTop, this.renderHeight);
            }
        }
        if (this.horizontalScrolling) {
            this.scrollableElement.setScrollDimensions({
                width: typeof width === 'number' ? width : getContentWidth(this.domNode)
            });
        }
    }
    // Render
    render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM = false, onScroll = false) {
        const renderRange = this.getRenderRange(renderTop, renderHeight);
        const rangesToInsert = Range.relativeComplement(renderRange, previousRenderRange).reverse();
        const rangesToRemove = Range.relativeComplement(previousRenderRange, renderRange);
        if (updateItemsInDOM) {
            const rangesToUpdate = Range.intersect(previousRenderRange, renderRange);
            for (let i = rangesToUpdate.start; i < rangesToUpdate.end; i++) {
                this.updateItemInDOM(this.items[i], i);
            }
        }
        this.cache.transact(() => {
            for (const range of rangesToRemove) {
                for (let i = range.start; i < range.end; i++) {
                    this.removeItemFromDOM(i, onScroll);
                }
            }
            for (const range of rangesToInsert) {
                for (let i = range.end - 1; i >= range.start; i--) {
                    this.insertItemInDOM(i);
                }
            }
        });
        if (renderLeft !== undefined) {
            this.rowsContainer.style.left = `-${renderLeft}px`;
        }
        this.rowsContainer.style.top = `-${renderTop}px`;
        if (this.horizontalScrolling && scrollWidth !== undefined) {
            this.rowsContainer.style.width = `${Math.max(scrollWidth, this.renderWidth)}px`;
        }
        this.lastRenderTop = renderTop;
        this.lastRenderHeight = renderHeight;
    }
    // DOM operations
    insertItemInDOM(index, row) {
        const item = this.items[index];
        if (!item.row) {
            if (row) {
                item.row = row;
                item.stale = true;
            }
            else {
                const result = this.cache.alloc(item.templateId);
                item.row = result.row;
                item.stale ||= result.isReusingConnectedDomNode;
            }
        }
        const role = this.accessibilityProvider.getRole(item.element) || 'listitem';
        item.row.domNode.setAttribute('role', role);
        const checked = this.accessibilityProvider.isChecked(item.element);
        if (typeof checked === 'boolean') {
            item.row.domNode.setAttribute('aria-checked', String(!!checked));
        }
        else if (checked) {
            const update = (checked) => item.row.domNode.setAttribute('aria-checked', String(!!checked));
            update(checked.value);
            item.checkedDisposable = checked.onDidChange(() => update(checked.value));
        }
        if (item.stale || !item.row.domNode.parentElement) {
            const referenceNode = this.items.at(index + 1)?.row?.domNode ?? null;
            if (item.row.domNode.parentElement !== this.rowsContainer || item.row.domNode.nextElementSibling !== referenceNode) {
                this.rowsContainer.insertBefore(item.row.domNode, referenceNode);
            }
            item.stale = false;
        }
        this.updateItemInDOM(item, index);
        const renderer = this.renderers.get(item.templateId);
        if (!renderer) {
            throw new Error(`No renderer found for template id ${item.templateId}`);
        }
        renderer?.renderElement(item.element, index, item.row.templateData, { height: item.size });
        const uri = this.dnd.getDragURI(item.element);
        item.dragStartDisposable.dispose();
        item.row.domNode.draggable = !!uri;
        if (uri) {
            item.dragStartDisposable = addDisposableListener(item.row.domNode, 'dragstart', event => this.onDragStart(item.element, uri, event));
        }
        if (this.horizontalScrolling) {
            this.measureItemWidth(item);
            this.eventuallyUpdateScrollWidth();
        }
    }
    measureItemWidth(item) {
        if (!item.row || !item.row.domNode) {
            return;
        }
        item.row.domNode.style.width = 'fit-content';
        item.width = getContentWidth(item.row.domNode);
        const style = getWindow(item.row.domNode).getComputedStyle(item.row.domNode);
        if (style.paddingLeft) {
            item.width += parseFloat(style.paddingLeft);
        }
        if (style.paddingRight) {
            item.width += parseFloat(style.paddingRight);
        }
        item.row.domNode.style.width = '';
    }
    updateItemInDOM(item, index) {
        item.row.domNode.style.top = `${this.elementTop(index)}px`;
        if (this.setRowHeight) {
            item.row.domNode.style.height = `${item.size}px`;
        }
        if (this.setRowLineHeight) {
            item.row.domNode.style.lineHeight = `${item.size}px`;
        }
        item.row.domNode.setAttribute('data-index', `${index}`);
        item.row.domNode.setAttribute('data-last-element', index === this.length - 1 ? 'true' : 'false');
        item.row.domNode.setAttribute('data-parity', index % 2 === 0 ? 'even' : 'odd');
        item.row.domNode.setAttribute('aria-setsize', String(this.accessibilityProvider.getSetSize(item.element, index, this.length)));
        item.row.domNode.setAttribute('aria-posinset', String(this.accessibilityProvider.getPosInSet(item.element, index)));
        item.row.domNode.setAttribute('id', this.getElementDomId(index));
        item.row.domNode.classList.toggle('drop-target', item.dropTarget);
    }
    removeItemFromDOM(index, onScroll) {
        const item = this.items[index];
        item.dragStartDisposable.dispose();
        item.checkedDisposable.dispose();
        if (item.row) {
            const renderer = this.renderers.get(item.templateId);
            if (renderer && renderer.disposeElement) {
                renderer.disposeElement(item.element, index, item.row.templateData, { height: item.size, onScroll });
            }
            this.cache.release(item.row);
            item.row = null;
        }
        if (this.horizontalScrolling) {
            this.eventuallyUpdateScrollWidth();
        }
    }
    getScrollTop() {
        const scrollPosition = this.scrollableElement.getScrollPosition();
        return scrollPosition.scrollTop;
    }
    setScrollTop(scrollTop, reuseAnimation) {
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
        }
        this.scrollableElement.setScrollPosition({ scrollTop, reuseAnimation });
    }
    getScrollLeft() {
        const scrollPosition = this.scrollableElement.getScrollPosition();
        return scrollPosition.scrollLeft;
    }
    setScrollLeft(scrollLeft) {
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            this.scrollableElement.setScrollDimensions({ scrollWidth: this.scrollWidth });
        }
        this.scrollableElement.setScrollPosition({ scrollLeft });
    }
    get scrollTop() {
        return this.getScrollTop();
    }
    set scrollTop(scrollTop) {
        this.setScrollTop(scrollTop);
    }
    get scrollHeight() {
        return this._scrollHeight + (this.horizontalScrolling ? 10 : 0) + this.paddingBottom;
    }
    // Events
    get onMouseClick() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'click')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseDblClick() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'dblclick')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseMiddleClick() { return Event.filter(Event.map(this.disposables.add(new DomEmitter(this.domNode, 'auxclick')).event, e => this.toMouseEvent(e), this.disposables), e => e.browserEvent.button === 1, this.disposables); }
    get onMouseUp() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseup')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseDown() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mousedown')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseOver() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseover')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseMove() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mousemove')).event, e => this.toMouseEvent(e), this.disposables); }
    get onMouseOut() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseout')).event, e => this.toMouseEvent(e), this.disposables); }
    get onContextMenu() { return Event.any(Event.map(this.disposables.add(new DomEmitter(this.domNode, 'contextmenu')).event, e => this.toMouseEvent(e), this.disposables), Event.map(this.disposables.add(new DomEmitter(this.domNode, TouchEventType.Contextmenu)).event, e => this.toGestureEvent(e), this.disposables)); }
    get onTouchStart() { return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'touchstart')).event, e => this.toTouchEvent(e), this.disposables); }
    get onTap() { return Event.map(this.disposables.add(new DomEmitter(this.rowsContainer, TouchEventType.Tap)).event, e => this.toGestureEvent(e), this.disposables); }
    toMouseEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toTouchEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toGestureEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.initialTarget || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toDragEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        const sector = this.getTargetSector(browserEvent, index);
        return { browserEvent, index, element, sector };
    }
    onScroll(e) {
        try {
            const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
            this.render(previousRenderRange, e.scrollTop, e.height, e.scrollLeft, e.scrollWidth, undefined, true);
            if (this.supportDynamicHeights) {
                this._rerender(e.scrollTop, e.height, e.inSmoothScrolling);
            }
        }
        catch (err) {
            console.error('Got bad scroll event:', e);
            throw err;
        }
    }
    onTouchChange(event) {
        event.preventDefault();
        event.stopPropagation();
        this.scrollTop -= event.translationY;
    }
    // DND
    onDragStart(element, uri, event) {
        if (!event.dataTransfer) {
            return;
        }
        const elements = this.dnd.getDragElements(element);
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(DataTransfers.TEXT, uri);
        let label;
        if (this.dnd.getDragLabel) {
            label = this.dnd.getDragLabel(elements, event);
        }
        if (typeof label === 'undefined') {
            label = String(elements.length);
        }
        applyDragImage(event, this.domNode, label, [this.domId /* add domId to get list specific styling */]);
        this.domNode.classList.add('dragging');
        this.currentDragData = new ElementsDragAndDropData(elements);
        StaticDND.CurrentDragAndDropData = new ExternalElementsDragAndDropData(elements);
        this.dnd.onDragStart?.(this.currentDragData, event);
    }
    onPotentialSelectionStart(e) {
        this.currentSelectionDisposable.dispose();
        const doc = getDocument(this.domNode);
        // Set up both the 'movement store' for watching the mouse, and the
        // 'selection store' which lasts as long as there's a selection, even
        // after the usr has stopped modifying it.
        const selectionStore = this.currentSelectionDisposable = new DisposableStore();
        const movementStore = selectionStore.add(new DisposableStore());
        // The selection events we get from the DOM are fairly limited and we lack a 'selection end' event.
        // Selection events also don't tell us where the input doing the selection is. So, make a poor
        // assumption that a user is using the mouse, and base our events on that.
        movementStore.add(addDisposableListener(this.domNode, 'selectstart', () => {
            movementStore.add(addDisposableListener(doc, 'mousemove', e => {
                if (doc.getSelection()?.isCollapsed === false) {
                    this.setupDragAndDropScrollTopAnimation(e);
                }
            }));
            // The selection is cleared either on mouseup if there's no selection, or on next mousedown
            // when `this.currentSelectionDisposable` is reset.
            selectionStore.add(toDisposable(() => {
                const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
                this.currentSelectionBounds = undefined;
                this.render(previousRenderRange, this.lastRenderTop, this.lastRenderHeight, undefined, undefined);
            }));
            selectionStore.add(addDisposableListener(doc, 'selectionchange', () => {
                const selection = doc.getSelection();
                // if the selection changed _after_ mouseup, it's from clearing the list or similar, so teardown
                if (!selection || selection.isCollapsed) {
                    if (movementStore.isDisposed) {
                        selectionStore.dispose();
                    }
                    return;
                }
                let start = this.getIndexOfListElement(selection.anchorNode);
                let end = this.getIndexOfListElement(selection.focusNode);
                if (start !== undefined && end !== undefined) {
                    if (end < start) {
                        [start, end] = [end, start];
                    }
                    this.currentSelectionBounds = { start, end };
                }
            }));
        }));
        movementStore.add(addDisposableListener(doc, 'mouseup', () => {
            movementStore.dispose();
            this.teardownDragAndDropScrollTopAnimation();
            if (doc.getSelection()?.isCollapsed !== false) {
                selectionStore.dispose();
            }
        }));
    }
    getIndexOfListElement(element) {
        if (!element || !this.domNode.contains(element)) {
            return undefined;
        }
        while (element && element !== this.domNode) {
            if (element.dataset?.index) {
                return Number(element.dataset.index);
            }
            element = element.parentElement;
        }
        return undefined;
    }
    onDragOver(event) {
        event.browserEvent.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
        this.onDragLeaveTimeout.dispose();
        if (StaticDND.CurrentDragAndDropData && StaticDND.CurrentDragAndDropData.getData() === 'vscode-ui') {
            return false;
        }
        this.setupDragAndDropScrollTopAnimation(event.browserEvent);
        if (!event.browserEvent.dataTransfer) {
            return false;
        }
        // Drag over from outside
        if (!this.currentDragData) {
            if (StaticDND.CurrentDragAndDropData) {
                // Drag over from another list
                this.currentDragData = StaticDND.CurrentDragAndDropData;
            }
            else {
                // Drag over from the desktop
                if (!event.browserEvent.dataTransfer.types) {
                    return false;
                }
                this.currentDragData = new NativeDragAndDropData();
            }
        }
        const result = this.dnd.onDragOver(this.currentDragData, event.element, event.index, event.sector, event.browserEvent);
        this.canDrop = typeof result === 'boolean' ? result : result.accept;
        if (!this.canDrop) {
            this.currentDragFeedback = undefined;
            this.currentDragFeedbackDisposable.dispose();
            return false;
        }
        event.browserEvent.dataTransfer.dropEffect = (typeof result !== 'boolean' && result.effect?.type === 0 /* ListDragOverEffectType.Copy */) ? 'copy' : 'move';
        let feedback;
        if (typeof result !== 'boolean' && result.feedback) {
            feedback = result.feedback;
        }
        else {
            if (typeof event.index === 'undefined') {
                feedback = [-1];
            }
            else {
                feedback = [event.index];
            }
        }
        // sanitize feedback list
        feedback = distinct(feedback).filter(i => i >= -1 && i < this.length).sort((a, b) => a - b);
        feedback = feedback[0] === -1 ? [-1] : feedback;
        let dragOverEffectPosition = typeof result !== 'boolean' && result.effect && result.effect.position ? result.effect.position : "drop-target" /* ListDragOverEffectPosition.Over */;
        if (equalsDragFeedback(this.currentDragFeedback, feedback) && this.currentDragFeedbackPosition === dragOverEffectPosition) {
            return true;
        }
        this.currentDragFeedback = feedback;
        this.currentDragFeedbackPosition = dragOverEffectPosition;
        this.currentDragFeedbackDisposable.dispose();
        if (feedback[0] === -1) { // entire list feedback
            this.domNode.classList.add(dragOverEffectPosition);
            this.rowsContainer.classList.add(dragOverEffectPosition);
            this.currentDragFeedbackDisposable = toDisposable(() => {
                this.domNode.classList.remove(dragOverEffectPosition);
                this.rowsContainer.classList.remove(dragOverEffectPosition);
            });
        }
        else {
            if (feedback.length > 1 && dragOverEffectPosition !== "drop-target" /* ListDragOverEffectPosition.Over */) {
                throw new Error('Can\'t use multiple feedbacks with position different than \'over\'');
            }
            // Make sure there is no flicker when moving between two items
            // Always use the before feedback if possible
            if (dragOverEffectPosition === "drop-target-after" /* ListDragOverEffectPosition.After */) {
                if (feedback[0] < this.length - 1) {
                    feedback[0] += 1;
                    dragOverEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                }
            }
            for (const index of feedback) {
                const item = this.items[index];
                item.dropTarget = true;
                item.row?.domNode.classList.add(dragOverEffectPosition);
            }
            this.currentDragFeedbackDisposable = toDisposable(() => {
                for (const index of feedback) {
                    const item = this.items[index];
                    item.dropTarget = false;
                    item.row?.domNode.classList.remove(dragOverEffectPosition);
                }
            });
        }
        return true;
    }
    onDragLeave(event) {
        this.onDragLeaveTimeout.dispose();
        this.onDragLeaveTimeout = disposableTimeout(() => this.clearDragOverFeedback(), 100, this.disposables);
        if (this.currentDragData) {
            this.dnd.onDragLeave?.(this.currentDragData, event.element, event.index, event.browserEvent);
        }
    }
    onDrop(event) {
        if (!this.canDrop) {
            return;
        }
        const dragData = this.currentDragData;
        this.teardownDragAndDropScrollTopAnimation();
        this.clearDragOverFeedback();
        this.domNode.classList.remove('dragging');
        this.currentDragData = undefined;
        StaticDND.CurrentDragAndDropData = undefined;
        if (!dragData || !event.browserEvent.dataTransfer) {
            return;
        }
        event.browserEvent.preventDefault();
        dragData.update(event.browserEvent.dataTransfer);
        this.dnd.drop(dragData, event.element, event.index, event.sector, event.browserEvent);
    }
    onDragEnd(event) {
        this.canDrop = false;
        this.teardownDragAndDropScrollTopAnimation();
        this.clearDragOverFeedback();
        this.domNode.classList.remove('dragging');
        this.currentDragData = undefined;
        StaticDND.CurrentDragAndDropData = undefined;
        this.dnd.onDragEnd?.(event);
    }
    clearDragOverFeedback() {
        this.currentDragFeedback = undefined;
        this.currentDragFeedbackPosition = undefined;
        this.currentDragFeedbackDisposable.dispose();
        this.currentDragFeedbackDisposable = Disposable.None;
    }
    // DND scroll top animation
    setupDragAndDropScrollTopAnimation(event) {
        if (!this.dragOverAnimationDisposable) {
            const viewTop = getTopLeftOffset(this.domNode).top;
            this.dragOverAnimationDisposable = animate(getWindow(this.domNode), this.animateDragAndDropScrollTop.bind(this, viewTop));
        }
        this.dragOverAnimationStopDisposable.dispose();
        this.dragOverAnimationStopDisposable = disposableTimeout(() => {
            if (this.dragOverAnimationDisposable) {
                this.dragOverAnimationDisposable.dispose();
                this.dragOverAnimationDisposable = undefined;
            }
        }, 1000, this.disposables);
        this.dragOverMouseY = event.pageY;
    }
    animateDragAndDropScrollTop(viewTop) {
        if (this.dragOverMouseY === undefined) {
            return;
        }
        const diff = this.dragOverMouseY - viewTop;
        const upperLimit = this.renderHeight - 35;
        if (diff < 35) {
            this.scrollTop += Math.max(-14, Math.floor(0.3 * (diff - 35)));
        }
        else if (diff > upperLimit) {
            this.scrollTop += Math.min(14, Math.floor(0.3 * (diff - upperLimit)));
        }
    }
    teardownDragAndDropScrollTopAnimation() {
        this.dragOverAnimationStopDisposable.dispose();
        if (this.dragOverAnimationDisposable) {
            this.dragOverAnimationDisposable.dispose();
            this.dragOverAnimationDisposable = undefined;
        }
    }
    // Util
    getTargetSector(browserEvent, targetIndex) {
        if (targetIndex === undefined) {
            return undefined;
        }
        const relativePosition = browserEvent.offsetY / this.items[targetIndex].size;
        const sector = Math.floor(relativePosition / 0.25);
        return clamp(sector, 0, 3);
    }
    getItemIndexFromEventTarget(target) {
        const scrollableElement = this.scrollableElement.getDomNode();
        let element = target;
        while ((isHTMLElement(element) || isSVGElement(element)) && element !== this.rowsContainer && scrollableElement.contains(element)) {
            const rawIndex = element.getAttribute('data-index');
            if (rawIndex) {
                const index = Number(rawIndex);
                if (!isNaN(index)) {
                    return index;
                }
            }
            element = element.parentElement;
        }
        return undefined;
    }
    getVisibleRange(renderTop, renderHeight) {
        return {
            start: this.rangeMap.indexAt(renderTop),
            end: this.rangeMap.indexAfter(renderTop + renderHeight - 1)
        };
    }
    getRenderRange(renderTop, renderHeight) {
        const range = this.getVisibleRange(renderTop, renderHeight);
        if (this.currentSelectionBounds) {
            const max = this.rangeMap.count;
            range.start = Math.min(range.start, this.currentSelectionBounds.start, max);
            range.end = Math.min(Math.max(range.end, this.currentSelectionBounds.end + 1), max);
        }
        return range;
    }
    /**
     * Given a stable rendered state, checks every rendered element whether it needs
     * to be probed for dynamic height. Adjusts scroll height and top if necessary.
     */
    _rerender(renderTop, renderHeight, inSmoothScrolling) {
        const previousRenderRange = this.getRenderRange(renderTop, renderHeight);
        // Let's remember the second element's position, this helps in scrolling up
        // and preserving a linear upwards scroll movement
        let anchorElementIndex;
        let anchorElementTopDelta;
        if (renderTop === this.elementTop(previousRenderRange.start)) {
            anchorElementIndex = previousRenderRange.start;
            anchorElementTopDelta = 0;
        }
        else if (previousRenderRange.end - previousRenderRange.start > 1) {
            anchorElementIndex = previousRenderRange.start + 1;
            anchorElementTopDelta = this.elementTop(anchorElementIndex) - renderTop;
        }
        let heightDiff = 0;
        while (true) {
            const renderRange = this.getRenderRange(renderTop, renderHeight);
            let didChange = false;
            for (let i = renderRange.start; i < renderRange.end; i++) {
                const diff = this.probeDynamicHeight(i);
                if (diff !== 0) {
                    this.rangeMap.splice(i, 1, [this.items[i]]);
                }
                heightDiff += diff;
                didChange = didChange || diff !== 0;
            }
            if (!didChange) {
                if (heightDiff !== 0) {
                    this.eventuallyUpdateScrollDimensions();
                }
                const unrenderRanges = Range.relativeComplement(previousRenderRange, renderRange);
                for (const range of unrenderRanges) {
                    for (let i = range.start; i < range.end; i++) {
                        if (this.items[i].row) {
                            this.removeItemFromDOM(i);
                        }
                    }
                }
                const renderRanges = Range.relativeComplement(renderRange, previousRenderRange).reverse();
                for (const range of renderRanges) {
                    for (let i = range.end - 1; i >= range.start; i--) {
                        this.insertItemInDOM(i);
                    }
                }
                for (let i = renderRange.start; i < renderRange.end; i++) {
                    if (this.items[i].row) {
                        this.updateItemInDOM(this.items[i], i);
                    }
                }
                if (typeof anchorElementIndex === 'number') {
                    // To compute a destination scroll top, we need to take into account the current smooth scrolling
                    // animation, and then reuse it with a new target (to avoid prolonging the scroll)
                    // See https://github.com/microsoft/vscode/issues/104144
                    // See https://github.com/microsoft/vscode/pull/104284
                    // See https://github.com/microsoft/vscode/issues/107704
                    const deltaScrollTop = this.scrollable.getFutureScrollPosition().scrollTop - renderTop;
                    const newScrollTop = this.elementTop(anchorElementIndex) - anchorElementTopDelta + deltaScrollTop;
                    this.setScrollTop(newScrollTop, inSmoothScrolling);
                }
                this._onDidChangeContentHeight.fire(this.contentHeight);
                return;
            }
        }
    }
    probeDynamicHeight(index) {
        const item = this.items[index];
        if (!!this.virtualDelegate.getDynamicHeight) {
            const newSize = this.virtualDelegate.getDynamicHeight(item.element);
            if (newSize !== null) {
                const size = item.size;
                item.size = newSize;
                item.lastDynamicHeightWidth = this.renderWidth;
                return newSize - size;
            }
        }
        if (!item.hasDynamicHeight || item.lastDynamicHeightWidth === this.renderWidth) {
            return 0;
        }
        if (!!this.virtualDelegate.hasDynamicHeight && !this.virtualDelegate.hasDynamicHeight(item.element)) {
            return 0;
        }
        const size = item.size;
        if (item.row) {
            item.row.domNode.style.height = '';
            item.size = item.row.domNode.offsetHeight;
            if (item.size === 0 && !isAncestor(item.row.domNode, getWindow(item.row.domNode).document.body)) {
                console.warn('Measuring item node that is not in DOM! Add ListView to the DOM before measuring row height!', new Error().stack);
            }
            item.lastDynamicHeightWidth = this.renderWidth;
            return item.size - size;
        }
        const { row } = this.cache.alloc(item.templateId);
        row.domNode.style.height = '';
        this.rowsContainer.appendChild(row.domNode);
        const renderer = this.renderers.get(item.templateId);
        if (!renderer) {
            throw new BugIndicatingError('Missing renderer for templateId: ' + item.templateId);
        }
        renderer.renderElement(item.element, index, row.templateData);
        item.size = row.domNode.offsetHeight;
        renderer.disposeElement?.(item.element, index, row.templateData);
        this.virtualDelegate.setDynamicHeight?.(item.element, item.size);
        item.lastDynamicHeightWidth = this.renderWidth;
        row.domNode.remove();
        this.cache.release(row);
        return item.size - size;
    }
    getElementDomId(index) {
        return `${this.domId}_${index}`;
    }
    // Dispose
    dispose() {
        for (const item of this.items) {
            item.dragStartDisposable.dispose();
            item.checkedDisposable.dispose();
            if (item.row) {
                const renderer = this.renderers.get(item.row.templateId);
                if (renderer) {
                    renderer.disposeElement?.(item.element, -1, item.row.templateData, undefined);
                    renderer.disposeTemplate(item.row.templateData);
                }
            }
        }
        this.items = [];
        this.domNode?.remove();
        this.dragOverAnimationDisposable?.dispose();
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], ListView.prototype, "onMouseClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseDblClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseMiddleClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseUp", null);
__decorate([
    memoize
], ListView.prototype, "onMouseDown", null);
__decorate([
    memoize
], ListView.prototype, "onMouseOver", null);
__decorate([
    memoize
], ListView.prototype, "onMouseMove", null);
__decorate([
    memoize
], ListView.prototype, "onMouseOut", null);
__decorate([
    memoize
], ListView.prototype, "onContextMenu", null);
__decorate([
    memoize
], ListView.prototype, "onTouchStart", null);
__decorate([
    memoize
], ListView.prototype, "onTap", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9saXN0L2xpc3RWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sY0FBYyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxPQUFPLEVBQWEsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL08sT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTVDLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUF5QixNQUFNLDBCQUEwQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQXdCLFVB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QUFXLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQWUsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVRLElBQUksU0FBUyxLQUFnQyxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsTCxJQUFJLFdBQVcsS0FBZ0MsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEwsSUFBSSxXQUFXLEtBQWdDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RMLElBQUksV0FBVyxLQUFnQyxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0TCxJQUFJLFVBQVUsS0FBZ0MsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEwsSUFBSSxhQUFhLEtBQXVELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBZ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQTRCLEVBQUUsQ0FBQyxDQUFDLEVB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