/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MutableDisposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { countEOL } from '../../core/misc/eolCounter.js';
import { Position } from '../../core/position.js';
import { LineRange } from '../../core/ranges/lineRange.js';
import { TokenizationRegistry } from '../../languages.js';
import { ContiguousMultilineTokensBuilder } from '../../tokens/contiguousMultilineTokensBuilder.js';
import { ContiguousTokensStore } from '../../tokens/contiguousTokensStore.js';
import { TokenizerWithStateStoreAndTextModel, DefaultBackgroundTokenizer, TrackingTokenizationStateStore } from '../textModelTokens.js';
import { AbstractSyntaxTokenBackend, AttachedViewHandler } from './abstractSyntaxTokenBackend.js';
/** For TextMate */
export class TokenizerSyntaxTokenBackend extends AbstractSyntaxTokenBackend {
    constructor(languageIdCodec, textModel, getLanguageId, attachedViews) {
        super(languageIdCodec, textModel);
        this.getLanguageId = getLanguageId;
        this._tokenizer = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._defaultBackgroundTokenizer = null;
        this._backgroundTokenizer = this._register(new MutableDisposable());
        this._tokens = new ContiguousTokensStore(this._languageIdCodec);
        this._debugBackgroundTokenizer = this._register(new MutableDisposable());
        this._attachedViewStates = this._register(new DisposableMap());
        this._register(TokenizationRegistry.onDidChange((e) => {
            const languageId = this.getLanguageId();
            if (e.changedLanguages.indexOf(languageId) === -1) {
                return;
            }
            this.todo_resetTokenization();
        }));
        this.todo_resetTokenization();
        this._register(attachedViews.onDidChangeVisibleRanges(({ view, state }) => {
            if (state) {
                let existing = this._attachedViewStates.get(view);
                if (!existing) {
                    existing = new AttachedViewHandler(() => this.refreshRanges(existing.lineRanges));
                    this._attachedViewStates.set(view, existing);
                }
                existing.handleStateChange(state);
            }
            else {
                this._attachedViewStates.deleteAndDispose(view);
            }
        }));
    }
    todo_resetTokenization(fireTokenChangeEvent = true) {
        this._tokens.flush();
        this._debugBackgroundTokens?.flush();
        if (this._debugBackgroundStates) {
            this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
        }
        if (fireTokenChangeEvent) {
            this._onDidChangeTokens.fire({
                semanticTokensApplied: false,
                ranges: [
                    {
                        fromLineNumber: 1,
                        toLineNumber: this._textModel.getLineCount(),
                    },
                ],
            });
        }
        const initializeTokenization = () => {
            if (this._textModel.isTooLargeForTokenization()) {
                return [null, null];
            }
            const tokenizationSupport = TokenizationRegistry.get(this.getLanguageId());
            if (!tokenizationSupport) {
                return [null, null];
            }
            let initialState;
            try {
                initialState = tokenizationSupport.getInitialState();
            }
            catch (e) {
                onUnexpectedError(e);
                return [null, null];
            }
            return [tokenizationSupport, initialState];
        };
        const [tokenizationSupport, initialState] = initializeTokenization();
        if (tokenizationSupport && initialState) {
            this._tokenizer = new TokenizerWithStateStoreAndTextModel(this._textModel.getLineCount(), tokenizationSupport, this._textModel, this._languageIdCodec);
        }
        else {
            this._tokenizer = null;
        }
        this._backgroundTokenizer.clear();
        this._defaultBackgroundTokenizer = null;
        if (this._tokenizer) {
            const b = {
                setTokens: (tokens) => {
                    this.setTokens(tokens);
                },
                backgroundTokenizationFinished: () => {
                    if (this._backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
                        // We already did a full tokenization and don't go back to progressing.
                        return;
                    }
                    const newState = 2 /* BackgroundTokenizationState.Completed */;
                    this._backgroundTokenizationState = newState;
                    this._onDidChangeBackgroundTokenizationState.fire();
                },
                setEndState: (lineNumber, state) => {
                    if (!this._tokenizer) {
                        return;
                    }
                    const firstInvalidEndStateLineNumber = this._tokenizer.store.getFirstInvalidEndStateLineNumber();
                    // Don't accept states for definitely valid states, the renderer is ahead of the worker!
                    if (firstInvalidEndStateLineNumber !== null && lineNumber >= firstInvalidEndStateLineNumber) {
                        this._tokenizer?.store.setEndState(lineNumber, state);
                    }
                },
            };
            if (tokenizationSupport && tokenizationSupport.createBackgroundTokenizer && !tokenizationSupport.backgroundTokenizerShouldOnlyVerifyTokens) {
                this._backgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, b);
            }
            if (!this._backgroundTokenizer.value && !this._textModel.isTooLargeForTokenization()) {
                this._backgroundTokenizer.value = this._defaultBackgroundTokenizer =
                    new DefaultBackgroundTokenizer(this._tokenizer, b);
                this._defaultBackgroundTokenizer.handleChanges();
            }
            if (tokenizationSupport?.backgroundTokenizerShouldOnlyVerifyTokens && tokenizationSupport.createBackgroundTokenizer) {
                this._debugBackgroundTokens = new ContiguousTokensStore(this._languageIdCodec);
                this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
                this._debugBackgroundTokenizer.clear();
                this._debugBackgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, {
                    setTokens: (tokens) => {
                        this._debugBackgroundTokens?.setMultilineTokens(tokens, this._textModel);
                    },
                    backgroundTokenizationFinished() {
                        // NO OP
                    },
                    setEndState: (lineNumber, state) => {
                        this._debugBackgroundStates?.setEndState(lineNumber, state);
                    },
                });
            }
            else {
                this._debugBackgroundTokens = undefined;
                this._debugBackgroundStates = undefined;
                this._debugBackgroundTokenizer.value = undefined;
            }
        }
        this.refreshAllVisibleLineTokens();
    }
    handleDidChangeAttached() {
        this._defaultBackgroundTokenizer?.handleChanges();
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.todo_resetTokenization(false);
        }
        else if (!e.isEolChange) { // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength] = countEOL(c.text);
                this._tokens.acceptEdit(c.range, eolCount, firstLineLength);
                this._debugBackgroundTokens?.acceptEdit(c.range, eolCount, firstLineLength);
            }
            this._debugBackgroundStates?.acceptChanges(e.changes);
            if (this._tokenizer) {
                this._tokenizer.store.acceptChanges(e.changes);
            }
            this._defaultBackgroundTokenizer?.handleChanges();
        }
    }
    setTokens(tokens) {
        const { changes } = this._tokens.setMultilineTokens(tokens, this._textModel);
        if (changes.length > 0) {
            this._onDidChangeTokens.fire({ semanticTokensApplied: false, ranges: changes, });
        }
        return { changes: changes };
    }
    refreshAllVisibleLineTokens() {
        const ranges = LineRange.joinMany([...this._attachedViewStates].map(([_, s]) => s.lineRanges));
        this.refreshRanges(ranges);
    }
    refreshRanges(ranges) {
        for (const range of ranges) {
            this.refreshRange(range.startLineNumber, range.endLineNumberExclusive - 1);
        }
    }
    refreshRange(startLineNumber, endLineNumber) {
        if (!this._tokenizer) {
            return;
        }
        startLineNumber = Math.max(1, Math.min(this._textModel.getLineCount(), startLineNumber));
        endLineNumber = Math.min(this._textModel.getLineCount(), endLineNumber);
        const builder = new ContiguousMultilineTokensBuilder();
        const { heuristicTokens } = this._tokenizer.tokenizeHeuristically(builder, startLineNumber, endLineNumber);
        const changedTokens = this.setTokens(builder.finalize());
        if (heuristicTokens) {
            // We overrode tokens with heuristically computed ones.
            // Because old states might get reused (thus stopping invalidation),
            // we have to explicitly request the tokens for the changed ranges again.
            for (const c of changedTokens.changes) {
                this._backgroundTokenizer.value?.requestTokens(c.fromLineNumber, c.toLineNumber + 1);
            }
        }
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    forceTokenization(lineNumber) {
        const builder = new ContiguousMultilineTokensBuilder();
        this._tokenizer?.updateTokensUntilLine(builder, lineNumber);
        this.setTokens(builder.finalize());
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    hasAccurateTokensForLine(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.isCheapToTokenize(lineNumber);
    }
    getLineTokens(lineNumber) {
        const lineText = this._textModel.getLineContent(lineNumber);
        const result = this._tokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
        if (this._debugBackgroundTokens && this._debugBackgroundStates && this._tokenizer) {
            if (this._debugBackgroundStates.getFirstInvalidEndStateLineNumberOrMax() > lineNumber && this._tokenizer.store.getFirstInvalidEndStateLineNumberOrMax() > lineNumber) {
                const backgroundResult = this._debugBackgroundTokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
                if (!result.equals(backgroundResult) && this._debugBackgroundTokenizer.value?.reportMismatchingTokens) {
                    this._debugBackgroundTokenizer.value.reportMismatchingTokens(lineNumber);
                }
            }
        }
        return result;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        if (!this._tokenizer) {
            return 0 /* StandardTokenType.Other */;
        }
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        this.forceTokenization(position.lineNumber);
        return this._tokenizer.getTokenTypeIfInsertingCharacter(position, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (!this._tokenizer) {
            return null;
        }
        this.forceTokenization(lineNumber);
        return this._tokenizer.tokenizeLinesAt(lineNumber, lines);
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyU3ludGF4VG9rZW5CYWNrZW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3Rva2Vucy90b2tlbml6ZXJTeW50YXhUb2tlbkJhY2tlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRCxPQUFPLEVBQWtELG9CQUFvQixFQUFzRCxNQUFNLG9CQUFvQixDQUFDO0FBSzlKLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRzlFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSwwQkFBMEIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hJLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBaUIsTUFBTSxpQ0FBaUMsQ0FBQztBQUVqSCxtQkFBbUI7QUFDbkIsTUFBTSxPQUFPLDJCQUE0QixTQUFRLDBCQUEwQjtJQWlCMUUsWUFDQyxlQUFpQyxFQUNqQyxTQUFvQixFQUNILGFBQTJCLEVBQzVDLGFBQTRCO1FBRTVCLEtBQUssQ0FBQyxlQUFl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