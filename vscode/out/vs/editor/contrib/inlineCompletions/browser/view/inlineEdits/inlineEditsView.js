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
var InlineEditsView_1;
import { equalsIfDefined, itemEquals } from '../../../../../../base/common/equals.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, derivedOpts, mapObservableArrayCached, observableValue } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
import { Range } from '../../../../../common/core/range.js';
import { TextReplacement } from '../../../../../common/core/edits/textEdit.js';
import { StringText } from '../../../../../common/core/text/abstractText.js';
import { TextLength } from '../../../../../common/core/text/textLength.js';
import { lineRangeMappingFromRangeMappings, RangeMapping } from '../../../../../common/diff/rangeMapping.js';
import { TextModel } from '../../../../../common/model/textModel.js';
import { InlineEditsGutterIndicator } from './components/gutterIndicatorView.js';
import { InlineEditsOnboardingExperience } from './inlineEditsNewUsers.js';
import { InlineCompletionViewKind, InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditsCollapsedView } from './inlineEditsViews/inlineEditsCollapsedView.js';
import { InlineEditsCustomView } from './inlineEditsViews/inlineEditsCustomView.js';
import { InlineEditsDeletionView } from './inlineEditsViews/inlineEditsDeletionView.js';
import { InlineEditsInsertionView } from './inlineEditsViews/inlineEditsInsertionView.js';
import { InlineEditsLineReplacementView } from './inlineEditsViews/inlineEditsLineReplacementView.js';
import { InlineEditsSideBySideView } from './inlineEditsViews/inlineEditsSideBySideView.js';
import { InlineEditsWordReplacementView } from './inlineEditsViews/inlineEditsWordReplacementView.js';
import { OriginalEditorInlineDiffView } from './inlineEditsViews/originalEditorInlineDiffView.js';
import { applyEditToModifiedRangeMappings, createReindentEdit } from './utils/utils.js';
import './view.css';
let InlineEditsView = InlineEditsView_1 = class InlineEditsView extends Disposable {
    constructor(_editor, _host, _model, _ghostTextIndicator, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._host = _host;
        this._model = _model;
        this._ghostTextIndicator = _ghostTextIndicator;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._editorObs = observableCodeEditor(this._editor);
        this._tabAction = derived(reader => this._model.read(reader)?.tabAction.read(reader) ?? InlineEditTabAction.Inactive);
        this._constructorDone = observableValue(this, false);
        this._uiState = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model || !this._constructorDone.read(reader)) {
                return undefined;
            }
            const inlineEdit = model.inlineEdit;
            let mappings = RangeMapping.fromEdit(inlineEdit.edit);
            let newText = inlineEdit.edit.apply(inlineEdit.originalText);
            let diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            let state = this.determineRenderState(model, reader, diff, new StringText(newText));
            if (!state) {
                model.abort(`unable to determine view: tried to render ${this._previousView?.view}`);
                return undefined;
            }
            if (state.kind === InlineCompletionViewKind.SideBySide) {
                const indentationAdjustmentEdit = createReindentEdit(newText, inlineEdit.modifiedLineRange);
                newText = indentationAdjustmentEdit.applyToString(newText);
                mappings = applyEditToModifiedRangeMappings(mappings, indentationAdjustmentEdit);
                diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            }
            this._previewTextModel.setLanguage(this._editor.getModel().getLanguageId());
            const previousNewText = this._previewTextModel.getValue();
            if (previousNewText !== newText) {
                // Only update the model if the text has changed to avoid flickering
                this._previewTextModel.setValue(newText);
            }
            if (model.showCollapsed.read(reader) && !this._indicator.read(reader)?.isHoverVisible.read(reader)) {
                state = { kind: InlineCompletionViewKind.Collapsed, viewData: state.viewData };
            }
            model.handleInlineEditShown(state.kind, state.viewData);
            return {
                state,
                diff,
                edit: inlineEdit,
                newText,
                newTextLineCount: inlineEdit.modifiedLineRange.length,
                isInDiffEditor: model.isInDiffEditor,
            };
        });
        this._previewTextModel = this._register(this._instantiationService.createInstance(TextModel, '', this._editor.getModel().getLanguageId(), { ...TextModel.DEFAULT_CREATION_OPTIONS, bracketPairColorizationOptions: { enabled: true, independentColorPoolPerBracketType: false } }, null));
        this._indicatorCyclicDependencyCircuitBreaker = observableValue(this, false);
        this._indicator = derived(this, (reader) => {
            if (!this._indicatorCyclicDependencyCircuitBreaker.read(reader)) {
                return undefined;
            }
            const indicatorDisplayRange = derivedOpts({ owner: this, equalsFn: equalsIfDefined(itemEquals()) }, reader => {
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.lineRange;
                }
                const state = this._uiState.read(reader);
                if (!state) {
                    return undefined;
                }
                if (state.state?.kind === 'custom') {
                    const range = state.state.displayLocation?.range;
                    if (!range) {
                        throw new BugIndicatingError('custom view should have a range');
                    }
                    return new LineRange(range.startLineNumber, range.endLineNumber);
                }
                if (state.state?.kind === 'insertionMultiLine') {
                    return this._insertion.originalLines.read(reader);
                }
                return state.edit.displayRange;
            });
            const modelWithGhostTextSupport = derived(this, reader => {
                const model = this._model.read(reader);
                if (model) {
                    return model;
                }
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.model;
                }
                return model;
            });
            return reader.store.add(this._instantiationService.createInstance(InlineEditsGutterIndicator, this._editorObs, indicatorDisplayRange, this._gutterIndicatorOffset, modelWithGhostTextSupport, this._inlineEditsIsHovered, this._focusIsInMenu));
        });
        this._inlineEditsIsHovered = derived(this, reader => {
            return this._sideBySide.isHovered.read(reader)
                || this._wordReplacementViews.read(reader).some(v => v.isHovered.read(reader))
                || this._deletion.isHovered.read(reader)
                || this._inlineDiffView.isHovered.read(reader)
                || this._lineReplacementView.isHovered.read(reader)
                || this._insertion.isHovered.read(reader)
                || this._customView.isHovered.read(reader);
        });
        this._gutterIndicatorOffset = derived(this, reader => {
            // TODO: have a better way to tell the gutter indicator view where the edit is inside a viewzone
            if (this._uiState.read(reader)?.state?.kind === 'insertionMultiLine') {
                return this._insertion.startLineOffset.read(reader);
            }
            const ghostTextIndicator = this._ghostTextIndicator.read(reader);
            if (ghostTextIndicator) {
                return getGhostTextTopOffset(ghostTextIndicator, this._editor);
            }
            return 0;
        });
        this._sideBySide = this._register(this._instantiationService.createInstance(InlineEditsSideBySideView, this._editor, this._model.map(m => m?.inlineEdit), this._previewTextModel, this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.SideBySide ? ({
            newTextLineCount: s.newTextLineCount,
            isInDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._deletion = this._register(this._instantiationService.createInstance(InlineEditsDeletionView, this._editor, this._model.map(m => m?.inlineEdit), this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.Deletion ? ({
            originalRange: s.state.originalRange,
            deletions: s.state.deletions,
            inDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._insertion = this._register(this._instantiationService.createInstance(InlineEditsInsertionView, this._editor, this._uiState.map(s => s && s.state?.kind === InlineCompletionViewKind.InsertionMultiLine ? ({
            lineNumber: s.state.lineNumber,
            startColumn: s.state.column,
            text: s.state.text,
            inDiffEditor: s.isInDiffEditor,
        }) : undefined), this._tabAction));
        this._inlineDiffViewState = derived(this, reader => {
            const e = this._uiState.read(reader);
            if (!e || !e.state) {
                return undefined;
            }
            if (e.state.kind === 'wordReplacements' || e.state.kind === 'insertionMultiLine' || e.state.kind === 'collapsed' || e.state.kind === 'custom') {
                return undefined;
            }
            return {
                modifiedText: new StringText(e.newText),
                diff: e.diff,
                mode: e.state.kind,
                modifiedCodeEditor: this._sideBySide.previewEditor,
                isInDiffEditor: e.isInDiffEditor,
            };
        });
        this._inlineCollapsedView = this._register(this._instantiationService.createInstance(InlineEditsCollapsedView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === 'collapsed' ? m?.inlineEdit : undefined)));
        this._customView = this._register(this._instantiationService.createInstance(InlineEditsCustomView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === 'custom' ? m?.displayLocation : undefined), this._tabAction));
        this._inlineDiffView = this._register(new OriginalEditorInlineDiffView(this._editor, this._inlineDiffViewState, this._previewTextModel));
        this._wordReplacementViews = mapObservableArrayCached(this, this._uiState.map(s => s?.state?.kind === 'wordReplacements' ? s.state.replacements : []), (e, store) => {
            return store.add(this._instantiationService.createInstance(InlineEditsWordReplacementView, this._editorObs, e, this._tabAction));
        });
        this._lineReplacementView = this._register(this._instantiationService.createInstance(InlineEditsLineReplacementView, this._editorObs, this._uiState.map(s => s?.state?.kind === InlineCompletionViewKind.LineReplacement ? ({
            originalRange: s.state.originalRange,
            modifiedRange: s.state.modifiedRange,
            modifiedLines: s.state.modifiedLines,
            replacements: s.state.replacements,
        }) : undefined), this._uiState.map(s => s?.isInDiffEditor ?? false), this._tabAction));
        this._useCodeShifting = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.allowCodeShifting);
        this._renderSideBySide = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.renderSideBySide);
        this._register(autorunWithStore((reader, store) => {
            const model = this._model.read(reader);
            if (!model) {
                return;
            }
            store.add(Event.any(this._sideBySide.onDidClick, this._deletion.onDidClick, this._lineReplacementView.onDidClick, this._insertion.onDidClick, ...this._wordReplacementViews.read(reader).map(w => w.onDidClick), this._inlineDiffView.onDidClick, this._customView.onDidClick)(e => {
                if (this._viewHasBeenShownLongerThan(350)) {
                    e.preventDefault();
                    model.accept();
                }
            }));
        }));
        this._indicator.recomputeInitiallyAndOnChange(this._store);
        this._wordReplacementViews.recomputeInitiallyAndOnChange(this._store);
        this._indicatorCyclicDependencyCircuitBreaker.set(true, undefined);
        this._register(this._instantiationService.createInstance(InlineEditsOnboardingExperience, this._host, this._model, this._indicator, this._inlineCollapsedView));
        this._constructorDone.set(true, undefined); // TODO: remove and use correct initialization order
    }
    getCacheId(model) {
        return model.inlineEdit.inlineCompletion.identity.id;
    }
    determineView(model, reader, diff, newText) {
        // Check if we can use the previous view if it is the same InlineCompletion as previously shown
        const inlineEdit = model.inlineEdit;
        const canUseCache = this._previousView?.id === this.getCacheId(model);
        const reconsiderViewEditorWidthChange = this._previousView?.editorWidth !== this._editorObs.layoutInfoWidth.read(reader) &&
            (this._previousView?.view === InlineCompletionViewKind.SideBySide ||
                this._previousView?.view === InlineCompletionViewKind.LineReplacement);
        if (canUseCache && !reconsiderViewEditorWidthChange) {
            return this._previousView.view;
        }
        if (model.displayLocation) {
            return InlineCompletionViewKind.Custom;
        }
        // Determine the view based on the edit / diff
        const numOriginalLines = inlineEdit.originalLineRange.length;
        const numModifiedLines = inlineEdit.modifiedLineRange.length;
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        const isSingleInnerEdit = inner.length === 1;
        if (!model.isInDiffEditor) {
            if (isSingleInnerEdit
                && this._useCodeShifting.read(reader) !== 'never'
                && isSingleLineInsertion(diff)) {
                if (isSingleLineInsertionAfterPosition(diff, inlineEdit.cursorPosition)) {
                    return InlineCompletionViewKind.InsertionInline;
                }
                // If we have a single line insertion before the cursor position, we do not want to move the cursor by inserting
                // the suggestion inline. Use a line replacement view instead. Do not use word replacement view.
                return InlineCompletionViewKind.LineReplacement;
            }
            if (isDeletion(inner, inlineEdit, newText)) {
                return InlineCompletionViewKind.Deletion;
            }
            if (isSingleMultiLineInsertion(diff) && this._useCodeShifting.read(reader) === 'always') {
                return InlineCompletionViewKind.InsertionMultiLine;
            }
            const allInnerChangesNotTooLong = inner.every(m => TextLength.ofRange(m.originalRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH && TextLength.ofRange(m.modifiedRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH);
            if (allInnerChangesNotTooLong && isSingleInnerEdit && numOriginalLines === 1 && numModifiedLines === 1) {
                // Make sure there is no insertion, even if we grow them
                if (!inner.some(m => m.originalRange.isEmpty()) ||
                    !growEditsUntilWhitespace(inner.map(m => new TextReplacement(m.originalRange, '')), inlineEdit.originalText).some(e => e.range.isEmpty() && TextLength.ofRange(e.range).columnCount < InlineEditsWordReplacementView.MAX_LENGTH)) {
                    return InlineCompletionViewKind.WordReplacements;
                }
            }
        }
        if (numOriginalLines > 0 && numModifiedLines > 0) {
            if (numOriginalLines === 1 && numModifiedLines === 1 && !model.isInDiffEditor /* prefer side by side in diff editor */) {
                return InlineCompletionViewKind.LineReplacement;
            }
            if (this._renderSideBySide.read(reader) !== 'never' && InlineEditsSideBySideView.fitsInsideViewport(this._editor, this._previewTextModel, inlineEdit, reader)) {
                return InlineCompletionViewKind.SideBySide;
            }
            return InlineCompletionViewKind.LineReplacement;
        }
        if (model.isInDiffEditor) {
            if (isDeletion(inner, inlineEdit, newText)) {
                return InlineCompletionViewKind.Deletion;
            }
            if (isSingleMultiLineInsertion(diff) && this._useCodeShifting.read(reader) === 'always') {
                return InlineCompletionViewKind.InsertionMultiLine;
            }
        }
        return InlineCompletionViewKind.SideBySide;
    }
    determineRenderState(model, reader, diff, newText) {
        const inlineEdit = model.inlineEdit;
        const view = this.determineView(model, reader, diff, newText);
        this._previousView = { id: this.getCacheId(model), view, editorWidth: this._editor.getLayoutInfo().width, timestamp: Date.now() };
        const inner = diff.flatMap(d => d.innerChanges ?? []);
        const textModel = this._editor.getModel();
        const stringChanges = inner.map(m => ({
            originalRange: m.originalRange,
            modifiedRange: m.modifiedRange,
            original: textModel.getValueInRange(m.originalRange),
            modified: newText.getValueOfRange(m.modifiedRange)
        }));
        const cursorPosition = inlineEdit.cursorPosition;
        const startsWithEOL = stringChanges[0].modified.startsWith(textModel.getEOL());
        const viewData = {
            cursorColumnDistance: inlineEdit.edit.replacements[0].range.getStartPosition().column - cursorPosition.column,
            cursorLineDistance: inlineEdit.lineEdit.lineRange.startLineNumber - cursorPosition.lineNumber + (startsWithEOL && inlineEdit.lineEdit.lineRange.startLineNumber >= cursorPosition.lineNumber ? 1 : 0),
            lineCountOriginal: inlineEdit.lineEdit.lineRange.length,
            lineCountModified: inlineEdit.lineEdit.newLines.length,
            characterCountOriginal: stringChanges.reduce((acc, r) => acc + r.original.length, 0),
            characterCountModified: stringChanges.reduce((acc, r) => acc + r.modified.length, 0),
            disjointReplacements: stringChanges.length,
            sameShapeReplacements: stringChanges.every(r => r.original === stringChanges[0].original && r.modified === stringChanges[0].modified),
        };
        switch (view) {
            case InlineCompletionViewKind.InsertionInline: return { kind: InlineCompletionViewKind.InsertionInline, viewData };
            case InlineCompletionViewKind.SideBySide: return { kind: InlineCompletionViewKind.SideBySide, viewData };
            case InlineCompletionViewKind.Collapsed: return { kind: InlineCompletionViewKind.Collapsed, viewData };
            case InlineCompletionViewKind.Custom: return { kind: InlineCompletionViewKind.Custom, displayLocation: model.displayLocation, viewData };
        }
        if (view === InlineCompletionViewKind.Deletion) {
            return {
                kind: InlineCompletionViewKind.Deletion,
                originalRange: inlineEdit.originalLineRange,
                deletions: inner.map(m => m.originalRange),
                viewData,
            };
        }
        if (view === InlineCompletionViewKind.InsertionMultiLine) {
            const change = inner[0];
            return {
                kind: InlineCompletionViewKind.InsertionMultiLine,
                lineNumber: change.originalRange.startLineNumber,
                column: change.originalRange.startColumn,
                text: newText.getValueOfRange(change.modifiedRange),
                viewData,
            };
        }
        const replacements = stringChanges.map(m => new TextReplacement(m.originalRange, m.modified));
        if (replacements.length === 0) {
            return undefined;
        }
        if (view === InlineCompletionViewKind.WordReplacements) {
            let grownEdits = growEditsToEntireWord(replacements, inlineEdit.originalText);
            if (grownEdits.some(e => e.range.isEmpty())) {
                grownEdits = growEditsUntilWhitespace(replacements, inlineEdit.originalText);
            }
            return {
                kind: InlineCompletionViewKind.WordReplacements,
                replacements: grownEdits,
                viewData,
            };
        }
        if (view === InlineCompletionViewKind.LineReplacement) {
            return {
                kind: InlineCompletionViewKind.LineReplacement,
                originalRange: inlineEdit.originalLineRange,
                modifiedRange: inlineEdit.modifiedLineRange,
                modifiedLines: inlineEdit.modifiedLineRange.mapToLineArray(line => newText.getLineAt(line)),
                replacements: inner.map(m => ({ originalRange: m.originalRange, modifiedRange: m.modifiedRange })),
                viewData,
            };
        }
        return undefined;
    }
    _viewHasBeenShownLongerThan(durationMs) {
        const viewCreationTime = this._previousView?.timestamp;
        if (!viewCreationTime) {
            throw new BugIndicatingError('viewHasBeenShownLongThan called before a view has been shown');
        }
        const currentTime = Date.now();
        return (currentTime - viewCreationTime) >= durationMs;
    }
};
InlineEditsView = InlineEditsView_1 = __decorate([
    __param(5, IInstantiationService)
], InlineEditsView);
export { InlineEditsView };
function isSingleLineInsertion(diff) {
    return diff.every(m => m.innerChanges.every(r => isWordInsertion(r)));
    function isWordInsertion(r) {
        if (!r.originalRange.isEmpty()) {
            return false;
        }
        const isInsertionWithinLine = r.modifiedRange.startLineNumber === r.modifiedRange.endLineNumber;
        if (!isInsertionWithinLine) {
            return false;
        }
        return true;
    }
}
function isSingleLineInsertionAfterPosition(diff, position) {
    if (!position) {
        return false;
    }
    if (!isSingleLineInsertion(diff)) {
        return false;
    }
    const pos = position;
    return diff.every(m => m.innerChanges.every(r => isStableWordInsertion(r)));
    function isStableWordInsertion(r) {
        const insertPosition = r.originalRange.getStartPosition();
        if (pos.isBeforeOrEqual(insertPosition)) {
            return true;
        }
        if (insertPosition.lineNumber < pos.lineNumber) {
            return true;
        }
        return false;
    }
}
function isSingleMultiLineInsertion(diff) {
    const inner = diff.flatMap(d => d.innerChanges ?? []);
    if (inner.length !== 1) {
        return false;
    }
    const change = inner[0];
    if (!change.originalRange.isEmpty()) {
        return false;
    }
    if (change.modifiedRange.startLineNumber === change.modifiedRange.endLineNumber) {
        return false;
    }
    return true;
}
function isDeletion(inner, inlineEdit, newText) {
    const innerValues = inner.map(m => ({ original: inlineEdit.originalText.getValueOfRange(m.originalRange), modified: newText.getValueOfRange(m.modifiedRange) }));
    return innerValues.every(({ original, modified }) => modified.trim() === '' && original.length > 0 && (original.length > modified.length || original.trim() !== ''));
}
function growEditsToEntireWord(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => /^[a-zA-Z]$/.test(char));
}
function growEditsUntilWhitespace(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => !(/^\s$/.test(char)));
}
function _growEdits(replacements, originalText, fn) {
    const result = [];
    replacements.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    for (const edit of replacements) {
        let startIndex = edit.range.startColumn - 1;
        let endIndex = edit.range.endColumn - 2;
        let prefix = '';
        let suffix = '';
        const startLineContent = originalText.getLineAt(edit.range.startLineNumber);
        const endLineContent = originalText.getLineAt(edit.range.endLineNumber);
        if (isIncluded(startLineContent[startIndex])) {
            // grow to the left
            while (isIncluded(startLineContent[startIndex - 1])) {
                prefix = startLineContent[startIndex - 1] + prefix;
                startIndex--;
            }
        }
        if (isIncluded(endLineContent[endIndex]) || endIndex < startIndex) {
            // grow to the right
            while (isIncluded(endLineContent[endIndex + 1])) {
                suffix += endLineContent[endIndex + 1];
                endIndex++;
            }
        }
        // create new edit and merge together if they are touching
        let newEdit = new TextReplacement(new Range(edit.range.startLineNumber, startIndex + 1, edit.range.endLineNumber, endIndex + 2), prefix + edit.text + suffix);
        if (result.length > 0 && Range.areIntersectingOrTouching(result[result.length - 1].range, newEdit.range)) {
            newEdit = TextReplacement.joinReplacements([result.pop(), newEdit], originalText);
        }
        result.push(newEdit);
    }
    function isIncluded(c) {
        if (c === undefined) {
            return false;
        }
        return fn(c);
    }
    return result;
}
function getGhostTextTopOffset(ghostTextIndicator, editor) {
    const replacements = ghostTextIndicator.model.inlineEdit.edit.replacements;
    if (replacements.length !== 1) {
        return 0;
    }
    const textModel = editor.getModel();
    if (!textModel) {
        return 0;
    }
    const EOL = textModel.getEOL();
    const replacement = replacements[0];
    if (replacement.range.isEmpty() && replacement.text.startsWith(EOL)) {
        const lineHeight = editor.getLineHeightForPosition(replacement.range.getStartPosition());
        return countPrefixRepeats(replacement.text, EOL) * lineHeight;
    }
    return 0;
}
function countPrefixRepeats(str, prefix) {
    if (!prefix.length) {
        return 0;
    }
    let count = 0;
    let i = 0;
    while (str.startsWith(prefix, i)) {
        count++;
        i += prefix.length;
    }
    return count;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQTZDLHdCQUF3QixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNMLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBd0Isb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU1RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQWdCLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQTRCLGlDQUFpQyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZJ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