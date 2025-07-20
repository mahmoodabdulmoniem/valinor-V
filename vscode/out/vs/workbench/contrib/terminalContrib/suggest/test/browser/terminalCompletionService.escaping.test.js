/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escapeTerminalCompletionLabel } from '../../browser/terminalCompletionService.js';
import { strict as assert } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('escapeTerminalCompletionLabel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const shellType = "bash" /* PosixShellType.Bash */;
    const pathSeparator = '/';
    const cases = [
        { char: '[', label: '[abc', expected: '\\[abc' },
        { char: ']', label: 'abc]', expected: 'abc\\]' },
        { char: '(', label: '(abc', expected: '\\(abc' },
        { char: ')', label: 'abc)', expected: 'abc\\)' },
        { char: '\'', label: "'abc", expected: "\\'abc" },
        { char: '"', label: '"abc', expected: '\\"abc' },
        { char: '\\', label: 'abc\\', expected: 'abc\\\\' },
        { char: '`', label: '`abc', expected: '\\`abc' },
        { char: '*', label: '*abc', expected: '\\*abc' },
        { char: '?', label: '?abc', expected: '\\?abc' },
        { char: ';', label: ';abc', expected: '\\;abc' },
        { char: '&', label: '&abc', expected: '\\&abc' },
        { char: '|', label: '|abc', expected: '\\|abc' },
        { char: '<', label: '<abc', expected: '\\<abc' },
        { char: '>', label: '>abc', expected: '\\>abc' },
    ];
    for (const { char, label, expected } of cases) {
        test(`should escape '${char}' in "${label}"`, () => {
            const result = escapeTerminalCompletionLabel(label, shellType, pathSeparator);
            assert.equal(result, expected);
        });
    }
    test('should not escape when no special chars', () => {
        const result = escapeTerminalCompletionLabel('abc', shellType, pathSeparator);
        assert.equal(result, 'abc');
    });
    test('should not escape for PowerShell', () => {
        const result = escapeTerminalCompletionLabel('[abc', "pwsh" /* GeneralShellType.PowerShell */, pathSeparator);
        assert.equal(result, '[abc');
    });
    test('should not escape for CommandPrompt', () => {
        const result = escapeTerminalCompletionLabel('[abc', "cmd" /* WindowsShellType.CommandPrompt */, pathSeparator);
        assert.equal(result, '[abc');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5lc2NhcGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uU2VydmljZS5lc2NhcGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxNQUFNLElBQUksTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzFDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXRHLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDM0MsdUNBQXVDLEVBQUUsQ0FBQztJQUMxQyxNQUFNLFNBQVMsbUNBQXlDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO0lBQzFCLE1BQU0sS0FBSyxHQUFHO1FBQ2IsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtRQUNoRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7UUFDaEQsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtRQUNoRCxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1FBQ2pELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7UUFDaEQsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtRQUNuRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7UUFDaEQsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtRQUNoRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7UUFDaEQsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtRQUNoRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7S0FDaEQsQ0FBQztJQUVGLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLGtCQUFrQixJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUUsR0FBRyxFQUFFO1lBQ2xELE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxNQUFNLDRDQUErQixhQUFhLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsTUFBTSw4Q0FBa0MsYUFBYSxDQUFDLENBQUM7UUFDcEcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9