/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, strictEquals } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { _setDerivedOpts } from './baseObservable.js';
import { Derived, DerivedWithSetter } from './derivedImpl.js';
export function derived(computeFnOrOwner, computeFn) {
    if (computeFn !== undefined) {
        return new Derived(new DebugNameData(computeFnOrOwner, undefined, computeFn), computeFn, undefined, undefined, strictEquals);
    }
    return new Derived(new DebugNameData(undefined, undefined, computeFnOrOwner), computeFnOrOwner, undefined, undefined, strictEquals);
}
export function derivedWithSetter(owner, computeFn, setter) {
    return new DerivedWithSetter(new DebugNameData(owner, undefined, computeFn), computeFn, undefined, undefined, strictEquals, setter);
}
export function derivedOpts(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn), computeFn, undefined, options.onLastObserverRemoved, options.equalsFn ?? strictEquals);
}
_setDerivedOpts(derivedOpts);
/**
 * Represents an observable that is derived from other observables.
 * The value is only recomputed when absolutely needed.
 *
 * {@link computeFn} should start with a JS Doc using `@description` to name the derived.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The compute function is given the last change summary.
 * The change summary is discarded after the compute function was called.
 *
 * @see derived
 */
export function derivedHandleChanges(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, undefined), computeFn, options.changeTracker, undefined, options.equalityComparer ?? strictEquals);
}
export function derivedWithStore(computeFnOrOwner, computeFnOrUndefined) {
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
    // Intentionally re-assigned in case an inactive observable is re-used later
    // eslint-disable-next-line local/code-no-potentially-unsafe-disposables
    let store = new DisposableStore();
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (store.isDisposed) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        return computeFn(r, store);
    }, undefined, () => store.dispose(), strictEquals);
}
export function derivedDisposable(computeFnOrOwner, computeFnOrUndefined) {
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
    let store = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (!store) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        const result = computeFn(r);
        if (result) {
            store.add(result);
        }
        return result;
    }, undefined, () => {
        if (store) {
            store.dispose();
            store = undefined;
        }
    }, strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL29ic2VydmFibGVzL2Rlcml2ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBaUMsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdkcsT0FBTyxFQUFjLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFrQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQVU5RSxNQUFNLFVBQVUsT0FBTyxDQUFvQixnQkFBdUUsRUFBRSxTQUFnRTtJQUNuTCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM3QixPQUFPLElBQUksT0FBTyxDQUNqQixJQUFJLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQ3pELFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsZ0JBQXVCLENBQUMsRUFDaEUsZ0JBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFJLEtBQTZCLEVBQUUsU0FBaUMsRUFBRSxNQUFpRTtJQUN2SyxPQUFPLElBQUksaUJBQWlCLENBQzNCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVB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