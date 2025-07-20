/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var FocusMode;
(function (FocusMode) {
    /**
     * (Default) Transfer focus to the target window
     * when the editor is focused.
     */
    FocusMode[FocusMode["Transfer"] = 0] = "Transfer";
    /**
     * Transfer focus to the target window when the
     * editor is focused, otherwise notify the user that
     * the app has activity (macOS/Windows only).
     */
    FocusMode[FocusMode["Notify"] = 1] = "Notify";
    /**
     * Force the window to be focused, even if the editor
     * is not currently focused.
     */
    FocusMode[FocusMode["Force"] = 2] = "Force";
})(FocusMode || (FocusMode = {}));
export const INativeHostService = createDecorator('nativeHostService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9uYXRpdmUvY29tbW9uL25hdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUE2QjlFLE1BQU0sQ0FBTixJQUFrQixTQW9CakI7QUFwQkQsV0FBa0IsU0FBUztJQUUxQjs7O09BR0c7SUFDSCxpREFBUSxDQUFBO0lBRVI7Ozs7T0FJRztJQUNILDZDQUFNLENBQUE7SUFFTjs7O09BR0c7SUFDSCwyQ0FBSyxDQUFBO0FBQ04sQ0FBQyxFQXBCaUIsU0FBUyxLQUFULFNBQVMsUUFvQjFCO0FBMEtELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQyJ9