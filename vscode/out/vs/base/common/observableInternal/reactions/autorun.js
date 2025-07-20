/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { AutorunObserver } from './autorunImpl.js';
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorun(fn) {
    return new AutorunObserver(new DebugNameData(undefined, undefined, fn), fn, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorunOpts(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `changeTracker.createChangeSummary` to create a "change summary" that can collect the changes.
 * Use `changeTracker.handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export function autorunHandleChanges(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, options.changeTracker);
}
/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStoreHandleChanges(options, fn) {
    const store = new DisposableStore();
    const disposable = autorunHandleChanges({
        owner: options.owner,
        debugName: options.debugName,
        debugReferenceFn: options.debugReferenceFn ?? fn,
        changeTracker: options.changeTracker,
    }, (reader, changeSummary) => {
        store.clear();
        fn(reader, changeSummary, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 *
 * @deprecated Use `autorun(reader => { reader.store.add(...) })` instead!
 */
export function autorunWithStore(fn) {
    const store = new DisposableStore();
    const disposable = autorunOpts({
        owner: undefined,
        debugName: undefined,
        debugReferenceFn: fn,
    }, reader => {
        store.clear();
        fn(reader, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
export function autorunDelta(observable, handler) {
    let _lastValue;
    return autorunOpts({ debugReferenceFn: handler }, (reader) => {
        const newValue = observable.read(reader);
        const lastValue = _lastValue;
        _lastValue = newValue;
        handler({ lastValue, newValue });
    });
}
export function autorunIterableDelta(getValue, handler, getUniqueIdentifier = v => v) {
    const lastValues = new Map();
    return autorunOpts({ debugReferenceFn: getValue }, (reader) => {
        const newValues = new Map();
        const removedValues = new Map(lastValues);
        for (const value of getValue(reader)) {
            const id = getUniqueIdentifier(value);
            if (lastValues.has(id)) {
                removedValues.delete(id);
            }
            else {
                newValues.set(id, value);
                lastValues.set(id, value);
            }
        }
        for (const id of removedValues.keys()) {
            lastValues.delete(id);
        }
        if (newValues.size || removedValues.size) {
            handler({ addedValues: [...newValues.values()], removedValues: [...removedValues.values()] });
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b3J1bi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL3JlYWN0aW9ucy9hdXRvcnVuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFbkQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBQyxFQUFzQztJQUM3RCxPQUFPLElBQUksZUFBZSxDQUN6QixJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUMzQyxFQUFFLEVBQ0YsU0FBUyxDQUNULENBQUM7QUFDSCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxPQUE0QixFQUFFLEVBQXNDO0lBQy9GLE9BQU8sSUFBSSxlQUFlLENBQ3pCLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLEVBQ25GLEVBQUUsRUFDRixTQUFTLENBQ1QsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxPQUVDLEVBQ0QsRUFBNEQ7SUFFNUQsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMs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