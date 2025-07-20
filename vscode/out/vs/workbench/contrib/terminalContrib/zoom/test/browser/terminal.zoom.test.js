/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { clampTerminalFontSize } from '../../browser/terminal.zoom.contribution.js';
suite('Terminal Mouse Wheel Zoom', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('clamps font size to minimum value when below bounds', () => {
        const result = clampTerminalFontSize(3 + (-2)); // 3 - 2 = 1, clamped to 6
        strictEqual(result, 6, 'Font size should be clamped to minimum value of 6');
    });
    test('clamps font size to maximum value when above bounds', () => {
        const result = clampTerminalFontSize(99 + 5); // 99 + 5 = 104, clamped to 100
        strictEqual(result, 100, 'Font size should be clamped to maximum value of 100');
    });
    test('preserves font size when within bounds', () => {
        const result = clampTerminalFontSize(12 + 3); // 12 + 3 = 15, within bounds
        strictEqual(result, 15, 'Font size should remain unchanged when within bounds');
    });
    test('clamps font size when going below minimum', () => {
        const result = clampTerminalFontSize(6 + (-1)); // 6 - 1 = 5, clamped to 6
        strictEqual(result, 6, 'Font size should be clamped when going below minimum');
    });
    test('clamps font size when going above maximum', () => {
        const result = clampTerminalFontSize(100 + 1); // 100 + 1 = 101, clamped to 100
        strictEqual(result, 100, 'Font size should be clamped when going above maximum');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvem9vbS90ZXN0L2Jyb3dzZXIvdGVybWluYWwuem9vbS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFcEYsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1FBQzFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLG1EQUFtRCxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQ2hFLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLCtCQUErQjtRQUM3RSxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxxREFBcUQsQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyw2QkFBNkI7UUFDM0UsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsc0RBQXNELENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1FBQzFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLHNEQUFzRCxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3RELE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztRQUMvRSxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxzREFBc0QsQ0FBQyxDQUFDO0lBQ2xGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==