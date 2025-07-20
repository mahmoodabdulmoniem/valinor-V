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
var TokenizationTextModelPart_1;
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { countEOL } from '../../core/misc/eolCounter.js';
import { Position } from '../../core/position.js';
import { getWordAtText } from '../../core/wordHelper.js';
import { ILanguageService } from '../../languages/language.js';
import { ILanguageConfigurationService } from '../../languages/languageConfigurationRegistry.js';
import { TextModelPart } from '../textModelPart.js';
import { TreeSitterSyntaxTokenBackend } from './treeSitter/treeSitterSyntaxTokenBackend.js';
import { SparseTokensStore } from '../../tokens/sparseTokensStore.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TokenizerSyntaxTokenBackend } from './tokenizerSyntaxTokenBackend.js';
import { ITreeSitterLibraryService } from '../../services/treeSitter/treeSitterLibraryService.js';
import { derived, observableValue } from '../../../../base/common/observable.js';
let TokenizationTextModelPart = TokenizationTextModelPart_1 = class TokenizationTextModelPart extends TextModelPart {
    constructor(_textModel, _bracketPairsTextModelPart, _languageId, _attachedViews, _languageService, _languageConfigurationService, _instantiationService, _treeSitterLibraryService) {
        super();
        this._textModel = _textModel;
        this._bracketPairsTextModelPart = _bracketPairsTextModelPart;
        this._languageId = _languageId;
        this._attachedViews = _attachedViews;
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this._instantiationService = _instantiationService;
        this._treeSitterLibraryService = _treeSitterLibraryService;
        this._languageIdObs = observableValue(this, this._languageId);
        this._useTreeSitter = derived(this, reader => {
            const languageId = this._languageIdObs.read(reader);
            return this._treeSitterLibraryService.supportsLanguage(languageId, reader);
        });
        this.tokens = derived(this, reader => {
            let tokens;
            if (this._useTreeSitter.read(reader)) {
                tokens = reader.store.add(this._instantiationService.createInstance(TreeSitterSyntaxTokenBackend, this._languageIdObs, this._languageService.languageIdCodec, this._textModel, this._attachedViews.visibleLineRanges));
            }
            else {
                tokens = reader.store.add(new TokenizerSyntaxTokenBackend(this._languageService.languageIdCodec, this._textModel, () => this._languageId, this._attachedViews));
            }
            reader.store.add(tokens.onDidChangeTokens(e => {
                this._emitModelTokensChangedEvent(e);
            }));
            reader.store.add(tokens.onDidChangeBackgroundTokenizationState(e => {
                this._bracketPairsTextModelPart.handleDidChangeBackgroundTokenizationState();
            }));
            return tokens;
        });
        let hadTokens = false;
        this.tokens.recomputeInitiallyAndOnChange(this._store, value => {
            if (hadTokens) {
                // We need to reset the tokenization, as the new token provider otherwise won't have a chance to provide tokens until some action happens in the editor.
                // TODO@hediet: Look into why this is needed.
                value.todo_resetTokenization();
            }
            hadTokens = true;
        });
        this._semanticTokens = new SparseTokensStore(this._languageService.languageIdCodec);
        this._onDidChangeLanguage = this._register(new Emitter());
        this.onDidChangeLanguage = this._onDidChangeLanguage.event;
        this._onDidChangeLanguageConfiguration = this._register(new Emitter());
        this.onDidChangeLanguageConfiguration = this._onDidChangeLanguageConfiguration.event;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
    }
    _hasListeners() {
        return (this._onDidChangeLanguage.hasListeners()
            || this._onDidChangeLanguageConfiguration.hasListeners()
            || this._onDidChangeTokens.hasListeners());
    }
    handleLanguageConfigurationServiceChange(e) {
        if (e.affects(this._languageId)) {
            this._onDidChangeLanguageConfiguration.fire({});
        }
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            this._semanticTokens.flush();
        }
        else if (!e.isEolChange) { // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength, lastLineLength] = countEOL(c.text);
                this._semanticTokens.acceptEdit(c.range, eolCount, firstLineLength, lastLineLength, c.text.length > 0 ? c.text.charCodeAt(0) : 0 /* CharCode.Null */);
            }
        }
        this.tokens.get().handleDidChangeContent(e);
    }
    handleDidChangeAttached() {
        this.tokens.get().handleDidChangeAttached();
    }
    /**
     * Includes grammar and semantic tokens.
     */
    getLineTokens(lineNumber) {
        this.validateLineNumber(lineNumber);
        const syntacticTokens = this.tokens.get().getLineTokens(lineNumber);
        return this._semanticTokens.addSparseTokens(lineNumber, syntacticTokens);
    }
    _emitModelTokensChangedEvent(e) {
        if (!this._textModel._isDisposing()) {
            this._bracketPairsTextModelPart.handleDidChangeTokens(e);
            this._onDidChangeTokens.fire(e);
        }
    }
    // #region Grammar Tokens
    validateLineNumber(lineNumber) {
        if (lineNumber < 1 || lineNumber > this._textModel.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
    }
    get hasTokens() {
        return this.tokens.get().hasTokens;
    }
    resetTokenization() {
        this.tokens.get().todo_resetTokenization();
    }
    get backgroundTokenizationState() {
        return this.tokens.get().backgroundTokenizationState;
    }
    forceTokenization(lineNumber) {
        this.validateLineNumber(lineNumber);
        this.tokens.get().forceTokenization(lineNumber);
    }
    hasAccurateTokensForLine(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this.tokens.get().hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this.tokens.get().isCheapToTokenize(lineNumber);
    }
    tokenizeIfCheap(lineNumber) {
        this.validateLineNumber(lineNumber);
        this.tokens.get().tokenizeIfCheap(lineNumber);
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        return this.tokens.get().getTokenTypeIfInsertingCharacter(lineNumber, column, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        return this.tokens.get().tokenizeLinesAt(lineNumber, lines);
    }
    // #endregion
    // #region Semantic Tokens
    setSemanticTokens(tokens, isComplete) {
        this._semanticTokens.set(tokens, isComplete, this._textModel);
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: tokens !== null,
            ranges: [{ fromLineNumber: 1, toLineNumber: this._textModel.getLineCount() }],
        });
    }
    hasCompleteSemanticTokens() {
        return this._semanticTokens.isComplete();
    }
    hasSomeSemanticTokens() {
        return !this._semanticTokens.isEmpty();
    }
    setPartialSemanticTokens(range, tokens) {
        if (this.hasCompleteSemanticTokens()) {
            return;
        }
        const changedRange = this._textModel.validateRange(this._semanticTokens.setPartial(range, tokens));
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: true,
            ranges: [
                {
                    fromLineNumber: changedRange.startLineNumber,
                    toLineNumber: changedRange.endLineNumber,
                },
            ],
        });
    }
    // #endregion
    // #region Utility Methods
    getWordAtPosition(_position) {
        this.assertNotDisposed();
        const position = this._textModel.validatePosition(_position);
        const lineContent = this._textModel.getLineContent(position.lineNumber);
        const lineTokens = this.getLineTokens(position.lineNumber);
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        // (1). First try checking right biased word
        const [rbStartOffset, rbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex);
        const rightBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex)).getWordDefinition(), lineContent.substring(rbStartOffset, rbEndOffset), rbStartOffset);
        // Make sure the result touches the original passed in position
        if (rightBiasedWord &&
            rightBiasedWord.startColumn <= _position.column &&
            _position.column <= rightBiasedWord.endColumn) {
            return rightBiasedWord;
        }
        // (2). Else, if we were at a language boundary, check the left biased word
        if (tokenIndex > 0 && rbStartOffset === position.column - 1) {
            // edge case, where `position` sits between two tokens belonging to two different languages
            const [lbStartOffset, lbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex - 1);
            const leftBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex - 1)).getWordDefinition(), lineContent.substring(lbStartOffset, lbEndOffset), lbStartOffset);
            // Make sure the result touches the original passed in position
            if (leftBiasedWord &&
                leftBiasedWord.startColumn <= _position.column &&
                _position.column <= leftBiasedWord.endColumn) {
                return leftBiasedWord;
            }
        }
        return null;
    }
    getLanguageConfiguration(languageId) {
        return this._languageConfigurationService.getLanguageConfiguration(languageId);
    }
    static _findLanguageBoundaries(lineTokens, tokenIndex) {
        const languageId = lineTokens.getLanguageId(tokenIndex);
        // go left until a different language is hit
        let startOffset = 0;
        for (let i = tokenIndex; i >= 0 && lineTokens.getLanguageId(i) === languageId; i--) {
            startOffset = lineTokens.getStartOffset(i);
        }
        // go right until a different language is hit
        let endOffset = lineTokens.getLineContent().length;
        for (let i = tokenIndex, tokenCount = lineTokens.getCount(); i < tokenCount && lineTokens.getLanguageId(i) === languageId; i++) {
            endOffset = lineTokens.getEndOffset(i);
        }
        return [startOffset, endOffset];
    }
    getWordUntilPosition(position) {
        const wordAtPosition = this.getWordAtPosition(position);
        if (!wordAtPosition) {
            return { word: '', startColumn: position.column, endColumn: position.column, };
        }
        return {
            word: wordAtPosition.word.substr(0, position.column - wordAtPosition.startColumn),
            startColumn: wordAtPosition.startColumn,
            endColumn: position.column,
        };
    }
    // #endregion
    // #region Language Id handling
    getLanguageId() {
        return this._languageId;
    }
    getLanguageIdAtPosition(lineNumber, column) {
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        const lineTokens = this.getLineTokens(position.lineNumber);
        return lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
    }
    setLanguageId(languageId, source = 'api') {
        if (this._languageId === languageId) {
            // There's nothing to do
            return;
        }
        const e = {
            oldLanguage: this._languageId,
            newLanguage: languageId,
            source
        };
        this._languageId = languageId;
        this._languageIdObs.set(languageId, undefined);
        this._bracketPairsTextModelPart.handleDidChangeLanguage(e);
        this._onDidChangeLanguage.fire(e);
        this._onDidChangeLanguageConfiguration.fire({});
    }
};
TokenizationTextModelPart = TokenizationTextModelPart_1 = __decorate([
    __param(4, ILanguageService),
    __param(5, ILanguageConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ITreeSitterLibraryService)
], TokenizationTextModelPart);
export { TokenizationTextModelPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlbnMvdG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFN0QsT0FBTyxFQUFtQixhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsNkJBQTZCLEVBQTBFLE1BQU0sa0RBQWtELENBQUM7QUFHekssT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXBELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBSzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQW9DLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTVHLElBQU0seUJBQXlCLGlD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