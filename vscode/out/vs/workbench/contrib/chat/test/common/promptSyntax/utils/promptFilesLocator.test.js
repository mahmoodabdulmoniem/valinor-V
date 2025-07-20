/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { match } from '../../../../../../../base/common/glob.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { basename, relativePath } from '../../../../../../../base/common/resources.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { mock } from '../../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
import { ISearchService } from '../../../../../../services/search/common/search.js';
import { IUserDataProfileService } from '../../../../../../services/userDataProfile/common/userDataProfile.js';
import { PromptsConfig } from '../../../../common/promptSyntax/config/config.js';
import { PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { isValidGlob, PromptFilesLocator } from '../../../../common/promptSyntax/utils/promptFilesLocator.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { mockService } from './mock.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
function mockConfigService(value) {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            if ('explorer.excludeGitIgnore' === key) {
                return false;
            }
            assert([PromptsConfig.KEY, PromptsConfig.PROMPT_LOCATIONS_KEY, PromptsConfig.INSTRUCTIONS_LOCATION_KEY, PromptsConfig.MODE_LOCATION_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
}
/**
 * Mocked instance of {@link IWorkspaceContextService}.
 */
function mockWorkspaceService(folders) {
    return mockService({
        getWorkspace() {
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.folders = folders;
                }
            };
        },
        getWorkspaceFolder() {
            return null;
        }
    });
}
suite('PromptFilesLocator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    // if (isWindows) {
    // 	return;
    // }
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        const fileService = disposables.add(instantiationService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, fileService);
    });
    /**
     * Create a new instance of {@link PromptFilesLocator} with provided mocked
     * values for configuration and workspace services.
     */
    const createPromptsLocator = async (configValue, workspaceFolderPaths, filesystem) => {
        await (instantiationService.createInstance(MockFilesystem, filesystem)).mock();
        instantiationService.stub(IConfigurationService, mockConfigService(configValue));
        const workspaceFolders = workspaceFolderPaths.map((path, index) => {
            const uri = URI.file(path);
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.uri = uri;
                    this.name = basename(uri);
                    this.index = index;
                }
            };
        });
        instantiationService.stub(IWorkspaceContextService, mockWorkspaceService(workspaceFolders));
        instantiationService.stub(IWorkbenchEnvironmentService, {});
        instantiationService.stub(IUserDataProfileService, {});
        instantiationService.stub(ISearchService, {
            async fileSearch(query) {
                // mock the search service
                const fs = instantiationService.get(IFileService);
                const findFilesInLocation = async (location, results = []) => {
                    try {
                        const resolve = await fs.resolve(location);
                        if (resolve.isFile) {
                            results.push(resolve.resource);
                        }
                        else if (resolve.isDirectory && resolve.children) {
                            for (const child of resolve.children) {
                                await findFilesInLocation(child.resource, results);
                            }
                        }
                    }
                    catch (error) {
                    }
                    return results;
                };
                const results = [];
                for (const folderQuery of query.folderQueries) {
                    const allFiles = await findFilesInLocation(folderQuery.folder);
                    for (const resource of allFiles) {
                        const pathInFolder = relativePath(folderQuery.folder, resource) ?? '';
                        if (query.filePattern === undefined || match(query.filePattern, pathInFolder)) {
                            results.push({ resource });
                        }
                    }
                }
                return { results, messages: [] };
            }
        });
        return instantiationService.createInstance(PromptFilesLocator);
    };
    suite('empty workspace', () => {
        const EMPTY_WORKSPACE = [];
        suite('empty filesystem', () => {
            test('no config value', async () => {
                const locator = await createPromptsLocator(undefined, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [], 'No prompts must be found.');
                locator.dispose();
            });
            test('object config value', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts/': true,
                    '/tmp/prompts/': false,
                }, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [], 'No prompts must be found.');
                locator.dispose();
            });
            test('array config value', async () => {
                const locator = await createPromptsLocator([
                    'relative/path/to/prompts/',
                    '/abs/path',
                ], EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [], 'No prompts must be found.');
                locator.dispose();
            });
            test('null config value', async () => {
                const locator = await createPromptsLocator(null, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [], 'No prompts must be found.');
                locator.dispose();
            });
            test('string config value', async () => {
                const locator = await createPromptsLocator('/etc/hosts/prompts', EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [], 'No prompts must be found.');
                locator.dispose();
            });
        });
        suite('non-empty filesystem', () => {
            test('core logic', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': true,
                }, EMPTY_WORKSPACE, [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md'
                ], 'Must find correct prompts.');
                locator.dispose();
            });
            suite('absolute', () => {
                suite('wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`'${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
                suite(`specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`'${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
            });
        });
    });
    suite('single-root workspace', () => {
        suite('glob pattern', () => {
            suite('relative', () => {
                suite('wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'deps/**',
                        'deps/**/*.prompt.md',
                        'deps/**/*',
                        'deps/**/*.md',
                        '**/text/**',
                        '**/text/**/*',
                        '**/text/**/*.md',
                        '**/text/**/*.prompt.md',
                        'deps/text/**',
                        'deps/text/**/*',
                        'deps/text/**/*.md',
                        'deps/text/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`'${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
                suite(`specific`, () => {
                    const testSettings = [
                        [
                            '**/*specific*',
                        ],
                        [
                            '**/*specific*.prompt.md',
                        ],
                        [
                            '**/*specific*.md',
                        ],
                        [
                            '**/specific*',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                        ],
                        [
                            '**/specific.prompt.md',
                            '**/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/specific.prompt.md',
                            '**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/*specific*',
                        ],
                        [
                            '**/*spec*.prompt.md',
                        ],
                        [
                            '**/*spec*',
                        ],
                        [
                            '**/*spec*.md',
                        ],
                        [
                            '**/deps/**/*spec*.md',
                        ],
                        [
                            '**/text/**/*spec*.md',
                        ],
                        [
                            'deps/text/nested/*spec*',
                        ],
                        [
                            'deps/text/nested/*specific*',
                        ],
                        [
                            'deps/**/*specific*',
                        ],
                        [
                            'deps/**/specific*',
                            'deps/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/**/specific*.md',
                            'deps/**/unspecific*.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1.prompt.md',
                            'deps/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1*.md',
                            'deps/**/unspecific2*.md',
                        ],
                        [
                            'deps/text/**/*specific*',
                        ],
                        [
                            'deps/text/**/specific*',
                            'deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/text/**/specific*.md',
                            'deps/text/**/unspecific*.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1.prompt.md',
                            'deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1*.md',
                            'deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`'${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
            });
            suite('absolute', () => {
                suite('wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`'${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
                suite(`specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`'${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
            });
        });
    });
    test('core logic', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
            '/Users/legomushroom/repos/vscode/.github/prompts/my.prompt.md',
            '/Users/legomushroom/repos/prompts/test.prompt.md',
            '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
            '/tmp/prompts/translate.to-rust.prompt.md',
            '/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md',
        ], 'Must find correct prompts.');
        locator.dispose();
    });
    test('with disabled `.github/prompts` location', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
            '.github/prompts': false,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                            {
                                name: 'your.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
            '/Users/legomushroom/repos/prompts/test.prompt.md',
            '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
            '/tmp/prompts/translate.to-rust.prompt.md',
            '/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md',
        ], 'Must find correct prompts.');
        locator.dispose();
    });
    suite('multi-root workspace', () => {
        suite('core logic', () => {
            test('without top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is not part of the workspace, so prompt files are `ignored`
                    {
                        name: '/Users/legomushroom/repos/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                locator.dispose();
            });
            test('with top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/var/shared/prompts/.github/prompts/prompt-name.prompt.md',
                    '/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md',
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                locator.dispose();
            });
            test('with disabled `.github/prompts` location', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                    '.github/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                locator.dispose();
            });
            test('mixed', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/**/*test*': true,
                    '.copilot/prompts': false,
                    '.github/prompts': true,
                    '/absolute/path/prompts/some-prompt-file.prompt.md': true,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                            {
                                name: 'elf.prompt.md',
                                contents: 'haalo!',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                    // all of these are due to the `.github/prompts` setting
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/var/shared/prompts/.github/prompts/prompt-name.prompt.md',
                    '/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md',
                    // all of these are due to the `/Users/legomushroom/repos/**/*test*` setting
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    // this one is due to the specific `/absolute/path/prompts/some-prompt-file.prompt.md` setting
                    '/absolute/path/prompts/some-prompt-file.prompt.md',
                ], 'Must find correct prompts.');
                locator.dispose();
            });
        });
        suite('glob pattern', () => {
            suite('relative', () => {
                suite('wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'gen*/**',
                        'gen*/**/*.prompt.md',
                        'gen*/**/*',
                        'gen*/**/*.md',
                        '**/gen*/**',
                        '**/gen*/**/*',
                        '**/gen*/**/*.md',
                        '**/gen*/**/*.prompt.md',
                        '{generic,general,gen}/**',
                        '{generic,general,gen}/**/*.prompt.md',
                        '{generic,general,gen}/**/*',
                        '{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**',
                        '**/{generic,general,gen}/**/*',
                        '**/{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`'${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                                // -
                                '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                                '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
                suite(`specific`, () => {
                    const testSettings = [
                        [
                            '**/my.prompt.md',
                            '**/*specific*',
                            '**/*common*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/*specific*.prompt.md',
                            '**/*common*.prompt.md',
                        ],
                        [
                            '**/my*.md',
                            '**/*specific*.md',
                            '**/*common*.md',
                        ],
                        [
                            '**/my*.md',
                            '**/specific*',
                            '**/unspecific*',
                            '**/common*',
                            '**/uncommon*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/specific.prompt.md',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                            '**/common.prompt.md',
                            '**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*',
                            'gen*/**/*common*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*.prompt.md',
                            'gen*/**/*common*.prompt.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/*specific*.md',
                            'gen*/**/*common*.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/specific*',
                            'gen*/**/unspecific*',
                            'gen*/**/common*',
                            'gen*/**/uncommon*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/specific.prompt.md',
                            'gen*/**/unspecific1.prompt.md',
                            'gen*/**/unspecific2.prompt.md',
                            'gen*/**/common.prompt.md',
                            'gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/specific.prompt.md',
                            'gen/text/nested/unspecific1.prompt.md',
                            'gen/text/nested/unspecific2.prompt.md',
                            'general/common.prompt.md',
                            'general/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/*specific*',
                            'general/*common*',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/**/specific.prompt.md',
                            'gen/text/**/unspecific1.prompt.md',
                            'gen/text/**/unspecific2.prompt.md',
                            'general/*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*',
                            '{gen,general}/**/*common*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*.prompt.md',
                            '{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/*specific*.md',
                            '{gen,general}/**/*common*.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/specific*',
                            '{gen,general}/**/unspecific*',
                            '{gen,general}/**/common*',
                            '{gen,general}/**/uncommon*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/specific.prompt.md',
                            '{gen,general}/**/unspecific1.prompt.md',
                            '{gen,general}/**/unspecific2.prompt.md',
                            '{gen,general}/**/common.prompt.md',
                            '{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`'${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                                // -
                                '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                                '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
            });
            suite('absolute', () => {
                suite('wild card', () => {
                    const testSettings = [
                        '/Users/legomushroom/repos/**',
                        '/Users/legomushroom/repos/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/*.md',
                        '/Users/legomushroom/repos/**/*',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`'${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                                // -
                                '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                                '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
                suite(`specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*',
                            '/Users/legomushroom/repos/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/*specific*.md',
                            '/Users/legomushroom/repos/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/specific*',
                            '/Users/legomushroom/repos/**/unspecific*',
                            '/Users/legomushroom/repos/**/common*',
                            '/Users/legomushroom/repos/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*',
                            '/Users/legomushroom/repos/**/gen*/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific*',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific*',
                            '/Users/legomushroom/repos/**/gen*/**/common*',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/*specific*',
                            '/Users/legomushroom/repos/prompts/general/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`'${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assertOutcome(await locator.listFiles(PromptsType.prompt, 'local', CancellationToken.None), [
                                '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                                '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                                // -
                                '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                                '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                            ], 'Must find correct prompts.');
                            locator.dispose();
                        });
                    }
                });
            });
        });
    });
    suite('isValidGlob', () => {
        test('valid patterns', () => {
            const globs = [
                '**',
                '\*',
                '\**',
                '**/*',
                '**/*.prompt.md',
                '/Users/legomushroom/**/*.prompt.md',
                '/Users/legomushroom/*.prompt.md',
                '/Users/legomushroom/*',
                '/Users/legomushroom/repos/{repo1,test}',
                '/Users/legomushroom/repos/{repo1,test}/**',
                '/Users/legomushroom/repos/{repo1,test}/*',
                '/Users/legomushroom/**/{repo1,test}/**',
                '/Users/legomushroom/**/{repo1,test}',
                '/Users/legomushroom/**/{repo1,test}/*',
                '/Users/legomushroom/**/repo[1,2,3]',
                '/Users/legomushroom/**/repo[1,2,3]/**',
                '/Users/legomushroom/**/repo[1,2,3]/*',
                '/Users/legomushroom/**/repo[1,2,3]/**/*.prompt.md',
                'repo[1,2,3]/**/*.prompt.md',
                'repo[[1,2,3]/**/*.prompt.md',
                '{repo1,test}/*.prompt.md',
                '{repo1,test}/*',
                '/{repo1,test}/*',
                '/{repo1,test}}/*',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === true), `'${glob}' must be a 'valid' glob pattern.`);
            }
        });
        test('invalid patterns', () => {
            const globs = [
                '.',
                '\\*',
                '\\?',
                '\\*\\?\\*',
                'repo[1,2,3',
                'repo1,2,3]',
                'repo\\[1,2,3]',
                'repo[1,2,3\\]',
                'repo\\[1,2,3\\]',
                '{repo1,repo2',
                'repo1,repo2}',
                '\\{repo1,repo2}',
                '{repo1,repo2\\}',
                '\\{repo1,repo2\\}',
                '/Users/legomushroom/repos',
                '/Users/legomushroom/repo[1,2,3',
                '/Users/legomushroom/repo1,2,3]',
                '/Users/legomushroom/repo\\[1,2,3]',
                '/Users/legomushroom/repo[1,2,3\\]',
                '/Users/legomushroom/repo\\[1,2,3\\]',
                '/Users/legomushroom/{repo1,repo2',
                '/Users/legomushroom/repo1,repo2}',
                '/Users/legomushroom/\\{repo1,repo2}',
                '/Users/legomushroom/{repo1,repo2\\}',
                '/Users/legomushroom/\\{repo1,repo2\\}',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === false), `'${glob}' must be an 'invalid' glob pattern.`);
            }
        });
    });
    suite('getConfigBasedSourceFolders', () => {
        test('gets unambiguous list of folders', async () => {
            const locator = await createPromptsLocator({
                '.github/prompts': true,
                '/Users/**/repos/**': true,
                'gen/text/**': true,
                'gen/text/nested/*.prompt.md': true,
                'general/*': true,
                '/Users/legomushroom/repos/vscode/my-prompts': true,
                '/Users/legomushroom/repos/vscode/your-prompts/*.md': true,
                '/Users/legomushroom/repos/prompts/shared-prompts/*': true,
            }, [
                '/Users/legomushroom/repos/vscode',
                '/Users/legomushroom/repos/prompts',
            ], []);
            assertOutcome(locator.getConfigBasedSourceFolders(PromptsType.prompt), [
                '/Users/legomushroom/repos/vscode/.github/prompts',
                '/Users/legomushroom/repos/prompts/.github/prompts',
                '/Users/legomushroom/repos/vscode/gen/text/nested',
                '/Users/legomushroom/repos/prompts/gen/text/nested',
                '/Users/legomushroom/repos/vscode/general',
                '/Users/legomushroom/repos/prompts/general',
                '/Users/legomushroom/repos/vscode/my-prompts',
                '/Users/legomushroom/repos/vscode/your-prompts',
                '/Users/legomushroom/repos/prompts/shared-prompts',
            ], 'Must find correct prompts.');
            locator.dispose();
        });
    });
});
function assertOutcome(actual, expected, message) {
    assert.deepStrictEqual(actual.map((uri) => uri.path), expected, message);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL3Byb21wdEZpbGVzTG9jYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQTJCLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDckksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQztBQUMvSCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBYyx3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