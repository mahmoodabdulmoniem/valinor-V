/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from '../debugName.js';
import { CancellationError, CancellationTokenSource } from '../commonFacade/cancellation.js';
import { strictEquals } from '../commonFacade/deps.js';
import { autorun } from '../reactions/autorun.js';
import { Derived } from '../observables/derivedImpl.js';
export function waitForState(observable, predicate, isError, cancellationToken) {
    if (!predicate) {
        predicate = state => state !== null && state !== undefined;
    }
    return new Promise((resolve, reject) => {
        let isImmediateRun = true;
        let shouldDispose = false;
        const stateObs = observable.map(state => {
            /** @description waitForState.state */
            return {
                isFinished: predicate(state),
                error: isError ? isError(state) : false,
                state
            };
        });
        const d = autorun(reader => {
            /** @description waitForState */
            const { isFinished, error, state } = stateObs.read(reader);
            if (isFinished || error) {
                if (isImmediateRun) {
                    // The variable `d` is not initialized yet
                    shouldDispose = true;
                }
                else {
                    d.dispose();
                }
                if (error) {
                    reject(error === true ? state : error);
                }
                else {
                    resolve(state);
                }
            }
        });
        if (cancellationToken) {
            const dc = cancellationToken.onCancellationRequested(() => {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
            });
            if (cancellationToken.isCancellationRequested) {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
                return;
            }
        }
        isImmediateRun = false;
        if (shouldDispose) {
            d.dispose();
        }
    });
}
export function derivedWithCancellationToken(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let cancellationTokenSource = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (cancellationTokenSource) {
            cancellationTokenSource.dispose(true);
        }
        cancellationTokenSource = new CancellationTokenSource();
        return computeFn(r, cancellationTokenSource.token);
    }, undefined, () => cancellationTokenSource?.dispose(), strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHNDYW5jZWxsYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlscy91dGlsc0NhbmNlbGxhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFxQix1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBUXhELE1BQU0sVUFBVSxZQUFZLENBQUksVUFBMEIsRUFBRSxTQUFpQyxFQUFFLE9BQXFELEVBQUUsaUJBQXFDO0lBQzFMLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixTQUFTLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLENBQUM7SUFDNUQsQ0FBQztJQUNELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzFCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3ZDLHNDQUFzQztZQUN0QyxPQUFPO2dCQUNOLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDO2dCQUM1QixLQUFLLEVBQUUsT0FB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