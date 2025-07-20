/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletionEndOfLifeReasonKind } from '../../../../common/languages.js';
import { fixBracketsInLine } from '../../../../common/model/bracketPairsTextModelPart/fixBrackets.js';
import { SnippetParser, Text } from '../../../snippet/browser/snippetParser.js';
import { getReadonlyEmptyArray } from '../utils.js';
import { groupByMap } from '../../../../../base/common/collections.js';
import { DirectedGraph } from './graph.js';
import { CachedFunction } from '../../../../../base/common/cache.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
import { isDefined } from '../../../../../base/common/types.js';
import { inlineCompletionIsVisible } from './inlineSuggestionItem.js';
export function provideInlineCompletions(providers, position, model, context, requestInfo, languageConfigurationService) {
    const requestUuid = 'icr-' + generateUuid();
    const cancellationTokenSource = new CancellationTokenSource();
    let cancelReason = undefined;
    const contextWithUuid = { ...context, requestUuid: requestUuid };
    const defaultReplaceRange = getDefaultRange(position, model);
    const providersByGroupId = groupByMap(providers, p => p.groupId);
    const yieldsToGraph = DirectedGraph.from(providers, p => {
        return p.yieldsToGroupIds?.flatMap(groupId => providersByGroupId.get(groupId) ?? []) ?? [];
    });
    const { foundCycles } = yieldsToGraph.removeCycles();
    if (foundCycles.length > 0) {
        onUnexpectedExternalError(new Error(`Inline completions: cyclic yield-to dependency detected.`
            + ` Path: ${foundCycles.map(s => s.toString ? s.toString() : ('' + s)).join(' -> ')}`));
    }
    let runningCount = 0;
    const queryProvider = new CachedFunction(async (provider) => {
        try {
            runningCount++;
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined;
            }
            const yieldsTo = yieldsToGraph.getOutgoing(provider);
            for (const p of yieldsTo) {
                // We know there is no cycle, so no recursion here
                const result = await queryProvider.get(p);
                if (result) {
                    for (const item of result.inlineSuggestions.items) {
                        if (item.isInlineEdit || typeof item.insertText !== 'string') {
                            return undefined;
                        }
                        const t = new TextReplacement(Range.lift(item.range) ?? defaultReplaceRange, item.insertText);
                        if (inlineCompletionIsVisible(t, undefined, model, position)) {
                            return undefined;
                        }
                        // else: inline completion is not visible, so lets not block
                    }
                }
            }
            let result;
            try {
                result = await provider.provideInlineCompletions(model, position, contextWithUuid, cancellationTokenSource.token);
            }
            catch (e) {
                onUnexpectedExternalError(e);
                return undefined;
            }
            if (!result) {
                return undefined;
            }
            const data = [];
            const list = new InlineSuggestionList(result, data, provider);
            list.addRef();
            runWhenCancelled(cancellationTokenSource.token, () => {
                return list.removeRef(cancelReason);
            });
            if (cancellationTokenSource.token.isCancellationRequested) {
                return undefined; // The list is disposed now, so we cannot return the items!
            }
            for (const item of result.items) {
                data.push(toInlineSuggestData(item, list, defaultReplaceRange, model, languageConfigurationService, contextWithUuid, requestInfo));
            }
            return list;
        }
        finally {
            runningCount--;
        }
    });
    const inlineCompletionLists = AsyncIterableObject.fromPromisesResolveOrder(providers.map(p => queryProvider.get(p))).filter(isDefined);
    return {
        get didAllProvidersReturn() { return runningCount === 0; },
        lists: inlineCompletionLists,
        cancelAndDispose: reason => {
            if (cancelReason !== undefined) {
                return;
            }
            cancelReason = reason;
            cancellationTokenSource.dispose(true);
        }
    };
}
/** If the token is eventually cancelled, this will not leak either. */
export function runWhenCancelled(token, callback) {
    if (token.isCancellationRequested) {
        callback();
        return Disposable.None;
    }
    else {
        const listener = token.onCancellationRequested(() => {
            listener.dispose();
            callback();
        });
        return { dispose: () => listener.dispose() };
    }
}
function toInlineSuggestData(inlineCompletion, source, defaultReplaceRange, textModel, languageConfigurationService, context, requestInfo) {
    let insertText;
    let snippetInfo;
    let range = inlineCompletion.range ? Range.lift(inlineCompletion.range) : defaultReplaceRange;
    if (typeof inlineCompletion.insertText === 'string') {
        insertText = inlineCompletion.insertText;
        if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
            insertText = closeBrackets(insertText, range.getStartPosition(), textModel, languageConfigurationService);
            // Modify range depending on if brackets are added or removed
            const diff = insertText.length - inlineCompletion.insertText.length;
            if (diff !== 0) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
            }
        }
        snippetInfo = undefined;
    }
    else if ('snippet' in inlineCompletion.insertText) {
        const preBracketCompletionLength = inlineCompletion.insertText.snippet.length;
        if (languageConfigurationService && inlineCompletion.completeBracketPairs) {
            inlineCompletion.insertText.snippet = closeBrackets(inlineCompletion.insertText.snippet, range.getStartPosition(), textModel, languageConfigurationService);
            // Modify range depending on if brackets are added or removed
            const diff = inlineCompletion.insertText.snippet.length - preBracketCompletionLength;
            if (diff !== 0) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + diff);
            }
        }
        const snippet = new SnippetParser().parse(inlineCompletion.insertText.snippet);
        if (snippet.children.length === 1 && snippet.children[0] instanceof Text) {
            insertText = snippet.children[0].value;
            snippetInfo = undefined;
        }
        else {
            insertText = snippet.toString();
            snippetInfo = {
                snippet: inlineCompletion.insertText.snippet,
                range: range
            };
        }
    }
    else {
        assertNever(inlineCompletion.insertText);
    }
    const displayLocation = inlineCompletion.displayLocation ? {
        range: Range.lift(inlineCompletion.displayLocation.range),
        label: inlineCompletion.displayLocation.label
    } : undefined;
    return new InlineSuggestData(range, insertText, snippetInfo, displayLocation, inlineCompletion.additionalTextEdits || getReadonlyEmptyArray(), inlineCompletion, source, context, inlineCompletion.isInlineEdit ?? false, requestInfo);
}
export class InlineSuggestData {
    constructor(range, insertText, snippetInfo, displayLocation, additionalTextEdits, sourceInlineCompletion, source, context, isInlineEdit, _requestInfo) {
        this.range = range;
        this.insertText = insertText;
        this.snippetInfo = snippetInfo;
        this.displayLocation = displayLocation;
        this.additionalTextEdits = additionalTextEdits;
        this.sourceInlineCompletion = sourceInlineCompletion;
        this.source = source;
        this.context = context;
        this.isInlineEdit = isInlineEdit;
        this._requestInfo = _requestInfo;
        this._didShow = false;
        this._timeUntilShown = undefined;
        this._showStartTime = undefined;
        this._shownDuration = 0;
        this._showUncollapsedStartTime = undefined;
        this._showUncollapsedDuration = 0;
        this._didReportEndOfLife = false;
        this._lastSetEndOfLifeReason = undefined;
        this._isPreceeded = false;
        this._partiallyAcceptedCount = 0;
        this._viewData = { editorType: _requestInfo.editorType };
    }
    get showInlineEditMenu() { return this.sourceInlineCompletion.showInlineEditMenu ?? false; }
    getSingleTextEdit() {
        return new TextReplacement(this.range, this.insertText);
    }
    async reportInlineEditShown(commandService, updatedInsertText, viewKind, viewData) {
        this.updateShownDuration(viewKind);
        if (this._didShow) {
            return;
        }
        this._didShow = true;
        this._viewData.viewKind = viewKind;
        this._viewData.renderData = viewData;
        this._timeUntilShown = Date.now() - this._requestInfo.startTime;
        this.source.provider.handleItemDidShow?.(this.source.inlineSuggestions, this.sourceInlineCompletion, updatedInsertText);
        if (this.sourceInlineCompletion.shownCommand) {
            await commandService.executeCommand(this.sourceInlineCompletion.shownCommand.id, ...(this.sourceInlineCompletion.shownCommand.arguments || []));
        }
    }
    reportPartialAccept(acceptedCharacters, info) {
        this._partiallyAcceptedCount++;
        this.source.provider.handlePartialAccept?.(this.source.inlineSuggestions, this.sourceInlineCompletion, acceptedCharacters, info);
    }
    /**
     * Sends the end of life event to the provider.
     * If no reason is provided, the last set reason is used.
     * If no reason was set, the default reason is used.
    */
    reportEndOfLife(reason) {
        if (this._didReportEndOfLife) {
            return;
        }
        this._didReportEndOfLife = true;
        this.reportInlineEditHidden();
        if (!reason) {
            reason = this._lastSetEndOfLifeReason ?? { kind: InlineCompletionEndOfLifeReasonKind.Ignored, userTypingDisagreed: false, supersededBy: undefined };
        }
        if (reason.kind === InlineCompletionEndOfLifeReasonKind.Rejected && this.source.provider.handleRejection) {
            this.source.provider.handleRejection(this.source.inlineSuggestions, this.sourceInlineCompletion);
        }
        if (this.source.provider.handleEndOfLifetime) {
            const summary = {
                requestUuid: this.context.requestUuid,
                partiallyAccepted: this._partiallyAcceptedCount,
                shown: this._didShow,
                shownDuration: this._shownDuration,
                shownDurationUncollapsed: this._showUncollapsedDuration,
                preceeded: this._isPreceeded,
                timeUntilShown: this._timeUntilShown,
                editorType: this._viewData.editorType,
                languageId: this._requestInfo.languageId,
                requestReason: this._requestInfo.reason,
                viewKind: this._viewData.viewKind,
                error: this._viewData.error,
                typingInterval: this._requestInfo.typingInterval,
                typingIntervalCharacterCount: this._requestInfo.typingIntervalCharacterCount,
                ...this._viewData.renderData,
            };
            this.source.provider.handleEndOfLifetime(this.source.inlineSuggestions, this.sourceInlineCompletion, reason, summary);
        }
    }
    reportInlineEditError(message) {
        if (this._viewData.error) {
            this._viewData.error += `; ${message}`;
        }
        else {
            this._viewData.error = message;
        }
    }
    setIsPreceeded() {
        this._isPreceeded = true;
    }
    /**
     * Sets the end of life reason, but does not send the event to the provider yet.
    */
    setEndOfLifeReason(reason) {
        this.reportInlineEditHidden();
        this._lastSetEndOfLifeReason = reason;
    }
    updateShownDuration(viewKind) {
        const timeNow = Date.now();
        if (!this._showStartTime) {
            this._showStartTime = timeNow;
        }
        const isCollapsed = viewKind === InlineCompletionViewKind.Collapsed;
        if (!isCollapsed && this._showUncollapsedStartTime === undefined) {
            this._showUncollapsedStartTime = timeNow;
        }
        if (isCollapsed && this._showUncollapsedStartTime !== undefined) {
            this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        }
    }
    reportInlineEditHidden() {
        if (this._showStartTime === undefined) {
            return;
        }
        const timeNow = Date.now();
        this._shownDuration += timeNow - this._showStartTime;
        this._showStartTime = undefined;
        if (this._showUncollapsedStartTime === undefined) {
            return;
        }
        this._showUncollapsedDuration += timeNow - this._showUncollapsedStartTime;
        this._showUncollapsedStartTime = undefined;
    }
}
export var InlineCompletionEditorType;
(function (InlineCompletionEditorType) {
    InlineCompletionEditorType["TextEditor"] = "textEditor";
    InlineCompletionEditorType["DiffEditor"] = "diffEditor";
    InlineCompletionEditorType["Notebook"] = "notebook";
})(InlineCompletionEditorType || (InlineCompletionEditorType = {}));
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export class InlineSuggestionList {
    constructor(inlineSuggestions, inlineSuggestionsData, provider) {
        this.inlineSuggestions = inlineSuggestions;
        this.inlineSuggestionsData = inlineSuggestionsData;
        this.provider = provider;
        this.refCount = 0;
    }
    addRef() {
        this.refCount++;
    }
    removeRef(reason = { kind: 'other' }) {
        this.refCount--;
        if (this.refCount === 0) {
            for (const item of this.inlineSuggestionsData) {
                // Fallback if it has not been called before
                item.reportEndOfLife();
            }
            this.provider.disposeInlineCompletions(this.inlineSuggestions, reason);
        }
    }
}
function getDefaultRange(position, model) {
    const word = model.getWordAtPosition(position);
    const maxColumn = model.getLineMaxColumn(position.lineNumber);
    // By default, always replace up until the end of the current line.
    // This default might be subject to change!
    return word
        ? new Range(position.lineNumber, word.startColumn, position.lineNumber, maxColumn)
        : Range.fromPositions(position, position.with(undefined, maxColumn));
}
function closeBrackets(text, position, model, languageConfigurationService) {
    const currentLine = model.getLineContent(position.lineNumber);
    const edit = StringReplacement.replace(new OffsetRange(position.column - 1, currentLine.length), text);
    const proposedLineTokens = model.tokenization.tokenizeLinesAt(position.lineNumber, [edit.replace(currentLine)]);
    const textTokens = proposedLineTokens?.[0].sliceZeroCopy(edit.getRangeAfterReplace());
    if (!textTokens) {
        return text;
    }
    const fixedText = fixBracketsInLine(textTokens, languageConfigurationService);
    return fixedText;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZUlubGluZUNvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL3Byb3ZpZGVJbmxpbmVDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFtQyxtQ0FBbUMsRUFBK0osTUFBTSxpQ0FBaUMsQ0FBQztBQUdwUixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwRCxPQUFPLEVBQUUs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