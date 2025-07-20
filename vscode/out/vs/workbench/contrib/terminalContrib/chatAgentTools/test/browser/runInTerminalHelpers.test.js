/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from 'assert';
import { isPowerShell } from '../../browser/runInTerminalHelpers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('isPowerShell', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('PowerShell executables', () => {
        test('should detect powershell.exe', () => {
            ok(isPowerShell('powershell.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('powershell', 3 /* OperatingSystem.Linux */));
        });
        test('should detect pwsh.exe', () => {
            ok(isPowerShell('pwsh.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('pwsh', 3 /* OperatingSystem.Linux */));
        });
        test('should detect powershell-preview', () => {
            ok(isPowerShell('powershell-preview.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('powershell-preview', 3 /* OperatingSystem.Linux */));
        });
        test('should detect pwsh-preview', () => {
            ok(isPowerShell('pwsh-preview.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('pwsh-preview', 3 /* OperatingSystem.Linux */));
        });
    });
    suite('PowerShell with full paths', () => {
        test('should detect Windows PowerShell with full path', () => {
            ok(isPowerShell('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should detect PowerShell Core with full path', () => {
            ok(isPowerShell('C:\\Program Files\\PowerShell\\7\\pwsh.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should detect PowerShell on Linux/macOS with full path', () => {
            ok(isPowerShell('/usr/bin/pwsh', 3 /* OperatingSystem.Linux */));
        });
        test('should detect PowerShell preview with full path', () => {
            ok(isPowerShell('/opt/microsoft/powershell/7-preview/pwsh-preview', 3 /* OperatingSystem.Linux */));
        });
        test('should detect nested path with powershell', () => {
            ok(isPowerShell('/some/deep/path/to/powershell.exe', 1 /* OperatingSystem.Windows */));
        });
    });
    suite('Case sensitivity', () => {
        test('should detect PowerShell regardless of case', () => {
            ok(isPowerShell('PowerShell.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('POWERSHELL.EXE', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('Pwsh.exe', 1 /* OperatingSystem.Windows */));
        });
    });
    suite('Non-PowerShell shells', () => {
        test('should not detect bash', () => {
            ok(!isPowerShell('bash', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect zsh', () => {
            ok(!isPowerShell('zsh', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect sh', () => {
            ok(!isPowerShell('sh', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect fish', () => {
            ok(!isPowerShell('fish', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect cmd.exe', () => {
            ok(!isPowerShell('cmd.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should not detect command.com', () => {
            ok(!isPowerShell('command.com', 1 /* OperatingSystem.Windows */));
        });
        test('should not detect dash', () => {
            ok(!isPowerShell('dash', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect tcsh', () => {
            ok(!isPowerShell('tcsh', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect csh', () => {
            ok(!isPowerShell('csh', 3 /* OperatingSystem.Linux */));
        });
    });
    suite('Non-PowerShell shells with full paths', () => {
        test('should not detect bash with full path', () => {
            ok(!isPowerShell('/bin/bash', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect zsh with full path', () => {
            ok(!isPowerShell('/usr/bin/zsh', 3 /* OperatingSystem.Linux */));
        });
        test('should not detect cmd.exe with full path', () => {
            ok(!isPowerShell('C:\\Windows\\System32\\cmd.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should not detect git bash', () => {
            ok(!isPowerShell('C:\\Program Files\\Git\\bin\\bash.exe', 1 /* OperatingSystem.Windows */));
        });
    });
    suite('Edge cases', () => {
        test('should handle empty string', () => {
            ok(!isPowerShell('', 1 /* OperatingSystem.Windows */));
        });
        test('should handle paths with spaces', () => {
            ok(isPowerShell('C:\\Program Files\\PowerShell\\7\\pwsh.exe', 1 /* OperatingSystem.Windows */));
            ok(!isPowerShell('C:\\Program Files\\Git\\bin\\bash.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should not match partial strings', () => {
            ok(!isPowerShell('notpowershell', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('powershellish', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('mypwsh', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('pwshell', 3 /* OperatingSystem.Linux */));
        });
        test('should handle strings containing powershell but not as basename', () => {
            ok(!isPowerShell('/powershell/bin/bash', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('/usr/pwsh/bin/zsh', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('C:\\powershell\\cmd.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should handle special characters in path', () => {
            ok(isPowerShell('/path/with-dashes/pwsh.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('/path/with_underscores/powershell', 3 /* OperatingSystem.Linux */));
            ok(isPowerShell('C:\\path\\with spaces\\pwsh.exe', 1 /* OperatingSystem.Windows */));
        });
        test('should handle relative paths', () => {
            ok(isPowerShell('./powershell.exe', 1 /* OperatingSystem.Windows */));
            ok(isPowerShell('../bin/pwsh', 3 /* OperatingSystem.Linux */));
            ok(isPowerShell('bin/powershell', 3 /* OperatingSystem.Linux */));
        });
        test('should not match similar named tools', () => {
            ok(!isPowerShell('powertool', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('shell', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('power', 3 /* OperatingSystem.Linux */));
            ok(!isPowerShell('pwshconfig', 3 /* OperatingSystem.Linux */));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbEhlbHBlcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL3Rlc3QvYnJvd3Nlci9ydW5JblRlcm1pbmFsSGVscGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXRHLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLGtDQUEwQixDQUFDLENBQUM7WUFDNUQsRUFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLGdDQUF3QixDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1lBQ25DLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxrQ0FBMEIsQ0FBQyxDQUFDO1lBQ3RELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxnQ0FBd0IsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtZQUM3QyxFQUFFLENBQUMsWUFBWSxDQUFDLHdCQUF3QixrQ0FBMEIsQ0FBQyxDQUFDO1lB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