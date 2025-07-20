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
var ContentHoverController_1;
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, SHOW_OR_FOCUS_HOVER_ACTION_ID } from './hoverActionIds.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { InlineSuggestionHintsContentWidget } from '../../inlineCompletions/browser/hintsWidget/inlineCompletionsHintsWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import { ContentHoverWidgetWrapper } from './contentHoverWidgetWrapper.js';
import './hover.css';
import { Emitter } from '../../../../base/common/event.js';
import { isOnColorDecorator } from '../../colorPicker/browser/hoverColorPicker/hoverColorPicker.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
// sticky hover widget which doesn't disappear on focus out and such
const _sticky = false;
let ContentHoverController = class ContentHoverController extends Disposable {
    static { ContentHoverController_1 = this; }
    static { this.ID = 'editor.contrib.contentHover'; }
    constructor(_editor, _contextMenuService, _instantiationService, _keybindingService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._onHoverContentsChanged = this._register(new Emitter());
        this.onHoverContentsChanged = this._onHoverContentsChanged.event;
        this.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
        this._listenersStore = new DisposableStore();
        this._isMouseDown = false;
        this._ignoreMouseEvents = false;
        this._reactToEditorMouseMoveRunner = this._register(new RunOnceScheduler(() => {
            if (this._mouseMoveEvent) {
                this._reactToEditorMouseMove(this._mouseMoveEvent);
            }
        }, 0));
        this._register(_contextMenuService.onDidShowContextMenu(() => {
            this.hideContentHover();
            this._ignoreMouseEvents = true;
        }));
        this._register(_contextMenuService.onDidHideContextMenu(() => {
            this._ignoreMouseEvents = false;
        }));
        this._hookListeners();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(69 /* EditorOption.hover */)) {
                this._unhookListeners();
                this._hookListeners();
            }
        }));
    }
    static get(editor) {
        return editor.getContribution(ContentHoverController_1.ID);
    }
    _hookListeners() {
        const hoverOpts = this._editor.getOption(69 /* EditorOption.hover */);
        this._hoverSettings = {
            enabled: hoverOpts.enabled,
            sticky: hoverOpts.sticky,
            hidingDelay: hoverOpts.hidingDelay
        };
        if (!hoverOpts.enabled) {
            this._cancelSchedulerAndHide();
        }
        this._listenersStore.add(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
        this._listenersStore.add(this._editor.onMouseUp(() => this._onEditorMouseUp()));
        this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
        this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        this._listenersStore.add(this._editor.onMouseLeave((e) => this._onEditorMouseLeave(e)));
        this._listenersStore.add(this._editor.onDidChangeModel(() => this._cancelSchedulerAndHide()));
        this._listenersStore.add(this._editor.onDidChangeModelContent(() => this._cancelScheduler()));
        this._listenersStore.add(this._editor.onDidScrollChange((e) => this._onEditorScrollChanged(e)));
    }
    _unhookListeners() {
        this._listenersStore.clear();
    }
    _cancelSchedulerAndHide() {
        this._cancelScheduler();
        this.hideContentHover();
    }
    _cancelScheduler() {
        this._mouseMoveEvent = undefined;
        this._reactToEditorMouseMoveRunner.cancel();
    }
    _onEditorScrollChanged(e) {
        if (this._ignoreMouseEvents) {
            return;
        }
        if (e.scrollTopChanged || e.scrollLeftChanged) {
            this.hideContentHover();
        }
    }
    _onEditorMouseDown(mouseEvent) {
        if (this._ignoreMouseEvents) {
            return;
        }
        this._isMouseDown = true;
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepHoverWidgetVisible(mouseEvent) {
        return this._isMouseOnContentHoverWidget(mouseEvent) || this._isContentWidgetResizing() || isOnColorDecorator(mouseEvent);
    }
    _isMouseOnContentHoverWidget(mouseEvent) {
        if (!this._contentWidget) {
            return false;
        }
        return isMousePositionWithinElement(this._contentWidget.getDomNode(), mouseEvent.event.posx, mouseEvent.event.posy);
    }
    _onEditorMouseUp() {
        if (this._ignoreMouseEvents) {
            return;
        }
        this._isMouseDown = false;
    }
    _onEditorMouseLeave(mouseEvent) {
        if (this._ignoreMouseEvents) {
            return;
        }
        if (this.shouldKeepOpenOnEditorMouseMoveOrLeave) {
            return;
        }
        this._cancelScheduler();
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepCurrentHover(mouseEvent) {
        const contentWidget = this._contentWidget;
        if (!contentWidget) {
            return false;
        }
        const isHoverSticky = this._hoverSettings.sticky;
        const isMouseOnStickyContentHoverWidget = (mouseEvent, isHoverSticky) => {
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            return isHoverSticky && isMouseOnContentHoverWidget;
        };
        const isMouseOnColorPickerOrChoosingColor = (mouseEvent) => {
            const isColorPickerVisible = contentWidget.isColorPickerVisible;
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            const isMouseOnHoverWithColorPicker = isColorPickerVisible && isMouseOnContentHoverWidget;
            const isMaybeChoosingColor = isColorPickerVisible && this._isMouseDown;
            return isMouseOnHoverWithColorPicker || isMaybeChoosingColor;
        };
        // TODO@aiday-mar verify if the following is necessary code
        const isTextSelectedWithinContentHoverWidget = (mouseEvent, sticky) => {
            const view = mouseEvent.event.browserEvent.view;
            if (!view) {
                return false;
            }
            return sticky && contentWidget.containsNode(view.document.activeElement) && !view.getSelection()?.isCollapsed;
        };
        const isFocused = contentWidget.isFocused;
        const isResizing = contentWidget.isResizing;
        const isStickyAndVisibleFromKeyboard = this._hoverSettings.sticky && contentWidget.isVisibleFromKeyboard;
        return this.shouldKeepOpenOnEditorMouseMoveOrLeave
            || isFocused
            || isResizing
            || isStickyAndVisibleFromKeyboard
            || isMouseOnStickyContentHoverWidget(mouseEvent, isHoverSticky)
            || isMouseOnColorPickerOrChoosingColor(mouseEvent)
            || isTextSelectedWithinContentHoverWidget(mouseEvent, isHoverSticky);
    }
    _onEditorMouseMove(mouseEvent) {
        if (this._ignoreMouseEvents) {
            return;
        }
        this._mouseMoveEvent = mouseEvent;
        const shouldKeepCurrentHover = this._shouldKeepCurrentHover(mouseEvent);
        if (shouldKeepCurrentHover) {
            this._reactToEditorMouseMoveRunner.cancel();
            return;
        }
        const shouldRescheduleHoverComputation = this._shouldRescheduleHoverComputation();
        if (shouldRescheduleHoverComputation) {
            if (!this._reactToEditorMouseMoveRunner.isScheduled()) {
                this._reactToEditorMouseMoveRunner.schedule(this._hoverSettings.hidingDelay);
            }
            return;
        }
        this._reactToEditorMouseMove(mouseEvent);
    }
    _shouldRescheduleHoverComputation() {
        const hidingDelay = this._hoverSettings.hidingDelay;
        const isContentHoverWidgetVisible = this._contentWidget?.isVisible ?? false;
        // If the mouse is not over the widget, and if sticky is on,
        // then give it a grace period before reacting to the mouse event
        return isContentHoverWidgetVisible && this._hoverSettings.sticky && hidingDelay > 0;
    }
    _reactToEditorMouseMove(mouseEvent) {
        if (this._hoverSettings.enabled) {
            const contentWidget = this._getOrCreateContentWidget();
            if (contentWidget.showsOrWillShow(mouseEvent)) {
                return;
            }
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _onKeyDown(e) {
        if (this._ignoreMouseEvents) {
            return;
        }
        if (!this._contentWidget) {
            return;
        }
        const isPotentialKeyboardShortcut = this._isPotentialKeyboardShortcut(e);
        const isModifierKeyPressed = this._isModifierKeyPressed(e);
        if (isPotentialKeyboardShortcut || isModifierKeyPressed) {
            return;
        }
        if (this._contentWidget.isFocused && e.keyCode === 2 /* KeyCode.Tab */) {
            return;
        }
        this.hideContentHover();
    }
    _isPotentialKeyboardShortcut(e) {
        if (!this._editor.hasModel() || !this._contentWidget) {
            return false;
        }
        const resolvedKeyboardEvent = this._keybindingService.softDispatch(e, this._editor.getDomNode());
        const moreChordsAreNeeded = resolvedKeyboardEvent.kind === 1 /* ResultKind.MoreChordsNeeded */;
        const isHoverAction = resolvedKeyboardEvent.kind === 2 /* ResultKind.KbFound */
            && (resolvedKeyboardEvent.commandId === SHOW_OR_FOCUS_HOVER_ACTION_ID
                || resolvedKeyboardEvent.commandId === INCREASE_HOVER_VERBOSITY_ACTION_ID
                || resolvedKeyboardEvent.commandId === DECREASE_HOVER_VERBOSITY_ACTION_ID)
            && this._contentWidget.isVisible;
        return moreChordsAreNeeded || isHoverAction;
    }
    _isModifierKeyPressed(e) {
        return e.keyCode === 5 /* KeyCode.Ctrl */
            || e.keyCode === 6 /* KeyCode.Alt */
            || e.keyCode === 57 /* KeyCode.Meta */
            || e.keyCode === 4 /* KeyCode.Shift */;
    }
    hideContentHover() {
        if (_sticky) {
            return;
        }
        if (InlineSuggestionHintsContentWidget.dropDownVisible) {
            return;
        }
        this._contentWidget?.hide();
    }
    _getOrCreateContentWidget() {
        if (!this._contentWidget) {
            this._contentWidget = this._instantiationService.createInstance(ContentHoverWidgetWrapper, this._editor);
            this._listenersStore.add(this._contentWidget.onContentsChanged(() => this._onHoverContentsChanged.fire()));
        }
        return this._contentWidget;
    }
    showContentHover(range, mode, source, focus) {
        this._getOrCreateContentWidget().startShowingAtRange(range, mode, source, focus);
    }
    _isContentWidgetResizing() {
        return this._contentWidget?.widget.isResizing || false;
    }
    focusedHoverPartIndex() {
        return this._getOrCreateContentWidget().focusedHoverPartIndex();
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._getOrCreateContentWidget().doesHoverAtIndexSupportVerbosityAction(index, action);
    }
    updateHoverVerbosityLevel(action, index, focus) {
        this._getOrCreateContentWidget().updateHoverVerbosityLevel(action, index, focus);
    }
    focus() {
        this._contentWidget?.focus();
    }
    focusHoverPartWithIndex(index) {
        this._contentWidget?.focusHoverPartWithIndex(index);
    }
    scrollUp() {
        this._contentWidget?.scrollUp();
    }
    scrollDown() {
        this._contentWidget?.scrollDown();
    }
    scrollLeft() {
        this._contentWidget?.scrollLeft();
    }
    scrollRight() {
        this._contentWidget?.scrollRight();
    }
    pageUp() {
        this._contentWidget?.pageUp();
    }
    pageDown() {
        this._contentWidget?.pageDown();
    }
    goToTop() {
        this._contentWidget?.goToTop();
    }
    goToBottom() {
        this._contentWidget?.goToBottom();
    }
    getWidgetContent() {
        return this._contentWidget?.getWidgetContent();
    }
    getAccessibleWidgetContent() {
        return this._contentWidget?.getAccessibleWidgetContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._contentWidget?.getAccessibleWidgetContentAtIndex(index);
    }
    get isColorPickerVisible() {
        return this._contentWidget?.isColorPickerVisible;
    }
    get isHoverVisible() {
        return this._contentWidget?.isVisible;
    }
    dispose() {
        super.dispose();
        this._unhookListeners();
        this._listenersStore.dispose();
        this._contentWidget?.dispose();
    }
};
ContentHoverController = ContentHoverController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IInstantiationService),
    __param(3, IKeybindingService)
], ContentHoverController);
export { ContentHoverController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9jb250ZW50SG92ZXJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU1SSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBTW5GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sYUFBYSxDQUFDO0FBQ3JCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUVwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixvRUFBb0U7QUFDcEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUVuQjtBQVFLLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTs7YUFLOUIsT0FBRSxHQUFHLDZC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