/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getFunctionName } from '../debugName.js';
import { getLogger, logObservable } from '../logging/logging.js';
let _derived;
/**
 * @internal
 * This is to allow splitting files.
*/
export function _setDerivedOpts(derived) {
    _derived = derived;
}
let _recomputeInitiallyAndOnChange;
export function _setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange) {
    _recomputeInitiallyAndOnChange = recomputeInitiallyAndOnChange;
}
let _keepObserved;
export function _setKeepObserved(keepObserved) {
    _keepObserved = keepObserved;
}
export class ConvenientObservable {
    get TChange() { return null; }
    reportChanges() {
        this.get();
    }
    /** @sealed */
    read(reader) {
        if (reader) {
            return reader.readObservable(this);
        }
        else {
            return this.get();
        }
    }
    map(fnOrOwner, fnOrUndefined) {
        const owner = fnOrUndefined === undefined ? undefined : fnOrOwner;
        const fn = fnOrUndefined === undefined ? fnOrOwner : fnOrUndefined;
        return _derived({
            owner,
            debugName: () => {
                const name = getFunctionName(fn);
                if (name !== undefined) {
                    return name;
                }
                // regexp to match `x => x.y` or `x => x?.y` where x and y can be arbitrary identifiers (uses backref):
                const regexp = /^\s*\(?\s*([a-zA-Z_$][a-zA-Z_$0-9]*)\s*\)?\s*=>\s*\1(?:\??)\.([a-zA-Z_$][a-zA-Z_$0-9]*)\s*$/;
                const match = regexp.exec(fn.toString());
                if (match) {
                    return `${this.debugName}.${match[2]}`;
                }
                if (!owner) {
                    return `${this.debugName} (mapped)`;
                }
                return undefined;
            },
            debugReferenceFn: fn,
        }, (reader) => fn(this.read(reader), reader));
    }
    /**
     * @sealed
     * Converts an observable of an observable value into a direct observable of the value.
    */
    flatten() {
        return _derived({
            owner: undefined,
            debugName: () => `${this.debugName} (flattened)`,
        }, (reader) => this.read(reader).read(reader));
    }
    recomputeInitiallyAndOnChange(store, handleValue) {
        store.add(_recomputeInitiallyAndOnChange(this, handleValue));
        return this;
    }
    /**
     * Ensures that this observable is observed. This keeps the cache alive.
     * However, in case of deriveds, it does not force eager evaluation (only when the value is read/get).
     * Use `recomputeInitiallyAndOnChange` for eager evaluation.
     */
    keepObserved(store) {
        store.add(_keepObserved(this));
        return this;
    }
    get debugValue() {
        return this.get();
    }
}
export class BaseObservable extends ConvenientObservable {
    constructor() {
        super();
        this._observers = new Set();
        getLogger()?.handleObservableCreated(this);
    }
    addObserver(observer) {
        const len = this._observers.size;
        this._observers.add(observer);
        if (len === 0) {
            this.onFirstObserverAdded();
        }
        if (len !== this._observers.size) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    removeObserver(observer) {
        const deleted = this._observers.delete(observer);
        if (deleted && this._observers.size === 0) {
            this.onLastObserverRemoved();
        }
        if (deleted) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    onFirstObserverAdded() { }
    onLastObserverRemoved() { }
    log() {
        const hadLogger = !!getLogger();
        logObservable(this);
        if (!hadLogger) {
            getLogger()?.handleObservableCreated(this);
        }
        return this;
    }
    debugGetObservers() {
        return this._observers;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZU9ic2VydmFibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9vYnNlcnZhYmxlcy9iYXNlT2JzZXJ2YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQWMsZUFBZSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUlqRSxJQUFJLFFBQTRCLENBQUM7QUFDakM7OztFQUdFO0FBQ0YsTUFBTSxVQUFVLGVBQWUsQ0FBQyxPQUF3QjtJQUN2RCxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxJQUFJLDhCQUFvRSxDQUFDO0FBQ3pFLE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyw2QkFBb0U7SUFDckgsOEJBQThCLEdBQUcsNkJBQTZCLENBQUM7QUFDaEUsQ0FBQztBQUVELElBQUksYUFBa0MsQ0FBQztBQUN2QyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsWUFBa0M7SUFDbEUsYUFBYSxHQUFHLFlBQVksQ0FBQztBQUM5QixDQUFDO0FBRUQsTUFBTSxPQUFnQixvQkFBb0I7SUFDekMsSUFBSSxPQUFPLEtBQWMsT0FBTyxJQUFLLENBQUMsQ0FBQyxDQUFDO0lBSWpDLGFBQWE7UUFDbkIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUtELGNBQWM7SUFDUCxJQUFJLENBQUMsTUFBMkI7UUFDdEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFD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