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
var StickyScrollController_1;
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { StickyScrollWidget, StickyScrollWidgetState } from './stickyScrollWidget.js';
import { StickyLineCandidateProvider } from './stickyScrollProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ClickLinkGesture } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { Range } from '../../../common/core/range.js';
import { getDefinitionsAtPosition } from '../../gotoSymbol/browser/goToSymbol.js';
import { goToDefinitionWithLocation } from '../../inlayHints/browser/inlayHintsLocations.js';
import { Position } from '../../../common/core/position.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import * as dom from '../../../../base/browser/dom.js';
import { StickyRange } from './stickyScrollElement.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { FoldingController } from '../../folding/browser/folding.js';
import { toggleCollapseState } from '../../folding/browser/foldingModel.js';
import { Emitter } from '../../../../base/common/event.js';
import { mainWindow } from '../../../../base/browser/window.js';
let StickyScrollController = class StickyScrollController extends Disposable {
    static { StickyScrollController_1 = this; }
    static { this.ID = 'store.contrib.stickyScrollController'; }
    constructor(_editor, _contextMenuService, _languageFeaturesService, _instaService, _languageConfigurationService, _languageFeatureDebounceService, _contextKeyService) {
        super();
        this._editor = _editor;
        this._contextMenuService = _contextMenuService;
        this._languageFeaturesService = _languageFeaturesService;
        this._instaService = _instaService;
        this._contextKeyService = _contextKeyService;
        this._sessionStore = new DisposableStore();
        this._maxStickyLines = Number.MAX_SAFE_INTEGER;
        this._candidateDefinitionsLength = -1;
        this._focusedStickyElementIndex = -1;
        this._enabled = false;
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
        this._endLineNumbers = [];
        this._mouseTarget = null;
        this._onDidChangeStickyScrollHeight = this._register(new Emitter());
        this.onDidChangeStickyScrollHeight = this._onDidChangeStickyScrollHeight.event;
        this._stickyScrollWidget = new StickyScrollWidget(this._editor);
        this._stickyLineCandidateProvider = new StickyLineCandidateProvider(this._editor, _languageFeaturesService, _languageConfigurationService);
        this._register(this._stickyScrollWidget);
        this._register(this._stickyLineCandidateProvider);
        this._widgetState = StickyScrollWidgetState.Empty;
        const stickyScrollDomNode = this._stickyScrollWidget.getDomNode();
        this._register(this._editor.onDidChangeLineHeight((e) => {
            e.changes.forEach((change) => {
                const lineNumber = change.lineNumber;
                if (this._widgetState.startLineNumbers.includes(lineNumber)) {
                    this._renderStickyScroll(lineNumber);
                }
            });
        }));
        this._register(this._editor.onDidChangeFont((e) => {
            e.changes.forEach((change) => {
                const lineNumber = change.lineNumber;
                if (this._widgetState.startLineNumbers.includes(lineNumber)) {
                    this._renderStickyScroll(lineNumber);
                }
            });
        }));
        this._register(this._editor.onDidChangeConfiguration(e => {
            this._readConfigurationChange(e);
        }));
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.CONTEXT_MENU, async (event) => {
            this._onContextMenu(dom.getWindow(stickyScrollDomNode), event);
        }));
        this._stickyScrollFocusedContextKey = EditorContextKeys.stickyScrollFocused.bindTo(this._contextKeyService);
        this._stickyScrollVisibleContextKey = EditorContextKeys.stickyScrollVisible.bindTo(this._contextKeyService);
        const focusTracker = this._register(dom.trackFocus(stickyScrollDomNode));
        this._register(focusTracker.onDidBlur(_ => {
            // Suppose that the blurring is caused by scrolling, then keep the focus on the sticky scroll
            // This is determined by the fact that the height of the widget has become zero and there has been no position revealing
            if (this._positionRevealed === false && stickyScrollDomNode.clientHeight === 0) {
                this._focusedStickyElementIndex = -1;
                this.focus();
            }
            // In all other casees, dispose the focus on the sticky scroll
            else {
                this._disposeFocusStickyScrollStore();
            }
        }));
        this._register(focusTracker.onDidFocus(_ => {
            this.focus();
        }));
        this._registerMouseListeners();
        // Suppose that mouse down on the sticky scroll, then do not focus on the sticky scroll because this will be followed by the revealing of a position
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.MOUSE_DOWN, (e) => {
            this._onMouseDown = true;
        }));
        this._register(this._stickyScrollWidget.onDidChangeStickyScrollHeight((e) => {
            this._onDidChangeStickyScrollHeight.fire(e);
        }));
        this._onDidResize();
        this._readConfiguration();
    }
    get stickyScrollCandidateProvider() {
        return this._stickyLineCandidateProvider;
    }
    get stickyScrollWidgetState() {
        return this._widgetState;
    }
    get stickyScrollWidgetHeight() {
        return this._stickyScrollWidget.height;
    }
    static get(editor) {
        return editor.getContribution(StickyScrollController_1.ID);
    }
    _disposeFocusStickyScrollStore() {
        this._stickyScrollFocusedContextKey.set(false);
        this._focusDisposableStore?.dispose();
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
    }
    isFocused() {
        return this._focused;
    }
    focus() {
        // If the mouse is down, do not focus on the sticky scroll
        if (this._onMouseDown) {
            this._onMouseDown = false;
            this._editor.focus();
            return;
        }
        const focusState = this._stickyScrollFocusedContextKey.get();
        if (focusState === true) {
            return;
        }
        this._focused = true;
        this._focusDisposableStore = new DisposableStore();
        this._stickyScrollFocusedContextKey.set(true);
        this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumbers.length - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    focusNext() {
        if (this._focusedStickyElementIndex < this._stickyScrollWidget.lineNumberCount - 1) {
            this._focusNav(true);
        }
    }
    focusPrevious() {
        if (this._focusedStickyElementIndex > 0) {
            this._focusNav(false);
        }
    }
    selectEditor() {
        this._editor.focus();
    }
    // True is next, false is previous
    _focusNav(direction) {
        this._focusedStickyElementIndex = direction ? this._focusedStickyElementIndex + 1 : this._focusedStickyElementIndex - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    goToFocused() {
        const lineNumbers = this._stickyScrollWidget.lineNumbers;
        this._disposeFocusStickyScrollStore();
        this._revealPosition({ lineNumber: lineNumbers[this._focusedStickyElementIndex], column: 1 });
    }
    _revealPosition(position) {
        this._reveaInEditor(position, () => this._editor.revealPosition(position));
    }
    _revealLineInCenterIfOutsideViewport(position) {
        this._reveaInEditor(position, () => this._editor.revealLineInCenterIfOutsideViewport(position.lineNumber, 0 /* ScrollType.Smooth */));
    }
    _reveaInEditor(position, revealFunction) {
        if (this._focused) {
            this._disposeFocusStickyScrollStore();
        }
        this._positionRevealed = true;
        revealFunction();
        this._editor.setSelection(Range.fromPositions(position));
        this._editor.focus();
    }
    _registerMouseListeners() {
        const sessionStore = this._register(new DisposableStore());
        const gesture = this._register(new ClickLinkGesture(this._editor, {
            extractLineNumberFromMouseEvent: (e) => {
                const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
                return position ? position.lineNumber : 0;
            }
        }));
        const getMouseEventTarget = (mouseEvent) => {
            if (!this._editor.hasModel()) {
                return null;
            }
            if (mouseEvent.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ || mouseEvent.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return null;
            }
            const mouseTargetElement = mouseEvent.target.element;
            if (!mouseTargetElement || mouseTargetElement.innerText !== mouseTargetElement.innerHTML) {
                // not on a span element rendering text
                return null;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(mouseTargetElement);
            if (!position) {
                // not hovering a sticky scroll line
                return null;
            }
            return {
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column + mouseTargetElement.innerText.length),
                textElement: mouseTargetElement
            };
        };
        const stickyScrollWidgetDomNode = this._stickyScrollWidget.getDomNode();
        this._register(dom.addStandardDisposableListener(stickyScrollWidgetDomNode, dom.EventType.CLICK, (mouseEvent) => {
            if (mouseEvent.ctrlKey || mouseEvent.altKey || mouseEvent.metaKey) {
                // modifier pressed
                return;
            }
            if (!mouseEvent.leftButton) {
                // not left click
                return;
            }
            if (mouseEvent.shiftKey) {
                // shift click
                const lineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(mouseEvent.target);
                if (lineIndex === null) {
                    return;
                }
                const position = new Position(this._endLineNumbers[lineIndex], 1);
                this._revealLineInCenterIfOutsideViewport(position);
                return;
            }
            const isInFoldingIconDomNode = this._stickyScrollWidget.isInFoldingIconDomNode(mouseEvent.target);
            if (isInFoldingIconDomNode) {
                // clicked on folding icon
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                this._toggleFoldingRegionForLine(lineNumber);
                return;
            }
            const isInStickyLine = this._stickyScrollWidget.isInStickyLine(mouseEvent.target);
            if (!isInStickyLine) {
                return;
            }
            // normal click
            let position = this._stickyScrollWidget.getEditorPositionFromNode(mouseEvent.target);
            if (!position) {
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                if (lineNumber === null) {
                    // not hovering a sticky scroll line
                    return;
                }
                position = new Position(lineNumber, 1);
            }
            this._revealPosition(position);
        }));
        this._register(dom.addDisposableListener(mainWindow, dom.EventType.MOUSE_MOVE, mouseEvent => {
            this._mouseTarget = mouseEvent.target;
            this._onMouseMoveOrKeyDown(mouseEvent);
        }));
        this._register(dom.addDisposableListener(mainWindow, dom.EventType.KEY_DOWN, mouseEvent => {
            this._onMouseMoveOrKeyDown(mouseEvent);
        }));
        this._register(dom.addDisposableListener(mainWindow, dom.EventType.KEY_UP, () => {
            if (this._showEndForLine !== undefined) {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }
        }));
        this._register(gesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, _keyboardEvent]) => {
            const mouseTarget = getMouseEventTarget(mouseEvent);
            if (!mouseTarget || !mouseEvent.hasTriggerModifier || !this._editor.hasModel()) {
                sessionStore.clear();
                return;
            }
            const { range, textElement } = mouseTarget;
            if (!range.equalsRange(this._stickyRangeProjectedOnEditor)) {
                this._stickyRangeProjectedOnEditor = range;
                sessionStore.clear();
            }
            else if (textElement.style.textDecoration === 'underline') {
                return;
            }
            const cancellationToken = new CancellationTokenSource();
            sessionStore.add(toDisposable(() => cancellationToken.dispose(true)));
            let currentHTMLChild;
            getDefinitionsAtPosition(this._languageFeaturesService.definitionProvider, this._editor.getModel(), new Position(range.startLineNumber, range.startColumn + 1), false, cancellationToken.token).then((candidateDefinitions => {
                if (cancellationToken.token.isCancellationRequested) {
                    return;
                }
                if (candidateDefinitions.length !== 0) {
                    this._candidateDefinitionsLength = candidateDefinitions.length;
                    const childHTML = textElement;
                    if (currentHTMLChild !== childHTML) {
                        sessionStore.clear();
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                    else if (!currentHTMLChild) {
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                }
                else {
                    sessionStore.clear();
                }
            }));
        }));
        this._register(gesture.onCancel(() => {
            sessionStore.clear();
        }));
        this._register(gesture.onExecute(async (e) => {
            if (e.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ || e.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
            if (!position) {
                // not hovering a sticky scroll line
                return;
            }
            if (!this._editor.hasModel() || !this._stickyRangeProjectedOnEditor) {
                return;
            }
            if (this._candidateDefinitionsLength > 1) {
                if (this._focused) {
                    this._disposeFocusStickyScrollStore();
                }
                this._revealPosition({ lineNumber: position.lineNumber, column: 1 });
            }
            this._instaService.invokeFunction(goToDefinitionWithLocation, e, this._editor, { uri: this._editor.getModel().uri, range: this._stickyRangeProjectedOnEditor });
        }));
    }
    _onContextMenu(targetWindow, e) {
        const event = new StandardMouseEvent(targetWindow, e);
        this._contextMenuService.showContextMenu({
            menuId: MenuId.StickyScrollContext,
            getAnchor: () => event,
        });
    }
    _onMouseMoveOrKeyDown(mouseEvent) {
        if (!mouseEvent.shiftKey) {
            return;
        }
        if (!this._mouseTarget || !dom.isHTMLElement(this._mouseTarget)) {
            return;
        }
        const currentEndForLineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(this._mouseTarget);
        if (currentEndForLineIndex === null || this._showEndForLine === currentEndForLineIndex) {
            return;
        }
        this._showEndForLine = currentEndForLineIndex;
        this._renderStickyScroll();
    }
    _toggleFoldingRegionForLine(line) {
        if (!this._foldingModel || line === null) {
            return;
        }
        const stickyLine = this._stickyScrollWidget.getRenderedStickyLine(line);
        const foldingIcon = stickyLine?.foldingIcon;
        if (!foldingIcon) {
            return;
        }
        toggleCollapseState(this._foldingModel, 1, [line]);
        foldingIcon.isCollapsed = !foldingIcon.isCollapsed;
        const scrollTop = (foldingIcon.isCollapsed ?
            this._editor.getTopForLineNumber(foldingIcon.foldingEndLine)
            : this._editor.getTopForLineNumber(foldingIcon.foldingStartLine))
            - this._editor.getOption(75 /* EditorOption.lineHeight */) * stickyLine.index + 1;
        this._editor.setScrollTop(scrollTop);
        this._renderStickyScroll(line);
    }
    _readConfiguration() {
        const options = this._editor.getOption(130 /* EditorOption.stickyScroll */);
        if (options.enabled === false) {
            this._editor.removeOverlayWidget(this._stickyScrollWidget);
            this._resetState();
            this._sessionStore.clear();
            this._enabled = false;
            return;
        }
        else if (options.enabled && !this._enabled) {
            // When sticky scroll was just enabled, add the listeners on the sticky scroll
            this._editor.addOverlayWidget(this._stickyScrollWidget);
            this._sessionStore.add(this._editor.onDidScrollChange((e) => {
                if (e.scrollTopChanged) {
                    this._showEndForLine = undefined;
                    this._renderStickyScroll();
                }
            }));
            this._sessionStore.add(this._editor.onDidLayoutChange(() => this._onDidResize()));
            this._sessionStore.add(this._editor.onDidChangeModelTokens((e) => this._onTokensChange(e)));
            this._sessionStore.add(this._stickyLineCandidateProvider.onDidChangeStickyScroll(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }));
            this._enabled = true;
        }
        const lineNumberOption = this._editor.getOption(76 /* EditorOption.lineNumbers */);
        if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            this._sessionStore.add(this._editor.onDidChangeCursorPosition(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll(0);
            }));
        }
    }
    _readConfigurationChange(event) {
        if (event.hasChanged(130 /* EditorOption.stickyScroll */)
            || event.hasChanged(81 /* EditorOption.minimap */)
            || event.hasChanged(75 /* EditorOption.lineHeight */)
            || event.hasChanged(125 /* EditorOption.showFoldingControls */)
            || event.hasChanged(76 /* EditorOption.lineNumbers */)) {
            this._readConfiguration();
        }
        if (event.hasChanged(76 /* EditorOption.lineNumbers */) || event.hasChanged(52 /* EditorOption.folding */) || event.hasChanged(125 /* EditorOption.showFoldingControls */)) {
            this._renderStickyScroll(0);
        }
    }
    _needsUpdate(event) {
        const stickyLineNumbers = this._stickyScrollWidget.getCurrentLines();
        for (const stickyLineNumber of stickyLineNumbers) {
            for (const range of event.ranges) {
                if (stickyLineNumber >= range.fromLineNumber && stickyLineNumber <= range.toLineNumber) {
                    return true;
                }
            }
        }
        return false;
    }
    _onTokensChange(event) {
        if (this._needsUpdate(event)) {
            // Rebuilding the whole widget from line 0
            this._renderStickyScroll(0);
        }
    }
    _onDidResize() {
        const layoutInfo = this._editor.getLayoutInfo();
        // Make sure sticky scroll doesn't take up more than 25% of the editor
        const theoreticalLines = layoutInfo.height / this._editor.getOption(75 /* EditorOption.lineHeight */);
        this._maxStickyLines = Math.round(theoreticalLines * .25);
        this._renderStickyScroll(0);
    }
    async _renderStickyScroll(rebuildFromLine) {
        const model = this._editor.getModel();
        if (!model || model.isTooLargeForTokenization()) {
            this._resetState();
            return;
        }
        const nextRebuildFromLine = this._updateAndGetMinRebuildFromLine(rebuildFromLine);
        const stickyWidgetVersion = this._stickyLineCandidateProvider.getVersionId();
        const shouldUpdateState = stickyWidgetVersion === undefined || stickyWidgetVersion === model.getVersionId();
        if (shouldUpdateState) {
            if (!this._focused) {
                await this._updateState(nextRebuildFromLine);
            }
            else {
                // Suppose that previously the sticky scroll widget had height 0, then if there are visible lines, set the last line as focused
                if (this._focusedStickyElementIndex === -1) {
                    await this._updateState(nextRebuildFromLine);
                    this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                    if (this._focusedStickyElementIndex !== -1) {
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
                else {
                    const focusedStickyElementLineNumber = this._stickyScrollWidget.lineNumbers[this._focusedStickyElementIndex];
                    await this._updateState(nextRebuildFromLine);
                    // Suppose that after setting the state, there are no sticky lines, set the focused index to -1
                    if (this._stickyScrollWidget.lineNumberCount === 0) {
                        this._focusedStickyElementIndex = -1;
                    }
                    else {
                        const previousFocusedLineNumberExists = this._stickyScrollWidget.lineNumbers.includes(focusedStickyElementLineNumber);
                        // If the line number is still there, do not change anything
                        // If the line number is not there, set the new focused line to be the last line
                        if (!previousFocusedLineNumberExists) {
                            this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                        }
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
            }
        }
    }
    _updateAndGetMinRebuildFromLine(rebuildFromLine) {
        if (rebuildFromLine !== undefined) {
            const minRebuildFromLineOrInfinity = this._minRebuildFromLine !== undefined ? this._minRebuildFromLine : Infinity;
            this._minRebuildFromLine = Math.min(rebuildFromLine, minRebuildFromLineOrInfinity);
        }
        return this._minRebuildFromLine;
    }
    async _updateState(rebuildFromLine) {
        this._minRebuildFromLine = undefined;
        this._foldingModel = await FoldingController.get(this._editor)?.getFoldingModel() ?? undefined;
        this._widgetState = this.findScrollWidgetState();
        const stickyWidgetHasLines = this._widgetState.startLineNumbers.length > 0;
        this._stickyScrollVisibleContextKey.set(stickyWidgetHasLines);
        this._stickyScrollWidget.setState(this._widgetState, this._foldingModel, rebuildFromLine);
    }
    async _resetState() {
        this._minRebuildFromLine = undefined;
        this._foldingModel = undefined;
        this._widgetState = StickyScrollWidgetState.Empty;
        this._stickyScrollVisibleContextKey.set(false);
        this._stickyScrollWidget.setState(undefined, undefined);
    }
    findScrollWidgetState() {
        if (!this._editor.hasModel()) {
            return StickyScrollWidgetState.Empty;
        }
        const textModel = this._editor.getModel();
        const maxNumberStickyLines = Math.min(this._maxStickyLines, this._editor.getOption(130 /* EditorOption.stickyScroll */).maxLineCount);
        const scrollTop = this._editor.getScrollTop();
        let lastLineRelativePosition = 0;
        const startLineNumbers = [];
        const endLineNumbers = [];
        const arrayVisibleRanges = this._editor.getVisibleRanges();
        if (arrayVisibleRanges.length !== 0) {
            const fullVisibleRange = new StickyRange(arrayVisibleRanges[0].startLineNumber, arrayVisibleRanges[arrayVisibleRanges.length - 1].endLineNumber);
            const candidateRanges = this._stickyLineCandidateProvider.getCandidateStickyLinesIntersecting(fullVisibleRange);
            for (const range of candidateRanges) {
                const start = range.startLineNumber;
                const end = range.endLineNumber;
                const isValidRange = textModel.isValidRange({ startLineNumber: start, endLineNumber: end, startColumn: 1, endColumn: 1 });
                if (isValidRange && end - start > 0) {
                    const topOfElement = range.top;
                    const bottomOfElement = topOfElement + range.height;
                    const topOfBeginningLine = this._editor.getTopForLineNumber(start) - scrollTop;
                    const bottomOfEndLine = this._editor.getBottomForLineNumber(end) - scrollTop;
                    if (topOfElement > topOfBeginningLine && topOfElement <= bottomOfEndLine) {
                        startLineNumbers.push(start);
                        endLineNumbers.push(end + 1);
                        if (bottomOfElement > bottomOfEndLine) {
                            lastLineRelativePosition = bottomOfEndLine - bottomOfElement;
                        }
                    }
                    if (startLineNumbers.length === maxNumberStickyLines) {
                        break;
                    }
                }
            }
        }
        this._endLineNumbers = endLineNumbers;
        return new StickyScrollWidgetState(startLineNumbers, endLineNumbers, lastLineRelativePosition, this._showEndForLine);
    }
    dispose() {
        super.dispose();
        this._sessionStore.dispose();
    }
};
StickyScrollController = StickyScrollController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, ILanguageFeaturesService),
    __param(3, IInstantiationService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILanguageFeatureDebounceService),
    __param(6, IContextKeyService)
], StickyScrollController);
export { StickyScrollController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEYsT0FBTyxFQUFnQywyQkFBMkIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXRHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXVCLE1BQU0sbURBQW1ELENBQUM7QUFDMUcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FB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