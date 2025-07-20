import { transaction } from '../transaction.js';
import { derived } from '../observables/derived.js';
import { observableValue } from '../observables/observableValue.js';
export class ObservableLazy {
    /**
     * The cached value.
     * Does not force a computation of the value.
     */
    get cachedValue() { return this._value; }
    constructor(_computeValue) {
        this._computeValue = _computeValue;
        this._value = observableValue(this, undefined);
    }
    /**
     * Returns the cached value.
     * Computes the value if the value has not been cached yet.
     */
    getValue() {
        let v = this._value.get();
        if (!v) {
            v = this._computeValue();
            this._value.set(v, undefined);
        }
        return v;
    }
}
/**
 * A promise whose state is observable.
 */
export class ObservablePromise {
    static fromFn(fn) {
        return new ObservablePromise(fn());
    }
    constructor(promise) {
        this._value = observableValue(this, undefined);
        /**
         * The current state of the promise.
         * Is `undefined` if the promise didn't resolve yet.
         */
        this.promiseResult = this._value;
        this.resolvedValue = derived(this, reader => {
            const result = this.promiseResult.read(reader);
            if (!result) {
                return undefined;
            }
            return result.getDataOrThrow();
        });
        this.promise = promise.then(value => {
            transaction(tx => {
                /** @description onPromiseResolved */
                this._value.set(new PromiseResult(value, undefined), tx);
            });
            return value;
        }, error => {
            transaction(tx => {
                /** @description onPromiseRejected */
                this._value.set(new PromiseResult(undefined, error), tx);
            });
            throw error;
        });
    }
}
export class PromiseResult {
    constructor(
    /**
     * The value of the resolved promise.
     * Undefined if the promise rejected.
     */
    data, 
    /**
     * The error in case of a rejected promise.
     * Undefined if the promise resolved.
     */
    error) {
        this.data = data;
        this.error = error;
    }
    /**
     * Returns the value if the promise resolved, otherwise throws the error.
     */
    getDataOrThrow() {
        if (this.error) {
            throw this.error;
        }
        return this.data;
    }
}
/**
 * A lazy promise whose state is observable.
 */
export class ObservableLazyPromise {
    constructor(_computePromise) {
        this._computePromise = _computePromise;
        this._lazyValue = new ObservableLazy(() => new ObservablePromise(this._computePromise()));
        /**
         * Does not enforce evaluation of the promise compute function.
         * Is undefined if the promise has not been computed yet.
         */
        this.cachedPromiseResult = derived(this, reader => this._lazyValue.cachedValue.read(reader)?.promiseResult.read(reader));
    }
    getPromise() {
        return this._lazyValue.getValue().promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL3V0aWxzL3Byb21pc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsTUFBTSxPQUFPLGNBQWM7SUFHMUI7OztPQUdHO0lBQ0gsSUFBVyxXQUFXLEtBQWlDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFNUUsWUFBNkIsYUFBc0I7UUFBdEIsa0JBQWEsR0FBYixhQUFhLENBQVM7UUFSbEMsV0FBTSxHQUFHLGVBQWUsQ0FBZ0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBUzFFLENBQUM7SUFFRDs7O09BR0c7SUFDSSxRQUFRO1FBQ2QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDUixDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDdEIsTUFBTSxDQUFDLE1BQU0sQ0FBSSxFQUFvQjtRQUMzQyxPQUFPLElBQUksaUJBQWlCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwQyxD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