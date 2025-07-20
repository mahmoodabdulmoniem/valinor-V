/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../../../base/common/async.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IWorkspacesService } from '../../../../../../../platform/workspaces/common/workspaces.js';
import { INSTRUCTION_FILE_EXTENSION, PROMPT_FILE_EXTENSION } from '../../../../common/promptSyntax/config/promptFileLocations.js';
import { INSTRUCTIONS_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsServiceImpl.js';
import { IPromptsService } from '../../../../common/promptSyntax/service/promptsService.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { ComputeAutomaticInstructions } from '../../../../common/promptSyntax/computeAutomaticInstructions.js';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { ResourceSet } from '../../../../../../../base/common/map.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
/**
 * Helper class to assert the properties of a link.
 */
class ExpectedLink {
    constructor(uri, fullRange, linkRange) {
        this.uri = uri;
        this.fullRange = fullRange;
        this.linkRange = linkRange;
    }
    /**
     * Assert a provided link has the same properties as this object.
     */
    assertEqual(link) {
        assert.strictEqual(link.type, 'file', 'Link must have correct type.');
        assert.strictEqual(link.uri.toString(), this.uri.toString(), 'Link must have correct URI.');
        assert(this.fullRange.equalsRange(link.range), `Full range must be '${this.fullRange}', got '${link.range}'.`);
        assertDefined(link.linkRange, 'Link must have a link range.');
        assert(this.linkRange.equalsRange(link.linkRange), `Link range must be '${this.linkRange}', got '${link.linkRange}'.`);
    }
}
/**
 * Asserts that provided links are equal to the expected links.
 * @param links Links to assert.
 * @param expectedLinks Expected links to compare against.
 */
function assertLinks(links, expectedLinks) {
    for (let i = 0; i < links.length; i++) {
        try {
            expectedLinks[i].assertEqual(links[i]);
        }
        catch (error) {
            throw new Error(`link#${i}: ${error}`);
        }
    }
    assert.strictEqual(links.length, expectedLinks.length, `Links count must be correct.`);
}
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instaService;
    setup(async () => {
        instaService = disposables.add(new TestInstantiationService());
        instaService.stub(ILogService, new NullLogService());
        instaService.stub(IWorkspacesService, {});
        instaService.stub(IConfigurationService, new TestConfigurationService());
        instaService.stub(IWorkbenchEnvironmentService, {});
        const fileService = disposables.add(instaService.createInstance(FileService));
        instaService.stub(IFileService, fileService);
        instaService.stub(IModelService, { getModel() { return null; } });
        instaService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                if (uri.path.endsWith(PROMPT_FILE_EXTENSION)) {
                    return PROMPT_LANGUAGE_ID;
                }
                if (uri.path.endsWith(INSTRUCTION_FILE_EXTENSION)) {
                    return INSTRUCTIONS_LANGUAGE_ID;
                }
                return 'plaintext';
            }
        });
        instaService.stub(ILabelService, { getUriLabel: (uri) => uri.path });
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        service = disposables.add(instaService.createInstance(PromptsService));
        instaService.stub(IPromptsService, service);
    });
    suite('getParserFor', () => {
        test('provides cached parser instance', async () => {
            // both languages must yield the same result
            const languageId = (randomBoolean())
                ? PROMPT_LANGUAGE_ID
                : INSTRUCTIONS_LANGUAGE_ID;
            /**
             * Create a text model, get a parser for it, and perform basic assertions.
             */
            const model1 = disposables.add(createTextModel('test1\n\t#file:./file.md\n\n\n   [bin file](/root/tmp.bin)\t\n', languageId, undefined, URI.file('/Users/vscode/repos/test/file1.txt')));
            const parser1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1.uri.toString(), model1.uri.toString(), 'Must create parser1 with the correct URI.');
            assert(!parser1.isDisposed, 'Parser1 must not be disposed.');
            assert(parser1 instanceof TextModelPromptParser, 'Parser1 must be an instance of TextModelPromptParser.');
            /**
             * Validate that all links of the model are correctly parsed.
             */
            await parser1.settled();
            assertLinks(parser1.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * Next, get parser for the same exact model and
             * validate that the same cached object is returned.
             */
            // get the same parser again, the call must return the same object
            const parser1_1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1, parser1_1, 'Must return the same parser object.');
            assert.strictEqual(parser1_1.uri.toString(), model1.uri.toString(), 'Must create parser1_1 with the correct URI.');
            /**
             * Get parser for a different model and perform basic assertions.
             */
            const model2 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \t\ntest-text2', languageId, undefined, URI.file('/Users/vscode/repos/test/some-folder/file.md')));
            // wait for some random amount of time
            await timeout(5);
            const parser2 = service.getSyntaxParserFor(model2);
            assert.strictEqual(parser2.uri.toString(), model2.uri.toString(), 'Must create parser2 with the correct URI.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            assert(parser2 instanceof TextModelPromptParser, 'Parser2 must be an instance of TextModelPromptParser.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            assert(!parser1.isDisposed, 'Parser1 must not be disposed.');
            assert(!parser1_1.isDisposed, 'Parser1_1 must not be disposed.');
            /**
             * Validate that all links of the model 2 are correctly parsed.
             */
            await parser2.settled();
            assert.notStrictEqual(parser1.uri.toString(), parser2.uri.toString(), 'Parser2 must have its own URI.');
            assertLinks(parser2.references, [
                new ExpectedLink(URI.file('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
            ]);
            /**
             * Validate the first parser was not affected by the presence
             * of the second parser.
             */
            await parser1_1.settled();
            // parser1_1 has the same exact links as before
            assertLinks(parser1_1.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * Dispose the first parser, perform basic validations, and confirm
             * that the second parser is not affected by the disposal of the first one.
             */
            parser1.dispose();
            assert(parser1.isDisposed, 'Parser1 must be disposed.');
            assert(parser1_1.isDisposed, 'Parser1_1 must be disposed.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            /**
             * Get parser for the first model again. Confirm that we get
             * a new non-disposed parser object back with correct properties.
             */
            const parser1_2 = service.getSyntaxParserFor(model1);
            assert(!parser1_2.isDisposed, 'Parser1_2 must not be disposed.');
            assert.notStrictEqual(parser1_2, parser1, 'Must create a new parser object for the model1.');
            assert.strictEqual(parser1_2.uri.toString(), model1.uri.toString(), 'Must create parser1_2 with the correct URI.');
            /**
             * Validate that the contents of the second parser did not change.
             */
            await parser1_2.settled();
            // parser1_2 must have the same exact links as before
            assertLinks(parser1_2.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * This time dispose model of the second parser instead of
             * the parser itself. Validate that the parser is disposed too, but
             * the newly created first parser is not affected.
             */
            // dispose the `model` of the second parser now
            model2.dispose();
            // assert that the parser is also disposed
            assert(parser2.isDisposed, 'Parser2 must be disposed.');
            // sanity check that the other parser is not affected
            assert(!parser1_2.isDisposed, 'Parser1_2 must not be disposed.');
            /**
             * Create a new second parser with new model - we cannot use
             * the old one because it was disposed. This new model also has
             * a different second link.
             */
            // we cannot use the same model since it was already disposed
            const model2_1 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \n [caption](.copilot/prompts/test.prompt.md)\t\n\t\n more text', languageId, undefined, URI.file('/Users/vscode/repos/test/some-folder/file.md')));
            const parser2_1 = service.getSyntaxParserFor(model2_1);
            assert(!parser2_1.isDisposed, 'Parser2_1 must not be disposed.');
            assert.notStrictEqual(parser2_1, parser2, 'Parser2_1 must be a new object.');
            assert.strictEqual(parser2_1.uri.toString(), model2.uri.toString(), 'Must create parser2_1 with the correct URI.');
            /**
             * Validate that new model2 contents are parsed correctly.
             */
            await parser2_1.settled();
            // parser2_1 must have 2 links now
            assertLinks(parser2_1.references, [
                // the first link didn't change
                new ExpectedLink(URI.file('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
                // the second link is new
                new ExpectedLink(URI.file('/Users/vscode/repos/test/some-folder/.copilot/prompts/test.prompt.md'), new Range(2, 2, 2, 2 + 42), new Range(2, 12, 2, 12 + 31)),
            ]);
        });
        test('auto-updated on model changes', async () => {
            const langId = 'bazLang';
            const model = disposables.add(createTextModel(' \t #file:../file.md\ntest1\n\t\n  [another file](/Users/root/tmp/file2.txt)\t\n', langId, undefined, URI.file('/repos/test/file1.txt')));
            const parser = service.getSyntaxParserFor(model);
            // sanity checks
            assert(parser.isDisposed === false, 'Parser must not be disposed.');
            assert(parser instanceof TextModelPromptParser, 'Parser must be an instance of TextModelPromptParser.');
            await parser.settled();
            assertLinks(parser.references, [
                new ExpectedLink(URI.file('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                new ExpectedLink(URI.file('/Users/root/tmp/file2.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
            model.applyEdits([
                {
                    range: new Range(4, 18, 4, 18 + 25),
                    text: '/Users/root/tmp/file3.txt',
                },
            ]);
            await parser.settled();
            assertLinks(parser.references, [
                // link1 didn't change
                new ExpectedLink(URI.file('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                // link2 changed in the file name only
                new ExpectedLink(URI.file('/Users/root/tmp/file3.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
        });
        test('throws if a disposed model provided', async function () {
            const model = disposables.add(createTextModel('test1\ntest2\n\ntest3\t\n', 'barLang', undefined, URI.parse('./github/prompts/file.prompt.md')));
            // dispose the model before using it
            model.dispose();
            assert.throws(() => {
                service.getSyntaxParserFor(model);
            }, 'Cannot create a prompt parser for a disposed model.');
        });
    });
    suite('parse', () => {
        test('explicit', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootFileName = 'file2.prompt.md';
            const rootFolderUri = URI.file(rootFolder);
            const rootFileUri = URI.joinPath(rootFolderUri, rootFileName);
            await (instaService.createInstance(MockFilesystem, 
            // the file structure to be created on the disk for the test
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
                            name: rootFileName,
                            contents: [
                                '---',
                                'description: \'Root prompt description.\'',
                                'tools: [\'my-tool1\', , true]',
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
                                        'mode: \'edit\'',
                                        '---',
                                        '',
                                        '[](./some-other-folder/non-existing-folder)',
                                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md contents`,
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
                                                'description: "File 4 splendid description."',
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
                                            contents: [
                                                '---',
                                                'description: "Non-prompt file description".',
                                                'tools: ["my-tool-24"]',
                                                '---',
                                            ],
                                        },
                                        {
                                            name: 'yetAnotherFolder🤭',
                                            children: [
                                                {
                                                    name: 'another-file.instructions.md',
                                                    contents: [
                                                        '---',
                                                        'description: "Another file description."',
                                                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                                                        'applyTo: "**/*.tsx"',
                                                        '---',
                                                        `[](${rootFolder}/folder1/some-other-folder)`,
                                                        'another-file.instructions.md contents\t [#file:file.txt](../file.txt)',
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
                }])).mock();
            const file3 = URI.joinPath(rootFolderUri, 'folder1/file3.prompt.md');
            const file4 = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/file4.prompt.md');
            const someOtherFolder = URI.joinPath(rootFolderUri, '/folder1/some-other-folder');
            const someOtherFolderFile = URI.joinPath(rootFolderUri, '/folder1/some-other-folder/file.txt');
            const nonExistingFolder = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/non-existing-folder');
            const yetAnotherFile = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md');
            const result1 = await service.parse(rootFileUri, PromptsType.prompt, CancellationToken.None);
            assert.deepStrictEqual(result1, {
                uri: rootFileUri,
                metadata: {
                    promptType: PromptsType.prompt,
                    description: 'Root prompt description.',
                    tools: ['my-tool1'],
                    mode: 'agent',
                },
                topError: undefined,
                references: [file3, file4]
            });
            const result2 = await service.parse(file3, PromptsType.prompt, CancellationToken.None);
            assert.deepStrictEqual(result2, {
                uri: file3,
                metadata: {
                    promptType: PromptsType.prompt,
                    mode: 'edit',
                },
                topError: undefined,
                references: [nonExistingFolder, yetAnotherFile]
            });
            const result3 = await service.parse(yetAnotherFile, PromptsType.instructions, CancellationToken.None);
            assert.deepStrictEqual(result3, {
                uri: yetAnotherFile,
                metadata: {
                    promptType: PromptsType.instructions,
                    description: 'Another file description.',
                    applyTo: '**/*.tsx',
                },
                topError: undefined,
                references: [someOtherFolder, someOtherFolderFile]
            });
            const result4 = await service.parse(file4, PromptsType.instructions, CancellationToken.None);
            assert.deepStrictEqual(result4, {
                uri: file4,
                metadata: {
                    promptType: PromptsType.instructions,
                    description: 'File 4 splendid description.',
                },
                topError: undefined,
                references: [
                    URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-existing/file.prompt.md'),
                    URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-prompt-file.md'),
                    URI.joinPath(rootFolderUri, '/folder1/'),
                ]
            });
        });
    });
    suite('findInstructionFilesFor', () => {
        teardown(() => {
            sinon.restore();
        });
        test('finds correct instruction files', async () => {
            const rootFolderName = 'finds-instruction-files';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await (instaService.createInstance(MockFilesystem, [{
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
                            name: '.github/prompts',
                            children: [
                                {
                                    name: 'file1.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 1.\'',
                                        'applyTo: "**/*.tsx"',
                                        '---',
                                        'Some instructions 1 contents.',
                                    ],
                                },
                                {
                                    name: 'file2.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 2.\'',
                                        'applyTo: "**/folder1/*.tsx"',
                                        '---',
                                        'Some instructions 2 contents.',
                                    ],
                                },
                                {
                                    name: 'file3.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 3.\'',
                                        'applyTo: "**/folder2/*.tsx"',
                                        '---',
                                        'Some instructions 3 contents.',
                                    ],
                                },
                                {
                                    name: 'file4.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 4.\'',
                                        'applyTo: "src/build/*.tsx"',
                                        '---',
                                        'Some instructions 4 contents.',
                                    ],
                                },
                                {
                                    name: 'file5.prompt.md',
                                    contents: [
                                        '---',
                                        'description: \'Prompt file 5.\'',
                                        '---',
                                        'Some prompt 5 contents.',
                                    ],
                                },
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'main.tsx',
                                    contents: 'console.log("Haalou!")',
                                },
                            ],
                        },
                    ],
                }])).mock();
            // mock user data instructions
            await (instaService.createInstance(MockFilesystem, [
                {
                    name: userPromptsFolderName,
                    children: [
                        {
                            name: 'file10.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 10.\'',
                                'applyTo: "**/folder1/*.tsx"',
                                '---',
                                'Some instructions 10 contents.',
                            ],
                        },
                        {
                            name: 'file11.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 11.\'',
                                'applyTo: "**/folder1/*.py"',
                                '---',
                                'Some instructions 11 contents.',
                            ],
                        },
                        {
                            name: 'file12.prompt.md',
                            contents: [
                                '---',
                                'description: \'Prompt file 12.\'',
                                '---',
                                'Some prompt 12 contents.',
                            ],
                        },
                    ],
                }
            ])).mock();
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const instructions = await contextComputer.findInstructionFilesFor(instructionFiles, context, CancellationToken.None);
            assert.deepStrictEqual(instructions.map(i => i.value.path), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('does not have duplicates', async () => {
            const rootFolderName = 'finds-instruction-files-without-duplicates';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await (instaService.createInstance(MockFilesystem, [{
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
                            name: '.github/prompts',
                            children: [
                                {
                                    name: 'file1.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 1.\'',
                                        'applyTo: "**/*.tsx"',
                                        '---',
                                        'Some instructions 1 contents.',
                                    ],
                                },
                                {
                                    name: 'file2.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 2.\'',
                                        'applyTo: "**/folder1/*.tsx"',
                                        '---',
                                        'Some instructions 2 contents. [](./file1.instructions.md)',
                                    ],
                                },
                                {
                                    name: 'file3.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 3.\'',
                                        'applyTo: "**/folder2/*.tsx"',
                                        '---',
                                        'Some instructions 3 contents.',
                                    ],
                                },
                                {
                                    name: 'file4.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 4.\'',
                                        'applyTo: "src/build/*.tsx"',
                                        '---',
                                        '[](./file3.instructions.md) Some instructions 4 contents.',
                                    ],
                                },
                                {
                                    name: 'file5.prompt.md',
                                    contents: [
                                        '---',
                                        'description: \'Prompt file 5.\'',
                                        '---',
                                        'Some prompt 5 contents.',
                                    ],
                                },
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'main.tsx',
                                    contents: 'console.log("Haalou!")',
                                },
                            ],
                        },
                    ],
                }])).mock();
            // mock user data instructions
            await (instaService.createInstance(MockFilesystem, [
                {
                    name: userPromptsFolderName,
                    children: [
                        {
                            name: 'file10.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 10.\'',
                                'applyTo: "**/folder1/*.tsx"',
                                '---',
                                'Some instructions 10 contents.',
                            ],
                        },
                        {
                            name: 'file11.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 11.\'',
                                'applyTo: "**/folder1/*.py"',
                                '---',
                                'Some instructions 11 contents.',
                            ],
                        },
                        {
                            name: 'file12.prompt.md',
                            contents: [
                                '---',
                                'description: \'Prompt file 12.\'',
                                '---',
                                'Some prompt 12 contents.',
                            ],
                        },
                    ],
                }
            ])).mock();
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/index.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/constants.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const instructions = await contextComputer.findInstructionFilesFor(instructionFiles, context, CancellationToken.None);
            assert.deepStrictEqual(instructions.map(i => i.value.path), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvc2VydmljZS9wcm9tcHRzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBQy9ILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFP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