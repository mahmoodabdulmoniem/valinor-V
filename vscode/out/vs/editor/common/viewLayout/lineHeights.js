/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch2 } from '../../../base/common/arrays.js';
import { intersection } from '../../../base/common/collections.js';
export class CustomLine {
    constructor(decorationId, index, lineNumber, specialHeight, prefixSum) {
        this.decorationId = decorationId;
        this.index = index;
        this.lineNumber = lineNumber;
        this.specialHeight = specialHeight;
        this.prefixSum = prefixSum;
        this.maximumSpecialHeight = specialHeight;
        this.deleted = false;
    }
}
/**
 * Manages line heights in the editor with support for custom line heights from decorations.
 *
 * This class maintains an ordered collection of line heights, where each line can have either
 * the default height or a custom height specified by decorations. It supports efficient querying
 * of individual line heights as well as accumulated heights up to a specific line.
 *
 * Line heights are stored in a sorted array for efficient binary search operations. Each line
 * with custom height is represented by a {@link CustomLine} object which tracks its special height,
 * accumulated height prefix sum, and associated decoration ID.
 *
 * The class optimizes performance by:
 * - Using binary search to locate lines in the ordered array
 * - Batching updates through a pending changes mechanism
 * - Computing prefix sums for O(1) accumulated height lookup
 * - Tracking maximum height for lines with multiple decorations
 * - Efficiently handling document changes (line insertions and deletions)
 *
 * When lines are inserted or deleted, the manager updates line numbers and prefix sums
 * for all affected lines. It also handles special cases like decorations that span
 * the insertion/deletion points by re-applying those decorations appropriately.
 *
 * All query operations automatically commit pending changes to ensure consistent results.
 * Clients can modify line heights by adding or removing custom line height decorations,
 * which are tracked by their unique decoration IDs.
 */
export class LineHeightsManager {
    constructor(defaultLineHeight, customLineHeightData) {
        this._decorationIDToCustomLine = new ArrayMap();
        this._orderedCustomLines = [];
        this._pendingSpecialLinesToInsert = [];
        this._invalidIndex = 0;
        this._hasPending = false;
        this._defaultLineHeight = defaultLineHeight;
        if (customLineHeightData.length > 0) {
            for (const data of customLineHeightData) {
                this.insertOrChangeCustomLineHeight(data.decorationId, data.startLineNumber, data.endLineNumber, data.lineHeight);
            }
            this.commit();
        }
    }
    set defaultLineHeight(defaultLineHeight) {
        this._defaultLineHeight = defaultLineHeight;
    }
    get defaultLineHeight() {
        return this._defaultLineHeight;
    }
    removeCustomLineHeight(decorationID) {
        const customLines = this._decorationIDToCustomLine.get(decorationID);
        if (!customLines) {
            return;
        }
        this._decorationIDToCustomLine.delete(decorationID);
        for (const customLine of customLines) {
            customLine.deleted = true;
            this._invalidIndex = Math.min(this._invalidIndex, customLine.index);
        }
        this._hasPending = true;
    }
    insertOrChangeCustomLineHeight(decorationId, startLineNumber, endLineNumber, lineHeight) {
        this.removeCustomLineHeight(decorationId);
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const customLine = new CustomLine(decorationId, -1, lineNumber, lineHeight, 0);
            this._pendingSpecialLinesToInsert.push(customLine);
        }
        this._hasPending = true;
    }
    heightForLineNumber(lineNumber) {
        const searchIndex = this._binarySearchOverOrderedCustomLinesArray(lineNumber);
        if (searchIndex >= 0) {
            return this._orderedCustomLines[searchIndex].maximumSpecialHeight;
        }
        return this._defaultLineHeight;
    }
    getAccumulatedLineHeightsIncludingLineNumber(lineNumber) {
        const searchIndex = this._binarySearchOverOrderedCustomLinesArray(lineNumber);
        if (searchIndex >= 0) {
            return this._orderedCustomLines[searchIndex].prefixSum + this._orderedCustomLines[searchIndex].maximumSpecialHeight;
        }
        if (searchIndex === -1) {
            return this._defaultLineHeight * lineNumber;
        }
        const modifiedIndex = -(searchIndex + 1);
        const previousSpecialLine = this._orderedCustomLines[modifiedIndex - 1];
        return previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (lineNumber - previousSpecialLine.lineNumber);
    }
    onLinesDeleted(fromLineNumber, toLineNumber) {
        const deleteCount = toLineNumber - fromLineNumber + 1;
        const numberOfCustomLines = this._orderedCustomLines.length;
        const candidateStartIndexOfDeletion = this._binarySearchOverOrderedCustomLinesArray(fromLineNumber);
        let startIndexOfDeletion;
        if (candidateStartIndexOfDeletion >= 0) {
            startIndexOfDeletion = candidateStartIndexOfDeletion;
            for (let i = candidateStartIndexOfDeletion - 1; i >= 0; i--) {
                if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                    startIndexOfDeletion--;
                }
                else {
                    break;
                }
            }
        }
        else {
            startIndexOfDeletion = candidateStartIndexOfDeletion === -(numberOfCustomLines + 1) && candidateStartIndexOfDeletion !== -1 ? numberOfCustomLines - 1 : -(candidateStartIndexOfDeletion + 1);
        }
        const candidateEndIndexOfDeletion = this._binarySearchOverOrderedCustomLinesArray(toLineNumber);
        let endIndexOfDeletion;
        if (candidateEndIndexOfDeletion >= 0) {
            endIndexOfDeletion = candidateEndIndexOfDeletion;
            for (let i = candidateEndIndexOfDeletion + 1; i < numberOfCustomLines; i++) {
                if (this._orderedCustomLines[i].lineNumber === toLineNumber) {
                    endIndexOfDeletion++;
                }
                else {
                    break;
                }
            }
        }
        else {
            endIndexOfDeletion = candidateEndIndexOfDeletion === -(numberOfCustomLines + 1) && candidateEndIndexOfDeletion !== -1 ? numberOfCustomLines - 1 : -(candidateEndIndexOfDeletion + 1);
        }
        const isEndIndexBiggerThanStartIndex = endIndexOfDeletion > startIndexOfDeletion;
        const isEndIndexEqualToStartIndexAndCoversCustomLine = endIndexOfDeletion === startIndexOfDeletion
            && this._orderedCustomLines[startIndexOfDeletion]
            && this._orderedCustomLines[startIndexOfDeletion].lineNumber >= fromLineNumber
            && this._orderedCustomLines[startIndexOfDeletion].lineNumber <= toLineNumber;
        if (isEndIndexBiggerThanStartIndex || isEndIndexEqualToStartIndexAndCoversCustomLine) {
            let maximumSpecialHeightOnDeletedInterval = 0;
            for (let i = startIndexOfDeletion; i <= endIndexOfDeletion; i++) {
                maximumSpecialHeightOnDeletedInterval = Math.max(maximumSpecialHeightOnDeletedInterval, this._orderedCustomLines[i].maximumSpecialHeight);
            }
            let prefixSumOnDeletedInterval = 0;
            if (startIndexOfDeletion > 0) {
                const previousSpecialLine = this._orderedCustomLines[startIndexOfDeletion - 1];
                prefixSumOnDeletedInterval = previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (fromLineNumber - previousSpecialLine.lineNumber - 1);
            }
            else {
                prefixSumOnDeletedInterval = fromLineNumber > 0 ? (fromLineNumber - 1) * this._defaultLineHeight : 0;
            }
            const firstSpecialLineDeleted = this._orderedCustomLines[startIndexOfDeletion];
            const lastSpecialLineDeleted = this._orderedCustomLines[endIndexOfDeletion];
            const firstSpecialLineAfterDeletion = this._orderedCustomLines[endIndexOfDeletion + 1];
            const heightOfFirstLineAfterDeletion = firstSpecialLineAfterDeletion && firstSpecialLineAfterDeletion.lineNumber === toLineNumber + 1 ? firstSpecialLineAfterDeletion.maximumSpecialHeight : this._defaultLineHeight;
            const totalHeightDeleted = lastSpecialLineDeleted.prefixSum
                + lastSpecialLineDeleted.maximumSpecialHeight
                - firstSpecialLineDeleted.prefixSum
                + this._defaultLineHeight * (toLineNumber - lastSpecialLineDeleted.lineNumber)
                + this._defaultLineHeight * (firstSpecialLineDeleted.lineNumber - fromLineNumber)
                + heightOfFirstLineAfterDeletion - maximumSpecialHeightOnDeletedInterval;
            const decorationIdsSeen = new Set();
            const newOrderedCustomLines = [];
            const newDecorationIDToSpecialLine = new ArrayMap();
            let numberOfDeletions = 0;
            for (let i = 0; i < this._orderedCustomLines.length; i++) {
                const customLine = this._orderedCustomLines[i];
                if (i < startIndexOfDeletion) {
                    newOrderedCustomLines.push(customLine);
                    newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                }
                else if (i >= startIndexOfDeletion && i <= endIndexOfDeletion) {
                    const decorationId = customLine.decorationId;
                    if (!decorationIdsSeen.has(decorationId)) {
                        customLine.index -= numberOfDeletions;
                        customLine.lineNumber = fromLineNumber;
                        customLine.prefixSum = prefixSumOnDeletedInterval;
                        customLine.maximumSpecialHeight = maximumSpecialHeightOnDeletedInterval;
                        newOrderedCustomLines.push(customLine);
                        newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                    }
                    else {
                        numberOfDeletions++;
                    }
                }
                else if (i > endIndexOfDeletion) {
                    customLine.index -= numberOfDeletions;
                    customLine.lineNumber -= deleteCount;
                    customLine.prefixSum -= totalHeightDeleted;
                    newOrderedCustomLines.push(customLine);
                    newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                }
                decorationIdsSeen.add(customLine.decorationId);
            }
            this._orderedCustomLines = newOrderedCustomLines;
            this._decorationIDToCustomLine = newDecorationIDToSpecialLine;
        }
        else {
            const totalHeightDeleted = deleteCount * this._defaultLineHeight;
            for (let i = endIndexOfDeletion; i < this._orderedCustomLines.length; i++) {
                const customLine = this._orderedCustomLines[i];
                if (customLine.lineNumber > toLineNumber) {
                    customLine.lineNumber -= deleteCount;
                    customLine.prefixSum -= totalHeightDeleted;
                }
            }
        }
    }
    onLinesInserted(fromLineNumber, toLineNumber) {
        const insertCount = toLineNumber - fromLineNumber + 1;
        const candidateStartIndexOfInsertion = this._binarySearchOverOrderedCustomLinesArray(fromLineNumber);
        let startIndexOfInsertion;
        if (candidateStartIndexOfInsertion >= 0) {
            startIndexOfInsertion = candidateStartIndexOfInsertion;
            for (let i = candidateStartIndexOfInsertion - 1; i >= 0; i--) {
                if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                    startIndexOfInsertion--;
                }
                else {
                    break;
                }
            }
        }
        else {
            startIndexOfInsertion = -(candidateStartIndexOfInsertion + 1);
        }
        const toReAdd = [];
        const decorationsImmediatelyAfter = new Set();
        for (let i = startIndexOfInsertion; i < this._orderedCustomLines.length; i++) {
            if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                decorationsImmediatelyAfter.add(this._orderedCustomLines[i].decorationId);
            }
        }
        const decorationsImmediatelyBefore = new Set();
        for (let i = startIndexOfInsertion - 1; i >= 0; i--) {
            if (this._orderedCustomLines[i].lineNumber === fromLineNumber - 1) {
                decorationsImmediatelyBefore.add(this._orderedCustomLines[i].decorationId);
            }
        }
        const decorationsWithGaps = intersection(decorationsImmediatelyBefore, decorationsImmediatelyAfter);
        for (let i = startIndexOfInsertion; i < this._orderedCustomLines.length; i++) {
            this._orderedCustomLines[i].lineNumber += insertCount;
            this._orderedCustomLines[i].prefixSum += this._defaultLineHeight * insertCount;
        }
        if (decorationsWithGaps.size > 0) {
            for (const decorationId of decorationsWithGaps) {
                const decoration = this._decorationIDToCustomLine.get(decorationId);
                if (decoration) {
                    const startLineNumber = decoration.reduce((min, l) => Math.min(min, l.lineNumber), fromLineNumber); // min
                    const endLineNumber = decoration.reduce((max, l) => Math.max(max, l.lineNumber), fromLineNumber); // max
                    const lineHeight = decoration.reduce((max, l) => Math.max(max, l.specialHeight), 0);
                    toReAdd.push({
                        decorationId,
                        startLineNumber,
                        endLineNumber,
                        lineHeight
                    });
                }
            }
            for (const dec of toReAdd) {
                this.insertOrChangeCustomLineHeight(dec.decorationId, dec.startLineNumber, dec.endLineNumber, dec.lineHeight);
            }
            this.commit();
        }
    }
    commit() {
        if (!this._hasPending) {
            return;
        }
        for (const pendingChange of this._pendingSpecialLinesToInsert) {
            const candidateInsertionIndex = this._binarySearchOverOrderedCustomLinesArray(pendingChange.lineNumber);
            const insertionIndex = candidateInsertionIndex >= 0 ? candidateInsertionIndex : -(candidateInsertionIndex + 1);
            this._orderedCustomLines.splice(insertionIndex, 0, pendingChange);
            this._invalidIndex = Math.min(this._invalidIndex, insertionIndex);
        }
        this._pendingSpecialLinesToInsert = [];
        const newDecorationIDToSpecialLine = new ArrayMap();
        const newOrderedSpecialLines = [];
        for (let i = 0; i < this._invalidIndex; i++) {
            const customLine = this._orderedCustomLines[i];
            newOrderedSpecialLines.push(customLine);
            newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
        }
        let numberOfDeletions = 0;
        let previousSpecialLine = (this._invalidIndex > 0) ? newOrderedSpecialLines[this._invalidIndex - 1] : undefined;
        for (let i = this._invalidIndex; i < this._orderedCustomLines.length; i++) {
            const customLine = this._orderedCustomLines[i];
            if (customLine.deleted) {
                numberOfDeletions++;
                continue;
            }
            customLine.index = i - numberOfDeletions;
            if (previousSpecialLine && previousSpecialLine.lineNumber === customLine.lineNumber) {
                customLine.maximumSpecialHeight = previousSpecialLine.maximumSpecialHeight;
                customLine.prefixSum = previousSpecialLine.prefixSum;
            }
            else {
                let maximumSpecialHeight = customLine.specialHeight;
                for (let j = i; j < this._orderedCustomLines.length; j++) {
                    const nextSpecialLine = this._orderedCustomLines[j];
                    if (nextSpecialLine.deleted) {
                        continue;
                    }
                    if (nextSpecialLine.lineNumber !== customLine.lineNumber) {
                        break;
                    }
                    maximumSpecialHeight = Math.max(maximumSpecialHeight, nextSpecialLine.specialHeight);
                }
                customLine.maximumSpecialHeight = maximumSpecialHeight;
                let prefixSum;
                if (previousSpecialLine) {
                    prefixSum = previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (customLine.lineNumber - previousSpecialLine.lineNumber - 1);
                }
                else {
                    prefixSum = this._defaultLineHeight * (customLine.lineNumber - 1);
                }
                customLine.prefixSum = prefixSum;
            }
            previousSpecialLine = customLine;
            newOrderedSpecialLines.push(customLine);
            newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
        }
        this._orderedCustomLines = newOrderedSpecialLines;
        this._decorationIDToCustomLine = newDecorationIDToSpecialLine;
        this._invalidIndex = Infinity;
        this._hasPending = false;
    }
    _binarySearchOverOrderedCustomLinesArray(lineNumber) {
        return binarySearch2(this._orderedCustomLines.length, (index) => {
            const line = this._orderedCustomLines[index];
            if (line.lineNumber === lineNumber) {
                return 0;
            }
            else if (line.lineNumber < lineNumber) {
                return -1;
            }
            else {
                return 1;
            }
        });
    }
}
class ArrayMap {
    constructor() {
        this._map = new Map();
    }
    add(key, value) {
        const array = this._map.get(key);
        if (!array) {
            this._map.set(key, [value]);
        }
        else {
            array.push(value);
        }
    }
    get(key) {
        return this._map.get(key);
    }
    delete(key) {
        this._map.delete(key);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUhlaWdodHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC9saW5lSGVpZ2h0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE1BQU0sT0FBTyxVQUFVO0lBVXRCLFlBQVksWUFBb0IsRUFBRSxLQUFhLEVBQUUsVUFBa0IsRUFBRSxhQUFxQixFQUFFLFNBQWlCO1FBQzVHLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxhQUFhLENBQUM7UUFDMUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F5Qkc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBUzlCLFlBQVksaUJBQXlCLEVBQUUsb0JBQTZDO1FBUDVFLDhCQUF5QixHQUFpQyxJQUFJLFFBQVEsRUFBc0IsQ0FBQztRQUM3Rix3QkFBbUIsR0FBaUIsRUFBRSxDQUFDO1FBQ3ZDLGlDQUE0QixHQUFpQixFQUFFLENBQUM7UUFDaEQsa0JBQWEsR0FBVyxDQUFDLENBQUM7UUFFMUIsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFHcEMsSUFBSSxDQUFD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