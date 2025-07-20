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
import { $, append, EventHelper, getWindow, isHTMLElement } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { DomEmitter } from '../../event.js';
import { EventType, Gesture } from '../../touch.js';
import { Delayer } from '../../../common/async.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import './sash.css';
/**
 * Allow the sashes to be visible at runtime.
 * @remark Use for development purposes only.
 */
const DEBUG = false;
export var OrthogonalEdge;
(function (OrthogonalEdge) {
    OrthogonalEdge["North"] = "north";
    OrthogonalEdge["South"] = "south";
    OrthogonalEdge["East"] = "east";
    OrthogonalEdge["West"] = "west";
})(OrthogonalEdge || (OrthogonalEdge = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["VERTICAL"] = 0] = "VERTICAL";
    Orientation[Orientation["HORIZONTAL"] = 1] = "HORIZONTAL";
})(Orientation || (Orientation = {}));
export var SashState;
(function (SashState) {
    /**
     * Disable any UI interaction.
     */
    SashState[SashState["Disabled"] = 0] = "Disabled";
    /**
     * Allow dragging down or to the right, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any smaller, but can be larger.
     */
    SashState[SashState["AtMinimum"] = 1] = "AtMinimum";
    /**
     * Allow dragging up or to the left, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any larger, but can be smaller.
     */
    SashState[SashState["AtMaximum"] = 2] = "AtMaximum";
    /**
     * Enable dragging.
     */
    SashState[SashState["Enabled"] = 3] = "Enabled";
})(SashState || (SashState = {}));
let globalSize = 4;
const onDidChangeGlobalSize = new Emitter();
export function setGlobalSashSize(size) {
    globalSize = size;
    onDidChangeGlobalSize.fire(size);
}
let globalHoverDelay = 300;
const onDidChangeHoverDelay = new Emitter();
export function setGlobalHoverDelay(size) {
    globalHoverDelay = size;
    onDidChangeHoverDelay.fire(size);
}
class MouseEventFactory {
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mousemove')).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mouseup')).event;
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerUp", null);
class GestureEventFactory {
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(this.el, EventType.Change)).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(this.el, EventType.End)).event;
    }
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerUp", null);
class OrthogonalPointerEventFactory {
    get onPointerMove() {
        return this.factory.onPointerMove;
    }
    get onPointerUp() {
        return this.factory.onPointerUp;
    }
    constructor(factory) {
        this.factory = factory;
    }
    dispose() {
        // noop
    }
}
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerUp", null);
const PointerEventsDisabledCssClass = 'pointer-events-disabled';
/**
 * The {@link Sash} is the UI component which allows the user to resize other
 * components. It's usually an invisible horizontal or vertical line which, when
 * hovered, becomes highlighted and can be dragged along the perpendicular dimension
 * to its direction.
 *
 * Features:
 * - Touch event handling
 * - Corner sash support
 * - Hover with different mouse cursor support
 * - Configurable hover size
 * - Linked sash support, for 2x2 corner sashes
 */
export class Sash extends Disposable {
    get state() { return this._state; }
    get orthogonalStartSash() { return this._orthogonalStartSash; }
    get orthogonalEndSash() { return this._orthogonalEndSash; }
    /**
     * The state of a sash defines whether it can be interacted with by the user
     * as well as what mouse cursor to use, when hovered.
     */
    set state(state) {
        if (this._state === state) {
            return;
        }
        this.el.classList.toggle('disabled', state === 0 /* SashState.Disabled */);
        this.el.classList.toggle('minimum', state === 1 /* SashState.AtMinimum */);
        this.el.classList.toggle('maximum', state === 2 /* SashState.AtMaximum */);
        this._state = state;
        this.onDidEnablementChange.fire(state);
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the start of this one. A corner sash will be created
     * automatically at that location.
     *
     * The start of a horizontal sash is its left-most position.
     * The start of a vertical sash is its top-most position.
     */
    set orthogonalStartSash(sash) {
        if (this._orthogonalStartSash === sash) {
            return;
        }
        this.orthogonalStartDragHandleDisposables.clear();
        this.orthogonalStartSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalStartDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalStartDragHandle = append(this.el, $('.orthogonal-drag-handle.start'));
                    this.orthogonalStartDragHandleDisposables.add(toDisposable(() => this._orthogonalStartDragHandle.remove()));
                    this.orthogonalStartDragHandleDisposables.add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseenter')).event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalStartDragHandleDisposables);
                    this.orthogonalStartDragHandleDisposables.add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseleave')).event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalStartDragHandleDisposables);
                }
            };
            this.orthogonalStartSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalStartSash = sash;
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the end of this one. A corner sash will be created
     * automatically at that location.
     *
     * The end of a horizontal sash is its right-most position.
     * The end of a vertical sash is its bottom-most position.
     */
    set orthogonalEndSash(sash) {
        if (this._orthogonalEndSash === sash) {
            return;
        }
        this.orthogonalEndDragHandleDisposables.clear();
        this.orthogonalEndSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalEndDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalEndDragHandle = append(this.el, $('.orthogonal-drag-handle.end'));
                    this.orthogonalEndDragHandleDisposables.add(toDisposable(() => this._orthogonalEndDragHandle.remove()));
                    this.orthogonalEndDragHandleDisposables.add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseenter')).event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalEndDragHandleDisposables);
                    this.orthogonalEndDragHandleDisposables.add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseleave')).event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalEndDragHandleDisposables);
                }
            };
            this.orthogonalEndSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalEndSash = sash;
    }
    constructor(container, layoutProvider, options) {
        super();
        this.hoverDelay = globalHoverDelay;
        this.hoverDelayer = this._register(new Delayer(this.hoverDelay));
        this._state = 3 /* SashState.Enabled */;
        this.onDidEnablementChange = this._register(new Emitter());
        this._onDidStart = this._register(new Emitter());
        this._onDidChange = this._register(new Emitter());
        this._onDidReset = this._register(new Emitter());
        this._onDidEnd = this._register(new Emitter());
        this.orthogonalStartSashDisposables = this._register(new DisposableStore());
        this.orthogonalStartDragHandleDisposables = this._register(new DisposableStore());
        this.orthogonalEndSashDisposables = this._register(new DisposableStore());
        this.orthogonalEndDragHandleDisposables = this._register(new DisposableStore());
        /**
         * An event which fires whenever the user starts dragging this sash.
         */
        this.onDidStart = this._onDidStart.event;
        /**
         * An event which fires whenever the user moves the mouse while
         * dragging this sash.
         */
        this.onDidChange = this._onDidChange.event;
        /**
         * An event which fires whenever the user double clicks this sash.
         */
        this.onDidReset = this._onDidReset.event;
        /**
         * An event which fires whenever the user stops dragging this sash.
         */
        this.onDidEnd = this._onDidEnd.event;
        /**
         * A linked sash will be forwarded the same user interactions and events
         * so it moves exactly the same way as this sash.
         *
         * Useful in 2x2 grids. Not meant for widespread usage.
         */
        this.linkedSash = undefined;
        this.el = append(container, $('.monaco-sash'));
        if (options.orthogonalEdge) {
            this.el.classList.add(`orthogonal-edge-${options.orthogonalEdge}`);
        }
        if (isMacintosh) {
            this.el.classList.add('mac');
        }
        const onMouseDown = this._register(new DomEmitter(this.el, 'mousedown')).event;
        this._register(onMouseDown(e => this.onPointerStart(e, new MouseEventFactory(container)), this));
        const onMouseDoubleClick = this._register(new DomEmitter(this.el, 'dblclick')).event;
        this._register(onMouseDoubleClick(this.onPointerDoublePress, this));
        const onMouseEnter = this._register(new DomEmitter(this.el, 'mouseenter')).event;
        this._register(onMouseEnter(() => Sash.onMouseEnter(this)));
        const onMouseLeave = this._register(new DomEmitter(this.el, 'mouseleave')).event;
        this._register(onMouseLeave(() => Sash.onMouseLeave(this)));
        this._register(Gesture.addTarget(this.el));
        const onTouchStart = this._register(new DomEmitter(this.el, EventType.Start)).event;
        this._register(onTouchStart(e => this.onPointerStart(e, new GestureEventFactory(this.el)), this));
        const onTap = this._register(new DomEmitter(this.el, EventType.Tap)).event;
        let doubleTapTimeout = undefined;
        this._register(onTap(event => {
            if (doubleTapTimeout) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = undefined;
                this.onPointerDoublePress(event);
                return;
            }
            clearTimeout(doubleTapTimeout);
            doubleTapTimeout = setTimeout(() => doubleTapTimeout = undefined, 250);
        }, this));
        if (typeof options.size === 'number') {
            this.size = options.size;
            if (options.orientation === 0 /* Orientation.VERTICAL */) {
                this.el.style.width = `${this.size}px`;
            }
            else {
                this.el.style.height = `${this.size}px`;
            }
        }
        else {
            this.size = globalSize;
            this._register(onDidChangeGlobalSize.event(size => {
                this.size = size;
                this.layout();
            }));
        }
        this._register(onDidChangeHoverDelay.event(delay => this.hoverDelay = delay));
        this.layoutProvider = layoutProvider;
        this.orthogonalStartSash = options.orthogonalStartSash;
        this.orthogonalEndSash = options.orthogonalEndSash;
        this.orientation = options.orientation || 0 /* Orientation.VERTICAL */;
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this.el.classList.add('horizontal');
            this.el.classList.remove('vertical');
        }
        else {
            this.el.classList.remove('horizontal');
            this.el.classList.add('vertical');
        }
        this.el.classList.toggle('debug', DEBUG);
        this.layout();
    }
    onPointerStart(event, pointerEventFactory) {
        EventHelper.stop(event);
        let isMultisashResize = false;
        if (!event.__orthogonalSashEvent) {
            const orthogonalSash = this.getOrthogonalSash(event);
            if (orthogonalSash) {
                isMultisashResize = true;
                event.__orthogonalSashEvent = true;
                orthogonalSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
            }
        }
        if (this.linkedSash && !event.__linkedSashEvent) {
            event.__linkedSashEvent = true;
            this.linkedSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
        }
        if (!this.state) {
            return;
        }
        const iframes = this.el.ownerDocument.getElementsByTagName('iframe');
        for (const iframe of iframes) {
            iframe.classList.add(PointerEventsDisabledCssClass); // disable mouse events on iframes as long as we drag the sash
        }
        const startX = event.pageX;
        const startY = event.pageY;
        const altKey = event.altKey;
        const startEvent = { startX, currentX: startX, startY, currentY: startY, altKey };
        this.el.classList.add('active');
        this._onDidStart.fire(startEvent);
        // fix https://github.com/microsoft/vscode/issues/21675
        const style = createStyleSheet(this.el);
        const updateStyle = () => {
            let cursor = '';
            if (isMultisashResize) {
                cursor = 'all-scroll';
            }
            else if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 's-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'n-resize';
                }
                else {
                    cursor = isMacintosh ? 'row-resize' : 'ns-resize';
                }
            }
            else {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 'e-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'w-resize';
                }
                else {
                    cursor = isMacintosh ? 'col-resize' : 'ew-resize';
                }
            }
            style.textContent = `* { cursor: ${cursor} !important; }`;
        };
        const disposables = new DisposableStore();
        updateStyle();
        if (!isMultisashResize) {
            this.onDidEnablementChange.event(updateStyle, null, disposables);
        }
        const onPointerMove = (e) => {
            EventHelper.stop(e, false);
            const event = { startX, currentX: e.pageX, startY, currentY: e.pageY, altKey };
            this._onDidChange.fire(event);
        };
        const onPointerUp = (e) => {
            EventHelper.stop(e, false);
            style.remove();
            this.el.classList.remove('active');
            this._onDidEnd.fire();
            disposables.dispose();
            for (const iframe of iframes) {
                iframe.classList.remove(PointerEventsDisabledCssClass);
            }
        };
        pointerEventFactory.onPointerMove(onPointerMove, null, disposables);
        pointerEventFactory.onPointerUp(onPointerUp, null, disposables);
        disposables.add(pointerEventFactory);
    }
    onPointerDoublePress(e) {
        const orthogonalSash = this.getOrthogonalSash(e);
        if (orthogonalSash) {
            orthogonalSash._onDidReset.fire();
        }
        if (this.linkedSash) {
            this.linkedSash._onDidReset.fire();
        }
        this._onDidReset.fire();
    }
    static onMouseEnter(sash, fromLinkedSash = false) {
        if (sash.el.classList.contains('active')) {
            sash.hoverDelayer.cancel();
            sash.el.classList.add('hover');
        }
        else {
            sash.hoverDelayer.trigger(() => sash.el.classList.add('hover'), sash.hoverDelay).then(undefined, () => { });
        }
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseEnter(sash.linkedSash, true);
        }
    }
    static onMouseLeave(sash, fromLinkedSash = false) {
        sash.hoverDelayer.cancel();
        sash.el.classList.remove('hover');
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseLeave(sash.linkedSash, true);
        }
    }
    /**
     * Forcefully stop any user interactions with this sash.
     * Useful when hiding a parent component, while the user is still
     * interacting with the sash.
     */
    clearSashHoverState() {
        Sash.onMouseLeave(this);
    }
    /**
     * Layout the sash. The sash will size and position itself
     * based on its provided {@link ISashLayoutProvider layout provider}.
     */
    layout() {
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            const verticalProvider = this.layoutProvider;
            this.el.style.left = verticalProvider.getVerticalSashLeft(this) - (this.size / 2) + 'px';
            if (verticalProvider.getVerticalSashTop) {
                this.el.style.top = verticalProvider.getVerticalSashTop(this) + 'px';
            }
            if (verticalProvider.getVerticalSashHeight) {
                this.el.style.height = verticalProvider.getVerticalSashHeight(this) + 'px';
            }
        }
        else {
            const horizontalProvider = this.layoutProvider;
            this.el.style.top = horizontalProvider.getHorizontalSashTop(this) - (this.size / 2) + 'px';
            if (horizontalProvider.getHorizontalSashLeft) {
                this.el.style.left = horizontalProvider.getHorizontalSashLeft(this) + 'px';
            }
            if (horizontalProvider.getHorizontalSashWidth) {
                this.el.style.width = horizontalProvider.getHorizontalSashWidth(this) + 'px';
            }
        }
    }
    getOrthogonalSash(e) {
        const target = e.initialTarget ?? e.target;
        if (!target || !(isHTMLElement(target))) {
            return undefined;
        }
        if (target.classList.contains('orthogonal-drag-handle')) {
            return target.classList.contains('start') ? this.orthogonalStartSash : this.orthogonalEndSash;
        }
        return undefined;
    }
    dispose() {
        super.dispose();
        this.el.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Nhc2gvc2FzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQWEsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxZQUFZLENBQUM7QUFFcEI7OztHQUdHO0FBQ0gsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBK0JwQixNQUFNLENBQU4sSUFBWSxjQUtYO0FBTEQsV0FBWSxjQUFjO0lBQ3pCLGlDQUFlLENBQUE7SUFDZixpQ0FBZSxDQUFBO0lBQ2YsK0JBQWEsQ0FBQTtJQUNiLCtCQUFhLENBQUE7QUFDZCxDQUFDLEVBTFcsY0FBYyxLQUFkLGNBQWMsUUFLekI7QUF3REQsTUFBTSxDQUFOLElBQWtCLFdBR2pCO0FBSEQsV0FBa0IsV0FBVztJQUM1QixxREFBUSxDQUFBO0lBQ1IseURBQVUsQ0FBQTtBQUNYLENBQUMsRUFIaUIsV0FBVyxLQUFYLFdBQVcsUUFHNUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsU0EyQmpCO0FBM0JELFdBQWtCLFNBQVM7SUFFMUI7O09BRUc7SUFDSCxpREFBUSxDQUFBO0lBRVI7Ozs7O09BS0c7SUFDSCxtREFBUyxDQUFBO0lBRVQ7Ozs7O09BS0c7SUFDSCxtREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCwrQ0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQTNCaUIsU0FBUyxLQUFULFNBQVMsUUEyQjFCO0FBRUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQztBQUNwRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsSUFBWTtJQUM3QyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQsSUFBSSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7QUFDM0IsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFDO0FBQ3BELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxJQUFZO0lBQy9DLGdCQUFnQixHQUFHLElBQUksQ0FBQztJQUN4QixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQWdCRCxNQUFNLGlCQUFpQjtJQUl0QixZQUFvQixFQUFlO1FBQWYsT0FBRSxHQUFGLEVBQUUsQ0FBYTtRQUZsQixnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFZCxDQUFDO0lBR3hDLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDcEYsQ0FBQztJQUdELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNsRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBWkE7SUFEQyxPQUFPO3NEQUdQO0FBR0Q7SUFEQyxPQUFPO29EQUdQO0FBT0YsTUFBTSxtQkFBbUI7SUFLeEIsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDOUUsQ0FBQztJQUdELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDM0UsQ0FBQztJQUVELFlBQW9CLEVBQWU7UUFBZixPQUFFLEdBQUYsRUFBRSxDQUFhO1FBWmxCLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQVlkLENBQUM7SUFFeEMsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBZEE7SUFEQyxPQUFPO3dEQUdQO0FBR0Q7SUFEQyxPQUFPO3NEQUdQO0FBU0YsTUFBTSw2QkFBNkI7SUFHbEMsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7SUFDbkMsQ0FBQztJQUdELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDakMsQ0FBQztJQUVELFlBQW9CLE9BQTZCO1FBQTdCLFlBQU8sR0FBUCxPQUFPLENBQXNCO0lBQUksQ0FBQztJQUV0RCxPQUFPO1FBQ04sT0FBTztJQUNSLENBQUM7Q0FDRDtBQWRBO0lBREMsT0FBTztrRUFHUDtBQUdEO0lBREMsT0FBTztnRUFHUDtBQVNGLE1BQU0sNkJBQTZCLEdBQUcseUJBQXlCLENBQUM7QUFFaEU7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxVQUFVO0lBd0JuQyxJQUFJLEtBQUssS0FBZ0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM5QyxJQUFJLG1CQUFtQixLQUF1QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFDakYsSUFBSSxpQkFBaUIsS0FBdUIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lBRTdFOzs7T0FHRztJQUNILElBQUksS0FBSyxDQUFDLEtBQWdCO1FBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsS0FBSywrQkFBdUIsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxnQ0FBd0IsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxnQ0FBd0IsQ0FBQyxDQUFDO1FBRW5FLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQStCRDs7Ozs7OztPQU9HO0lBQ0gsSUFBSSxtQkFBbUIsQ0FBQyxJQUFzQjtRQUM3QyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsOEJBQThCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFNUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBZ0IsRUFBRSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBRWxELElBQUksS0FBSywrQkFBdUIsRUFBRSxDQUFDO29CQUNsQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztvQkFDdEYsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEyQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDN0csSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ2hILEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO29CQUN2RixJQUFJLENBQUMsb0NBQW9DLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDaEgsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQ3hGLENBQUM7WUFDRixDQUFDLENBQUM7WUFFRixJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDMUYsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUVILElBQUksaUJBQWlCLENBQUMsSUFBc0I7UUFDM0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQWdCLEVBQUUsRUFBRTtnQkFDckMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUVoRCxJQUFJLEtBQUssK0JBQXVCLEVBQUUsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7b0JBQ2xGLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUM1RyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQztvQkFDckYsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQzVHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2dCQUN0RixDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hGLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7SUFDaEMsQ0FBQztJQW1CRCxZQUFZLFNBQXNCLEVBQUUsY0FBbUMsRUFBRSxPQUFxQjtRQUM3RixLQUFLLEVBQUUsQ0FBQztRQWpLRCxlQUFVLEdBQUcsZ0JBQWdCLENBQUM7UUFDOUIsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRTVELFdBQU0sNkJBQWdDO1FBQzdCLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWEsQ0FBQyxDQUFDO1FBQ2pFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYyxDQUFDLENBQUM7UUFDeEQsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFjLENBQUMsQ0FBQztRQUN6RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2xELGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNoRCxtQ0FBOEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUV2RSx5Q0FBb0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUU3RSxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUVyRSx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQXdCNUY7O1dBRUc7UUFDTSxlQUFVLEdBQXNCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBRWhFOzs7V0FHRztRQUNNLGdCQUFXLEdBQXNCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBRWxFOztXQUVHO1FBQ00sZUFBVSxHQUFnQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUUxRDs7V0FFRztRQUNNLGFBQVEsR0FBZ0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFFdEQ7Ozs7O1dBS0c7UUFDSCxlQUFVLEdBQXFCLFNBQVMsQ0FBQztRQWlHeEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBRS9DLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyRixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUUzRSxJQUFJLGdCQUFnQixHQUF3QixTQUFTLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDL0IsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO2dCQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pDLE9BQU87WUFDUixDQUFDO1lBRUQsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDL0IsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVWLElBQUksT0FBTyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztZQUV6QixJQUFJLE9BQU8sQ0FBQyxXQUFXLGlDQUF5QixFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQztZQUN4QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztnQkFDakIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU5RSxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUVyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDO1FBQ3ZELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUM7UUFFbkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxnQ0FBd0IsQ0FBQztRQUUvRCxJQUFJLElBQUksQ0FBQyxXQUFXLG1DQUEyQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFtQixFQUFFLG1CQUF5QztRQUNwRixXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBRTlCLElBQUksQ0FBRSxLQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUMzQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFckQsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixLQUFhLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO2dCQUM1QyxjQUFjLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUM5RixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFFLEtBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pELEtBQWEsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksNkJBQTZCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQy9GLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckUsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsOERBQThEO1FBQ3BILENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUM1QixNQUFNLFVBQVUsR0FBZSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBRTlGLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVsQyx1REFBdUQ7UUFDdkQsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtZQUN4QixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFFaEIsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QixNQUFNLEdBQUcsWUFBWSxDQUFDO1lBQ3ZCLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLElBQUksQ0FBQyxLQUFLLGdDQUF3QixFQUFFLENBQUM7b0JBQ3hDLE1BQU0sR0FBRyxVQUFVLENBQUM7Z0JBQ3JCLENBQUM7cUJBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxnQ0FBd0IsRUFBRSxDQUFDO29CQUMvQyxNQUFNLEdBQUcsVUFBVSxDQUFDO2dCQUNyQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7Z0JBQ25ELENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxJQUFJLENBQUMsS0FBSyxnQ0FBd0IsRUFBRSxDQUFDO29CQUN4QyxNQUFNLEdBQUcsVUFBVSxDQUFDO2dCQUNyQixDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLEtBQUssZ0NBQXdCLEVBQUUsQ0FBQztvQkFDL0MsTUFBTSxHQUFHLFVBQVUsQ0FBQztnQkFDckIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQztZQUVELEtBQUssQ0FBQyxXQUFXLEdBQUcsZUFBZSxNQUFNLGdCQUFnQixDQUFDO1FBQzNELENBQUMsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsV0FBVyxFQUFFLENBQUM7UUFFZCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBZSxFQUFFLEVBQUU7WUFDekMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsTUFBTSxLQUFLLEdBQWUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBRTNGLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBZSxFQUFFLEVBQUU7WUFDdkMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFM0IsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRWYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFdEIsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXRCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDeEQsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BFLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsQ0FBYTtRQUN6QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakQsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixjQUFjLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFVLEVBQUUsaUJBQTBCLEtBQUs7UUFDdEUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3RyxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFVLEVBQUUsaUJBQTBCLEtBQUs7UUFDdEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEMsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILG1CQUFtQjtRQUNsQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxNQUFNO1FBQ0wsSUFBSSxJQUFJLENBQUMsV0FBVyxpQ0FBeUIsRUFBRSxDQUFDO1lBQy9DLE1BQU0sZ0JBQWdCLEdBQWlDLElBQUksQ0FBQyxjQUFlLENBQUM7WUFDNUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFFekYsSUFBSSxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3RFLENBQUM7WUFFRCxJQUFJLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDNUUsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxrQkFBa0IsR0FBbUMsSUFBSSxDQUFDLGNBQWUsQ0FBQztZQUNoRixJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUUzRixJQUFJLGtCQUFrQixDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDNUUsQ0FBQztZQUVELElBQUksa0JBQWtCLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztZQUM5RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxDQUFlO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUUzQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztZQUN6RCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztRQUMvRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QifQ==