/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-test-async-suite */
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { homedir, userInfo } from 'os';
import { isWindows } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { getShellIntegrationInjection, getWindowsBuildNumber } from '../../node/terminalEnvironment.js';
const enabledProcessOptions = { shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' }, windowsEnableConpty: true, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const disabledProcessOptions = { shellIntegration: { enabled: false, suggestEnabled: false, nonce: '' }, windowsEnableConpty: true, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const winptyProcessOptions = { shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' }, windowsEnableConpty: false, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const pwshExe = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh';
const repoRoot = process.platform === 'win32' ? process.cwd()[0].toLowerCase() + process.cwd().substring(1) : process.cwd();
const logService = new NullLogService();
const productService = { applicationName: 'vscode' };
const defaultEnvironment = {};
function deepStrictEqualIgnoreStableVar(actual, expected) {
    if (actual && 'envMixin' in actual && actual.envMixin) {
        delete actual.envMixin['VSCODE_STABLE'];
    }
    deepStrictEqual(actual, expected);
}
suite('platform - terminalEnvironment', async () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getShellIntegrationInjection', async () => {
        suite('should not enable', async () => {
            // This test is only expected to work on Windows 10 build 18309 and above
            (getWindowsBuildNumber() < 18309 ? test.skip : test)('when isFeatureTerminal or when no executable is provided', async () => {
                strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: true }, enabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: false }, enabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'injection');
            });
            if (isWindows) {
                test('when on windows with conpty false', async () => {
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'], isFeatureTerminal: false }, winptyProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                });
            }
        });
        // These tests are only expected to work on Windows 10 build 18309 and above
        (getWindowsBuildNumber() < 18309 ? suite.skip : suite)('pwsh', async () => {
            const expectedPs1 = process.platform === 'win32'
                ? `try { . "${repoRoot}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1" } catch {}`
                : `. "${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"`;
            suite('should override args', async () => {
                const enabledExpectedResult = Object.freeze({
                    type: 'injection',
                    newArgs: [
                        '-noexit',
                        '-command',
                        expectedPs1
                    ],
                    envMixin: {
                        VSCODE_INJECTION: '1'
                    }
                });
                test('when undefined, []', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                suite('when no logo', async () => {
                    test('array - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOLOGO'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-nol'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOL'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    test('string - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NoLogo' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOLOGO' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-nol' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOL' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                });
            });
            suite('should incorporate login arg', async () => {
                const enabledExpectedResult = Object.freeze({
                    type: 'injection',
                    newArgs: [
                        '-l',
                        '-noexit',
                        '-command',
                        expectedPs1
                    ],
                    envMixin: {
                        VSCODE_INJECTION: '1'
                    }
                });
                test('when array contains no logo and login', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                test('when string', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
            });
            suite('should not modify args', async () => {
                test('when shell integration is disabled', async () => {
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                });
                test('when using unrecognized arg', async () => {
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                });
                test('when using unrecognized arg (string)', async () => {
                    strictEqual((await getShellIntegrationInjection({ executable: pwshExe, args: '-i' }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                });
            });
        });
        if (process.platform !== 'win32') {
            suite('zsh', async () => {
                suite('should override args', async () => {
                    const username = userInfo().username;
                    const expectedDir = new RegExp(`.+\/${username}-vscode-zsh`);
                    const customZdotdir = '/custom/zsh/dotdir';
                    const expectedDests = [
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshrc`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zprofile`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshenv`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zlogin`)
                    ];
                    const expectedSources = [
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-rc.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-profile.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-env.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-login.zsh/
                    ];
                    function assertIsEnabled(result, globalZdotdir = homedir()) {
                        strictEqual(Object.keys(result.envMixin).length, 3);
                        ok(result.envMixin['ZDOTDIR']?.match(expectedDir));
                        strictEqual(result.envMixin['USER_ZDOTDIR'], globalZdotdir);
                        ok(result.envMixin['VSCODE_INJECTION']?.match('1'));
                        strictEqual(result.filesToCopy?.length, 4);
                        ok(result.filesToCopy[0].dest.match(expectedDests[0]));
                        ok(result.filesToCopy[1].dest.match(expectedDests[1]));
                        ok(result.filesToCopy[2].dest.match(expectedDests[2]));
                        ok(result.filesToCopy[3].dest.match(expectedDests[3]));
                        ok(result.filesToCopy[0].source.match(expectedSources[0]));
                        ok(result.filesToCopy[1].source.match(expectedSources[1]));
                        ok(result.filesToCopy[2].source.match(expectedSources[2]));
                        ok(result.filesToCopy[3].source.match(expectedSources[3]));
                    }
                    test('when undefined, []', async () => {
                        const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result1?.newArgs, ['-i']);
                        assertIsEnabled(result1);
                        const result2 = await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result2?.newArgs, ['-i']);
                        assertIsEnabled(result2);
                    });
                    suite('should incorporate login arg', async () => {
                        test('when array', async () => {
                            const result = await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                            deepStrictEqual(result?.newArgs, ['-il']);
                            assertIsEnabled(result);
                        });
                    });
                    suite('should not modify args', async () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual((await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                            strictEqual((await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                        });
                        test('when using unrecognized arg', async () => {
                            strictEqual((await getShellIntegrationInjection({ executable: 'zsh', args: ['-l', '-fake'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                        });
                    });
                    suite('should incorporate global ZDOTDIR env variable', async () => {
                        test('when custom ZDOTDIR', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir }, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1, customZdotdir);
                        });
                        test('when undefined', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, undefined, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1);
                        });
                    });
                });
            });
            suite('bash', async () => {
                suite('should override args', async () => {
                    test('when undefined, [], empty string', async () => {
                        const enabledExpectedResult = Object.freeze({
                            type: 'injection',
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1'
                            }
                        });
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: '' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    suite('should set login env variable and not modify args', async () => {
                        const enabledExpectedResult = Object.freeze({
                            type: 'injection',
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1',
                                VSCODE_SHELL_LOGIN: '1'
                            }
                        });
                        test('when array', async () => {
                            deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        });
                    });
                    suite('should not modify args', async () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual((await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                            strictEqual((await getShellIntegrationInjection({ executable: 'bash', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                        });
                        test('when custom array entry', async () => {
                            strictEqual((await getShellIntegrationInjection({ executable: 'bash', args: ['-l', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true)).type, 'failure');
                        });
                    });
                });
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L25vZGUvdGVybWluYWxFbnZpcm9ubWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLG1EQUFtRDtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDdkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUc1RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUscUJBQXFCLEVBQTRFLE1BQU0sbUNBQW1DLENBQUM7QUFFbEwsTUFBTSxxQkFBcUIsR0FBNEIsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLEtBQUssRUFBRSw4QkFBOEIsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQy9QLE1BQU0sc0JBQXNCLEdBQTRCLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxL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Q0FBQyxRQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDckQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUMzQyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZELEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdkQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN2RCxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZELEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMzRCxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNELEVBQUUsQ0FBQyxNQUFNLENBQUMs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