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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { setTimeout0 } from '../../../../../base/common/platform.js';
import { StopWatch } from '../../../../../base/common/stopwatch.js';
import { findLikelyRelevantLines } from '../../textModelTokens.js';
import { TokenStore, TokenQuality } from './tokenStore.js';
import { autorun, autorunHandleChanges, recordChanges, runOnChange } from '../../../../../base/common/observable.js';
import { LineTokens } from '../../../tokens/lineTokens.js';
import { Position } from '../../../core/position.js';
import { Range } from '../../../core/range.js';
import { isDefined } from '../../../../../base/common/types.js';
import { ITreeSitterThemeService } from '../../../services/treeSitter/treeSitterThemeService.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
let TreeSitterTokenizationImpl = class TreeSitterTokenizationImpl extends Disposable {
    get _textModel() {
        return this._tree.textModel;
    }
    constructor(_tree, _highlightingQueries, _languageIdCodec, _visibleLineRanges, _treeSitterThemeService) {
        super();
        this._tree = _tree;
        this._highlightingQueries = _highlightingQueries;
        this._languageIdCodec = _languageIdCodec;
        this._visibleLineRanges = _visibleLineRanges;
        this._treeSitterThemeService = _treeSitterThemeService;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        this._onDidCompleteBackgroundTokenization = this._register(new Emitter());
        this.onDidChangeBackgroundTokenization = this._onDidCompleteBackgroundTokenization.event;
        this._encodedLanguageId = this._languageIdCodec.encodeLanguageId(this._tree.languageId);
        this._register(runOnChange(this._treeSitterThemeService.onChange, () => {
            this._updateTheme();
        }));
        this._tokenStore = this._register(new TokenStore(this._textModel));
        this._accurateVersion = this._textModel.getVersionId();
        this._guessVersion = this._textModel.getVersionId();
        this._tokenStore.buildStore(this._createEmptyTokens(), TokenQuality.None);
        this._register(autorun(reader => {
            const visibleLineRanges = this._visibleLineRanges.read(reader);
            this._parseAndTokenizeViewPort(visibleLineRanges);
        }));
        this._register(autorunHandleChanges({
            owner: this,
            changeTracker: recordChanges({ tree: this._tree.tree }),
        }, (reader, ctx) => {
            const changeEvent = ctx.changes.at(0)?.change;
            if (ctx.changes.length > 1) {
                throw new BugIndicatingError('The tree changed twice in one transaction. This is currently not supported and should not happen.');
            }
            if (!changeEvent) {
                if (ctx.tree) {
                    this._firstTreeUpdate(this._tree.treeLastParsedVersion.read(reader));
                }
            }
            else {
                if (this.hasTokens()) {
                    // Mark the range for refresh immediately
                    for (const range of changeEvent.ranges) {
                        this._markForRefresh(range.newRange);
                    }
                }
                // First time we see a tree we need to build a token store.
                if (!this.hasTokens()) {
                    this._firstTreeUpdate(changeEvent.versionId);
                }
                else {
                    this._handleTreeUpdate(changeEvent.ranges, changeEvent.versionId);
                }
            }
        }));
    }
    handleContentChanged(e) {
        this._guessVersion = e.versionId;
        for (const change of e.changes) {
            if (change.text.length > change.rangeLength) {
                // If possible, use the token before the change as the starting point for the new token.
                // This is more likely to let the new text be the correct color as typeing is usually at the end of the token.
                const offset = change.rangeOffset > 0 ? change.rangeOffset - 1 : change.rangeOffset;
                const oldToken = this._tokenStore.getTokenAt(offset);
                let newToken;
                if (oldToken) {
                    // Insert. Just grow the token at this position to include the insert.
                    newToken = { startOffsetInclusive: oldToken.startOffsetInclusive, length: oldToken.length + change.text.length - change.rangeLength, token: oldToken.token };
                    // Also mark tokens that are in the range of the change as needing a refresh.
                    this._tokenStore.markForRefresh(offset, change.rangeOffset + (change.text.length > change.rangeLength ? change.text.length : change.rangeLength));
                }
                else {
                    // The document got larger and the change is at the end of the document.
                    newToken = { startOffsetInclusive: offset, length: change.text.length, token: 0 };
                }
                this._tokenStore.update(oldToken?.length ?? 0, [newToken], TokenQuality.EditGuess);
            }
            else if (change.text.length < change.rangeLength) {
                // Delete. Delete the tokens at the corresponding range.
                const deletedCharCount = change.rangeLength - change.text.length;
                this._tokenStore.delete(deletedCharCount, change.rangeOffset);
            }
        }
    }
    getLineTokens(lineNumber) {
        const content = this._textModel.getLineContent(lineNumber);
        const rawTokens = this.getTokens(lineNumber);
        return new LineTokens(rawTokens, content, this._languageIdCodec);
    }
    _createEmptyTokens() {
        const emptyToken = this._emptyToken();
        const modelEndOffset = this._textModel.getValueLength();
        const emptyTokens = [this._emptyTokensForOffsetAndLength(0, modelEndOffset, emptyToken)];
        return emptyTokens;
    }
    _emptyToken() {
        return this._treeSitterThemeService.findMetadata([], this._encodedLanguageId, false, undefined);
    }
    _emptyTokensForOffsetAndLength(offset, length, emptyToken) {
        return { token: emptyToken, length: offset + length, startOffsetInclusive: 0 };
    }
    hasAccurateTokensForLine(lineNumber) {
        return this.hasTokens(new Range(lineNumber, 1, lineNumber, this._textModel.getLineMaxColumn(lineNumber)));
    }
    tokenizeLinesAt(lineNumber, lines) {
        const rawLineTokens = this._guessTokensForLinesContent(lineNumber, lines);
        const lineTokens = [];
        if (!rawLineTokens) {
            return null;
        }
        for (let i = 0; i < rawLineTokens.length; i++) {
            lineTokens.push(new LineTokens(rawLineTokens[i], lines[i], this._languageIdCodec));
        }
        return lineTokens;
    }
    _rangeHasTokens(range, minimumTokenQuality) {
        return this._tokenStore.rangeHasTokens(this._textModel.getOffsetAt(range.getStartPosition()), this._textModel.getOffsetAt(range.getEndPosition()), minimumTokenQuality);
    }
    hasTokens(accurateForRange) {
        if (!accurateForRange || (this._guessVersion === this._accurateVersion)) {
            return true;
        }
        return !this._tokenStore.rangeNeedsRefresh(this._textModel.getOffsetAt(accurateForRange.getStartPosition()), this._textModel.getOffsetAt(accurateForRange.getEndPosition()));
    }
    getTokens(line) {
        const lineStartOffset = this._textModel.getOffsetAt({ lineNumber: line, column: 1 });
        const lineEndOffset = this._textModel.getOffsetAt({ lineNumber: line, column: this._textModel.getLineLength(line) + 1 });
        const lineTokens = this._tokenStore.getTokensInRange(lineStartOffset, lineEndOffset);
        const result = new Uint32Array(lineTokens.length * 2);
        for (let i = 0; i < lineTokens.length; i++) {
            result[i * 2] = lineTokens[i].startOffsetInclusive - lineStartOffset + lineTokens[i].length;
            result[i * 2 + 1] = lineTokens[i].token;
        }
        return result;
    }
    getTokensInRange(range, rangeStartOffset, rangeEndOffset, captures) {
        const tokens = captures ? this._tokenizeCapturesWithMetadata(captures, rangeStartOffset, rangeEndOffset) : this._tokenize(range, rangeStartOffset, rangeEndOffset);
        if (tokens?.endOffsetsAndMetadata) {
            return this._rangeTokensAsUpdates(rangeStartOffset, tokens.endOffsetsAndMetadata);
        }
        return undefined;
    }
    _updateTokensInStore(version, updates, tokenQuality) {
        this._accurateVersion = version;
        for (const update of updates) {
            const lastToken = update.newTokens.length > 0 ? update.newTokens[update.newTokens.length - 1] : undefined;
            let oldRangeLength;
            if (lastToken && (this._guessVersion >= version)) {
                oldRangeLength = lastToken.startOffsetInclusive + lastToken.length - update.newTokens[0].startOffsetInclusive;
            }
            else if (update.oldRangeLength) {
                oldRangeLength = update.oldRangeLength;
            }
            else {
                oldRangeLength = 0;
            }
            this._tokenStore.update(oldRangeLength, update.newTokens, tokenQuality);
        }
    }
    _markForRefresh(range) {
        this._tokenStore.markForRefresh(this._textModel.getOffsetAt(range.getStartPosition()), this._textModel.getOffsetAt(range.getEndPosition()));
    }
    _getNeedsRefresh() {
        const needsRefreshOffsetRanges = this._tokenStore.getNeedsRefresh();
        if (!needsRefreshOffsetRanges) {
            return [];
        }
        return needsRefreshOffsetRanges.map(range => ({
            range: Range.fromPositions(this._textModel.getPositionAt(range.startOffset), this._textModel.getPositionAt(range.endOffset)),
            startOffset: range.startOffset,
            endOffset: range.endOffset
        }));
    }
    _parseAndTokenizeViewPort(lineRanges) {
        const viewportRanges = lineRanges.map(r => r.toInclusiveRange()).filter(isDefined);
        for (const range of viewportRanges) {
            const startOffsetOfRangeInDocument = this._textModel.getOffsetAt(range.getStartPosition());
            const endOffsetOfRangeInDocument = this._textModel.getOffsetAt(range.getEndPosition());
            const version = this._textModel.getVersionId();
            if (this._rangeHasTokens(range, TokenQuality.ViewportGuess)) {
                continue;
            }
            const content = this._textModel.getValueInRange(range);
            const tokenUpdates = this._forceParseAndTokenizeContent(range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, true);
            if (!tokenUpdates || this._rangeHasTokens(range, TokenQuality.ViewportGuess)) {
                continue;
            }
            if (tokenUpdates.length === 0) {
                continue;
            }
            const lastToken = tokenUpdates[tokenUpdates.length - 1];
            const oldRangeLength = lastToken.startOffsetInclusive + lastToken.length - tokenUpdates[0].startOffsetInclusive;
            this._updateTokensInStore(version, [{ newTokens: tokenUpdates, oldRangeLength }], TokenQuality.ViewportGuess);
            this._onDidChangeTokens.fire({ changes: { semanticTokensApplied: false, ranges: [{ fromLineNumber: range.startLineNumber, toLineNumber: range.endLineNumber }] } });
        }
    }
    _guessTokensForLinesContent(lineNumber, lines) {
        if (lines.length === 0) {
            return undefined;
        }
        const lineContent = lines.join(this._textModel.getEOL());
        const range = new Range(1, 1, lineNumber + lines.length, lines[lines.length - 1].length + 1);
        const startOffset = this._textModel.getOffsetAt({ lineNumber, column: 1 });
        const tokens = this._forceParseAndTokenizeContent(range, startOffset, startOffset + lineContent.length, lineContent, false);
        if (!tokens) {
            return undefined;
        }
        const tokensByLine = new Array(lines.length);
        let tokensIndex = 0;
        let tokenStartOffset = 0;
        let lineStartOffset = 0;
        for (let i = 0; i < lines.length; i++) {
            const tokensForLine = [];
            let moveToNextLine = false;
            for (let j = tokensIndex; (!moveToNextLine && (j < tokens.length)); j++) {
                const token = tokens[j];
                const lineAdjustedEndOffset = token.endOffset - lineStartOffset;
                const lineAdjustedStartOffset = tokenStartOffset - lineStartOffset;
                if (lineAdjustedEndOffset <= lines[i].length) {
                    tokensForLine.push({ endOffset: lineAdjustedEndOffset, metadata: token.metadata });
                    tokensIndex++;
                }
                else if (lineAdjustedStartOffset < lines[i].length) {
                    const partialToken = { endOffset: lines[i].length, metadata: token.metadata };
                    tokensForLine.push(partialToken);
                    moveToNextLine = true;
                }
                else {
                    moveToNextLine = true;
                }
                tokenStartOffset = token.endOffset;
            }
            tokensByLine[i] = this._endOffsetTokensToUint32Array(tokensForLine);
            lineStartOffset += lines[i].length + this._textModel.getEOL().length;
        }
        return tokensByLine;
    }
    _forceParseAndTokenizeContent(range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, asUpdate) {
        const likelyRelevantLines = findLikelyRelevantLines(this._textModel, range.startLineNumber).likelyRelevantLines;
        const likelyRelevantPrefix = likelyRelevantLines.join(this._textModel.getEOL());
        const tree = this._tree.createParsedTreeSync(`${likelyRelevantPrefix}${content}`);
        if (!tree) {
            return;
        }
        const treeRange = new Range(1, 1, range.endLineNumber - range.startLineNumber + 1 + likelyRelevantLines.length, range.endColumn);
        const captures = this.captureAtRange(treeRange);
        const tokens = this._tokenizeCapturesWithMetadata(captures, likelyRelevantPrefix.length, endOffsetOfRangeInDocument - startOffsetOfRangeInDocument + likelyRelevantPrefix.length);
        tree.delete();
        if (!tokens) {
            return;
        }
        if (asUpdate) {
            return this._rangeTokensAsUpdates(startOffsetOfRangeInDocument, tokens.endOffsetsAndMetadata, likelyRelevantPrefix.length);
        }
        else {
            return tokens.endOffsetsAndMetadata;
        }
    }
    _firstTreeUpdate(versionId) {
        return this._setViewPortTokens(versionId);
    }
    _setViewPortTokens(versionId) {
        const rangeChanges = this._visibleLineRanges.get().map(lineRange => {
            const range = lineRange.toInclusiveRange();
            if (!range) {
                return undefined;
            }
            const newRangeStartOffset = this._textModel.getOffsetAt(range.getStartPosition());
            const newRangeEndOffset = this._textModel.getOffsetAt(range.getEndPosition());
            return {
                newRange: range,
                newRangeEndOffset,
                newRangeStartOffset,
            };
        }).filter(isDefined);
        return this._handleTreeUpdate(rangeChanges, versionId);
    }
    /**
     * Do not await in this method, it will cause a race
     */
    _handleTreeUpdate(ranges, versionId) {
        const rangeChanges = [];
        const chunkSize = 1000;
        for (let i = 0; i < ranges.length; i++) {
            const rangeLinesLength = ranges[i].newRange.endLineNumber - ranges[i].newRange.startLineNumber;
            if (rangeLinesLength > chunkSize) {
                // Split the range into chunks to avoid long operations
                const fullRangeEndLineNumber = ranges[i].newRange.endLineNumber;
                let chunkLineStart = ranges[i].newRange.startLineNumber;
                let chunkColumnStart = ranges[i].newRange.startColumn;
                let chunkLineEnd = chunkLineStart + chunkSize;
                do {
                    const chunkStartingPosition = new Position(chunkLineStart, chunkColumnStart);
                    const chunkEndColumn = ((chunkLineEnd === ranges[i].newRange.endLineNumber) ? ranges[i].newRange.endColumn : this._textModel.getLineMaxColumn(chunkLineEnd));
                    const chunkEndPosition = new Position(chunkLineEnd, chunkEndColumn);
                    const chunkRange = Range.fromPositions(chunkStartingPosition, chunkEndPosition);
                    rangeChanges.push({
                        range: chunkRange,
                        startOffset: this._textModel.getOffsetAt(chunkRange.getStartPosition()),
                        endOffset: this._textModel.getOffsetAt(chunkRange.getEndPosition())
                    });
                    chunkLineStart = chunkLineEnd + 1;
                    chunkColumnStart = 1;
                    if (chunkLineEnd < fullRangeEndLineNumber && chunkLineEnd + chunkSize > fullRangeEndLineNumber) {
                        chunkLineEnd = fullRangeEndLineNumber;
                    }
                    else {
                        chunkLineEnd = chunkLineEnd + chunkSize;
                    }
                } while (chunkLineEnd <= fullRangeEndLineNumber);
            }
            else {
                // Check that the previous range doesn't overlap
                if ((i === 0) || (rangeChanges[i - 1].endOffset < ranges[i].newRangeStartOffset)) {
                    rangeChanges.push({
                        range: ranges[i].newRange,
                        startOffset: ranges[i].newRangeStartOffset,
                        endOffset: ranges[i].newRangeEndOffset
                    });
                }
                else if (rangeChanges[i - 1].endOffset < ranges[i].newRangeEndOffset) {
                    // clip the range to the previous range
                    const startPosition = this._textModel.getPositionAt(rangeChanges[i - 1].endOffset + 1);
                    const range = new Range(startPosition.lineNumber, startPosition.column, ranges[i].newRange.endLineNumber, ranges[i].newRange.endColumn);
                    rangeChanges.push({
                        range,
                        startOffset: rangeChanges[i - 1].endOffset + 1,
                        endOffset: ranges[i].newRangeEndOffset
                    });
                }
            }
        }
        // Get the captures immediately while the text model is correct
        const captures = rangeChanges.map(range => this._getCaptures(range.range));
        // Don't block
        return this._updateTreeForRanges(rangeChanges, versionId, captures).then(() => {
            if (!this._textModel.isDisposed() && (this._tree.treeLastParsedVersion.get() === this._textModel.getVersionId())) {
                this._refreshNeedsRefresh(versionId);
            }
        });
    }
    async _updateTreeForRanges(rangeChanges, versionId, captures) {
        let tokenUpdate;
        for (let i = 0; i < rangeChanges.length; i++) {
            if (!this._textModel.isDisposed() && versionId !== this._textModel.getVersionId()) {
                // Our captures have become invalid and we need to re-capture
                break;
            }
            const capture = captures[i];
            const range = rangeChanges[i];
            const updates = this.getTokensInRange(range.range, range.startOffset, range.endOffset, capture);
            if (updates) {
                tokenUpdate = { newTokens: updates };
            }
            else {
                tokenUpdate = { newTokens: [] };
            }
            this._updateTokensInStore(versionId, [tokenUpdate], TokenQuality.Accurate);
            this._onDidChangeTokens.fire({
                changes: {
                    semanticTokensApplied: false,
                    ranges: [{ fromLineNumber: range.range.getStartPosition().lineNumber, toLineNumber: range.range.getEndPosition().lineNumber }]
                }
            });
            await new Promise(resolve => setTimeout0(resolve));
        }
        this._onDidCompleteBackgroundTokenization.fire();
    }
    _refreshNeedsRefresh(versionId) {
        const rangesToRefresh = this._getNeedsRefresh();
        if (rangesToRefresh.length === 0) {
            return;
        }
        const rangeChanges = new Array(rangesToRefresh.length);
        for (let i = 0; i < rangesToRefresh.length; i++) {
            const range = rangesToRefresh[i];
            rangeChanges[i] = {
                newRange: range.range,
                newRangeStartOffset: range.startOffset,
                newRangeEndOffset: range.endOffset
            };
        }
        this._handleTreeUpdate(rangeChanges, versionId);
    }
    _rangeTokensAsUpdates(rangeOffset, endOffsetToken, startingOffsetInArray) {
        const updates = [];
        let lastEnd = 0;
        for (const token of endOffsetToken) {
            if (token.endOffset <= lastEnd || (startingOffsetInArray && (token.endOffset < startingOffsetInArray))) {
                continue;
            }
            let tokenUpdate;
            if (startingOffsetInArray && (lastEnd < startingOffsetInArray)) {
                tokenUpdate = { startOffsetInclusive: rangeOffset + startingOffsetInArray, length: token.endOffset - startingOffsetInArray, token: token.metadata };
            }
            else {
                tokenUpdate = { startOffsetInclusive: rangeOffset + lastEnd, length: token.endOffset - lastEnd, token: token.metadata };
            }
            updates.push(tokenUpdate);
            lastEnd = token.endOffset;
        }
        return updates;
    }
    _updateTheme() {
        const modelRange = this._textModel.getFullModelRange();
        this._markForRefresh(modelRange);
        this._parseAndTokenizeViewPort(this._visibleLineRanges.get());
    }
    // Was used for inspect editor tokens command
    captureAtPosition(lineNumber, column) {
        const captures = this.captureAtRangeWithInjections(new Range(lineNumber, column, lineNumber, column + 1));
        return captures;
    }
    // Was used for the colorization tests
    captureAtRangeTree(range) {
        const captures = this.captureAtRangeWithInjections(range);
        return captures;
    }
    captureAtRange(range) {
        const tree = this._tree.tree.get();
        if (!tree) {
            return [];
        }
        // Tree sitter row is 0 based, column is 0 based
        return this._highlightingQueries.captures(tree.rootNode, { startPosition: { row: range.startLineNumber - 1, column: range.startColumn - 1 }, endPosition: { row: range.endLineNumber - 1, column: range.endColumn - 1 } }).map(capture => ({
            name: capture.name,
            text: capture.node.text,
            node: {
                startIndex: capture.node.startIndex,
                endIndex: capture.node.endIndex,
                startPosition: {
                    lineNumber: capture.node.startPosition.row + 1,
                    column: capture.node.startPosition.column + 1
                },
                endPosition: {
                    lineNumber: capture.node.endPosition.row + 1,
                    column: capture.node.endPosition.column + 1
                }
            },
            encodedLanguageId: this._encodedLanguageId
        }));
    }
    captureAtRangeWithInjections(range) {
        const captures = this.captureAtRange(range);
        for (let i = 0; i < captures.length; i++) {
            const capture = captures[i];
            const capStartLine = capture.node.startPosition.lineNumber;
            const capEndLine = capture.node.endPosition.lineNumber;
            const capStartColumn = capture.node.startPosition.column;
            const capEndColumn = capture.node.endPosition.column;
            const startLine = ((capStartLine > range.startLineNumber) && (capStartLine < range.endLineNumber)) ? capStartLine : range.startLineNumber;
            const endLine = ((capEndLine > range.startLineNumber) && (capEndLine < range.endLineNumber)) ? capEndLine : range.endLineNumber;
            const startColumn = (capStartLine === range.startLineNumber) ? (capStartColumn < range.startColumn ? range.startColumn : capStartColumn) : (capStartLine < range.startLineNumber ? range.startColumn : capStartColumn);
            const endColumn = (capEndLine === range.endLineNumber) ? (capEndColumn > range.endColumn ? range.endColumn : capEndColumn) : (capEndLine > range.endLineNumber ? range.endColumn : capEndColumn);
            const injectionRange = new Range(startLine, startColumn, endLine, endColumn);
            const injection = this._getInjectionCaptures(capture, injectionRange);
            if (injection && injection.length > 0) {
                captures.splice(i + 1, 0, ...injection);
                i += injection.length;
            }
        }
        return captures;
    }
    /**
     * Gets the tokens for a given line.
     * Each token takes 2 elements in the array. The first element is the offset of the end of the token *in the line, not in the document*, and the second element is the metadata.
     *
     * @param lineNumber
     * @returns
     */
    tokenizeEncoded(lineNumber) {
        const tokens = this._tokenizeEncoded(lineNumber);
        if (!tokens) {
            return undefined;
        }
        const updates = this._rangeTokensAsUpdates(this._textModel.getOffsetAt({ lineNumber, column: 1 }), tokens.result);
        if (tokens.versionId === this._textModel.getVersionId()) {
            this._updateTokensInStore(tokens.versionId, [{ newTokens: updates, oldRangeLength: this._textModel.getLineLength(lineNumber) }], TokenQuality.Accurate);
        }
    }
    tokenizeEncodedInstrumented(lineNumber) {
        const tokens = this._tokenizeEncoded(lineNumber);
        if (!tokens) {
            return undefined;
        }
        return { result: this._endOffsetTokensToUint32Array(tokens.result), captureTime: tokens.captureTime, metadataTime: tokens.metadataTime };
    }
    _getCaptures(range) {
        const captures = this.captureAtRangeWithInjections(range);
        return captures;
    }
    _tokenize(range, rangeStartOffset, rangeEndOffset) {
        const captures = this._getCaptures(range);
        const result = this._tokenizeCapturesWithMetadata(captures, rangeStartOffset, rangeEndOffset);
        if (!result) {
            return undefined;
        }
        return { ...result, versionId: this._tree.treeLastParsedVersion.get() };
    }
    _createTokensFromCaptures(captures, rangeStartOffset, rangeEndOffset) {
        const tree = this._tree.tree.get();
        const stopwatch = StopWatch.create();
        const rangeLength = rangeEndOffset - rangeStartOffset;
        const encodedLanguageId = this._languageIdCodec.encodeLanguageId(this._tree.languageId);
        const baseScope = TREESITTER_BASE_SCOPES[this._tree.languageId] || 'source';
        if (captures.length === 0) {
            if (tree) {
                stopwatch.stop();
                const endOffsetsAndMetadata = [{ endOffset: rangeLength, scopes: [], encodedLanguageId }];
                return { endOffsets: endOffsetsAndMetadata, captureTime: stopwatch.elapsed() };
            }
            return undefined;
        }
        const endOffsetsAndScopes = Array(captures.length);
        endOffsetsAndScopes.fill({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        let tokenIndex = 0;
        const increaseSizeOfTokensByOneToken = () => {
            endOffsetsAndScopes.push({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        };
        const brackets = (capture, startOffset) => {
            return (capture.name.includes('punctuation') && capture.text) ? Array.from(capture.text.matchAll(BRACKETS)).map(match => startOffset + match.index) : undefined;
        };
        const addCurrentTokenToArray = (capture, startOffset, endOffset, position) => {
            if (position !== undefined) {
                const oldScopes = endOffsetsAndScopes[position].scopes;
                let oldBracket = endOffsetsAndScopes[position].bracket;
                // Check that the previous token ends at the same point that the current token starts
                const prevEndOffset = position > 0 ? endOffsetsAndScopes[position - 1].endOffset : 0;
                if (prevEndOffset !== startOffset) {
                    let preInsertBracket = undefined;
                    if (oldBracket && oldBracket.length > 0) {
                        preInsertBracket = [];
                        const postInsertBracket = [];
                        for (let i = 0; i < oldBracket.length; i++) {
                            const bracket = oldBracket[i];
                            if (bracket < startOffset) {
                                preInsertBracket.push(bracket);
                            }
                            else if (bracket > endOffset) {
                                postInsertBracket.push(bracket);
                            }
                        }
                        if (preInsertBracket.length === 0) {
                            preInsertBracket = undefined;
                        }
                        if (postInsertBracket.length === 0) {
                            oldBracket = undefined;
                        }
                        else {
                            oldBracket = postInsertBracket;
                        }
                    }
                    // We need to add some of the position token to cover the space
                    endOffsetsAndScopes.splice(position, 0, { endOffset: startOffset, scopes: [...oldScopes], bracket: preInsertBracket, encodedLanguageId: capture.encodedLanguageId });
                    position++;
                    increaseSizeOfTokensByOneToken();
                    tokenIndex++;
                }
                endOffsetsAndScopes.splice(position, 0, { endOffset: endOffset, scopes: [...oldScopes, capture.name], bracket: brackets(capture, startOffset), encodedLanguageId: capture.encodedLanguageId });
                endOffsetsAndScopes[tokenIndex].bracket = oldBracket;
            }
            else {
                endOffsetsAndScopes[tokenIndex] = { endOffset: endOffset, scopes: [baseScope, capture.name], bracket: brackets(capture, startOffset), encodedLanguageId: capture.encodedLanguageId };
            }
            tokenIndex++;
        };
        for (let captureIndex = 0; captureIndex < captures.length; captureIndex++) {
            const capture = captures[captureIndex];
            const tokenEndIndex = capture.node.endIndex < rangeEndOffset ? ((capture.node.endIndex < rangeStartOffset) ? rangeStartOffset : capture.node.endIndex) : rangeEndOffset;
            const tokenStartIndex = capture.node.startIndex < rangeStartOffset ? rangeStartOffset : capture.node.startIndex;
            const endOffset = tokenEndIndex - rangeStartOffset;
            // Not every character will get captured, so we need to make sure that our current capture doesn't bleed toward the start of the line and cover characters that it doesn't apply to.
            // We do this by creating a new token in the array if the previous token ends before the current token starts.
            let previousEndOffset;
            const currentTokenLength = tokenEndIndex - tokenStartIndex;
            if (captureIndex > 0) {
                previousEndOffset = endOffsetsAndScopes[(tokenIndex - 1)].endOffset;
            }
            else {
                previousEndOffset = tokenStartIndex - rangeStartOffset - 1;
            }
            const startOffset = endOffset - currentTokenLength;
            if ((previousEndOffset >= 0) && (previousEndOffset < startOffset)) {
                // Add en empty token to cover the space where there were no captures
                endOffsetsAndScopes[tokenIndex] = { endOffset: startOffset, scopes: [baseScope], encodedLanguageId: this._encodedLanguageId };
                tokenIndex++;
                increaseSizeOfTokensByOneToken();
            }
            if (currentTokenLength < 0) {
                // This happens when we have a token "gap" right at the end of the capture range. The last capture isn't used because it's start index isn't included in the range.
                continue;
            }
            if (previousEndOffset >= endOffset) {
                // walk back through the tokens until we find the one that contains the current token
                let withinTokenIndex = tokenIndex - 1;
                let previousTokenEndOffset = endOffsetsAndScopes[withinTokenIndex].endOffset;
                let previousTokenStartOffset = ((withinTokenIndex >= 2) ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0);
                do {
                    // Check that the current token doesn't just replace the last token
                    if ((previousTokenStartOffset + currentTokenLength) === previousTokenEndOffset) {
                        if (previousTokenStartOffset === startOffset) {
                            // Current token and previous token span the exact same characters, add the scopes to the previous token
                            endOffsetsAndScopes[withinTokenIndex].scopes.push(capture.name);
                            const oldBracket = endOffsetsAndScopes[withinTokenIndex].bracket;
                            endOffsetsAndScopes[withinTokenIndex].bracket = ((oldBracket && (oldBracket.length > 0)) ? oldBracket : brackets(capture, startOffset));
                        }
                    }
                    else if (previousTokenStartOffset <= startOffset) {
                        addCurrentTokenToArray(capture, startOffset, endOffset, withinTokenIndex);
                        break;
                    }
                    withinTokenIndex--;
                    previousTokenStartOffset = ((withinTokenIndex >= 1) ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0);
                    previousTokenEndOffset = ((withinTokenIndex >= 0) ? endOffsetsAndScopes[withinTokenIndex].endOffset : 0);
                } while (previousTokenEndOffset > startOffset);
            }
            else {
                // Just add the token to the array
                addCurrentTokenToArray(capture, startOffset, endOffset);
            }
        }
        // Account for uncaptured characters at the end of the line
        if ((endOffsetsAndScopes[tokenIndex - 1].endOffset < rangeLength)) {
            if (rangeLength - endOffsetsAndScopes[tokenIndex - 1].endOffset > 0) {
                increaseSizeOfTokensByOneToken();
                endOffsetsAndScopes[tokenIndex] = { endOffset: rangeLength, scopes: endOffsetsAndScopes[tokenIndex].scopes, encodedLanguageId: this._encodedLanguageId };
                tokenIndex++;
            }
        }
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            if (token.endOffset === 0 && i !== 0) {
                endOffsetsAndScopes.splice(i, endOffsetsAndScopes.length - i);
                break;
            }
        }
        const captureTime = stopwatch.elapsed();
        return { endOffsets: endOffsetsAndScopes, captureTime };
    }
    _getInjectionCaptures(parentCapture, range) {
        /*
                const injection = textModelTreeSitter.getInjection(parentCapture.node.startIndex, this._treeSitterModel.languageId);
                if (!injection?.tree || injection.versionId !== textModelTreeSitter.parseResult?.versionId) {
                    return undefined;
                }

                const feature = TreeSitterTokenizationRegistry.get(injection.languageId);
                if (!feature) {
                    return undefined;
                }
                return feature.tokSupport_captureAtRangeTree(range, injection.tree, textModelTreeSitter);*/
        return [];
    }
    _tokenizeCapturesWithMetadata(captures, rangeStartOffset, rangeEndOffset) {
        const stopwatch = StopWatch.create();
        const emptyTokens = this._createTokensFromCaptures(captures, rangeStartOffset, rangeEndOffset);
        if (!emptyTokens) {
            return undefined;
        }
        const endOffsetsAndScopes = emptyTokens.endOffsets;
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            token.metadata = this._treeSitterThemeService.findMetadata(token.scopes, token.encodedLanguageId, !!token.bracket && (token.bracket.length > 0), undefined);
        }
        const metadataTime = stopwatch.elapsed();
        return { endOffsetsAndMetadata: endOffsetsAndScopes, captureTime: emptyTokens.captureTime, metadataTime };
    }
    _tokenizeEncoded(lineNumber) {
        const lineOffset = this._textModel.getOffsetAt({ lineNumber: lineNumber, column: 1 });
        const maxLine = this._textModel.getLineCount();
        const lineEndOffset = (lineNumber + 1 <= maxLine) ? this._textModel.getOffsetAt({ lineNumber: lineNumber + 1, column: 1 }) : this._textModel.getValueLength();
        const lineLength = lineEndOffset - lineOffset;
        const result = this._tokenize(new Range(lineNumber, 1, lineNumber, lineLength + 1), lineOffset, lineEndOffset);
        if (!result) {
            return undefined;
        }
        return { result: result.endOffsetsAndMetadata, captureTime: result.captureTime, metadataTime: result.metadataTime, versionId: result.versionId };
    }
    _endOffsetTokensToUint32Array(endOffsetsAndMetadata) {
        const uint32Array = new Uint32Array(endOffsetsAndMetadata.length * 2);
        for (let i = 0; i < endOffsetsAndMetadata.length; i++) {
            uint32Array[i * 2] = endOffsetsAndMetadata[i].endOffset;
            uint32Array[i * 2 + 1] = endOffsetsAndMetadata[i].metadata;
        }
        return uint32Array;
    }
};
TreeSitterTokenizationImpl = __decorate([
    __param(4, ITreeSitterThemeService)
], TreeSitterTokenizationImpl);
export { TreeSitterTokenizationImpl };
export const TREESITTER_BASE_SCOPES = {
    'css': 'source.css',
    'typescript': 'source.ts',
    'ini': 'source.ini',
    'regex': 'source.regex',
};
const BRACKETS = /[\{\}\[\]\<\>\(\)]/g;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5zL3RyZWVTaXR0ZXIvdHJlZVNpdHRlclRva2VuaXphdGlvbkltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSXBFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBZSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbEksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJB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