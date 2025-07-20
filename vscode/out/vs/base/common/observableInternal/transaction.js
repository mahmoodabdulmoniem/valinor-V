/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { handleBugIndicatingErrorRecovery } from './base.js';
import { getFunctionName } from './debugName.js';
import { getLogger } from './logging/logging.js';
/**
 * Starts a transaction in which many observables can be changed at once.
 * {@link fn} should start with a JS Doc using `@description` to give the transaction a debug name.
 * Reaction run on demand or when the transaction ends.
 */
export function transaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        fn(tx);
    }
    finally {
        tx.finish();
    }
}
let _globalTransaction = undefined;
export function globalTransaction(fn) {
    if (_globalTransaction) {
        fn(_globalTransaction);
    }
    else {
        const tx = new TransactionImpl(fn, undefined);
        _globalTransaction = tx;
        try {
            fn(tx);
        }
        finally {
            tx.finish(); // During finish, more actions might be added to the transaction.
            // Which is why we only clear the global transaction after finish.
            _globalTransaction = undefined;
        }
    }
}
/** @deprecated */
export async function asyncTransaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        await fn(tx);
    }
    finally {
        tx.finish();
    }
}
/**
 * Allows to chain transactions.
 */
export function subtransaction(tx, fn, getDebugName) {
    if (!tx) {
        transaction(fn, getDebugName);
    }
    else {
        fn(tx);
    }
}
export class TransactionImpl {
    constructor(_fn, _getDebugName) {
        this._fn = _fn;
        this._getDebugName = _getDebugName;
        this._updatingObservers = [];
        getLogger()?.handleBeginTransaction(this);
    }
    getDebugName() {
        if (this._getDebugName) {
            return this._getDebugName();
        }
        return getFunctionName(this._fn);
    }
    updateObserver(observer, observable) {
        if (!this._updatingObservers) {
            // This happens when a transaction is used in a callback or async function.
            // If an async transaction is used, make sure the promise awaits all users of the transaction (e.g. no race).
            handleBugIndicatingErrorRecovery('Transaction already finished!');
            // Error recovery
            transaction(tx => {
                tx.updateObserver(observer, observable);
            });
            return;
        }
        // When this gets called while finish is active, they will still get considered
        this._updatingObservers.push({ observer, observable });
        observer.beginUpdate(observable);
    }
    finish() {
        const updatingObservers = this._updatingObservers;
        if (!updatingObservers) {
            handleBugIndicatingErrorRecovery('transaction.finish() has already been called!');
            return;
        }
        for (let i = 0; i < updatingObservers.length; i++) {
            const { observer, observable } = updatingObservers[i];
            observer.endUpdate(observable);
        }
        // Prevent anyone from updating observers from now on.
        this._updatingObservers = null;
        getLogger()?.handleEndTransaction(this);
    }
    debugGetUpdatingObservers() {
        return this._updatingObservers;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC90cmFuc2FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQXdDLE1BQU0sV0FBVyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFakQ7Ozs7R0FJRztBQUVILE1BQU0sVUFBVSxXQUFXLENBQUMsRUFBOEIsRUFBRSxZQUEyQjtJQUN0RixNQUFNLEVBQUUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDakQsSUFBSSxDQUFDO1FBQ0osRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztZQUFTLENBQUM7UUFDVixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDYixDQUFDO0FBQ0YsQ0FBQztBQUNELElBQUksa0JBQWtCLEdBQTZCLFNBQVMsQ0FBQztBQUU3RCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsRUFBOEI7SUFDL0QsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ3hCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxFQUFFLEdBQUcsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUM7WUFDSixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDUixDQUFDO2dCQUFTLENBQUM7WUFDVixFQUFFLENBQUMsTUFB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