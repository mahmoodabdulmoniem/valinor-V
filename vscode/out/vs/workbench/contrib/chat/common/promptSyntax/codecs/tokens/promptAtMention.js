/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { INVALID_NAME_CHARACTERS, STOP_CHARACTERS } from '../parsers/promptVariableParser.js';
/**
 * All prompt at-mentions start with `@` character.
 */
const START_CHARACTER = '@';
/**
 * Represents a `@mention` token in a prompt text.
 */
export class PromptAtMention extends PromptToken {
    constructor(range, 
    /**
     * The name of a mention, excluding the `@` character at the start.
     */
    name) {
        // sanity check of characters used in the provided mention name
        for (const character of name) {
            assert((INVALID_NAME_CHARACTERS.includes(character) === false) &&
                (STOP_CHARACTERS.includes(character) === false), `Mention 'name' cannot contain character '${character}', got '${name}'.`);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXRNZW50aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9wcm9tcHRBdE1lbnRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFOUY7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBVyxHQUFHLENBQUM7QUFFcEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO0lBQy9DLFlBQ0MsS0FBWTtJQUNaOztPQUVHO0lBQ2EsSUFBWTtRQUU1QiwrREFBK0Q7UUFDL0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQ0wsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDO2dCQUN2RCxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQy9DLDRDQUE0QyxTQUFTLFdBQVcsSUFBSSxJQUFJLENBQ3hFLENBQUM7UUFDSCxDQUFDO1FBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBWEcsU0FBSSxHQUFKLElBQUksQ0FBUTtJQVk3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLEdBQUcsZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0NBQ0QifQ==