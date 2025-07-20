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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { editorHoverBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { HoverWidget } from './hoverWidget.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { addDisposableListener, EventType, getActiveElement, isAncestorOfActiveElement, isAncestor, getWindow, isHTMLElement, isEditableElement } from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ContextViewHandler } from '../../../../platform/contextview/browser/contextViewService.js';
import { isManagedHoverTooltipMarkdownString } from '../../../../base/browser/ui/hover/hover.js';
import { ManagedHoverWidget } from './updatableHoverWidget.js';
import { timeout, TimeoutTimer } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isNumber, isString } from '../../../../base/common/types.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
let HoverService = class HoverService extends Disposable {
    constructor(_instantiationService, _configurationService, contextMenuService, _keybindingService, _layoutService, _accessibilityService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._accessibilityService = _accessibilityService;
        this._currentDelayedHoverWasShown = false;
        this._delayedHovers = new Map();
        this._managedHovers = new Map();
        this._register(contextMenuService.onDidShowContextMenu(() => this.hideHover()));
        this._contextViewHandler = this._register(new ContextViewHandler(this._layoutService));
        this._register(KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: 'workbench.action.showHover',
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ - 1,
            when: EditorContextKeys.editorTextFocus.negate(),
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            handler: () => { this._showAndFocusHoverForActiveElement(); },
        }));
    }
    showInstantHover(options, focus, skipLastFocusedUpdate, dontShow) {
        const hover = this._createHover(options, skipLastFocusedUpdate);
        if (!hover) {
            return undefined;
        }
        this._showHover(hover, options, focus);
        return hover;
    }
    showDelayedHover(options, lifecycleOptions) {
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (!this._currentDelayedHover || this._currentDelayedHoverWasShown) {
            // Current hover is locked, reject
            if (this._currentHover?.isLocked) {
                return undefined;
            }
            // Identity is the same, return current hover
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                return this._currentHover;
            }
            // Check group identity, if it's the same skip the delay and show the hover immediately
            if (this._currentHover && !this._currentHover.isDisposed && this._currentDelayedHoverGroupId !== undefined && this._currentDelayedHoverGroupId === lifecycleOptions?.groupId) {
                return this.showInstantHover({
                    ...options,
                    appearance: {
                        ...options.appearance,
                        skipFadeInAnimation: true
                    }
                });
            }
        }
        else if (this._currentDelayedHover && getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            // If the hover is the same but timeout is not finished yet, return the current hover
            return this._currentDelayedHover;
        }
        const hover = this._createHover(options, undefined);
        if (!hover) {
            this._currentDelayedHover = undefined;
            this._currentDelayedHoverWasShown = false;
            this._currentDelayedHoverGroupId = undefined;
            return undefined;
        }
        this._currentDelayedHover = hover;
        this._currentDelayedHoverWasShown = false;
        this._currentDelayedHoverGroupId = lifecycleOptions?.groupId;
        timeout(this._configurationService.getValue('workbench.hover.delay')).then(() => {
            if (hover && !hover.isDisposed) {
                this._currentDelayedHoverWasShown = true;
                this._showHover(hover, options);
            }
        });
        return hover;
    }
    setupDelayedHover(target, options, lifecycleOptions) {
        const resolveHoverOptions = () => ({
            ...typeof options === 'function' ? options() : options,
            target
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    setupDelayedHoverAtMouse(target, options, lifecycleOptions) {
        const resolveHoverOptions = (e) => ({
            ...typeof options === 'function' ? options() : options,
            target: {
                targetElements: [target],
                x: e !== undefined ? e.x + 10 : undefined,
            }
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    _setupDelayedHover(target, resolveHoverOptions, lifecycleOptions) {
        const store = new DisposableStore();
        store.add(addDisposableListener(target, EventType.MOUSE_OVER, e => {
            this.showDelayedHover(resolveHoverOptions(e), {
                groupId: lifecycleOptions?.groupId
            });
        }));
        if (lifecycleOptions?.setupKeyboardEvents) {
            store.add(addDisposableListener(target, EventType.KEY_DOWN, e => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(10 /* KeyCode.Space */) || evt.equals(3 /* KeyCode.Enter */)) {
                    this.showInstantHover(resolveHoverOptions(), true);
                }
            }));
        }
        this._delayedHovers.set(target, { show: (focus) => { this.showInstantHover(resolveHoverOptions(), focus); } });
        store.add(toDisposable(() => this._delayedHovers.delete(target)));
        return store;
    }
    _createHover(options, skipLastFocusedUpdate) {
        this._currentDelayedHover = undefined;
        if (this._currentHover?.isLocked) {
            return undefined;
        }
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            return undefined;
        }
        this._currentHoverOptions = options;
        this._lastHoverOptions = options;
        const trapFocus = options.trapFocus || this._accessibilityService.isScreenReaderOptimized();
        const activeElement = getActiveElement();
        // HACK, remove this check when #189076 is fixed
        if (!skipLastFocusedUpdate) {
            if (trapFocus && activeElement) {
                if (!activeElement.classList.contains('monaco-hover')) {
                    this._lastFocusedElementBeforeOpen = activeElement;
                }
            }
            else {
                this._lastFocusedElementBeforeOpen = undefined;
            }
        }
        const hoverDisposables = new DisposableStore();
        const hover = this._instantiationService.createInstance(HoverWidget, options);
        if (options.persistence?.sticky) {
            hover.isLocked = true;
        }
        // Adjust target position when a mouse event is provided as the hover position
        if (options.position?.hoverPosition && !isNumber(options.position.hoverPosition)) {
            options.target = {
                targetElements: isHTMLElement(options.target) ? [options.target] : options.target.targetElements,
                x: options.position.hoverPosition.x + 10
            };
        }
        hover.onDispose(() => {
            const hoverWasFocused = this._currentHover?.domNode && isAncestorOfActiveElement(this._currentHover.domNode);
            if (hoverWasFocused) {
                // Required to handle cases such as closing the hover with the escape key
                this._lastFocusedElementBeforeOpen?.focus();
            }
            // Only clear the current options if it's the current hover, the current options help
            // reduce flickering when the same hover is shown multiple times
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                this.doHideHover();
            }
            hoverDisposables.dispose();
        }, undefined, hoverDisposables);
        // Set the container explicitly to enable aux window support
        if (!options.container) {
            const targetElement = isHTMLElement(options.target) ? options.target : options.target.targetElements[0];
            options.container = this._layoutService.getContainer(getWindow(targetElement));
        }
        hover.onRequestLayout(() => this._contextViewHandler.layout(), undefined, hoverDisposables);
        if (options.persistence?.sticky) {
            hoverDisposables.add(addDisposableListener(getWindow(options.container).document, EventType.MOUSE_DOWN, e => {
                if (!isAncestor(e.target, hover.domNode)) {
                    this.doHideHover();
                }
            }));
        }
        else {
            if ('targetElements' in options.target) {
                for (const element of options.target.targetElements) {
                    hoverDisposables.add(addDisposableListener(element, EventType.CLICK, () => this.hideHover()));
                }
            }
            else {
                hoverDisposables.add(addDisposableListener(options.target, EventType.CLICK, () => this.hideHover()));
            }
            const focusedElement = getActiveElement();
            if (focusedElement) {
                const focusedElementDocument = getWindow(focusedElement).document;
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_DOWN, e => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_DOWN, e => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_UP, e => this._keyUp(e, hover)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_UP, e => this._keyUp(e, hover)));
            }
        }
        if ('IntersectionObserver' in mainWindow) {
            const observer = new IntersectionObserver(e => this._intersectionChange(e, hover), { threshold: 0 });
            const firstTargetElement = 'targetElements' in options.target ? options.target.targetElements[0] : options.target;
            observer.observe(firstTargetElement);
            hoverDisposables.add(toDisposable(() => observer.disconnect()));
        }
        this._currentHover = hover;
        return hover;
    }
    _showHover(hover, options, focus) {
        this._contextViewHandler.showContextView(new HoverContextViewDelegate(hover, focus), options.container);
    }
    hideHover(force) {
        if ((!force && this._currentHover?.isLocked) || !this._currentHoverOptions) {
            return;
        }
        this.doHideHover();
    }
    doHideHover() {
        this._currentHover = undefined;
        this._currentHoverOptions = undefined;
        this._contextViewHandler.hideContextView();
    }
    _intersectionChange(entries, hover) {
        const entry = entries[entries.length - 1];
        if (!entry.isIntersecting) {
            hover.dispose();
        }
    }
    showAndFocusLastHover() {
        if (!this._lastHoverOptions) {
            return;
        }
        this.showInstantHover(this._lastHoverOptions, true, true);
    }
    _showAndFocusHoverForActiveElement() {
        // TODO: if hover is visible, focus it to avoid flickering
        let activeElement = getActiveElement();
        while (activeElement) {
            const hover = this._delayedHovers.get(activeElement) ?? this._managedHovers.get(activeElement);
            if (hover) {
                hover.show(true);
                return;
            }
            activeElement = activeElement.parentElement;
        }
    }
    _keyDown(e, hover, hideOnKeyDown) {
        if (e.key === 'Alt') {
            hover.isLocked = true;
            return;
        }
        const event = new StandardKeyboardEvent(e);
        const keybinding = this._keybindingService.resolveKeyboardEvent(event);
        if (keybinding.getSingleModifierDispatchChords().some(value => !!value) || this._keybindingService.softDispatch(event, event.target).kind !== 0 /* ResultKind.NoMatchingKb */) {
            return;
        }
        if (hideOnKeyDown && (!this._currentHoverOptions?.trapFocus || e.key !== 'Tab')) {
            this.hideHover();
            this._lastFocusedElementBeforeOpen?.focus();
        }
    }
    _keyUp(e, hover) {
        if (e.key === 'Alt') {
            hover.isLocked = false;
            // Hide if alt is released while the mouse is not over hover/target
            if (!hover.isMouseIn) {
                this.hideHover();
                this._lastFocusedElementBeforeOpen?.focus();
            }
        }
    }
    // TODO: Investigate performance of this function. There seems to be a lot of content created
    //       and thrown away on start up
    setupManagedHover(hoverDelegate, targetElement, content, options) {
        if (hoverDelegate.showNativeHover) {
            return setupNativeHover(targetElement, content);
        }
        targetElement.setAttribute('custom-hover', 'true');
        if (targetElement.title !== '') {
            console.warn('HTML element already has a title attribute, which will conflict with the custom hover. Please remove the title attribute.');
            console.trace('Stack trace:', targetElement.title);
            targetElement.title = '';
        }
        let hoverPreparation;
        let hoverWidget;
        const hideHover = (disposeWidget, disposePreparation) => {
            const hadHover = hoverWidget !== undefined;
            if (disposeWidget) {
                hoverWidget?.dispose();
                hoverWidget = undefined;
            }
            if (disposePreparation) {
                hoverPreparation?.dispose();
                hoverPreparation = undefined;
            }
            if (hadHover) {
                hoverDelegate.onDidHideHover?.();
                hoverWidget = undefined;
            }
        };
        const triggerShowHover = (delay, focus, target, trapFocus) => {
            return new TimeoutTimer(async () => {
                if (!hoverWidget || hoverWidget.isDisposed) {
                    hoverWidget = new ManagedHoverWidget(hoverDelegate, target || targetElement, delay > 0);
                    await hoverWidget.update(typeof content === 'function' ? content() : content, focus, { ...options, trapFocus });
                }
            }, delay);
        };
        const store = new DisposableStore();
        let isMouseDown = false;
        store.add(addDisposableListener(targetElement, EventType.MOUSE_DOWN, () => {
            isMouseDown = true;
            hideHover(true, true);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_UP, () => {
            isMouseDown = false;
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_LEAVE, (e) => {
            isMouseDown = false;
            hideHover(false, e.fromElement === targetElement);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_OVER, (e) => {
            if (hoverPreparation) {
                return;
            }
            const mouseOverStore = new DisposableStore();
            const target = {
                targetElements: [targetElement],
                dispose: () => { }
            };
            if (hoverDelegate.placement === undefined || hoverDelegate.placement === 'mouse') {
                // track the mouse position
                const onMouseMove = (e) => {
                    target.x = e.x + 10;
                    if ((isHTMLElement(e.target)) && getHoverTargetElement(e.target, targetElement) !== targetElement) {
                        hideHover(true, true);
                    }
                };
                mouseOverStore.add(addDisposableListener(targetElement, EventType.MOUSE_MOVE, onMouseMove, true));
            }
            hoverPreparation = mouseOverStore;
            if ((isHTMLElement(e.target)) && getHoverTargetElement(e.target, targetElement) !== targetElement) {
                return; // Do not show hover when the mouse is over another hover target
            }
            mouseOverStore.add(triggerShowHover(typeof hoverDelegate.delay === 'function' ? hoverDelegate.delay(content) : hoverDelegate.delay, false, target));
        }, true));
        const onFocus = () => {
            if (isMouseDown || hoverPreparation) {
                return;
            }
            const target = {
                targetElements: [targetElement],
                dispose: () => { }
            };
            const toDispose = new DisposableStore();
            const onBlur = () => hideHover(true, true);
            toDispose.add(addDisposableListener(targetElement, EventType.BLUR, onBlur, true));
            toDispose.add(triggerShowHover(typeof hoverDelegate.delay === 'function' ? hoverDelegate.delay(content) : hoverDelegate.delay, false, target));
            hoverPreparation = toDispose;
        };
        // Do not show hover when focusing an input or textarea
        if (!isEditableElement(targetElement)) {
            store.add(addDisposableListener(targetElement, EventType.FOCUS, onFocus, true));
        }
        const hover = {
            show: focus => {
                hideHover(false, true); // terminate a ongoing mouse over preparation
                triggerShowHover(0, focus, undefined, focus); // show hover immediately
            },
            hide: () => {
                hideHover(true, true);
            },
            update: async (newContent, hoverOptions) => {
                content = newContent;
                await hoverWidget?.update(content, undefined, hoverOptions);
            },
            dispose: () => {
                this._managedHovers.delete(targetElement);
                store.dispose();
                hideHover(true, true);
            }
        };
        this._managedHovers.set(targetElement, hover);
        return hover;
    }
    showManagedHover(target) {
        const hover = this._managedHovers.get(target);
        if (hover) {
            hover.show(true);
        }
    }
    dispose() {
        this._managedHovers.forEach(hover => hover.dispose());
        super.dispose();
    }
};
HoverService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ILayoutService),
    __param(5, IAccessibilityService)
], HoverService);
export { HoverService };
function getHoverOptionsIdentity(options) {
    if (options === undefined) {
        return undefined;
    }
    return options?.id ?? options;
}
function getHoverIdFromContent(content) {
    if (isHTMLElement(content)) {
        return undefined;
    }
    if (typeof content === 'string') {
        return content.toString();
    }
    return content.value;
}
function getStringContent(contentOrFactory) {
    const content = typeof contentOrFactory === 'function' ? contentOrFactory() : contentOrFactory;
    if (isString(content)) {
        // Icons don't render in the native hover so we strip them out
        return stripIcons(content);
    }
    if (isManagedHoverTooltipMarkdownString(content)) {
        return content.markdownNotSupportedFallback;
    }
    return undefined;
}
function setupNativeHover(targetElement, content) {
    function updateTitle(title) {
        if (title) {
            targetElement.setAttribute('title', title);
        }
        else {
            targetElement.removeAttribute('title');
        }
    }
    updateTitle(getStringContent(content));
    return {
        update: (content) => updateTitle(getStringContent(content)),
        show: () => { },
        hide: () => { },
        dispose: () => updateTitle(undefined),
    };
}
class HoverContextViewDelegate {
    get anchorPosition() {
        return this._hover.anchor;
    }
    constructor(_hover, _focus = false) {
        this._hover = _hover;
        this._focus = _focus;
        // Render over all other context views
        this.layer = 1;
    }
    render(container) {
        this._hover.render(container);
        if (this._focus) {
            this._hover.focus();
        }
        return this._hover;
    }
    getAnchor() {
        return {
            x: this._hover.x,
            y: this._hover.y
        };
    }
    layout() {
        this._hover.layout();
    }
}
function getHoverTargetElement(element, stopElement) {
    stopElement = stopElement ?? getWindow(element).document.body;
    while (!element.hasAttribute('custom-hover') && element !== stopElement) {
        element = element.parentElement;
    }
    return element;
}
registerSingleton(IHoverService, HoverService, 1 /* InstantiationType.Delayed */);
registerThemingParticipant((theme, collector) => {
    const hoverBorder = theme.getColor(editorHoverBorder);
    if (hoverBorder) {
        collector.addRule(`.monaco-workbench .workbench-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
        collector.addRule(`.monaco-workbench .workbench-hover hr { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9ob3ZlclNlcnZpY2UvaG92ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6TCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNE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