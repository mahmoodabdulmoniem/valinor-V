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
var GhostTextView_1;
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { createHotClass } from '../../../../../../base/common/hotReloadHelpers.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableSignalFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import * as strings from '../../../../../../base/common/strings.js';
import { applyFontInfo } from '../../../../../browser/config/domFontInfo.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { EditorFontLigatures } from '../../../../../common/config/editorOptions.js';
import { StringEdit, StringReplacement } from '../../../../../common/core/edits/stringEdit.js';
import { Position } from '../../../../../common/core/position.js';
import { Range } from '../../../../../common/core/range.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { ILanguageService } from '../../../../../common/languages/language.js';
import { InjectedTextCursorStops } from '../../../../../common/model.js';
import { LineTokens } from '../../../../../common/tokens/lineTokens.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { GhostTextReplacement } from '../../model/ghostText.js';
import { RangeSingleLine } from '../../../../../common/core/ranges/rangeSingleLine.js';
import { ColumnRange } from '../../../../../common/core/ranges/columnRange.js';
import { addDisposableListener, getWindow, isHTMLElement, n } from '../../../../../../base/browser/dom.js';
import './ghostTextView.css';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { CodeEditorWidget } from '../../../../../browser/widget/codeEditor/codeEditorWidget.js';
import { TokenWithTextArray } from '../../../../../common/tokens/tokenWithTextArray.js';
import { sum } from '../../../../../../base/common/arrays.js';
const USE_SQUIGGLES_FOR_WARNING = true;
const GHOST_TEXT_CLASS_NAME = 'ghost-text';
let GhostTextView = class GhostTextView extends Disposable {
    static { GhostTextView_1 = this; }
    static { this.hot = createHotClass(GhostTextView_1); }
    constructor(_editor, _model, _options, _shouldKeepCursorStable, _isClickable, _languageService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._options = _options;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._languageService = _languageService;
        this._isDisposed = observableValue(this, false);
        this._editorObs = observableCodeEditor(this._editor);
        this._warningState = derived(reader => {
            const gt = this._model.ghostText.read(reader);
            if (!gt) {
                return undefined;
            }
            const warning = this._model.warning.read(reader);
            if (!warning) {
                return undefined;
            }
            return { lineNumber: gt.lineNumber, position: new Position(gt.lineNumber, gt.parts[0].column), icon: warning.icon };
        });
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._useSyntaxHighlighting = this._options.map(o => o.syntaxHighlightingEnabled);
        this._extraClassNames = derived(this, reader => {
            const extraClasses = [...this._options.read(reader).extraClasses ?? []];
            if (this._useSyntaxHighlighting.read(reader)) {
                extraClasses.push('syntax-highlighted');
            }
            if (USE_SQUIGGLES_FOR_WARNING && this._warningState.read(reader)) {
                extraClasses.push('warning');
            }
            const extraClassNames = extraClasses.map(c => ` ${c}`).join('');
            return extraClassNames;
        });
        this.uiState = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return undefined;
            }
            const textModel = this._editorObs.model.read(reader);
            if (textModel !== this._model.targetTextModel.read(reader)) {
                return undefined;
            }
            const ghostText = this._model.ghostText.read(reader);
            if (!ghostText) {
                return undefined;
            }
            const replacedRange = ghostText instanceof GhostTextReplacement ? ghostText.columnRange : undefined;
            const syntaxHighlightingEnabled = this._useSyntaxHighlighting.read(reader);
            const extraClassNames = this._extraClassNames.read(reader);
            const { inlineTexts, additionalLines, hiddenRange, additionalLinesOriginalSuffix } = computeGhostTextViewData(ghostText, textModel, GHOST_TEXT_CLASS_NAME + extraClassNames);
            const currentLine = textModel.getLineContent(ghostText.lineNumber);
            const edit = new StringEdit(inlineTexts.map(t => StringReplacement.insert(t.column - 1, t.text)));
            const tokens = syntaxHighlightingEnabled ? textModel.tokenization.tokenizeLinesAt(ghostText.lineNumber, [edit.apply(currentLine), ...additionalLines.map(l => l.content)]) : undefined;
            const newRanges = edit.getNewRanges();
            const inlineTextsWithTokens = inlineTexts.map((t, idx) => ({ ...t, tokens: tokens?.[0]?.getTokensInRange(newRanges[idx]) }));
            const tokenizedAdditionalLines = additionalLines.map((l, idx) => {
                let content = tokens?.[idx + 1] ?? LineTokens.createEmpty(l.content, this._languageService.languageIdCodec);
                if (idx === additionalLines.length - 1 && additionalLinesOriginalSuffix) {
                    const t = TokenWithTextArray.fromLineTokens(textModel.tokenization.getLineTokens(additionalLinesOriginalSuffix.lineNumber));
                    const existingContent = t.slice(additionalLinesOriginalSuffix.columnRange.toZeroBasedOffsetRange());
                    content = TokenWithTextArray.fromLineTokens(content).append(existingContent).toLineTokens(content.languageIdCodec);
                }
                return {
                    content,
                    decorations: l.decorations,
                };
            });
            const cursorColumn = this._editor.getSelection()?.getStartPosition().column;
            const disjointInlineTexts = inlineTextsWithTokens.filter(inline => inline.text !== '');
            const hasInsertionOnCurrentLine = disjointInlineTexts.length !== 0;
            const renderData = {
                cursorColumnDistance: (hasInsertionOnCurrentLine ? disjointInlineTexts[0].column : 1) - cursorColumn,
                cursorLineDistance: hasInsertionOnCurrentLine ? 0 : (additionalLines.findIndex(line => line.content !== '') + 1),
                lineCountOriginal: hasInsertionOnCurrentLine ? 1 : 0,
                lineCountModified: additionalLines.length + (hasInsertionOnCurrentLine ? 1 : 0),
                characterCountOriginal: 0,
                characterCountModified: sum(disjointInlineTexts.map(inline => inline.text.length)) + sum(tokenizedAdditionalLines.map(line => line.content.getTextLength())),
                disjointReplacements: disjointInlineTexts.length + (additionalLines.length > 0 ? 1 : 0),
                sameShapeReplacements: disjointInlineTexts.length > 1 && tokenizedAdditionalLines.length === 0 ? disjointInlineTexts.every(inline => inline.text === disjointInlineTexts[0].text) : undefined,
            };
            this._model.handleInlineCompletionShown.read(reader)?.(renderData);
            return {
                replacedRange,
                inlineTexts: inlineTextsWithTokens,
                additionalLines: tokenizedAdditionalLines,
                hiddenRange,
                lineNumber: ghostText.lineNumber,
                additionalReservedLineCount: this._model.minReservedLineCount.read(reader),
                targetTextModel: textModel,
                syntaxHighlightingEnabled,
            };
        });
        this.decorations = derived(this, reader => {
            const uiState = this.uiState.read(reader);
            if (!uiState) {
                return [];
            }
            const decorations = [];
            const extraClassNames = this._extraClassNames.read(reader);
            if (uiState.replacedRange) {
                decorations.push({
                    range: uiState.replacedRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'inline-completion-text-to-replace' + extraClassNames, description: 'GhostTextReplacement' }
                });
            }
            if (uiState.hiddenRange) {
                decorations.push({
                    range: uiState.hiddenRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'ghost-text-hidden', description: 'ghost-text-hidden', }
                });
            }
            for (const p of uiState.inlineTexts) {
                decorations.push({
                    range: Range.fromPositions(new Position(uiState.lineNumber, p.column)),
                    options: {
                        description: 'ghost-text-decoration',
                        after: {
                            content: p.text,
                            tokens: p.tokens,
                            inlineClassName: (p.preview ? 'ghost-text-decoration-preview' : 'ghost-text-decoration')
                                + (this._isClickable ? ' clickable' : '')
                                + extraClassNames
                                + p.lineDecorations.map(d => ' ' + d.className).join(' '), // TODO: take the ranges into account for line decorations
                            cursorStops: InjectedTextCursorStops.Left,
                            attachedData: new GhostTextAttachedData(this),
                        },
                        showIfCollapsed: true,
                    }
                });
            }
            return decorations;
        });
        this._additionalLinesWidget = this._register(new AdditionalLinesWidget(this._editor, derived(reader => {
            /** @description lines */
            const uiState = this.uiState.read(reader);
            return uiState ? {
                lineNumber: uiState.lineNumber,
                additionalLines: uiState.additionalLines,
                minReservedLineCount: uiState.additionalReservedLineCount,
                targetTextModel: uiState.targetTextModel,
            } : undefined;
        }), this._shouldKeepCursorStable, this._isClickable));
        this._isInlineTextHovered = this._editorObs.isTargetHovered(p => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof GhostTextAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this.isHovered = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return false;
            }
            return this._isInlineTextHovered.read(reader) || this._additionalLinesWidget.isHovered.read(reader);
        });
        this.height = derived(this, reader => {
            const lineHeight = this._editorObs.getOption(75 /* EditorOption.lineHeight */).read(reader);
            return lineHeight + (this._additionalLinesWidget.viewZoneHeight.read(reader) ?? 0);
        });
        this._register(toDisposable(() => { this._isDisposed.set(true, undefined); }));
        this._register(this._editorObs.setDecorations(this.decorations));
        if (this._isClickable) {
            this._register(this._additionalLinesWidget.onDidClick((e) => this._onDidClick.fire(e)));
            this._register(this._editor.onMouseUp(e => {
                if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                    return;
                }
                const a = e.target.detail.injectedText?.options.attachedData;
                if (a instanceof GhostTextAttachedData && a.owner === this) {
                    this._onDidClick.fire(e.event);
                }
            }));
        }
        this._register(autorunWithStore((reader, store) => {
            if (USE_SQUIGGLES_FOR_WARNING) {
                return;
            }
            const state = this._warningState.read(reader);
            if (!state) {
                return;
            }
            const lineHeight = this._editorObs.getOption(75 /* EditorOption.lineHeight */);
            store.add(this._editorObs.createContentWidget({
                position: constObservable({
                    position: new Position(state.lineNumber, Number.MAX_SAFE_INTEGER),
                    preference: [0 /* ContentWidgetPositionPreference.EXACT */],
                    positionAffinity: 1 /* PositionAffinity.Right */,
                }),
                allowEditorOverflow: false,
                domNode: n.div({
                    class: 'ghost-text-view-warning-widget',
                    style: {
                        width: lineHeight,
                        height: lineHeight,
                        marginLeft: 4,
                        color: 'orange',
                    },
                    ref: (dom) => {
                        dom.ghostTextViewWarningWidgetData = { range: Range.fromPositions(state.position) };
                    }
                }, [
                    n.div({
                        class: 'ghost-text-view-warning-widget-icon',
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignContent: 'center',
                            alignItems: 'center',
                        }
                    }, [
                        renderIcon((state.icon && 'id' in state.icon) ? state.icon : Codicon.warning),
                    ])
                ]).keepUpdated(store).element,
            }));
        }));
    }
    static getWarningWidgetContext(domNode) {
        const data = domNode.ghostTextViewWarningWidgetData;
        if (data) {
            return data;
        }
        else if (domNode.parentElement) {
            return this.getWarningWidgetContext(domNode.parentElement);
        }
        return undefined;
    }
    ownsViewZone(viewZoneId) {
        return this._additionalLinesWidget.viewZoneId === viewZoneId;
    }
};
GhostTextView = GhostTextView_1 = __decorate([
    __param(5, ILanguageService)
], GhostTextView);
export { GhostTextView };
class GhostTextAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function computeGhostTextViewData(ghostText, textModel, ghostTextClassName) {
    const inlineTexts = [];
    const additionalLines = [];
    function addToAdditionalLines(ghLines, className) {
        if (additionalLines.length > 0) {
            const lastLine = additionalLines[additionalLines.length - 1];
            if (className) {
                lastLine.decorations.push(new LineDecoration(lastLine.content.length + 1, lastLine.content.length + 1 + ghLines[0].line.length, className, 0 /* InlineDecorationType.Regular */));
            }
            lastLine.content += ghLines[0].line;
            ghLines = ghLines.slice(1);
        }
        for (const ghLine of ghLines) {
            additionalLines.push({
                content: ghLine.line,
                decorations: className ? [new LineDecoration(1, ghLine.line.length + 1, className, 0 /* InlineDecorationType.Regular */), ...ghLine.lineDecorations] : [...ghLine.lineDecorations]
            });
        }
    }
    const textBufferLine = textModel.getLineContent(ghostText.lineNumber);
    let hiddenTextStartColumn = undefined;
    let lastIdx = 0;
    for (const part of ghostText.parts) {
        let ghLines = part.lines;
        if (hiddenTextStartColumn === undefined) {
            inlineTexts.push({ column: part.column, text: ghLines[0].line, preview: part.preview, lineDecorations: ghLines[0].lineDecorations });
            ghLines = ghLines.slice(1);
        }
        else {
            addToAdditionalLines([{ line: textBufferLine.substring(lastIdx, part.column - 1), lineDecorations: [] }], undefined);
        }
        if (ghLines.length > 0) {
            addToAdditionalLines(ghLines, ghostTextClassName);
            if (hiddenTextStartColumn === undefined && part.column <= textBufferLine.length) {
                hiddenTextStartColumn = part.column;
            }
        }
        lastIdx = part.column - 1;
    }
    let additionalLinesOriginalSuffix = undefined;
    if (hiddenTextStartColumn !== undefined) {
        additionalLinesOriginalSuffix = new RangeSingleLine(ghostText.lineNumber, new ColumnRange(lastIdx + 1, textBufferLine.length + 1));
    }
    const hiddenRange = hiddenTextStartColumn !== undefined ? new ColumnRange(hiddenTextStartColumn, textBufferLine.length + 1) : undefined;
    return {
        inlineTexts,
        additionalLines,
        hiddenRange,
        additionalLinesOriginalSuffix,
    };
}
export class AdditionalLinesWidget extends Disposable {
    get viewZoneId() { return this._viewZoneInfo?.viewZoneId; }
    get viewZoneHeight() { return this._viewZoneHeight; }
    constructor(_editor, _lines, _shouldKeepCursorStable, _isClickable) {
        super();
        this._editor = _editor;
        this._lines = _lines;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._viewZoneHeight = observableValue('viewZoneHeight', undefined);
        this.editorOptionsChanged = observableSignalFromEvent('editorOptionChanged', Event.filter(this._editor.onDidChangeConfiguration, e => e.hasChanged(40 /* EditorOption.disableMonospaceOptimizations */)
            || e.hasChanged(132 /* EditorOption.stopRenderingLineAfter */)
            || e.hasChanged(112 /* EditorOption.renderWhitespace */)
            || e.hasChanged(107 /* EditorOption.renderControlCharacters */)
            || e.hasChanged(60 /* EditorOption.fontLigatures */)
            || e.hasChanged(59 /* EditorOption.fontInfo */)
            || e.hasChanged(75 /* EditorOption.lineHeight */)));
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._viewZoneListener = this._register(new MutableDisposable());
        this.isHovered = observableCodeEditor(this._editor).isTargetHovered(p => isTargetGhostText(p.target.element), this._store);
        this.hasBeenAccepted = false;
        if (this._editor instanceof CodeEditorWidget && this._shouldKeepCursorStable) {
            this._register(this._editor.onBeforeExecuteEdit(e => this.hasBeenAccepted = e.source === 'inlineSuggestion.accept'));
        }
        this._register(autorun(reader => {
            /** @description update view zone */
            const lines = this._lines.read(reader);
            this.editorOptionsChanged.read(reader);
            if (lines) {
                this.hasBeenAccepted = false;
                this.updateLines(lines.lineNumber, lines.additionalLines, lines.minReservedLineCount);
            }
            else {
                this.clear();
            }
        }));
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    clear() {
        this._viewZoneListener.clear();
        this._editor.changeViewZones((changeAccessor) => {
            this.removeActiveViewZone(changeAccessor);
        });
    }
    updateLines(lineNumber, additionalLines, minReservedLineCount) {
        const textModel = this._editor.getModel();
        if (!textModel) {
            return;
        }
        const { tabSize } = textModel.getOptions();
        this._editor.changeViewZones((changeAccessor) => {
            const store = new DisposableStore();
            this.removeActiveViewZone(changeAccessor);
            const heightInLines = Math.max(additionalLines.length, minReservedLineCount);
            if (heightInLines > 0) {
                const domNode = document.createElement('div');
                renderLines(domNode, tabSize, additionalLines, this._editor.getOptions(), this._isClickable);
                if (this._isClickable) {
                    store.add(addDisposableListener(domNode, 'mousedown', (e) => {
                        e.preventDefault(); // This prevents that the editor loses focus
                    }));
                    store.add(addDisposableListener(domNode, 'click', (e) => {
                        if (isTargetGhostText(e.target)) {
                            this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
                        }
                    }));
                }
                this.addViewZone(changeAccessor, lineNumber, heightInLines, domNode);
            }
            this._viewZoneListener.value = store;
        });
    }
    addViewZone(changeAccessor, afterLineNumber, heightInLines, domNode) {
        const id = changeAccessor.addZone({
            afterLineNumber: afterLineNumber,
            heightInLines: heightInLines,
            domNode,
            afterColumnAffinity: 1 /* PositionAffinity.Right */,
            onComputedHeight: (height) => {
                this._viewZoneHeight.set(height, undefined); // TODO: can a transaction be used to avoid flickering?
            }
        });
        this.keepCursorStable(afterLineNumber, heightInLines);
        this._viewZoneInfo = { viewZoneId: id, heightInLines, lineNumber: afterLineNumber };
    }
    removeActiveViewZone(changeAccessor) {
        if (this._viewZoneInfo) {
            changeAccessor.removeZone(this._viewZoneInfo.viewZoneId);
            if (!this.hasBeenAccepted) {
                this.keepCursorStable(this._viewZoneInfo.lineNumber, -this._viewZoneInfo.heightInLines);
            }
            this._viewZoneInfo = undefined;
            this._viewZoneHeight.set(undefined, undefined);
        }
    }
    keepCursorStable(lineNumber, heightInLines) {
        if (!this._shouldKeepCursorStable) {
            return;
        }
        const cursorLineNumber = this._editor.getSelection()?.getStartPosition()?.lineNumber;
        if (cursorLineNumber !== undefined && lineNumber < cursorLineNumber) {
            this._editor.setScrollTop(this._editor.getScrollTop() + heightInLines * this._editor.getOption(75 /* EditorOption.lineHeight */));
        }
    }
}
function isTargetGhostText(target) {
    return isHTMLElement(target) && target.classList.contains(GHOST_TEXT_CLASS_NAME);
}
function renderLines(domNode, tabSize, lines, opts, isClickable) {
    const disableMonospaceOptimizations = opts.get(40 /* EditorOption.disableMonospaceOptimizations */);
    const stopRenderingLineAfter = opts.get(132 /* EditorOption.stopRenderingLineAfter */);
    // To avoid visual confusion, we don't want to render visible whitespace
    const renderWhitespace = 'none';
    const renderControlCharacters = opts.get(107 /* EditorOption.renderControlCharacters */);
    const fontLigatures = opts.get(60 /* EditorOption.fontLigatures */);
    const fontInfo = opts.get(59 /* EditorOption.fontInfo */);
    const lineHeight = opts.get(75 /* EditorOption.lineHeight */);
    let classNames = 'suggest-preview-text';
    if (isClickable) {
        classNames += ' clickable';
    }
    const sb = new StringBuilder(10000);
    sb.appendString(`<div class="${classNames}">`);
    for (let i = 0, len = lines.length; i < len; i++) {
        const lineData = lines[i];
        const lineTokens = lineData.content;
        sb.appendString('<div class="view-line');
        sb.appendString('" style="top:');
        sb.appendString(String(i * lineHeight));
        sb.appendString('px;width:1000000px;">');
        const line = lineTokens.getLineContent();
        const isBasicASCII = strings.isBasicASCII(line);
        const containsRTL = strings.containsRTL(line);
        renderViewLine(new RenderLineInput((fontInfo.isMonospace && !disableMonospaceOptimizations), fontInfo.canUseHalfwidthRightwardsArrow, line, false, isBasicASCII, containsRTL, 0, lineTokens, lineData.decorations, tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures !== EditorFontLigatures.OFF, null, null, 0), sb);
        sb.appendString('</div>');
    }
    sb.appendString('</div>');
    applyFontInfo(domNode, fontInfo);
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
}
export const ttPolicy = createTrustedTypesPolicy('editorGhostText', { createHTML: value => value });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2dob3N0VGV4dC9naG9zdFRleHRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFILE9BQU8sRUFBZSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzSyxPQUFPLEtBQUssT0FBTyxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQXdDLE1BQU0sK0NBQStDLENBQUM7QUFDMUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxRQUFR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