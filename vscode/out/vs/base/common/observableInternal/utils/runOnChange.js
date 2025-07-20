/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { cancelOnDispose } from '../commonFacade/cancellation.js';
import { DisposableStore } from '../commonFacade/deps.js';
import { autorunWithStoreHandleChanges } from '../reactions/autorun.js';
export function runOnChange(observable, cb) {
    let _previousValue;
    let _firstRun = true;
    return autorunWithStoreHandleChanges({
        changeTracker: {
            createChangeSummary: () => ({ deltas: [], didChange: false }),
            handleChange: (context, changeSummary) => {
                if (context.didChange(observable)) {
                    const e = context.change;
                    if (e !== undefined) {
                        changeSummary.deltas.push(e);
                    }
                    changeSummary.didChange = true;
                }
                return true;
            },
        }
    }, (reader, changeSummary) => {
        const value = observable.read(reader);
        const previousValue = _previousValue;
        if (changeSummary.didChange) {
            _previousValue = value;
            // didChange can never be true on the first autorun, so we know previousValue is defined
            cb(value, previousValue, changeSummary.deltas);
        }
        if (_firstRun) {
            _firstRun = false;
            _previousValue = value;
        }
    });
}
export function runOnChangeWithStore(observable, cb) {
    const store = new DisposableStore();
    const disposable = runOnChange(observable, (value, previousValue, deltas) => {
        store.clear();
        cb(value, previousValue, deltas, store);
    });
    return {
        dispose() {
            disposable.dispose();
            store.dispose();
        }
    };
}
export function runOnChangeWithCancellationToken(observable, cb) {
    return runOnChangeWithStore(observable, (value, previousValue, deltas, store) => {
        cb(value, previousValue, deltas, cancelOnDispose(store));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuT25DaGFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlscy9ydW5PbkNoYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQXFCLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUl4RSxNQUFNLFVBQVUsV0FBVyxDQUFhLFVBQTZDLEVBQUUsRUFBNEU7SUFDbEssSUFBSSxjQUE2QixDQUFDO0lBQ2xDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQztJQUNyQixPQUFPLDZCQUE2QixDQUFDO1FBQ3BDLGFBQWEsRUFBRTtZQUNkLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBZ0MsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDM0YsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxFQUFFO2dCQUN4QyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztvQkFDekIsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ3JCLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQTZCLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFDRCxhQUFhLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDaEMsQ0FBQztnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7U0FDRDtLQUNELEVBQUUsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEVBQUU7UUFDNUIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0IsY0FBYyxHQUFHLEtBQUssQ0FBQztZQUN2Qix3RkFBd0Y7WUFDeEYsRUFBRSxDQUFDLEtBQUssRUFBRSxhQUFjLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUNsQixjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQWEsVUFBNkMsRUFBRSxFQUFvRztJQUNuTSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ3BDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsYUFBZ0IsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM5RSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxFQUFFLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPO1FBQ04sT0FBTztZQUNOLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakIsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUFhLFVBQTZDLEVBQUUsRUFBK0c7SUFDMU4sT0FBTyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUMvRSxFQUFFLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=