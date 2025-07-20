/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { CommandLineAutoApprover } from '../../browser/commandLineAutoApprover.js';
import { ok } from 'assert';
suite('CommandLineAutoApprover', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let commandLineAutoApprover;
    let shell;
    let os;
    setup(() => {
        configurationService = new TestConfigurationService();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        shell = 'bash';
        os = 3 /* OperatingSystem.Linux */;
        commandLineAutoApprover = store.add(instantiationService.createInstance(CommandLineAutoApprover));
    });
    function setAllowList(value) {
        setConfig("chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.AllowList */, value);
    }
    function setDenyList(value) {
        setConfig("chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DenyList */, value);
    }
    function setConfig(key, value) {
        configurationService.setUserConfiguration(key, value);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([key]),
            source: 2 /* ConfigurationTarget.USER */,
            change: null,
        });
    }
    function isAutoApproved(commandLine) {
        return commandLineAutoApprover.isAutoApproved(commandLine, shell, os);
    }
    suite('allowList without a denyList', () => {
        test('should auto-approve exact command match', () => {
            setAllowList({
                "echo": true
            });
            ok(isAutoApproved('echo'));
        });
        test('should auto-approve command with arguments', () => {
            setAllowList({
                "echo": true
            });
            ok(isAutoApproved('echo hello world'));
        });
        test('should not auto-approve when there is no match', () => {
            setAllowList({
                "echo": true
            });
            ok(!isAutoApproved('ls'));
        });
        test('should not auto-approve partial command matches', () => {
            setAllowList({
                "echo": true
            });
            ok(!isAutoApproved('echotest'));
        });
        test('should handle multiple commands in allowList', () => {
            setAllowList({
                "echo": true,
                "ls": true,
                "pwd": true
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
        });
    });
    suite('denyList without an allowList', () => {
        test('should deny commands in denyList', () => {
            setDenyList({
                "rm": true,
                "del": true
            });
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should not auto-approve safe commands when no allowList is present', () => {
            setDenyList({
                "rm": true
            });
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
        });
    });
    suite('allowList with denyList', () => {
        test('should deny commands in denyList even if in allowList', () => {
            setAllowList({
                "echo": true,
                "rm": true
            });
            setDenyList({
                "rm": true
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('rm file.txt'));
        });
        test('should auto-approve allowList commands not in denyList', () => {
            setAllowList({
                "echo": true,
                "ls": true,
                "pwd": true
            });
            setDenyList({
                "rm": true,
                "del": true
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
            ok(!isAutoApproved('del'));
        });
    });
    suite('regex patterns', () => {
        test('should handle regex patterns in allowList', () => {
            setAllowList({
                "/^echo/": true,
                "/^ls/": true,
                "pwd": true
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle regex patterns in denyList', () => {
            setAllowList({
                "echo": true,
                "rm": true
            });
            setDenyList({
                "/^rm\\s+/": true,
                "/^del\\s+/": true
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('rm'));
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should handle complex regex patterns', () => {
            setAllowList({
                "/^(echo|ls|pwd)\\b/": true,
                "/^git (status|show\\b.*)$/": true
            });
            setDenyList({
                "/rm|del|kill/": true
            });
            ok(isAutoApproved('echo test'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(isAutoApproved('git status'));
            ok(isAutoApproved('git show'));
            ok(isAutoApproved('git show HEAD'));
            ok(!isAutoApproved('rm file'));
            ok(!isAutoApproved('del file'));
            ok(!isAutoApproved('kill process'));
        });
    });
    suite('edge cases', () => {
        test('should handle empty allowList and denyList', () => {
            setAllowList({});
            setDenyList({});
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle empty command strings', () => {
            setAllowList({
                "echo": true
            });
            ok(!isAutoApproved(''));
            ok(!isAutoApproved('   '));
        });
        test('should handle whitespace in commands', () => {
            setAllowList({
                "echo": true
            });
            ok(isAutoApproved('echo   hello   world'));
            ok(!isAutoApproved('  echo hello'));
        });
        test('should be case-sensitive by default', () => {
            setAllowList({
                "echo": true
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('ECHO hello'));
            ok(!isAutoApproved('Echo hello'));
        });
        // https://github.com/microsoft/vscode/issues/252411
        test('should handle string-based values with special regex characters', () => {
            setAllowList({
                "pwsh.exe -File D:\\foo.bar\\a-script.ps1": true
            });
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1'));
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1 -AnotherArg'));
        });
    });
    suite('PowerShell-specific commands', () => {
        setup(() => {
            shell = 'pwsh';
        });
        test('should handle Windows PowerShell commands', () => {
            setAllowList({
                "Get-ChildItem": true,
                "Get-Content": true,
                "Get-Location": true
            });
            setDenyList({
                "Remove-Item": true,
                "del": true
            });
            ok(isAutoApproved('Get-ChildItem'));
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('Get-Location'));
            ok(!isAutoApproved('Remove-Item file.txt'));
        });
        test('should handle ( prefixes', () => {
            setAllowList({
                "Get-Content": true
            });
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('(Get-Content file.txt'));
            ok(!isAutoApproved('[Get-Content'));
            ok(!isAutoApproved('foo'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL3Rlc3QvYnJvd3Nlci9jb21tYW5kTGluZUF1dG9BcHByb3Zlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFFNUIsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQTJDLENBQUM7SUFDaEQsSUFBSSxvQkFBOEMsQ0FBQztJQUVuRCxJQUFJLHVCQUFnRCxDQUFDO0lBQ3JELElBQUksS0FBYSxDQUFDO0lBQ2xCLElBQUksRUFBbUIsQ0FBQztJQUV4QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ3RELG9CQUFvQixHQUFHLDZCQUE2QixDQUFDO1lBQ3BELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFvQjtTQUNoRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRVYsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNmLEVBQUUsZ0NBQXdCLENBQUM7UUFD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LEVBQUU7WUFDNUUsWUFBWSxDQUFDO2dCQUNaLDBDQUEwQyxFQUFFLElBQUk7YUFDaEQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLGNBQWMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsRUFBRSxDQUFDLGNBQWMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDMUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtZQUNWLEtBQUssR0FBRyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1lBQ3RELFlBQVksQ0FBQztnQkFDWixlQUFlLEVBQUUsSUFBSTtnQkFDckIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3BCLENBQUMsQ0FBQztZQUNILFdBQVcsQ0FBQztnQkFDWCxhQUFhLEVBQUUsSUFBSTtnQkFDbkIsS0FBSyxFQUFFLElBQUk7YUFDWCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDcEMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7WUFDM0MsRUFBRSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ25DLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLFlBQVksQ0FBQztnQkFDWixhQUFhLEVBQUUsSUFBSTthQUNuQixDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUMzQyxFQUFFLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztZQUM1QyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNwQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==