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
import { mapFindFirst } from '../../../../../base/common/arraysFind.js';
import { itemsEquals } from '../../../../../base/common/equals.js';
import { BugIndicatingError, onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedHandleChanges, derivedOpts, mapObservableArrayCached, observableFromEvent, observableSignal, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction } from '../../../../../base/common/observable.js';
import { firstNonWhitespaceIndex } from '../../../../../base/common/strings.js';
import { isDefined } from '../../../../../base/common/types.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { CursorColumns } from '../../../../common/core/cursorColumns.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { TextReplacement, TextEdit } from '../../../../common/core/edits/textEdit.js';
import { TextLength } from '../../../../common/core/text/textLength.js';
import { InlineCompletionEndOfLifeReasonKind, InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { getEndPositionsAfterApplying, removeTextReplacementCommonSuffixPrefix } from '../utils.js';
import { AnimatedValue, easeOutCubic, ObservableAnimatedValue } from './animation.js';
import { computeGhostText } from './computeGhostText.js';
import { GhostText, ghostTextOrReplacementEquals, ghostTextsOrReplacementsEqual } from './ghostText.js';
import { InlineCompletionsSource } from './inlineCompletionsSource.js';
import { InlineEdit } from './inlineEdit.js';
import { InlineCompletionEditorType } from './provideInlineCompletions.js';
import { singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { EditSources } from '../../../../common/textModelEditSource.js';
import { ICodeEditorService } from '../../../../browser/services/codeEditorService.js';
import { IInlineCompletionsService } from '../../../../browser/services/inlineCompletionsService.js';
import { TypingInterval } from './typingSpeed.js';
import { StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
let InlineCompletionsModel = class InlineCompletionsModel extends Disposable {
    get isAcceptingPartially() { return this._isAcceptingPartially; }
    constructor(textModel, _selectedSuggestItem, _textModelVersionId, _positions, _debounceValue, _enabled, _editor, _instantiationService, _commandService, _languageConfigurationService, _accessibilityService, _languageFeaturesService, _codeEditorService, _inlineCompletionsService) {
        super();
        this.textModel = textModel;
        this._selectedSuggestItem = _selectedSuggestItem;
        this._textModelVersionId = _textModelVersionId;
        this._positions = _positions;
        this._debounceValue = _debounceValue;
        this._enabled = _enabled;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._languageConfigurationService = _languageConfigurationService;
        this._accessibilityService = _accessibilityService;
        this._languageFeaturesService = _languageFeaturesService;
        this._codeEditorService = _codeEditorService;
        this._inlineCompletionsService = _inlineCompletionsService;
        this._isActive = observableValue(this, false);
        this._onlyRequestInlineEditsSignal = observableSignal(this);
        this._forceUpdateExplicitlySignal = observableSignal(this);
        this._noDelaySignal = observableSignal(this);
        this._fetchSpecificProviderSignal = observableSignal(this);
        // We use a semantic id to keep the same inline completion selected even if the provider reorders the completions.
        this._selectedInlineCompletionId = observableValue(this, undefined);
        this.primaryPosition = derived(this, reader => this._positions.read(reader)[0] ?? new Position(1, 1));
        this._isAcceptingPartially = false;
        this._appearedInsideViewport = derived(this, reader => {
            const state = this.state.read(reader);
            if (!state || !state.inlineCompletion) {
                return false;
            }
            const targetRange = state.inlineCompletion.targetRange;
            const visibleRanges = this._editorObs.editor.getVisibleRanges();
            if (visibleRanges.length < 1) {
                return false;
            }
            const viewportRange = new Range(visibleRanges[0].startLineNumber, visibleRanges[0].startColumn, visibleRanges[visibleRanges.length - 1].endLineNumber, visibleRanges[visibleRanges.length - 1].endColumn);
            return viewportRange.containsRange(targetRange);
        });
        this._onDidAccept = new Emitter();
        this.onDidAccept = this._onDidAccept.event;
        this._lastShownInlineCompletionInfo = undefined;
        this._lastAcceptedInlineCompletionInfo = undefined;
        this._didUndoInlineEdits = derivedHandleChanges({
            owner: this,
            changeTracker: {
                createChangeSummary: () => ({ didUndo: false }),
                handleChange: (ctx, changeSummary) => {
                    changeSummary.didUndo = ctx.didChange(this._textModelVersionId) && !!ctx.change?.isUndoing;
                    return true;
                }
            }
        }, (reader, changeSummary) => {
            const versionId = this._textModelVersionId.read(reader);
            if (versionId !== null
                && this._lastAcceptedInlineCompletionInfo
                && this._lastAcceptedInlineCompletionInfo.textModelVersionIdAfter === versionId - 1
                && this._lastAcceptedInlineCompletionInfo.inlineCompletion.isInlineEdit
                && changeSummary.didUndo) {
                this._lastAcceptedInlineCompletionInfo = undefined;
                return true;
            }
            return false;
        });
        this._preserveCurrentCompletionReasons = new Set([
            VersionIdChangeReason.Redo,
            VersionIdChangeReason.Undo,
            VersionIdChangeReason.AcceptWord,
        ]);
        this.dontRefetchSignal = observableSignal(this);
        this._fetchInlineCompletionsPromise = derivedHandleChanges({
            owner: this,
            changeTracker: {
                createChangeSummary: () => ({
                    dontRefetch: false,
                    preserveCurrentCompletion: false,
                    inlineCompletionTriggerKind: InlineCompletionTriggerKind.Automatic,
                    onlyRequestInlineEdits: false,
                    shouldDebounce: true,
                    provider: undefined,
                    textChange: false,
                    changeReason: '',
                }),
                handleChange: (ctx, changeSummary) => {
                    /** @description fetch inline completions */
                    if (ctx.didChange(this._textModelVersionId)) {
                        if (this._preserveCurrentCompletionReasons.has(this._getReason(ctx.change))) {
                            changeSummary.preserveCurrentCompletion = true;
                        }
                        const detailedReasons = ctx.change?.detailedReasons ?? [];
                        changeSummary.changeReason = detailedReasons.length > 0 ? detailedReasons[0].getType() : '';
                        changeSummary.textChange = true;
                    }
                    else if (ctx.didChange(this._forceUpdateExplicitlySignal)) {
                        changeSummary.preserveCurrentCompletion = true;
                        changeSummary.inlineCompletionTriggerKind = InlineCompletionTriggerKind.Explicit;
                    }
                    else if (ctx.didChange(this.dontRefetchSignal)) {
                        changeSummary.dontRefetch = true;
                    }
                    else if (ctx.didChange(this._onlyRequestInlineEditsSignal)) {
                        changeSummary.onlyRequestInlineEdits = true;
                    }
                    else if (ctx.didChange(this._fetchSpecificProviderSignal)) {
                        changeSummary.provider = ctx.change;
                    }
                    return true;
                },
            },
        }, (reader, changeSummary) => {
            this._source.clearOperationOnTextModelChange.read(reader); // Make sure the clear operation runs before the fetch operation
            this._noDelaySignal.read(reader);
            this.dontRefetchSignal.read(reader);
            this._onlyRequestInlineEditsSignal.read(reader);
            this._forceUpdateExplicitlySignal.read(reader);
            this._fetchSpecificProviderSignal.read(reader);
            const shouldUpdate = ((this._enabled.read(reader) && this._selectedSuggestItem.read(reader)) || this._isActive.read(reader))
                && (!this._inlineCompletionsService.isSnoozing() || changeSummary.inlineCompletionTriggerKind === InlineCompletionTriggerKind.Explicit);
            if (!shouldUpdate) {
                this._source.cancelUpdate();
                return undefined;
            }
            this._textModelVersionId.read(reader); // Refetch on text change
            const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.get();
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestWidgetInlineCompletions && !suggestItem) {
                this._source.seedInlineCompletionsWithSuggestWidget();
            }
            if (changeSummary.dontRefetch) {
                return Promise.resolve(true);
            }
            if (this._didUndoInlineEdits.read(reader) && changeSummary.inlineCompletionTriggerKind !== InlineCompletionTriggerKind.Explicit) {
                transaction(tx => {
                    this._source.clear(tx);
                });
                return undefined;
            }
            let reason = '';
            if (changeSummary.provider) {
                reason += 'providerOnDidChange';
            }
            else if (changeSummary.inlineCompletionTriggerKind === InlineCompletionTriggerKind.Explicit) {
                reason += 'explicit';
            }
            if (changeSummary.changeReason) {
                reason += reason.length > 0 ? `:${changeSummary.changeReason}` : changeSummary.changeReason;
            }
            const typingInterval = this._typing.getTypingInterval();
            const requestInfo = {
                editorType: this.editorType,
                startTime: Date.now(),
                languageId: this.textModel.getLanguageId(),
                reason,
                typingInterval: typingInterval.averageInterval,
                typingIntervalCharacterCount: typingInterval.characterCount,
            };
            let context = {
                triggerKind: changeSummary.inlineCompletionTriggerKind,
                selectedSuggestionInfo: suggestItem?.toSelectedSuggestionInfo(),
                includeInlineCompletions: !changeSummary.onlyRequestInlineEdits,
                includeInlineEdits: this._inlineEditsEnabled.read(reader),
                requestIssuedDateTime: requestInfo.startTime,
            };
            if (context.triggerKind === InlineCompletionTriggerKind.Automatic && changeSummary.textChange) {
                if (this.textModel.getAlternativeVersionId() === this._lastShownInlineCompletionInfo?.alternateTextModelVersionId) {
                    // When undoing back to a version where an inline edit/completion was shown,
                    // we want to show an inline edit (or completion) again if it was originally an inline edit (or completion).
                    context = {
                        ...context,
                        includeInlineCompletions: !this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                        includeInlineEdits: this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                    };
                }
            }
            const itemToPreserveCandidate = this.selectedInlineCompletion.get() ?? this._inlineCompletionItems.get()?.inlineEdit;
            const itemToPreserve = changeSummary.preserveCurrentCompletion || itemToPreserveCandidate?.forwardStable
                ? itemToPreserveCandidate : undefined;
            const userJumpedToActiveCompletion = this._jumpedToId.map(jumpedTo => !!jumpedTo && jumpedTo === this._inlineCompletionItems.get()?.inlineEdit?.semanticId);
            const providers = changeSummary.provider
                ? { providers: [changeSummary.provider], label: 'single:' + changeSummary.provider.providerId?.toString() }
                : { providers: this._languageFeaturesService.inlineCompletionsProvider.all(this.textModel), label: undefined };
            const suppressedProviderGroupIds = this._suppressedInlineCompletionGroupIds.get();
            const availableProviders = providers.providers.filter(provider => !(provider.groupId && suppressedProviderGroupIds.has(provider.groupId)));
            return this._source.fetch(availableProviders, providers.label, context, itemToPreserve?.identity, changeSummary.shouldDebounce, userJumpedToActiveCompletion, !!changeSummary.provider, requestInfo);
        });
        this._inlineCompletionItems = derivedOpts({ owner: this }, reader => {
            const c = this._source.inlineCompletions.read(reader);
            if (!c) {
                return undefined;
            }
            const cursorPosition = this.primaryPosition.read(reader);
            let inlineEdit = undefined;
            const visibleCompletions = [];
            for (const completion of c.inlineCompletions) {
                if (!completion.isInlineEdit) {
                    if (completion.isVisible(this.textModel, cursorPosition)) {
                        visibleCompletions.push(completion);
                    }
                }
                else {
                    inlineEdit = completion;
                }
            }
            if (visibleCompletions.length !== 0) {
                // Don't show the inline edit if there is a visible completion
                inlineEdit = undefined;
            }
            return {
                inlineCompletions: visibleCompletions,
                inlineEdit,
            };
        });
        this._filteredInlineCompletionItems = derivedOpts({ owner: this, equalsFn: itemsEquals() }, reader => {
            const c = this._inlineCompletionItems.read(reader);
            return c?.inlineCompletions ?? [];
        });
        this.selectedInlineCompletionIndex = derived(this, (reader) => {
            const selectedInlineCompletionId = this._selectedInlineCompletionId.read(reader);
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this._selectedInlineCompletionId === undefined ? -1
                : filteredCompletions.findIndex(v => v.semanticId === selectedInlineCompletionId);
            if (idx === -1) {
                // Reset the selection so that the selection does not jump back when it appears again
                this._selectedInlineCompletionId.set(undefined, undefined);
                return 0;
            }
            return idx;
        });
        this.selectedInlineCompletion = derived(this, (reader) => {
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this.selectedInlineCompletionIndex.read(reader);
            return filteredCompletions[idx];
        });
        this.activeCommands = derivedOpts({ owner: this, equalsFn: itemsEquals() }, r => this.selectedInlineCompletion.read(r)?.source.inlineSuggestions.commands ?? []);
        this.inlineCompletionsCount = derived(this, reader => {
            if (this.lastTriggerKind.read(reader) === InlineCompletionTriggerKind.Explicit) {
                return this._filteredInlineCompletionItems.read(reader).length;
            }
            else {
                return undefined;
            }
        });
        this._hasVisiblePeekWidgets = derived(this, reader => this._editorObs.openedPeekWidgets.read(reader) > 0);
        this.state = derivedOpts({
            owner: this,
            equalsFn: (a, b) => {
                if (!a || !b) {
                    return a === b;
                }
                if (a.kind === 'ghostText' && b.kind === 'ghostText') {
                    return ghostTextsOrReplacementsEqual(a.ghostTexts, b.ghostTexts)
                        && a.inlineCompletion === b.inlineCompletion
                        && a.suggestItem === b.suggestItem;
                }
                else if (a.kind === 'inlineEdit' && b.kind === 'inlineEdit') {
                    return a.inlineEdit.equals(b.inlineEdit);
                }
                return false;
            }
        }, (reader) => {
            const model = this.textModel;
            const item = this._inlineCompletionItems.read(reader);
            const inlineEditResult = item?.inlineEdit;
            if (inlineEditResult) {
                if (this._hasVisiblePeekWidgets.read(reader)) {
                    return undefined;
                }
                let edit = inlineEditResult.getSingleTextEdit();
                edit = singleTextRemoveCommonPrefix(edit, model);
                const cursorAtInlineEdit = this.primaryPosition.map(cursorPos => LineRange.fromRangeInclusive(inlineEditResult.targetRange).addMargin(1, 1).contains(cursorPos.lineNumber));
                const commands = inlineEditResult.source.inlineSuggestions.commands;
                const inlineEdit = new InlineEdit(edit, commands ?? [], inlineEditResult);
                const edits = inlineEditResult.updatedEdit;
                const e = edits ? TextEdit.fromStringEdit(edits, new TextModelText(this.textModel)).replacements : [edit];
                return { kind: 'inlineEdit', inlineEdit, inlineCompletion: inlineEditResult, edits: e, cursorAtInlineEdit };
            }
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestItem) {
                const suggestCompletionEdit = singleTextRemoveCommonPrefix(suggestItem.getSingleTextEdit(), model);
                const augmentation = this._computeAugmentation(suggestCompletionEdit, reader);
                const isSuggestionPreviewEnabled = this._suggestPreviewEnabled.read(reader);
                if (!isSuggestionPreviewEnabled && !augmentation) {
                    return undefined;
                }
                const fullEdit = augmentation?.edit ?? suggestCompletionEdit;
                const fullEditPreviewLength = augmentation ? augmentation.edit.text.length - suggestCompletionEdit.text.length : 0;
                const mode = this._suggestPreviewMode.read(reader);
                const positions = this._positions.read(reader);
                const allPotentialEdits = [fullEdit, ...getSecondaryEdits(this.textModel, positions, fullEdit)];
                const validEditsAndGhostTexts = allPotentialEdits
                    .map((edit, idx) => ({ edit, ghostText: edit ? computeGhostText(edit, model, mode, positions[idx], fullEditPreviewLength) : undefined }))
                    .filter(({ edit, ghostText }) => edit !== undefined && ghostText !== undefined);
                const edits = validEditsAndGhostTexts.map(({ edit }) => edit);
                const ghostTexts = validEditsAndGhostTexts.map(({ ghostText }) => ghostText);
                const primaryGhostText = ghostTexts[0] ?? new GhostText(fullEdit.range.endLineNumber, []);
                return { kind: 'ghostText', edits, primaryGhostText, ghostTexts, inlineCompletion: augmentation?.completion, suggestItem };
            }
            else {
                if (!this._isActive.read(reader)) {
                    return undefined;
                }
                const inlineCompletion = this.selectedInlineCompletion.read(reader);
                if (!inlineCompletion) {
                    return undefined;
                }
                const replacement = inlineCompletion.getSingleTextEdit();
                const mode = this._inlineSuggestMode.read(reader);
                const positions = this._positions.read(reader);
                const allPotentialEdits = [replacement, ...getSecondaryEdits(this.textModel, positions, replacement)];
                const validEditsAndGhostTexts = allPotentialEdits
                    .map((edit, idx) => ({ edit, ghostText: edit ? computeGhostText(edit, model, mode, positions[idx], 0) : undefined }))
                    .filter(({ edit, ghostText }) => edit !== undefined && ghostText !== undefined);
                const edits = validEditsAndGhostTexts.map(({ edit }) => edit);
                const ghostTexts = validEditsAndGhostTexts.map(({ ghostText }) => ghostText);
                if (!ghostTexts[0]) {
                    return undefined;
                }
                return { kind: 'ghostText', edits, primaryGhostText: ghostTexts[0], ghostTexts, inlineCompletion, suggestItem: undefined };
            }
        });
        this.status = derived(this, reader => {
            if (this._source.loading.read(reader)) {
                return 'loading';
            }
            const s = this.state.read(reader);
            if (s?.kind === 'ghostText') {
                return 'ghostText';
            }
            if (s?.kind === 'inlineEdit') {
                return 'inlineEdit';
            }
            return 'noSuggestion';
        });
        this.inlineCompletionState = derived(this, reader => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'ghostText') {
                return undefined;
            }
            if (this._editorObs.inComposition.read(reader)) {
                return undefined;
            }
            return s;
        });
        this.inlineEditState = derived(this, reader => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'inlineEdit') {
                return undefined;
            }
            return s;
        });
        this.inlineEditAvailable = derived(this, reader => {
            const s = this.inlineEditState.read(reader);
            return !!s;
        });
        this.warning = derived(this, reader => {
            return this.inlineCompletionState.read(reader)?.inlineCompletion?.warning;
        });
        this.ghostTexts = derivedOpts({ owner: this, equalsFn: ghostTextsOrReplacementsEqual }, reader => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v.ghostTexts;
        });
        this.primaryGhostText = derivedOpts({ owner: this, equalsFn: ghostTextOrReplacementEquals }, reader => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v?.primaryGhostText;
        });
        this.showCollapsed = derived(this, reader => {
            const state = this.state.read(reader);
            if (!state || state.kind !== 'inlineEdit') {
                return false;
            }
            if (state.inlineCompletion.displayLocation) {
                return false;
            }
            const isCurrentModelVersion = state.inlineCompletion.updatedEditModelVersion === this._textModelVersionId.read(reader);
            return (this._inlineEditsShowCollapsedEnabled.read(reader) || !isCurrentModelVersion)
                && this._jumpedToId.read(reader) !== state.inlineCompletion.semanticId
                && !this._inAcceptFlow.read(reader);
        });
        this._tabShouldIndent = derived(this, reader => {
            if (this._inAcceptFlow.read(reader)) {
                return false;
            }
            function isMultiLine(range) {
                return range.startLineNumber !== range.endLineNumber;
            }
            function getNonIndentationRange(model, lineNumber) {
                const columnStart = model.getLineIndentColumn(lineNumber);
                const lastNonWsColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
                const columnEnd = Math.max(lastNonWsColumn, columnStart);
                return new Range(lineNumber, columnStart, lineNumber, columnEnd);
            }
            const selections = this._editorObs.selections.read(reader);
            return selections?.some(s => {
                if (s.isEmpty()) {
                    return this.textModel.getLineLength(s.startLineNumber) === 0;
                }
                else {
                    return isMultiLine(s) || s.containsRange(getNonIndentationRange(this.textModel, s.startLineNumber));
                }
            });
        });
        this.tabShouldJumpToInlineEdit = derived(this, reader => {
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return true;
            }
            if (this._inAcceptFlow.read(reader) && this._appearedInsideViewport.read(reader)) {
                return false;
            }
            return !s.cursorAtInlineEdit.read(reader);
        });
        this.tabShouldAcceptInlineEdit = derived(this, reader => {
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return false;
            }
            if (this._inAcceptFlow.read(reader) && this._appearedInsideViewport.read(reader)) {
                return true;
            }
            if (s.inlineCompletion.targetRange.startLineNumber === this._editorObs.cursorLineNumber.read(reader)) {
                return true;
            }
            if (this._jumpedToId.read(reader) === s.inlineCompletion.semanticId) {
                return true;
            }
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            return s.cursorAtInlineEdit.read(reader);
        });
        this._jumpedToId = observableValue(this, undefined);
        this._inAcceptFlow = observableValue(this, false);
        this.inAcceptFlow = this._inAcceptFlow;
        this._source = this._register(this._instantiationService.createInstance(InlineCompletionsSource, this.textModel, this._textModelVersionId, this._debounceValue, this.primaryPosition));
        this.lastTriggerKind = this._source.inlineCompletions.map(this, v => v?.request?.context.triggerKind);
        this._editorObs = observableCodeEditor(this._editor);
        this._suggestPreviewEnabled = this._editorObs.getOption(133 /* EditorOption.suggest */).map(v => v.preview);
        this._suggestPreviewMode = this._editorObs.getOption(133 /* EditorOption.suggest */).map(v => v.previewMode);
        this._inlineSuggestMode = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(v => v.mode);
        this._suppressedInlineCompletionGroupIds = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(v => new Set(v.experimental.suppressInlineSuggestions.split(',')));
        this._inlineEditsEnabled = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(v => !!v.edits.enabled);
        this._inlineEditsShowCollapsedEnabled = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.showCollapsed);
        this._triggerCommandOnProviderChange = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.experimental.triggerCommandOnProviderChange);
        this._typing = this._register(new TypingInterval(this.textModel));
        this._register(this._inlineCompletionsService.onDidChangeIsSnoozing((isSnoozing) => {
            if (isSnoozing) {
                this.stop();
            }
        }));
        { // Determine editor type
            const isNotebook = this.textModel.uri.scheme === 'vscode-notebook-cell';
            const [diffEditor] = this._codeEditorService.listDiffEditors()
                .filter(d => d.getOriginalEditor().getId() === this._editor.getId() ||
                d.getModifiedEditor().getId() === this._editor.getId());
            this.isInDiffEditor = !!diffEditor;
            this.editorType = isNotebook ? InlineCompletionEditorType.Notebook
                : this.isInDiffEditor ? InlineCompletionEditorType.DiffEditor
                    : InlineCompletionEditorType.TextEditor;
        }
        this._register(recomputeInitiallyAndOnChange(this._fetchInlineCompletionsPromise));
        this._register(autorun(reader => {
            this._editorObs.versionId.read(reader);
            this._inAcceptFlow.set(false, undefined);
        }));
        this._register(autorun(reader => {
            const jumpToReset = this.state.map((s, reader) => !s || s.kind === 'inlineEdit' && !s.cursorAtInlineEdit.read(reader)).read(reader);
            if (jumpToReset) {
                this._jumpedToId.set(undefined, undefined);
            }
        }));
        const inlineEditSemanticId = this.inlineEditState.map(s => s?.inlineCompletion.semanticId);
        this._register(autorun(reader => {
            const id = inlineEditSemanticId.read(reader);
            if (id) {
                this._editor.pushUndoStop();
                this._lastShownInlineCompletionInfo = {
                    alternateTextModelVersionId: this.textModel.getAlternativeVersionId(),
                    inlineCompletion: this.state.get().inlineCompletion,
                };
            }
        }));
        const inlineCompletionProviders = observableFromEvent(this._languageFeaturesService.inlineCompletionsProvider.onDidChange, () => this._languageFeaturesService.inlineCompletionsProvider.all(textModel));
        mapObservableArrayCached(this, inlineCompletionProviders, (provider, store) => {
            if (!provider.onDidChangeInlineCompletions) {
                return;
            }
            store.add(provider.onDidChangeInlineCompletions(() => {
                if (!this._enabled.get()) {
                    return;
                }
                // Only update the active editor
                const activeEditor = this._codeEditorService.getFocusedCodeEditor() || this._codeEditorService.getActiveCodeEditor();
                if (activeEditor !== this._editor) {
                    return;
                }
                if (this._triggerCommandOnProviderChange.get()) {
                    // TODO@hediet remove this and always do the else branch.
                    this.trigger(undefined, { onlyFetchInlineEdits: true });
                    return;
                }
                // If there is an active suggestion from a different provider, we ignore the update
                const activeState = this.state.get();
                if (activeState && (activeState.inlineCompletion || activeState.edits) && activeState.inlineCompletion?.source.provider !== provider) {
                    return;
                }
                transaction(tx => {
                    this._fetchSpecificProviderSignal.trigger(tx, provider);
                    this.trigger(tx);
                });
            }));
        }).recomputeInitiallyAndOnChange(this._store);
        this._didUndoInlineEdits.recomputeInitiallyAndOnChange(this._store);
    }
    debugGetSelectedSuggestItem() {
        return this._selectedSuggestItem;
    }
    getIndentationInfo(reader) {
        let startsWithIndentation = false;
        let startsWithIndentationLessThanTabSize = true;
        const ghostText = this?.primaryGhostText.read(reader);
        if (!!this?._selectedSuggestItem && ghostText && ghostText.parts.length > 0) {
            const { column, lines } = ghostText.parts[0];
            const firstLine = lines[0].line;
            const indentationEndColumn = this.textModel.getLineIndentColumn(ghostText.lineNumber);
            const inIndentation = column <= indentationEndColumn;
            if (inIndentation) {
                let firstNonWsIdx = firstNonWhitespaceIndex(firstLine);
                if (firstNonWsIdx === -1) {
                    firstNonWsIdx = firstLine.length - 1;
                }
                startsWithIndentation = firstNonWsIdx > 0;
                const tabSize = this.textModel.getOptions().tabSize;
                const visibleColumnIndentation = CursorColumns.visibleColumnFromColumn(firstLine, firstNonWsIdx + 1, tabSize);
                startsWithIndentationLessThanTabSize = visibleColumnIndentation < tabSize;
            }
        }
        return {
            startsWithIndentation,
            startsWithIndentationLessThanTabSize,
        };
    }
    _getReason(e) {
        if (e?.isUndoing) {
            return VersionIdChangeReason.Undo;
        }
        if (e?.isRedoing) {
            return VersionIdChangeReason.Redo;
        }
        if (this.isAcceptingPartially) {
            return VersionIdChangeReason.AcceptWord;
        }
        return VersionIdChangeReason.Other;
    }
    async trigger(tx, options) {
        subtransaction(tx, tx => {
            if (options?.onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            if (options?.noDelay) {
                this._noDelaySignal.trigger(tx);
            }
            this._isActive.set(true, tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    async triggerExplicitly(tx, onlyFetchInlineEdits = false) {
        subtransaction(tx, tx => {
            if (onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            this._isActive.set(true, tx);
            this._inAcceptFlow.set(true, tx);
            this._forceUpdateExplicitlySignal.trigger(tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    stop(stopReason = 'automatic', tx) {
        subtransaction(tx, tx => {
            if (stopReason === 'explicitCancel') {
                const inlineCompletion = this.state.get()?.inlineCompletion;
                if (inlineCompletion) {
                    inlineCompletion.reportEndOfLife({ kind: InlineCompletionEndOfLifeReasonKind.Rejected });
                }
            }
            this._isActive.set(false, tx);
            this._source.clear(tx);
        });
    }
    _computeAugmentation(suggestCompletion, reader) {
        const model = this.textModel;
        const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.read(reader);
        const candidateInlineCompletions = suggestWidgetInlineCompletions
            ? suggestWidgetInlineCompletions.inlineCompletions.filter(c => !c.isInlineEdit)
            : [this.selectedInlineCompletion.read(reader)].filter(isDefined);
        const augmentedCompletion = mapFindFirst(candidateInlineCompletions, completion => {
            let r = completion.getSingleTextEdit();
            r = singleTextRemoveCommonPrefix(r, model, Range.fromPositions(r.range.getStartPosition(), suggestCompletion.range.getEndPosition()));
            return singleTextEditAugments(r, suggestCompletion) ? { completion, edit: r } : undefined;
        });
        return augmentedCompletion;
    }
    async _deltaSelectedInlineCompletionIndex(delta) {
        await this.triggerExplicitly();
        const completions = this._filteredInlineCompletionItems.get() || [];
        if (completions.length > 0) {
            const newIdx = (this.selectedInlineCompletionIndex.get() + delta + completions.length) % completions.length;
            this._selectedInlineCompletionId.set(completions[newIdx].semanticId, undefined);
        }
        else {
            this._selectedInlineCompletionId.set(undefined, undefined);
        }
    }
    async next() { await this._deltaSelectedInlineCompletionIndex(1); }
    async previous() { await this._deltaSelectedInlineCompletionIndex(-1); }
    _getMetadata(completion, type = undefined) {
        if (type) {
            return EditSources.inlineCompletionPartialAccept({
                nes: completion.isInlineEdit,
                requestUuid: completion.requestUuid,
                providerId: completion.source.provider.providerId,
                type,
            });
        }
        else {
            return EditSources.inlineCompletionAccept({
                nes: completion.isInlineEdit,
                requestUuid: completion.requestUuid,
                providerId: completion.source.provider.providerId,
            });
        }
    }
    async accept(editor = this._editor) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        let completion;
        const state = this.state.get();
        if (state?.kind === 'ghostText') {
            if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
                return;
            }
            completion = state.inlineCompletion;
        }
        else if (state?.kind === 'inlineEdit') {
            completion = state.inlineCompletion;
        }
        else {
            return;
        }
        // Make sure the completion list will not be disposed before the text change is sent.
        completion.addRef();
        try {
            editor.pushUndoStop();
            if (completion.snippetInfo) {
                const mainEdit = TextReplacement.delete(completion.editRange);
                const additionalEdits = completion.additionalTextEdits.map(e => new TextReplacement(Range.lift(e.range), e.text ?? ''));
                const edit = TextEdit.fromParallelReplacementsUnsorted([mainEdit, ...additionalEdits]);
                editor.edit(edit, this._getMetadata(completion));
                editor.setPosition(completion.snippetInfo.range.getStartPosition(), 'inlineCompletionAccept');
                SnippetController2.get(editor)?.insert(completion.snippetInfo.snippet, { undoStopBefore: false });
            }
            else {
                const edits = state.edits;
                // The cursor should move to the end of the edit, not the end of the range provided by the extension
                // Inline Edit diffs (human readable) the suggestion from the extension so it already removes common suffix/prefix
                // Inline Completions does diff the suggestion so it may contain common suffix
                let minimalEdits = edits;
                if (state.kind === 'ghostText') {
                    minimalEdits = removeTextReplacementCommonSuffixPrefix(edits, this.textModel);
                }
                const selections = getEndPositionsAfterApplying(minimalEdits).map(p => Selection.fromPositions(p));
                const additionalEdits = completion.additionalTextEdits.map(e => new TextReplacement(Range.lift(e.range), e.text ?? ''));
                const edit = TextEdit.fromParallelReplacementsUnsorted([...edits, ...additionalEdits]);
                editor.edit(edit, this._getMetadata(completion));
                if (completion.displayLocation === undefined) {
                    // do not move the cursor when the completion is displayed in a different location
                    editor.setSelections(state.kind === 'inlineEdit' ? selections.slice(-1) : selections, 'inlineCompletionAccept');
                }
                if (state.kind === 'inlineEdit' && !this._accessibilityService.isMotionReduced()) {
                    const editRanges = edit.getNewRanges();
                    const dec = this._store.add(new FadeoutDecoration(editor, editRanges, () => {
                        this._store.delete(dec);
                    }));
                }
            }
            this._onDidAccept.fire();
            // Reset before invoking the command, as the command might cause a follow up trigger (which we don't want to reset).
            this.stop();
            if (completion.command) {
                await this._commandService
                    .executeCommand(completion.command.id, ...(completion.command.arguments || []))
                    .then(undefined, onUnexpectedExternalError);
            }
            completion.reportEndOfLife({ kind: InlineCompletionEndOfLifeReasonKind.Accepted });
        }
        finally {
            completion.removeRef();
            this._inAcceptFlow.set(true, undefined);
            this._lastAcceptedInlineCompletionInfo = { textModelVersionIdAfter: this.textModel.getVersionId(), inlineCompletion: completion };
        }
    }
    async acceptNextWord() {
        await this._acceptNext(this._editor, 'word', (pos, text) => {
            const langId = this.textModel.getLanguageIdAtPosition(pos.lineNumber, pos.column);
            const config = this._languageConfigurationService.getLanguageConfiguration(langId);
            const wordRegExp = new RegExp(config.wordDefinition.source, config.wordDefinition.flags.replace('g', ''));
            const m1 = text.match(wordRegExp);
            let acceptUntilIndexExclusive = 0;
            if (m1 && m1.index !== undefined) {
                if (m1.index === 0) {
                    acceptUntilIndexExclusive = m1[0].length;
                }
                else {
                    acceptUntilIndexExclusive = m1.index;
                }
            }
            else {
                acceptUntilIndexExclusive = text.length;
            }
            const wsRegExp = /\s+/g;
            const m2 = wsRegExp.exec(text);
            if (m2 && m2.index !== undefined) {
                if (m2.index + m2[0].length < acceptUntilIndexExclusive) {
                    acceptUntilIndexExclusive = m2.index + m2[0].length;
                }
            }
            return acceptUntilIndexExclusive;
        }, 0 /* PartialAcceptTriggerKind.Word */);
    }
    async acceptNextLine() {
        await this._acceptNext(this._editor, 'line', (pos, text) => {
            const m = text.match(/\n/);
            if (m && m.index !== undefined) {
                return m.index + 1;
            }
            return text.length;
        }, 1 /* PartialAcceptTriggerKind.Line */);
    }
    async _acceptNext(editor, type, getAcceptUntilIndex, kind) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.inlineCompletionState.get();
        if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
            return;
        }
        const ghostText = state.primaryGhostText;
        const completion = state.inlineCompletion;
        if (completion.snippetInfo) {
            // not in WYSIWYG mode, partial commit might change completion, thus it is not supported
            await this.accept(editor);
            return;
        }
        const firstPart = ghostText.parts[0];
        const ghostTextPos = new Position(ghostText.lineNumber, firstPart.column);
        const ghostTextVal = firstPart.text;
        const acceptUntilIndexExclusive = getAcceptUntilIndex(ghostTextPos, ghostTextVal);
        if (acceptUntilIndexExclusive === ghostTextVal.length && ghostText.parts.length === 1) {
            this.accept(editor);
            return;
        }
        const partialGhostTextVal = ghostTextVal.substring(0, acceptUntilIndexExclusive);
        const positions = this._positions.get();
        const cursorPosition = positions[0];
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                const replaceRange = Range.fromPositions(cursorPosition, ghostTextPos);
                const newText = editor.getModel().getValueInRange(replaceRange) + partialGhostTextVal;
                const primaryEdit = new TextReplacement(replaceRange, newText);
                const edits = [primaryEdit, ...getSecondaryEdits(this.textModel, positions, primaryEdit)].filter(isDefined);
                const selections = getEndPositionsAfterApplying(edits).map(p => Selection.fromPositions(p));
                editor.edit(TextEdit.fromParallelReplacementsUnsorted(edits), this._getMetadata(completion, type));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
                editor.revealPositionInCenterIfOutsideViewport(editor.getPosition(), 1 /* ScrollType.Immediate */);
            }
            finally {
                this._isAcceptingPartially = false;
            }
            const acceptedRange = Range.fromPositions(completion.editRange.getStartPosition(), TextLength.ofText(partialGhostTextVal).addToPosition(ghostTextPos));
            // This assumes that the inline completion and the model use the same EOL style.
            const text = editor.getModel().getValueInRange(acceptedRange, 1 /* EndOfLinePreference.LF */);
            const acceptedLength = text.length;
            completion.reportPartialAccept(acceptedLength, { kind, acceptedLength: acceptedLength });
        }
        finally {
            completion.removeRef();
        }
    }
    handleSuggestAccepted(item) {
        const itemEdit = singleTextRemoveCommonPrefix(item.getSingleTextEdit(), this.textModel);
        const augmentedCompletion = this._computeAugmentation(itemEdit, undefined);
        if (!augmentedCompletion) {
            return;
        }
        // This assumes that the inline completion and the model use the same EOL style.
        const alreadyAcceptedLength = this.textModel.getValueInRange(augmentedCompletion.completion.editRange, 1 /* EndOfLinePreference.LF */).length;
        const acceptedLength = alreadyAcceptedLength + itemEdit.text.length;
        augmentedCompletion.completion.reportPartialAccept(itemEdit.text.length, {
            kind: 2 /* PartialAcceptTriggerKind.Suggest */,
            acceptedLength,
        });
    }
    extractReproSample() {
        const value = this.textModel.getValue();
        const item = this.state.get()?.inlineCompletion;
        return {
            documentValue: value,
            inlineCompletion: item?.getSourceCompletion(),
        };
    }
    jump() {
        const s = this.inlineEditState.get();
        if (!s) {
            return;
        }
        transaction(tx => {
            this._jumpedToId.set(s.inlineCompletion.semanticId, tx);
            this.dontRefetchSignal.trigger(tx);
            const targetRange = s.inlineCompletion.targetRange;
            const targetPosition = targetRange.getStartPosition();
            this._editor.setPosition(targetPosition, 'inlineCompletions.jump');
            // TODO: consider using view information to reveal it
            const isSingleLineChange = targetRange.isSingleLine() && (s.inlineCompletion.displayLocation || !s.inlineCompletion.insertText.includes('\n'));
            if (isSingleLineChange) {
                this._editor.revealPosition(targetPosition);
            }
            else {
                const revealRange = new Range(targetRange.startLineNumber - 1, 1, targetRange.endLineNumber + 1, 1);
                this._editor.revealRange(revealRange, 1 /* ScrollType.Immediate */);
            }
            this._editor.focus();
        });
    }
    async handleInlineSuggestionShown(inlineCompletion, viewKind, viewData) {
        await inlineCompletion.reportInlineEditShown(this._commandService, viewKind, viewData);
    }
};
InlineCompletionsModel = __decorate([
    __param(7, IInstantiationService),
    __param(8, ICommandService),
    __param(9, ILanguageConfigurationService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageFeaturesService),
    __param(12, ICodeEditorService),
    __param(13, IInlineCompletionsService)
], InlineCompletionsModel);
export { InlineCompletionsModel };
export var VersionIdChangeReason;
(function (VersionIdChangeReason) {
    VersionIdChangeReason[VersionIdChangeReason["Undo"] = 0] = "Undo";
    VersionIdChangeReason[VersionIdChangeReason["Redo"] = 1] = "Redo";
    VersionIdChangeReason[VersionIdChangeReason["AcceptWord"] = 2] = "AcceptWord";
    VersionIdChangeReason[VersionIdChangeReason["Other"] = 3] = "Other";
})(VersionIdChangeReason || (VersionIdChangeReason = {}));
export function getSecondaryEdits(textModel, positions, primaryTextRepl) {
    if (positions.length === 1) {
        // No secondary cursor positions
        return [];
    }
    const text = new TextModelText(textModel);
    const textTransformer = text.getTransformer();
    const primaryOffset = textTransformer.getOffset(positions[0]);
    const secondaryOffsets = positions.slice(1).map(pos => textTransformer.getOffset(pos));
    primaryTextRepl = primaryTextRepl.removeCommonPrefixAndSuffix(text);
    const primaryStringRepl = textTransformer.getStringReplacement(primaryTextRepl);
    const deltaFromOffsetToRangeStart = primaryStringRepl.replaceRange.start - primaryOffset;
    const primaryContextRange = primaryStringRepl.replaceRange.join(OffsetRange.emptyAt(primaryOffset));
    const primaryContextValue = text.getValueOfOffsetRange(primaryContextRange);
    const replacements = secondaryOffsets.map(secondaryOffset => {
        const newRangeStart = secondaryOffset + deltaFromOffsetToRangeStart;
        const newRangeEnd = newRangeStart + primaryStringRepl.replaceRange.length;
        const range = new OffsetRange(newRangeStart, newRangeEnd);
        const contextRange = range.join(OffsetRange.emptyAt(secondaryOffset));
        const contextValue = text.getValueOfOffsetRange(contextRange);
        if (contextValue !== primaryContextValue) {
            return undefined;
        }
        const stringRepl = new StringReplacement(range, primaryStringRepl.newText);
        const repl = textTransformer.getTextReplacement(stringRepl);
        return repl;
    }).filter(isDefined);
    return replacements;
}
class FadeoutDecoration extends Disposable {
    constructor(editor, ranges, onDispose) {
        super();
        if (onDispose) {
            this._register({ dispose: () => onDispose() });
        }
        this._register(observableCodeEditor(editor).setDecorations(constObservable(ranges.map(range => ({
            range: range,
            options: {
                description: 'animation',
                className: 'edits-fadeout-decoration',
                zIndex: 1,
            }
        })))));
        const animation = new AnimatedValue(1, 0, 1000, easeOutCubic);
        const val = new ObservableAnimatedValue(animation);
        this._register(autorun(reader => {
            const opacity = val.getValue(reader);
            editor.getContainerDomNode().style.setProperty('--animation-opacity', opacity.toString());
            if (animation.isFinished()) {
                this.dispose();
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVDb21wbGV0aW9uc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQTZELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsNkJBQTZCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pVLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLG9CQUFvQixF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