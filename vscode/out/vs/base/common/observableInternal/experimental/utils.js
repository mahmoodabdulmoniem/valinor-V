/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError, DisposableStore } from '../commonFacade/deps.js';
import { getDebugName, DebugNameData } from '../debugName.js';
import { observableFromEvent } from '../observables/observableFromEvent.js';
import { autorunOpts } from '../reactions/autorun.js';
import { derivedObservableWithCache } from '../utils/utils.js';
/**
 * Creates an observable that has the latest changed value of the given observables.
 * Initially (and when not observed), it has the value of the last observable.
 * When observed and any of the observables change, it has the value of the last changed observable.
 * If multiple observables change in the same transaction, the last observable wins.
*/
export function latestChangedValue(owner, observables) {
    if (observables.length === 0) {
        throw new BugIndicatingError();
    }
    let hasLastChangedValue = false;
    let lastChangedValue = undefined;
    const result = observableFromEvent(owner, cb => {
        const store = new DisposableStore();
        for (const o of observables) {
            store.add(autorunOpts({ debugName: () => getDebugName(result, new DebugNameData(owner, undefined, undefined)) + '.updateLastChangedValue' }, reader => {
                hasLastChangedValue = true;
                lastChangedValue = o.read(reader);
                cb();
            }));
        }
        store.add({
            dispose() {
                hasLastChangedValue = false;
                lastChangedValue = undefined;
            },
        });
        return store;
    }, () => {
        if (hasLastChangedValue) {
            return lastChangedValue;
        }
        else {
            return observables[observables.length - 1].get();
        }
    });
    return result;
}
/**
 * Works like a derived.
 * However, if the value is not undefined, it is cached and will not be recomputed anymore.
 * In that case, the derived will unsubscribe from its dependencies.
*/
export function derivedConstOnceDefined(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => lastValue ?? fn(reader));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9leHBlcmltZW50YWwvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlFLE9BQU8sRUFBYyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRS9EOzs7OztFQUtFO0FBQ0YsTUFBTSxVQUFVLGtCQUFrQixDQUErQixLQUFpQixFQUFFLFdBQWM7SUFDakcsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzlCLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztJQUNoQyxJQUFJLGdCQUFnQixHQUFZLFNBQVMsQ0FBQztJQUUxQyxNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBWSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDekQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQzdCLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxhQUFhLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxHQUFHLHlCQUF5QixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JKLG1CQUFtQixHQUFHLElBQUksQ0FBQztnQkFDM0IsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsRUFBRSxFQUFFLENBQUM7WUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDVCxPQUFPO2dCQUNOLG1CQUFtQixHQUFHLEtBQUssQ0FBQztnQkFDNUIsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1lBQzlCLENBQUM7U0FDRCxDQUFDLENBQUM7UUFDSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUMsRUFBRSxHQUFHLEVBQUU7UUFDUCxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsT0FBTyxnQkFBZ0IsQ0FBQztRQUN6QixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQ7Ozs7RUFJRTtBQUNGLE1BQU0sVUFBVSx1QkFBdUIsQ0FBSSxLQUFpQixFQUFFLEVBQTBCO0lBQ3ZGLE9BQU8sMEJBQTBCLENBQWdCLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN6RyxDQUFDIn0=