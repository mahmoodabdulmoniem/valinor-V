/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColumnRange } from './columnRange.js';
import { Range } from '../range.js';
/**
 * Represents a column range in a single line.
*/
export class RangeSingleLine {
    static fromRange(range) {
        if (range.endLineNumber !== range.startLineNumber) {
            return undefined;
        }
        return new RangeSingleLine(range.startLineNumber, new ColumnRange(range.startColumn, range.endColumn));
    }
    constructor(
    /** 1-based */
    lineNumber, columnRange) {
        this.lineNumber = lineNumber;
        this.columnRange = columnRange;
    }
    toRange() {
        return new Range(this.lineNumber, this.columnRange.startColumn, this.lineNumber, this.columnRange.endColumnExclusive);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VTaW5nbGVMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvcmFuZ2VzL3JhbmdlU2luZ2xlTGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVwQzs7RUFFRTtBQUNGLE1BQU0sT0FBTyxlQUFlO0lBQ3BCLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBWTtRQUNuQyxJQUFJLEtBQUssQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ25ELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN4RyxDQUFDO0lBRUQ7SUFDQyxjQUFjO0lBQ0UsVUFBa0IsRUFDbEIsV0FBd0I7UUFEeEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtJQUNyQyxDQUFDO0lBRUwsT0FBTztRQUNOLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN2SCxDQUFDO0NBQ0QifQ==