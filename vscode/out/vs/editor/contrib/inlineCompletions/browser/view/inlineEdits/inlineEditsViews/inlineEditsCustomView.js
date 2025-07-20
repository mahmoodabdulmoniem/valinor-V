var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedObservableWithCache, observableValue } from '../../../../../../../base/common/observable.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { LineRange } from '../../../../../../common/core/ranges/lineRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens, TokenArray } from '../../../../../../common/tokens/lineTokens.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorsuccessfulBackground } from '../theme.js';
import { getContentRenderWidth, maxContentWidthInRange, rectToProps } from '../utils/utils.js';
const MIN_END_OF_LINE_PADDING = 14;
const PADDING_VERTICALLY = 0;
const PADDING_HORIZONTALLY = 4;
const HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW = 4;
const VERTICAL_OFFSET_WHEN_ABOVE_BELOW = 2;
// !! minEndOfLinePadding should always be larger than paddingHorizontally + horizontalOffsetWhenAboveBelow
let InlineEditsCustomView = class InlineEditsCustomView extends Disposable {
    constructor(_editor, displayLocation, tabAction, themeService, _languageService) {
        super();
        this._editor = _editor;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._isHovered = observableValue(this, false);
        this.isHovered = this._isHovered;
        this._viewRef = n.ref();
        this._editorObs = observableCodeEditor(this._editor);
        const styles = tabAction.map((v, reader) => {
            let border;
            switch (v) {
                case InlineEditTabAction.Inactive:
                    border = inlineEditIndicatorSecondaryBackground;
                    break;
                case InlineEditTabAction.Jump:
                    border = inlineEditIndicatorPrimaryBackground;
                    break;
                case InlineEditTabAction.Accept:
                    border = inlineEditIndicatorsuccessfulBackground;
                    break;
            }
            return {
                border: getEditorBlendedColor(border, themeService).read(reader).toString(),
                background: asCssVariable(editorBackground)
            };
        });
        const state = displayLocation.map(dl => dl ? this.getState(dl) : undefined);
        const view = state.map(s => s ? this.getRendering(s, styles) : undefined);
        const overlay = n.div({
            class: 'inline-edits-custom-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                display: 'block',
            },
        }, [view]).keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: overlay.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derivedObservableWithCache(this, (reader, prev) => {
                const s = state.read(reader);
                if (!s) {
                    return prev ?? 0;
                }
                const current = s.rect.map(rect => rect.right).read(reader)
                    + this._editorObs.layoutInfoVerticalScrollbarWidth.read(reader)
                    + PADDING_HORIZONTALLY
                    - this._editorObs.layoutInfoContentLeft.read(reader);
                return Math.max(prev ?? 0, current); // will run into infinite loop otherwise TODO: fix this
            }).recomputeInitiallyAndOnChange(this._store),
        }));
        this._register(autorun((reader) => {
            const v = view.read(reader);
            if (!v) {
                this._isHovered.set(false, undefined);
                return;
            }
            this._isHovered.set(overlay.isHovered.read(reader), undefined);
        }));
    }
    // TODO: this is very similar to side by side `fitsInsideViewport`, try to use the same function
    fitsInsideViewport(range, displayLabel, reader) {
        const editorWidth = this._editorObs.layoutInfoWidth.read(reader);
        const editorContentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
        const editorVerticalScrollbar = this._editor.getLayoutInfo().verticalScrollbarWidth;
        const minimapWidth = this._editorObs.layoutInfoMinimap.read(reader).minimapLeft !== 0 ? this._editorObs.layoutInfoMinimap.read(reader).minimapWidth : 0;
        const maxOriginalContent = maxContentWidthInRange(this._editorObs, range, undefined);
        const maxModifiedContent = getContentRenderWidth(displayLabel, this._editor, this._editor.getModel());
        const padding = PADDING_HORIZONTALLY + MIN_END_OF_LINE_PADDING;
        return maxOriginalContent + maxModifiedContent + padding < editorWidth - editorContentLeft - editorVerticalScrollbar - minimapWidth;
    }
    getState(displayLocation) {
        const contentState = derived((reader) => {
            const startLineNumber = displayLocation.range.startLineNumber;
            const endLineNumber = displayLocation.range.endLineNumber;
            const startColumn = displayLocation.range.startColumn;
            const endColumn = displayLocation.range.endColumn;
            const lineCount = this._editor.getModel()?.getLineCount() ?? 0;
            const lineWidth = maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber, startLineNumber + 1), reader);
            const lineWidthBelow = startLineNumber + 1 <= lineCount ? maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber + 1, startLineNumber + 2), reader) : undefined;
            const lineWidthAbove = startLineNumber - 1 >= 1 ? maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber - 1, startLineNumber), reader) : undefined;
            const startContentLeftOffset = this._editor.getOffsetForColumn(startLineNumber, startColumn);
            const endContentLeftOffset = this._editor.getOffsetForColumn(endLineNumber, endColumn);
            return {
                lineWidth,
                lineWidthBelow,
                lineWidthAbove,
                startContentLeftOffset,
                endContentLeftOffset
            };
        });
        const startLineNumber = displayLocation.range.startLineNumber;
        const endLineNumber = displayLocation.range.endLineNumber;
        // only check viewport once in the beginning when rendering the view
        const fitsInsideViewport = this.fitsInsideViewport(new LineRange(startLineNumber, endLineNumber + 1), displayLocation.label, undefined);
        const rect = derived((reader) => {
            const w = this._editorObs.getOption(59 /* EditorOption.fontInfo */).read(reader).typicalHalfwidthCharacterWidth;
            const { lineWidth, lineWidthBelow, lineWidthAbove, startContentLeftOffset, endContentLeftOffset } = contentState.read(reader);
            const contentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
            const lineHeight = this._editorObs.observeLineHeightForLine(startLineNumber).recomputeInitiallyAndOnChange(reader.store).read(reader);
            const scrollTop = this._editorObs.scrollTop.read(reader);
            const scrollLeft = this._editorObs.scrollLeft.read(reader);
            let position;
            if (startLineNumber === endLineNumber && endContentLeftOffset + 5 * w >= lineWidth && fitsInsideViewport) {
                position = 'end'; // Render at the end of the line if the range ends almost at the end of the line
            }
            else if (lineWidthBelow !== undefined && lineWidthBelow + MIN_END_OF_LINE_PADDING - HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW - PADDING_HORIZONTALLY < startContentLeftOffset) {
                position = 'below'; // Render Below if possible
            }
            else if (lineWidthAbove !== undefined && lineWidthAbove + MIN_END_OF_LINE_PADDING - HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW - PADDING_HORIZONTALLY < startContentLeftOffset) {
                position = 'above'; // Render Above if possible
            }
            else {
                position = 'end'; // Render at the end of the line otherwise
            }
            let topOfLine;
            let contentStartOffset;
            let deltaX = 0;
            let deltaY = 0;
            switch (position) {
                case 'end': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber);
                    contentStartOffset = lineWidth;
                    deltaX = PADDING_HORIZONTALLY + MIN_END_OF_LINE_PADDING;
                    break;
                }
                case 'below': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber + 1);
                    contentStartOffset = startContentLeftOffset;
                    deltaX = PADDING_HORIZONTALLY + HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW;
                    deltaY = PADDING_VERTICALLY + VERTICAL_OFFSET_WHEN_ABOVE_BELOW;
                    break;
                }
                case 'above': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber - 1);
                    contentStartOffset = startContentLeftOffset;
                    deltaX = PADDING_HORIZONTALLY + HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW;
                    deltaY = -PADDING_VERTICALLY + VERTICAL_OFFSET_WHEN_ABOVE_BELOW;
                    break;
                }
            }
            const textRect = Rect.fromLeftTopWidthHeight(contentLeft + contentStartOffset - scrollLeft, topOfLine - scrollTop, w * displayLocation.label.length, lineHeight);
            return textRect.withMargin(PADDING_VERTICALLY, PADDING_HORIZONTALLY).translateX(deltaX).translateY(deltaY);
        });
        return {
            rect,
            label: displayLocation.label
        };
    }
    getRendering(state, styles) {
        const line = document.createElement('div');
        const t = this._editor.getModel().tokenization.tokenizeLinesAt(1, [state.label])?.[0];
        let tokens;
        if (t) {
            tokens = TokenArray.fromLineTokens(t).toLineTokens(state.label, this._languageService.languageIdCodec);
        }
        else {
            tokens = LineTokens.createEmpty(state.label, this._languageService.languageIdCodec);
        }
        const result = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor).withSetWidth(false).withScrollBeyondLastColumn(0), [], line, true);
        line.style.width = `${result.minWidthInPx}px`;
        const rect = state.rect.map(r => r.withMargin(0, PADDING_HORIZONTALLY));
        return n.div({
            class: 'collapsedView',
            ref: this._viewRef,
            style: {
                position: 'absolute',
                ...rectToProps(reader => rect.read(reader)),
                overflow: 'hidden',
                boxSizing: 'border-box',
                cursor: 'pointer',
                border: styles.map(s => `1px solid ${s.border}`),
                borderRadius: '4px',
                backgroundColor: styles.map(s => s.background),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
            },
            onclick: (e) => { this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)); }
        }, [
            line
        ]);
    }
};
InlineEditsCustomView = __decorate([
    __param(3, IThemeService),
    __param(4, ILanguageService)
], InlineEditsCustomView);
export { InlineEditsCustomView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNDdXN0b21WaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9pbmxpbmVFZGl0c0N1c3RvbVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBd0IsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEssT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRixPQUFPLEVBQXdCLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkZBQTJGLENBQUM7QUFFbkosT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUU5RSxPQUFPLEVBQUUs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