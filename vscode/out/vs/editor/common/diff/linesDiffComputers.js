/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LegacyLinesDiffComputer } from './legacyLinesDiffComputer.js';
import { DefaultLinesDiffComputer } from './defaultLinesDiffComputer/defaultLinesDiffComputer.js';
export const linesDiffComputers = {
    getLegacy: () => new LegacyLinesDiffComputer(),
    getDefault: () => new DefaultLinesDiffComputer(),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEaWZmQ29tcHV0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvbGluZXNEaWZmQ29tcHV0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBR2xHLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHO0lBQ2pDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLHVCQUF1QixFQUFFO0lBQzlDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLHdCQUF3QixFQUFFO0NBQ0csQ0FBQyJ9