/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../../base/common/assert.js';
/**
 * An abstract parser class that is able to parse a sequence of
 * tokens into a new single entity.
 */
export class ParserBase {
    /**
     * Whether the parser object was "consumed" hence must not be used anymore.
     */
    get consumed() {
        return this.isConsumed;
    }
    constructor(
    /**
     * Set of tokens that were accumulated so far.
     */
    currentTokens = []) {
        this.currentTokens = currentTokens;
        /**
         * Whether the parser object was "consumed" and should not be used anymore.
         */
        this.isConsumed = false;
        this.startTokensCount = this.currentTokens.length;
    }
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens() {
        return this.currentTokens;
    }
    /**
     * A helper method that validates that the current parser object was not yet consumed,
     * hence can still be used to accept new tokens in the parsing process.
     *
     * @throws if the parser object is already consumed.
     */
    assertNotConsumed() {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
    }
}
/**
 * Decorator that validates that the current parser object was not yet consumed,
 * hence can still be used to accept new tokens in the parsing process.
 *
 * @throws the resulting decorated method throws if the parser object was already consumed.
 */
export function assertNotConsumed(_target, propertyKey, descriptor) {
    // store the original method reference
    const originalMethod = descriptor.value;
    // validate that the current parser object was not yet consumed
    // before invoking the original accept method
    descriptor.value = function (...args) {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
        return originalMethod.apply(this, args);
    };
    return descriptor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3BhcnNlckJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBdUN2RTs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLFVBQVU7SUFNL0I7O09BRUc7SUFDSCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFPRDtJQUNDOztPQUVHO0lBQ2dCLGdCQUEwQixFQUFFO1FBQTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBckJoRDs7V0FFRztRQUNPLGVBQVUsR0FBWSxLQUFLLENBQUM7UUFvQnJDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUNuRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFZRDs7Ozs7T0FLRztJQUNPLGlCQUFpQjtRQUMxQixNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQ3pCLHVFQUF1RSxDQUN2RSxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE9BQVUsRUFDVixXQUFxQixFQUNyQixVQUE4QjtJQUU5QixzQ0FBc0M7SUFDdEMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztJQUV4QywrREFBK0Q7SUFDL0QsNkNBQTZDO0lBQzdDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFFbEIsR0FBRyxJQUF1QztRQUUxQyxNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQ3pCLHVFQUF1RSxDQUN2RSxDQUFDO1FBRUYsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRixPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDIn0=