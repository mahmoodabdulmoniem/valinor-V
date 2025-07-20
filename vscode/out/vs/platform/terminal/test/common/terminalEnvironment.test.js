/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { OS } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { collapseTildePath, sanitizeCwd, escapeNonWindowsPath } from '../../common/terminalEnvironment.js';
suite('terminalEnvironment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('collapseTildePath', () => {
        test('should return empty string for a falsy path', () => {
            strictEqual(collapseTildePath('', '/foo', '/'), '');
            strictEqual(collapseTildePath(undefined, '/foo', '/'), '');
        });
        test('should return path for a falsy user home', () => {
            strictEqual(collapseTildePath('/foo', '', '/'), '/foo');
            strictEqual(collapseTildePath('/foo', undefined, '/'), '/foo');
        });
        test('should not collapse when user home isn\'t present', () => {
            strictEqual(collapseTildePath('/foo', '/bar', '/'), '/foo');
            strictEqual(collapseTildePath('C:\\foo', 'C:\\bar', '\\'), 'C:\\foo');
        });
        test('should collapse with Windows separators', () => {
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo\\', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo\\', '\\'), '~\\bar\\baz');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse mixed case with Windows separators', () => {
            strictEqual(collapseTildePath('c:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
            strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'c:\\foo', '\\'), '~\\bar\\baz');
        });
        test('should collapse with Posix separators', () => {
            strictEqual(collapseTildePath('/foo/bar', '/foo', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar', '/foo/', '/'), '~/bar');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo', '/'), '~/bar/baz');
            strictEqual(collapseTildePath('/foo/bar/baz', '/foo/', '/'), '~/bar/baz');
        });
    });
    suite('sanitizeCwd', () => {
        if (OS === 1 /* OperatingSystem.Windows */) {
            test('should make the Windows drive letter uppercase', () => {
                strictEqual(sanitizeCwd('c:\\foo\\bar'), 'C:\\foo\\bar');
            });
        }
        test('should remove any wrapping quotes', () => {
            strictEqual(sanitizeCwd('\'/foo/bar\''), '/foo/bar');
            strictEqual(sanitizeCwd('"/foo/bar"'), '/foo/bar');
        });
    });
    suite('escapeNonWindowsPath', () => {
        test('should escape for bash/sh/zsh shells', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar', "bash" /* PosixShellType.Bash */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "bash" /* PosixShellType.Bash */), '\'/foo/bar\\\'baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar"baz', "bash" /* PosixShellType.Bash */), '\'/foo/bar"baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz"qux', "bash" /* PosixShellType.Bash */), '$\'/foo/bar\\\'baz"qux\'');
            strictEqual(escapeNonWindowsPath('/foo/bar', "sh" /* PosixShellType.Sh */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "sh" /* PosixShellType.Sh */), '\'/foo/bar\\\'baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar', "zsh" /* PosixShellType.Zsh */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "zsh" /* PosixShellType.Zsh */), '\'/foo/bar\\\'baz\'');
        });
        test('should escape for git bash', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar', "gitbash" /* WindowsShellType.GitBash */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "gitbash" /* WindowsShellType.GitBash */), '\'/foo/bar\\\'baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar"baz', "gitbash" /* WindowsShellType.GitBash */), '\'/foo/bar"baz\'');
        });
        test('should escape for fish shell', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar', "fish" /* PosixShellType.Fish */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "fish" /* PosixShellType.Fish */), '\'/foo/bar\\\'baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar"baz', "fish" /* PosixShellType.Fish */), '\'/foo/bar"baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz"qux', "fish" /* PosixShellType.Fish */), '"/foo/bar\'baz\\"qux"');
        });
        test('should escape for PowerShell', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar', "pwsh" /* GeneralShellType.PowerShell */), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz', "pwsh" /* GeneralShellType.PowerShell */), '\'/foo/bar\'\'baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar"baz', "pwsh" /* GeneralShellType.PowerShell */), '\'/foo/bar"baz\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz"qux', "pwsh" /* GeneralShellType.PowerShell */), '"/foo/bar\'baz`"qux"');
        });
        test('should default to POSIX escaping for unknown shells', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar'), '\'/foo/bar\'');
            strictEqual(escapeNonWindowsPath('/foo/bar\'baz'), '\'/foo/bar\\\'baz\'');
        });
        test('should remove dangerous characters', () => {
            strictEqual(escapeNonWindowsPath('/foo/bar$(echo evil)', "bash" /* PosixShellType.Bash */), '\'/foo/bar(echo evil)\'');
            strictEqual(escapeNonWindowsPath('/foo/bar`whoami`', "bash" /* PosixShellType.Bash */), '\'/foo/barwhoami\'');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbEVudmlyb25tZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUczRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1lBQ3hELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtZQUNyRCxXQUFXLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4RCxXQUFXLENBQUMsaUJBQWlCLENBQUMsTUFBTSxF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