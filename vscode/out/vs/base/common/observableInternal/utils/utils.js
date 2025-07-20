/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorun } from '../reactions/autorun.js';
import { transaction } from '../transaction.js';
import { observableValue } from '../observables/observableValue.js';
import { DisposableStore, toDisposable } from '../commonFacade/deps.js';
import { derived, derivedOpts } from '../observables/derived.js';
import { observableFromEvent } from '../observables/observableFromEvent.js';
import { observableSignal } from '../observables/observableSignal.js';
import { _setKeepObserved, _setRecomputeInitiallyAndOnChange } from '../observables/baseObservable.js';
export function observableFromPromise(promise) {
    const observable = observableValue('promiseValue', {});
    promise.then((value) => {
        observable.set({ value }, undefined);
    });
    return observable;
}
export function signalFromObservable(owner, observable) {
    return derivedOpts({
        owner,
        equalsFn: () => false,
    }, reader => {
        observable.read(reader);
    });
}
/**
 * @deprecated Use `debouncedObservable` instead.
 */
export function debouncedObservableDeprecated(observable, debounceMs, disposableStore) {
    const debouncedObservable = observableValue('debounced', undefined);
    let timeout = undefined;
    disposableStore.add(autorun(reader => {
        /** @description debounce */
        const value = observable.read(reader);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            transaction(tx => {
                debouncedObservable.set(value, tx);
            });
        }, debounceMs);
    }));
    return debouncedObservable;
}
/**
 * Creates an observable that debounces the input observable.
 */
export function debouncedObservable(observable, debounceMs) {
    let hasValue = false;
    let lastValue;
    let timeout = undefined;
    return observableFromEvent(cb => {
        const d = autorun(reader => {
            const value = observable.read(reader);
            if (!hasValue) {
                hasValue = true;
                lastValue = value;
            }
            else {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(() => {
                    lastValue = value;
                    cb();
                }, debounceMs);
            }
        });
        return {
            dispose() {
                d.dispose();
                hasValue = false;
                lastValue = undefined;
            },
        };
    }, () => {
        if (hasValue) {
            return lastValue;
        }
        else {
            return observable.get();
        }
    });
}
export function wasEventTriggeredRecently(event, timeoutMs, disposableStore) {
    const observable = observableValue('triggeredRecently', false);
    let timeout = undefined;
    disposableStore.add(event(() => {
        observable.set(true, undefined);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            observable.set(false, undefined);
        }, timeoutMs);
    }));
    return observable;
}
/**
 * This makes sure the observable is being observed and keeps its cache alive.
 */
export function keepObserved(observable) {
    const o = new KeepAliveObserver(false, undefined);
    observable.addObserver(o);
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setKeepObserved(keepObserved);
/**
 * This converts the given observable into an autorun.
 */
export function recomputeInitiallyAndOnChange(observable, handleValue) {
    const o = new KeepAliveObserver(true, handleValue);
    observable.addObserver(o);
    try {
        o.beginUpdate(observable);
    }
    finally {
        o.endUpdate(observable);
    }
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange);
export class KeepAliveObserver {
    constructor(_forceRecompute, _handleValue) {
        this._forceRecompute = _forceRecompute;
        this._handleValue = _handleValue;
        this._counter = 0;
    }
    beginUpdate(observable) {
        this._counter++;
    }
    endUpdate(observable) {
        if (this._counter === 1 && this._forceRecompute) {
            if (this._handleValue) {
                this._handleValue(observable.get());
            }
            else {
                observable.reportChanges();
            }
        }
        this._counter--;
    }
    handlePossibleChange(observable) {
        // NO OP
    }
    handleChange(observable, change) {
        // NO OP
    }
}
export function derivedObservableWithCache(owner, computeFn) {
    let lastValue = undefined;
    const observable = derivedOpts({ owner, debugReferenceFn: computeFn }, reader => {
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return observable;
}
export function derivedObservableWithWritableCache(owner, computeFn) {
    let lastValue = undefined;
    const onChange = observableSignal('derivedObservableWithWritableCache');
    const observable = derived(owner, reader => {
        onChange.read(reader);
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return Object.assign(observable, {
        clearCache: (tx) => {
            lastValue = undefined;
            onChange.trigger(tx);
        },
        setCache: (newValue, tx) => {
            lastValue = newValue;
            onChange.trigger(tx);
        }
    });
}
/**
 * When the items array changes, referential equal items are not mapped again.
 */
export function mapObservableArrayCached(owner, items, map, keySelector) {
    let m = new ArrayMap(map, keySelector);
    const self = derivedOpts({
        debugReferenceFn: map,
        owner,
        onLastObserverRemoved: () => {
            m.dispose();
            m = new ArrayMap(map);
        }
    }, (reader) => {
        m.setItems(items.read(reader));
        return m.getItems();
    });
    return self;
}
class ArrayMap {
    constructor(_map, _keySelector) {
        this._map = _map;
        this._keySelector = _keySelector;
        this._cache = new Map();
        this._items = [];
    }
    dispose() {
        this._cache.forEach(entry => entry.store.dispose());
        this._cache.clear();
    }
    setItems(items) {
        const newItems = [];
        const itemsToRemove = new Set(this._cache.keys());
        for (const item of items) {
            const key = this._keySelector ? this._keySelector(item) : item;
            let entry = this._cache.get(key);
            if (!entry) {
                const store = new DisposableStore();
                const out = this._map(item, store);
                entry = { out, store };
                this._cache.set(key, entry);
            }
            else {
                itemsToRemove.delete(key);
            }
            newItems.push(entry.out);
        }
        for (const item of itemsToRemove) {
            const entry = this._cache.get(item);
            entry.store.dispose();
            this._cache.delete(item);
        }
        this._items = newItems;
    }
    getItems() {
        return this._items;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlscy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFbEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsZUFBZSxFQUFzQixZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXZHLE1BQU0sVUFBVSxxQkFBcUIsQ0FBSSxPQUFtQjtJQUMzRCxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQWdCLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0RSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDdEIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxVQUFVLENBQUM7QUFDbkIsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBSSxLQUE2QixFQUFFLFVBQTBCO0lBQ2hHLE9BQU8sV0FB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