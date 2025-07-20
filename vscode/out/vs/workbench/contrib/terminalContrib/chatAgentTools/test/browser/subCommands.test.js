/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { extractInlineSubCommands, splitCommandLineIntoSubCommands } from '../../browser/subCommands.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('splitCommandLineIntoSubCommands', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should split command line into subcommands', () => {
        const commandLine = 'echo "Hello World" && ls -la || pwd';
        const expectedSubCommands = ['echo "Hello World"', 'ls -la', 'pwd'];
        const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
        deepStrictEqual(actualSubCommands, expectedSubCommands);
    });
    suite('bash/sh shell', () => {
        test('should split on logical operators', () => {
            const commandLine = 'echo test && ls -la || pwd';
            const expectedSubCommands = ['echo test', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on pipes', () => {
            const commandLine = 'ls -la | grep test | wc -l';
            const expectedSubCommands = ['ls -la', 'grep test', 'wc -l'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on semicolons', () => {
            const commandLine = 'cd /tmp; ls -la; pwd';
            const expectedSubCommands = ['cd /tmp', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on background operator', () => {
            const commandLine = 'sleep 5 & echo done';
            const expectedSubCommands = ['sleep 5', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on redirection operators', () => {
            const commandLine = 'echo test > output.txt && cat output.txt';
            const expectedSubCommands = ['echo test', 'output.txt', 'cat output.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on stderr redirection', () => {
            const commandLine = 'command 2> error.log && echo success';
            const expectedSubCommands = ['command', 'error.log', 'echo success'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on append redirection', () => {
            const commandLine = 'echo line1 >> file.txt && echo line2 >> file.txt';
            const expectedSubCommands = ['echo line1', 'file.txt', 'echo line2', 'file.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('zsh shell', () => {
        test('should split on zsh-specific operators', () => {
            const commandLine = 'echo test <<< "input" && ls';
            const expectedSubCommands = ['echo test', '"input"', 'ls'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on process substitution', () => {
            const commandLine = 'diff <(ls dir1) <(ls dir2)';
            const expectedSubCommands = ['diff', 'ls dir1)', 'ls dir2)'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on bidirectional redirection', () => {
            const commandLine = 'command <> file.txt && echo done';
            const expectedSubCommands = ['command', 'file.txt', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle complex zsh command chains', () => {
            const commandLine = 'ls | grep test && echo found || echo not found';
            const expectedSubCommands = ['ls', 'grep test', 'echo found', 'echo not found'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('PowerShell', () => {
        test('should not split on PowerShell logical operators', () => {
            const commandLine = 'Get-ChildItem -and Get-Location -or Write-Host "test"';
            const expectedSubCommands = ['Get-ChildItem -and Get-Location -or Write-Host "test"'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'powershell', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on PowerShell pipes', () => {
            const commandLine = 'Get-Process | Where-Object Name -eq "notepad" | Stop-Process';
            const expectedSubCommands = ['Get-Process', 'Where-Object Name -eq "notepad"', 'Stop-Process'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on PowerShell redirection', () => {
            const commandLine = 'Get-Process > processes.txt && Get-Content processes.txt';
            const expectedSubCommands = ['Get-Process', 'processes.txt', 'Get-Content processes.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('edge cases', () => {
        test('should return single command when no operators present', () => {
            const commandLine = 'echo "hello world"';
            const expectedSubCommands = ['echo "hello world"'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle empty command', () => {
            const commandLine = '';
            const expectedSubCommands = [''];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should trim whitespace from subcommands', () => {
            const commandLine = 'echo test   &&   ls -la   ||   pwd';
            const expectedSubCommands = ['echo test', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle multiple consecutive operators', () => {
            const commandLine = 'echo test && && ls';
            const expectedSubCommands = ['echo test', '', 'ls'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle unknown shell as sh', () => {
            const commandLine = 'echo test && ls -la';
            const expectedSubCommands = ['echo test', 'ls -la'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'unknown-shell', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('shell type detection', () => {
        test('should detect PowerShell variants', () => {
            const commandLine = 'Get-Process ; Get-Location';
            const expectedSubCommands = ['Get-Process', 'Get-Location'];
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'pwsh', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell-preview', 3 /* OperatingSystem.Linux */), expectedSubCommands);
        });
        test('should detect zsh specifically', () => {
            const commandLine = 'echo test <<< input';
            const expectedSubCommands = ['echo test', 'input'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should default to sh for other shells', () => {
            const commandLine = 'echo test && ls';
            const expectedSubCommands = ['echo test', 'ls'];
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'dash', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'fish', 3 /* OperatingSystem.Linux */), expectedSubCommands);
        });
    });
    suite('complex command combinations', () => {
        test('should handle mixed operators in order', () => {
            const commandLine = 'ls | grep test && echo found > result.txt || echo failed';
            const expectedSubCommands = ['ls', 'grep test', 'echo found', 'result.txt', 'echo failed'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test.skip('should handle subshells and braces', () => {
            const commandLine = '(cd /tmp && ls) && { echo done; }';
            const expectedSubCommands = ['(cd /tmp', 'ls)', '{ echo done', '}'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle here documents', () => {
            const commandLine = 'cat << EOF && echo done';
            const expectedSubCommands = ['cat', 'EOF', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
});
suite('extractInlineSubCommands', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertSubCommandsUnordered(result, expectedSubCommands) {
        deepStrictEqual(Array.from(result).sort(), expectedSubCommands.sort());
    }
    suite('POSIX shells (bash, zsh, sh)', () => {
        test('should extract command substitution with $()', () => {
            const commandLine = 'echo "Current date: $(date)"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date']);
        });
        test('should extract command substitution with backticks', () => {
            const commandLine = 'echo "Current date: `date`"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date']);
        });
        test('should extract process substitution with <()', () => {
            const commandLine = 'diff <(cat file1.txt) <(cat file2.txt)';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['cat file1.txt', 'cat file2.txt']);
        });
        test('should extract process substitution with >()', () => {
            const commandLine = 'tee >(wc -l) >(grep pattern) < input.txt';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['wc -l', 'grep pattern']);
        });
        test('should extract multiple inline commands', () => {
            const commandLine = 'echo "Today is $(date) and user is $(whoami)"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date', 'whoami']);
        });
        test('should extract nested inline commands', () => {
            const commandLine = 'echo "$(echo "Inner: $(date)")"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['echo "Inner: $(date)"', 'date']);
        });
        test('should handle mixed substitution types', () => {
            const commandLine = 'echo "Date: $(date)" && cat `which ls` | grep <(echo pattern)';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date', 'which ls', 'echo pattern']);
        });
        test('should handle empty substitutions', () => {
            const commandLine = 'echo $() test ``';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, []);
        });
        test('should handle commands with whitespace', () => {
            const commandLine = 'echo "$( ls -la | grep test )"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['ls -la | grep test']);
        });
    });
    suite('PowerShell (pwsh)', () => {
        test('should extract command substitution with $()', () => {
            const commandLine = 'Write-Host "Current date: $(Get-Date)"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Date']);
        });
        test('should extract array subexpression with @()', () => {
            const commandLine = 'Write-Host @(Get-ChildItem | Where-Object {$_.Name -like "*.txt"})';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-ChildItem | Where-Object {$_.Name -like "*.txt"}']);
        });
        test('should extract call operator with &()', () => {
            const commandLine = 'Write-Host &(Get-Command git)';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Command git']);
        });
        test('should extract multiple PowerShell substitutions', () => {
            const commandLine = 'Write-Host "User: $(whoami) and date: $(Get-Date)"';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['whoami', 'Get-Date']);
        });
        test('should extract nested PowerShell commands', () => {
            const commandLine = 'Write-Host "$(Write-Host "Inner: $(Get-Date)")"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Write-Host "Inner: $(Get-Date)"', 'Get-Date']);
        });
        test('should handle mixed PowerShell substitution types', () => {
            const commandLine = 'Write-Host "$(Get-Date)" @(Get-ChildItem) &(Get-Command ls)';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Date', 'Get-ChildItem', 'Get-Command ls']);
        });
        test('should handle PowerShell commands with complex expressions', () => {
            const commandLine = 'Write-Host "$((Get-ChildItem).Count)"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['(Get-ChildItem).Count']);
        });
        test('should handle empty PowerShell substitutions', () => {
            const commandLine = 'Write-Host $() @() &()';
            const result = extractInlineSubCommands(commandLine, 'pwsh', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, []);
        });
    });
    suite('Shell detection', () => {
        test('should detect PowerShell from various shell paths', () => {
            const commandLine = 'Write-Host "$(Get-Date)"';
            const powershellShells = [
                'powershell.exe',
                'pwsh.exe',
                'powershell',
                'pwsh',
                'powershell-preview',
                'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                '/usr/bin/pwsh'
            ];
            for (const shell of powershellShells) {
                const result = extractInlineSubCommands(commandLine, shell, commandLine.match(/\.exe/) ? 1 /* OperatingSystem.Windows */ : 3 /* OperatingSystem.Linux */);
                assertSubCommandsUnordered(result, ['Get-Date']);
            }
        });
        test('should treat non-PowerShell shells as POSIX', () => {
            const commandLine = 'echo "$(date)"';
            const posixShells = [
                '/bin/bash',
                '/bin/sh',
                '/bin/zsh',
                '/usr/bin/fish',
                'bash',
                'sh',
                'zsh'
            ];
            for (const shell of posixShells) {
                const result = extractInlineSubCommands(commandLine, shell, 3 /* OperatingSystem.Linux */);
                assertSubCommandsUnordered(result, ['date']);
            }
        });
    });
    // suite('Edge cases', () => {
    // 	test('should handle commands with no inline substitutions', () => {
    // 		const result1 = extractInlineSubCommands('echo hello world', '/bin/bash', OperatingSystem.Linux);
    // 		deepStrictEqual(Array.from(result1), []);
    // 		const result2 = extractInlineSubCommands('Write-Host "hello world"', 'pwsh', OperatingSystem.Linux);
    // 		deepStrictEqual(Array.from(result2), []);
    // 	});
    // 	test('should handle malformed substitutions gracefully', () => {
    // 		const commandLine = 'echo $( incomplete';
    // 		const result = extractInlineSubCommands(commandLine, '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // 	test('should handle escaped substitutions (should still extract)', () => {
    // 		// Note: This implementation doesn't handle escaping - that would be a future enhancement
    // 		const commandLine = 'echo \\$(date)';
    // 		const result = extractInlineSubCommands(commandLine, '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, ['date']);
    // 	});
    // 	test('should handle empty command line', () => {
    // 		const result = extractInlineSubCommands('', '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // 	test('should handle whitespace-only command line', () => {
    // 		const result = extractInlineSubCommands('   \t  \n  ', '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViQ29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL3Rlc3QvYnJvd3Nlci9zdWJDb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLCtCQUErQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFekcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEcsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQUM7UUFDMUQsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxNQUFNLGlCQUFpQixHQUFHLCtCQUErQixDQUFDLFdBQVcsRUFBRSxLQUFLLGdDQUF3QixDQUFDO1FBQ3JHLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtZQUM5QyxNQUFNLFdBQVcsR0FBRyw0QkFBNEIsQ0FBQztZQUNqRCxNQUFNLG1CQUFtQixHQUFHLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxN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