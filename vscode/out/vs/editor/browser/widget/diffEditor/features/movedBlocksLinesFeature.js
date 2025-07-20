/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../../base/common/actions.js';
import { booleanComparator, compareBy, numberComparator, tieBreakComparators } from '../../../../../base/common/arrays.js';
import { findMaxIdx } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunWithStore, constObservable, derived, observableFromEvent, observableSignalFromEvent, observableValue, recomputeInitiallyAndOnChange } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { PlaceholderViewZone, ViewZoneOverlayWidget, applyStyle, applyViewZones } from '../utils.js';
import { OffsetRange, OffsetRangeSet } from '../../../../common/core/ranges/offsetRange.js';
import { localize } from '../../../../../nls.js';
export class MovedBlocksLinesFeature extends Disposable {
    static { this.movedCodeBlockPadding = 4; }
    constructor(_rootElement, _diffModel, _originalEditorLayoutInfo, _modifiedEditorLayoutInfo, _editors) {
        super();
        this._rootElement = _rootElement;
        this._diffModel = _diffModel;
        this._originalEditorLayoutInfo = _originalEditorLayoutInfo;
        this._modifiedEditorLayoutInfo = _modifiedEditorLayoutInfo;
        this._editors = _editors;
        this._originalScrollTop = observableFromEvent(this, this._editors.original.onDidScrollChange, () => this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this, this._editors.modified.onDidScrollChange, () => this._editors.modified.getScrollTop());
        this._viewZonesChanged = observableSignalFromEvent('onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this.width = observableValue(this, 0);
        this._modifiedViewZonesChangedSignal = observableSignalFromEvent('modified.onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this._originalViewZonesChangedSignal = observableSignalFromEvent('original.onDidChangeViewZones', this._editors.original.onDidChangeViewZones);
        this._state = derived(this, (reader) => {
            /** @description state */
            this._element.replaceChildren();
            const model = this._diffModel.read(reader);
            const moves = model?.diff.read(reader)?.movedTexts;
            if (!moves || moves.length === 0) {
                this.width.set(0, undefined);
                return;
            }
            this._viewZonesChanged.read(reader);
            const infoOrig = this._originalEditorLayoutInfo.read(reader);
            const infoMod = this._modifiedEditorLayoutInfo.read(reader);
            if (!infoOrig || !infoMod) {
                this.width.set(0, undefined);
                return;
            }
            this._modifiedViewZonesChangedSignal.read(reader);
            this._originalViewZonesChangedSignal.read(reader);
            const lines = moves.map((move) => {
                function computeLineStart(range, editor) {
                    const t1 = editor.getTopForLineNumber(range.startLineNumber, true);
                    const t2 = editor.getTopForLineNumber(range.endLineNumberExclusive, true);
                    return (t1 + t2) / 2;
                }
                const start = computeLineStart(move.lineRangeMapping.original, this._editors.original);
                const startOffset = this._originalScrollTop.read(reader);
                const end = computeLineStart(move.lineRangeMapping.modified, this._editors.modified);
                const endOffset = this._modifiedScrollTop.read(reader);
                const from = start - startOffset;
                const to = end - endOffset;
                const top = Math.min(start, end);
                const bottom = Math.max(start, end);
                return { range: new OffsetRange(top, bottom), from, to, fromWithoutScroll: start, toWithoutScroll: end, move };
            });
            lines.sort(tieBreakComparators(compareBy(l => l.fromWithoutScroll > l.toWithoutScroll, booleanComparator), compareBy(l => l.fromWithoutScroll > l.toWithoutScroll ? l.fromWithoutScroll : -l.toWithoutScroll, numberComparator)));
            const layout = LinesLayout.compute(lines.map(l => l.range));
            const padding = 10;
            const lineAreaLeft = infoOrig.verticalScrollbarWidth;
            const lineAreaWidth = (layout.getTrackCount() - 1) * 10 + padding * 2;
            const width = lineAreaLeft + lineAreaWidth + (infoMod.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding);
            let idx = 0;
            for (const line of lines) {
                const track = layout.getTrack(idx);
                const verticalY = lineAreaLeft + padding + track * 10;
                const arrowHeight = 15;
                const arrowWidth = 15;
                const right = width;
                const rectWidth = infoMod.glyphMarginWidth + infoMod.lineNumbersWidth;
                const rectHeight = 18;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.classList.add('arrow-rectangle');
                rect.setAttribute('x', `${right - rectWidth}`);
                rect.setAttribute('y', `${line.to - rectHeight / 2}`);
                rect.setAttribute('width', `${rectWidth}`);
                rect.setAttribute('height', `${rectHeight}`);
                this._element.appendChild(rect);
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${0} ${line.from} L ${verticalY} ${line.from} L ${verticalY} ${line.to} L ${right - arrowWidth} ${line.to}`);
                path.setAttribute('fill', 'none');
                g.appendChild(path);
                const arrowRight = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrowRight.classList.add('arrow');
                reader.store.add(autorun(reader => {
                    path.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                    arrowRight.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                }));
                arrowRight.setAttribute('points', `${right - arrowWidth},${line.to - arrowHeight / 2} ${right},${line.to} ${right - arrowWidth},${line.to + arrowHeight / 2}`);
                g.appendChild(arrowRight);
                this._element.appendChild(g);
                /*
                TODO@hediet
                path.addEventListener('mouseenter', () => {
                    model.setHoveredMovedText(line.move);
                });
                path.addEventListener('mouseleave', () => {
                    model.setHoveredMovedText(undefined);
                });*/
                idx++;
            }
            this.width.set(lineAreaWidth, undefined);
        });
        this._element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._element.setAttribute('class', 'moved-blocks-lines');
        this._rootElement.appendChild(this._element);
        this._register(toDisposable(() => this._element.remove()));
        this._register(autorun(reader => {
            /** @description update moved blocks lines positioning */
            const info = this._originalEditorLayoutInfo.read(reader);
            const info2 = this._modifiedEditorLayoutInfo.read(reader);
            if (!info || !info2) {
                return;
            }
            this._element.style.left = `${info.width - info.verticalScrollbarWidth}px`;
            this._element.style.height = `${info.height}px`;
            this._element.style.width = `${info.verticalScrollbarWidth + info.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding + this.width.read(reader)}px`;
        }));
        this._register(recomputeInitiallyAndOnChange(this._state));
        const movedBlockViewZones = derived(reader => {
            const model = this._diffModel.read(reader);
            const d = model?.diff.read(reader);
            if (!d) {
                return [];
            }
            return d.movedTexts.map(move => ({
                move,
                original: new PlaceholderViewZone(constObservable(move.lineRangeMapping.original.startLineNumber - 1), 18),
                modified: new PlaceholderViewZone(constObservable(move.lineRangeMapping.modified.startLineNumber - 1), 18),
            }));
        });
        this._register(applyViewZones(this._editors.original, movedBlockViewZones.map(zones => /** @description movedBlockViewZones.original */ zones.map(z => z.original))));
        this._register(applyViewZones(this._editors.modified, movedBlockViewZones.map(zones => /** @description movedBlockViewZones.modified */ zones.map(z => z.modified))));
        this._register(autorunWithStore((reader, store) => {
            const blocks = movedBlockViewZones.read(reader);
            for (const b of blocks) {
                store.add(new MovedBlockOverlayWidget(this._editors.original, b.original, b.move, 'original', this._diffModel.get()));
                store.add(new MovedBlockOverlayWidget(this._editors.modified, b.modified, b.move, 'modified', this._diffModel.get()));
            }
        }));
        const originalHasFocus = observableSignalFromEvent('original.onDidFocusEditorWidget', e => this._editors.original.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        const modifiedHasFocus = observableSignalFromEvent('modified.onDidFocusEditorWidget', e => this._editors.modified.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        let lastChangedEditor = 'modified';
        this._register(autorunHandleChanges({
            changeTracker: {
                createChangeSummary: () => undefined,
                handleChange: (ctx, summary) => {
                    if (ctx.didChange(originalHasFocus)) {
                        lastChangedEditor = 'original';
                    }
                    if (ctx.didChange(modifiedHasFocus)) {
                        lastChangedEditor = 'modified';
                    }
                    return true;
                }
            }
        }, reader => {
            /** @description MovedBlocksLines.setActiveMovedTextFromCursor */
            originalHasFocus.read(reader);
            modifiedHasFocus.read(reader);
            const m = this._diffModel.read(reader);
            if (!m) {
                return;
            }
            const diff = m.diff.read(reader);
            let movedText = undefined;
            if (diff && lastChangedEditor === 'original') {
                const originalPos = this._editors.originalCursor.read(reader);
                if (originalPos) {
                    movedText = diff.movedTexts.find(m => m.lineRangeMapping.original.contains(originalPos.lineNumber));
                }
            }
            if (diff && lastChangedEditor === 'modified') {
                const modifiedPos = this._editors.modifiedCursor.read(reader);
                if (modifiedPos) {
                    movedText = diff.movedTexts.find(m => m.lineRangeMapping.modified.contains(modifiedPos.lineNumber));
                }
            }
            if (movedText !== m.movedTextToCompare.get()) {
                m.movedTextToCompare.set(undefined, undefined);
            }
            m.setActiveMovedText(movedText);
        }));
    }
}
class LinesLayout {
    static compute(lines) {
        const setsPerTrack = [];
        const trackPerLineIdx = [];
        for (const line of lines) {
            let trackIdx = setsPerTrack.findIndex(set => !set.intersectsStrict(line));
            if (trackIdx === -1) {
                const maxTrackCount = 6;
                if (setsPerTrack.length >= maxTrackCount) {
                    trackIdx = findMaxIdx(setsPerTrack, compareBy(set => set.intersectWithRangeLength(line), numberComparator));
                }
                else {
                    trackIdx = setsPerTrack.length;
                    setsPerTrack.push(new OffsetRangeSet());
                }
            }
            setsPerTrack[trackIdx].addRange(line);
            trackPerLineIdx.push(trackIdx);
        }
        return new LinesLayout(setsPerTrack.length, trackPerLineIdx);
    }
    constructor(_trackCount, trackPerLineIdx) {
        this._trackCount = _trackCount;
        this.trackPerLineIdx = trackPerLineIdx;
    }
    getTrack(lineIdx) {
        return this.trackPerLineIdx[lineIdx];
    }
    getTrackCount() {
        return this._trackCount;
    }
}
class MovedBlockOverlayWidget extends ViewZoneOverlayWidget {
    constructor(_editor, _viewZone, _move, _kind, _diffModel) {
        const root = h('div.diff-hidden-lines-widget');
        super(_editor, _viewZone, root.root);
        this._editor = _editor;
        this._move = _move;
        this._kind = _kind;
        this._diffModel = _diffModel;
        this._nodes = h('div.diff-moved-code-block', { style: { marginRight: '4px' } }, [
            h('div.text-content@textContent'),
            h('div.action-bar@actionBar'),
        ]);
        root.root.appendChild(this._nodes.root);
        const editorLayout = observableFromEvent(this._editor.onDidLayoutChange, () => this._editor.getLayoutInfo());
        this._register(applyStyle(this._nodes.root, {
            paddingRight: editorLayout.map(l => l.verticalScrollbarWidth)
        }));
        let text;
        if (_move.changes.length > 0) {
            text = this._kind === 'original' ? localize('codeMovedToWithChanges', 'Code moved with changes to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1) : localize('codeMovedFromWithChanges', 'Code moved with changes from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        else {
            text = this._kind === 'original' ? localize('codeMovedTo', 'Code moved to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1) : localize('codeMovedFrom', 'Code moved from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        const actionBar = this._register(new ActionBar(this._nodes.actionBar, {
            highlightToggledItems: true,
        }));
        const caption = new Action('', text, '', false);
        actionBar.push(caption, { icon: false, label: true });
        const actionCompare = new Action('', 'Compare', ThemeIcon.asClassName(Codicon.compareChanges), true, () => {
            this._editor.focus();
            this._diffModel.movedTextToCompare.set(this._diffModel.movedTextToCompare.get() === _move ? undefined : this._move, undefined);
        });
        this._register(autorun(reader => {
            const isActive = this._diffModel.movedTextToCompare.read(reader) === _move;
            actionCompare.checked = isActive;
        }));
        actionBar.push(actionCompare, { icon: false, label: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZWRCbG9ja3NMaW5lc0ZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2ZlYXR1cmVzL21vdmVkQmxvY2tzTGluZXNGZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUFlLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xQLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUdyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFD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