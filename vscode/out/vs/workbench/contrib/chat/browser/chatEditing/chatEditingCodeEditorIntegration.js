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
var ChatEditingCodeEditorIntegration_1, DiffHunkWidget_1;
import '../media/chatEditorController.css';
import { getTotalWidth } from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, observableFromEvent, observableValue } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { observableCodeEditor } from '../../../../../editor/browser/observableCodeEditor.js';
import { AccessibleDiffViewer } from '../../../../../editor/browser/widget/diffEditor/components/accessibleDiffViewer.js';
import { RenderOptions, LineSource, renderLines } from '../../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { diffAddDecoration, diffWholeLineAddDecoration, diffDeleteDecoration } from '../../../../../editor/browser/widget/diffEditor/registrations.contribution.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isDiffEditorInput } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { overviewRulerModifiedForeground, minimapGutterModifiedBackground, overviewRulerAddedForeground, minimapGutterAddedBackground, overviewRulerDeletedForeground, minimapGutterDeletedBackground } from '../../../scm/common/quickDiff.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { isTextDiffEditorForEntry } from './chatEditing.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { InlineDecoration } from '../../../../../editor/common/viewModel/inlineDecorations.js';
let ChatEditingCodeEditorIntegration = class ChatEditingCodeEditorIntegration {
    static { ChatEditingCodeEditorIntegration_1 = this; }
    static { this._diffLineDecorationData = ModelDecorationOptions.register({ description: 'diff-line-decoration' }); }
    constructor(_entry, _editor, documentDiffInfo, renderDiffImmediately, _chatAgentService, _editorService, _accessibilitySignalsService, instantiationService) {
        this._entry = _entry;
        this._editor = _editor;
        this._chatAgentService = _chatAgentService;
        this._editorService = _editorService;
        this._accessibilitySignalsService = _accessibilitySignalsService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store = new DisposableStore();
        this._diffHunksRenderStore = this._store.add(new DisposableStore());
        this._diffHunkWidgets = [];
        this._viewZones = [];
        this._accessibleDiffViewVisible = observableValue(this, false);
        this._diffLineDecorations = _editor.createDecorationsCollection();
        const codeEditorObs = observableCodeEditor(_editor);
        this._diffLineDecorations = this._editor.createDecorationsCollection(); // tracks the line range w/o visuals (used for navigate)
        this._diffVisualDecorations = this._editor.createDecorationsCollection(); // tracks the real diff with character level inserts
        const enabledObs = derived(r => {
            if (!isEqual(codeEditorObs.model.read(r)?.uri, documentDiffInfo.read(r).modifiedModel.uri)) {
                return false;
            }
            if (this._editor.getOption(70 /* EditorOption.inDiffEditor */) && !instantiationService.invokeFunction(isTextDiffEditorForEntry, _entry, this._editor)) {
                return false;
            }
            return true;
        });
        // update decorations
        this._store.add(autorun(r => {
            if (!enabledObs.read(r)) {
                this._diffLineDecorations.clear();
                return;
            }
            const data = [];
            const diff = documentDiffInfo.read(r);
            for (const diffEntry of diff.changes) {
                data.push({
                    range: diffEntry.modified.toInclusiveRange() ?? new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                    options: ChatEditingCodeEditorIntegration_1._diffLineDecorationData
                });
            }
            this._diffLineDecorations.set(data);
        }));
        // INIT current index when: enabled, not streaming anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun(r => {
            if (enabledObs.read(r)
                && !_entry.isCurrentlyBeingModifiedBy.read(r)
                && lastModifyingRequestId !== _entry.lastModifyingRequestId
                && !documentDiffInfo.read(r).identical) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                const position = _editor.getPosition() ?? new Position(1, 1);
                const ranges = this._diffLineDecorations.getRanges();
                let initialIndex = ranges.findIndex(r => r.containsPosition(position));
                if (initialIndex < 0) {
                    initialIndex = 0;
                    for (; initialIndex < ranges.length - 1; initialIndex++) {
                        const range = ranges[initialIndex];
                        if (range.endLineNumber >= position.lineNumber) {
                            break;
                        }
                    }
                }
                this._currentIndex.set(initialIndex, undefined);
                _editor.revealRange(ranges[initialIndex]);
            }
        }));
        // render diff decorations
        this._store.add(autorun(r => {
            if (!enabledObs.read(r)) {
                this._clearDiffRendering();
                return;
            }
            // done: render diff
            if (!_entry.isCurrentlyBeingModifiedBy.read(r) || renderDiffImmediately) {
                const isDiffEditor = this._editor.getOption(70 /* EditorOption.inDiffEditor */);
                codeEditorObs.getOption(59 /* EditorOption.fontInfo */).read(r);
                codeEditorObs.getOption(75 /* EditorOption.lineHeight */).read(r);
                const reviewMode = _entry.reviewMode.read(r);
                const diff = documentDiffInfo.read(r);
                this._updateDiffRendering(diff, reviewMode, isDiffEditor);
            }
        }));
        // accessibility: signals while cursor changes
        this._store.add(autorun(r => {
            const position = codeEditorObs.positions.read(r)?.at(0);
            if (!position || !enabledObs.read(r)) {
                return;
            }
            const diff = documentDiffInfo.read(r);
            const mapping = diff.changes.find(m => m.modified.contains(position.lineNumber) || m.modified.isEmpty && m.modified.startLineNumber === position.lineNumber);
            if (mapping?.modified.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineDeleted, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
            else if (mapping?.original.isEmpty) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineInserted, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
            else if (mapping) {
                this._accessibilitySignalsService.playSignal(AccessibilitySignal.diffLineModified, { source: 'chatEditingEditor.cursorPositionChanged' });
            }
        }));
        // accessibility: diff view
        this._store.add(autorun(r => {
            const visible = this._accessibleDiffViewVisible.read(r);
            if (!visible || !enabledObs.read(r)) {
                return;
            }
            const accessibleDiffWidget = new AccessibleDiffViewContainer();
            _editor.addOverlayWidget(accessibleDiffWidget);
            r.store.add(toDisposable(() => _editor.removeOverlayWidget(accessibleDiffWidget)));
            r.store.add(instantiationService.createInstance(AccessibleDiffViewer, accessibleDiffWidget.getDomNode(), enabledObs, (visible, tx) => this._accessibleDiffViewVisible.set(visible, tx), constObservable(true), codeEditorObs.layoutInfo.map((v, r) => v.width), codeEditorObs.layoutInfo.map((v, r) => v.height), documentDiffInfo.map(diff => diff.changes.slice()), instantiationService.createInstance(AccessibleDiffViewerModel, documentDiffInfo, _editor)));
        }));
        // ---- readonly while streaming
        let actualOptions;
        const restoreActualOptions = () => {
            if (actualOptions !== undefined) {
                this._editor.updateOptions(actualOptions);
                actualOptions = undefined;
            }
        };
        this._store.add(toDisposable(restoreActualOptions));
        const renderAsBeingModified = derived(this, r => {
            return enabledObs.read(r) && Boolean(_entry.isCurrentlyBeingModifiedBy.read(r));
        });
        this._store.add(autorun(r => {
            const value = renderAsBeingModified.read(r);
            if (value) {
                actualOptions ??= {
                    readOnly: this._editor.getOption(103 /* EditorOption.readOnly */),
                    stickyScroll: this._editor.getOption(130 /* EditorOption.stickyScroll */),
                    codeLens: this._editor.getOption(23 /* EditorOption.codeLens */),
                    guides: this._editor.getOption(22 /* EditorOption.guides */)
                };
                this._editor.updateOptions({
                    readOnly: true,
                    stickyScroll: { enabled: false },
                    codeLens: false,
                    guides: { indentation: false, bracketPairs: false }
                });
            }
            else {
                restoreActualOptions();
            }
        }));
    }
    dispose() {
        this._clear();
        this._store.dispose();
    }
    _clear() {
        this._diffLineDecorations.clear();
        this._clearDiffRendering();
        this._currentIndex.set(-1, undefined);
    }
    // ---- diff rendering logic
    _clearDiffRendering() {
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
        });
        this._viewZones = [];
        this._diffHunksRenderStore.clear();
        this._diffVisualDecorations.clear();
    }
    _updateDiffRendering(diff, reviewMode, diffMode) {
        const chatDiffAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        });
        const chatDiffWholeLineAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffWholeLineAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const createOverviewDecoration = (overviewRulerColor, minimapColor) => {
            return ModelDecorationOptions.createDynamic({
                description: 'chat-editing-decoration',
                overviewRuler: { color: themeColorFromId(overviewRulerColor), position: OverviewRulerLane.Left },
                minimap: { color: themeColorFromId(minimapColor), position: 2 /* MinimapPosition.Gutter */ },
            });
        };
        const modifiedDecoration = createOverviewDecoration(overviewRulerModifiedForeground, minimapGutterModifiedBackground);
        const addedDecoration = createOverviewDecoration(overviewRulerAddedForeground, minimapGutterAddedBackground);
        const deletedDecoration = createOverviewDecoration(overviewRulerDeletedForeground, minimapGutterDeletedBackground);
        this._diffHunksRenderStore.clear();
        this._diffHunkWidgets.length = 0;
        const diffHunkDecorations = [];
        this._editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
            this._viewZones = [];
            const modifiedVisualDecorations = [];
            const mightContainNonBasicASCII = diff.originalModel.mightContainNonBasicASCII();
            const mightContainRTL = diff.originalModel.mightContainRTL();
            const renderOptions = RenderOptions.fromEditor(this._editor);
            const editorLineCount = this._editor.getModel()?.getLineCount();
            for (const diffEntry of diff.changes) {
                const originalRange = diffEntry.original;
                diff.originalModel.tokenization.forceTokenization(Math.max(1, originalRange.endLineNumberExclusive - 1));
                const source = new LineSource(originalRange.mapToLineArray(l => diff.originalModel.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                const decorations = [];
                if (reviewMode) {
                    for (const i of diffEntry.innerChanges || []) {
                        decorations.push(new InlineDecoration(i.originalRange.delta(-(diffEntry.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        // If the original range is empty, the start line number is 1 and the new range spans the entire file, don't draw an Added decoration
                        if (!(i.originalRange.isEmpty() && i.originalRange.startLineNumber === 1 && i.modifiedRange.endLineNumber === editorLineCount) && !i.modifiedRange.isEmpty()) {
                            modifiedVisualDecorations.push({
                                range: i.modifiedRange, options: chatDiffAddDecoration
                            });
                        }
                    }
                }
                // Render an added decoration but don't also render a deleted decoration for newly inserted content at the start of the file
                // Note, this is a workaround for the `LineRange.isEmpty()` in diffEntry.original being `false` for newly inserted content
                const isCreatedContent = decorations.length === 1 && decorations[0].range.isEmpty() && diffEntry.original.startLineNumber === 1;
                if (!diffEntry.modified.isEmpty) {
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: chatDiffWholeLineAddDecoration
                    });
                }
                if (diffEntry.original.isEmpty) {
                    // insertion
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: addedDecoration
                    });
                }
                else if (diffEntry.modified.isEmpty) {
                    // deletion
                    modifiedVisualDecorations.push({
                        range: new Range(diffEntry.modified.startLineNumber - 1, 1, diffEntry.modified.startLineNumber, 1),
                        options: deletedDecoration
                    });
                }
                else {
                    // modification
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: modifiedDecoration
                    });
                }
                let extraLines = 0;
                if (reviewMode && !diffMode) {
                    const domNode = document.createElement('div');
                    domNode.className = 'chat-editing-original-zone view-lines line-delete monaco-mouse-cursor-text';
                    const result = renderLines(source, renderOptions, decorations, domNode);
                    extraLines = result.heightInLines;
                    if (!isCreatedContent) {
                        const viewZoneData = {
                            afterLineNumber: diffEntry.modified.startLineNumber - 1,
                            heightInLines: result.heightInLines,
                            domNode,
                            ordinal: 50000 + 2 // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                        };
                        this._viewZones.push(viewZoneChangeAccessor.addZone(viewZoneData));
                    }
                }
                if (reviewMode || diffMode) {
                    // Add content widget for each diff change
                    const widget = this._editor.invokeWithinContext(accessor => {
                        const instaService = accessor.get(IInstantiationService);
                        return instaService.createInstance(DiffHunkWidget, diff, diffEntry, this._editor.getModel().getVersionId(), this._editor, isCreatedContent ? 0 : extraLines);
                    });
                    widget.layout(diffEntry.modified.startLineNumber);
                    this._diffHunkWidgets.push(widget);
                    diffHunkDecorations.push({
                        range: diffEntry.modified.toInclusiveRange() ?? new Range(diffEntry.modified.startLineNumber, 1, diffEntry.modified.startLineNumber, Number.MAX_SAFE_INTEGER),
                        options: {
                            description: 'diff-hunk-widget',
                            stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */
                        }
                    });
                }
            }
            this._diffVisualDecorations.set(!diffMode ? modifiedVisualDecorations : []);
        });
        const diffHunkDecoCollection = this._editor.createDecorationsCollection(diffHunkDecorations);
        this._diffHunksRenderStore.add(toDisposable(() => {
            dispose(this._diffHunkWidgets);
            this._diffHunkWidgets.length = 0;
            diffHunkDecoCollection.clear();
        }));
        const positionObs = observableFromEvent(this._editor.onDidChangeCursorPosition, _ => this._editor.getPosition());
        const activeWidgetIdx = derived(r => {
            const position = positionObs.read(r);
            if (!position) {
                return -1;
            }
            const idx = diffHunkDecoCollection.getRanges().findIndex(r => r.containsPosition(position));
            return idx;
        });
        const toggleWidget = (activeWidget) => {
            const positionIdx = activeWidgetIdx.get();
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                widget.toggle(widget === activeWidget || i === positionIdx);
            }
        };
        this._diffHunksRenderStore.add(autorun(r => {
            // reveal when cursor inside
            const idx = activeWidgetIdx.read(r);
            const widget = this._diffHunkWidgets[idx];
            toggleWidget(widget);
        }));
        this._diffHunksRenderStore.add(this._editor.onMouseMove(e => {
            // reveal when hovering over
            if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
                const id = e.target.detail;
                const widget = this._diffHunkWidgets.find(w => w.getId() === id);
                toggleWidget(widget);
            }
            else if (e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
                const zone = e.target.detail;
                const idx = this._viewZones.findIndex(id => id === zone.viewZoneId);
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else if (e.target.position) {
                const { position } = e.target;
                const idx = diffHunkDecoCollection.getRanges().findIndex(r => r.containsPosition(position));
                toggleWidget(this._diffHunkWidgets[idx]);
            }
            else {
                toggleWidget(undefined);
            }
        }));
        this._diffHunksRenderStore.add(Event.any(this._editor.onDidScrollChange, this._editor.onDidLayoutChange)(() => {
            for (let i = 0; i < this._diffHunkWidgets.length; i++) {
                const widget = this._diffHunkWidgets[i];
                const range = diffHunkDecoCollection.getRange(i);
                if (range) {
                    widget.layout(range?.startLineNumber);
                }
                else {
                    widget.dispose();
                }
            }
        }));
    }
    enableAccessibleDiffView() {
        this._accessibleDiffViewVisible.set(true, undefined);
    }
    // ---- navigation logic
    reveal(firstOrLast, preserveFocus) {
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        const index = firstOrLast ? 0 : decorations.length - 1;
        const range = decorations.at(index);
        if (range) {
            this._editor.setPosition(range.getStartPosition());
            this._editor.revealRange(range);
            if (!preserveFocus) {
                this._editor.focus();
            }
            this._currentIndex.set(index, undefined);
        }
    }
    next(wrap) {
        return this._reveal(true, !wrap);
    }
    previous(wrap) {
        return this._reveal(false, !wrap);
    }
    _reveal(next, strict) {
        const position = this._editor.getPosition();
        if (!position) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        const decorations = this._diffLineDecorations
            .getRanges()
            .sort((a, b) => Range.compareRangesUsingStarts(a, b));
        if (decorations.length === 0) {
            this._currentIndex.set(-1, undefined);
            return false;
        }
        let newIndex = -1;
        for (let i = 0; i < decorations.length; i++) {
            const range = decorations[i];
            if (range.containsPosition(position)) {
                newIndex = i + (next ? 1 : -1);
                break;
            }
            else if (Position.isBefore(position, range.getStartPosition())) {
                newIndex = next ? i : i - 1;
                break;
            }
        }
        if (strict && (newIndex < 0 || newIndex >= decorations.length)) {
            // NO change
            return false;
        }
        newIndex = (newIndex + decorations.length) % decorations.length;
        this._currentIndex.set(newIndex, undefined);
        const targetRange = decorations[newIndex];
        const targetPosition = next ? targetRange.getStartPosition() : targetRange.getEndPosition();
        this._editor.setPosition(targetPosition);
        this._editor.revealPositionInCenter(targetRange.getStartPosition().delta(-1));
        this._editor.focus();
        return true;
    }
    // --- hunks
    _findClosestWidget() {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const lineRelativeTop = this._editor.getTopForLineNumber(this._editor.getPosition().lineNumber) - this._editor.getScrollTop();
        let closestWidget;
        let closestDistance = Number.MAX_VALUE;
        for (const widget of this._diffHunkWidgets) {
            const widgetTop = widget.getPosition()?.preference?.top;
            if (widgetTop !== undefined) {
                const distance = Math.abs(widgetTop - lineRelativeTop);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestWidget = widget;
                }
            }
        }
        return closestWidget;
    }
    async rejectNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            await closestWidget.reject();
            this.next(true);
        }
    }
    async acceptNearestChange(closestWidget) {
        closestWidget = closestWidget ?? this._findClosestWidget();
        if (closestWidget instanceof DiffHunkWidget) {
            await closestWidget.accept();
            this.next(true);
        }
    }
    async toggleDiff(widget, show) {
        if (!this._editor.hasModel()) {
            return;
        }
        let selection = this._editor.getSelection();
        if (widget instanceof DiffHunkWidget) {
            const lineNumber = widget.getStartLineNumber();
            const position = lineNumber ? new Position(lineNumber, 1) : undefined;
            if (position && !selection.containsPosition(position)) {
                selection = Selection.fromPositions(position);
            }
        }
        const isDiffEditor = this._editor.getOption(70 /* EditorOption.inDiffEditor */);
        // Use the 'show' argument to control the diff state if provided
        if (show !== undefined ? show : !isDiffEditor) {
            // Open DIFF editor
            const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)?.fullName;
            const diffEditor = await this._editorService.openEditor({
                original: { resource: this._entry.originalURI },
                modified: { resource: this._entry.modifiedURI },
                options: { selection },
                label: defaultAgentName
                    ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                    : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI))
            });
            if (diffEditor && diffEditor.input) {
                diffEditor.getControl()?.setSelection(selection);
                const d = autorun(r => {
                    const state = this._entry.state.read(r);
                    if (state === 1 /* ModifiedFileEntryState.Accepted */ || state === 2 /* ModifiedFileEntryState.Rejected */) {
                        d.dispose();
                        const editorIdents = [];
                        for (const candidate of this._editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                            if (isDiffEditorInput(candidate.editor)
                                && isEqual(candidate.editor.original.resource, this._entry.originalURI)
                                && isEqual(candidate.editor.modified.resource, this._entry.modifiedURI)) {
                                editorIdents.push(candidate);
                            }
                        }
                        this._editorService.closeEditors(editorIdents);
                    }
                });
            }
        }
        else {
            // Open normal editor
            await this._editorService.openEditor({
                resource: this._entry.modifiedURI,
                options: {
                    selection,
                    selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */
                }
            });
        }
    }
};
ChatEditingCodeEditorIntegration = ChatEditingCodeEditorIntegration_1 = __decorate([
    __param(4, IChatAgentService),
    __param(5, IEditorService),
    __param(6, IAccessibilitySignalService),
    __param(7, IInstantiationService)
], ChatEditingCodeEditorIntegration);
export { ChatEditingCodeEditorIntegration };
let DiffHunkWidget = class DiffHunkWidget {
    static { DiffHunkWidget_1 = this; }
    static { this._idPool = 0; }
    constructor(_diffInfo, _change, _versionId, _editor, _lineDelta, instaService) {
        this._diffInfo = _diffInfo;
        this._change = _change;
        this._versionId = _versionId;
        this._editor = _editor;
        this._lineDelta = _lineDelta;
        this._id = `diff-change-widget-${DiffHunkWidget_1._idPool++}`;
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.className = 'chat-diff-change-content-widget';
        const toolbar = instaService.createInstance(MenuWorkbenchToolBar, this._domNode, MenuId.ChatEditingEditorHunk, {
            telemetrySource: 'chatEditingEditorHunk',
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: { primaryGroup: () => true, },
            menuOptions: {
                renderShortTitle: true,
                arg: this,
            },
        });
        this._store.add(toolbar);
        this._store.add(toolbar.actionRunner.onWillRun(_ => _editor.focus()));
        this._editor.addOverlayWidget(this);
    }
    dispose() {
        this._store.dispose();
        this._editor.removeOverlayWidget(this);
    }
    getId() {
        return this._id;
    }
    layout(startLineNumber) {
        const lineHeight = this._editor.getOption(75 /* EditorOption.lineHeight */);
        const { contentLeft, contentWidth, verticalScrollbarWidth } = this._editor.getLayoutInfo();
        const scrollTop = this._editor.getScrollTop();
        this._position = {
            stackOridinal: 1,
            preference: {
                top: this._editor.getTopForLineNumber(startLineNumber) - scrollTop - (lineHeight * this._lineDelta),
                left: contentLeft + contentWidth - (2 * verticalScrollbarWidth + getTotalWidth(this._domNode))
            }
        };
        this._editor.layoutOverlayWidget(this);
        this._lastStartLineNumber = startLineNumber;
    }
    toggle(show) {
        this._domNode.classList.toggle('hover', show);
        if (this._lastStartLineNumber) {
            this.layout(this._lastStartLineNumber);
        }
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position ?? null;
    }
    getStartLineNumber() {
        return this._lastStartLineNumber;
    }
    // ---
    async reject() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return await this._diffInfo.undo(this._change);
    }
    async accept() {
        if (this._versionId !== this._editor.getModel()?.getVersionId()) {
            return false;
        }
        return this._diffInfo.keep(this._change);
    }
};
DiffHunkWidget = DiffHunkWidget_1 = __decorate([
    __param(5, IInstantiationService)
], DiffHunkWidget);
class AccessibleDiffViewContainer {
    constructor() {
        this._domNode = document.createElement('div');
        this._domNode.className = 'accessible-diff-view';
        this._domNode.style.width = '100%';
        this._domNode.style.position = 'absolute';
    }
    getId() {
        return 'chatEdits.accessibleDiffView';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: { top: 0, left: 0 },
            stackOridinal: 1
        };
    }
}
class AccessibleDiffViewerModel {
    constructor(_documentDiffInfo, _editor) {
        this._documentDiffInfo = _documentDiffInfo;
        this._editor = _editor;
    }
    getOriginalModel() {
        return this._documentDiffInfo.get().originalModel;
    }
    getOriginalOptions() {
        return this._editor.getOptions();
    }
    originalReveal(range) {
        const changes = this._documentDiffInfo.get().changes;
        const idx = changes.findIndex(value => value.original.intersect(LineRange.fromRange(range)));
        if (idx >= 0) {
            range = changes[idx].modified.toInclusiveRange() ?? range;
        }
        this.modifiedReveal(range);
    }
    getModifiedModel() {
        return this._editor.getModel();
    }
    getModifiedOptions() {
        return this._editor.getOptions();
    }
    modifiedReveal(range) {
        if (range) {
            this._editor.revealRange(range);
            this._editor.setSelection(range);
        }
        this._editor.focus();
    }
    modifiedSetSelection(range) {
        this._editor.setSelection(range);
    }
    modifiedFocus() {
        this._editor.focus();
    }
    getModifiedPosition() {
        return this._editor.getPosition() ?? undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDb2RlRWRpdG9ySW50ZWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0NvZGVFZGl0b3JJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxtQ0FBbUMsQ0FBQztBQUUzQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoSixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBOEIsTUFBTSxvRkFBb0YsQ0FBQztBQUN0SixPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsTUFBTSwrRkFBK0YsQ0FBQztBQUN2SixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUVwSyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUM7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