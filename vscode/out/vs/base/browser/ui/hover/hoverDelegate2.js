/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../common/lifecycle.js';
let baseHoverDelegate = {
    showInstantHover: () => undefined,
    showDelayedHover: () => undefined,
    setupDelayedHover: () => Disposable.None,
    setupDelayedHoverAtMouse: () => Disposable.None,
    hideHover: () => undefined,
    showAndFocusLastHover: () => undefined,
    setupManagedHover: () => ({
        dispose: () => undefined,
        show: () => undefined,
        hide: () => undefined,
        update: () => undefined,
    }),
    showManagedHover: () => undefined
};
/**
 * Sets the hover delegate for use **only in the `base/` layer**.
 */
export function setBaseLayerHoverDelegate(hoverDelegate) {
    baseHoverDelegate = hoverDelegate;
}
/**
 * Gets the hover delegate for use **only in the `base/` layer**.
 *
 * Since the hover service depends on various platform services, this delegate essentially bypasses
 * the standard dependency injection mechanism by injecting a global hover service at start up. The
 * only reason this should be used is if `IHoverService` is not available.
 */
export function getBaseLayerHoverDelegate() {
    return baseHoverDelegate;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJEZWxlZ2F0ZTIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ob3Zlci9ob3ZlckRlbGVnYXRlMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHMUQsSUFBSSxpQkFBaUIsR0FBb0I7SUFDeEMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztJQUNqQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQ2pDLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQ3hDLHdCQUF3QixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQy9DLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQzFCLHFCQUFxQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7SUFDdEMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN6QixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUN4QixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUNyQixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUNyQixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztLQUN2QixDQUFDO0lBQ0YsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztDQUNqQyxDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQUMsYUFBOEI7SUFDdkUsaUJBQWlCLEdBQUcsYUFBYSxDQUFDO0FBQ25DLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUseUJBQXlCO0lBQ3hDLE9BQU8saUJBQWlCLENBQUM7QUFDMUIsQ0FBQyJ9