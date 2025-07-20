/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getZoomFactor, isChrome } from '../../browser.js';
import * as dom from '../../dom.js';
import { createFastDomNode } from '../../fastDomNode.js';
import { StandardWheelEvent } from '../../mouseEvent.js';
import { HorizontalScrollbar } from './horizontalScrollbar.js';
import { VerticalScrollbar } from './verticalScrollbar.js';
import { Widget } from '../widget.js';
import { TimeoutTimer } from '../../../common/async.js';
import { Emitter } from '../../../common/event.js';
import { dispose } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import { Scrollable } from '../../../common/scrollable.js';
import './media/scrollbars.css';
const HIDE_TIMEOUT = 500;
const SCROLL_WHEEL_SENSITIVITY = 50;
const SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED = true;
class MouseWheelClassifierItem {
    constructor(timestamp, deltaX, deltaY) {
        this.timestamp = timestamp;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
        this.score = 0;
    }
}
export class MouseWheelClassifier {
    static { this.INSTANCE = new MouseWheelClassifier(); }
    constructor() {
        this._capacity = 5;
        this._memory = [];
        this._front = -1;
        this._rear = -1;
    }
    isPhysicalMouseWheel() {
        if (this._front === -1 && this._rear === -1) {
            // no elements
            return false;
        }
        // 0.5 * last + 0.25 * 2nd last + 0.125 * 3rd last + ...
        let remainingInfluence = 1;
        let score = 0;
        let iteration = 1;
        let index = this._rear;
        do {
            const influence = (index === this._front ? remainingInfluence : Math.pow(2, -iteration));
            remainingInfluence -= influence;
            score += this._memory[index].score * influence;
            if (index === this._front) {
                break;
            }
            index = (this._capacity + index - 1) % this._capacity;
            iteration++;
        } while (true);
        return (score <= 0.5);
    }
    acceptStandardWheelEvent(e) {
        if (isChrome) {
            const targetWindow = dom.getWindow(e.browserEvent);
            const pageZoomFactor = getZoomFactor(targetWindow);
            // On Chrome, the incoming delta events are multiplied with the OS zoom factor.
            // The OS zoom factor can be reverse engineered by using the device pixel ratio and the configured zoom factor into account.
            this.accept(Date.now(), e.deltaX * pageZoomFactor, e.deltaY * pageZoomFactor);
        }
        else {
            this.accept(Date.now(), e.deltaX, e.deltaY);
        }
    }
    accept(timestamp, deltaX, deltaY) {
        let previousItem = null;
        const item = new MouseWheelClassifierItem(timestamp, deltaX, deltaY);
        if (this._front === -1 && this._rear === -1) {
            this._memory[0] = item;
            this._front = 0;
            this._rear = 0;
        }
        else {
            previousItem = this._memory[this._rear];
            this._rear = (this._rear + 1) % this._capacity;
            if (this._rear === this._front) {
                // Drop oldest
                this._front = (this._front + 1) % this._capacity;
            }
            this._memory[this._rear] = item;
        }
        item.score = this._computeScore(item, previousItem);
    }
    /**
     * A score between 0 and 1 for `item`.
     *  - a score towards 0 indicates that the source appears to be a physical mouse wheel
     *  - a score towards 1 indicates that the source appears to be a touchpad or magic mouse, etc.
     */
    _computeScore(item, previousItem) {
        if (Math.abs(item.deltaX) > 0 && Math.abs(item.deltaY) > 0) {
            // both axes exercised => definitely not a physical mouse wheel
            return 1;
        }
        let score = 0.5;
        if (!this._isAlmostInt(item.deltaX) || !this._isAlmostInt(item.deltaY)) {
            // non-integer deltas => indicator that this is not a physical mouse wheel
            score += 0.25;
        }
        // Non-accelerating scroll => indicator that this is a physical mouse wheel
        // These can be identified by seeing whether they are the module of one another.
        if (previousItem) {
            const absDeltaX = Math.abs(item.deltaX);
            const absDeltaY = Math.abs(item.deltaY);
            const absPreviousDeltaX = Math.abs(previousItem.deltaX);
            const absPreviousDeltaY = Math.abs(previousItem.deltaY);
            // Min 1 to avoid division by zero, module 1 will still be 0.
            const minDeltaX = Math.max(Math.min(absDeltaX, absPreviousDeltaX), 1);
            const minDeltaY = Math.max(Math.min(absDeltaY, absPreviousDeltaY), 1);
            const maxDeltaX = Math.max(absDeltaX, absPreviousDeltaX);
            const maxDeltaY = Math.max(absDeltaY, absPreviousDeltaY);
            const isSameModulo = (maxDeltaX % minDeltaX === 0 && maxDeltaY % minDeltaY === 0);
            if (isSameModulo) {
                score -= 0.5;
            }
        }
        return Math.min(Math.max(score, 0), 1);
    }
    _isAlmostInt(value) {
        const epsilon = Number.EPSILON * 100; // Use a small tolerance factor for floating-point errors
        const delta = Math.abs(Math.round(value) - value);
        return (delta < 0.01 + epsilon);
    }
}
export class AbstractScrollableElement extends Widget {
    get options() {
        return this._options;
    }
    constructor(element, options, scrollable) {
        super();
        this._inertialTimeout = null;
        this._inertialSpeed = { X: 0, Y: 0 };
        this._onScroll = this._register(new Emitter());
        this.onScroll = this._onScroll.event;
        this._onWillScroll = this._register(new Emitter());
        this.onWillScroll = this._onWillScroll.event;
        element.style.overflow = 'hidden';
        this._options = resolveOptions(options);
        this._scrollable = scrollable;
        this._register(this._scrollable.onScroll((e) => {
            this._onWillScroll.fire(e);
            this._onDidScroll(e);
            this._onScroll.fire(e);
        }));
        const scrollbarHost = {
            onMouseWheel: (mouseWheelEvent) => this._onMouseWheel(mouseWheelEvent),
            onDragStart: () => this._onDragStart(),
            onDragEnd: () => this._onDragEnd(),
        };
        this._verticalScrollbar = this._register(new VerticalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._horizontalScrollbar = this._register(new HorizontalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.style.position = 'relative';
        this._domNode.style.overflow = 'hidden';
        this._domNode.appendChild(element);
        this._domNode.appendChild(this._horizontalScrollbar.domNode.domNode);
        this._domNode.appendChild(this._verticalScrollbar.domNode.domNode);
        if (this._options.useShadows) {
            this._leftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._leftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._leftShadowDomNode.domNode);
            this._topShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topShadowDomNode.domNode);
            this._topLeftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topLeftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topLeftShadowDomNode.domNode);
        }
        else {
            this._leftShadowDomNode = null;
            this._topShadowDomNode = null;
            this._topLeftShadowDomNode = null;
        }
        this._listenOnDomNode = this._options.listenOnDomNode || this._domNode;
        this._mouseWheelToDispose = [];
        this._setListeningToMouseWheel(this._options.handleMouseWheel);
        this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e));
        this.onmouseleave(this._listenOnDomNode, (e) => this._onMouseLeave(e));
        this._hideTimeout = this._register(new TimeoutTimer());
        this._isDragging = false;
        this._mouseIsOver = false;
        this._shouldRender = true;
        this._revealOnScroll = true;
    }
    dispose() {
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        if (this._inertialTimeout) {
            this._inertialTimeout.dispose();
            this._inertialTimeout = null;
        }
        super.dispose();
    }
    /**
     * Get the generated 'scrollable' dom node
     */
    getDomNode() {
        return this._domNode;
    }
    getOverviewRulerLayoutInfo() {
        return {
            parent: this._domNode,
            insertBefore: this._verticalScrollbar.domNode.domNode,
        };
    }
    /**
     * Delegate a pointer down event to the vertical scrollbar.
     * This is to help with clicking somewhere else and having the scrollbar react.
     */
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._verticalScrollbar.delegatePointerDown(browserEvent);
    }
    getScrollDimensions() {
        return this._scrollable.getScrollDimensions();
    }
    setScrollDimensions(dimensions) {
        this._scrollable.setScrollDimensions(dimensions, false);
    }
    /**
     * Update the class name of the scrollable element.
     */
    updateClassName(newClassName) {
        this._options.className = newClassName;
        // Defaults are different on Macs
        if (platform.isMacintosh) {
            this._options.className += ' mac';
        }
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
    }
    /**
     * Update configuration options for the scrollbar.
     */
    updateOptions(newOptions) {
        if (typeof newOptions.handleMouseWheel !== 'undefined') {
            this._options.handleMouseWheel = newOptions.handleMouseWheel;
            this._setListeningToMouseWheel(this._options.handleMouseWheel);
        }
        if (typeof newOptions.mouseWheelScrollSensitivity !== 'undefined') {
            this._options.mouseWheelScrollSensitivity = newOptions.mouseWheelScrollSensitivity;
        }
        if (typeof newOptions.fastScrollSensitivity !== 'undefined') {
            this._options.fastScrollSensitivity = newOptions.fastScrollSensitivity;
        }
        if (typeof newOptions.scrollPredominantAxis !== 'undefined') {
            this._options.scrollPredominantAxis = newOptions.scrollPredominantAxis;
        }
        if (typeof newOptions.horizontal !== 'undefined') {
            this._options.horizontal = newOptions.horizontal;
        }
        if (typeof newOptions.vertical !== 'undefined') {
            this._options.vertical = newOptions.vertical;
        }
        if (typeof newOptions.horizontalScrollbarSize !== 'undefined') {
            this._options.horizontalScrollbarSize = newOptions.horizontalScrollbarSize;
        }
        if (typeof newOptions.verticalScrollbarSize !== 'undefined') {
            this._options.verticalScrollbarSize = newOptions.verticalScrollbarSize;
        }
        if (typeof newOptions.scrollByPage !== 'undefined') {
            this._options.scrollByPage = newOptions.scrollByPage;
        }
        this._horizontalScrollbar.updateOptions(this._options);
        this._verticalScrollbar.updateOptions(this._options);
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    setRevealOnScroll(value) {
        this._revealOnScroll = value;
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._onMouseWheel(new StandardWheelEvent(browserEvent));
    }
    async _periodicSync() {
        let scheduleAgain = false;
        if (this._inertialSpeed.X !== 0 || this._inertialSpeed.Y !== 0) {
            this._scrollable.setScrollPositionNow({
                scrollTop: this._scrollable.getCurrentScrollPosition().scrollTop - this._inertialSpeed.Y * 100,
                scrollLeft: this._scrollable.getCurrentScrollPosition().scrollLeft - this._inertialSpeed.X * 100
            });
            this._inertialSpeed.X *= 0.9;
            this._inertialSpeed.Y *= 0.9;
            if (Math.abs(this._inertialSpeed.X) < 0.01) {
                this._inertialSpeed.X = 0;
            }
            if (Math.abs(this._inertialSpeed.Y) < 0.01) {
                this._inertialSpeed.Y = 0;
            }
            scheduleAgain = (this._inertialSpeed.X !== 0 || this._inertialSpeed.Y !== 0);
        }
        if (scheduleAgain) {
            if (!this._inertialTimeout) {
                this._inertialTimeout = new TimeoutTimer();
            }
            this._inertialTimeout.cancelAndSet(() => this._periodicSync(), 1000 / 60);
        }
        else {
            this._inertialTimeout?.dispose();
            this._inertialTimeout = null;
        }
    }
    // -------------------- mouse wheel scrolling --------------------
    _setListeningToMouseWheel(shouldListen) {
        const isListening = (this._mouseWheelToDispose.length > 0);
        if (isListening === shouldListen) {
            // No change
            return;
        }
        // Stop listening (if necessary)
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        // Start listening (if necessary)
        if (shouldListen) {
            const onMouseWheel = (browserEvent) => {
                this._onMouseWheel(new StandardWheelEvent(browserEvent));
            };
            this._mouseWheelToDispose.push(dom.addDisposableListener(this._listenOnDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { passive: false }));
        }
    }
    _onMouseWheel(e) {
        if (e.browserEvent?.defaultPrevented) {
            return;
        }
        const classifier = MouseWheelClassifier.INSTANCE;
        if (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED) {
            classifier.acceptStandardWheelEvent(e);
        }
        // useful for creating unit tests:
        // console.log(`${Date.now()}, ${e.deltaY}, ${e.deltaX}`);
        let didScroll = false;
        if (e.deltaY || e.deltaX) {
            let deltaY = e.deltaY * this._options.mouseWheelScrollSensitivity;
            let deltaX = e.deltaX * this._options.mouseWheelScrollSensitivity;
            if (this._options.scrollPredominantAxis) {
                if (this._options.scrollYToX && deltaX + deltaY === 0) {
                    // when configured to map Y to X and we both see
                    // no dominant axis and X and Y are competing with
                    // identical values into opposite directions, we
                    // ignore the delta as we cannot make a decision then
                    deltaX = deltaY = 0;
                }
                else if (Math.abs(deltaY) >= Math.abs(deltaX)) {
                    deltaX = 0;
                }
                else {
                    deltaY = 0;
                }
            }
            if (this._options.flipAxes) {
                [deltaY, deltaX] = [deltaX, deltaY];
            }
            // Convert vertical scrolling to horizontal if shift is held, this
            // is handled at a higher level on Mac
            const shiftConvert = !platform.isMacintosh && e.browserEvent && e.browserEvent.shiftKey;
            if ((this._options.scrollYToX || shiftConvert) && !deltaX) {
                deltaX = deltaY;
                deltaY = 0;
            }
            if (e.browserEvent && e.browserEvent.altKey) {
                // fastScrolling
                deltaX = deltaX * this._options.fastScrollSensitivity;
                deltaY = deltaY * this._options.fastScrollSensitivity;
            }
            const futureScrollPosition = this._scrollable.getFutureScrollPosition();
            let desiredScrollPosition = {};
            if (deltaY) {
                const deltaScrollTop = SCROLL_WHEEL_SENSITIVITY * deltaY;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollTop = futureScrollPosition.scrollTop - (deltaScrollTop < 0 ? Math.floor(deltaScrollTop) : Math.ceil(deltaScrollTop));
                this._verticalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollTop);
            }
            if (deltaX) {
                const deltaScrollLeft = SCROLL_WHEEL_SENSITIVITY * deltaX;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollLeft = futureScrollPosition.scrollLeft - (deltaScrollLeft < 0 ? Math.floor(deltaScrollLeft) : Math.ceil(deltaScrollLeft));
                this._horizontalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollLeft);
            }
            // Check that we are scrolling towards a location which is valid
            desiredScrollPosition = this._scrollable.validateScrollPosition(desiredScrollPosition);
            if (this._options.inertialScroll && (deltaX || deltaY)) {
                let startPeriodic = false;
                // Only start periodic if it's not running
                if (this._inertialSpeed.X === 0 && this._inertialSpeed.Y === 0) {
                    startPeriodic = true;
                }
                this._inertialSpeed.Y = (deltaY < 0 ? -1 : 1) * (Math.abs(deltaY) ** 1.02);
                this._inertialSpeed.X = (deltaX < 0 ? -1 : 1) * (Math.abs(deltaX) ** 1.02);
                if (startPeriodic) {
                    this._periodicSync();
                }
            }
            if (futureScrollPosition.scrollLeft !== desiredScrollPosition.scrollLeft || futureScrollPosition.scrollTop !== desiredScrollPosition.scrollTop) {
                const canPerformSmoothScroll = (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED
                    && this._options.mouseWheelSmoothScroll
                    && classifier.isPhysicalMouseWheel());
                if (canPerformSmoothScroll) {
                    this._scrollable.setScrollPositionSmooth(desiredScrollPosition);
                }
                else {
                    this._scrollable.setScrollPositionNow(desiredScrollPosition);
                }
                didScroll = true;
            }
        }
        let consumeMouseWheel = didScroll;
        if (!consumeMouseWheel && this._options.alwaysConsumeMouseWheel) {
            consumeMouseWheel = true;
        }
        if (!consumeMouseWheel && this._options.consumeMouseWheelIfScrollbarIsNeeded && (this._verticalScrollbar.isNeeded() || this._horizontalScrollbar.isNeeded())) {
            consumeMouseWheel = true;
        }
        if (consumeMouseWheel) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    _onDidScroll(e) {
        this._shouldRender = this._horizontalScrollbar.onDidScroll(e) || this._shouldRender;
        this._shouldRender = this._verticalScrollbar.onDidScroll(e) || this._shouldRender;
        if (this._options.useShadows) {
            this._shouldRender = true;
        }
        if (this._revealOnScroll) {
            this._reveal();
        }
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    /**
     * Render / mutate the DOM now.
     * Should be used together with the ctor option `lazyRender`.
     */
    renderNow() {
        if (!this._options.lazyRender) {
            throw new Error('Please use `lazyRender` together with `renderNow`!');
        }
        this._render();
    }
    _render() {
        if (!this._shouldRender) {
            return;
        }
        this._shouldRender = false;
        this._horizontalScrollbar.render();
        this._verticalScrollbar.render();
        if (this._options.useShadows) {
            const scrollState = this._scrollable.getCurrentScrollPosition();
            const enableTop = scrollState.scrollTop > 0;
            const enableLeft = scrollState.scrollLeft > 0;
            const leftClassName = (enableLeft ? ' left' : '');
            const topClassName = (enableTop ? ' top' : '');
            const topLeftClassName = (enableLeft || enableTop ? ' top-left-corner' : '');
            this._leftShadowDomNode.setClassName(`shadow${leftClassName}`);
            this._topShadowDomNode.setClassName(`shadow${topClassName}`);
            this._topLeftShadowDomNode.setClassName(`shadow${topLeftClassName}${topClassName}${leftClassName}`);
        }
    }
    // -------------------- fade in / fade out --------------------
    _onDragStart() {
        this._isDragging = true;
        this._reveal();
    }
    _onDragEnd() {
        this._isDragging = false;
        this._hide();
    }
    _onMouseLeave(e) {
        this._mouseIsOver = false;
        this._hide();
    }
    _onMouseOver(e) {
        this._mouseIsOver = true;
        this._reveal();
    }
    _reveal() {
        this._verticalScrollbar.beginReveal();
        this._horizontalScrollbar.beginReveal();
        this._scheduleHide();
    }
    _hide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._verticalScrollbar.beginHide();
            this._horizontalScrollbar.beginHide();
        }
    }
    _scheduleHide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._hideTimeout.cancelAndSet(() => this._hide(), HIDE_TIMEOUT);
        }
    }
}
export class ScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback)
        });
        super(element, options, scrollable);
        this._register(scrollable);
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class SmoothScrollableElement extends AbstractScrollableElement {
    constructor(element, options, scrollable) {
        super(element, options, scrollable);
    }
    setScrollPosition(update) {
        if (update.reuseAnimation) {
            this._scrollable.setScrollPositionSmooth(update, update.reuseAnimation);
        }
        else {
            this._scrollable.setScrollPositionNow(update);
        }
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class DomScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: false, // See https://github.com/microsoft/vscode/issues/139877
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback)
        });
        super(element, options, scrollable);
        this._register(scrollable);
        this._element = element;
        this._register(this.onScroll((e) => {
            if (e.scrollTopChanged) {
                this._element.scrollTop = e.scrollTop;
            }
            if (e.scrollLeftChanged) {
                this._element.scrollLeft = e.scrollLeft;
            }
        }));
        this.scanDomNode();
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    scanDomNode() {
        // width, scrollLeft, scrollWidth, height, scrollTop, scrollHeight
        this.setScrollDimensions({
            width: this._element.clientWidth,
            scrollWidth: this._element.scrollWidth,
            height: this._element.clientHeight,
            scrollHeight: this._element.scrollHeight
        });
        this.setScrollPosition({
            scrollLeft: this._element.scrollLeft,
            scrollTop: this._element.scrollTop,
        });
    }
}
function resolveOptions(opts) {
    const result = {
        lazyRender: (typeof opts.lazyRender !== 'undefined' ? opts.lazyRender : false),
        className: (typeof opts.className !== 'undefined' ? opts.className : ''),
        useShadows: (typeof opts.useShadows !== 'undefined' ? opts.useShadows : true),
        handleMouseWheel: (typeof opts.handleMouseWheel !== 'undefined' ? opts.handleMouseWheel : true),
        flipAxes: (typeof opts.flipAxes !== 'undefined' ? opts.flipAxes : false),
        consumeMouseWheelIfScrollbarIsNeeded: (typeof opts.consumeMouseWheelIfScrollbarIsNeeded !== 'undefined' ? opts.consumeMouseWheelIfScrollbarIsNeeded : false),
        alwaysConsumeMouseWheel: (typeof opts.alwaysConsumeMouseWheel !== 'undefined' ? opts.alwaysConsumeMouseWheel : false),
        scrollYToX: (typeof opts.scrollYToX !== 'undefined' ? opts.scrollYToX : false),
        mouseWheelScrollSensitivity: (typeof opts.mouseWheelScrollSensitivity !== 'undefined' ? opts.mouseWheelScrollSensitivity : 1),
        fastScrollSensitivity: (typeof opts.fastScrollSensitivity !== 'undefined' ? opts.fastScrollSensitivity : 5),
        scrollPredominantAxis: (typeof opts.scrollPredominantAxis !== 'undefined' ? opts.scrollPredominantAxis : true),
        mouseWheelSmoothScroll: (typeof opts.mouseWheelSmoothScroll !== 'undefined' ? opts.mouseWheelSmoothScroll : true),
        inertialScroll: (typeof opts.inertialScroll !== 'undefined' ? opts.inertialScroll : false),
        arrowSize: (typeof opts.arrowSize !== 'undefined' ? opts.arrowSize : 11),
        listenOnDomNode: (typeof opts.listenOnDomNode !== 'undefined' ? opts.listenOnDomNode : null),
        horizontal: (typeof opts.horizontal !== 'undefined' ? opts.horizontal : 1 /* ScrollbarVisibility.Auto */),
        horizontalScrollbarSize: (typeof opts.horizontalScrollbarSize !== 'undefined' ? opts.horizontalScrollbarSize : 10),
        horizontalSliderSize: (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : 0),
        horizontalHasArrows: (typeof opts.horizontalHasArrows !== 'undefined' ? opts.horizontalHasArrows : false),
        vertical: (typeof opts.vertical !== 'undefined' ? opts.vertical : 1 /* ScrollbarVisibility.Auto */),
        verticalScrollbarSize: (typeof opts.verticalScrollbarSize !== 'undefined' ? opts.verticalScrollbarSize : 10),
        verticalHasArrows: (typeof opts.verticalHasArrows !== 'undefined' ? opts.verticalHasArrows : false),
        verticalSliderSize: (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : 0),
        scrollByPage: (typeof opts.scrollByPage !== 'undefined' ? opts.scrollByPage : false)
    };
    result.horizontalSliderSize = (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : result.horizontalScrollbarSize);
    result.verticalSliderSize = (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : result.verticalScrollbarSize);
    // Defaults are different on Macs
    if (platform.isMacintosh) {
        result.className += ' mac';
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZUVsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zY3JvbGxiYXIvc2Nyb2xsYWJsZUVsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUNwQyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN0RSxPQUFPLEVBQWlDLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN0QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFDO0FBQzFELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRSxPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hELE9BQU8sRUFBNkYsVUFBVSxFQUF1QixNQUFNLCtCQUErQixDQUFDO0FBQzNLLE9BQU8sd0JBQXdCLENBQUM7QUFFaEMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDO0FBQ3pCLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxDQUFDO0FBT2hELE1BQU0sd0JBQXdCO0lBTTdCLFlBQVksU0FBaUIs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