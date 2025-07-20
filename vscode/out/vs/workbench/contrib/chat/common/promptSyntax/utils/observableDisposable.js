/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
/**
* @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export class ObservableDisposable extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * Underlying disposables store this object relies on.
         */
        this.store = this._register(new DisposableStore());
    }
    /**
     * Check if the current object is already has been disposed.
     */
    get isDisposed() {
        return this.store.isDisposed;
    }
    /**
     * The event is fired when this object is disposed.
     * Note! Executes the callback immediately if already disposed.
     *
     * @param callback The callback function to be called on updates.
     */
    onDispose(callback) {
        // if already disposed, execute the callback immediately
        if (this.isDisposed) {
            const timeoutHandle = setTimeout(callback);
            return toDisposable(() => {
                clearTimeout(timeoutHandle);
            });
        }
        return this.store.add(toDisposable(callback));
    }
    /**
     * Adds disposable object(s) to the list of disposables
     * that will be disposed with this object.
     */
    addDisposables(...disposables) {
        for (const disposable of disposables) {
            this.store.add(disposable);
        }
        return this;
    }
    /**
     * Assert that the current object was not yet disposed.
     *
     * @throws If the current object was already disposed.
     * @param error Error message or error object to throw if assertion fails.
     */
    assertNotDisposed(error) {
        assertNotDisposed(this, error);
    }
}
/**
 * @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export function assertNotDisposed(object, error) {
    if (!object.isDisposed) {
        return;
    }
    const errorToThrow = typeof error === 'string'
        ? new Error(error)
        : error;
    throw errorToThrow;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9vYnNlcnZhYmxlRGlzcG9zYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVwSDs7R0FFRztBQUNILE1BQU0sT0FBZ0Isb0JBQXFCLFNBQVEsVUFBVTtJQUE3RDs7UUFDQzs7V0FFRztRQUNjLFVBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztJQW1EaEUsQ0FBQztJQWpEQTs7T0FFRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLFNBQVMsQ0FBQyxRQUFvQjtRQUNwQyx3REFBd0Q7UUFDeEQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTNDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDeEIsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7T0FHRztJQUNJLGNBQWMsQ0FBQyxHQUFHLFdBQTBCO1FBQ2xELEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksaUJBQWlCLENBQ3ZCLEtBQXFCO1FBRXJCLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQ0Q7QUFPRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsTUFBZSxFQUNmLEtBQXFCO0lBRXJCLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEIsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQzdDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDbEIsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUVULE1BQU0sWUFBWSxDQUFDO0FBQ3BCLENBQUMifQ==