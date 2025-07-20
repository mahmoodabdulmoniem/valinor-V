/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { timeout } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { URI } from '../../../../../../base/common/uri.js';
import { randomBoolean } from '../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../platform/configuration/common/configurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { NullPolicyService } from '../../../../../../platform/policy/common/policy.js';
import { ChatModeKind } from '../../../common/constants.js';
import { MarkdownLink } from '../../../common/promptSyntax/codecs/base/markdownCodec/tokens/markdownLink.js';
import { FileReference } from '../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { getPromptFileType } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { MockFilesystem } from './testUtils/mockFilesystem.js';
/**
 * Represents a file reference with an expected
 * error condition value for testing purposes.
 */
class ExpectedReference {
    constructor(dirname, linkToken, errorCondition) {
        this.linkToken = linkToken;
        this.errorCondition = errorCondition;
        this.uri = (linkToken.path.startsWith('/'))
            ? URI.file(linkToken.path)
            : URI.joinPath(dirname, linkToken.path);
    }
    /**
     * Range of the underlying file reference token.
     */
    get range() {
        return this.linkToken.range;
    }
    /**
     * String representation of the expected reference.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
}
/**
 * A reusable test utility to test the `PromptFileReference` class.
 */
let TestPromptFileReference = class TestPromptFileReference extends Disposable {
    constructor(fileStructure, rootFileUri, expectedReferences, fileService, instantiationService) {
        super();
        this.fileStructure = fileStructure;
        this.rootFileUri = rootFileUri;
        this.expectedReferences = expectedReferences;
        this.fileService = fileService;
        this.instantiationService = instantiationService;
        // create in-memory file system
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(this.fileService.registerProvider(Schemas.file, fileSystemProvider));
    }
    /**
     * Run the test.
     */
    async run() {
        // create the files structure on the disk
        await (this.instantiationService.createInstance(MockFilesystem, this.fileStructure)).mock();
        // randomly test with and without delay to ensure that the file
        // reference resolution is not susceptible to race conditions
        if (randomBoolean()) {
            await timeout(5);
        }
        // start resolving references for the specified root file
        const rootReference = this._register(this.instantiationService.createInstance(FilePromptParser, this.rootFileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true })).start();
        // wait until entire prompts tree is resolved
        await rootReference.settled();
        // resolve the root file reference including all nested references
        const resolvedReferences = rootReference.references;
        for (let i = 0; i < this.expectedReferences.length; i++) {
            const expectedReference = this.expectedReferences[i];
            const resolvedReference = resolvedReferences[i];
            if (expectedReference.linkToken instanceof MarkdownLink) {
                assert(resolvedReference?.subtype === 'markdown', [
                    `Expected ${i}th resolved reference to be a markdown link`,
                    `got '${resolvedReference}'.`,
                ].join(', '));
            }
            if (expectedReference.linkToken instanceof FileReference) {
                assert(resolvedReference?.subtype === 'prompt', [
                    `Expected ${i}th resolved reference to be a #file: link`,
                    `got '${resolvedReference}'.`,
                ].join(', '));
            }
            assert((resolvedReference) &&
                (resolvedReference.uri.toString() === expectedReference.uri.toString()), [
                `Expected ${i}th resolved reference URI to be '${expectedReference.uri}'`,
                `got '${resolvedReference?.uri}'.`,
            ].join(', '));
            assert((resolvedReference) &&
                (resolvedReference.range.equalsRange(expectedReference.range)), [
                `Expected ${i}th resolved reference range to be '${expectedReference.range}'`,
                `got '${resolvedReference?.range}'.`,
            ].join(', '));
        }
        assert.strictEqual(resolvedReferences.length, this.expectedReferences.length, [
            `\nExpected(${this.expectedReferences.length}): [\n ${this.expectedReferences.join('\n ')}\n]`,
            `Received(${resolvedReferences.length}): [\n ${resolvedReferences.join('\n ')}\n]`,
        ].join('\n'));
        return rootReference;
    }
};
TestPromptFileReference = __decorate([
    __param(3, IFileService),
    __param(4, IInstantiationService)
], TestPromptFileReference);
/**
 * Create expected file reference for testing purposes.
 *
 * Note! This utility also use for `markdown links` at the moment.
 *
 * @param filePath The expected path of the file reference (without the `#file:` prefix).
 * @param lineNumber The expected line number of the file reference.
 * @param startColumnNumber The expected start column number of the file reference.
 */
function createTestFileReference(filePath, lineNumber, startColumnNumber) {
    const range = new Range(lineNumber, startColumnNumber, lineNumber, startColumnNumber + `#file:${filePath}`.length);
    return new FileReference(range, filePath);
}
suite('PromptFileReference', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
        instantiationService.stub(IModelService, { getModel() { return null; } });
        instantiationService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                return getPromptFileType(uri) ?? null;
            }
        });
    });
    test('resolves nested file references', async function () {
        const rootFolderName = 'resolves-nested-file-references';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [{
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.prompt.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: '## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!\n ',
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n[](./some-other-folder/non-existing-folder)\n\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference\n\n\nand some\n non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                    },
                                    {
                                        name: 'file.txt',
                                        contents: 'contents of a non-prompt-snippet file',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                contents: `[caption](${rootFolder}/folder1/some-other-folder)\nanother-file.prompt.md contents\t [#file:file.txt](../file.txt)`,
                                            },
                                            {
                                                name: 'one_more_file_just_in_case.prompt.md',
                                                contents: 'one_more_file_just_in_case.prompt.md contents',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 14)),
            new ExpectedReference(rootUri, new MarkdownLink(3, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
        ]));
        await test.run();
    });
    suite('metadata', () => {
        test('tools', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootUri = URI.file(rootFolder);
            const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
            /**
             * The file structure to be created on the disk for the test.
             */
            [{
                    name: rootFolderName,
                    children: [
                        {
                            name: 'file1.prompt.md',
                            contents: [
                                '## Some Header',
                                'some contents',
                                ' ',
                            ],
                        },
                        {
                            name: 'file2.prompt.md',
                            contents: [
                                '---',
                                'description: \'Root prompt description.\'',
                                'tools: [\'my-tool1\']',
                                'mode: "agent" ',
                                '---',
                                '## Files',
                                '\t- this file #file:folder1/file3.prompt.md ',
                                '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                ' ',
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'file3.prompt.md',
                                    contents: [
                                        '---',
                                        'tools: [ false, \'my-tool1\' , ]',
                                        '---',
                                        '',
                                        '[](./some-other-folder/non-existing-folder)',
                                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents`,
                                        ' some more\t content',
                                    ],
                                },
                                {
                                    name: 'some-other-folder',
                                    children: [
                                        {
                                            name: 'file4.prompt.md',
                                            contents: [
                                                '---',
                                                'tools: [\'my-tool1\', "my-tool2", true, , ]',
                                                'something: true',
                                                'mode: \'ask\'\t',
                                                '---',
                                                'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference',
                                                '',
                                                '',
                                                'and some',
                                                ' non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                            ],
                                        },
                                        {
                                            name: 'file.txt',
                                            contents: 'contents of a non-prompt-snippet file',
                                        },
                                        {
                                            name: 'yetAnotherFolder🤭',
                                            children: [
                                                {
                                                    name: 'another-file.prompt.md',
                                                    contents: [
                                                        '---',
                                                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                                                        '---',
                                                        `[](${rootFolder}/folder1/some-other-folder)`,
                                                        'another-file.prompt.md contents\t [#file:file.txt](../file.txt)',
                                                    ],
                                                },
                                                {
                                                    name: 'one_more_file_just_in_case.prompt.md',
                                                    contents: 'one_more_file_just_in_case.prompt.md contents',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }], 
            /**
             * The root file path to start the resolve process from.
             */
            URI.file(`/${rootFolderName}/file2.prompt.md`), 
            /**
             * The expected references to be resolved.
             */
            [
                new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
            ]));
            const rootReference = await test.run();
            const { metadata } = rootReference;
            assert.deepStrictEqual(metadata, {
                promptType: PromptsType.prompt,
                mode: 'agent',
                description: 'Root prompt description.',
                tools: ['my-tool1'],
            }, 'Must have correct metadata.');
        });
        suite('applyTo', () => {
            test('prompt language', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'applyTo: \'**/*\'',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of my prompt.\'',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    description: 'Description of my prompt.',
                    tools: ['my-tool12'],
                }, 'Must have correct metadata.');
            });
            test('instructions language', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.instructions.md',
                                contents: [
                                    '---',
                                    'applyTo: \'**/*\'',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of my instructions file.\'',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.instructions.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.instructions,
                    applyTo: '**/*',
                    description: 'Description of my instructions file.',
                }, 'Must have correct metadata.');
            });
        });
        suite('tools and mode compatibility', () => {
            test('tools are ignored if root prompt is in the ask mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode: "ask" ',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            'mode: \'agent\'\t',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , ]',
                                                    'something: true',
                                                    'mode: \'ask\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Ask,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are ignored if root prompt is in the edit mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode:\t\t"edit"\t\t',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Edit,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are not ignored if root prompt is in the agent mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode: \t\t "agent" \t\t ',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are not ignored if root prompt implicitly in the agent mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
                [{
                        name: rootFolderName,
                        children: [
                            {
                                name: 'file1.prompt.md',
                                contents: [
                                    '## Some Header',
                                    'some contents',
                                    ' ',
                                ],
                            },
                            {
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of the prompt file.\'',
                                    '---',
                                    '## Files',
                                    '\t- this file #file:folder1/file3.prompt.md ',
                                    '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                    ' ',
                                ],
                            },
                            {
                                name: 'folder1',
                                children: [
                                    {
                                        name: 'file3.prompt.md',
                                        contents: [
                                            '---',
                                            'tools: [ false, \'my-tool1\' , ]',
                                            '---',
                                            ' some more\t content',
                                        ],
                                    },
                                    {
                                        name: 'some-other-folder',
                                        children: [
                                            {
                                                name: 'file4.prompt.md',
                                                contents: [
                                                    '---',
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata, } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    tools: ['my-tool12'],
                    description: 'Description of the prompt file.',
                }, 'Must have correct metadata.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9wcm9tcHRGaWxlUmVmZXJlbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVF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