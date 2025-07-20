/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TerminalCompletionService } from '../../browser/terminalCompletionService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import assert, { fail } from 'assert';
import { isWindows } from '../../../../../../base/common/platform.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ShellEnvDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/shellEnvDetectionCapability.js';
import { TerminalCompletionItemKind } from '../../browser/terminalCompletionItem.js';
import { count } from '../../../../../../base/common/strings.js';
import { gitBashToWindowsPath, windowsToGitBashPath } from '../../browser/terminalGitBashHelpers.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
const pathSeparator = isWindows ? '\\' : '/';
/**
 * Assert the set of completions exist exactly, including their order.
 */
function assertCompletions(actual, expected, expectedConfig, pathSep) {
    const sep = pathSep ?? pathSeparator;
    assert.deepStrictEqual(actual?.map(e => ({
        label: e.label,
        detail: e.detail ?? '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: e.replacementIndex,
        replacementLength: e.replacementLength,
    })), expected.map(e => ({
        label: e.label.replaceAll('/', sep),
        detail: e.detail ? e.detail.replaceAll('/', sep) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    })));
}
/**
 * Assert a set of completions exist within the actual set.
 */
function assertPartialCompletionsExist(actual, expectedPartial, expectedConfig) {
    if (!actual) {
        fail();
    }
    const expectedMapped = expectedPartial.map(e => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    }));
    for (const expectedItem of expectedMapped) {
        assert.deepStrictEqual(actual.map(e => ({
            label: e.label,
            detail: e.detail ?? '',
            kind: e.kind ?? TerminalCompletionItemKind.Folder,
            replacementIndex: e.replacementIndex,
            replacementLength: e.replacementLength,
        })).find(e => e.detail === expectedItem.detail), expectedItem);
    }
}
const testEnv = {
    HOME: '/home/user',
    USERPROFILE: '/home/user'
};
let homeDir = isWindows ? testEnv['USERPROFILE'] : testEnv['HOME'];
if (!homeDir.endsWith('/')) {
    homeDir += '/';
}
const standardTidleItem = Object.freeze({ label: '~', detail: homeDir });
suite('TerminalCompletionService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let capabilities;
    let validResources;
    let childResources;
    let terminalCompletionService;
    const provider = 'testProvider';
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map(e => e.path).includes(resource.path)) {
                    throw new Error('Doesn\'t exist');
                }
                return createFileStat(resource);
            },
            async resolve(resource, options) {
                const children = childResources.filter(child => {
                    const childFsPath = child.resource.path.replace(/\/$/, '');
                    const parentFsPath = resource.path.replace(/\/$/, '');
                    return (childFsPath.startsWith(parentFsPath) &&
                        count(childFsPath, '/') === count(parentFsPath, '/') + 1);
                });
                return createFileStat(resource, undefined, undefined, undefined, undefined, children);
            },
            async realpath(resource) {
                if (resource.path.includes('symlink-file')) {
                    return resource.with({ path: '/target/actual-file.txt' });
                }
                else if (resource.path.includes('symlink-folder')) {
                    return resource.with({ path: '/target/actual-folder' });
                }
                return undefined;
            }
        });
        terminalCompletionService = store.add(instantiationService.createInstance(TerminalCompletionService));
        terminalCompletionService.processEnv = testEnv;
        validResources = [];
        childResources = [];
        capabilities = store.add(new TerminalCapabilityStore());
    });
    suite('resolveResources should return undefined', () => {
        test('if cwd is not provided', async () => {
            const resourceRequestConfig = { pathSeparator };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
        test('if neither filesRequested nor foldersRequested are true', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
    });
    suite('resolveResources should return folder completions', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true, isFile: false },
                { resource: URI.parse('file:///test/file1.txt'), isDirectory: false, isFile: true },
            ];
        });
        test('| should return root-level completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 1, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 1, replacementLength: 0 });
        });
        test('./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 1, replacementLength: 2 });
        });
        test('cd ./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 2 });
        });
        test('cd ./f| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./f', 6, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 3 });
        });
    });
    suite('resolveResources should handle file and folder completion requests correctly', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/.hiddenFile'), isFile: true },
                { resource: URI.parse('file:///test/.hiddenFolder/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/file1.txt'), isFile: true },
            ];
        });
        test('./| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('./h| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './h', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 3 });
        });
    });
    suite('~ -> $HOME', () => {
        let resourceRequestConfig;
        let shellEnvDetection;
        setup(() => {
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({
                HOME: '/home',
                USERPROFILE: '/home'
            }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
            resourceRequestConfig = {
                cwd: URI.parse('file:///test/folder1'), // Updated to reflect home directory
                filesRequested: true,
                foldersRequested: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///home'),
                URI.parse('file:///home/vscode'),
                URI.parse('file:///home/vscode/foo'),
                URI.parse('file:///home/vscode/bar.txt'),
            ];
            childResources = [
                { resource: URI.parse('file:///home/vscode'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/foo'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/bar.txt'), isFile: true },
            ];
        });
        test('~| should return completion for ~', async () => {
            assertPartialCompletionsExist(await terminalCompletionService.resolveResources(resourceRequestConfig, '~', 1, provider, capabilities), [
                { label: '~', detail: '/home/' },
            ], { replacementIndex: 0, replacementLength: 1 });
        });
        test('~/| should return folder completions relative to $HOME', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/', 2, provider, capabilities), [
                { label: '~/', detail: '/home/' },
                { label: '~/vscode/', detail: '/home/vscode/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('~/vscode/| should return folder completions relative to $HOME/vscode', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/vscode/', 9, provider, capabilities), [
                { label: '~/vscode/', detail: '/home/vscode/' },
                { label: '~/vscode/foo/', detail: '/home/vscode/foo/' },
                { label: '~/vscode/bar.txt', detail: '/home/vscode/bar.txt', kind: TerminalCompletionItemKind.File },
            ], { replacementIndex: 0, replacementLength: 9 });
        });
    });
    suite('resolveResources edge cases and advanced scenarios', () => {
        setup(() => {
            validResources = [];
            childResources = [];
        });
        if (isWindows) {
            test('C:/Foo/| absolute paths on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///C:/Foo')];
                childResources = [
                    { resource: URI.parse('file:///C:/Foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///C:/Foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'C:/Foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    { label: 'C:/Foo/', detail: 'C:/Foo/' },
                    { label: 'C:/Foo/Bar/', detail: 'C:/Foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
            test('c:/foo/| case insensitivity on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///c:'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///c:/foo')];
                childResources = [
                    { resource: URI.parse('file:///c:/foo/Bar'), isDirectory: true, isFile: false }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'c:/foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    // Note that the detail is normalizes drive letters to capital case intentionally
                    { label: 'c:/foo/', detail: 'C:/foo/' },
                    { label: 'c:/foo/Bar/', detail: 'C:/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
        }
        else {
            test('/foo/| absolute paths NOT on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///foo')];
                childResources = [
                    { resource: URI.parse('file:///foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '/foo/', 5, provider, capabilities);
                assertCompletions(result, [
                    { label: '/foo/', detail: '/foo/' },
                    { label: '/foo/Bar/', detail: '/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 5 });
            });
        }
        if (isWindows) {
            test('.\\folder | Case insensitivity should resolve correctly on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:/test'),
                    foldersRequested: true,
                    pathSeparator: '\\'
                };
                validResources = [URI.parse('file:///C:/test')];
                childResources = [
                    { resource: URI.parse('file:///C:/test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///C:/test/anotherFolder/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '.\\folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: '.\\', detail: 'C:\\test\\' },
                    { label: '.\\FolderA\\', detail: 'C:\\test\\FolderA\\' },
                    { label: '.\\anotherFolder\\', detail: 'C:\\test\\anotherFolder\\' },
                    { label: '.\\..\\', detail: 'C:\\' },
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        else {
            test('./folder | Case sensitivity should resolve correctly on Mac/Unix', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///test'),
                    foldersRequested: true,
                    pathSeparator: '/'
                };
                validResources = [URI.parse('file:///test')];
                childResources = [
                    { resource: URI.parse('file:///test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///test/foldera/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: './', detail: '/test/' },
                    { label: './FolderA/', detail: '/test/FolderA/' },
                    { label: './foldera/', detail: '/test/foldera/' },
                    { label: './../', detail: '/' }
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        test('| Empty input should resolve to current directory', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 0, replacementLength: 0 });
        });
        test('./| should handle large directories with many results gracefully', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = Array.from({ length: 1000 }, (_, i) => ({
                resource: URI.parse(`file:///test/folder${i}/`),
                isDirectory: true
            }));
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assert(result);
            // includes the 1000 folders + ./ and ./../
            assert.strictEqual(result?.length, 1002);
            assert.strictEqual(result[0].label, `.${pathSeparator}`);
            assert.strictEqual(result.at(-1)?.label, `.${pathSeparator}..${pathSeparator}`);
        });
        test('./folder| should include current folder with trailing / is missing', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder1', 10, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: './../', detail: '/' }
            ], { replacementIndex: 1, replacementLength: 9 });
        });
        test('folder/| should normalize current and parent folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///'),
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///test/folder2'),
            ];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'test/', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './test/', detail: '/test/' },
                { label: './test/folder1/', detail: '/test/folder1/' },
                { label: './test/folder2/', detail: '/test/folder2/' },
                { label: './test/../', detail: '/' }
            ], { replacementIndex: 0, replacementLength: 5 });
        });
    });
    suite('cdpath', () => {
        let shellEnvDetection;
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///cdpath_value/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///cdpath_value/file1.txt'), isFile: true },
            ];
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({ CDPATH: '/cdpath_value' }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        });
        test('cd | should show paths from $CDPATH (relative)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: 'CDPATH /cdpath_value/folder1/' },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should show paths from $CDPATH (absolute)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'absolute');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: '/cdpath_value/folder1/', detail: 'CDPATH' },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should support pulling from multiple paths in $CDPATH', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const pathPrefix = isWindows ? 'c:\\' : '/';
            const delimeter = isWindows ? ';' : ':';
            const separator = isWindows ? '\\' : '/';
            shellEnvDetection.setEnvironment({ CDPATH: `${pathPrefix}cdpath1_value${delimeter}${pathPrefix}cdpath2_value${separator}inner_dir` }, true);
            const uriPathPrefix = isWindows ? 'file:///c:/' : 'file:///';
            validResources = [
                URI.parse(`${uriPathPrefix}test`),
                URI.parse(`${uriPathPrefix}cdpath1_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir`)
            ];
            childResources = [
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/file1.txt`), isFile: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/file1.txt`), isFile: true },
            ];
            const resourceRequestConfig = {
                cwd: URI.parse(`${uriPathPrefix}test`),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            const finalPrefix = isWindows ? 'C:\\' : '/';
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath1_value/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath1_value/folder2/` },
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder2/` },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
    });
    if (isWindows) {
        suite('gitbash', () => {
            test('should convert Git Bash absolute path to Windows absolute path', () => {
                assert.strictEqual(gitBashToWindowsPath('/'), 'C:\\');
                assert.strictEqual(gitBashToWindowsPath('/c/'), 'C:\\');
                assert.strictEqual(gitBashToWindowsPath('/c/Users/foo'), 'C:\\Users\\foo');
                assert.strictEqual(gitBashToWindowsPath('/d/bar'), 'D:\\bar');
            });
            test('should convert Windows absolute path to Git Bash absolute path', () => {
                assert.strictEqual(windowsToGitBashPath('C:\\'), '/c/');
                assert.strictEqual(windowsToGitBashPath('C:\\Users\\foo'), '/c/Users/foo');
                assert.strictEqual(windowsToGitBashPath('D:\\bar'), '/d/bar');
                assert.strictEqual(windowsToGitBashPath('E:\\some\\path'), '/e/some/path');
            });
            test('resolveResources with c:/ style absolute path for Git Bash', async () => {
                const resourceRequestConfig = {
                    cwd: URI.file('C:\\Users\\foo'),
                    foldersRequested: true,
                    filesRequested: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true, isFile: false },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'C:/Users/foo/', 13, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: 'C:/Users/foo/', detail: 'C:\\Users\\foo\\' },
                    { label: 'C:/Users/foo/bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: 'C:/Users/foo/baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                ], { replacementIndex: 0, replacementLength: 13 }, '/');
            });
            test('resolveResources with cwd as Windows path (relative)', async () => {
                const resourceRequestConfig = {
                    cwd: URI.file('C:\\Users\\foo'),
                    foldersRequested: true,
                    filesRequested: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: './', detail: 'C:\\Users\\foo\\' },
                    { label: './bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: './baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                    { label: './../', detail: 'C:\\Users\\' }
                ], { replacementIndex: 0, replacementLength: 2 }, '/');
            });
            test('resolveResources with cwd as Windows path (absolute)', async () => {
                const resourceRequestConfig = {
                    cwd: URI.file('C:\\Users\\foo'),
                    foldersRequested: true,
                    filesRequested: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '/c/Users/foo/', 13, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: '/c/Users/foo/', detail: 'C:\\Users\\foo\\' },
                    { label: '/c/Users/foo/bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: '/c/Users/foo/baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                ], { replacementIndex: 0, replacementLength: 13 }, '/');
            });
        });
    }
    if (!isWindows) {
        suite('symlink support', () => {
            test('should include symlink target information in completions', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///test'),
                    pathSeparator,
                    filesRequested: true,
                    foldersRequested: true
                };
                validResources = [URI.parse('file:///test')];
                // Create mock children including a symbolic link
                childResources = [
                    { resource: URI.parse('file:///test/regular-file.txt'), isFile: true },
                    { resource: URI.parse('file:///test/symlink-file'), isFile: true, isSymbolicLink: true },
                    { resource: URI.parse('file:///test/symlink-folder'), isDirectory: true, isSymbolicLink: true },
                    { resource: URI.parse('file:///test/regular-folder'), isDirectory: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'ls ', 3, provider, capabilities);
                // Find the symlink completion
                const symlinkFileCompletion = result?.find(c => c.label === './symlink-file');
                const symlinkFolderCompletion = result?.find(c => c.label === './symlink-folder/');
                assert.strictEqual(symlinkFileCompletion?.detail, '/test/symlink-file -> /target/actual-file.txt', 'Symlink file detail should match target');
                assert.strictEqual(symlinkFolderCompletion?.detail, '/test/symlink-folder -> /target/actual-folder', 'Symlink folder detail should match target');
            });
        });
    }
    suite('completion label escaping', () => {
        test('| should escape special characters in file/folder names for POSIX shells', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/[folder1]/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder 2/'), isDirectory: true },
                { resource: URI.parse('file:///test/!special$chars&/'), isDirectory: true },
                { resource: URI.parse('file:///test/!special$chars2&'), isFile: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './[folder1]/', detail: '/test/\[folder1]\/' },
                { label: './folder\ 2/', detail: '/test/folder\ 2/' },
                { label: './\!special\$chars\&/', detail: '/test/\!special\$chars\&/' },
                { label: './\!special\$chars2\&', detail: '/test/\!special\$chars2\&', kind: TerminalCompletionItemKind.File },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 0, replacementLength: 0 });
        });
    });
    suite('Provider Configuration', () => {
        // Test class that extends TerminalCompletionService to access protected methods
        class TestTerminalCompletionService extends TerminalCompletionService {
            getEnabledProviders(providers) {
                return super._getEnabledProviders(providers);
            }
        }
        let testTerminalCompletionService;
        setup(() => {
            testTerminalCompletionService = store.add(instantiationService.createInstance(TestTerminalCompletionService));
        });
        // Mock provider for testing
        function createMockProvider(id) {
            return {
                id,
                provideCompletions: async () => [{
                        label: `completion-from-${id}`,
                        kind: TerminalCompletionItemKind.Method,
                        replacementIndex: 0,
                        replacementLength: 0,
                        provider: id
                    }]
            };
        }
        test('should enable providers by default when no configuration exists', () => {
            const defaultProvider = createMockProvider('terminal-suggest');
            const newProvider = createMockProvider('new-extension-provider');
            const providers = [defaultProvider, newProvider];
            // Set empty configuration (no provider keys)
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {});
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Both providers should be enabled since they're not explicitly disabled
            assert.strictEqual(result.length, 2, 'Should enable both providers by default');
            assert.ok(result.includes(defaultProvider), 'Should include default provider');
            assert.ok(result.includes(newProvider), 'Should include new provider');
        });
        test('should disable providers when explicitly set to false', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const providers = [provider1, provider2];
            // Disable provider1, leave provider2 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': false
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Only provider2 should be enabled
            assert.strictEqual(result.length, 1, 'Should enable only one provider');
            assert.ok(result.includes(provider2), 'Should include unconfigured provider');
            assert.ok(!result.includes(provider1), 'Should not include disabled provider');
        });
        test('should enable providers when explicitly set to true', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const providers = [provider1, provider2];
            // Explicitly enable provider1, leave provider2 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': true
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Both providers should be enabled
            assert.strictEqual(result.length, 2, 'Should enable both providers');
            assert.ok(result.includes(provider1), 'Should include explicitly enabled provider');
            assert.ok(result.includes(provider2), 'Should include unconfigured provider');
        });
        test('should handle mixed configuration correctly', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const provider3 = createMockProvider('provider3');
            const providers = [provider1, provider2, provider3];
            // Mixed configuration: enable provider1, disable provider2, leave provider3 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': true,
                'provider2': false
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // provider1 and provider3 should be enabled, provider2 should be disabled
            assert.strictEqual(result.length, 2, 'Should enable two providers');
            assert.ok(result.includes(provider1), 'Should include explicitly enabled provider');
            assert.ok(result.includes(provider3), 'Should include unconfigured provider');
            assert.ok(!result.includes(provider2), 'Should not include disabled provider');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFzRCxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BJLE9BQU8sRUFBRSx5QkFBeUIsRUFBbUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4SixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0QyxPQUFPLEVBQUUsU0FBUyxFQUE0QixNQUFNLDJDQUEyQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUM3SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RkFBd0YsQ0FBQztBQUVySSxPQUFPLEVBQXVCLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHM0YsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQWE3Qzs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsTUFBeUMsRUFBRSxRQUF3QyxFQUFFLGNBQTJDLEVBQUUsT0FBZ0I7SUFDNUssTUFBTSxHQUFHLEdBQUcsT0FBTyxJQUFJLGFBQWEsQ0FBQztJQUNyQyxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7UUFDZCxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxFQUFFO1FBQ3RCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLDBCQUEwQixDQUFDLE1BQU07UUFDakQsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQjtRQUNwQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsaUJBQWlCO0tBQ3RDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZCLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1FBQ25DLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDckQsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksMEJBQTBCLENBQUMsTUFBTTtRQUNqRCxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsZ0JBQWdCO1FBQ2pELGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxpQkFBaUI7S0FDbkQsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsNkJBQTZCLENBQUMsTUFBeUMsRUFBRSxlQUErQyxFQUFFLGNBQTJDO0lBQzdLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLElBQUksRUFBRSxDQUFDO0lBQ1IsQ0FBQztJQUNELE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDO1FBQzdDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDL0QsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksMEJBQTBCLENBQUMsTUFBTTtRQUNqRCxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsZ0JBQWdCO1FBQ2pELGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxpQkFBaUI7S0FDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixLQUFLLE1BQU0sWUFBWSxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO1lBQ2QsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksRUFBRTtZQUN0QixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSwwQkFBMEIsQ0FBQyxNQUFNO1lBQ2pELGdCQUFnQixFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7WUFDcEMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQjtTQUN0QyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNoRSxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxHQUF3QjtJQUNwQyxJQUFJLEVBQUUsWUFBWTtJQUNsQixXQUFXLEVBQUUsWUFBWTtDQUN6QixDQUFDO0FBRUYsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNuRSxJQUFJLENBQUMsT0FBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQzdCLE9BQU8sSUFBSSxHQUFHLENBQUM7QUFDaEIsQ0FBQztBQUNELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFFekUsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3hELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLFlBQXFDLENBQUM7SUFDMUMsSUFBSSxjQUFxQixDQUFDO0lBQzFCLElBQUksY0FBc0csQ0FBQztJQUMzRyxJQUFJLHlCQUFvRCxDQUFDO0lBQ3pELE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUVoQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNqRSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDdEQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDN0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN2QyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVE7Z0JBQ2xCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUNELE9BQU8sY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWEsRUFBRSxPQUFvQztnQkFDaEUsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDOUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDM0QsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN0RCxPQUFPLENBQ04sV0FBVyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7d0JBQ3BDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQ3hELENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxjQUFjLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN2RixDQUFDO1lBQ0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhO2dCQUMzQixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQzVDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7Z0JBQzNELENBQUM7cUJBQU0sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7b0JBQ3JELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztTQUNELENBQUMsQ0FBQztRQUNILHlCQUF5QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztRQUN0Ryx5QkFBeUIsQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO1FBQy9DLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDcEIsY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUNwQixZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pDLE1BQU0scUJBQXFCLEdBQWtDLEVBQUUsYUFBYSxFQUFFLENBQUM7WUFDL0UsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN6SCxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx5REFBeUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxRSxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixhQUFhO2FBQ2IsQ0FBQztZQUNGLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3pILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixjQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsY0FBYyxHQUFHO2dCQUNoQixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO2dCQUNsRixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2FBQ25GLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhO2FBQ2IsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFdEgsaUJBQWlCLENBQUMsTUFBTSxFQUFFO2dCQUN6QixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtnQkFDaEMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRTtnQkFDakQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLGlCQUFpQjthQUNqQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxxQkFBcUIsR0FBa0M7Z0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFDOUIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYTthQUNiLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXhILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7Z0JBQ2pDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pELEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2FBQy9CLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxRCxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhO2FBQ2IsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFM0gsaUJBQWlCLENBQUMsTUFBTSxFQUFFO2dCQUN6QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtnQkFDakMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRTtnQkFDakQsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7YUFDL0IsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNELE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWE7YUFDYixDQUFDO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUU1SCxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3pCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO2dCQUNqQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFO2dCQUNqRCxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTthQUMvQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyw4RUFBOEUsRUFBRSxHQUFHLEVBQUU7UUFDMUYsS0FBSyxDQUFDLEdBQUcsRUFBRTtZQUNWLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUM3QyxjQUFjLEdBQUc7Z0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUNqRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtnQkFDekUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7Z0JBQ25FLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2FBQy9ELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsYUFBYTthQUNiLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXhILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7Z0JBQ2pDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLDBCQUEwQixDQUFDLElBQUksRUFBRTtnQkFDOUYsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFO2dCQUM3RCxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFO2dCQUNqRCxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUU7Z0JBQzFGLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2FBQy9CLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsYUFBYTthQUNiLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXpILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7Z0JBQ2pDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLDBCQUEwQixDQUFDLElBQUksRUFBRTtnQkFDOUYsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFO2dCQUM3RCxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFO2dCQUNqRCxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUU7Z0JBQzFGLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2FBQy9CLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsSUFBSSxxQkFBb0QsQ0FBQztRQUN6RCxJQUFJLGlCQUE4QyxDQUFDO1FBRW5ELEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztnQkFDaEMsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLE9BQU87YUFDcEIsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNULFlBQVksQ0FBQyxHQUFHLCtDQUF1QyxpQkFBaUIsQ0FBQyxDQUFDO1lBRTFFLHFCQUFxQixHQUFHO2dCQUN2QixHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFDLG9DQUFvQztnQkFDM0UsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWE7YUFDYixDQUFDO1lBQ0YsY0FBYyxHQUFHO2dCQUNoQixHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztnQkFDakMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7Z0JBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUM7Z0JBQ3BDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUM7YUFDeEMsQ0FBQztZQUNGLGNBQWMsR0FBRztnQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7Z0JBQ2pFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2dCQUNyRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTthQUNwRSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEQsNkJBQTZCLENBQUMsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDdEksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7YUFDaEMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pFLGlCQUFpQixDQUFDLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0JBQzNILEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO2dCQUNqQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRTthQUMvQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0VBQXNFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkYsaUJBQWlCLENBQUMsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDbEksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUU7Z0JBQy9DLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQ3ZELEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsMEJBQTBCLENBQUMsSUFBSSxFQUFFO2FBQ3BHLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUNoRSxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1YsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUNwQixjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDckQsTUFBTSxxQkFBcUIsR0FBa0M7b0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztvQkFDNUIsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsYUFBYTtpQkFDYixDQUFDO2dCQUNGLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxjQUFjLEdBQUc7b0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7b0JBQy9FLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7aUJBQ25GLENBQUM7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFFN0gsaUJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUN6QixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtvQkFDdkMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUU7aUJBQy9DLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDekQsTUFBTSxxQkFBcUIsR0FBa0M7b0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztvQkFDNUIsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsYUFBYTtpQkFDYixDQUFDO2dCQUNGLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxjQUFjLEdBQUc7b0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7aUJBQy9FLENBQUM7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFFN0gsaUJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUN6QixpRkFBaUY7b0JBQ2pGLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO29CQUN2QyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRTtpQkFDL0MsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZELE1BQU0scUJBQXFCLEdBQWtDO29CQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7b0JBQzFCLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLGFBQWE7aUJBQ2IsQ0FBQztnQkFDRixjQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLGNBQWMsR0FBRztvQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtvQkFDNUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDaEYsQ0FBQztnQkFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUUzSCxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7b0JBQ3pCLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFO29CQUNuQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRTtpQkFDM0MsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsb0VBQW9FLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JGLE1BQU0scUJBQXFCLEdBQWtDO29CQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztvQkFDakMsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsYUFBYSxFQUFFLElBQUk7aUJBQ25CLENBQUM7Z0JBRUYsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELGNBQWMsR0FBRztvQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7b0JBQ3RFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2lCQUM1RSxDQUFDO2dCQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRS9ILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtvQkFDekIsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUU7b0JBQ3RDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7b0JBQ3hELEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSwyQkFBMkIsRUFBRTtvQkFDcEUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7aUJBQ3BDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNuRixNQUFNLHFCQUFxQixHQUFrQztvQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO29CQUM5QixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixhQUFhLEVBQUUsR0FBRztpQkFDbEIsQ0FBQztnQkFDRixjQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLGNBQWMsR0FBRztvQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7b0JBQ25FLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2lCQUNuRSxDQUFDO2dCQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRTlILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtvQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7b0JBQ2pDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7b0JBQ2pELEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7b0JBQ2pELEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2lCQUMvQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSixDQUFDO1FBQ0QsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BFLE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWE7YUFDYixDQUFDO1lBQ0YsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQzdDLGNBQWMsR0FBRztnQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7Z0JBQ25FLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2FBQ25FLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXRILGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7Z0JBQ2hDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pELEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pELEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUM3QixpQkFBaUI7YUFDakIsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ25GLE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWE7YUFDYixDQUFDO1lBQ0YsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQzdDLGNBQWMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDeEQsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDO2dCQUMvQyxXQUFXLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUMsQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFeEgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2YsMkNBQTJDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLGFBQWEsS0FBSyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JGLE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWE7YUFDYixDQUFDO1lBQ0YsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQzdDLGNBQWMsR0FBRztnQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7Z0JBQ25FLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2FBQ25FLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRWhJLGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7Z0JBQ2pDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pELEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pELEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2FBQy9CLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RSxNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhO2FBQ2IsQ0FBQztZQUNGLGNBQWMsR0FBRztnQkFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7Z0JBQ3JCLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUN6QixHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDO2dCQUNqQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDO2FBQ2pDLENBQUM7WUFDRixjQUFjLEdBQUc7Z0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2dCQUNuRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTthQUNuRSxDQUFDO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUUzSCxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3pCLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO2dCQUN0QyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ3RELEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRTtnQkFDdEQsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7YUFDcEMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNwQixJQUFJLGlCQUE4QyxDQUFDO1FBRW5ELEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixjQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsY0FBYyxHQUFHO2dCQUNoQixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtnQkFDM0UsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7YUFDdkUsQ0FBQztZQUVGLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7WUFDakUsaUJBQWlCLENBQUMsY0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BFLFlBQVksQ0FBQyxHQUFHLCtDQUF1QyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pFLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLG9DQUFvQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzVGLE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixhQUFhO2FBQ2IsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFekgsNkJBQTZCLENBQUMsTUFBTSxFQUFFO2dCQUNyQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLCtCQUErQixFQUFFO2FBQzdELEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNqRSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxvQ0FBb0MsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM1RixNQUFNLHFCQUFxQixHQUFrQztnQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsYUFBYTthQUNiLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXpILDZCQUE2QixDQUFDLE1BQU0sRUFBRTtnQkFDckMsRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTthQUNyRCxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0Usb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsb0NBQW9DLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDNUYsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUM1QyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3hDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDekMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsVUFBVSxnQkFBZ0IsU0FBUyxHQUFHLFVBQVUsZ0JBQWdCLFNBQVMsV0FBVyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFNUksTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUM3RCxjQUFjLEdBQUc7Z0JBQ2hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLE1BQU0sQ0FBQztnQkFDakMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLGFBQWEsZUFBZSxDQUFDO2dCQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsYUFBYSxlQUFlLENBQUM7Z0JBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLHlCQUF5QixDQUFDO2FBQ3BELENBQUM7WUFDRixjQUFjLEdBQUc7Z0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLHdCQUF3QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtnQkFDcEYsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLGFBQWEsd0JBQXdCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2dCQUNwRixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsYUFBYSx5QkFBeUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBQ2hGLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLGtDQUFrQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtnQkFDOUYsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLGFBQWEsa0NBQWtDLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2dCQUM5RixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsYUFBYSxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7YUFDMUYsQ0FBQztZQUVGLE1BQU0scUJBQXFCLEdBQWtDO2dCQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLGFBQWEsTUFBTSxDQUFDO2dCQUN0QyxnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsYUFBYTthQUNiLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXpILE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDN0MsNkJBQTZCLENBQUMsTUFBTSxFQUFFO2dCQUNyQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsV0FBVyx3QkFBd0IsRUFBRTtnQkFDM0UsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxVQUFVLFdBQVcsd0JBQXdCLEVBQUU7Z0JBQzNFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxXQUFXLGtDQUFrQyxFQUFFO2dCQUNyRixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsV0FBVyxrQ0FBa0MsRUFBRTthQUNyRixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtZQUNyQixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO2dCQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDL0QsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO2dCQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM1RSxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyw0REFBNEQsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDN0UsTUFBTSxxQkFBcUIsR0FBa0M7b0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO29CQUMvQixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsYUFBYSxFQUFFLEdBQUc7aUJBQ2xCLENBQUM7Z0JBQ0YsY0FBYyxHQUFHO29CQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO29CQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO29CQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDO2lCQUNuQyxDQUFDO2dCQUNGLGNBQWMsR0FBRztvQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtvQkFDL0UsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7aUJBQy9ELENBQUM7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxZQUFZLDJDQUEyQixDQUFDO2dCQUM5SixpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7b0JBQ3pCLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUU7b0JBQ3RELEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRTtvQkFDL0QsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFFLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLEVBQUU7aUJBQzNHLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZFLE1BQU0scUJBQXFCLEdBQWtDO29CQUM1RCxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDL0IsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLGFBQWEsRUFBRSxHQUFHO2lCQUNsQixDQUFDO2dCQUNGLGNBQWMsR0FBRztvQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztvQkFDL0IsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQztpQkFDbkMsQ0FBQztnQkFDRixjQUFjLEdBQUc7b0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO29CQUNoRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDL0QsQ0FBQztnQkFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksMkNBQTJCLENBQUM7Z0JBQ2xKLGlCQUFpQixDQUFDLE1BQU0sRUFBRTtvQkFDekIsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRTtvQkFDM0MsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRTtvQkFDcEQsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxJQUFJLEVBQUUsMEJBQTBCLENBQUMsSUFBSSxFQUFFO29CQUNoRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRTtpQkFDekMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDdkUsTUFBTSxxQkFBcUIsR0FBa0M7b0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO29CQUMvQixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixjQUFjLEVBQUUsSUFBSTtvQkFDcEIsYUFBYSxFQUFFLEdBQUc7aUJBQ2xCLENBQUM7Z0JBQ0YsY0FBYyxHQUFHO29CQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO29CQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO29CQUMvQixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDO2lCQUNuQyxDQUFDO2dCQUNGLGNBQWMsR0FBRztvQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7b0JBQ2hFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2lCQUMvRCxDQUFDO2dCQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsWUFBWSwyQ0FBMkIsQ0FBQztnQkFDOUosaUJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUN6QixFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFO29CQUN0RCxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsdUJBQXVCLEVBQUU7b0JBQy9ELEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxJQUFJLEVBQUUsMEJBQTBCLENBQUMsSUFBSSxFQUFFO2lCQUMzRyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDN0IsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUMzRSxNQUFNLHFCQUFxQixHQUFrQztvQkFDNUQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO29CQUM5QixhQUFhO29CQUNiLGNBQWMsRUFBRSxJQUFJO29CQUNwQixnQkFBZ0IsRUFBRSxJQUFJO2lCQUN0QixDQUFDO2dCQUVGLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFFN0MsaURBQWlEO2dCQUNqRCxjQUFjLEdBQUc7b0JBQ2hCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO29CQUN0RSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFO29CQUN4RixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFO29CQUMvRixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtpQkFDekUsQ0FBQztnQkFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUV6SCw4QkFBOEI7Z0JBQzlCLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLENBQUMsQ0FBQztnQkFDOUUsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSwrQ0FBK0MsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO2dCQUM5SSxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSwrQ0FBK0MsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1lBQ25KLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN2QyxJQUFJLENBQUMsMEVBQTBFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0YsTUFBTSxxQkFBcUIsR0FBa0M7Z0JBQzVELEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFDOUIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGFBQWE7YUFDYixDQUFDO1lBQ0YsY0FBYyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQzdDLGNBQWMsR0FBRztnQkFDaEIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7Z0JBQ3JFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO2dCQUNwRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtnQkFDM0UsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7YUFDdEUsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0seUJBQXlCLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFdEgsaUJBQWlCLENBQUMsTUFBTSxFQUFFO2dCQUN6QixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtnQkFDaEMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRTtnQkFDdkQsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRTtnQkFDckQsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxFQUFFLDJCQUEyQixFQUFFO2dCQUN2RSxFQUFFLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxNQUFNLEVBQUUsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLDBCQUEwQixDQUFDLElBQUksRUFBRTtnQkFDOUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLGlCQUFpQjthQUNqQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDcEMsZ0ZBQWdGO1FBQ2hGLE1BQU0sNkJBQThCLFNBQVEseUJBQXlCO1lBQzdELG1CQUFtQixDQUFDLFNBQXdDO2dCQUNsRSxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5QyxDQUFDO1NBQ0Q7UUFFRCxJQUFJLDZCQUE0RCxDQUFDO1FBRWpFLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDViw2QkFBNkIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7UUFDL0csQ0FBQyxDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsU0FBUyxrQkFBa0IsQ0FBQyxFQUFVO1lBQ3JDLE9BQU87Z0JBQ04sRUFBRTtnQkFDRixrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLENBQUM7d0JBQ2hDLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxFQUFFO3dCQUM5QixJQUFJLEVBQUUsMEJBQTBCLENBQUMsTUFBTTt3QkFDdkMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDbkIsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDcEIsUUFBUSxFQUFFLEVBQUU7cUJBQ1osQ0FBQzthQUNGLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEdBQUcsRUFBRTtZQUM1RSxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDakUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFFakQsNkNBQTZDO1lBQzdDLG9CQUFvQixDQUFDLG9CQUFvQixtRkFBcUMsRUFBRSxDQUFDLENBQUM7WUFFbEYsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFNUUseUVBQXlFO1lBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztZQUNoRixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUMvRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztRQUN4RSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7WUFDbEUsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEQsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFekMsa0RBQWtEO1lBQ2xELG9CQUFvQixDQUFDLG9CQUFvQixtRkFBcUM7Z0JBQzdFLFdBQVcsRUFBRSxLQUFLO2FBQ2xCLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTVFLG1DQUFtQztZQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUNoRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7WUFDaEUsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEQsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFekMsNERBQTREO1lBQzVELG9CQUFvQixDQUFDLG9CQUFvQixtRkFBcUM7Z0JBQzdFLFdBQVcsRUFBRSxJQUFJO2FBQ2pCLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTVFLG1DQUFtQztZQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLDhCQUE4QixDQUFDLENBQUM7WUFDckUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7WUFDcEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7UUFDL0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1lBQ3hELE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sU0FBUyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUVwRCx5RkFBeUY7WUFDekYsb0JBQW9CLENBQUMsb0JBQW9CLG1GQUFxQztnQkFDN0UsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFdBQVcsRUFBRSxLQUFLO2FBQ2xCLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTVFLDBFQUEwRTtZQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLDZCQUE2QixDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7WUFDcEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUNoRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==