/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { subtransaction } from '../transaction.js';
import { strictEquals } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { getLogger } from '../logging/logging.js';
import { BaseObservable } from './baseObservable.js';
export function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    if (args.length === 3) {
        [owner, event, getValue] = args;
    }
    else {
        [event, getValue] = args;
    }
    return new FromEventObservable(new DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, strictEquals);
}
export function observableFromEventOpts(options, event, getValue) {
    return new FromEventObservable(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => FromEventObservable.globalTransaction, options.equalsFn ?? strictEquals);
}
export class FromEventObservable extends BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this._hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this._value;
            const didChange = !this._hasValue || !(this._equalityComparator(oldValue, newValue));
            let didRunTransaction = false;
            if (didChange) {
                this._value = newValue;
                if (this._hasValue) {
                    didRunTransaction = true;
                    subtransaction(this._getTransaction(), (tx) => {
                        getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
                        for (const o of this._observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this._hasValue = true;
            }
            if (!didRunTransaction) {
                getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this._subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this._subscription.dispose();
        this._subscription = undefined;
        this._hasValue = false;
        this._value = undefined;
    }
    get() {
        if (this._subscription) {
            if (!this._hasValue) {
                this.handleEvent(undefined);
            }
            return this._value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
    debugSetValue(value) {
        this._value = value;
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUZyb21FdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL29ic2VydmFibGVzL29ic2VydmFibGVGcm9tRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25ELE9BQU8sRUFBd0MsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0YsT0FBTyxFQUFjLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBWXJELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxHQUFHLElBRXVCO0lBRTdELElBQUksS0FBSyxDQUFDO0lBQ1YsSUFBSSxLQUFLLENBQUM7SUFDVixJQUFJLFFBQVEsQ0FBQztJQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLENBQUM7U0FBTSxDQUFDO1FBQ1AsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzFCLENBQUM7SUFDRCxPQUFPLElBQUksbUJBQW1CLENBQzdCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQzdDLEtBQUssRUFDTCxRQUFRLEVBQ1IsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQzNDLFlBQVksQ0FDWixDQUFDO0FBQ0gsQ0FB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