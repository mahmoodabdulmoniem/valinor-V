/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
/**
 * All prompt at-mentions start with `/` character.
 */
const START_CHARACTER = '/';
/**
 * Represents a `/command` token in a prompt text.
 */
export class PromptSlashCommand extends PromptToken {
    constructor(range, 
    /**
     * The name of a command, excluding the `/` character at the start.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0U2xhc2hDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9wcm9tcHRTbGFzaENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRy9DOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQVcsR0FBRyxDQUFDO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFdBQVc7SUFDbEQsWUFDQyxLQUFZO0lBQ1o7O09BRUc7SUFDYSxJQUFZO1FBRzVCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUhHLFNBQUksR0FBSixJQUFJLENBQVE7SUFJN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxHQUFHLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNEIn0=