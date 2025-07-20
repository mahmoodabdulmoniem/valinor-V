/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
import { Range } from '../range.js';
/**
 * Represents a 1-based range of columns.
 * Use {@lik OffsetRange} to represent a 0-based range.
*/
export class ColumnRange {
    static fromOffsetRange(offsetRange) {
        return new ColumnRange(offsetRange.start + 1, offsetRange.endExclusive + 1);
    }
    constructor(
    /** 1-based */
    startColumn, endColumnExclusive) {
        this.startColumn = startColumn;
        this.endColumnExclusive = endColumnExclusive;
        if (startColumn > endColumnExclusive) {
            throw new BugIndicatingError(`startColumn ${startColumn} cannot be after endColumnExclusive ${endColumnExclusive}`);
        }
    }
    toRange(lineNumber) {
        return new Range(lineNumber, this.startColumn, lineNumber, this.endColumnExclusive);
    }
    equals(other) {
        return this.startColumn === other.startColumn
            && this.endColumnExclusive === other.endColumnExclusive;
    }
    toZeroBasedOffsetRange() {
        return new OffsetRange(this.startColumn - 1, this.endColumnExclusive - 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sdW1uUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9yYW5nZXMvY29sdW1uUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFcEM7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLFdBQVc7SUFDaEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUF3QjtRQUNyRCxPQUFPLElBQUksV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVEO0lBQ0MsY0FBYztJQUNFLFdBQW1CLEVBQ25CLGtCQUEwQjtRQUQxQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFFMUMsSUFBSSxXQUFXLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksa0JBQWtCLENBQUMsZUFBZSxXQUFXLHVDQUF1QyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDckgsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsVUFBa0I7UUFDekIsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFrQjtRQUN4QixPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssS0FBSyxDQUFDLFdBQVc7ZUFDekMsSUFBSSxDQUFDLGtCQUFrQixLQUFLLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztJQUMxRCxDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7Q0FDRCJ9