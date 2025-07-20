/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok, strictEqual } from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { ILanguageModelToolsService } from '../../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from '../../browser/runInTerminalTool.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
class TestRunInTerminalTool extends RunInTerminalTool {
    constructor() {
        super(...arguments);
        this._osBackend = Promise.resolve(1 /* OperatingSystem.Windows */);
    }
    get commandLineAutoApprover() { return this._commandLineAutoApprover; }
    async rewriteCommandIfNeeded(options, args, instance, shell) {
        return this._rewriteCommandIfNeeded(options, args, instance, shell);
    }
    setBackendOs(os) {
        this._osBackend = Promise.resolve(os);
    }
}
suite('RunInTerminalTool', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let workspaceService;
    let runInTerminalTool;
    setup(() => {
        configurationService = new TestConfigurationService();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        instantiationService.stub(ILanguageModelToolsService, {
            getTools() {
                return [];
            },
        });
        workspaceService = instantiationService.invokeFunction(accessor => accessor.get(IWorkspaceContextService));
        runInTerminalTool = store.add(instantiationService.createInstance(TestRunInTerminalTool));
    });
    /**
     * Sets up the configuration with allow and deny lists
     */
    function setupConfiguration(allowList = [], denyList = []) {
        const allowListObject = {};
        for (const entry of allowList) {
            allowListObject[entry] = true;
        }
        const denyListObject = {};
        for (const entry of denyList) {
            denyListObject[entry] = true;
        }
        setConfig("chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.AllowList */, allowListObject);
        setConfig("chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DenyList */, denyListObject);
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
    function createInstanceWithCwd(uri) {
        return {
            getCwdResource: async () => uri
        };
    }
    /**
     * Executes a test scenario for the RunInTerminalTool
     */
    async function executeToolTest(params) {
        const context = {
            parameters: {
                command: 'echo hello',
                explanation: 'Print hello to the console',
                isBackground: false,
                ...params
            }
        };
        const result = await runInTerminalTool.prepareToolInvocation(context, CancellationToken.None);
        return result;
    }
    /**
     * Helper to assert that a command should be auto-approved (no confirmation required)
     */
    function assertAutoApproved(preparedInvocation) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(!preparedInvocation.confirmationMessages, 'Expected no confirmation messages for auto-approved command');
    }
    /**
     * Helper to assert that a command requires confirmation
     */
    function assertConfirmationRequired(preparedInvocation, expectedTitle) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(preparedInvocation.confirmationMessages, 'Expected confirmation messages for non-approved command');
        if (expectedTitle) {
            strictEqual(preparedInvocation.confirmationMessages.title, expectedTitle);
        }
    }
    suite('prepareToolInvocation - auto approval behavior', () => {
        test('should auto-approve commands in allow list', async () => {
            setupConfiguration(['echo']);
            const result = await executeToolTest({ command: 'echo hello world' });
            assertAutoApproved(result);
        });
        test('should require confirmation for commands not in allow list', async () => {
            setupConfiguration(['ls']);
            const result = await executeToolTest({
                command: 'rm file.txt',
                explanation: 'Remove a file'
            });
            assertConfirmationRequired(result, 'Run command in terminal');
        });
        test('should require confirmation for commands in deny list even if in allow list', async () => {
            setupConfiguration(['rm', 'echo'], ['rm']);
            const result = await executeToolTest({
                command: 'rm dangerous-file.txt',
                explanation: 'Remove a dangerous file'
            });
            assertConfirmationRequired(result, 'Run command in terminal');
        });
        test('should handle background commands with confirmation', async () => {
            setupConfiguration(['ls']);
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertConfirmationRequired(result, 'Run command in background terminal');
        });
        test('should auto-approve background commands in allow list', async () => {
            setupConfiguration(['npm']);
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertAutoApproved(result);
        });
        test('should handle regex patterns in allow list', async () => {
            setupConfiguration(['/^git (status|log)/']);
            const result = await executeToolTest({ command: 'git status --porcelain' });
            assertAutoApproved(result);
        });
        test('should handle complex command chains with sub-commands', async () => {
            setupConfiguration(['echo', 'ls']);
            const result = await executeToolTest({ command: 'echo "hello" && ls -la' });
            assertAutoApproved(result);
        });
        test('should require confirmation when one sub-command is not approved', async () => {
            setupConfiguration(['echo']);
            const result = await executeToolTest({ command: 'echo "hello" && rm file.txt' });
            assertConfirmationRequired(result);
        });
        test('should handle empty command strings', async () => {
            setupConfiguration(['echo']);
            const result = await executeToolTest({
                command: '',
                explanation: 'Empty command'
            });
            assertConfirmationRequired(result);
        });
        test('should handle commands with only whitespace', async () => {
            setupConfiguration(['echo']);
            const result = await executeToolTest({
                command: '   \t\n   ',
                explanation: 'Whitespace only command'
            });
            assertConfirmationRequired(result);
        });
    });
    suite('command re-writing', () => {
        function createRewriteOptions(command, chatSessionId) {
            return {
                parameters: {
                    command,
                    explanation: 'Test command',
                    isBackground: false
                },
                chatSessionId
            };
        }
        suite('cd <cwd> && <suffix> -> <suffix>', () => {
            suite('Posix', () => {
                setup(() => {
                    runInTerminalTool.setBackendOs(3 /* OperatingSystem.Linux */);
                });
                test('should return original command when no cd prefix pattern matches', async () => {
                    const options = createRewriteOptions('echo hello world');
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'pwsh');
                    strictEqual(result, 'echo hello world');
                });
                test('should return original command when cd pattern does not have suffix', async () => {
                    runInTerminalTool.setBackendOs(3 /* OperatingSystem.Linux */);
                    const options = createRewriteOptions('cd /some/path');
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'pwsh');
                    strictEqual(result, 'cd /some/path');
                });
                test('should rewrite command with ; separator when directory matches cwd', async () => {
                    const testDir = '/test/workspace';
                    const options = createRewriteOptions(`cd ${testDir}; npm test`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'pwsh');
                    strictEqual(result, 'npm test');
                });
                test('should rewrite command with && separator when directory matches cwd', async () => {
                    const testDir = '/test/workspace';
                    const options = createRewriteOptions(`cd ${testDir} && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should rewrite command when the path is wrapped in double quotes', async () => {
                    const testDir = '/test/workspace';
                    const options = createRewriteOptions(`cd "${testDir}" && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should not rewrite command when directory does not match cwd', async () => {
                    const testDir = '/test/workspace';
                    const differentDir = '/different/path';
                    const command = `cd ${differentDir} && npm install`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should return original command when no workspace folders available', async () => {
                    const command = 'cd /some/path && npm install';
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: []
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should return original command when multiple workspace folders available', async () => {
                    const command = 'cd /some/path && npm install';
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [
                            { uri: { fsPath: '/workspace1' } },
                            { uri: { fsPath: '/workspace2' } }
                        ]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should handle commands with complex suffixes', async () => {
                    const testDir = '/test/workspace';
                    const command = `cd ${testDir} && npm install && npm test && echo "done"`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, 'npm install && npm test && echo "done"');
                });
                test('should handle session without chatSessionId', async () => {
                    const command = 'cd /some/path && npm install';
                    const options = createRewriteOptions(command);
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: '/some/path' } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should ignore any trailing forward slash', async () => {
                    const testDir = '/test/workspace';
                    const options = createRewriteOptions(`cd ${testDir}/ && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
            });
            suite('Windows', () => {
                setup(() => {
                    runInTerminalTool.setBackendOs(1 /* OperatingSystem.Windows */);
                });
                test('should ignore any trailing back slash', async () => {
                    const testDir = 'c:\\test\\workspace';
                    const options = createRewriteOptions(`cd ${testDir}\\ && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, undefined, 'cmd');
                    strictEqual(result, 'npm install');
                });
                test('should prioritize instance cwd over workspace service', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${instanceDir} && npm test`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should prioritize instance cwd over workspace service - PowerShell style', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${instanceDir}; npm test`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'pwsh');
                    strictEqual(result, 'npm test');
                });
                test('should not rewrite when instance cwd differs from cd path', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const cdDir = 'C:\\different\\path';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${cdDir} && npm test`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    // Should not rewrite since instance cwd doesn't match cd path
                    strictEqual(result, command);
                });
                test('should fallback to workspace service when instance getCwdResource returns undefined', async () => {
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${workspaceDir} && npm test`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd(undefined);
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should prioritize instance cwd over workspace service even when both match cd path', async () => {
                    const sharedDir = 'C:\\shared\\workspace';
                    const command = `cd ${sharedDir} && npm build`;
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: sharedDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: sharedDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    strictEqual(result, 'npm build');
                });
                test('should handle case-insensitive comparison on Windows with instance', async () => {
                    const instanceDir = 'C:\\Instance\\Workspace';
                    const cdDir = 'c:\\instance\\workspace'; // Different case
                    const command = `cd ${cdDir} && npm test`;
                    const options = createRewriteOptions(command, 'session-1');
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should handle quoted paths with instance priority', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const command = 'cd "C:\\instance\\workspace" && npm test';
                    const options = createRewriteOptions(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: 'C:\\different\\workspace' } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, options.parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL3Rlc3QvYnJvd3Nlci9ydW5JblRlcm1pbmFsVG9vbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBR3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JHLE9BQU8sRUFBOEQsMEJBQTBCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUU5SixPQUFPLEVBQUUsaUJBQWlCLEVBQWtDLE1BQU0sb0NBQW9DLENBQUM7QUFFdkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFNcEcsTUFBTSxxQkFBc0IsU0FBUSxpQkFBaUI7SUFBckQ7O1FBQ29CLGVBQVUsR0FBNkIsT0FBTyxDQUFDLE9BQU8saUNBQXlCLENBQUM7SUFXcEcsQ0FBQztJQVRBLElBQUksdUJBQXVCLEtBQThCLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUVoRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsT0FBMEMsRUFBRSxJQUErQixFQUFFLFFBQStELEVBQUUsS0FBYTtRQUN2TCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsSUFB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