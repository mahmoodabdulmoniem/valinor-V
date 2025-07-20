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
import { addDisposableListener, addStandardDisposableListener, reset } from '../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { forEachAdjacent, groupAdjacentBy } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, subtransaction, transaction } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import { applyStyle } from '../utils.js';
import { EditorFontLigatures } from '../../../../common/config/editorOptions.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { LineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { LineTokens } from '../../../../common/tokens/lineTokens.js';
import { RenderLineInput, renderViewLine2 } from '../../../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../../../common/viewModel.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import './accessibleDiffViewer.css';
import { toAction } from '../../../../../base/common/actions.js';
const accessibleDiffViewerInsertIcon = registerIcon('diff-review-insert', Codicon.add, localize('accessibleDiffViewerInsertIcon', 'Icon for \'Insert\' in accessible diff viewer.'));
const accessibleDiffViewerRemoveIcon = registerIcon('diff-review-remove', Codicon.remove, localize('accessibleDiffViewerRemoveIcon', 'Icon for \'Remove\' in accessible diff viewer.'));
const accessibleDiffViewerCloseIcon = registerIcon('diff-review-close', Codicon.close, localize('accessibleDiffViewerCloseIcon', 'Icon for \'Close\' in accessible diff viewer.'));
let AccessibleDiffViewer = class AccessibleDiffViewer extends Disposable {
    static { this._ttPolicy = createTrustedTypesPolicy('diffReview', { createHTML: value => value }); }
    constructor(_parentNode, _visible, _setVisible, _canClose, _width, _height, _diffs, _models, _instantiationService) {
        super();
        this._parentNode = _parentNode;
        this._visible = _visible;
        this._setVisible = _setVisible;
        this._canClose = _canClose;
        this._width = _width;
        this._height = _height;
        this._diffs = _diffs;
        this._models = _models;
        this._instantiationService = _instantiationService;
        this._state = derived(this, (reader) => {
            const visible = this._visible.read(reader);
            this._parentNode.style.visibility = visible ? 'visible' : 'hidden';
            if (!visible) {
                return null;
            }
            const model = reader.store.add(this._instantiationService.createInstance(ViewModel, this._diffs, this._models, this._setVisible, this._canClose));
            const view = reader.store.add(this._instantiationService.createInstance(View, this._parentNode, model, this._width, this._height, this._models));
            return { model, view, };
        }).recomputeInitiallyAndOnChange(this._store);
    }
    next() {
        transaction(tx => {
            const isVisible = this._visible.get();
            this._setVisible(true, tx);
            if (isVisible) {
                this._state.get().model.nextGroup(tx);
            }
        });
    }
    prev() {
        transaction(tx => {
            this._setVisible(true, tx);
            this._state.get().model.previousGroup(tx);
        });
    }
    close() {
        transaction(tx => {
            this._setVisible(false, tx);
        });
    }
};
AccessibleDiffViewer = __decorate([
    __param(8, IInstantiationService)
], AccessibleDiffViewer);
export { AccessibleDiffViewer };
let ViewModel = class ViewModel extends Disposable {
    constructor(_diffs, _models, _setVisible, canClose, _accessibilitySignalService) {
        super();
        this._diffs = _diffs;
        this._models = _models;
        this._setVisible = _setVisible;
        this.canClose = canClose;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._groups = observableValue(this, []);
        this._currentGroupIdx = observableValue(this, 0);
        this._currentElementIdx = observableValue(this, 0);
        this.groups = this._groups;
        this.currentGroup = this._currentGroupIdx.map((idx, r) => this._groups.read(r)[idx]);
        this.currentGroupIndex = this._currentGroupIdx;
        this.currentElement = this._currentElementIdx.map((idx, r) => this.currentGroup.read(r)?.lines[idx]);
        this._register(autorun(reader => {
            /** @description update groups */
            const diffs = this._diffs.read(reader);
            if (!diffs) {
                this._groups.set([], undefined);
                return;
            }
            const groups = computeViewElementGroups(diffs, this._models.getOriginalModel().getLineCount(), this._models.getModifiedModel().getLineCount());
            transaction(tx => {
                const p = this._models.getModifiedPosition();
                if (p) {
                    const nextGroup = groups.findIndex(g => p?.lineNumber < g.range.modified.endLineNumberExclusive);
                    if (nextGroup !== -1) {
                        this._currentGroupIdx.set(nextGroup, tx);
                    }
                }
                this._groups.set(groups, tx);
            });
        }));
        this._register(autorun(reader => {
            /** @description play audio-cue for diff */
            const currentViewItem = this.currentElement.read(reader);
            if (currentViewItem?.type === LineType.Deleted) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'accessibleDiffViewer.currentElementChanged' });
            }
            else if (currentViewItem?.type === LineType.Added) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'accessibleDiffViewer.currentElementChanged' });
            }
        }));
        this._register(autorun(reader => {
            /** @description select lines in editor */
            // This ensures editor commands (like revert/stage) work
            const currentViewItem = this.currentElement.read(reader);
            if (currentViewItem && currentViewItem.type !== LineType.Header) {
                const lineNumber = currentViewItem.modifiedLineNumber ?? currentViewItem.diff.modified.startLineNumber;
                this._models.modifiedSetSelection(Range.fromPositions(new Position(lineNumber, 1)));
            }
        }));
    }
    _goToGroupDelta(delta, tx) {
        const groups = this.groups.get();
        if (!groups || groups.length <= 1) {
            return;
        }
        subtransaction(tx, tx => {
            this._currentGroupIdx.set(OffsetRange.ofLength(groups.length).clipCyclic(this._currentGroupIdx.get() + delta), tx);
            this._currentElementIdx.set(0, tx);
        });
    }
    nextGroup(tx) { this._goToGroupDelta(1, tx); }
    previousGroup(tx) { this._goToGroupDelta(-1, tx); }
    _goToLineDelta(delta) {
        const group = this.currentGroup.get();
        if (!group || group.lines.length <= 1) {
            return;
        }
        transaction(tx => {
            this._currentElementIdx.set(OffsetRange.ofLength(group.lines.length).clip(this._currentElementIdx.get() + delta), tx);
        });
    }
    goToNextLine() { this._goToLineDelta(1); }
    goToPreviousLine() { this._goToLineDelta(-1); }
    goToLine(line) {
        const group = this.currentGroup.get();
        if (!group) {
            return;
        }
        const idx = group.lines.indexOf(line);
        if (idx === -1) {
            return;
        }
        transaction(tx => {
            this._currentElementIdx.set(idx, tx);
        });
    }
    revealCurrentElementInEditor() {
        if (!this.canClose.get()) {
            return;
        }
        this._setVisible(false, undefined);
        const curElem = this.currentElement.get();
        if (curElem) {
            if (curElem.type === LineType.Deleted) {
                this._models.originalReveal(Range.fromPositions(new Position(curElem.originalLineNumber, 1)));
            }
            else {
                this._models.modifiedReveal(curElem.type !== LineType.Header
                    ? Range.fromPositions(new Position(curElem.modifiedLineNumber, 1))
                    : undefined);
            }
        }
    }
    close() {
        if (!this.canClose.get()) {
            return;
        }
        this._setVisible(false, undefined);
        this._models.modifiedFocus();
    }
};
ViewModel = __decorate([
    __param(4, IAccessibilitySignalService)
], ViewModel);
const viewElementGroupLineMargin = 3;
function computeViewElementGroups(diffs, originalLineCount, modifiedLineCount) {
    const result = [];
    for (const g of groupAdjacentBy(diffs, (a, b) => (b.modified.startLineNumber - a.modified.endLineNumberExclusive < 2 * viewElementGroupLineMargin))) {
        const viewElements = [];
        viewElements.push(new HeaderViewElement());
        const origFullRange = new LineRange(Math.max(1, g[0].original.startLineNumber - viewElementGroupLineMargin), Math.min(g[g.length - 1].original.endLineNumberExclusive + viewElementGroupLineMargin, originalLineCount + 1));
        const modifiedFullRange = new LineRange(Math.max(1, g[0].modified.startLineNumber - viewElementGroupLineMargin), Math.min(g[g.length - 1].modified.endLineNumberExclusive + viewElementGroupLineMargin, modifiedLineCount + 1));
        forEachAdjacent(g, (a, b) => {
            const origRange = new LineRange(a ? a.original.endLineNumberExclusive : origFullRange.startLineNumber, b ? b.original.startLineNumber : origFullRange.endLineNumberExclusive);
            const modifiedRange = new LineRange(a ? a.modified.endLineNumberExclusive : modifiedFullRange.startLineNumber, b ? b.modified.startLineNumber : modifiedFullRange.endLineNumberExclusive);
            origRange.forEach(origLineNumber => {
                viewElements.push(new UnchangedLineViewElement(origLineNumber, modifiedRange.startLineNumber + (origLineNumber - origRange.startLineNumber)));
            });
            if (b) {
                b.original.forEach(origLineNumber => {
                    viewElements.push(new DeletedLineViewElement(b, origLineNumber));
                });
                b.modified.forEach(modifiedLineNumber => {
                    viewElements.push(new AddedLineViewElement(b, modifiedLineNumber));
                });
            }
        });
        const modifiedRange = g[0].modified.join(g[g.length - 1].modified);
        const originalRange = g[0].original.join(g[g.length - 1].original);
        result.push(new ViewElementGroup(new LineRangeMapping(modifiedRange, originalRange), viewElements));
    }
    return result;
}
var LineType;
(function (LineType) {
    LineType[LineType["Header"] = 0] = "Header";
    LineType[LineType["Unchanged"] = 1] = "Unchanged";
    LineType[LineType["Deleted"] = 2] = "Deleted";
    LineType[LineType["Added"] = 3] = "Added";
})(LineType || (LineType = {}));
class ViewElementGroup {
    constructor(range, lines) {
        this.range = range;
        this.lines = lines;
    }
}
class HeaderViewElement {
    constructor() {
        this.type = LineType.Header;
    }
}
class DeletedLineViewElement {
    constructor(diff, originalLineNumber) {
        this.diff = diff;
        this.originalLineNumber = originalLineNumber;
        this.type = LineType.Deleted;
        this.modifiedLineNumber = undefined;
    }
}
class AddedLineViewElement {
    constructor(diff, modifiedLineNumber) {
        this.diff = diff;
        this.modifiedLineNumber = modifiedLineNumber;
        this.type = LineType.Added;
        this.originalLineNumber = undefined;
    }
}
class UnchangedLineViewElement {
    constructor(originalLineNumber, modifiedLineNumber) {
        this.originalLineNumber = originalLineNumber;
        this.modifiedLineNumber = modifiedLineNumber;
        this.type = LineType.Unchanged;
    }
}
let View = class View extends Disposable {
    constructor(_element, _model, _width, _height, _models, _languageService) {
        super();
        this._element = _element;
        this._model = _model;
        this._width = _width;
        this._height = _height;
        this._models = _models;
        this._languageService = _languageService;
        this.domNode = this._element;
        this.domNode.className = 'monaco-component diff-review monaco-editor-background';
        const actionBarContainer = document.createElement('div');
        actionBarContainer.className = 'diff-review-actions';
        this._actionBar = this._register(new ActionBar(actionBarContainer));
        this._register(autorun(reader => {
            /** @description update actions */
            this._actionBar.clear();
            if (this._model.canClose.read(reader)) {
                this._actionBar.push(toAction({
                    id: 'diffreview.close',
                    label: localize('label.close', "Close"),
                    class: 'close-diff-review ' + ThemeIcon.asClassName(accessibleDiffViewerCloseIcon),
                    enabled: true,
                    run: async () => _model.close()
                }), { label: false, icon: true });
            }
        }));
        this._content = document.createElement('div');
        this._content.className = 'diff-review-content';
        this._content.setAttribute('role', 'code');
        this._scrollbar = this._register(new DomScrollableElement(this._content, {}));
        reset(this.domNode, this._scrollbar.getDomNode(), actionBarContainer);
        this._register(autorun(r => {
            this._height.read(r);
            this._width.read(r);
            this._scrollbar.scanDomNode();
        }));
        this._register(toDisposable(() => { reset(this.domNode); }));
        this._register(applyStyle(this.domNode, { width: this._width, height: this._height }));
        this._register(applyStyle(this._content, { width: this._width, height: this._height }));
        this._register(autorunWithStore((reader, store) => {
            /** @description render */
            this._model.currentGroup.read(reader);
            this._render(store);
        }));
        // TODO@hediet use commands
        this._register(addStandardDisposableListener(this.domNode, 'keydown', (e) => {
            if (e.equals(18 /* KeyCode.DownArrow */)
                || e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)
                || e.equals(512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
                this._model.goToNextLine();
            }
            if (e.equals(16 /* KeyCode.UpArrow */)
                || e.equals(2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */)
                || e.equals(512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */)) {
                e.preventDefault();
                this._model.goToPreviousLine();
            }
            if (e.equals(9 /* KeyCode.Escape */)
                || e.equals(2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */)
                || e.equals(512 /* KeyMod.Alt */ | 9 /* KeyCode.Escape */)
                || e.equals(1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */)) {
                e.preventDefault();
                this._model.close();
            }
            if (e.equals(10 /* KeyCode.Space */)
                || e.equals(3 /* KeyCode.Enter */)) {
                e.preventDefault();
                this._model.revealCurrentElementInEditor();
            }
        }));
    }
    _render(store) {
        const originalOptions = this._models.getOriginalOptions();
        const modifiedOptions = this._models.getModifiedOptions();
        const container = document.createElement('div');
        container.className = 'diff-review-table';
        container.setAttribute('role', 'list');
        container.setAttribute('aria-label', localize('ariaLabel', 'Accessible Diff Viewer. Use arrow up and down to navigate.'));
        applyFontInfo(container, modifiedOptions.get(59 /* EditorOption.fontInfo */));
        reset(this._content, container);
        const originalModel = this._models.getOriginalModel();
        const modifiedModel = this._models.getModifiedModel();
        if (!originalModel || !modifiedModel) {
            return;
        }
        const originalModelOpts = originalModel.getOptions();
        const modifiedModelOpts = modifiedModel.getOptions();
        const lineHeight = modifiedOptions.get(75 /* EditorOption.lineHeight */);
        const group = this._model.currentGroup.get();
        for (const viewItem of group?.lines || []) {
            if (!group) {
                break;
            }
            let row;
            if (viewItem.type === LineType.Header) {
                const header = document.createElement('div');
                header.className = 'diff-review-row';
                header.setAttribute('role', 'listitem');
                const r = group.range;
                const diffIndex = this._model.currentGroupIndex.get();
                const diffsLength = this._model.groups.get().length;
                const getAriaLines = (lines) => lines === 0 ? localize('no_lines_changed', "no lines changed")
                    : lines === 1 ? localize('one_line_changed', "1 line changed")
                        : localize('more_lines_changed', "{0} lines changed", lines);
                const originalChangedLinesCntAria = getAriaLines(r.original.length);
                const modifiedChangedLinesCntAria = getAriaLines(r.modified.length);
                header.setAttribute('aria-label', localize({
                    key: 'header',
                    comment: [
                        'This is the ARIA label for a git diff header.',
                        'A git diff header looks like this: @@ -154,12 +159,39 @@.',
                        'That encodes that at original line 154 (which is now line 159), 12 lines were removed/changed with 39 lines.',
                        'Variables 0 and 1 refer to the diff index out of total number of diffs.',
                        'Variables 2 and 4 will be numbers (a line number).',
                        'Variables 3 and 5 will be "no lines changed", "1 line changed" or "X lines changed", localized separately.'
                    ]
                }, "Difference {0} of {1}: original line {2}, {3}, modified line {4}, {5}", (diffIndex + 1), diffsLength, r.original.startLineNumber, originalChangedLinesCntAria, r.modified.startLineNumber, modifiedChangedLinesCntAria));
                const cell = document.createElement('div');
                cell.className = 'diff-review-cell diff-review-summary';
                // e.g.: `1/10: @@ -504,7 +517,7 @@`
                cell.appendChild(document.createTextNode(`${diffIndex + 1}/${diffsLength}: @@ -${r.original.startLineNumber},${r.original.length} +${r.modified.startLineNumber},${r.modified.length} @@`));
                header.appendChild(cell);
                row = header;
            }
            else {
                row = this._createRow(viewItem, lineHeight, this._width.get(), originalOptions, originalModel, originalModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts);
            }
            container.appendChild(row);
            const isSelectedObs = derived(reader => /** @description isSelected */ this._model.currentElement.read(reader) === viewItem);
            store.add(autorun(reader => {
                /** @description update tab index */
                const isSelected = isSelectedObs.read(reader);
                row.tabIndex = isSelected ? 0 : -1;
                if (isSelected) {
                    row.focus();
                }
            }));
            store.add(addDisposableListener(row, 'focus', () => {
                this._model.goToLine(viewItem);
            }));
        }
        this._scrollbar.scanDomNode();
    }
    _createRow(item, lineHeight, width, originalOptions, originalModel, originalModelOpts, modifiedOptions, modifiedModel, modifiedModelOpts) {
        const originalLayoutInfo = originalOptions.get(164 /* EditorOption.layoutInfo */);
        const originalLineNumbersWidth = originalLayoutInfo.glyphMarginWidth + originalLayoutInfo.lineNumbersWidth;
        const modifiedLayoutInfo = modifiedOptions.get(164 /* EditorOption.layoutInfo */);
        const modifiedLineNumbersWidth = 10 + modifiedLayoutInfo.glyphMarginWidth + modifiedLayoutInfo.lineNumbersWidth;
        let rowClassName = 'diff-review-row';
        let lineNumbersExtraClassName = '';
        const spacerClassName = 'diff-review-spacer';
        let spacerIcon = null;
        switch (item.type) {
            case LineType.Added:
                rowClassName = 'diff-review-row line-insert';
                lineNumbersExtraClassName = ' char-insert';
                spacerIcon = accessibleDiffViewerInsertIcon;
                break;
            case LineType.Deleted:
                rowClassName = 'diff-review-row line-delete';
                lineNumbersExtraClassName = ' char-delete';
                spacerIcon = accessibleDiffViewerRemoveIcon;
                break;
        }
        const row = document.createElement('div');
        row.style.minWidth = width + 'px';
        row.className = rowClassName;
        row.setAttribute('role', 'listitem');
        row.ariaLevel = '';
        const cell = document.createElement('div');
        cell.className = 'diff-review-cell';
        cell.style.height = `${lineHeight}px`;
        row.appendChild(cell);
        const originalLineNumber = document.createElement('span');
        originalLineNumber.style.width = (originalLineNumbersWidth + 'px');
        originalLineNumber.style.minWidth = (originalLineNumbersWidth + 'px');
        originalLineNumber.className = 'diff-review-line-number' + lineNumbersExtraClassName;
        if (item.originalLineNumber !== undefined) {
            originalLineNumber.appendChild(document.createTextNode(String(item.originalLineNumber)));
        }
        else {
            originalLineNumber.innerText = '\u00a0';
        }
        cell.appendChild(originalLineNumber);
        const modifiedLineNumber = document.createElement('span');
        modifiedLineNumber.style.width = (modifiedLineNumbersWidth + 'px');
        modifiedLineNumber.style.minWidth = (modifiedLineNumbersWidth + 'px');
        modifiedLineNumber.style.paddingRight = '10px';
        modifiedLineNumber.className = 'diff-review-line-number' + lineNumbersExtraClassName;
        if (item.modifiedLineNumber !== undefined) {
            modifiedLineNumber.appendChild(document.createTextNode(String(item.modifiedLineNumber)));
        }
        else {
            modifiedLineNumber.innerText = '\u00a0';
        }
        cell.appendChild(modifiedLineNumber);
        const spacer = document.createElement('span');
        spacer.className = spacerClassName;
        if (spacerIcon) {
            const spacerCodicon = document.createElement('span');
            spacerCodicon.className = ThemeIcon.asClassName(spacerIcon);
            spacerCodicon.innerText = '\u00a0\u00a0';
            spacer.appendChild(spacerCodicon);
        }
        else {
            spacer.innerText = '\u00a0\u00a0';
        }
        cell.appendChild(spacer);
        let lineContent;
        if (item.modifiedLineNumber !== undefined) {
            let html = this._getLineHtml(modifiedModel, modifiedOptions, modifiedModelOpts.tabSize, item.modifiedLineNumber, this._languageService.languageIdCodec);
            if (AccessibleDiffViewer._ttPolicy) {
                html = AccessibleDiffViewer._ttPolicy.createHTML(html);
            }
            cell.insertAdjacentHTML('beforeend', html);
            lineContent = modifiedModel.getLineContent(item.modifiedLineNumber);
        }
        else {
            let html = this._getLineHtml(originalModel, originalOptions, originalModelOpts.tabSize, item.originalLineNumber, this._languageService.languageIdCodec);
            if (AccessibleDiffViewer._ttPolicy) {
                html = AccessibleDiffViewer._ttPolicy.createHTML(html);
            }
            cell.insertAdjacentHTML('beforeend', html);
            lineContent = originalModel.getLineContent(item.originalLineNumber);
        }
        if (lineContent.length === 0) {
            lineContent = localize('blankLine', "blank");
        }
        let ariaLabel = '';
        switch (item.type) {
            case LineType.Unchanged:
                if (item.originalLineNumber === item.modifiedLineNumber) {
                    ariaLabel = localize({ key: 'unchangedLine', comment: ['The placeholders are contents of the line and should not be translated.'] }, "{0} unchanged line {1}", lineContent, item.originalLineNumber);
                }
                else {
                    ariaLabel = localize('equalLine', "{0} original line {1} modified line {2}", lineContent, item.originalLineNumber, item.modifiedLineNumber);
                }
                break;
            case LineType.Added:
                ariaLabel = localize('insertLine', "+ {0} modified line {1}", lineContent, item.modifiedLineNumber);
                break;
            case LineType.Deleted:
                ariaLabel = localize('deleteLine', "- {0} original line {1}", lineContent, item.originalLineNumber);
                break;
        }
        row.setAttribute('aria-label', ariaLabel);
        return row;
    }
    _getLineHtml(model, options, tabSize, lineNumber, languageIdCodec) {
        const lineContent = model.getLineContent(lineNumber);
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const verticalScrollbarSize = options.get(116 /* EditorOption.scrollbar */).verticalScrollbarSize;
        const lineTokens = LineTokens.createEmpty(lineContent, languageIdCodec);
        const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, model.mightContainNonBasicASCII());
        const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, model.mightContainRTL());
        const r = renderViewLine2(new RenderLineInput((fontInfo.isMonospace && !options.get(40 /* EditorOption.disableMonospaceOptimizations */)), fontInfo.canUseHalfwidthRightwardsArrow, lineContent, false, isBasicASCII, containsRTL, 0, lineTokens, [], tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, options.get(132 /* EditorOption.stopRenderingLineAfter */), options.get(112 /* EditorOption.renderWhitespace */), options.get(107 /* EditorOption.renderControlCharacters */), options.get(60 /* EditorOption.fontLigatures */) !== EditorFontLigatures.OFF, null, null, verticalScrollbarSize));
        return r.html;
    }
};
View = __decorate([
    __param(5, ILanguageService)
], View);
export class AccessibleDiffViewerModelFromEditors {
    constructor(editors) {
        this.editors = editors;
    }
    getOriginalModel() {
        return this.editors.original.getModel();
    }
    getOriginalOptions() {
        return this.editors.original.getOptions();
    }
    originalReveal(range) {
        this.editors.original.revealRange(range);
        this.editors.original.setSelection(range);
        this.editors.original.focus();
    }
    getModifiedModel() {
        return this.editors.modified.getModel();
    }
    getModifiedOptions() {
        return this.editors.modified.getOptions();
    }
    modifiedReveal(range) {
        if (range) {
            this.editors.modified.revealRange(range);
            this.editors.modified.setSelection(range);
        }
        this.editors.modified.focus();
    }
    modifiedSetSelection(range) {
        this.editors.modified.setSelection(range);
    }
    modifiedFocus() {
        this.editors.modified.focus();
    }
    getModifiedPosition() {
        return this.editors.modified.getPosition() ?? undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZURpZmZWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvYWNjZXNzaWJsZURpZmZWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDZCQUE2QixFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFtQixZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRyxPQUFPLEVBQTZCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN2SyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDekMsT0FBTyxFQUFFLG1CQUFtQixFQUF3QyxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxTQUFTLEVBQUUs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