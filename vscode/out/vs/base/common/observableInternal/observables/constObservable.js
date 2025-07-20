/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConvenientObservable } from './baseObservable.js';
/**
 * Represents an efficient observable whose value never changes.
 */
export function constObservable(value) {
    return new ConstObservable(value);
}
class ConstObservable extends ConvenientObservable {
    constructor(value) {
        super();
        this.value = value;
    }
    get debugName() {
        return this.toString();
    }
    get() {
        return this.value;
    }
    addObserver(observer) {
        // NO OP
    }
    removeObserver(observer) {
        // NO OP
    }
    log() {
        return this;
    }
    toString() {
        return `Const: ${this.value}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RPYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvb2JzZXJ2YWJsZXMvY29uc3RPYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTNEOztHQUVHO0FBRUgsTUFBTSxVQUFVLGVBQWUsQ0FBSSxLQUFRO0lBQzFDLE9BQU8sSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUNELE1BQU0sZUFBbUIsU0FBUSxvQkFBNkI7SUFDN0QsWUFBNkIsS0FBUTtRQUNwQyxLQUFLLEVBQUUsQ0FBQztRQURvQixVQUFLLEdBQUwsS0FBSyxDQUFHO0lBRXJDLENBQUM7SUFFRCxJQUFvQixTQUFTO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxHQUFHO1FBQ1QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFDTSxXQUFXLENBQUMsUUFBbUI7UUFDckMsUUFBUTtJQUNULENBQUM7SUFDTSxjQUFjLENBQUMsUUFBbUI7UUFDeEMsUUFBUTtJQUNULENBQUM7SUFFUSxHQUFHO1FBQ1gsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLFVBQVUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRCJ9