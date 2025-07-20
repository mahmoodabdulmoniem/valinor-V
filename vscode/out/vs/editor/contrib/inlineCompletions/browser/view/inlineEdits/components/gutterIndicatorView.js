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
import { n, trackFocus } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { BugIndicatingError } from '../../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, debouncedObservable, derived, observableFromEvent, observableValue, runOnChange } from '../../../../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { Point } from '../../../../../../common/core/2d/point.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorBackground, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorSecondaryBorder, inlineEditIndicatorSecondaryForeground, inlineEditIndicatorsuccessfulBackground, inlineEditIndicatorsuccessfulBorder, inlineEditIndicatorsuccessfulForeground } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
import { GutterIndicatorMenuContent } from './gutterIndicatorMenu.js';
let InlineEditsGutterIndicator = class InlineEditsGutterIndicator extends Disposable {
    get model() {
        const model = this._model.get();
        if (!model) {
            throw new BugIndicatingError('Inline Edit Model not available');
        }
        return model;
    }
    constructor(_editorObs, _originalRange, _verticalOffset, _model, _isHoveringOverInlineEdit, _focusIsInMenu, _hoverService, _instantiationService, _accessibilityService, themeService) {
        super();
        this._editorObs = _editorObs;
        this._originalRange = _originalRange;
        this._verticalOffset = _verticalOffset;
        this._model = _model;
        this._isHoveringOverInlineEdit = _isHoveringOverInlineEdit;
        this._focusIsInMenu = _focusIsInMenu;
        this._hoverService = _hoverService;
        this._instantiationService = _instantiationService;
        this._accessibilityService = _accessibilityService;
        this._tabAction = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return InlineEditTabAction.Inactive;
            }
            return model.tabAction.read(reader);
        });
        this._hoverVisible = observableValue(this, false);
        this.isHoverVisible = this._hoverVisible;
        this._isHoveredOverIcon = observableValue(this, false);
        this._isHoveredOverIconDebounced = debouncedObservable(this._isHoveredOverIcon, 100);
        this.isHoveredOverIcon = this._isHoveredOverIconDebounced;
        this._isHoveredOverInlineEditDebounced = debouncedObservable(this._isHoveringOverInlineEdit, 100);
        this._gutterIndicatorStyles = this._tabAction.map((v, reader) => {
            switch (v) {
                case InlineEditTabAction.Inactive: return {
                    background: getEditorBlendedColor(inlineEditIndicatorSecondaryBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorSecondaryForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorSecondaryBorder, themeService).read(reader).toString(),
                };
                case InlineEditTabAction.Jump: return {
                    background: getEditorBlendedColor(inlineEditIndicatorPrimaryBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorPrimaryForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorPrimaryBorder, themeService).read(reader).toString()
                };
                case InlineEditTabAction.Accept: return {
                    background: getEditorBlendedColor(inlineEditIndicatorsuccessfulBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorsuccessfulForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorsuccessfulBorder, themeService).read(reader).toString()
                };
            }
        });
        this._originalRangeObs = mapOutFalsy(this._originalRange);
        this._state = derived(reader => {
            const range = this._originalRangeObs.read(reader);
            if (!range) {
                return undefined;
            }
            return {
                range,
                lineOffsetRange: this._editorObs.observeLineOffsetRange(range, this._store),
            };
        });
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController
            ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight)
            : constObservable(0);
        this._lineNumberToRender = derived(this, reader => {
            if (this._verticalOffset.read(reader) !== 0) {
                return '';
            }
            const lineNumber = this._originalRange.read(reader)?.startLineNumber;
            const lineNumberOptions = this._editorObs.getOption(76 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumber === undefined || lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return '';
            }
            if (lineNumberOptions.renderType === 3 /* RenderLineNumbersType.Interval */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (lineNumber % 10 === 0 || cursorPosition && cursorPosition.lineNumber === lineNumber) {
                    return lineNumber.toString();
                }
                return '';
            }
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (!cursorPosition) {
                    return '';
                }
                const relativeLineNumber = Math.abs(lineNumber - cursorPosition.lineNumber);
                if (relativeLineNumber === 0) {
                    return lineNumber.toString();
                }
                return relativeLineNumber.toString();
            }
            if (lineNumberOptions.renderType === 4 /* RenderLineNumbersType.Custom */) {
                if (lineNumberOptions.renderFn) {
                    return lineNumberOptions.renderFn(lineNumber);
                }
                return '';
            }
            return lineNumber.toString();
        });
        this._availableWidthForIcon = derived(this, reader => {
            const textModel = this._editorObs.editor.getModel();
            const editor = this._editorObs.editor;
            const layout = this._editorObs.layoutInfo.read(reader);
            const gutterWidth = layout.decorationsLeft + layout.decorationsWidth - layout.glyphMarginLeft;
            if (!textModel || gutterWidth <= 0) {
                return () => 0;
            }
            // no glyph margin => the entire gutter width is available as there is no optimal place to put the icon
            if (layout.lineNumbersLeft === 0) {
                return () => gutterWidth;
            }
            const lineNumberOptions = this._editorObs.getOption(76 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */ || /* likely to flicker */
                lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return () => gutterWidth;
            }
            const w = editor.getOption(59 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
            const rightOfLineNumber = layout.lineNumbersLeft + layout.lineNumbersWidth;
            const totalLines = textModel.getLineCount();
            const totalLinesDigits = (totalLines + 1 /* 0 based to 1 based*/).toString().length;
            const offsetDigits = [];
            // We only need to pre compute the usable width left of the line number for the first line number with a given digit count
            for (let digits = 1; digits <= totalLinesDigits; digits++) {
                const firstLineNumberWithDigitCount = 10 ** (digits - 1);
                const topOfLineNumber = editor.getTopForLineNumber(firstLineNumberWithDigitCount);
                const digitsWidth = digits * w;
                const usableWidthLeftOfLineNumber = Math.min(gutterWidth, Math.max(0, rightOfLineNumber - digitsWidth - layout.glyphMarginLeft));
                offsetDigits.push({ firstLineNumberWithDigitCount, topOfLineNumber, usableWidthLeftOfLineNumber });
            }
            return (topOffset) => {
                for (let i = offsetDigits.length - 1; i >= 0; i--) {
                    if (topOffset >= offsetDigits[i].topOfLineNumber) {
                        return offsetDigits[i].usableWidthLeftOfLineNumber;
                    }
                }
                throw new BugIndicatingError('Could not find avilable width for icon');
            };
        });
        this._layout = derived(this, reader => {
            const s = this._state.read(reader);
            if (!s) {
                return undefined;
            }
            const layout = this._editorObs.layoutInfo.read(reader);
            const lineHeight = this._editorObs.observeLineHeightForLine(s.range.map(r => r.startLineNumber)).read(reader);
            const gutterViewPortPadding = 1;
            // Entire gutter view from top left to bottom right
            const gutterWidthWithoutPadding = layout.decorationsLeft + layout.decorationsWidth - layout.glyphMarginLeft - 2 * gutterViewPortPadding;
            const gutterHeightWithoutPadding = layout.height - 2 * gutterViewPortPadding;
            const gutterViewPortWithStickyScroll = Rect.fromLeftTopWidthHeight(gutterViewPortPadding, gutterViewPortPadding, gutterWidthWithoutPadding, gutterHeightWithoutPadding);
            const gutterViewPortWithoutStickyScrollWithoutPaddingTop = gutterViewPortWithStickyScroll.withTop(this._stickyScrollHeight.read(reader));
            const gutterViewPortWithoutStickyScroll = gutterViewPortWithStickyScroll.withTop(gutterViewPortWithoutStickyScrollWithoutPaddingTop.top + gutterViewPortPadding);
            // The glyph margin area across all relevant lines
            const verticalEditRange = s.lineOffsetRange.read(reader);
            const gutterEditArea = Rect.fromRanges(OffsetRange.fromTo(gutterViewPortWithoutStickyScroll.left, gutterViewPortWithoutStickyScroll.right), verticalEditRange);
            // The gutter view container (pill)
            const pillHeight = lineHeight;
            const pillOffset = this._verticalOffset.read(reader);
            const pillFullyDockedRect = gutterEditArea.withHeight(pillHeight).translateY(pillOffset);
            const pillIsFullyDocked = gutterViewPortWithoutStickyScrollWithoutPaddingTop.containsRect(pillFullyDockedRect);
            // The icon which will be rendered in the pill
            const iconNoneDocked = this._tabAction.map(action => action === InlineEditTabAction.Accept ? Codicon.keyboardTab : Codicon.arrowRight);
            const iconDocked = derived(reader => {
                if (this._isHoveredOverIconDebounced.read(reader) || this._isHoveredOverInlineEditDebounced.read(reader)) {
                    return Codicon.check;
                }
                if (this._tabAction.read(reader) === InlineEditTabAction.Accept) {
                    return Codicon.keyboardTab;
                }
                const cursorLineNumber = this._editorObs.cursorLineNumber.read(reader) ?? 0;
                const editStartLineNumber = s.range.read(reader).startLineNumber;
                return cursorLineNumber <= editStartLineNumber ? Codicon.keyboardTabAbove : Codicon.keyboardTabBelow;
            });
            const idealIconWidth = 22;
            const minimalIconWidth = 16; // codicon size
            const iconWidth = (pillRect) => {
                const availableWidth = this._availableWidthForIcon.get()(pillRect.bottom + this._editorObs.editor.getScrollTop()) - gutterViewPortPadding;
                return Math.max(Math.min(availableWidth, idealIconWidth), minimalIconWidth);
            };
            if (pillIsFullyDocked) {
                const pillRect = pillFullyDockedRect;
                let lineNumberWidth;
                if (layout.lineNumbersWidth === 0) {
                    lineNumberWidth = Math.min(Math.max(layout.lineNumbersLeft - gutterViewPortWithStickyScroll.left, 0), pillRect.width - idealIconWidth);
                }
                else {
                    lineNumberWidth = Math.max(layout.lineNumbersLeft + layout.lineNumbersWidth - gutterViewPortWithStickyScroll.left, 0);
                }
                const lineNumberRect = pillRect.withWidth(lineNumberWidth);
                const iconWidth = Math.max(Math.min(layout.decorationsWidth, idealIconWidth), minimalIconWidth);
                const iconRect = pillRect.withWidth(iconWidth).translateX(lineNumberWidth);
                return {
                    gutterEditArea,
                    icon: iconDocked,
                    iconDirection: 'right',
                    iconRect,
                    pillRect,
                    lineNumberRect,
                };
            }
            const pillPartiallyDockedPossibleArea = gutterViewPortWithStickyScroll.intersect(gutterEditArea); // The area in which the pill could be partially docked
            const pillIsPartiallyDocked = pillPartiallyDockedPossibleArea && pillPartiallyDockedPossibleArea.height >= pillHeight;
            if (pillIsPartiallyDocked) {
                // pillFullyDockedRect is outside viewport, move it into the viewport under sticky scroll as we prefer the pill to not be on top of the sticky scroll
                // then move it into the possible area which will only cause it to move if it has to be rendered on top of the sticky scroll
                const pillRectMoved = pillFullyDockedRect.moveToBeContainedIn(gutterViewPortWithoutStickyScroll).moveToBeContainedIn(pillPartiallyDockedPossibleArea);
                const pillRect = pillRectMoved.withWidth(iconWidth(pillRectMoved));
                const iconRect = pillRect;
                return {
                    gutterEditArea,
                    icon: iconDocked,
                    iconDirection: 'right',
                    iconRect,
                    pillRect,
                };
            }
            // pillFullyDockedRect is outside viewport, so move it into viewport
            const pillRectMoved = pillFullyDockedRect.moveToBeContainedIn(gutterViewPortWithStickyScroll);
            const pillRect = pillRectMoved.withWidth(iconWidth(pillRectMoved));
            const iconRect = pillRect;
            // docked = pill was already in the viewport
            const iconDirection = pillRect.top < pillFullyDockedRect.top ?
                'top' :
                'bottom';
            return {
                gutterEditArea,
                icon: iconNoneDocked,
                iconDirection,
                iconRect,
                pillRect,
            };
        });
        this._iconRef = n.ref();
        this.isVisible = this._layout.map(l => !!l);
        this._indicator = n.div({
            class: 'inline-edits-view-gutter-indicator',
            onclick: () => {
                const layout = this._layout.get();
                const acceptOnClick = layout?.icon.get() === Codicon.check;
                this._editorObs.editor.focus();
                if (acceptOnClick) {
                    this.model.accept();
                }
                else {
                    this.model.jump();
                }
            },
            tabIndex: 0,
            style: {
                position: 'absolute',
                overflow: 'visible',
            },
        }, mapOutFalsy(this._layout).map(layout => !layout ? [] : [
            n.div({
                style: {
                    position: 'absolute',
                    background: asCssVariable(inlineEditIndicatorBackground),
                    borderRadius: '4px',
                    ...rectToProps(reader => layout.read(reader).gutterEditArea),
                }
            }),
            n.div({
                class: 'icon',
                ref: this._iconRef,
                onmouseenter: () => {
                    // TODO show hover when hovering ghost text etc.
                    this._showHover();
                },
                style: {
                    cursor: 'pointer',
                    zIndex: '20',
                    position: 'absolute',
                    backgroundColor: this._gutterIndicatorStyles.map(v => v.background),
                    ['--vscodeIconForeground']: this._gutterIndicatorStyles.map(v => v.foreground),
                    border: this._gutterIndicatorStyles.map(v => `1px solid ${v.border}`),
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    transition: 'background-color 0.2s ease-in-out, width 0.2s ease-in-out',
                    ...rectToProps(reader => layout.read(reader).pillRect),
                }
            }, [
                n.div({
                    className: 'line-number',
                    style: {
                        lineHeight: layout.map(l => l.lineNumberRect ? l.lineNumberRect.height : 0),
                        display: layout.map(l => l.lineNumberRect ? 'flex' : 'none'),
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: layout.map(l => l.lineNumberRect ? l.lineNumberRect.width : 0),
                        height: '100%',
                        color: this._gutterIndicatorStyles.map(v => v.foreground),
                    }
                }, this._lineNumberToRender),
                n.div({
                    style: {
                        rotate: layout.map(l => `${getRotationFromDirection(l.iconDirection)}deg`),
                        transition: 'rotate 0.2s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        marginRight: layout.map(l => l.pillRect.width - l.iconRect.width - (l.lineNumberRect?.width ?? 0)),
                        width: layout.map(l => l.iconRect.width),
                    }
                }, [
                    layout.map((l, reader) => renderIcon(l.icon.read(reader))),
                ])
            ]),
        ])).keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._indicator.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(this._editorObs.editor.onMouseMove((e) => {
            const state = this._state.get();
            if (state === undefined) {
                return;
            }
            const el = this._iconRef.element;
            const rect = el.getBoundingClientRect();
            const rectangularArea = Rect.fromLeftTopWidthHeight(rect.left, rect.top, rect.width, rect.height);
            const point = new Point(e.event.posx, e.event.posy);
            this._isHoveredOverIcon.set(rectangularArea.containsPoint(point), undefined);
        }));
        this._register(this._editorObs.editor.onDidScrollChange(() => {
            this._isHoveredOverIcon.set(false, undefined);
        }));
        // pulse animation when hovering inline edit
        this._register(runOnChange(this._isHoveredOverInlineEditDebounced, (isHovering) => {
            if (isHovering) {
                this.triggerAnimation();
            }
        }));
        this._register(autorun(reader => {
            this._indicator.readEffect(reader);
            if (this._indicator.element) {
                this._editorObs.editor.applyFontInfo(this._indicator.element);
            }
        }));
    }
    triggerAnimation() {
        if (this._accessibilityService.isMotionReduced()) {
            return new Animation(null, null).finished;
        }
        // PULSE ANIMATION:
        const animation = this._iconRef.element.animate([
            {
                outline: `2px solid ${this._gutterIndicatorStyles.map(v => v.border).get()}`,
                outlineOffset: '-1px',
                offset: 0
            },
            {
                outline: `2px solid transparent`,
                outlineOffset: '10px',
                offset: 1
            },
        ], { duration: 500 });
        return animation.finished;
    }
    _showHover() {
        if (this._hoverVisible.get()) {
            return;
        }
        const disposableStore = new DisposableStore();
        const content = disposableStore.add(this._instantiationService.createInstance(GutterIndicatorMenuContent, this.model, (focusEditor) => {
            if (focusEditor) {
                this._editorObs.editor.focus();
            }
            h?.dispose();
        }, this._editorObs).toDisposableLiveElement());
        const focusTracker = disposableStore.add(trackFocus(content.element));
        disposableStore.add(focusTracker.onDidBlur(() => this._focusIsInMenu.set(false, undefined)));
        disposableStore.add(focusTracker.onDidFocus(() => this._focusIsInMenu.set(true, undefined)));
        disposableStore.add(toDisposable(() => this._focusIsInMenu.set(false, undefined)));
        const h = this._hoverService.showInstantHover({
            target: this._iconRef.element,
            content: content.element,
        });
        if (h) {
            this._hoverVisible.set(true, undefined);
            disposableStore.add(this._editorObs.editor.onDidScrollChange(() => h.dispose()));
            disposableStore.add(h.onDispose(() => {
                this._hoverVisible.set(false, undefined);
                disposableStore.dispose();
            }));
        }
        else {
            disposableStore.dispose();
        }
    }
};
InlineEditsGutterIndicator = __decorate([
    __param(6, IHoverService),
    __param(7, IInstantiationService),
    __param(8, IAccessibilityService),
    __param(9, IThemeService)
], InlineEditsGutterIndicator);
export { InlineEditsGutterIndicator };
function getRotationFromDirection(direction) {
    switch (direction) {
        case 'top': return 90;
        case 'bottom': return -90;
        case 'right': return 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2NvbXBvbmVudHMvZ3V0dGVySW5kaWNhdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDMUcsT0FBTyxFQUFvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN00sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUtoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdkcsT0FBTyxFQUFvQixtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxnQ0FBZ0MsRUFBRSxvQ0FBb0MsRUFBRSxzQ0FBc0MsRUFBRSxrQ0FBa0MsRUFBRSxzQ0FBc0MsRUFBRSx1Q0FBdUMsRUFBRSxtQ0FBbUMsRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM1YSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUV6RCxJQUFZLEtBQUs7UUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFBQyxNQUFNLElBQUksa0JBQWtCLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFDaEYsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBS0QsWUFDa0IsVUFBZ0MsRUFDaEMsY0FBa0QsRUFDbEQsZUFBb0MsRUFDcEMsTUFBaUQsRUFDakQseUJBQStDLEVBQy9DLGNBQTRDLEVBQzdCLGFBQTJCLEVBQ25CLHFCQUE0QyxFQUM1QyxxQkFBNEMsRUFDckUsWUFBMkI7UUFFMUMsS0FBSyxFQUFFLENBQUM7UUFYUyxlQUFVLEdBQVYsVUFBVSxDQUFzQjtRQUNoQyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0M7UUFDbEQsb0JBQWUsR0FBZixlQUFlLENBQXFCO1FBQ3BDLFdBQU0sR0FBTixNQUFNLENBQTJDO1FBQ2pELDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBc0I7UUFDL0MsbUJBQWMsR0FBZCxjQUFjLENBQThCO1FBQzdCLGtCQUFhLEdBQWIsYUFBYSxDQUFjO1FBQ25CLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUtwRixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFDO1lBQUMsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUN6QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUM7UUFDMUQsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUVsRyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDL0QsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDWCxLQUFLLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU87b0JBQ3pDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxzQ0FBc0MsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUMvRyxVQUFVLEVBQUUscUJBQXFCLENBQUMsc0NBQXNDLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDL0csTUFBTSxFQUFFLHFCQUFxQixDQUFDLGtDQUFrQyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7aUJBQ3ZHLENBQUM7Z0JBQ0YsS0FBSyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPO29CQUNyQyxVQUFVLEVBQUUscUJBQXFCLENBQUMsb0NBQW9DLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDN0csVUFBVSxFQUFFLHFCQUFxQixDQUFDLG9DQUFvQyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQzdHLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxnQ0FBZ0MsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO2lCQUNyRyxDQUFDO2dCQUNGLEtBQUssbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTztvQkFDdkMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLHVDQUF1QyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQ2hILFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUNoSCxNQUFNLEVBQUUscUJBQXFCLENBQUMsbUNBQW1DLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtpQkFDeEcsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUNqQyxPQUFPO2dCQUNOLEtBQUs7Z0JBQ0wsZUFBZSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7YUFDM0UsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCO1lBQ3RELENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF3QixDQUFDLHdCQUF3QixDQUFDO1lBQy9JLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDakQsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsZUFBZSxDQUFDO1lBQ3JFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLG1DQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUzRixJQUFJLFVBQVUsS0FBSyxTQUFTLElBQUksaUJBQWlCLENBQUMsVUFBVSxzQ0FBOEIsRUFBRSxDQUFDO2dCQUM1RixPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxJQUFJLGlCQUFpQixDQUFDLFVBQVUsMkNBQW1DLEVBQUUsQ0FBQztnQkFDckUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLFVBQVUsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUN6RixPQUFPLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsQ0FBQztnQkFDRCxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxJQUFJLGlCQUFpQixDQUFDLFVBQVUsMkNBQW1DLEVBQUUsQ0FBQztnQkFDckUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sRUFBRSxDQUFDO2dCQUNYLENBQUM7Z0JBQ0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzVFLElBQUksa0JBQWtCLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzlCLE9BQU8sVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixDQUFDO2dCQUNELE9BQU8sa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEMsQ0FBQztZQUVELElBQUksaUJBQWlCLENBQUMsVUFBVSx5Q0FBaUMsRUFBRSxDQUFDO2dCQUNuRSxJQUFJLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNoQyxPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztnQkFDRCxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxPQUFPLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3BELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDO1lBRTlGLElBQUksQ0FBQyxTQUFTLElBQUksV0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQixDQUFDO1lBRUQsdUdBQXVHO1lBQ3ZHLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUM7WUFDMUIsQ0FBQztZQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLG1DQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRixJQUFJLGlCQUFpQixDQUFDLFVBQVUsMkNBQW1DLElBQUksdUJBQXVCO2dCQUM3RixpQkFBaUIsQ0FBQyxVQUFVLHNDQUE4QixFQUFFLENBQUM7Z0JBQzdELE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDO1lBQzFCLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxnQ0FBdUIsQ0FBQyw4QkFBOEIsQ0FBQztZQUNqRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1lBQzNFLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM1QyxNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUVwRixNQUFNLFlBQVksR0FJWixFQUFFLENBQUM7WUFFVCwwSEFBMEg7WUFDMUgsS0FBSyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxJQUFJLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQzNELE1BQU0sNkJBQTZCLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsQ0FBQztnQkFDbEYsTUFBTSxXQUFXLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDL0IsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxpQkFBaUIsR0FBRyxXQUFXLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSw2QkFBNkIsRUFBRSxlQUFlLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1lBQ3BHLENBQUM7WUFFRCxPQUFPLENBQUMsU0FBaUIsRUFBRSxFQUFFO2dCQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxTQUFTLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUNsRCxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztvQkFDcEQsQ0FBQztnQkFDRixDQUFDO2dCQUNELE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1lBQ3hFLENBQUMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFFN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXZELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUcsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7WUFFaEMsbURBQW1EO1lBQ25ELE1BQU0seUJBQXlCLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcscUJBQXFCLENBQUM7WUFDeEksTUFBTSwwQkFBMEIsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztZQUM3RSxNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hLLE1BQU0sa0RBQWtELEdBQUcsOEJBQThCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN6SSxNQUFNLGlDQUFpQyxHQUFHLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQyxHQUFHLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUVqSyxrREFBa0Q7WUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFFL0osbUNBQW1DO1lBQ25DLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxNQUFNLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pGLE1BQU0saUJBQWlCLEdBQUcsa0RBQWtELENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFFL0csOENBQThDO1lBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZJLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbkMsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDMUcsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUN0QixDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2pFLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztnQkFDNUIsQ0FBQztnQkFDRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUM7Z0JBQ2pFLE9BQU8sZ0JBQWdCLElBQUksbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1lBQ3RHLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLENBQUMsZUFBZTtZQUM1QyxNQUFNLFNBQVMsR0FBRyxDQUFDLFFBQWMsRUFBRSxFQUFFO2dCQUNwQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLHFCQUFxQixDQUFDO2dCQUMxSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUM3RSxDQUFDLENBQUM7WUFFRixJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDO2dCQUVyQyxJQUFJLGVBQWUsQ0FBQztnQkFDcEIsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25DLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsQ0FBQztnQkFDeEksQ0FBQztxQkFBTSxDQUFDO29CQUNQLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixHQUFHLDhCQUE4QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdkgsQ0FBQztnQkFFRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQ2hHLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUUzRSxPQUFPO29CQUNOLGNBQWM7b0JBQ2QsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLGFBQWEsRUFBRSxPQUFnQjtvQkFDL0IsUUFBUTtvQkFDUixRQUFRO29CQUNSLGNBQWM7aUJBQ2QsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLCtCQUErQixHQUFHLDhCQUE4QixDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLHVEQUF1RDtZQUN6SixNQUFNLHFCQUFxQixHQUFHLCtCQUErQixJQUFJLCtCQUErQixDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUM7WUFFdEgsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixxSkFBcUo7Z0JBQ3JKLDRIQUE0SDtnQkFDNUgsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUN0SixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUM7Z0JBRTFCLE9BQU87b0JBQ04sY0FBYztvQkFDZCxJQUFJLEVBQUUsVUFBVTtvQkFDaEIsYUFBYSxFQUFFLE9BQWdCO29CQUMvQixRQUFRO29CQUNSLFFBQVE7aUJBQ1IsQ0FBQztZQUNILENBQUM7WUFFRCxvRUFBb0U7WUFDcEUsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUM5RixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUUxQiw0Q0FBNEM7WUFDNUMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0QsS0FBYyxDQUFDLENBQUM7Z0JBQ2hCLFFBQWlCLENBQUM7WUFFbkIsT0FBTztnQkFDTixjQUFjO2dCQUNkLElBQUksRUFBRSxjQUFjO2dCQUNwQixhQUFhO2dCQUNiLFFBQVE7Z0JBQ1IsUUFBUTthQUNSLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBa0IsQ0FBQztRQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN2QixLQUFLLEVBQUUsb0NBQW9DO1lBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUUzRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLENBQUM7WUFDRixDQUFDO1lBQ0QsUUFBUSxFQUFFLENBQUM7WUFDWCxLQUFLLEVBQUU7Z0JBQ04sUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFFBQVEsRUFBRSxTQUFTO2FBQ25CO1NBQ0QsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ0wsS0FBSyxFQUFFO29CQUNOLFFBQVEsRUFBRSxVQUFVO29CQUNwQixVQUFVLEVBQUUsYUFBYSxDQUFDLDZCQUE2QixDQUFDO29CQUN4RCxZQUFZLEVBQUUsS0FBSztvQkFDbkIsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztpQkFDNUQ7YUFDRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDTCxLQUFLLEVBQUUsTUFBTTtnQkFDYixHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ2xCLFlBQVksRUFBRSxHQUFHLEVBQUU7b0JBQ2xCLGdEQUFnRDtvQkFDaEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNuQixDQUFDO2dCQUNELEtBQUssRUFBRTtvQkFDTixNQUFNLEVBQUUsU0FBUztvQkFDakIsTUFBTSxFQUFFLElBQUk7b0JBQ1osUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLGVBQWUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztvQkFDbkUsQ0FBQyx3QkFBK0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO29CQUNyRixNQUFNLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNyRSxTQUFTLEVBQUUsWUFBWTtvQkFDdkIsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLE9BQU8sRUFBRSxNQUFNO29CQUNmLGNBQWMsRUFBRSxVQUFVO29CQUMxQixVQUFVLEVBQUUsMkRBQTJEO29CQUN2RSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDO2lCQUN0RDthQUNELEVBQUU7Z0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDTCxTQUFTLEVBQUUsYUFBYTtvQkFDeEIsS0FBSyxFQUFFO3dCQUNOLFVBQVUsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0UsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzt3QkFDNUQsVUFBVSxFQUFFLFFBQVE7d0JBQ3BCLGNBQWMsRUFBRSxVQUFVO3dCQUMxQixLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JFLE1BQU0sRUFBRSxNQUFNO3dCQUNkLEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztxQkFDekQ7aUJBQ0QsRUFDQSxJQUFJLENBQUMsbUJBQW1CLENBQ3hCO2dCQUNELENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFO3dCQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQzt3QkFDMUUsVUFBVSxFQUFFLHlCQUF5Qjt3QkFDckMsT0FBTyxFQUFFLE1BQU07d0JBQ2YsVUFBVSxFQUFFLFFBQVE7d0JBQ3BCLGNBQWMsRUFBRSxRQUFRO3dCQUN4QixNQUFNLEVBQUUsTUFBTTt3QkFDZCxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2xHLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7cUJBQ3hDO2lCQUNELEVBQUU7b0JBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2lCQUMxRCxDQUFDO2FBQ0YsQ0FBQztTQUNGLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2xELE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU87WUFDaEMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUU7WUFDMUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNoQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFBQyxPQUFPO1lBQUMsQ0FBQztZQUVwQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUNqQyxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xHLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtZQUM1RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosNENBQTRDO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ2pGLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0MsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDL0M7Z0JBQ0MsT0FBTyxFQUFFLGFBQWEsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDNUUsYUFBYSxFQUFFLE1BQU07Z0JBQ3JCLE1BQU0sRUFBRSxDQUFDO2FBQ1Q7WUFDRDtnQkFDQyxPQUFPLEVBQUUsdUJBQXVCO2dCQUNoQyxhQUFhLEVBQUUsTUFBTTtnQkFDckIsTUFBTSxFQUFFLENBQUM7YUFDVDtTQUNELEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUV0QixPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQTJCTyxVQUFVO1FBQ2pCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM5QyxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVFLDBCQUEwQixFQUMxQixJQUFJLENBQUMsS0FBSyxFQUNWLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDZixJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxDQUFDO1lBQ0QsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ2QsQ0FBQyxFQUNELElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFFN0IsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdEUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsZUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsZUFBZSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuRixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1lBQzdDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87WUFDN0IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1NBQ3hCLENBQTRCLENBQUM7UUFDOUIsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN4QyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakYsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUN6QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNCLENBQUM7SUFDRixDQUFDO0NBS0QsQ0FBQTtBQTlkWSwwQkFBMEI7SUFrQnBDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0dBckJILDBCQUEwQixDQThkdEM7O0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxTQUFxQztJQUN0RSxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ25CLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzFCLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQztBQUNGLENBQUMifQ==