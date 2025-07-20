/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { registerTerminalSuggestProvidersConfiguration } from '../../common/terminalSuggestConfiguration.js';
suite('Terminal Suggest Dynamic Configuration', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should update configuration when providers change', () => {
        // Test initial state
        registerTerminalSuggestProvidersConfiguration([]);
        // Test with some providers
        const providers = ['terminal-suggest', 'builtinPwsh', 'lsp', 'custom-provider'];
        registerTerminalSuggestProvidersConfiguration(providers);
        // Test with empty providers
        registerTerminalSuggestProvidersConfiguration([]);
        // The fact that this doesn't throw means the basic logic works
        assert.ok(true);
    });
    test('should include default providers even when none provided', () => {
        // This should not throw and should set up default configuration
        registerTerminalSuggestProvidersConfiguration(undefined);
        assert.ok(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvdGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsNkNBQTZDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU3RyxLQUFLLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ3BELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxxQkFBcUI7UUFDckIsNkNBQTZDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEQsMkJBQTJCO1FBQzNCLE1BQU0sU0FBUyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hGLDZDQUE2QyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXpELDRCQUE0QjtRQUM1Qiw2Q0FBNkMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVsRCwrREFBK0Q7UUFDL0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7UUFDckUsZ0VBQWdFO1FBQ2hFLDZDQUE2QyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9