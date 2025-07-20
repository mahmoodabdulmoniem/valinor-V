/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function showHistoryKeybindingHint(keybindingService) {
    return keybindingService.lookupKeybinding('history.showPrevious')?.getElectronAccelerator() === 'Up' && keybindingService.lookupKeybinding('history.showNext')?.getElectronAccelerator() === 'Down';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVdpZGdldEtleWJpbmRpbmdIaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9oaXN0b3J5L2Jyb3dzZXIvaGlzdG9yeVdpZGdldEtleWJpbmRpbmdIaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxpQkFBcUM7SUFDOUUsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLHNCQUFzQixFQUFFLEtBQUssSUFBSSxJQUFJLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxNQUFNLENBQUM7QUFDck0sQ0FBQyJ9