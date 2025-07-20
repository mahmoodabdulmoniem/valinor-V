/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { derivedOpts, observableFromEventOpts } from '../../../base/common/observable.js';
/** Creates an observable update when a configuration key updates. */
export function observableConfigValue(key, defaultValue, configurationService) {
    function compute_$show2FramesUp() {
        return observableFromEventOpts({ debugName: () => `Configuration Key "${key}"`, }, (handleChange) => configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(key)) {
                handleChange(e);
            }
        }), () => configurationService.getValue(key) ?? defaultValue);
    }
    return compute_$show2FramesUp();
}
/** Update the configuration key with a value derived from observables. */
export function bindContextKey(key, service, computeValue) {
    const boundKey = key.bindTo(service);
    function compute_$show2FramesUp() {
        const store = new DisposableStore();
        derivedOpts({ debugName: () => `Set Context Key "${key.key}"` }, reader => {
            const value = computeValue(reader);
            boundKey.set(value);
            return value;
        }).recomputeInitiallyAndOnChange(store);
        return store;
    }
    return compute_$show2FramesUp();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29ic2VydmFibGUvY29tbW9uL3BsYXRmb3JtT2JzZXJ2YWJsZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUF3Qix1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSWhILHFFQUFxRTtBQUNyRSxNQUFNLFVBQVUscUJBQXFCLENBQUksR0FBVyxFQUFFLFlBQWUsRUFBRSxvQkFBMkM7SUFDakgsU0FBUyxzQkFBc0I7UUFDOUIsT0FBTyx1QkFBdUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLEdBQUcsRUFDaEYsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ25FLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQ0YsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFJLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FDM0QsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLHNCQUFzQixFQUFFLENBQUM7QUFDakMsQ0FBQztBQUVELDBFQUEwRTtBQUMxRSxNQUFNLFVBQVUsY0FBYyxDQUE0QixHQUFxQixFQUFFLE9BQTJCLEVBQUUsWUFBb0M7SUFDakosTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVyQyxTQUFTLHNCQUFzQjtRQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDekUsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLHNCQUFzQixFQUFFLENBQUM7QUFDakMsQ0FBQyJ9