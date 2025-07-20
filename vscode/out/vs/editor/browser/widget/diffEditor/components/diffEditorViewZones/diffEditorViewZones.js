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
import { $, addDisposableListener } from '../../../../../../base/browser/dom.js';
import { ArrayQueue } from '../../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { assertReturnsDefined } from '../../../../../../base/common/types.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { diffDeleteDecoration, diffRemoveIcon } from '../../registrations.contribution.js';
import { DiffMapping } from '../../diffEditorViewModel.js';
import { InlineDiffDeletedCodeMargin } from './inlineDiffDeletedCodeMargin.js';
import { LineSource, RenderOptions, renderLines } from './renderLines.js';
import { animatedObservable, joinCombine } from '../../utils.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
import { Position } from '../../../../../common/core/position.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Range } from '../../../../../common/core/range.js';
import { InlineDecoration } from '../../../../../common/viewModel/inlineDecorations.js';
/**
 * Ensures both editors have the same height by aligning unchanged lines.
 * In inline view mode, inserts viewzones to show deleted code from the original text model in the modified code editor.
 * Synchronizes scrolling.
 *
 * Make sure to add the view zones!
 */
let DiffEditorViewZones = class DiffEditorViewZones extends Disposable {
    constructor(_targetWindow, _editors, _diffModel, _options, _diffEditorWidget, _canIgnoreViewZoneUpdateEvent, _origViewZonesToIgnore, _modViewZonesToIgnore, _clipboardService, _contextMenuService) {
        super();
        this._targetWindow = _targetWindow;
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._diffEditorWidget = _diffEditorWidget;
        this._canIgnoreViewZoneUpdateEvent = _canIgnoreViewZoneUpdateEvent;
        this._origViewZonesToIgnore = _origViewZonesToIgnore;
        this._modViewZonesToIgnore = _modViewZonesToIgnore;
        this._clipboardService = _clipboardService;
        this._contextMenuService = _contextMenuService;
        this._originalTopPadding = observableValue(this, 0);
        this._originalScrollOffset = observableValue(this, 0);
        this._originalScrollOffsetAnimated = animatedObservable(this._targetWindow, this._originalScrollOffset, this._store);
        this._modifiedTopPadding = observableValue(this, 0);
        this._modifiedScrollOffset = observableValue(this, 0);
        this._modifiedScrollOffsetAnimated = animatedObservable(this._targetWindow, this._modifiedScrollOffset, this._store);
        const state = observableValue('invalidateAlignmentsState', 0);
        const updateImmediately = this._register(new RunOnceScheduler(() => {
            state.set(state.get() + 1, undefined);
        }, 0));
        this._register(this._editors.original.onDidChangeViewZones((_args) => { if (!this._canIgnoreViewZoneUpdateEvent()) {
            updateImmediately.schedule();
        } }));
        this._register(this._editors.modified.onDidChangeViewZones((_args) => { if (!this._canIgnoreViewZoneUpdateEvent()) {
            updateImmediately.schedule();
        } }));
        this._register(this._editors.original.onDidChangeConfiguration((args) => {
            if (args.hasChanged(165 /* EditorOption.wrappingInfo */) || args.hasChanged(75 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        this._register(this._editors.modified.onDidChangeConfiguration((args) => {
            if (args.hasChanged(165 /* EditorOption.wrappingInfo */) || args.hasChanged(75 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        const originalModelTokenizationCompleted = this._diffModel.map(m => m ? observableFromEvent(this, m.model.original.onDidChangeTokens, () => m.model.original.tokenization.backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) : undefined).map((m, reader) => m?.read(reader));
        const alignments = derived((reader) => {
            /** @description alignments */
            const diffModel = this._diffModel.read(reader);
            const diff = diffModel?.diff.read(reader);
            if (!diffModel || !diff) {
                return null;
            }
            state.read(reader);
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const innerHunkAlignment = renderSideBySide;
            return computeRangeAlignment(this._editors.original, this._editors.modified, diff.mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, innerHunkAlignment);
        });
        const alignmentsSyncedMovedText = derived((reader) => {
            /** @description alignmentsSyncedMovedText */
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            if (!syncedMovedText) {
                return null;
            }
            state.read(reader);
            const mappings = syncedMovedText.changes.map(c => new DiffMapping(c));
            // TODO dont include alignments outside syncedMovedText
            return computeRangeAlignment(this._editors.original, this._editors.modified, mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, true);
        });
        function createFakeLinesDiv() {
            const r = document.createElement('div');
            r.className = 'diagonal-fill';
            return r;
        }
        const alignmentViewZonesDisposables = this._register(new DisposableStore());
        this.viewZones = derived(this, (reader) => {
            alignmentViewZonesDisposables.clear();
            const alignmentsVal = alignments.read(reader) || [];
            const origViewZones = [];
            const modViewZones = [];
            const modifiedTopPaddingVal = this._modifiedTopPadding.read(reader);
            if (modifiedTopPaddingVal > 0) {
                modViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: modifiedTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const originalTopPaddingVal = this._originalTopPadding.read(reader);
            if (originalTopPaddingVal > 0) {
                origViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: originalTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const deletedCodeLineBreaksComputer = !renderSideBySide ? this._editors.modified._getViewModel()?.createLineBreaksComputer() : undefined;
            if (deletedCodeLineBreaksComputer) {
                const originalModel = this._editors.original.getModel();
                for (const a of alignmentsVal) {
                    if (a.diff) {
                        for (let i = a.originalRange.startLineNumber; i < a.originalRange.endLineNumberExclusive; i++) {
                            // `i` can be out of bound when the diff has not been updated yet.
                            // In this case, we do an early return.
                            // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                            if (i > originalModel.getLineCount()) {
                                return { orig: origViewZones, mod: modViewZones };
                            }
                            deletedCodeLineBreaksComputer?.addRequest(originalModel.getLineContent(i), null, null);
                        }
                    }
                }
            }
            const lineBreakData = deletedCodeLineBreaksComputer?.finalize() ?? [];
            let lineBreakDataIdx = 0;
            const modLineHeight = this._editors.modified.getOption(75 /* EditorOption.lineHeight */);
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            const mightContainNonBasicASCII = this._editors.original.getModel()?.mightContainNonBasicASCII() ?? false;
            const mightContainRTL = this._editors.original.getModel()?.mightContainRTL() ?? false;
            const renderOptions = RenderOptions.fromEditor(this._editors.modified);
            for (const a of alignmentsVal) {
                if (a.diff && !renderSideBySide && (!this._options.useTrueInlineDiffRendering.read(reader) || !allowsTrueInlineDiffRendering(a.diff))) {
                    if (!a.originalRange.isEmpty) {
                        originalModelTokenizationCompleted.read(reader); // Update view-zones once tokenization completes
                        const deletedCodeDomNode = document.createElement('div');
                        deletedCodeDomNode.classList.add('view-lines', 'line-delete', 'monaco-mouse-cursor-text');
                        const originalModel = this._editors.original.getModel();
                        // `a.originalRange` can be out of bound when the diff has not been updated yet.
                        // In this case, we do an early return.
                        // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                        if (a.originalRange.endLineNumberExclusive - 1 > originalModel.getLineCount()) {
                            return { orig: origViewZones, mod: modViewZones };
                        }
                        const source = new LineSource(a.originalRange.mapToLineArray(l => originalModel.tokenization.getLineTokens(l)), a.originalRange.mapToLineArray(_ => lineBreakData[lineBreakDataIdx++]), mightContainNonBasicASCII, mightContainRTL);
                        const decorations = [];
                        for (const i of a.diff.innerChanges || []) {
                            decorations.push(new InlineDecoration(i.originalRange.delta(-(a.diff.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        }
                        const result = renderLines(source, renderOptions, decorations, deletedCodeDomNode);
                        const marginDomNode = document.createElement('div');
                        marginDomNode.className = 'inline-deleted-margin-view-zone';
                        applyFontInfo(marginDomNode, renderOptions.fontInfo);
                        if (this._options.renderIndicators.read(reader)) {
                            for (let i = 0; i < result.heightInLines; i++) {
                                const marginElement = document.createElement('div');
                                marginElement.className = `delete-sign ${ThemeIcon.asClassName(diffRemoveIcon)}`;
                                marginElement.setAttribute('style', `position:absolute;top:${i * modLineHeight}px;width:${renderOptions.lineDecorationsWidth}px;height:${modLineHeight}px;right:0;`);
                                marginDomNode.appendChild(marginElement);
                            }
                        }
                        let zoneId = undefined;
                        alignmentViewZonesDisposables.add(new InlineDiffDeletedCodeMargin(() => assertReturnsDefined(zoneId), marginDomNode, this._editors.modified, a.diff, this._diffEditorWidget, result.viewLineCounts, this._editors.original.getModel(), this._contextMenuService, this._clipboardService));
                        for (let i = 0; i < result.viewLineCounts.length; i++) {
                            const count = result.viewLineCounts[i];
                            // Account for wrapped lines in the (collapsed) original editor (which doesn't wrap lines).
                            if (count > 1) {
                                origViewZones.push({
                                    afterLineNumber: a.originalRange.startLineNumber + i,
                                    domNode: createFakeLinesDiv(),
                                    heightInPx: (count - 1) * modLineHeight,
                                    showInHiddenAreas: true,
                                    suppressMouseDown: true,
                                });
                            }
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.startLineNumber - 1,
                            domNode: deletedCodeDomNode,
                            heightInPx: result.heightInLines * modLineHeight,
                            minWidthInPx: result.minWidthInPx,
                            marginDomNode,
                            setZoneId(id) { zoneId = id; },
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    const marginDomNode = document.createElement('div');
                    marginDomNode.className = 'gutter-delete';
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: a.modifiedHeightInPx,
                        marginDomNode,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                    if (delta > 0) {
                        if (syncedMovedText?.lineRangeMapping.original.delta(-1).deltaLength(2).contains(a.originalRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        origViewZones.push({
                            afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: delta,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    else {
                        if (syncedMovedText?.lineRangeMapping.modified.delta(-1).deltaLength(2).contains(a.modifiedRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        function createViewZoneMarginArrow() {
                            const arrow = document.createElement('div');
                            arrow.className = 'arrow-revert-change ' + ThemeIcon.asClassName(Codicon.arrowRight);
                            reader.store.add(addDisposableListener(arrow, 'mousedown', e => e.stopPropagation()));
                            reader.store.add(addDisposableListener(arrow, 'click', e => {
                                e.stopPropagation();
                                _diffEditorWidget.revert(a.diff);
                            }));
                            return $('div', {}, arrow);
                        }
                        let marginDomNode = undefined;
                        if (a.diff && a.diff.modified.isEmpty && this._options.shouldRenderOldRevertArrows.read(reader)) {
                            marginDomNode = createViewZoneMarginArrow();
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: -delta,
                            marginDomNode,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                }
            }
            for (const a of alignmentsSyncedMovedText.read(reader) ?? []) {
                if (!syncedMovedText?.lineRangeMapping.original.intersect(a.originalRange)
                    || !syncedMovedText?.lineRangeMapping.modified.intersect(a.modifiedRange)) {
                    // ignore unrelated alignments outside the synced moved text
                    continue;
                }
                const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                if (delta > 0) {
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    modViewZones.push({
                        afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: -delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
            }
            return { orig: origViewZones, mod: modViewZones };
        });
        let ignoreChange = false;
        this._register(this._editors.original.onDidScrollChange(e => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.modified.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._register(this._editors.modified.onDidScrollChange(e => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.original.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._originalScrollTop = observableFromEvent(this._editors.original.onDidScrollChange, () => /** @description original.getScrollTop */ this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this._editors.modified.onDidScrollChange, () => /** @description modified.getScrollTop */ this._editors.modified.getScrollTop());
        // origExtraHeight + origOffset - origScrollTop = modExtraHeight + modOffset - modScrollTop
        // origScrollTop = origExtraHeight + origOffset - modExtraHeight - modOffset + modScrollTop
        // modScrollTop = modExtraHeight + modOffset - origExtraHeight - origOffset + origScrollTop
        // origOffset - modOffset = heightOfLines(1..Y) - heightOfLines(1..X)
        // origScrollTop >= 0, modScrollTop >= 0
        this._register(autorun(reader => {
            /** @description update scroll modified */
            const newScrollTopModified = this._originalScrollTop.read(reader)
                - (this._originalScrollOffsetAnimated.get() - this._modifiedScrollOffsetAnimated.read(reader))
                - (this._originalTopPadding.get() - this._modifiedTopPadding.read(reader));
            if (newScrollTopModified !== this._editors.modified.getScrollTop()) {
                this._editors.modified.setScrollTop(newScrollTopModified, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun(reader => {
            /** @description update scroll original */
            const newScrollTopOriginal = this._modifiedScrollTop.read(reader)
                - (this._modifiedScrollOffsetAnimated.get() - this._originalScrollOffsetAnimated.read(reader))
                - (this._modifiedTopPadding.get() - this._originalTopPadding.read(reader));
            if (newScrollTopOriginal !== this._editors.original.getScrollTop()) {
                this._editors.original.setScrollTop(newScrollTopOriginal, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun(reader => {
            /** @description update editor top offsets */
            const m = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            let deltaOrigToMod = 0;
            if (m) {
                const trueTopOriginal = this._editors.original.getTopForLineNumber(m.lineRangeMapping.original.startLineNumber, true) - this._originalTopPadding.get();
                const trueTopModified = this._editors.modified.getTopForLineNumber(m.lineRangeMapping.modified.startLineNumber, true) - this._modifiedTopPadding.get();
                deltaOrigToMod = trueTopModified - trueTopOriginal;
            }
            if (deltaOrigToMod > 0) {
                this._modifiedTopPadding.set(0, undefined);
                this._originalTopPadding.set(deltaOrigToMod, undefined);
            }
            else if (deltaOrigToMod < 0) {
                this._modifiedTopPadding.set(-deltaOrigToMod, undefined);
                this._originalTopPadding.set(0, undefined);
            }
            else {
                setTimeout(() => {
                    this._modifiedTopPadding.set(0, undefined);
                    this._originalTopPadding.set(0, undefined);
                }, 400);
            }
            if (this._editors.modified.hasTextFocus()) {
                this._originalScrollOffset.set(this._modifiedScrollOffset.get() - deltaOrigToMod, undefined, true);
            }
            else {
                this._modifiedScrollOffset.set(this._originalScrollOffset.get() + deltaOrigToMod, undefined, true);
            }
        }));
    }
};
DiffEditorViewZones = __decorate([
    __param(8, IClipboardService),
    __param(9, IContextMenuService)
], DiffEditorViewZones);
export { DiffEditorViewZones };
function computeRangeAlignment(originalEditor, modifiedEditor, diffs, originalEditorAlignmentViewZones, modifiedEditorAlignmentViewZones, innerHunkAlignment) {
    const originalLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(originalEditor, originalEditorAlignmentViewZones));
    const modifiedLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(modifiedEditor, modifiedEditorAlignmentViewZones));
    const origLineHeight = originalEditor.getOption(75 /* EditorOption.lineHeight */);
    const modLineHeight = modifiedEditor.getOption(75 /* EditorOption.lineHeight */);
    const result = [];
    let lastOriginalLineNumber = 0;
    let lastModifiedLineNumber = 0;
    function handleAlignmentsOutsideOfDiffs(untilOriginalLineNumberExclusive, untilModifiedLineNumberExclusive) {
        while (true) {
            let origNext = originalLineHeightOverrides.peek();
            let modNext = modifiedLineHeightOverrides.peek();
            if (origNext && origNext.lineNumber >= untilOriginalLineNumberExclusive) {
                origNext = undefined;
            }
            if (modNext && modNext.lineNumber >= untilModifiedLineNumberExclusive) {
                modNext = undefined;
            }
            if (!origNext && !modNext) {
                break;
            }
            const distOrig = origNext ? origNext.lineNumber - lastOriginalLineNumber : Number.MAX_VALUE;
            const distNext = modNext ? modNext.lineNumber - lastModifiedLineNumber : Number.MAX_VALUE;
            if (distOrig < distNext) {
                originalLineHeightOverrides.dequeue();
                modNext = {
                    lineNumber: origNext.lineNumber - lastOriginalLineNumber + lastModifiedLineNumber,
                    heightInPx: 0,
                };
            }
            else if (distOrig > distNext) {
                modifiedLineHeightOverrides.dequeue();
                origNext = {
                    lineNumber: modNext.lineNumber - lastModifiedLineNumber + lastOriginalLineNumber,
                    heightInPx: 0,
                };
            }
            else {
                originalLineHeightOverrides.dequeue();
                modifiedLineHeightOverrides.dequeue();
            }
            result.push({
                originalRange: LineRange.ofLength(origNext.lineNumber, 1),
                modifiedRange: LineRange.ofLength(modNext.lineNumber, 1),
                originalHeightInPx: origLineHeight + origNext.heightInPx,
                modifiedHeightInPx: modLineHeight + modNext.heightInPx,
                diff: undefined,
            });
        }
    }
    for (const m of diffs) {
        const c = m.lineRangeMapping;
        handleAlignmentsOutsideOfDiffs(c.original.startLineNumber, c.modified.startLineNumber);
        let first = true;
        let lastModLineNumber = c.modified.startLineNumber;
        let lastOrigLineNumber = c.original.startLineNumber;
        function emitAlignment(origLineNumberExclusive, modLineNumberExclusive, forceAlignment = false) {
            if (origLineNumberExclusive < lastOrigLineNumber || modLineNumberExclusive < lastModLineNumber) {
                return;
            }
            if (first) {
                first = false;
            }
            else if (!forceAlignment && (origLineNumberExclusive === lastOrigLineNumber || modLineNumberExclusive === lastModLineNumber)) {
                // This causes a re-alignment of an already aligned line.
                // However, we don't care for the final alignment.
                return;
            }
            const originalRange = new LineRange(lastOrigLineNumber, origLineNumberExclusive);
            const modifiedRange = new LineRange(lastModLineNumber, modLineNumberExclusive);
            if (originalRange.isEmpty && modifiedRange.isEmpty) {
                return;
            }
            const originalAdditionalHeight = originalLineHeightOverrides
                .takeWhile(v => v.lineNumber < origLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            const modifiedAdditionalHeight = modifiedLineHeightOverrides
                .takeWhile(v => v.lineNumber < modLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            result.push({
                originalRange,
                modifiedRange,
                originalHeightInPx: originalRange.length * origLineHeight + originalAdditionalHeight,
                modifiedHeightInPx: modifiedRange.length * modLineHeight + modifiedAdditionalHeight,
                diff: m.lineRangeMapping,
            });
            lastOrigLineNumber = origLineNumberExclusive;
            lastModLineNumber = modLineNumberExclusive;
        }
        if (innerHunkAlignment) {
            for (const i of c.innerChanges || []) {
                if (i.originalRange.startColumn > 1 && i.modifiedRange.startColumn > 1) {
                    // There is some unmodified text on this line before the diff
                    emitAlignment(i.originalRange.startLineNumber, i.modifiedRange.startLineNumber);
                }
                const originalModel = originalEditor.getModel();
                // When the diff is invalid, the ranges might be out of bounds (this should be fixed in the diff model by applying edits directly).
                const maxColumn = i.originalRange.endLineNumber <= originalModel.getLineCount() ? originalModel.getLineMaxColumn(i.originalRange.endLineNumber) : Number.MAX_SAFE_INTEGER;
                if (i.originalRange.endColumn < maxColumn) {
                    // // There is some unmodified text on this line after the diff
                    emitAlignment(i.originalRange.endLineNumber, i.modifiedRange.endLineNumber);
                }
            }
        }
        emitAlignment(c.original.endLineNumberExclusive, c.modified.endLineNumberExclusive, true);
        lastOriginalLineNumber = c.original.endLineNumberExclusive;
        lastModifiedLineNumber = c.modified.endLineNumberExclusive;
    }
    handleAlignmentsOutsideOfDiffs(Number.MAX_VALUE, Number.MAX_VALUE);
    return result;
}
function getAdditionalLineHeights(editor, viewZonesToIgnore) {
    const viewZoneHeights = [];
    const wrappingZoneHeights = [];
    const hasWrapping = editor.getOption(165 /* EditorOption.wrappingInfo */).wrappingColumn !== -1;
    const coordinatesConverter = editor._getViewModel().coordinatesConverter;
    const editorLineHeight = editor.getOption(75 /* EditorOption.lineHeight */);
    if (hasWrapping) {
        for (let i = 1; i <= editor.getModel().getLineCount(); i++) {
            const lineCount = coordinatesConverter.getModelLineViewLineCount(i);
            if (lineCount > 1) {
                wrappingZoneHeights.push({ lineNumber: i, heightInPx: editorLineHeight * (lineCount - 1) });
            }
        }
    }
    for (const w of editor.getWhitespaces()) {
        if (viewZonesToIgnore.has(w.id)) {
            continue;
        }
        const modelLineNumber = w.afterLineNumber === 0 ? 0 : coordinatesConverter.convertViewPositionToModelPosition(new Position(w.afterLineNumber, 1)).lineNumber;
        viewZoneHeights.push({ lineNumber: modelLineNumber, heightInPx: w.height });
    }
    const result = joinCombine(viewZoneHeights, wrappingZoneHeights, v => v.lineNumber, (v1, v2) => ({ lineNumber: v1.lineNumber, heightInPx: v1.heightInPx + v2.heightInPx }));
    return result;
}
export function allowsTrueInlineDiffRendering(mapping) {
    if (!mapping.innerChanges) {
        return false;
    }
    return mapping.innerChanges.every(c => (rangeIsSingleLine(c.modifiedRange) && rangeIsSingleLine(c.originalRange))
        || c.originalRange.equalsRange(new Range(1, 1, 1, 1)));
}
export function rangeIsSingleLine(range) {
    return range.startLineNumber === range.endLineNumber;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdab25lcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tcG9uZW50cy9kaWZmRWRpdG9yVmlld1pvbmVzL2RpZmZFZGl0b3JWaWV3Wm9uZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RixPQUFPLEVBQWUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRixPQUFPLEVBQXVCLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWhGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzFFLE9BQU8sRUFBdUIsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUlsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUVwRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHNEQUFzRCxDQUFDO0FBRTlHOzs7Ozs7R0FNRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQWFsRCxZQUNrQixhQUFxQixFQUNyQixRQUEyQixFQUMzQixVQUF3RCxFQUN4RCxRQUEyQixFQUMzQixpQkFBbUMsRUFDbkMsNkJBQTRDLEVBQzVDLHNCQUFtQyxFQUNuQyxxQkFBa0MsRUFDZixpQkFBb0MsRUFDbEMsbUJBQXdDO1FBRTlFLEtBQUssRUFBRSxDQUFDO1FBWFMsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFDckIsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsZUFBVSxHQUFWLFVBQVUsQ0FBOEM7UUFDeEQsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFrQjtRQUNuQyxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWU7UUFDNUMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFhO1FBQ25DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBYTtRQUNmLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDbEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUc5RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsZUFBZSxDQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLDZCQUE2QixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNySCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsZUFBZSxDQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLDZCQUE2QixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVySCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ2xFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN2QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxDQUFDO1lBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6SixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEVBQUUsQ0FBQztZQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZFLElBQUksSUFBSSxDQUFDLFVBQVUscUNBQTJCLElBQUksSUFBSSxDQUFDLFVBQVUsa0NBQXlCLEVBQUUsQ0FBQztnQkFBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUFDLENBQUM7UUFDOUgsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RSxJQUFJLElBQUksQ0FBQyxVQUFVLHFDQUEyQixJQUFJLElBQUksQ0FBQyxVQUFVLGtDQUF5QixFQUFFLENBQUM7Z0JBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFBQyxDQUFDO1FBQzlILENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQywyQkFBMkIsa0RBQTBDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUN4TCxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUV0QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQStCLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbkUsOEJBQThCO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLE1BQU0sSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFBQyxPQUFPLElBQUksQ0FBQztZQUFDLENBQUM7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sa0JBQWtCLEdBQUcsZ0JBQWdCLENBQUM7WUFDNUMsT0FBTyxxQkFBcUIsQ0FDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUN0QixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsSUFBSSxDQUFDLHFCQUFxQixFQUMxQixrQkFBa0IsQ0FDbEIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQStCLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEYsNkNBQTZDO1lBQzdDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQUMsT0FBTyxJQUFJLENBQUM7WUFBQyxDQUFDO1lBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkIsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLHVEQUF1RDtZQUN2RCxPQUFPLHFCQUFxQixDQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQ3RCLFFBQVEsRUFDUixJQUFJLENBQUMsc0JBQXNCLEVBQzNCLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsSUFBSSxDQUNKLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILFNBQVMsa0JBQWtCO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7WUFDOUIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBOEQsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdEcsNkJBQTZCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFdEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFcEQsTUFBTSxhQUFhLEdBQTBCLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFlBQVksR0FBMEIsRUFBRSxDQUFDO1lBRS9DLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRSxJQUFJLHFCQUFxQixHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQixZQUFZLENBQUMsSUFBSSxDQUFDO29CQUNqQixlQUFlLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO29CQUN0QyxVQUFVLEVBQUUscUJBQXFCO29CQUNqQyxpQkFBaUIsRUFBRSxJQUFJO29CQUN2QixpQkFBaUIsRUFBRSxJQUFJO2lCQUN2QixDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BFLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLGFBQWEsQ0FBQyxJQUFJLENBQUM7b0JBQ2xCLGVBQWUsRUFBRSxDQUFDO29CQUNsQixPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7b0JBQ3RDLFVBQVUsRUFBRSxxQkFBcUI7b0JBQ2pDLGlCQUFpQixFQUFFLElBQUk7b0JBQ3ZCLGlCQUFpQixFQUFFLElBQUk7aUJBQ3ZCLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXJFLE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3pJLElBQUksNkJBQTZCLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ3pELEtBQUssTUFBTSxDQUFDLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDL0Ysa0VBQWtFOzRCQUNsRSx1Q0FBdUM7NEJBQ3ZDLDJHQUEyRzs0QkFDM0csSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0NBQ3RDLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQzs0QkFDbkQsQ0FBQzs0QkFDRCw2QkFBNkIsRUFBRSxVQUFVLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3hGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLDZCQUE2QixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUN0RSxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztZQUV6QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLGtDQUF5QixDQUFDO1lBRWhGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV0RixNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLHlCQUF5QixFQUFFLElBQUksS0FBSyxDQUFDO1lBQzFHLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEtBQUssQ0FBQztZQUN0RixNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkUsS0FBSyxNQUFNLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDdkksSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzlCLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdEQUFnRDt3QkFFakcsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUN6RCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsMEJBQTBCLENBQUMsQ0FBQzt3QkFDMUYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFHLENBQUM7d0JBQ3pELGdGQUFnRjt3QkFDaEYsdUNBQXVDO3dCQUN2QywyR0FBMkc7d0JBQzNHLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7NEJBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQzt3QkFDbkQsQ0FBQzt3QkFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FDNUIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNoRixDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFDdEUseUJBQXlCLEVBQ3pCLGVBQWUsQ0FDZixDQUFDO3dCQUNGLE1BQU0sV0FBVyxHQUF1QixFQUFFLENBQUM7d0JBQzNDLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7NEJBQzNDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FDcEMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUM3RCxvQkFBb0IsQ0FBQyxTQUFVLHVDQUUvQixDQUFDLENBQUM7d0JBQ0osQ0FBQzt3QkFDRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQzt3QkFFbkYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDcEQsYUFBYSxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQzt3QkFDNUQsYUFBYSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBRXJELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFDakQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FDL0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQ0FDcEQsYUFBYSxDQUFDLFNBQVMsR0FBRyxlQUFlLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQ0FDakYsYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsR0FBRyxhQUFhLFlBQVksYUFBYSxDQUFDLG9CQUFvQixhQUFhLGFBQWEsYUFBYSxDQUFDLENBQUM7Z0NBQ3JLLGFBQWEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7NEJBQzFDLENBQUM7d0JBQ0YsQ0FBQzt3QkFFRCxJQUFJLE1BQU0sR0FBdUIsU0FBUyxDQUFDO3dCQUMzQyw2QkFBNkIsQ0FBQyxHQUFHLENBQ2hDLElBQUksMkJBQTJCLENBQzlCLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUNsQyxhQUFhLEVBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQ3RCLENBQUMsQ0FBQyxJQUFJLEVBQ04sSUFBSSxDQUFDLGlCQUFpQixFQUN0QixNQUFNLENBQUMsY0FBYyxFQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUcsRUFDbEMsSUFBSSxDQUFDLG1CQUFtQixFQUN4QixJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQ0QsQ0FBQzt3QkFFRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDdkQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDdkMsMkZBQTJGOzRCQUMzRixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztnQ0FDZixhQUFhLENBQUMsSUFBSSxDQUFDO29DQUNsQixlQUFlLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEdBQUcsQ0FBQztvQ0FDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFO29DQUM3QixVQUFVLEVBQUUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsYUFBYTtvQ0FDdkMsaUJBQWlCLEVBQUUsSUFBSTtvQ0FDdkIsaUJBQWlCLEVBQUUsSUFBSTtpQ0FDdkIsQ0FBQyxDQUFDOzRCQUNKLENBQUM7d0JBQ0YsQ0FBQzt3QkFFRCxZQUFZLENBQUMsSUFBSSxDQUFDOzRCQUNqQixlQUFlLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEdBQUcsQ0FBQzs0QkFDcEQsT0FBTyxFQUFFLGtCQUFrQjs0QkFDM0IsVUFBVSxFQUFFLE1BQU0sQ0FBQyxhQUFhLEdBQUcsYUFBYTs0QkFDaEQsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZOzRCQUNqQyxhQUFhOzRCQUNiLFNBQVMsQ0FBQyxFQUFFLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQzlCLGlCQUFpQixFQUFFLElBQUk7NEJBQ3ZCLGlCQUFpQixFQUFFLElBQUk7eUJBQ3ZCLENBQUMsQ0FBQztvQkFDSixDQUFDO29CQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3BELGFBQWEsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDO29CQUUxQyxhQUFhLENBQUMsSUFBSSxDQUFDO3dCQUNsQixlQUFlLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDO3dCQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUU7d0JBQzdCLFVBQVUsRUFBRSxDQUFDLENBQUMsa0JBQWtCO3dCQUNoQyxhQUFhO3dCQUNiLGlCQUFpQixFQUFFLElBQUk7d0JBQ3ZCLGlCQUFpQixFQUFFLElBQUk7cUJBQ3ZCLENBQUMsQ0FBQztnQkFDSixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDMUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2YsSUFBSSxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUM5SCxTQUFTO3dCQUNWLENBQUM7d0JBRUQsYUFBYSxDQUFDLElBQUksQ0FBQzs0QkFDbEIsZUFBZSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEdBQUcsQ0FBQzs0QkFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFOzRCQUM3QixVQUFVLEVBQUUsS0FBSzs0QkFDakIsaUJBQWlCLEVBQUUsSUFBSTs0QkFDdkIsaUJBQWlCLEVBQUUsSUFBSTt5QkFDdkIsQ0FBQyxDQUFDO29CQUNKLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQzlILFNBQVM7d0JBQ1YsQ0FBQzt3QkFFRCxTQUFTLHlCQUF5Qjs0QkFDakMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDNUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxzQkFBc0IsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzs0QkFDckYsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3RGLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0NBQzFELENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQ0FDcEIsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFLLENBQUMsQ0FBQzs0QkFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDSixPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUM1QixDQUFDO3dCQUVELElBQUksYUFBYSxHQUE0QixTQUFTLENBQUM7d0JBQ3ZELElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFDakcsYUFBYSxHQUFHLHlCQUF5QixFQUFFLENBQUM7d0JBQzdDLENBQUM7d0JBRUQsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDakIsZUFBZSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEdBQUcsQ0FBQzs0QkFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFOzRCQUM3QixVQUFVLEVBQUUsQ0FBQyxLQUFLOzRCQUNsQixhQUFhOzRCQUNiLGlCQUFpQixFQUFFLElBQUk7NEJBQ3ZCLGlCQUFpQixFQUFFLElBQUk7eUJBQ3ZCLENBQUMsQ0FBQztvQkFDSixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzlELElBQUksQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO3VCQUN0RSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUM1RSw0REFBNEQ7b0JBQzVELFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO2dCQUMxRCxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDZixhQUFhLENBQUMsSUFBSSxDQUFDO3dCQUNsQixlQUFlLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDO3dCQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUU7d0JBQzdCLFVBQVUsRUFBRSxLQUFLO3dCQUNqQixpQkFBaUIsRUFBRSxJQUFJO3dCQUN2QixpQkFBaUIsRUFBRSxJQUFJO3FCQUN2QixDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLFlBQVksQ0FBQyxJQUFJLENBQUM7d0JBQ2pCLGVBQWUsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLHNCQUFzQixHQUFHLENBQUM7d0JBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRTt3QkFDN0IsVUFBVSxFQUFFLENBQUMsS0FBSzt3QkFDbEIsaUJBQWlCLEVBQUUsSUFBSTt3QkFDdkIsaUJBQWlCLEVBQUUsSUFBSTtxQkFDdkIsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0QsSUFBSSxDQUFDLENBQUMsaUJBQWlCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDMUMsWUFBWSxHQUFHLElBQUksQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbkQsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0QsSUFBSSxDQUFDLENBQUMsaUJBQWlCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDMUMsWUFBWSxHQUFHLElBQUksQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbkQsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyx5Q0FBeUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQy9LLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyx5Q0FBeUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRS9LLDJGQUEyRjtRQUUzRiwyRkFBMkY7UUFDM0YsMkZBQTJGO1FBRTNGLHFFQUFxRTtRQUNyRSx3Q0FBd0M7UUFFeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsMENBQTBDO1lBQzFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7a0JBQzlELENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7a0JBQzVGLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM1RSxJQUFJLG9CQUFvQixLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsK0JBQXVCLENBQUM7WUFDakYsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQiwwQ0FBMEM7WUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztrQkFDOUQsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztrQkFDNUYsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzVFLElBQUksb0JBQW9CLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztnQkFDcEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLG9CQUFvQiwrQkFBdUIsQ0FBQztZQUNqRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUdKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLDZDQUE2QztZQUM3QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFeEUsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ1AsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUN2SixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3ZKLGNBQWMsR0FBRyxlQUFlLEdBQUcsZUFBZSxDQUFDO1lBQ3BELENBQUM7WUFFRCxJQUFJLGNBQWMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7aUJBQU0sSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNmLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ1QsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRCxDQUFBO0FBclpZLG1CQUFtQjtJQXNCN0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0dBdkJULG1CQUFtQixDQXFaL0I7O0FBaUJELFNBQVMscUJBQXFCLENBQzdCLGNBQWdDLEVBQ2hDLGNBQWdDLEVBQ2hDLEtBQTZCLEVBQzdCLGdDQUFxRCxFQUNyRCxnQ0FBcUQsRUFDckQsa0JBQTJCO0lBRTNCLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxVQUFVLENBQUMsd0JBQXdCLENBQUMsY0FBYyxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztJQUMvSCxNQUFNLDJCQUEyQixHQUFHLElBQUksVUFBVSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7SUFFL0gsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFNBQVMsa0NBQXlCLENBQUM7SUFDekUsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLFNBQVMsa0NBQXlCLENBQUM7SUFFeEUsTUFBTSxNQUFNLEdBQTBCLEVBQUUsQ0FBQztJQUV6QyxJQUFJLHNCQUFzQixHQUFHLENBQUMsQ0FBQztJQUMvQixJQUFJLHNCQUFzQixHQUFHLENBQUMsQ0FBQztJQUUvQixTQUFTLDhCQUE4QixDQUFDLGdDQUF3QyxFQUFFLGdDQUF3QztRQUN6SCxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsSUFBSSxRQUFRLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEQsSUFBSSxPQUFPLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakQsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDO2dCQUN6RSxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQ3RCLENBQUM7WUFDRCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLGdDQUFnQyxFQUFFLENBQUM7Z0JBQ3ZFLE9BQU8sR0FBRyxTQUFTLENBQUM7WUFDckIsQ0FBQztZQUNELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0IsTUFBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDNUYsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO1lBRTFGLElBQUksUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDO2dCQUN6QiwyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxHQUFHO29CQUNULFVBQVUsRUFBRSxRQUFTLENBQUMsVUFBVSxHQUFHLHNCQUFzQixHQUFHLHNCQUFzQjtvQkFDbEYsVUFBVSxFQUFFLENBQUM7aUJBQ2IsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxRQUFRLEdBQUcsUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QyxRQUFRLEdBQUc7b0JBQ1YsVUFBVSxFQUFFLE9BQVEsQ0FBQyxVQUFVLEdBQUcsc0JBQXNCLEdBQUcsc0JBQXNCO29CQUNqRixVQUFVLEVBQUUsQ0FBQztpQkFDYixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QyxDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxhQUFhLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztnQkFDMUQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELGtCQUFrQixFQUFFLGNBQWMsR0FBRyxRQUFTLENBQUMsVUFBVTtnQkFDekQsa0JBQWtCLEVBQUUsYUFBYSxHQUFHLE9BQVEsQ0FBQyxVQUFVO2dCQUN2RCxJQUFJLEVBQUUsU0FBUzthQUNmLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQUM7UUFDN0IsOEJBQThCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUV2RixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztRQUNuRCxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1FBRXBELFNBQVMsYUFBYSxDQUFDLHVCQUErQixFQUFFLHNCQUE4QixFQUFFLGNBQWMsR0FBRyxLQUFLO1lBQzdHLElBQUksdUJBQXVCLEdBQUcsa0JBQWtCLElBQUksc0JBQXNCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztnQkFDaEcsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDZixDQUFDO2lCQUFNLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyx1QkFBdUIsS0FBSyxrQkFBa0IsSUFBSSxzQkFBc0IsS0FBSyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hJLHlEQUF5RDtnQkFDekQsa0RBQWtEO2dCQUNsRCxPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sYUFBYSxHQUFHLElBQUksU0FBUyxDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixDQUFDLENBQUM7WUFDakYsTUFBTSxhQUFhLEdBQUcsSUFBSSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUMvRSxJQUFJLGFBQWEsQ0FBQyxPQUFPLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNwRCxPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCO2lCQUMxRCxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLHVCQUF1QixDQUFDO2dCQUN2RCxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxNQUFNLHdCQUF3QixHQUFHLDJCQUEyQjtpQkFDMUQsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQztnQkFDdEQsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFOUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxhQUFhO2dCQUNiLGFBQWE7Z0JBQ2Isa0JBQWtCLEVBQUUsYUFBYSxDQUFDLE1BQU0sR0FBRyxjQUFjLEdBQUcsd0JBQXdCO2dCQUNwRixrQkFBa0IsRUFBRSxhQUFhLENBQUMsTUFBTSxHQUFHLGFBQWEsR0FBRyx3QkFBd0I7Z0JBQ25GLElBQUksRUFBRSxDQUFDLENBQUMsZ0JBQWdCO2FBQ3hCLENBQUMsQ0FBQztZQUVILGtCQUFrQixHQUFHLHVCQUF1QixDQUFDO1lBQzdDLGlCQUFpQixHQUFHLHNCQUFzQixDQUFDO1FBQzVDLENBQUM7UUFFRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDeEUsNkRBQTZEO29CQUM3RCxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDakYsQ0FBQztnQkFDRCxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFHLENBQUM7Z0JBQ2pELG1JQUFtSTtnQkFDbkksTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDO2dCQUMxSyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUMzQywrREFBK0Q7b0JBQy9ELGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTFGLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUM7UUFDM0Qsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQztJQUM1RCxDQUFDO0lBQ0QsOEJBQThCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFbkUsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBT0QsU0FBUyx3QkFBd0IsQ0FBQyxNQUF3QixFQUFFLGlCQUFzQztJQUNqRyxNQUFNLGVBQWUsR0FBaUQsRUFBRSxDQUFDO0lBQ3pFLE1BQU0sbUJBQW1CLEdBQWlELEVBQUUsQ0FBQztJQUU3RSxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsU0FBUyxxQ0FBMkIsQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDdEYsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFHLENBQUMsb0JBQW9CLENBQUM7SUFDMUUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQztJQUNuRSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3RCxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7UUFDekMsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDakMsU0FBUztRQUNWLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FDNUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FDbEMsQ0FBQyxVQUFVLENBQUM7UUFDYixlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FDekIsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQ2pCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUN0RixDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLDZCQUE2QixDQUFDLE9BQWlDO0lBQzlFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDM0IsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUNyQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7V0FDdkUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDckQsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBWTtJQUM3QyxPQUFPLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsQ0FBQztBQUN0RCxDQUFDIn0=