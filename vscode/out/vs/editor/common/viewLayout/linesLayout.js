/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { LineHeightsManager } from './lineHeights.js';
class PendingChanges {
    constructor() {
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
    }
    insert(x) {
        this._hasPending = true;
        this._inserts.push(x);
    }
    change(x) {
        this._hasPending = true;
        this._changes.push(x);
    }
    remove(x) {
        this._hasPending = true;
        this._removes.push(x);
    }
    commit(linesLayout) {
        if (!this._hasPending) {
            return;
        }
        const inserts = this._inserts;
        const changes = this._changes;
        const removes = this._removes;
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
        linesLayout._commitPendingChanges(inserts, changes, removes);
    }
}
export class EditorWhitespace {
    constructor(id, afterLineNumber, ordinal, height, minWidth) {
        this.id = id;
        this.afterLineNumber = afterLineNumber;
        this.ordinal = ordinal;
        this.height = height;
        this.minWidth = minWidth;
        this.prefixSum = 0;
    }
}
/**
 * Layouting of objects that take vertical space (by having a height) and push down other objects.
 *
 * These objects are basically either text (lines) or spaces between those lines (whitespaces).
 * This provides commodity operations for working with lines that contain whitespace that pushes lines lower (vertically).
 */
export class LinesLayout {
    static { this.INSTANCE_COUNT = 0; }
    constructor(lineCount, defaultLineHeight, paddingTop, paddingBottom, customLineHeightData) {
        this._instanceId = strings.singleLetterHash(++LinesLayout.INSTANCE_COUNT);
        this._pendingChanges = new PendingChanges();
        this._lastWhitespaceId = 0;
        this._arr = [];
        this._prefixSumValidIndex = -1;
        this._minWidth = -1; /* marker for not being computed */
        this._lineCount = lineCount;
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
        this._lineHeightsManager = new LineHeightsManager(defaultLineHeight, customLineHeightData);
    }
    /**
     * Find the insertion index for a new value inside a sorted array of values.
     * If the value is already present in the sorted array, the insertion index will be after the already existing value.
     */
    static findInsertionIndex(arr, afterLineNumber, ordinal) {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = ((low + high) >>> 1);
            if (afterLineNumber === arr[mid].afterLineNumber) {
                if (ordinal < arr[mid].ordinal) {
                    high = mid;
                }
                else {
                    low = mid + 1;
                }
            }
            else if (afterLineNumber < arr[mid].afterLineNumber) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low;
    }
    /**
     * Change the height of a line in pixels.
     */
    setDefaultLineHeight(lineHeight) {
        this._lineHeightsManager.defaultLineHeight = lineHeight;
    }
    /**
     * Changes the padding used to calculate vertical offsets.
     */
    setPadding(paddingTop, paddingBottom) {
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
    }
    /**
     * Set the number of lines.
     *
     * @param lineCount New number of lines.
     */
    onFlushed(lineCount, customLineHeightData) {
        this._lineCount = lineCount;
        this._lineHeightsManager = new LineHeightsManager(this._lineHeightsManager.defaultLineHeight, customLineHeightData);
    }
    changeLineHeights(callback) {
        let hadAChange = false;
        try {
            const accessor = {
                insertOrChangeCustomLineHeight: (decorationId, startLineNumber, endLineNumber, lineHeight) => {
                    hadAChange = true;
                    this._lineHeightsManager.insertOrChangeCustomLineHeight(decorationId, startLineNumber, endLineNumber, lineHeight);
                },
                removeCustomLineHeight: (decorationId) => {
                    hadAChange = true;
                    this._lineHeightsManager.removeCustomLineHeight(decorationId);
                }
            };
            callback(accessor);
        }
        finally {
            this._lineHeightsManager.commit();
        }
        return hadAChange;
    }
    changeWhitespace(callback) {
        let hadAChange = false;
        try {
            const accessor = {
                insertWhitespace: (afterLineNumber, ordinal, heightInPx, minWidth) => {
                    hadAChange = true;
                    afterLineNumber = afterLineNumber | 0;
                    ordinal = ordinal | 0;
                    heightInPx = heightInPx | 0;
                    minWidth = minWidth | 0;
                    const id = this._instanceId + (++this._lastWhitespaceId);
                    this._pendingChanges.insert(new EditorWhitespace(id, afterLineNumber, ordinal, heightInPx, minWidth));
                    return id;
                },
                changeOneWhitespace: (id, newAfterLineNumber, newHeight) => {
                    hadAChange = true;
                    newAfterLineNumber = newAfterLineNumber | 0;
                    newHeight = newHeight | 0;
                    this._pendingChanges.change({ id, newAfterLineNumber, newHeight });
                },
                removeWhitespace: (id) => {
                    hadAChange = true;
                    this._pendingChanges.remove({ id });
                }
            };
            callback(accessor);
        }
        finally {
            this._pendingChanges.commit(this);
        }
        return hadAChange;
    }
    _commitPendingChanges(inserts, changes, removes) {
        if (inserts.length > 0 || removes.length > 0) {
            this._minWidth = -1; /* marker for not being computed */
        }
        if (inserts.length + changes.length + removes.length <= 1) {
            // when only one thing happened, handle it "delicately"
            for (const insert of inserts) {
                this._insertWhitespace(insert);
            }
            for (const change of changes) {
                this._changeOneWhitespace(change.id, change.newAfterLineNumber, change.newHeight);
            }
            for (const remove of removes) {
                const index = this._findWhitespaceIndex(remove.id);
                if (index === -1) {
                    continue;
                }
                this._removeWhitespace(index);
            }
            return;
        }
        // simply rebuild the entire datastructure
        const toRemove = new Set();
        for (const remove of removes) {
            toRemove.add(remove.id);
        }
        const toChange = new Map();
        for (const change of changes) {
            toChange.set(change.id, change);
        }
        const applyRemoveAndChange = (whitespaces) => {
            const result = [];
            for (const whitespace of whitespaces) {
                if (toRemove.has(whitespace.id)) {
                    continue;
                }
                if (toChange.has(whitespace.id)) {
                    const change = toChange.get(whitespace.id);
                    whitespace.afterLineNumber = change.newAfterLineNumber;
                    whitespace.height = change.newHeight;
                }
                result.push(whitespace);
            }
            return result;
        };
        const result = applyRemoveAndChange(this._arr).concat(applyRemoveAndChange(inserts));
        result.sort((a, b) => {
            if (a.afterLineNumber === b.afterLineNumber) {
                return a.ordinal - b.ordinal;
            }
            return a.afterLineNumber - b.afterLineNumber;
        });
        this._arr = result;
        this._prefixSumValidIndex = -1;
    }
    _insertWhitespace(whitespace) {
        const insertIndex = LinesLayout.findInsertionIndex(this._arr, whitespace.afterLineNumber, whitespace.ordinal);
        this._arr.splice(insertIndex, 0, whitespace);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, insertIndex - 1);
    }
    _findWhitespaceIndex(id) {
        const arr = this._arr;
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i].id === id) {
                return i;
            }
        }
        return -1;
    }
    _changeOneWhitespace(id, newAfterLineNumber, newHeight) {
        const index = this._findWhitespaceIndex(id);
        if (index === -1) {
            return;
        }
        if (this._arr[index].height !== newHeight) {
            this._arr[index].height = newHeight;
            this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, index - 1);
        }
        if (this._arr[index].afterLineNumber !== newAfterLineNumber) {
            // `afterLineNumber` changed for this whitespace
            // Record old whitespace
            const whitespace = this._arr[index];
            // Since changing `afterLineNumber` can trigger a reordering, we're gonna remove this whitespace
            this._removeWhitespace(index);
            whitespace.afterLineNumber = newAfterLineNumber;
            // And add it again
            this._insertWhitespace(whitespace);
        }
    }
    _removeWhitespace(removeIndex) {
        this._arr.splice(removeIndex, 1);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, removeIndex - 1);
    }
    /**
     * Notify the layouter that lines have been deleted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the deletion started, inclusive
     * @param toLineNumber The line number at which the deletion ended, inclusive
     */
    onLinesDeleted(fromLineNumber, toLineNumber) {
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount -= (toLineNumber - fromLineNumber + 1);
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber && afterLineNumber <= toLineNumber) {
                // The line this whitespace was after has been deleted
                //  => move whitespace to before first deleted line
                this._arr[i].afterLineNumber = fromLineNumber - 1;
            }
            else if (afterLineNumber > toLineNumber) {
                // The line this whitespace was after has been moved up
                //  => move whitespace up
                this._arr[i].afterLineNumber -= (toLineNumber - fromLineNumber + 1);
            }
        }
        this._lineHeightsManager.onLinesDeleted(fromLineNumber, toLineNumber);
    }
    /**
     * Notify the layouter that lines have been inserted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the insertion started, inclusive
     * @param toLineNumber The line number at which the insertion ended, inclusive.
     */
    onLinesInserted(fromLineNumber, toLineNumber) {
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount += (toLineNumber - fromLineNumber + 1);
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber) {
                this._arr[i].afterLineNumber += (toLineNumber - fromLineNumber + 1);
            }
        }
        this._lineHeightsManager.onLinesInserted(fromLineNumber, toLineNumber);
    }
    /**
     * Get the sum of all the whitespaces.
     */
    getWhitespacesTotalHeight() {
        if (this._arr.length === 0) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(this._arr.length - 1);
    }
    /**
     * Return the sum of the heights of the whitespaces at [0..index].
     * This includes the whitespace at `index`.
     *
     * @param index The index of the whitespace.
     * @return The sum of the heights of all whitespaces before the one at `index`, including the one at `index`.
     */
    getWhitespacesAccumulatedHeight(index) {
        index = index | 0;
        let startIndex = Math.max(0, this._prefixSumValidIndex + 1);
        if (startIndex === 0) {
            this._arr[0].prefixSum = this._arr[0].height;
            startIndex++;
        }
        for (let i = startIndex; i <= index; i++) {
            this._arr[i].prefixSum = this._arr[i - 1].prefixSum + this._arr[i].height;
        }
        this._prefixSumValidIndex = Math.max(this._prefixSumValidIndex, index);
        return this._arr[index].prefixSum;
    }
    /**
     * Get the sum of heights for all objects.
     *
     * @return The sum of heights for all objects.
     */
    getLinesTotalHeight() {
        const linesHeight = this._lineHeightsManager.getAccumulatedLineHeightsIncludingLineNumber(this._lineCount);
        const whitespacesHeight = this.getWhitespacesTotalHeight();
        return linesHeight + whitespacesHeight + this._paddingTop + this._paddingBottom;
    }
    /**
     * Returns the accumulated height of whitespaces before the given line number.
     *
     * @param lineNumber The line number
     */
    getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        if (lastWhitespaceBeforeLineNumber === -1) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(lastWhitespaceBeforeLineNumber);
    }
    _findLastWhitespaceBeforeLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        // Find the whitespace before line number
        const arr = this._arr;
        let low = 0;
        let high = arr.length - 1;
        while (low <= high) {
            const delta = (high - low) | 0;
            const halfDelta = (delta / 2) | 0;
            const mid = (low + halfDelta) | 0;
            if (arr[mid].afterLineNumber < lineNumber) {
                if (mid + 1 >= arr.length || arr[mid + 1].afterLineNumber >= lineNumber) {
                    return mid;
                }
                else {
                    low = (mid + 1) | 0;
                }
            }
            else {
                high = (mid - 1) | 0;
            }
        }
        return -1;
    }
    _findFirstWhitespaceAfterLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        const firstWhitespaceAfterLineNumber = lastWhitespaceBeforeLineNumber + 1;
        if (firstWhitespaceAfterLineNumber < this._arr.length) {
            return firstWhitespaceAfterLineNumber;
        }
        return -1;
    }
    /**
     * Find the index of the first whitespace which has `afterLineNumber` >= `lineNumber`.
     * @return The index of the first whitespace with `afterLineNumber` >= `lineNumber` or -1 if no whitespace is found.
     */
    getFirstWhitespaceIndexAfterLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        return this._findFirstWhitespaceAfterLineNumber(lineNumber);
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        lineNumber = lineNumber | 0;
        let previousLinesHeight;
        if (lineNumber > 1) {
            previousLinesHeight = this._lineHeightsManager.getAccumulatedLineHeightsIncludingLineNumber(lineNumber - 1);
        }
        else {
            previousLinesHeight = 0;
        }
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber - (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    getLineHeightForLineNumber(lineNumber) {
        return this._lineHeightsManager.heightForLineNumber(lineNumber);
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number and also the line height of the line.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        lineNumber = lineNumber | 0;
        const previousLinesHeight = this._lineHeightsManager.getAccumulatedLineHeightsIncludingLineNumber(lineNumber);
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber + (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    /**
     * Returns if there is any whitespace in the document.
     */
    hasWhitespace() {
        return this.getWhitespacesCount() > 0;
    }
    /**
     * The maximum min width for all whitespaces.
     */
    getWhitespaceMinWidth() {
        if (this._minWidth === -1) {
            let minWidth = 0;
            for (let i = 0, len = this._arr.length; i < len; i++) {
                minWidth = Math.max(minWidth, this._arr[i].minWidth);
            }
            this._minWidth = minWidth;
        }
        return this._minWidth;
    }
    /**
     * Check if `verticalOffset` is below all lines.
     */
    isAfterLines(verticalOffset) {
        const totalHeight = this.getLinesTotalHeight();
        return verticalOffset > totalHeight;
    }
    isInTopPadding(verticalOffset) {
        if (this._paddingTop === 0) {
            return false;
        }
        return (verticalOffset < this._paddingTop);
    }
    isInBottomPadding(verticalOffset) {
        if (this._paddingBottom === 0) {
            return false;
        }
        const totalHeight = this.getLinesTotalHeight();
        return (verticalOffset >= totalHeight - this._paddingBottom);
    }
    /**
     * Find the first line number that is at or after vertical offset `verticalOffset`.
     * i.e. if getVerticalOffsetForLine(line) is x and getVerticalOffsetForLine(line + 1) is y, then
     * getLineNumberAtOrAfterVerticalOffset(i) = line, x <= i < y.
     *
     * @param verticalOffset The vertical offset to search at.
     * @return The line number at or after vertical offset `verticalOffset`.
     */
    getLineNumberAtOrAfterVerticalOffset(verticalOffset) {
        verticalOffset = verticalOffset | 0;
        if (verticalOffset < 0) {
            return 1;
        }
        const linesCount = this._lineCount | 0;
        let minLineNumber = 1;
        let maxLineNumber = linesCount;
        while (minLineNumber < maxLineNumber) {
            const midLineNumber = ((minLineNumber + maxLineNumber) / 2) | 0;
            const lineHeight = this.getLineHeightForLineNumber(midLineNumber);
            const midLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(midLineNumber) | 0;
            if (verticalOffset >= midLineNumberVerticalOffset + lineHeight) {
                // vertical offset is after mid line number
                minLineNumber = midLineNumber + 1;
            }
            else if (verticalOffset >= midLineNumberVerticalOffset) {
                // Hit
                return midLineNumber;
            }
            else {
                // vertical offset is before mid line number, but mid line number could still be what we're searching for
                maxLineNumber = midLineNumber;
            }
        }
        if (minLineNumber > linesCount) {
            return linesCount;
        }
        return minLineNumber;
    }
    /**
     * Get all the lines and their relative vertical offsets that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return A structure describing the lines positioned between `verticalOffset1` and `verticalOffset2`.
     */
    getLinesViewportData(verticalOffset1, verticalOffset2) {
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        // Find first line number
        // We don't live in a perfect world, so the line number might start before or after verticalOffset1
        const startLineNumber = this.getLineNumberAtOrAfterVerticalOffset(verticalOffset1) | 0;
        const startLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(startLineNumber) | 0;
        let endLineNumber = this._lineCount | 0;
        // Also keep track of what whitespace we've got
        let whitespaceIndex = this.getFirstWhitespaceIndexAfterLineNumber(startLineNumber) | 0;
        const whitespaceCount = this.getWhitespacesCount() | 0;
        let currentWhitespaceHeight;
        let currentWhitespaceAfterLineNumber;
        if (whitespaceIndex === -1) {
            whitespaceIndex = whitespaceCount;
            currentWhitespaceAfterLineNumber = endLineNumber + 1;
            currentWhitespaceHeight = 0;
        }
        else {
            currentWhitespaceAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
            currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
        }
        let currentVerticalOffset = startLineNumberVerticalOffset;
        let currentLineRelativeOffset = currentVerticalOffset;
        // IE (all versions) cannot handle units above about 1,533,908 px, so every 500k pixels bring numbers down
        const STEP_SIZE = 500000;
        let bigNumbersDelta = 0;
        if (startLineNumberVerticalOffset >= STEP_SIZE) {
            // Compute a delta that guarantees that lines are positioned at `lineHeight` increments
            bigNumbersDelta = Math.floor(startLineNumberVerticalOffset / STEP_SIZE) * STEP_SIZE;
            bigNumbersDelta = Math.floor(bigNumbersDelta / this._lineHeightsManager.defaultLineHeight) * this._lineHeightsManager.defaultLineHeight;
            currentLineRelativeOffset -= bigNumbersDelta;
        }
        const linesOffsets = [];
        const verticalCenter = verticalOffset1 + (verticalOffset2 - verticalOffset1) / 2;
        let centeredLineNumber = -1;
        // Figure out how far the lines go
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineHeight = this.getLineHeightForLineNumber(lineNumber);
            if (centeredLineNumber === -1) {
                const currentLineTop = currentVerticalOffset;
                const currentLineBottom = currentVerticalOffset + lineHeight;
                if ((currentLineTop <= verticalCenter && verticalCenter < currentLineBottom) || currentLineTop > verticalCenter) {
                    centeredLineNumber = lineNumber;
                }
            }
            // Count current line height in the vertical offsets
            currentVerticalOffset += lineHeight;
            linesOffsets[lineNumber - startLineNumber] = currentLineRelativeOffset;
            // Next line starts immediately after this one
            currentLineRelativeOffset += lineHeight;
            while (currentWhitespaceAfterLineNumber === lineNumber) {
                // Push down next line with the height of the current whitespace
                currentLineRelativeOffset += currentWhitespaceHeight;
                // Count current whitespace in the vertical offsets
                currentVerticalOffset += currentWhitespaceHeight;
                whitespaceIndex++;
                if (whitespaceIndex >= whitespaceCount) {
                    currentWhitespaceAfterLineNumber = endLineNumber + 1;
                }
                else {
                    currentWhitespaceAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
                    currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
                }
            }
            if (currentVerticalOffset >= verticalOffset2) {
                // We have covered the entire viewport area, time to stop
                endLineNumber = lineNumber;
                break;
            }
        }
        if (centeredLineNumber === -1) {
            centeredLineNumber = endLineNumber;
        }
        const endLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(endLineNumber) | 0;
        let completelyVisibleStartLineNumber = startLineNumber;
        let completelyVisibleEndLineNumber = endLineNumber;
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            if (startLineNumberVerticalOffset < verticalOffset1) {
                completelyVisibleStartLineNumber++;
            }
        }
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            const endLineHeight = this.getLineHeightForLineNumber(endLineNumber);
            if (endLineNumberVerticalOffset + endLineHeight > verticalOffset2) {
                completelyVisibleEndLineNumber--;
            }
        }
        return {
            bigNumbersDelta: bigNumbersDelta,
            startLineNumber: startLineNumber,
            endLineNumber: endLineNumber,
            relativeVerticalOffset: linesOffsets,
            centeredLineNumber: centeredLineNumber,
            completelyVisibleStartLineNumber: completelyVisibleStartLineNumber,
            completelyVisibleEndLineNumber: completelyVisibleEndLineNumber,
            lineHeight: this._lineHeightsManager.defaultLineHeight,
        };
    }
    getVerticalOffsetForWhitespaceIndex(whitespaceIndex) {
        whitespaceIndex = whitespaceIndex | 0;
        const afterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex);
        let previousLinesHeight;
        if (afterLineNumber >= 1) {
            previousLinesHeight = this._lineHeightsManager.getAccumulatedLineHeightsIncludingLineNumber(afterLineNumber);
        }
        else {
            previousLinesHeight = 0;
        }
        let previousWhitespacesHeight;
        if (whitespaceIndex > 0) {
            previousWhitespacesHeight = this.getWhitespacesAccumulatedHeight(whitespaceIndex - 1);
        }
        else {
            previousWhitespacesHeight = 0;
        }
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset) {
        verticalOffset = verticalOffset | 0;
        let minWhitespaceIndex = 0;
        let maxWhitespaceIndex = this.getWhitespacesCount() - 1;
        if (maxWhitespaceIndex < 0) {
            return -1;
        }
        // Special case: nothing to be found
        const maxWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(maxWhitespaceIndex);
        const maxWhitespaceHeight = this.getHeightForWhitespaceIndex(maxWhitespaceIndex);
        if (verticalOffset >= maxWhitespaceVerticalOffset + maxWhitespaceHeight) {
            return -1;
        }
        while (minWhitespaceIndex < maxWhitespaceIndex) {
            const midWhitespaceIndex = Math.floor((minWhitespaceIndex + maxWhitespaceIndex) / 2);
            const midWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(midWhitespaceIndex);
            const midWhitespaceHeight = this.getHeightForWhitespaceIndex(midWhitespaceIndex);
            if (verticalOffset >= midWhitespaceVerticalOffset + midWhitespaceHeight) {
                // vertical offset is after whitespace
                minWhitespaceIndex = midWhitespaceIndex + 1;
            }
            else if (verticalOffset >= midWhitespaceVerticalOffset) {
                // Hit
                return midWhitespaceIndex;
            }
            else {
                // vertical offset is before whitespace, but midWhitespaceIndex might still be what we're searching for
                maxWhitespaceIndex = midWhitespaceIndex;
            }
        }
        return minWhitespaceIndex;
    }
    /**
     * Get exactly the whitespace that is layouted at `verticalOffset`.
     *
     * @param verticalOffset The vertical offset.
     * @return Precisely the whitespace that is layouted at `verticaloffset` or null.
     */
    getWhitespaceAtVerticalOffset(verticalOffset) {
        verticalOffset = verticalOffset | 0;
        const candidateIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset);
        if (candidateIndex < 0) {
            return null;
        }
        if (candidateIndex >= this.getWhitespacesCount()) {
            return null;
        }
        const candidateTop = this.getVerticalOffsetForWhitespaceIndex(candidateIndex);
        if (candidateTop > verticalOffset) {
            return null;
        }
        const candidateHeight = this.getHeightForWhitespaceIndex(candidateIndex);
        const candidateId = this.getIdForWhitespaceIndex(candidateIndex);
        const candidateAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(candidateIndex);
        return {
            id: candidateId,
            afterLineNumber: candidateAfterLineNumber,
            verticalOffset: candidateTop,
            height: candidateHeight
        };
    }
    /**
     * Get a list of whitespaces that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return An array with all the whitespaces in the viewport. If no whitespace is in viewport, the array is empty.
     */
    getWhitespaceViewportData(verticalOffset1, verticalOffset2) {
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        const startIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset1);
        const endIndex = this.getWhitespacesCount() - 1;
        if (startIndex < 0) {
            return [];
        }
        const result = [];
        for (let i = startIndex; i <= endIndex; i++) {
            const top = this.getVerticalOffsetForWhitespaceIndex(i);
            const height = this.getHeightForWhitespaceIndex(i);
            if (top >= verticalOffset2) {
                break;
            }
            result.push({
                id: this.getIdForWhitespaceIndex(i),
                afterLineNumber: this.getAfterLineNumberForWhitespaceIndex(i),
                verticalOffset: top,
                height: height
            });
        }
        return result;
    }
    /**
     * Get all whitespaces.
     */
    getWhitespaces() {
        return this._arr.slice(0);
    }
    /**
     * The number of whitespaces.
     */
    getWhitespacesCount() {
        return this._arr.length;
    }
    /**
     * Get the `id` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `id` of whitespace at `index`.
     */
    getIdForWhitespaceIndex(index) {
        index = index | 0;
        return this._arr[index].id;
    }
    /**
     * Get the `afterLineNumber` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `afterLineNumber` of whitespace at `index`.
     */
    getAfterLineNumberForWhitespaceIndex(index) {
        index = index | 0;
        return this._arr[index].afterLineNumber;
    }
    /**
     * Get the `height` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `height` of whitespace at `index`.
     */
    getHeightForWhitespaceIndex(index) {
        index = index | 0;
        return this._arr[index].height;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC9saW5lc0xheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBeUIsa0JBQWtCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUs3RSxNQUFNLGNBQWM7SUFNbkI7UUFDQyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRU0sTUFBTSxDQUFDLENBQW1CO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxNQUFNLENBQUMsQ0FBaUI7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxDQUFpQjtRQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQXdCO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTztR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