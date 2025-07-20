/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { IndentGuide, IndentGuideHorizontalLine } from '../textModelGuides.js';
import { ModelDecorationOptions } from '../model/textModel.js';
import { LineInjectedText } from '../textModelEvents.js';
import * as viewEvents from '../viewEvents.js';
import { createModelLineProjection } from './modelLineProjection.js';
import { ConstantTimePrefixSumComputer } from '../model/prefixSumComputer.js';
import { ViewLineData } from '../viewModel.js';
import { IdentityCoordinatesConverter } from '../coordinatesConverter.js';
export class ViewModelLinesFromProjectedModel {
    constructor(editorId, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, tabSize, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds) {
        this._editorId = editorId;
        this.model = model;
        this._validModelVersionId = -1;
        this._domLineBreaksComputerFactory = domLineBreaksComputerFactory;
        this._monospaceLineBreaksComputerFactory = monospaceLineBreaksComputerFactory;
        this.fontInfo = fontInfo;
        this.tabSize = tabSize;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        this.wrapOnEscapedLineFeeds = wrapOnEscapedLineFeeds;
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    dispose() {
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
    }
    createCoordinatesConverter() {
        return new CoordinatesConverter(this);
    }
    _constructLines(resetHiddenAreas, previousLineBreaks) {
        this.modelLineProjections = [];
        if (resetHiddenAreas) {
            this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
        }
        const linesContent = this.model.getLinesContent();
        const injectedTextDecorations = this.model.getInjectedTextDecorations(this._editorId);
        const lineCount = linesContent.length;
        const lineBreaksComputer = this.createLineBreaksComputer();
        const injectedTextQueue = new arrays.ArrayQueue(LineInjectedText.fromDecorations(injectedTextDecorations));
        for (let i = 0; i < lineCount; i++) {
            const lineInjectedText = injectedTextQueue.takeWhile(t => t.lineNumber === i + 1);
            lineBreaksComputer.addRequest(linesContent[i], lineInjectedText, previousLineBreaks ? previousLineBreaks[i] : null);
        }
        const linesBreaks = lineBreaksComputer.finalize();
        const values = [];
        const hiddenAreas = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
            }
            const isInHiddenArea = (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd);
            const line = createModelLineProjection(linesBreaks[i], !isInHiddenArea);
            values[i] = line.getViewLineCount();
            this.modelLineProjections[i] = line;
        }
        this._validModelVersionId = this.model.getVersionId();
        this.projectedModelLineLineCounts = new ConstantTimePrefixSumComputer(values);
    }
    getHiddenAreas() {
        return this.hiddenAreasDecorationIds.map((decId) => this.model.getDecorationRange(decId));
    }
    setHiddenAreas(_ranges) {
        const validatedRanges = _ranges.map(r => this.model.validateRange(r));
        const newRanges = normalizeLineRanges(validatedRanges);
        // TODO@Martin: Please stop calling this method on each model change!
        // This checks if there really was a change
        const oldRanges = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        if (newRanges.length === oldRanges.length) {
            let hasDifference = false;
            for (let i = 0; i < newRanges.length; i++) {
                if (!newRanges[i].equalsRange(oldRanges[i])) {
                    hasDifference = true;
                    break;
                }
            }
            if (!hasDifference) {
                return false;
            }
        }
        const newDecorations = newRanges.map((r) => ({
            range: r,
            options: ModelDecorationOptions.EMPTY,
        }));
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, newDecorations);
        const hiddenAreas = newRanges;
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
        let hasVisibleLine = false;
        for (let i = 0; i < this.modelLineProjections.length; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
            }
            let lineChanged = false;
            if (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd) {
                // Line should be hidden
                if (this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(false);
                    lineChanged = true;
                }
            }
            else {
                hasVisibleLine = true;
                // Line should be visible
                if (!this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(true);
                    lineChanged = true;
                }
            }
            if (lineChanged) {
                const newOutputLineCount = this.modelLineProjections[i].getViewLineCount();
                this.projectedModelLineLineCounts.setValue(i, newOutputLineCount);
            }
        }
        if (!hasVisibleLine) {
            // Cannot have everything be hidden => reveal everything!
            this.setHiddenAreas([]);
        }
        return true;
    }
    modelPositionIsVisible(modelLineNumber, _modelColumn) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return false;
        }
        return this.modelLineProjections[modelLineNumber - 1].isVisible();
    }
    getModelLineViewLineCount(modelLineNumber) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return 1;
        }
        return this.modelLineProjections[modelLineNumber - 1].getViewLineCount();
    }
    setTabSize(newTabSize) {
        if (this.tabSize === newTabSize) {
            return false;
        }
        this.tabSize = newTabSize;
        this._constructLines(/*resetHiddenAreas*/ false, null);
        return true;
    }
    setWrappingSettings(fontInfo, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        const equalFontInfo = this.fontInfo.equals(fontInfo);
        const equalWrappingStrategy = (this.wrappingStrategy === wrappingStrategy);
        const equalWrappingColumn = (this.wrappingColumn === wrappingColumn);
        const equalWrappingIndent = (this.wrappingIndent === wrappingIndent);
        const equalWordBreak = (this.wordBreak === wordBreak);
        if (equalFontInfo && equalWrappingStrategy && equalWrappingColumn && equalWrappingIndent && equalWordBreak) {
            return false;
        }
        const onlyWrappingColumnChanged = (equalFontInfo && equalWrappingStrategy && !equalWrappingColumn && equalWrappingIndent && equalWordBreak);
        this.fontInfo = fontInfo;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        let previousLineBreaks = null;
        if (onlyWrappingColumnChanged) {
            previousLineBreaks = [];
            for (let i = 0, len = this.modelLineProjections.length; i < len; i++) {
                previousLineBreaks[i] = this.modelLineProjections[i].getProjectionData();
            }
        }
        this._constructLines(/*resetHiddenAreas*/ false, previousLineBreaks);
        return true;
    }
    createLineBreaksComputer() {
        const lineBreaksComputerFactory = (this.wrappingStrategy === 'advanced'
            ? this._domLineBreaksComputerFactory
            : this._monospaceLineBreaksComputerFactory);
        return lineBreaksComputerFactory.createLineBreaksComputer(this.fontInfo, this.tabSize, this.wrappingColumn, this.wrappingIndent, this.wordBreak, this.wrapOnEscapedLineFeeds);
    }
    onModelFlushed() {
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    onModelLinesDeleted(versionId, fromLineNumber, toLineNumber) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        const outputToLineNumber = this.projectedModelLineLineCounts.getPrefixSum(toLineNumber);
        this.modelLineProjections.splice(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        this.projectedModelLineLineCounts.removeValues(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        return new viewEvents.ViewLinesDeletedEvent(outputFromLineNumber, outputToLineNumber);
    }
    onModelLinesInserted(versionId, fromLineNumber, _toLineNumber, lineBreaks) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        // cannot use this.getHiddenAreas() because those decorations have already seen the effect of this model change
        const isInHiddenArea = (fromLineNumber > 2 && !this.modelLineProjections[fromLineNumber - 2].isVisible());
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        let totalOutputLineCount = 0;
        const insertLines = [];
        const insertPrefixSumValues = [];
        for (let i = 0, len = lineBreaks.length; i < len; i++) {
            const line = createModelLineProjection(lineBreaks[i], !isInHiddenArea);
            insertLines.push(line);
            const outputLineCount = line.getViewLineCount();
            totalOutputLineCount += outputLineCount;
            insertPrefixSumValues[i] = outputLineCount;
        }
        // TODO@Alex: use arrays.arrayInsert
        this.modelLineProjections =
            this.modelLineProjections.slice(0, fromLineNumber - 1)
                .concat(insertLines)
                .concat(this.modelLineProjections.slice(fromLineNumber - 1));
        this.projectedModelLineLineCounts.insertValues(fromLineNumber - 1, insertPrefixSumValues);
        return new viewEvents.ViewLinesInsertedEvent(outputFromLineNumber, outputFromLineNumber + totalOutputLineCount - 1);
    }
    onModelLineChanged(versionId, lineNumber, lineBreakData) {
        if (versionId !== null && versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return [false, null, null, null];
        }
        const lineIndex = lineNumber - 1;
        const oldOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        const isVisible = this.modelLineProjections[lineIndex].isVisible();
        const line = createModelLineProjection(lineBreakData, isVisible);
        this.modelLineProjections[lineIndex] = line;
        const newOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        let lineMappingChanged = false;
        let changeFrom = 0;
        let changeTo = -1;
        let insertFrom = 0;
        let insertTo = -1;
        let deleteFrom = 0;
        let deleteTo = -1;
        if (oldOutputLineCount > newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
            deleteFrom = changeTo + 1;
            deleteTo = deleteFrom + (oldOutputLineCount - newOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else if (oldOutputLineCount < newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + oldOutputLineCount - 1;
            insertFrom = changeTo + 1;
            insertTo = insertFrom + (newOutputLineCount - oldOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
        }
        this.projectedModelLineLineCounts.setValue(lineIndex, newOutputLineCount);
        const viewLinesChangedEvent = (changeFrom <= changeTo ? new viewEvents.ViewLinesChangedEvent(changeFrom, changeTo - changeFrom + 1) : null);
        const viewLinesInsertedEvent = (insertFrom <= insertTo ? new viewEvents.ViewLinesInsertedEvent(insertFrom, insertTo) : null);
        const viewLinesDeletedEvent = (deleteFrom <= deleteTo ? new viewEvents.ViewLinesDeletedEvent(deleteFrom, deleteTo) : null);
        return [lineMappingChanged, viewLinesChangedEvent, viewLinesInsertedEvent, viewLinesDeletedEvent];
    }
    acceptVersionId(versionId) {
        this._validModelVersionId = versionId;
        if (this.modelLineProjections.length === 1 && !this.modelLineProjections[0].isVisible()) {
            // At least one line must be visible => reset hidden areas
            this.setHiddenAreas([]);
        }
    }
    getViewLineCount() {
        return this.projectedModelLineLineCounts.getTotalSum();
    }
    _toValidViewLineNumber(viewLineNumber) {
        if (viewLineNumber < 1) {
            return 1;
        }
        const viewLineCount = this.getViewLineCount();
        if (viewLineNumber > viewLineCount) {
            return viewLineCount;
        }
        return viewLineNumber | 0;
    }
    getActiveIndentGuide(viewLineNumber, minLineNumber, maxLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        minLineNumber = this._toValidViewLineNumber(minLineNumber);
        maxLineNumber = this._toValidViewLineNumber(maxLineNumber);
        const modelPosition = this.convertViewPositionToModelPosition(viewLineNumber, this.getViewLineMinColumn(viewLineNumber));
        const modelMinPosition = this.convertViewPositionToModelPosition(minLineNumber, this.getViewLineMinColumn(minLineNumber));
        const modelMaxPosition = this.convertViewPositionToModelPosition(maxLineNumber, this.getViewLineMinColumn(maxLineNumber));
        const result = this.model.guides.getActiveIndentGuide(modelPosition.lineNumber, modelMinPosition.lineNumber, modelMaxPosition.lineNumber);
        const viewStartPosition = this.convertModelPositionToViewPosition(result.startLineNumber, 1);
        const viewEndPosition = this.convertModelPositionToViewPosition(result.endLineNumber, this.model.getLineMaxColumn(result.endLineNumber));
        return {
            startLineNumber: viewStartPosition.lineNumber,
            endLineNumber: viewEndPosition.lineNumber,
            indent: result.indent
        };
    }
    // #region ViewLineInfo
    getViewLineInfo(viewLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        return new ViewLineInfo(lineIndex + 1, remainder);
    }
    getMinColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getMaxColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getModelStartPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const minViewColumn = line.getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, minViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getModelEndPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const maxViewColumn = line.getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, maxViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber) {
        const startViewLine = this.getViewLineInfo(viewStartLineNumber);
        const endViewLine = this.getViewLineInfo(viewEndLineNumber);
        const result = new Array();
        let lastVisibleModelPos = this.getModelStartPositionOfViewLine(startViewLine);
        let viewLines = new Array();
        for (let curModelLine = startViewLine.modelLineNumber; curModelLine <= endViewLine.modelLineNumber; curModelLine++) {
            const line = this.modelLineProjections[curModelLine - 1];
            if (line.isVisible()) {
                const startOffset = curModelLine === startViewLine.modelLineNumber
                    ? startViewLine.modelLineWrappedLineIdx
                    : 0;
                const endOffset = curModelLine === endViewLine.modelLineNumber
                    ? endViewLine.modelLineWrappedLineIdx + 1
                    : line.getViewLineCount();
                for (let i = startOffset; i < endOffset; i++) {
                    viewLines.push(new ViewLineInfo(curModelLine, i));
                }
            }
            if (!line.isVisible() && lastVisibleModelPos) {
                const lastVisibleModelPos2 = new Position(curModelLine - 1, this.model.getLineMaxColumn(curModelLine - 1) + 1);
                const modelRange = Range.fromPositions(lastVisibleModelPos, lastVisibleModelPos2);
                result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
                viewLines = [];
                lastVisibleModelPos = null;
            }
            else if (line.isVisible() && !lastVisibleModelPos) {
                lastVisibleModelPos = new Position(curModelLine, 1);
            }
        }
        if (lastVisibleModelPos) {
            const modelRange = Range.fromPositions(lastVisibleModelPos, this.getModelEndPositionOfViewLine(endViewLine));
            result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
        }
        return result;
    }
    // #endregion
    getViewLinesBracketGuides(viewStartLineNumber, viewEndLineNumber, activeViewPosition, options) {
        const modelActivePosition = activeViewPosition ? this.convertViewPositionToModelPosition(activeViewPosition.lineNumber, activeViewPosition.column) : null;
        const resultPerViewLine = [];
        for (const group of this.getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber)) {
            const modelRangeStartLineNumber = group.modelRange.startLineNumber;
            const bracketGuidesPerModelLine = this.model.guides.getLinesBracketGuides(modelRangeStartLineNumber, group.modelRange.endLineNumber, modelActivePosition, options);
            for (const viewLineInfo of group.viewLines) {
                const bracketGuides = bracketGuidesPerModelLine[viewLineInfo.modelLineNumber - modelRangeStartLineNumber];
                // visibleColumns stay as they are (this is a bug and needs to be fixed, but it is not a regression)
                // model-columns must be converted to view-model columns.
                const result = bracketGuides.map(g => {
                    if (g.forWrappedLinesAfterColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesAfterColumn);
                        if (p.lineNumber >= viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (g.forWrappedLinesBeforeOrAtColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesBeforeOrAtColumn);
                        if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (!g.horizontalLine) {
                        return g;
                    }
                    let column = -1;
                    if (g.column !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.column);
                        if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                            column = p.column;
                        }
                        else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            column = this.getMinColumnOfViewLine(viewLineInfo);
                        }
                        else if (p.lineNumber > viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    const viewPosition = this.convertModelPositionToViewPosition(viewLineInfo.modelLineNumber, g.horizontalLine.endColumn);
                    const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.horizontalLine.endColumn);
                    if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, viewPosition.column), -1, -1);
                    }
                    else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                        return undefined;
                    }
                    else {
                        if (g.visibleColumn !== -1) {
                            // Don't repeat horizontal lines that use visibleColumn for unrelated lines.
                            return undefined;
                        }
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, this.getMaxColumnOfViewLine(viewLineInfo)), -1, -1);
                    }
                });
                resultPerViewLine.push(result.filter((r) => !!r));
            }
        }
        return resultPerViewLine;
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        // TODO: Use the same code as in `getViewLinesBracketGuides`.
        // Future TODO: Merge with `getViewLinesBracketGuides`.
        // However, this requires more refactoring of indent guides.
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const modelStart = this.convertViewPositionToModelPosition(viewStartLineNumber, this.getViewLineMinColumn(viewStartLineNumber));
        const modelEnd = this.convertViewPositionToModelPosition(viewEndLineNumber, this.getViewLineMaxColumn(viewEndLineNumber));
        let result = [];
        const resultRepeatCount = [];
        const resultRepeatOption = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                const viewLineStartIndex = line.getViewLineNumberOfModelPosition(0, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                const viewLineEndIndex = line.getViewLineNumberOfModelPosition(0, this.model.getLineMaxColumn(modelLineIndex + 1));
                const count = viewLineEndIndex - viewLineStartIndex + 1;
                let option = 0 /* IndentGuideRepeatOption.BlockNone */;
                if (count > 1 && line.getViewLineMinColumn(this.model, modelLineIndex + 1, viewLineEndIndex) === 1) {
                    // wrapped lines should block indent guides
                    option = (viewLineStartIndex === 0 ? 1 /* IndentGuideRepeatOption.BlockSubsequent */ : 2 /* IndentGuideRepeatOption.BlockAll */);
                }
                resultRepeatCount.push(count);
                resultRepeatOption.push(option);
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, 0);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelLineIndex));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelEnd.lineNumber));
            reqStart = null;
        }
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const viewIndents = new Array(viewLineCount);
        let currIndex = 0;
        for (let i = 0, len = result.length; i < len; i++) {
            let value = result[i];
            const count = Math.min(viewLineCount - currIndex, resultRepeatCount[i]);
            const option = resultRepeatOption[i];
            let blockAtIndex;
            if (option === 2 /* IndentGuideRepeatOption.BlockAll */) {
                blockAtIndex = 0;
            }
            else if (option === 1 /* IndentGuideRepeatOption.BlockSubsequent */) {
                blockAtIndex = 1;
            }
            else {
                blockAtIndex = count;
            }
            for (let j = 0; j < count; j++) {
                if (j === blockAtIndex) {
                    value = 0;
                }
                viewIndents[currIndex++] = value;
            }
        }
        return viewIndents;
    }
    getViewLineContent(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineContent(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineLength(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineLength(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMinColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMinColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMaxColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMaxColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineData(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineData(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const start = this.projectedModelLineLineCounts.getIndexOf(viewStartLineNumber - 1);
        let viewLineNumber = viewStartLineNumber;
        const startModelLineIndex = start.index;
        const startRemainder = start.remainder;
        const result = [];
        for (let modelLineIndex = startModelLineIndex, len = this.model.getLineCount(); modelLineIndex < len; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (!line.isVisible()) {
                continue;
            }
            const fromViewLineIndex = (modelLineIndex === startModelLineIndex ? startRemainder : 0);
            let remainingViewLineCount = line.getViewLineCount() - fromViewLineIndex;
            let lastLine = false;
            if (viewLineNumber + remainingViewLineCount > viewEndLineNumber) {
                lastLine = true;
                remainingViewLineCount = viewEndLineNumber - viewLineNumber + 1;
            }
            line.getViewLinesData(this.model, modelLineIndex + 1, fromViewLineIndex, remainingViewLineCount, viewLineNumber - viewStartLineNumber, needed, result);
            viewLineNumber += remainingViewLineCount;
            if (lastLine) {
                break;
            }
        }
        return result;
    }
    validateViewPosition(viewLineNumber, viewColumn, expectedModelPosition) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        const line = this.modelLineProjections[lineIndex];
        const minColumn = line.getViewLineMinColumn(this.model, lineIndex + 1, remainder);
        const maxColumn = line.getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
        if (viewColumn < minColumn) {
            viewColumn = minColumn;
        }
        if (viewColumn > maxColumn) {
            viewColumn = maxColumn;
        }
        const computedModelColumn = line.getModelColumnOfViewPosition(remainder, viewColumn);
        const computedModelPosition = this.model.validatePosition(new Position(lineIndex + 1, computedModelColumn));
        if (computedModelPosition.equals(expectedModelPosition)) {
            return new Position(viewLineNumber, viewColumn);
        }
        return this.convertModelPositionToViewPosition(expectedModelPosition.lineNumber, expectedModelPosition.column);
    }
    validateViewRange(viewRange, expectedModelRange) {
        const validViewStart = this.validateViewPosition(viewRange.startLineNumber, viewRange.startColumn, expectedModelRange.getStartPosition());
        const validViewEnd = this.validateViewPosition(viewRange.endLineNumber, viewRange.endColumn, expectedModelRange.getEndPosition());
        return new Range(validViewStart.lineNumber, validViewStart.column, validViewEnd.lineNumber, validViewEnd.column);
    }
    convertViewPositionToModelPosition(viewLineNumber, viewColumn) {
        const info = this.getViewLineInfo(viewLineNumber);
        const inputColumn = this.modelLineProjections[info.modelLineNumber - 1].getModelColumnOfViewPosition(info.modelLineWrappedLineIdx, viewColumn);
        // console.log('out -> in ' + viewLineNumber + ',' + viewColumn + ' ===> ' + (lineIndex+1) + ',' + inputColumn);
        return this.model.validatePosition(new Position(info.modelLineNumber, inputColumn));
    }
    convertViewRangeToModelRange(viewRange) {
        const start = this.convertViewPositionToModelPosition(viewRange.startLineNumber, viewRange.startColumn);
        const end = this.convertViewPositionToModelPosition(viewRange.endLineNumber, viewRange.endColumn);
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    convertModelPositionToViewPosition(_modelLineNumber, _modelColumn, affinity = 2 /* PositionAffinity.None */, allowZeroLineNumber = false, belowHiddenRanges = false) {
        const validPosition = this.model.validatePosition(new Position(_modelLineNumber, _modelColumn));
        const inputLineNumber = validPosition.lineNumber;
        const inputColumn = validPosition.column;
        let lineIndex = inputLineNumber - 1, lineIndexChanged = false;
        if (belowHiddenRanges) {
            while (lineIndex < this.modelLineProjections.length && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex++;
                lineIndexChanged = true;
            }
        }
        else {
            while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex--;
                lineIndexChanged = true;
            }
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + 1 + ',' + 1);
            // TODO@alexdima@hediet this isn't soo pretty
            return new Position(allowZeroLineNumber ? 0 : 1, 1);
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        let r;
        if (lineIndexChanged) {
            if (belowHiddenRanges) {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, 1, affinity);
            }
            else {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1), affinity);
            }
        }
        else {
            r = this.modelLineProjections[inputLineNumber - 1].getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity);
        }
        // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + r.lineNumber + ',' + r);
        return r;
    }
    /**
     * @param affinity The affinity in case of an empty range. Has no effect for non-empty ranges.
    */
    convertModelRangeToViewRange(modelRange, affinity = 0 /* PositionAffinity.Left */) {
        if (modelRange.isEmpty()) {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, affinity);
            return Range.fromPositions(start);
        }
        else {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, 1 /* PositionAffinity.Right */);
            const end = this.convertModelPositionToViewPosition(modelRange.endLineNumber, modelRange.endColumn, 0 /* PositionAffinity.Left */);
            return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
        }
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        let lineIndex = modelLineNumber - 1;
        if (this.modelLineProjections[lineIndex].isVisible()) {
            // this model line is visible
            const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
            return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, modelColumn);
        }
        // this model line is not visible
        while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            lineIndex--;
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            return 1;
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1));
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelStart = this.convertViewPositionToModelPosition(range.startLineNumber, range.startColumn);
        const modelEnd = this.convertViewPositionToModelPosition(range.endLineNumber, range.endColumn);
        if (modelEnd.lineNumber - modelStart.lineNumber <= range.endLineNumber - range.startLineNumber) {
            // most likely there are no hidden lines => fast path
            // fetch decorations from column 1 to cover the case of wrapped lines that have whole line decorations at column 1
            return this.model.getDecorationsInRange(new Range(modelStart.lineNumber, 1, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations);
        }
        let result = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    const maxLineColumn = this.model.getLineMaxColumn(modelLineIndex);
                    result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelLineIndex, maxLineColumn), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations));
            reqStart = null;
        }
        result.sort((a, b) => {
            const res = Range.compareRangesUsingStarts(a.range, b.range);
            if (res === 0) {
                if (a.id < b.id) {
                    return -1;
                }
                if (a.id > b.id) {
                    return 1;
                }
                return 0;
            }
            return res;
        });
        // Eliminate duplicate decorations that might have intersected our visible ranges multiple times
        const finalResult = [];
        let finalResultLen = 0;
        let prevDecId = null;
        for (const dec of result) {
            const decId = dec.id;
            if (prevDecId === decId) {
                // skip
                continue;
            }
            prevDecId = decId;
            finalResult[finalResultLen++] = dec;
        }
        return finalResult;
    }
    getInjectedTextAt(position) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getInjectedTextAt(info.modelLineWrappedLineIdx, position.column);
    }
    normalizePosition(position, affinity) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].normalizePosition(info.modelLineWrappedLineIdx, position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        const info = this.getViewLineInfo(lineNumber);
        if (info.modelLineWrappedLineIdx === 0) {
            return this.model.getLineIndentColumn(info.modelLineNumber);
        }
        // wrapped lines have no indentation.
        // We deliberately don't handle the case that indentation is wrapped
        // to avoid two view lines reporting indentation for the very same model line.
        return 0;
    }
}
/**
 * Overlapping unsorted ranges:
 * [   )      [ )       [  )
 *    [    )      [       )
 * ->
 * Non overlapping sorted ranges:
 * [       )  [ ) [        )
 *
 * Note: This function only considers line information! Columns are ignored.
*/
function normalizeLineRanges(ranges) {
    if (ranges.length === 0) {
        return [];
    }
    const sortedRanges = ranges.slice();
    sortedRanges.sort(Range.compareRangesUsingStarts);
    const result = [];
    let currentRangeStart = sortedRanges[0].startLineNumber;
    let currentRangeEnd = sortedRanges[0].endLineNumber;
    for (let i = 1, len = sortedRanges.length; i < len; i++) {
        const range = sortedRanges[i];
        if (range.startLineNumber > currentRangeEnd + 1) {
            result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
            currentRangeStart = range.startLineNumber;
            currentRangeEnd = range.endLineNumber;
        }
        else if (range.endLineNumber > currentRangeEnd) {
            currentRangeEnd = range.endLineNumber;
        }
    }
    result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
    return result;
}
/**
 * Represents a view line. Can be used to efficiently query more information about it.
 */
class ViewLineInfo {
    get isWrappedLineContinuation() {
        return this.modelLineWrappedLineIdx > 0;
    }
    constructor(modelLineNumber, modelLineWrappedLineIdx) {
        this.modelLineNumber = modelLineNumber;
        this.modelLineWrappedLineIdx = modelLineWrappedLineIdx;
    }
}
/**
 * A list of view lines that have a contiguous span in the model.
*/
class ViewLineInfoGroupedByModelRange {
    constructor(modelRange, viewLines) {
        this.modelRange = modelRange;
        this.viewLines = viewLines;
    }
}
class CoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._lines.convertViewPositionToModelPosition(viewPosition.lineNumber, viewPosition.column);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._lines.convertViewRangeToModelRange(viewRange);
    }
    validateViewPosition(viewPosition, expectedModelPosition) {
        return this._lines.validateViewPosition(viewPosition.lineNumber, viewPosition.column, expectedModelPosition);
    }
    validateViewRange(viewRange, expectedModelRange) {
        return this._lines.validateViewRange(viewRange, expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition, affinity, allowZero, belowHiddenRanges) {
        return this._lines.convertModelPositionToViewPosition(modelPosition.lineNumber, modelPosition.column, affinity, allowZero, belowHiddenRanges);
    }
    convertModelRangeToViewRange(modelRange, affinity) {
        return this._lines.convertModelRangeToViewRange(modelRange, affinity);
    }
    modelPositionIsVisible(modelPosition) {
        return this._lines.modelPositionIsVisible(modelPosition.lineNumber, modelPosition.column);
    }
    getModelLineViewLineCount(modelLineNumber) {
        return this._lines.getModelLineViewLineCount(modelLineNumber);
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return this._lines.getViewLineNumberOfModelPosition(modelLineNumber, modelColumn);
    }
}
var IndentGuideRepeatOption;
(function (IndentGuideRepeatOption) {
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockNone"] = 0] = "BlockNone";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockSubsequent"] = 1] = "BlockSubsequent";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockAll"] = 2] = "BlockAll";
})(IndentGuideRepeatOption || (IndentGuideRepeatOption = {}));
export class ViewModelLinesFromModelAsIs {
    constructor(model) {
        this.model = model;
    }
    dispose() {
    }
    createCoordinatesConverter() {
        return new IdentityCoordinatesConverter(this.model);
    }
    getHiddenAreas() {
        return [];
    }
    setHiddenAreas(_ranges) {
        return false;
    }
    setTabSize(_newTabSize) {
        return false;
    }
    setWrappingSettings(_fontInfo, _wrappingStrategy, _wrappingColumn, _wrappingIndent) {
        return false;
    }
    createLineBreaksComputer() {
        const result = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                result.push(null);
            },
            finalize: () => {
                return result;
            }
        };
    }
    onModelFlushed() {
    }
    onModelLinesDeleted(_versionId, fromLineNumber, toLineNumber) {
        return new viewEvents.ViewLinesDeletedEvent(fromLineNumber, toLineNumber);
    }
    onModelLinesInserted(_versionId, fromLineNumber, toLineNumber, lineBreaks) {
        return new viewEvents.ViewLinesInsertedEvent(fromLineNumber, toLineNumber);
    }
    onModelLineChanged(_versionId, lineNumber, lineBreakData) {
        return [false, new viewEvents.ViewLinesChangedEvent(lineNumber, 1), null, null];
    }
    acceptVersionId(_versionId) {
    }
    getViewLineCount() {
        return this.model.getLineCount();
    }
    getActiveIndentGuide(viewLineNumber, _minLineNumber, _maxLineNumber) {
        return {
            startLineNumber: viewLineNumber,
            endLineNumber: viewLineNumber,
            indent: 0
        };
    }
    getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition) {
        return new Array(endLineNumber - startLineNumber + 1).fill([]);
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const result = new Array(viewLineCount);
        for (let i = 0; i < viewLineCount; i++) {
            result[i] = 0;
        }
        return result;
    }
    getViewLineContent(viewLineNumber) {
        return this.model.getLineContent(viewLineNumber);
    }
    getViewLineLength(viewLineNumber) {
        return this.model.getLineLength(viewLineNumber);
    }
    getViewLineMinColumn(viewLineNumber) {
        return this.model.getLineMinColumn(viewLineNumber);
    }
    getViewLineMaxColumn(viewLineNumber) {
        return this.model.getLineMaxColumn(viewLineNumber);
    }
    getViewLineData(viewLineNumber) {
        const lineTokens = this.model.tokenization.getLineTokens(viewLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        const lineCount = this.model.getLineCount();
        viewStartLineNumber = Math.min(Math.max(1, viewStartLineNumber), lineCount);
        viewEndLineNumber = Math.min(Math.max(1, viewEndLineNumber), lineCount);
        const result = [];
        for (let lineNumber = viewStartLineNumber; lineNumber <= viewEndLineNumber; lineNumber++) {
            const idx = lineNumber - viewStartLineNumber;
            result[idx] = needed[idx] ? this.getViewLineData(lineNumber) : null;
        }
        return result;
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations) {
        return this.model.getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations);
    }
    normalizePosition(position, affinity) {
        return this.model.normalizePosition(position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        return this.model.getLineIndentColumn(lineNumber);
    }
    getInjectedTextAt(position) {
        // Identity lines collection does not support injected text.
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL3ZpZXdNb2RlbExpbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFJekQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQStDLFdBQVcsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sS0FBSyxVQUFVLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHlCQUF5QixFQUF3QixNQUFNLDBCQUEwQixDQUFDO0FBRTNGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQXlCLDRCQUE0QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUF3Q2pHLE1BQU0sT0FBTyxnQ0FBZ0M7SUF5QjVDLFlBQ0MsUUFBZ0IsRUFDaEIsS0FBaUIsRUFDakIsNEJBQXdELEVBQ3hELGtDQUE4RCxFQUM5RCxRQUFrQixFQUNsQixPQUFlLEVBQ2YsZ0JBQXVDLEVBQ3ZDLGNBQXNCLEVBQ3RCLGNBQThCLEVBQzlCLFNBQStCLEVBQy9CLHNCQUErQjtRQUUvQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FB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