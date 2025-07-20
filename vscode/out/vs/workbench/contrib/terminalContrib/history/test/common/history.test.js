/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual, ok } from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { join } from '../../../../../../base/common/path.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { env } from '../../../../../../base/common/process.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IRemoteAgentService } from '../../../../../services/remote/common/remoteAgentService.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
import { fetchBashHistory, fetchFishHistory, fetchPwshHistory, fetchZshHistory, sanitizeFishHistoryCmd, TerminalPersistedHistory } from '../../common/history.js';
function getConfig(limit) {
    return {
        terminal: {
            integrated: {
                shellIntegration: {
                    history: limit
                }
            }
        }
    };
}
const expectedCommands = [
    'single line command',
    'git commit -m "A wrapped line in pwsh history\n\nSome commit description\n\nFixes #xyz"',
    'git status',
    'two "\nline"'
];
suite('Terminal history', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('TerminalPersistedHistory', () => {
        let history;
        let instantiationService;
        let configurationService;
        setup(() => {
            configurationService = new TestConfigurationService(getConfig(5));
            instantiationService = store.add(new TestInstantiationService());
            instantiationService.set(IConfigurationService, configurationService);
            instantiationService.set(IStorageService, store.add(new TestStorageService()));
            history = store.add(instantiationService.createInstance((TerminalPersistedHistory), 'test'));
        });
        teardown(() => {
            instantiationService.dispose();
        });
        test('should support adding items to the cache and respect LRU', () => {
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [
                ['foo', 1]
            ]);
            history.add('bar', 2);
            deepStrictEqual(Array.from(history.entries), [
                ['foo', 1],
                ['bar', 2]
            ]);
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [
                ['bar', 2],
                ['foo', 1]
            ]);
        });
        test('should support removing specific items', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
        });
        test('should limit the number of entries based on config', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
            configurationService.setUserConfiguration('terminal', getConfig(2).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('7', 7);
            strictEqual(Array.from(history.entries).length, 2);
            configurationService.setUserConfiguration('terminal', getConfig(3).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('8', 8);
            strictEqual(Array.from(history.entries).length, 3);
            history.add('9', 9);
            strictEqual(Array.from(history.entries).length, 3);
        });
        test('should reload from storage service after recreation', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            strictEqual(Array.from(history.entries).length, 3);
            const history2 = store.add(instantiationService.createInstance(TerminalPersistedHistory, 'test'));
            strictEqual(Array.from(history2.entries).length, 3);
        });
    });
    suite('fetchBashHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history',
            '',
            'Some commit description',
            '',
            'Fixes #xyz"',
            'git status',
            'two "',
            'line"'
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.bash_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.bash_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.bash_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchBashHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchZshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContentType = [
            {
                type: 'simple',
                content: [
                    'single line command',
                    'git commit -m "A wrapped line in pwsh history\\',
                    '\\',
                    'Some commit description\\',
                    '\\',
                    'Fixes #xyz"',
                    'git status',
                    'two "\\',
                    'line"'
                ].join('\n')
            },
            {
                type: 'extended',
                content: [
                    ': 1655252330:0;single line command',
                    ': 1655252330:0;git commit -m "A wrapped line in pwsh history\\',
                    '\\',
                    'Some commit description\\',
                    '\\',
                    'Fixes #xyz"',
                    ': 1655252330:0;git status',
                    ': 1655252330:0;two "\\',
                    'line"'
                ].join('\n')
            },
        ];
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        for (const { type, content } of fileContentType) {
            suite(type, () => {
                setup(() => {
                    instantiationService = new TestInstantiationService();
                    instantiationService.stub(IFileService, {
                        async readFile(resource) {
                            const expected = URI.from({ scheme: fileScheme, path: filePath });
                            strictEqual(resource.scheme, expected.scheme);
                            strictEqual(resource.path, expected.path);
                            return { value: VSBuffer.fromString(content) };
                        }
                    });
                    instantiationService.stub(IRemoteAgentService, {
                        async getEnvironment() { return remoteEnvironment; },
                        getConnection() { return remoteConnection; }
                    });
                });
                teardown(() => {
                    instantiationService.dispose();
                });
                if (!isWindows) {
                    suite('local', () => {
                        let originalEnvValues;
                        setup(() => {
                            originalEnvValues = { HOME: env['HOME'] };
                            env['HOME'] = '/home/user';
                            remoteConnection = { remoteAuthority: 'some-remote' };
                            fileScheme = Schemas.vscodeRemote;
                            filePath = '/home/user/.bash_history';
                        });
                        teardown(() => {
                            if (originalEnvValues['HOME'] === undefined) {
                                delete env['HOME'];
                            }
                            else {
                                env['HOME'] = originalEnvValues['HOME'];
                            }
                        });
                        test('current OS', async () => {
                            filePath = '/home/user/.zsh_history';
                            deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
                        });
                    });
                }
                suite('remote', () => {
                    let originalEnvValues;
                    setup(() => {
                        originalEnvValues = { HOME: env['HOME'] };
                        env['HOME'] = '/home/user';
                        remoteConnection = { remoteAuthority: 'some-remote' };
                        fileScheme = Schemas.vscodeRemote;
                        filePath = '/home/user/.zsh_history';
                    });
                    teardown(() => {
                        if (originalEnvValues['HOME'] === undefined) {
                            delete env['HOME'];
                        }
                        else {
                            env['HOME'] = originalEnvValues['HOME'];
                        }
                    });
                    test('Windows', async () => {
                        remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                        strictEqual(await instantiationService.invokeFunction(fetchZshHistory), undefined);
                    });
                    test('macOS', async () => {
                        remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                        deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
                    });
                    test('Linux', async () => {
                        remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                        deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
                    });
                });
            });
        }
    });
    suite('fetchPwshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history`',
            '`',
            'Some commit description`',
            '`',
            'Fixes #xyz"',
            'git status',
            'two "`',
            'line"'
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({
                        scheme: fileScheme,
                        authority: remoteConnection?.remoteAuthority,
                        path: URI.file(filePath).path
                    });
                    // Sanitize the encoded `/` chars as they don't impact behavior
                    strictEqual(resource.toString().replaceAll('%5C', '/'), expected.toString().replaceAll('%5C', '/'));
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        suite('local', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
                env['HOME'] = '/home/user';
                env['APPDATA'] = 'C:\\AppData';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.zsh_history';
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('current OS', async () => {
                if (isWindows) {
                    filePath = join(env['APPDATA'], 'Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt');
                }
                else {
                    filePath = join(env['HOME'], '.local/share/powershell/PSReadline/ConsoleHost_history.txt');
                }
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                env['APPDATA'] = 'C:\\AppData';
                filePath = 'C:\\AppData\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchFishHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            '- cmd: single line command',
            '  when: 1650000000',
            '- cmd: git commit -m "A wrapped line in pwsh history\\n\\nSome commit description\\n\\nFixes #xyz"',
            '  when: 1650000010',
            '- cmd: git status',
            '  when: 1650000020',
            '- cmd: two "\\nline"',
            '  when: 1650000030',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.local/share/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.local/share/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
            suite('local (overriden path)', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                    env['XDG_DATA_HOME'] = '/home/user/data-home';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/data-home/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                        delete env['XDG_DATA_HOME'];
                    }
                    else {
                        env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/data-home/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.local/share/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('remote (overriden path)', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                env['XDG_DATA_HOME'] = '/home/user/data-home';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/data-home/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                    delete env['XDG_DATA_HOME'];
                }
                else {
                    env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('sanitizeFishHistoryCmd', () => {
            test('valid new-lines', () => {
                /**
                 * Valid new-lines have odd number of leading backslashes: \n, \\\n, \\\\\n
                 */
                const cases = [
                    '\\n',
                    '\\n at start',
                    'some \\n in the middle',
                    'at the end \\n',
                    '\\\\\\n',
                    '\\\\\\n valid at start',
                    'valid \\\\\\n in the middle',
                    'valid in the end \\\\\\n',
                    '\\\\\\\\\\n',
                    '\\\\\\\\\\n valid at start',
                    'valid \\\\\\\\\\n in the middle',
                    'valid in the end \\\\\\\\\\n',
                    'mixed valid \\r\\n',
                    'mixed valid \\\\\\r\\n',
                    'mixed valid \\r\\\\\\n',
                ];
                for (const x of cases) {
                    ok(sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
            test('invalid new-lines', () => {
                /**
                 * Invalid new-lines have even number of leading backslashes: \\n, \\\\n, \\\\\\n
                 */
                const cases = [
                    '\\\\n',
                    '\\\\n invalid at start',
                    'invalid \\\\n in the middle',
                    'invalid in the end \\\\n',
                    '\\\\\\\\n',
                    '\\\\\\\\n invalid at start',
                    'invalid \\\\\\\\n in the middle',
                    'invalid in the end \\\\\\\\n',
                    'mixed invalid \\r\\\\n',
                    'mixed invalid \\r\\\\\\\\n',
                    'echo "\\\\n"',
                ];
                for (const x of cases) {
                    ok(!sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS90ZXN0L2NvbW1vbi9oaXN0b3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sMkNBQTJDLENBQUM7QUFDdkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFFNUgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBMEIsbUJBQW1CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUMxSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUs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