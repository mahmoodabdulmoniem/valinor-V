/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * All prompt variables start with `#` character.
 */
const START_CHARACTER = '#';
/**
 * Character that separates name of a prompt variable from its data.
 */
const DATA_SEPARATOR = ':';
/**
 * Represents a `#variable` token in a prompt text.
 */
export class PromptVariable extends PromptToken {
    constructor(range, 
    /**
     * The name of a prompt variable, excluding the `#` character at the start.
     */
    name) {
        super(range);
        this.name = name;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}`;
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
/**
 * Represents a {@link PromptVariable} with additional data token in a prompt text.
 * (e.g., `#variable:/path/to/file.md`)
 */
export class PromptVariableWithData extends PromptVariable {
    constructor(fullRange, 
    /**
     * The name of the variable, excluding the starting `#` character.
     */
    name, 
    /**
     * The data of the variable, excluding the starting {@link DATA_SEPARATOR} character.
     */
    data) {
        super(fullRange, name);
        this.data = data;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}${DATA_SEPARATOR}${this.data}`;
    }
    /**
     * Range of the `data` part of the variable.
     */
    get dataRange() {
        const { range } = this;
        // calculate the start column number of the `data` part of the variable
        const dataStartColumn = range.startColumn +
            START_CHARACTER.length + this.name.length +
            DATA_SEPARATOR.length;
        // create `range` of the `data` part of the variable
        const result = new Range(range.startLineNumber, dataStartColumn, range.endLineNumber, range.endColumn);
        // if the resulting range is empty, return `undefined`
        // because there is no `data` part present in the variable
        if (result.isEmpty()) {
            return undefined;
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL3Byb21wdFZhcmlhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFakY7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBVyxHQUFHLENBQUM7QUFFcEM7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBVyxHQUFHLENBQUM7QUFFbkM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQVc7SUFDOUMsWUFDQyxLQUFZO0lBQ1o7O09BRUc7SUFDYSxJQUFZO1FBRzVCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUhHLFNBQUksR0FBSixJQUFJLENBQVE7SUFJN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxHQUFHLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGNBQWM7SUFDekQsWUFDQyxTQUFnQjtJQUNoQjs7T0FFRztJQUNILElBQVk7SUFFWjs7T0FFRztJQUNhLElBQVk7UUFFNUIsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUZQLFNBQUksR0FBSixJQUFJLENBQVE7SUFHN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLEdBQUcsZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN0RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFNBQVM7UUFDbkIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2Qix1RUFBdUU7UUFDdkUsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLFdBQVc7WUFDeEMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDekMsY0FBYyxDQUFDLE1BQU0sQ0FBQztRQUV2QixvREFBb0Q7UUFDcEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQ3ZCLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLGVBQWUsRUFDZixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsU0FBUyxDQUNmLENBQUM7UUFFRixzREFBc0Q7UUFDdEQsMERBQTBEO1FBQzFELElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEIn0=