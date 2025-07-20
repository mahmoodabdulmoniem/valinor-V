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
import { $, getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorunDelta, constObservable, derived } from '../../../../../../../base/common/observable.js';
import { editorBackground, scrollbarShadow } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { EditorMouseEvent } from '../../../../../../browser/editorDom.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { Point } from '../../../../../../common/core/2d/point.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { Range } from '../../../../../../common/core/range.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens, TokenArray } from '../../../../../../common/tokens/lineTokens.js';
import { InlineDecoration } from '../../../../../../common/viewModel/inlineDecorations.js';
import { getEditorBlendedColor, getModifiedBorderColor, getOriginalBorderColor, modifiedChangedLineBackgroundColor, originalBackgroundColor } from '../theme.js';
import { getEditorValidOverlayRect, getPrefixTrim, mapOutFalsy, rectToProps } from '../utils/utils.js';
let InlineEditsLineReplacementView = class InlineEditsLineReplacementView extends Disposable {
    constructor(_editor, _edit, _isInDiffEditor, _tabAction, _languageService, _themeService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._isInDiffEditor = _isInDiffEditor;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._maxPrefixTrim = this._edit.map(e => e ? getPrefixTrim(e.replacements.flatMap(r => [r.originalRange, r.modifiedRange]), e.originalRange, e.modifiedLines, this._editor.editor) : undefined);
        this._modifiedLineElements = derived(reader => {
            const lines = [];
            let requiredWidth = 0;
            const prefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!edit || !prefixTrim) {
                return undefined;
            }
            const maxPrefixTrim = prefixTrim.prefixTrim;
            const modifiedBubbles = rangesToBubbleRanges(edit.replacements.map(r => r.modifiedRange)).map(r => new Range(r.startLineNumber, r.startColumn - maxPrefixTrim, r.endLineNumber, r.endColumn - maxPrefixTrim));
            const textModel = this._editor.model.get();
            const startLineNumber = edit.modifiedRange.startLineNumber;
            for (let i = 0; i < edit.modifiedRange.length; i++) {
                const line = document.createElement('div');
                const lineNumber = startLineNumber + i;
                const modLine = edit.modifiedLines[i].slice(maxPrefixTrim);
                const t = textModel.tokenization.tokenizeLinesAt(lineNumber, [modLine])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(modLine, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(modLine, this._languageService.languageIdCodec);
                }
                const decorations = [];
                for (const modified of modifiedBubbles.filter(b => b.startLineNumber === lineNumber)) {
                    const validatedEndColumn = Math.min(modified.endColumn, modLine.length + 1);
                    decorations.push(new InlineDecoration(new Range(1, modified.startColumn, 1, validatedEndColumn), 'inlineCompletions-modified-bubble', 0 /* InlineDecorationType.Regular */));
                }
                // TODO: All lines should be rendered at once for one dom element
                const result = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor.editor).withSetWidth(false).withScrollBeyondLastColumn(0), decorations, line, true);
                this._editor.getOption(59 /* EditorOption.fontInfo */).read(reader); // update when font info changes
                requiredWidth = Math.max(requiredWidth, result.minWidthInPx);
                lines.push(line);
            }
            return { lines, requiredWidth: requiredWidth };
        });
        this._layout = derived(this, reader => {
            const modifiedLines = this._modifiedLineElements.read(reader);
            const maxPrefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!modifiedLines || !maxPrefixTrim || !edit) {
                return undefined;
            }
            const { prefixLeftOffset } = maxPrefixTrim;
            const { requiredWidth } = modifiedLines;
            const originalLineHeights = this._editor.observeLineHeightsForLineRange(edit.originalRange).read(reader);
            const modifiedLineHeights = (() => {
                const lineHeights = originalLineHeights.slice(0, edit.modifiedRange.length);
                while (lineHeights.length < edit.modifiedRange.length) {
                    lineHeights.push(originalLineHeights[originalLineHeights.length - 1]);
                }
                return lineHeights;
            })();
            const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
            const verticalScrollbarWidth = this._editor.layoutInfoVerticalScrollbarWidth.read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const scrollTop = this._editor.scrollTop.read(reader);
            const editorLeftOffset = contentLeft - scrollLeft;
            const textModel = this._editor.editor.getModel();
            const originalLineWidths = edit.originalRange.mapToLineArray(line => this._editor.editor.getOffsetForColumn(line, textModel.getLineMaxColumn(line)) - prefixLeftOffset);
            const maxLineWidth = Math.max(...originalLineWidths, requiredWidth);
            const startLineNumber = edit.originalRange.startLineNumber;
            const endLineNumber = edit.originalRange.endLineNumberExclusive - 1;
            const topOfOriginalLines = this._editor.editor.getTopForLineNumber(startLineNumber) - scrollTop;
            const bottomOfOriginalLines = this._editor.editor.getBottomForLineNumber(endLineNumber) - scrollTop;
            // Box Widget positioning
            const originalLinesOverlay = Rect.fromLeftTopWidthHeight(editorLeftOffset + prefixLeftOffset, topOfOriginalLines, maxLineWidth, bottomOfOriginalLines - topOfOriginalLines);
            const modifiedLinesOverlay = Rect.fromLeftTopWidthHeight(originalLinesOverlay.left, originalLinesOverlay.bottom, originalLinesOverlay.width, modifiedLineHeights.reduce((sum, h) => sum + h, 0));
            const background = Rect.hull([originalLinesOverlay, modifiedLinesOverlay]);
            const lowerBackground = background.intersectVertical(new OffsetRange(originalLinesOverlay.bottom, Number.MAX_SAFE_INTEGER));
            const lowerText = new Rect(lowerBackground.left, lowerBackground.top, lowerBackground.right, lowerBackground.bottom);
            return {
                originalLinesOverlay,
                modifiedLinesOverlay,
                background,
                lowerBackground,
                lowerText,
                modifiedLineHeights,
                minContentWidthRequired: prefixLeftOffset + maxLineWidth + verticalScrollbarWidth,
            };
        });
        this._viewZoneInfo = derived(reader => {
            const shouldShowViewZone = this._editor.getOption(71 /* EditorOption.inlineSuggest */).map(o => o.edits.allowCodeShifting === 'always').read(reader);
            if (!shouldShowViewZone) {
                return undefined;
            }
            const layout = this._layout.read(reader);
            const edit = this._edit.read(reader);
            if (!layout || !edit) {
                return undefined;
            }
            const viewZoneHeight = layout.lowerBackground.height;
            const viewZoneLineNumber = edit.originalRange.endLineNumberExclusive;
            return { height: viewZoneHeight, lineNumber: viewZoneLineNumber };
        });
        this._div = n.div({
            class: 'line-replacement',
        }, [
            derived(reader => {
                const layout = mapOutFalsy(this._layout).read(reader);
                const modifiedLineElements = this._modifiedLineElements.read(reader);
                if (!layout || !modifiedLineElements) {
                    return [];
                }
                const layoutProps = layout.read(reader);
                const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
                const separatorWidth = this._isInDiffEditor.read(reader) ? 3 : 1;
                modifiedLineElements.lines.forEach((l, i) => {
                    l.style.width = `${layoutProps.lowerText.width}px`;
                    l.style.height = `${layoutProps.modifiedLineHeights[i]}px`;
                    l.style.position = 'relative';
                });
                const modifiedBorderColor = getModifiedBorderColor(this._tabAction).read(reader);
                const originalBorderColor = getOriginalBorderColor(this._tabAction).read(reader);
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            ...rectToProps((r) => getEditorValidOverlayRect(this._editor).read(r)),
                            overflow: 'hidden',
                            pointerEvents: 'none',
                        }
                    }, [
                        n.div({
                            class: 'borderAroundLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).background.translateX(-contentLeft).withMargin(separatorWidth)),
                                borderRadius: '4px',
                                border: `${separatorWidth + 1}px solid ${asCssVariable(editorBackground)}`,
                                boxSizing: 'border-box',
                                pointerEvents: 'none',
                            }
                        }),
                        n.div({
                            class: 'originalOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).background.translateX(-contentLeft)),
                                borderRadius: '4px',
                                border: getEditorBlendedColor(originalBorderColor, this._themeService).map(c => `1px solid ${c.toString()}`),
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                background: asCssVariable(originalBackgroundColor),
                            }
                        }),
                        n.div({
                            class: 'modifiedOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).lowerBackground.translateX(-contentLeft)),
                                borderRadius: '0 0 4px 4px',
                                background: asCssVariable(editorBackground),
                                boxShadow: `${asCssVariable(scrollbarShadow)} 0 6px 6px -6px`,
                                border: `1px solid ${asCssVariable(modifiedBorderColor)}`,
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            },
                            onmousedown: e => {
                                e.preventDefault(); // This prevents that the editor loses focus
                            },
                            onclick: (e) => this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)),
                        }, [
                            n.div({
                                style: {
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    background: asCssVariable(modifiedChangedLineBackgroundColor),
                                },
                            })
                        ]),
                        n.div({
                            class: 'modifiedLinesLineReplacement',
                            style: {
                                position: 'absolute',
                                boxSizing: 'border-box',
                                ...rectToProps(reader => layout.read(reader).lowerText.translateX(-contentLeft)),
                                fontFamily: this._editor.getOption(58 /* EditorOption.fontFamily */),
                                fontSize: this._editor.getOption(61 /* EditorOption.fontSize */),
                                fontWeight: this._editor.getOption(62 /* EditorOption.fontWeight */),
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                borderRadius: '0 0 4px 4px',
                                overflow: 'hidden',
                            }
                        }, [...modifiedLineElements.lines]),
                    ])
                ];
            })
        ]).keepUpdated(this._store);
        this.isHovered = this._editor.isTargetHovered((e) => this._isMouseOverWidget(e), this._store);
        this._previousViewZoneInfo = undefined;
        this._register(toDisposable(() => this._editor.editor.changeViewZones(accessor => this.removePreviousViewZone(accessor))));
        this._register(autorunDelta(this._viewZoneInfo, ({ lastValue, newValue }) => {
            if (lastValue === newValue || (lastValue?.height === newValue?.height && lastValue?.lineNumber === newValue?.lineNumber)) {
                return;
            }
            this._editor.editor.changeViewZones((changeAccessor) => {
                this.removePreviousViewZone(changeAccessor);
                if (!newValue) {
                    return;
                }
                this.addViewZone(newValue, changeAccessor);
            });
        }));
        this._register(this._editor.createOverlayWidget({
            domNode: this._div.element,
            minContentWidthInPx: derived(reader => {
                return this._layout.read(reader)?.minContentWidthRequired ?? 0;
            }),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
    _isMouseOverWidget(e) {
        const layout = this._layout.get();
        if (!layout || !(e.event instanceof EditorMouseEvent)) {
            return false;
        }
        return layout.lowerBackground.containsPoint(new Point(e.event.relativePos.x, e.event.relativePos.y));
    }
    removePreviousViewZone(changeAccessor) {
        if (!this._previousViewZoneInfo) {
            return;
        }
        changeAccessor.removeZone(this._previousViewZoneInfo.id);
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= this._previousViewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() - this._previousViewZoneInfo.height);
        }
        this._previousViewZoneInfo = undefined;
    }
    addViewZone(viewZoneInfo, changeAccessor) {
        const activeViewZone = changeAccessor.addZone({
            afterLineNumber: viewZoneInfo.lineNumber - 1,
            heightInPx: viewZoneInfo.height, // move computation to layout?
            domNode: $('div'),
        });
        this._previousViewZoneInfo = { height: viewZoneInfo.height, lineNumber: viewZoneInfo.lineNumber, id: activeViewZone };
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= viewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() + viewZoneInfo.height);
        }
    }
};
InlineEditsLineReplacementView = __decorate([
    __param(4, ILanguageService),
    __param(5, IThemeService)
], InlineEditsLineReplacementView);
export { InlineEditsLineReplacementView };
function rangesToBubbleRanges(ranges) {
    const result = [];
    while (ranges.length) {
        let range = ranges.shift();
        if (range.startLineNumber !== range.endLineNumber) {
            ranges.push(new Range(range.startLineNumber + 1, 1, range.endLineNumber, range.endColumn));
            range = new Range(range.startLineNumber, range.startColumn, range.startLineNumber, Number.MAX_SAFE_INTEGER); // TODO: this is not correct
        }
        result.push(range);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNMaW5lUmVwbGFjZW1lbnRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9pbmxpbmVFZGl0c0xpbmVSZXBsYWNlbWVudFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sZ0RBQWdELENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkZBQTJGLENBQUM7QUFFbkosT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHlEQUF5RCxDQUFDO0FBRWpILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBRSxrQ0FBa0MsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNqSyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVoRyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFrQjdELFlBQ2tCLE9BQTZCLEVBQzdCLEtBS0gsRUFDRyxlQUFxQyxFQUNyQyxVQUE0QyxFQUMxQixnQkFBa0MsRUFDckMsYUFBNEI7UUFFNUQsS0FBSyxFQUFFLENBQUM7UUFaUyxZQUFPLEdBQVAsT0FBTyxDQUFzQjtRQUM3QixVQUFLLEdBQUwsS0FBSyxDQUtSO1FBQ0csb0JBQWUsR0FBZixlQUFlLENBQXNCO1FBQ3JDLGVBQVUsR0FBVixVQUFVLENBQWtDO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDckMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFHNUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDak0sSUFBSSxDQUFDLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM3QyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDakIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1lBRXRCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDNUMsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxXQUFXLEdBQUcsYUFBYSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRTlNLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRyxDQUFDO1lBQzVDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO1lBQzNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLFVBQVUsR0FBRyxlQUFlLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFFM0QsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLE1BQWtCLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3BHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNqRixDQUFDO2dCQUVELE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxNQUFNLFFBQVEsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsS0FBSyxVQUFVLENBQUMsRUFBRSxDQUFDO29CQUN0RixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM1RSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsbUNBQW1DLHVDQUErQixDQUFDLENBQUM7Z0JBQ3RLLENBQUM7Z0JBRUQsaUVBQWlFO2dCQUNqRSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0ssSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztnQkFFNUYsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFN0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDckMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9DLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxhQUFhLENBQUM7WUFDM0MsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLGFBQWEsQ0FBQztZQUV4QyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RyxNQUFNLG1CQUFtQixHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUNqQyxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzVFLE9BQU8sV0FBVyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2RCxXQUFXLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2RSxDQUFDO2dCQUNELE9BQU8sV0FBVyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFTCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEQsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLEdBQUcsVUFBVSxDQUFDO1lBRWxELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO1lBRWxELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztZQUN4SyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFFcEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUM7WUFDM0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUM7WUFDcEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsR0FBRyxTQUFTLENBQUM7WUFDaEcsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxTQUFTLENBQUM7WUFFcEcseUJBQXlCO1lBQ3pCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUN2RCxnQkFBZ0IsR0FBRyxnQkFBZ0IsRUFDbkMsa0JBQWtCLEVBQ2xCLFlBQVksRUFDWixxQkFBcUIsR0FBRyxrQkFBa0IsQ0FDMUMsQ0FBQztZQUNGLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUN2RCxvQkFBb0IsQ0FBQyxJQUFJLEVBQ3pCLG9CQUFvQixDQUFDLE1BQU0sRUFDM0Isb0JBQW9CLENBQUMsS0FBSyxFQUMxQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNsRCxDQUFDO1lBQ0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUUzRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxXQUFXLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDNUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXJILE9BQU87Z0JBQ04sb0JBQW9CO2dCQUNwQixvQkFBb0I7Z0JBQ3BCLFVBQVU7Z0JBQ1YsZUFBZTtnQkFDZixTQUFTO2dCQUNULG1CQUFtQjtnQkFDbkIsdUJBQXVCLEVBQUUsZ0JBQWdCLEdBQUcsWUFBWSxHQUFHLHNCQUFzQjthQUNqRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBcUQsTUFBTSxDQUFDLEVBQUU7WUFDekYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMscUNBQTRCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsS0FBSyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQztZQUNyRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUM7WUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLENBQUM7UUFDbkUsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDakIsS0FBSyxFQUFFLGtCQUFrQjtTQUN6QixFQUFFO1lBQ0YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNoQixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxFQUFFLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFcEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqRSxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLENBQUM7b0JBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzNELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRixNQUFNLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWpGLE9BQU87b0JBQ04sQ0FBQyxDQUFDLEdBQUcsQ0FBQzt3QkFDTCxLQUFLLEVBQUU7NEJBQ04sUUFBUSxFQUFFLFVBQVU7NEJBQ3BCLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN0RSxRQUFRLEVBQUUsUUFBUTs0QkFDbEIsYUFBYSxFQUFFLE1BQU07eUJBQ3JCO3FCQUNELEVBQUU7d0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQzs0QkFDTCxLQUFLLEVBQUUsNkJBQTZCOzRCQUNwQyxLQUFLLEVBQUU7Z0NBQ04sUUFBUSxFQUFFLFVBQVU7Z0NBQ3BCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dDQUM1RyxZQUFZLEVBQUUsS0FBSztnQ0FFbkIsTUFBTSxFQUFFLEdBQUcsY0FBYyxHQUFHLENBQUMsWUFBWSxhQUFhLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQ0FDMUUsU0FBUyxFQUFFLFlBQVk7Z0NBQ3ZCLGFBQWEsRUFBRSxNQUFNOzZCQUNyQjt5QkFDRCxDQUFDO3dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7NEJBQ0wsS0FBSyxFQUFFLGdDQUFnQzs0QkFDdkMsS0FBSyxFQUFFO2dDQUNOLFFBQVEsRUFBRSxVQUFVO2dDQUNwQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dDQUNqRixZQUFZLEVBQUUsS0FBSztnQ0FFbkIsTUFBTSxFQUFFLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dDQUM1RyxhQUFhLEVBQUUsTUFBTTtnQ0FDckIsU0FBUyxFQUFFLFlBQVk7Z0NBQ3ZCLFVBQVUsRUFBRSxhQUFhLENBQUMsdUJBQXVCLENBQUM7NkJBQ2xEO3lCQUNELENBQUM7d0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQzs0QkFDTCxLQUFLLEVBQUUsZ0NBQWdDOzRCQUN2QyxLQUFLLEVBQUU7Z0NBQ04sUUFBUSxFQUFFLFVBQVU7Z0NBQ3BCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7Z0NBQ3RGLFlBQVksRUFBRSxhQUFhO2dDQUMzQixVQUFVLEVBQUUsYUFBYSxDQUFDLGdCQUFnQixDQUFDO2dDQUMzQyxTQUFTLEVBQUUsR0FBRyxhQUFhLENBQUMsZUFBZSxDQUFDLGlCQUFpQjtnQ0FDN0QsTUFBTSxFQUFFLGFBQWEsYUFBYSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7Z0NBQ3pELFNBQVMsRUFBRSxZQUFZO2dDQUN2QixRQUFRLEVBQUUsUUFBUTtnQ0FDbEIsTUFBTSxFQUFFLFNBQVM7Z0NBQ2pCLGFBQWEsRUFBRSxNQUFNOzZCQUNyQjs0QkFDRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0NBQ2hCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLDRDQUE0Qzs0QkFDakUsQ0FBQzs0QkFDRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3lCQUM5RSxFQUFFOzRCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0NBQ0wsS0FBSyxFQUFFO29DQUNOLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU07b0NBQ3BFLFVBQVUsRUFBRSxhQUFhLENBQUMsa0NBQWtDLENBQUM7aUNBQzdEOzZCQUNELENBQUM7eUJBQ0YsQ0FBQzt3QkFDRixDQUFDLENBQUMsR0FBRyxDQUFDOzRCQUNMLEtBQUssRUFBRSw4QkFBOEI7NEJBQ3JDLEtBQUssRUFBRTtnQ0FDTixRQUFRLEVBQUUsVUFBVTtnQ0FDcEIsU0FBUyxFQUFFLFlBQVk7Z0NBQ3ZCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7Z0NBQ2hGLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsa0NBQXlCO2dDQUMzRCxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QjtnQ0FDdkQsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUI7Z0NBQzNELGFBQWEsRUFBRSxNQUFNO2dDQUNyQixVQUFVLEVBQUUsUUFBUTtnQ0FDcEIsWUFBWSxFQUFFLGFBQWE7Z0NBQzNCLFFBQVEsRUFBRSxRQUFROzZCQUNsQjt5QkFDRCxFQUFFLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDbkMsQ0FBQztpQkFDRixDQUFDO1lBQ0gsQ0FBQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO1FBRXZDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzSCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtZQUMzRSxJQUFJLFNBQVMsS0FBSyxRQUFRLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxLQUFLLFFBQVEsRUFBRSxNQUFNLElBQUksU0FBUyxFQUFFLFVBQVUsS0FBSyxRQUFRLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDMUgsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDdEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQUMsT0FBTztnQkFBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7WUFDL0MsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTztZQUMxQixtQkFBbUIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsdUJBQXVCLElBQUksQ0FBQyxDQUFDO1lBQ2hFLENBQUMsQ0FBQztZQUNGLFFBQVEsRUFBRSxlQUFlLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlELG1CQUFtQixFQUFFLEtBQUs7U0FDMUIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsQ0FBb0I7UUFDOUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxZQUFZLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFLTyxzQkFBc0IsQ0FBQyxjQUF1QztRQUNyRSxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV6RCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0QsSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLElBQUksZ0JBQWdCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVGLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEcsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUM7SUFDeEMsQ0FBQztJQUVPLFdBQVcsQ0FBQyxZQUFvRCxFQUFFLGNBQXVDO1FBQ2hILE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7WUFDN0MsZUFBZSxFQUFFLFlBQVksQ0FBQyxVQUFVLEdBQUcsQ0FBQztZQUM1QyxVQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSw4QkFBOEI7WUFDL0QsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7U0FDakIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBRXRILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM3RCxJQUFJLGdCQUFnQixLQUFLLElBQUksSUFBSSxnQkFBZ0IsSUFBSSxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDOUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExVVksOEJBQThCO0lBNEJ4QyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsYUFBYSxDQUFBO0dBN0JILDhCQUE4QixDQTBVMUM7O0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxNQUFlO0lBQzVDLE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztJQUMzQixPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFHLENBQUM7UUFDNUIsSUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzNGLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjtRQUMxSSxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFFZixDQUFDIn0=