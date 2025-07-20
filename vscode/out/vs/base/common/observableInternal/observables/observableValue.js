/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TransactionImpl } from '../transaction.js';
import { BaseObservable } from './baseObservable.js';
import { strictEquals } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { getLogger } from '../logging/logging.js';
export function observableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new ObservableValue(debugNameData, initialValue, strictEquals);
}
export class ObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'ObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._value = initialValue;
        getLogger()?.handleObservableUpdated(this, { hadValue: false, newValue: initialValue, change: undefined, didChange: true, oldValue: undefined });
    }
    get() {
        return this._value;
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            const oldValue = this._value;
            this._setValue(value);
            getLogger()?.handleObservableUpdated(this, { oldValue, newValue: value, change, didChange: true, hadValue: true });
            for (const observer of this._observers) {
                tx.updateObserver(observer, this);
                observer.handleChange(this, change);
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
    debugGetState() {
        return {
            value: this._value,
        };
    }
    debugSetValue(value) {
        this._value = value;
    }
}
/**
 * A disposable observable. When disposed, its value is also disposed.
 * When a new value is set, the previous value is disposed.
 */
export function disposableObservableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new DisposableObservableValue(debugNameData, initialValue, strictEquals);
}
export class DisposableObservableValue extends ObservableValue {
    _setValue(newValue) {
        if (this._value === newValue) {
            return;
        }
        if (this._value) {
            this._value.dispose();
        }
        this._value = newValue;
    }
    dispose() {
        this._value?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVZhbHVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvb2JzZXJ2YWJsZXMvb2JzZXJ2YWJsZVZhbHVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFpQyxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBV2xELE1BQU0sVUFBVSxlQUFlLENBQW9CLFdBQTRCLEVBQUUsWUFBZTtJQUMvRixJQUFJLGFBQTRCLENBQUM7SUFDakMsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0RSxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFDRCxPQUFPLElBQUksZUFBZSxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDdkUsQ0FBQztBQUVELE1BQU0sT0FBTyxlQUNaLFNBQVEsY0FBMEI7SUFJbEMsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBaUIs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