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
var InlineCompletionsSource_1;
import { booleanComparator, compareBy, compareUndefinedSmallest, numberComparator } from '../../../../../base/common/arrays.js';
import { findLastMax } from '../../../../../base/common/arraysFind.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { equalsIfDefined, itemEquals } from '../../../../../base/common/equals.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { derived, observableValue, recordChangesLazy, transaction } from '../../../../../base/common/observable.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { observableReducerSettable } from '../../../../../base/common/observableInternal/experimental/reducer.js';
import { isDefined } from '../../../../../base/common/types.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { StringEdit } from '../../../../common/core/edits/stringEdit.js';
import { InlineCompletionEndOfLifeReasonKind, InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { offsetEditFromContentChanges } from '../../../../common/model/textModelStringEdit.js';
import { formatRecordableLogEntry, StructuredLogger } from '../structuredLogger.js';
import { wait } from '../utils.js';
import { InlineSuggestionItem } from './inlineSuggestionItem.js';
import { provideInlineCompletions, runWhenCancelled } from './provideInlineCompletions.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    static { InlineCompletionsSource_1 = this; }
    static { this._requestId = 0; }
    constructor(_textModel, _versionId, _debounceValue, _cursorPosition, _languageConfigurationService, _logService, _configurationService, _instantiationService) {
        super();
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._debounceValue = _debounceValue;
        this._cursorPosition = _cursorPosition;
        this._languageConfigurationService = _languageConfigurationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._updateOperation = this._register(new MutableDisposable());
        this._state = observableReducerSettable(this, {
            initial: () => ({
                inlineCompletions: InlineCompletionsState.createEmpty(),
                suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
            }),
            disposeFinal: (values) => {
                values.inlineCompletions.dispose();
                values.suggestWidgetInlineCompletions.dispose();
            },
            changeTracker: recordChangesLazy(() => ({ versionId: this._versionId })),
            update: (reader, previousValue, changes) => {
                const edit = StringEdit.compose(changes.changes.map(c => c.change ? offsetEditFromContentChanges(c.change.changes) : StringEdit.empty).filter(isDefined));
                if (edit.isEmpty()) {
                    return previousValue;
                }
                try {
                    return {
                        inlineCompletions: previousValue.inlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                        suggestWidgetInlineCompletions: previousValue.suggestWidgetInlineCompletions.createStateWithAppliedEdit(edit, this._textModel),
                    };
                }
                finally {
                    previousValue.inlineCompletions.dispose();
                    previousValue.suggestWidgetInlineCompletions.dispose();
                }
            }
        });
        this.inlineCompletions = this._state.map(this, v => v.inlineCompletions);
        this.suggestWidgetInlineCompletions = this._state.map(this, v => v.suggestWidgetInlineCompletions);
        this.clearOperationOnTextModelChange = derived(this, reader => {
            this._versionId.read(reader);
            this._updateOperation.clear();
            return undefined; // always constant
        });
        this._loadingCount = observableValue(this, 0);
        this.loading = this._loadingCount.map(this, v => v > 0);
        this._loggingEnabled = observableConfigValue('editor.inlineSuggest.logFetch', false, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._structuredFetchLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logFetch.commandId'));
        this.clearOperationOnTextModelChange.recomputeInitiallyAndOnChange(this._store);
    }
    _log(entry) {
        if (this._loggingEnabled.get()) {
            this._logService.info(formatRecordableLogEntry(entry));
        }
        this._structuredFetchLogger.log(entry);
    }
    fetch(providers, providersLabel, context, activeInlineCompletion, withDebounce, userJumpedToActiveCompletion, providerhasChangedCompletion, requestInfo) {
        const position = this._cursorPosition.get();
        const request = new UpdateRequest(position, context, this._textModel.getVersionId(), new Set(providers));
        const target = context.selectedSuggestionInfo ? this.suggestWidgetInlineCompletions.get() : this.inlineCompletions.get();
        if (!providerhasChangedCompletion && this._updateOperation.value?.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if (target?.request?.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            this._loadingCount.set(this._loadingCount.get() + 1, undefined);
            const store = new DisposableStore();
            try {
                const recommendedDebounceValue = this._debounceValue.get(this._textModel);
                const debounceValue = findLastMax(providers.map(p => p.debounceDelayMs), compareUndefinedSmallest(numberComparator)) ?? recommendedDebounceValue;
                // Debounce in any case if update is ongoing
                const shouldDebounce = updateOngoing || (withDebounce && context.triggerKind === InlineCompletionTriggerKind.Automatic);
                if (shouldDebounce) {
                    // This debounces the operation
                    await wait(debounceValue, source.token);
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                    return false;
                }
                const requestId = InlineCompletionsSource_1._requestId++;
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    this._log({
                        sourceId: 'InlineCompletions.fetch',
                        kind: 'start',
                        requestId,
                        modelUri: this._textModel.uri,
                        modelVersion: this._textModel.getVersionId(),
                        context: { triggerKind: context.triggerKind, suggestInfo: context.selectedSuggestionInfo ? true : undefined },
                        time: Date.now(),
                        provider: providersLabel,
                    });
                }
                const startTime = new Date();
                const providerResult = provideInlineCompletions(providers, this._cursorPosition.get(), this._textModel, context, requestInfo, this._languageConfigurationService);
                runWhenCancelled(source.token, () => providerResult.cancelAndDispose({ kind: 'tokenCancellation' }));
                let shouldStopEarly = false;
                const suggestions = [];
                for await (const list of providerResult.lists) {
                    if (!list) {
                        continue;
                    }
                    list.addRef();
                    store.add(toDisposable(() => list.removeRef(list.inlineSuggestionsData.length === 0 ? { kind: 'empty' } : { kind: 'notTaken' })));
                    for (const item of list.inlineSuggestionsData) {
                        if (!context.includeInlineEdits && (item.isInlineEdit || item.showInlineEditMenu)) {
                            continue;
                        }
                        if (!context.includeInlineCompletions && !(item.isInlineEdit || item.showInlineEditMenu)) {
                            continue;
                        }
                        const i = InlineSuggestionItem.create(item, this._textModel);
                        suggestions.push(i);
                        // Stop after first visible inline completion
                        if (!i.isInlineEdit && !i.showInlineEditMenu && context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                            if (i.isVisible(this._textModel, this._cursorPosition.get())) {
                                shouldStopEarly = true;
                            }
                        }
                    }
                    if (shouldStopEarly) {
                        break;
                    }
                }
                providerResult.cancelAndDispose({ kind: 'lostRace' });
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    const didAllProvidersReturn = providerResult.didAllProvidersReturn;
                    let error = undefined;
                    if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId) {
                        error = 'canceled';
                    }
                    const result = suggestions.map(c => ({
                        range: c.editRange.toString(),
                        text: c.insertText,
                        isInlineEdit: !!c.isInlineEdit,
                        source: c.source.provider.groupId,
                    }));
                    this._log({ sourceId: 'InlineCompletions.fetch', kind: 'end', requestId, durationMs: (Date.now() - startTime.getTime()), error, result, time: Date.now(), didAllProvidersReturn });
                }
                if (source.token.isCancellationRequested || this._store.isDisposed || this._textModel.getVersionId() !== request.versionId
                    || userJumpedToActiveCompletion.get() /* In the meantime the user showed interest for the active completion so dont hide it */) {
                    return false;
                }
                const endTime = new Date();
                this._debounceValue.update(this._textModel, endTime.getTime() - startTime.getTime());
                const cursorPosition = this._cursorPosition.get();
                this._updateOperation.clear();
                transaction(tx => {
                    /** @description Update completions with provider result */
                    const v = this._state.get();
                    if (context.selectedSuggestionInfo) {
                        this._state.set({
                            inlineCompletions: InlineCompletionsState.createEmpty(),
                            suggestWidgetInlineCompletions: v.suggestWidgetInlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                        }, tx);
                    }
                    else {
                        this._state.set({
                            inlineCompletions: v.inlineCompletions.createStateWithAppliedResults(suggestions, request, this._textModel, cursorPosition, activeInlineCompletion),
                            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                        }, tx);
                    }
                    v.inlineCompletions.dispose();
                    v.suggestWidgetInlineCompletions.dispose();
                });
            }
            finally {
                this._loadingCount.set(this._loadingCount.get() - 1, undefined);
                store.dispose();
            }
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        const v = this._state.get();
        this._state.set({
            inlineCompletions: InlineCompletionsState.createEmpty(),
            suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty()
        }, tx);
        v.inlineCompletions.dispose();
        v.suggestWidgetInlineCompletions.dispose();
    }
    seedInlineCompletionsWithSuggestWidget() {
        const inlineCompletions = this.inlineCompletions.get();
        const suggestWidgetInlineCompletions = this.suggestWidgetInlineCompletions.get();
        if (!suggestWidgetInlineCompletions) {
            return;
        }
        transaction(tx => {
            /** @description Seed inline completions with (newer) suggest widget inline completions */
            if (!inlineCompletions || (suggestWidgetInlineCompletions.request?.versionId ?? -1) > (inlineCompletions.request?.versionId ?? -1)) {
                inlineCompletions?.dispose();
                const s = this._state.get();
                this._state.set({
                    inlineCompletions: suggestWidgetInlineCompletions.clone(),
                    suggestWidgetInlineCompletions: InlineCompletionsState.createEmpty(),
                }, tx);
                s.inlineCompletions.dispose();
                s.suggestWidgetInlineCompletions.dispose();
            }
            this.clearSuggestWidgetInlineCompletions(tx);
        });
    }
    clearSuggestWidgetInlineCompletions(tx) {
        if (this._updateOperation.value?.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = InlineCompletionsSource_1 = __decorate([
    __param(4, ILanguageConfigurationService),
    __param(5, ILogService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
class UpdateRequest {
    constructor(position, context, versionId, providers) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
        this.providers = providers;
    }
    satisfies(other) {
        return this.position.equals(other.position)
            && equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, itemEquals())
            && (other.context.triggerKind === InlineCompletionTriggerKind.Automatic
                || this.context.triggerKind === InlineCompletionTriggerKind.Explicit)
            && this.versionId === other.versionId
            && isSubset(other.providers, this.providers);
    }
    get isExplicitRequest() {
        return this.context.triggerKind === InlineCompletionTriggerKind.Explicit;
    }
}
function isSubset(set1, set2) {
    return [...set1].every(item => set2.has(item));
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
class InlineCompletionsState extends Disposable {
    static createEmpty() {
        return new InlineCompletionsState([], undefined);
    }
    constructor(inlineCompletions, request) {
        for (const inlineCompletion of inlineCompletions) {
            inlineCompletion.addRef();
        }
        super();
        this.inlineCompletions = inlineCompletions;
        this.request = request;
        this._register({
            dispose: () => {
                for (const inlineCompletion of this.inlineCompletions) {
                    inlineCompletion.removeRef();
                }
            }
        });
    }
    _findById(id) {
        return this.inlineCompletions.find(i => i.identity === id);
    }
    _findByHash(hash) {
        return this.inlineCompletions.find(i => i.hash === hash);
    }
    /**
     * Applies the edit on the state.
    */
    createStateWithAppliedEdit(edit, textModel) {
        const newInlineCompletions = this.inlineCompletions.map(i => i.withEdit(edit, textModel)).filter(isDefined);
        return new InlineCompletionsState(newInlineCompletions, this.request);
    }
    createStateWithAppliedResults(updatedSuggestions, request, textModel, cursorPosition, itemIdToPreserveAtTop) {
        let itemToPreserve = undefined;
        if (itemIdToPreserveAtTop) {
            const itemToPreserveCandidate = this._findById(itemIdToPreserveAtTop);
            if (itemToPreserveCandidate && itemToPreserveCandidate.canBeReused(textModel, request.position)) {
                itemToPreserve = itemToPreserveCandidate;
                const updatedItemToPreserve = updatedSuggestions.find(i => i.hash === itemToPreserveCandidate.hash);
                if (updatedItemToPreserve) {
                    updatedSuggestions = moveToFront(updatedItemToPreserve, updatedSuggestions);
                }
                else {
                    updatedSuggestions = [itemToPreserveCandidate, ...updatedSuggestions];
                }
            }
        }
        const preferInlineCompletions = itemToPreserve
            // itemToPreserve has precedence
            ? !itemToPreserve.isInlineEdit
            // Otherwise: prefer inline completion if there is a visible one
            : updatedSuggestions.some(i => !i.isInlineEdit && i.isVisible(textModel, cursorPosition));
        let updatedItems = [];
        for (const i of updatedSuggestions) {
            const oldItem = this._findByHash(i.hash);
            let item;
            if (oldItem && oldItem !== i) {
                item = i.withIdentity(oldItem.identity);
                oldItem.setEndOfLifeReason({ kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: i.getSourceCompletion() });
                i.setIsPreceeded();
            }
            else {
                item = i;
            }
            if (preferInlineCompletions !== item.isInlineEdit) {
                updatedItems.push(item);
            }
        }
        updatedItems.sort(compareBy(i => i.showInlineEditMenu, booleanComparator));
        updatedItems = distinctByKey(updatedItems, i => i.semanticId);
        return new InlineCompletionsState(updatedItems, request);
    }
    clone() {
        return new InlineCompletionsState(this.inlineCompletions, this.request);
    }
}
/** Keeps the first item in case of duplicates. */
function distinctByKey(items, key) {
    const seen = new Set();
    return items.filter(item => {
        const k = key(item);
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}
function moveToFront(item, items) {
    const index = items.indexOf(item);
    if (index > -1) {
        return [item, ...items.slice(0, index), ...items.slice(index + 1)];
    }
    return items;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvaW5saW5lQ29tcGxldGlvbnNTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwSSxPQUFPLEVBQUUsT0FBTyxFQUFvRCxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEssaUVBQWlFO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1B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