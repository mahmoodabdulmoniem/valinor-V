/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEquals, BugIndicatingError } from '../commonFacade/deps.js';
import { subtransaction } from '../transaction.js';
import { DebugNameData } from '../debugName.js';
import { DerivedWithSetter } from '../observables/derivedImpl.js';
/**
 * Creates an observable value that is based on values and changes from other observables.
 * Additionally, a reducer can report how that state changed.
*/
export function observableReducer(owner, options) {
    return observableReducerSettable(owner, options);
}
/**
 * Creates an observable value that is based on values and changes from other observables.
 * Additionally, a reducer can report how that state changed.
*/
export function observableReducerSettable(owner, options) {
    let prevValue = undefined;
    let hasValue = false;
    const d = new DerivedWithSetter(new DebugNameData(owner, undefined, options.update), (reader, changeSummary) => {
        if (!hasValue) {
            prevValue = options.initial instanceof Function ? options.initial() : options.initial;
            hasValue = true;
        }
        const newValue = options.update(reader, prevValue, changeSummary);
        prevValue = newValue;
        return newValue;
    }, options.changeTracker, () => {
        if (hasValue) {
            options.disposeFinal?.(prevValue);
            hasValue = false;
        }
    }, options.equalityComparer ?? strictEquals, (value, tx, change) => {
        if (!hasValue) {
            throw new BugIndicatingError('Can only set when there is a listener! This is to prevent leaks.');
        }
        subtransaction(tx, tx => {
            prevValue = value;
            d.setValue(value, tx, change);
        });
    });
    return d;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdWNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2V4cGVyaW1lbnRhbC9yZWR1Y2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBb0IsWUFBWSxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sK0JBQStCLENBQUM7QUFzQmxGOzs7RUFHRTtBQUNGLE1BQU0sVUFBVSxpQkFBaUIsQ0FBbUMsS0FBaUIsRUFBRSxPQUFtRDtJQUN6SSxPQUFPLHlCQUF5QixDQUE0QixLQUFLLEVBQUUsT0FBTyxDQUFRLENBQUM7QUFDcEYsQ0FBQztBQUVEOzs7RUFHRTtBQUNGLE1BQU0sVUFBVSx5QkFBeUIsQ0FBbUMsS0FBaUIsRUFBRSxPQUFtRDtJQUNqSixJQUFJLFNBQVMsR0FBa0IsU0FBUyxDQUFDO0lBQ3pDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztJQUVyQixNQUFNLENBQUMsR0FBRyxJQUFJLGlCQUFpQixDQUM5QixJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFDbkQsQ0FBQyxNQUFrQyxFQUFFLGFBQWEsRUFBRSxFQUFFO1FBQ3JELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLFNBQVMsR0FBRyxPQUFPLENBQUMsT0FBTyxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3RGLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDakIsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRSxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQ3JCLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUMsRUFDRCxPQUFPLENBQUMsYUFBYSxFQUNyQixHQUFHLEVBQUU7UUFDSixJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLFNBQVUsQ0FBQyxDQUFDO1lBQ25DLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUMsRUFDRCxPQUFPLENBQUMsZ0JBQWdCLElBQUksWUFBWSxFQUN4QyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLGtCQUFrQixDQUFDLGtFQUFrRSxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUNELGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDdkIsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQ0QsQ0FBQztJQUVGLE9BQU8sQ0FBQyxDQUFDO0FBQ1YsQ0FBQyJ9