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
import { ChatModeKind } from '../../../../common/constants.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { ExpectedReference } from '../testUtils/expectedReference.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { PROMPT_LANGUAGE_ID, INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { ExpectedDiagnosticError, ExpectedDiagnosticWarning } from '../testUtils/expectedDiagnostic.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
/**
 * Test helper to run unit tests for the {@link TextModelPromptParser}
 * class using different test input parameters
 */
let TextModelPromptParserTest = class TextModelPromptParserTest extends Disposable {
    constructor(uri, initialContents, languageId = PROMPT_LANGUAGE_ID, fileService, instantiationService) {
        super();
        // create in-memory file system for this test instance
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.file, fileSystemProvider));
        // both line endings should yield the same results
        const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
        // create the underlying model
        this.model = this._register(createTextModel(initialContents.join(lineEnding), languageId, undefined, uri));
        // create the parser instance
        this.parser = this._register(instantiationService.createInstance(TextModelPromptParser, this.model, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true })).start();
    }
    /**
     * Wait for the prompt parsing/resolve process to finish.
     */
    async allSettled() {
        await this.parser.settled();
        return this.parser;
    }
    /**
     * Validate the current state of the parser.
     */
    async validateReferences(expectedReferences) {
        await this.parser.settled();
        const { references } = this.parser;
        for (let i = 0; i < expectedReferences.length; i++) {
            const reference = references[i];
            assertDefined(reference, `Expected reference #${i} be ${expectedReferences[i]}, got 'undefined'.`);
            expectedReferences[i].validateEqual(reference);
        }
        assert.strictEqual(expectedReferences.length, references.length, `[${this.model.uri}] Unexpected number of references.`);
    }
    /**
     * Validate list of diagnostic objects of the prompt header.
     */
    async validateHeaderDiagnostics(expectedDiagnostics) {
        await this.parser.settled();
        const { header } = this.parser;
        assertDefined(header, 'Prompt header must be defined.');
        const { diagnostics } = header;
        for (let i = 0; i < expectedDiagnostics.length; i++) {
            const diagnostic = diagnostics[i];
            assertDefined(diagnostic, `Expected diagnostic #${i} be ${expectedDiagnostics[i]}, got 'undefined'.`);
            try {
                expectedDiagnostics[i].validateEqual(diagnostic);
            }
            catch (_error) {
                throw new Error(`Expected diagnostic #${i} to be ${expectedDiagnostics[i]}, got '${diagnostic}'.`);
            }
        }
        assert.strictEqual(expectedDiagnostics.length, diagnostics.length, `Expected '${expectedDiagnostics.length}' diagnostic objects, got '${diagnostics.length}'.`);
    }
};
TextModelPromptParserTest = __decorate([
    __param(3, IFileService),
    __param(4, IInstantiationService)
], TextModelPromptParserTest);
suite('TextModelPromptParser', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IFileService, disposables.add(instantiationService.createInstance(FileService)));
        instantiationService.stub(IWorkbenchEnvironmentService, {});
    });
    /**
     * Create a new test instance with provided input parameters.
     */
    const createTest = (uri, initialContents, languageId = PROMPT_LANGUAGE_ID) => {
        return disposables.add(instantiationService.createInstance(TextModelPromptParserTest, uri, initialContents, languageId));
    };
    test('core logic #1', async () => {
        const test = createTest(URI.file('/foo/bar.md'), [
            /* 01 */ "The quick brown fox tries #file:/abs/path/to/file.md online yoga for the first time.",
            /* 02 */ "Maria discovered a stray turtle roaming in her kitchen.",
            /* 03 */ "Why did the robot write a poem about existential dread?",
            /* 04 */ "Sundays are made for two things: pancakes and procrastination.",
            /* 05 */ "Sometimes, the best code is the one you never have to write.",
            /* 06 */ "A lone kangaroo once hopped into the local cafe, seeking free Wi-Fi.",
            /* 07 */ "Critical #file:./folder/binary.file thinking is like coffee; best served strong [md link](/etc/hosts/random-file.txt) and without sugar.",
            /* 08 */ "Music is the mind's way of doodling in the air.",
            /* 09 */ "Stargazing is just turning your eyes into cosmic explorers.",
            /* 10 */ "Never trust a balloon salesman who hates birthdays.",
            /* 11 */ "Running backward can be surprisingly enlightening.",
            /* 12 */ "There's an art to whispering loudly.",
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: URI.file('/abs/path/to/file.md'),
                text: '#file:/abs/path/to/file.md',
                path: '/abs/path/to/file.md',
                startLine: 1,
                startColumn: 27,
                pathStartColumn: 33,
            }),
            new ExpectedReference({
                uri: URI.file('/foo/folder/binary.file'),
                text: '#file:./folder/binary.file',
                path: './folder/binary.file',
                startLine: 7,
                startColumn: 10,
                pathStartColumn: 16,
            }),
            new ExpectedReference({
                uri: URI.file('/etc/hosts/random-file.txt'),
                text: '[md link](/etc/hosts/random-file.txt)',
                path: '/etc/hosts/random-file.txt',
                startLine: 7,
                startColumn: 81,
                pathStartColumn: 91,
            }),
        ]);
    });
    test('core logic #2', async () => {
        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
            /* 01 */ "The penguin wore sunglasses but never left the iceberg.",
            /* 02 */ "I once saw a cloud that looked like an antique teapot.",
            /* 03 */ "Midnight snacks are the secret to eternal [link text](./foo-bar-baz/another-file.ts) happiness.",
            /* 04 */ "A stray sock in the hallway is a sign of chaotic creativity.",
            /* 05 */ "Dogs dream in colorful squeaks and belly rubs.",
            /* 06 */ "Never [caption](../../../c/file_name.prompt.md)\t underestimate the power of a well-timed nap.",
            /* 07 */ "The cactus on my desk has a thriving Instagram account.",
            /* 08 */ "In an alternate universe, pigeons deliver sushi by drone.",
            /* 09 */ "Lunar rainbows only appear when you sing in falsetto.",
            /* 10 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
            /* 11 */ "Sometimes, the best advice comes \t\t#file:../../main.rs\t#file:./somefolder/../samefile.jpeg\tfrom a talking dishwasher.",
            /* 12 */ "Paper airplanes believe they can fly until proven otherwise.",
            /* 13 */ "A library without stories is just a room full of silent trees.",
            /* 14 */ "The invisible cat meows only when it sees a postman.",
            /* 15 */ "Code reviews are like detective novels without the plot twists."
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                text: '[link text](./foo-bar-baz/another-file.ts)',
                path: './foo-bar-baz/another-file.ts',
                startLine: 3,
                startColumn: 43,
                pathStartColumn: 55,
            }),
            new ExpectedReference({
                uri: URI.file('/absolute/c/file_name.prompt.md'),
                text: '[caption](../../../c/file_name.prompt.md)',
                path: '../../../c/file_name.prompt.md',
                startLine: 6,
                startColumn: 7,
                pathStartColumn: 17,
            }),
            new ExpectedReference({
                uri: URI.file('/absolute/folder/main.rs'),
                text: '#file:../../main.rs',
                path: '../../main.rs',
                startLine: 11,
                startColumn: 36,
                pathStartColumn: 42,
            }),
            new ExpectedReference({
                uri: URI.file('/absolute/folder/and/a/samefile.jpeg'),
                text: '#file:./somefolder/../samefile.jpeg',
                path: './somefolder/../samefile.jpeg',
                startLine: 11,
                startColumn: 56,
                pathStartColumn: 62,
            }),
        ]);
    });
    suite('header', () => {
        suite('metadata', () => {
            suite('instructions', () => {
                test(`empty header`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "",
                        /* 03 */ "---",
                        /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 05 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 06 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 07 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 08 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], INSTRUCTIONS_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 5,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.instructions,
                    }, 'Must have empty metadata.');
                });
                test(`has correct 'instructions' metadata`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.instructions.md'), [
                        /* 01 */ "---",
                        /* 02 */ "description: 'My prompt.'\t\t",
                        /* 03 */ "	something: true", /* unknown metadata record */
                        /* 04 */ "	tools: [ 'tool_name1', \"tool_name2\", 'tool_name1', true, false, '', 'tool_name2' ]\t\t",
                        /* 05 */ "	tools: [ 'tool_name3', \"tool_name4\" ]", /* duplicate `tools` record is ignored */
                        /* 06 */ "	tools: 'tool_name5'", /* duplicate `tools` record with invalid value is ignored */
                        /* 07 */ "	mode: 'agent'",
                        /* 07 */ "	applyTo: 'frontend/**/*spec.ts'",
                        /* 08 */ "---",
                        /* 09 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 10 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 11 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 12 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 13 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], INSTRUCTIONS_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 11,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert(metadata?.promptType === PromptsType.instructions, `Must be a 'instructions' metadata, got '${JSON.stringify(metadata)}'.`);
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.instructions,
                        description: 'My prompt.',
                        applyTo: 'frontend/**/*spec.ts',
                    }, 'Must have correct metadata.');
                });
            });
            suite('prompts', () => {
                test(`empty header`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "",
                        /* 03 */ "---",
                        /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 05 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 06 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 07 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 08 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], PROMPT_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 5,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.prompt,
                    }, 'Must have empty metadata.');
                });
                test(`has correct 'prompt' metadata`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "description: 'My prompt.'\t\t",
                        /* 03 */ "	something: true", /* unknown metadata record */
                        /* 04 */ "	tools: [ 'tool_name1', \"tool_name2\", 'tool_name1', true, false, '', 'tool_name2' ]\t\t",
                        /* 05 */ "	tools: [ 'tool_name3', \"tool_name4\" ]", /* duplicate `tools` record is ignored */
                        /* 06 */ "	tools: 'tool_name5'", /* duplicate `tools` record with invalid value is ignored */
                        /* 07 */ "	mode: 'agent'",
                        /* 08 */ "	applyTo: 'frontend/**/*spec.ts'",
                        /* 09 */ "	model: 'Super Finetune Turbo 2.3-o1'",
                        /* 10 */ "---",
                        /* 11 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 12 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 13 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 14 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 13 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], PROMPT_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 12,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.prompt,
                        mode: 'agent',
                        description: 'My prompt.',
                        tools: ['tool_name1', 'tool_name2'],
                        model: 'Super Finetune Turbo 2.3-o1',
                    }, 'Must have correct metadata.');
                });
            });
            suite('modes', () => {
                test(`empty header`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "",
                        /* 03 */ "---",
                        /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 05 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 06 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 07 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 08 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], MODE_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 5,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.mode,
                    }, 'Must have empty metadata.');
                });
                test(`has correct metadata`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "description: 'My mode.'\t\t",
                        /* 03 */ "	something: true", /* unknown metadata record */
                        /* 04 */ "	tools: [ 'tool_name1', \"tool_name2\", 'tool_name1', true, false, '', 'tool_name2' ]\t\t",
                        /* 05 */ "	tools: [ 'tool_name3', \"tool_name4\" ]", /* duplicate `tools` record is ignored */
                        /* 06 */ "	tools: 'tool_name5'", /* duplicate `tools` record with invalid value is ignored */
                        /* 07 */ "	applyTo: 'frontend/**/*spec.ts'",
                        /* 08 */ "---",
                        /* 09 */ "The cactus on my desk has a thriving Instagram account.",
                        /* 10 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                        /* 11 */ "In an alternate universe, pigeons deliver sushi by drone.",
                        /* 12 */ "Lunar rainbows only appear when you sing in falsetto.",
                        /* 13 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], MODE_LANGUAGE_ID);
                    await test.validateReferences([
                        new ExpectedReference({
                            uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                            text: '[text](./foo-bar-baz/another-file.ts)',
                            path: './foo-bar-baz/another-file.ts',
                            startLine: 10,
                            startColumn: 43,
                            pathStartColumn: 50,
                        }),
                    ]);
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Mode header must be defined.');
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.mode,
                        description: 'My mode.',
                        tools: ['tool_name1', 'tool_name2'],
                    }, 'Must have correct metadata.');
                });
                test(`has model metadata`, async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/filename1.txt'), [
                        /* 01 */ "---",
                        /* 02 */ "description: 'My mode.'\t\t",
                        /* 03 */ "model: Martin Finetune Turbo",
                        /* 04 */ "---",
                        /* 05 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                    ], MODE_LANGUAGE_ID);
                    await test.allSettled();
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'header must be defined.');
                    assert.deepStrictEqual(metadata, {
                        promptType: PromptsType.mode,
                        description: 'My mode.',
                        model: 'Martin Finetune Turbo',
                    }, 'Must have correct metadata.');
                });
            });
        });
        suite('diagnostics', () => {
            test('core logic', async () => {
                const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                    /* 01 */ "---",
                    /* 02 */ "	description: true \t ",
                    /* 03 */ "	mode: \"ask\"",
                    /* 04 */ "	something: true", /* unknown metadata record */
                    /* 05 */ "tools: [ 'tool_name1', \"tool_name2\", 'tool_name1', true, false, '', ,'tool_name2' ] ",
                    /* 06 */ "  tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ", /* duplicate `tools` record is ignored */
                    /* 07 */ "tools: 'tool_name5'", /* duplicate `tools` record with invalid value is ignored */
                    /* 08 */ "---",
                    /* 09 */ "The cactus on my desk has a thriving Instagram account.",
                    /* 10 */ "Midnight snacks are the secret to eternal [text](./foo-bar-baz/another-file.ts) happiness.",
                    /* 11 */ "In an alternate universe, pigeons deliver sushi by drone.",
                    /* 12 */ "Lunar rainbows only appear when you sing in falsetto.",
                    /* 13 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
                ], PROMPT_LANGUAGE_ID);
                await test.validateReferences([
                    new ExpectedReference({
                        uri: URI.file('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                        text: '[text](./foo-bar-baz/another-file.ts)',
                        path: './foo-bar-baz/another-file.ts',
                        startLine: 10,
                        startColumn: 43,
                        pathStartColumn: 50,
                    }),
                ]);
                const { header, metadata } = test.parser;
                assertDefined(header, 'Prompt header must be defined.');
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: 'ask',
                }, 'Must have correct metadata.');
                await test.validateHeaderDiagnostics([
                    new ExpectedDiagnosticError(new Range(2, 15, 2, 15 + 4), 'The \'description\' metadata must be a \'string\', got \'boolean\'.'),
                    new ExpectedDiagnosticWarning(new Range(4, 2, 4, 2 + 15), 'Unknown property \'something\' will be ignored.'),
                    new ExpectedDiagnosticWarning(new Range(5, 38, 5, 38 + 12), 'Duplicate tool name \'tool_name1\'.'),
                    new ExpectedDiagnosticWarning(new Range(5, 52, 5, 52 + 4), 'Unexpected tool name \'true\', expected a string literal.'),
                    new ExpectedDiagnosticWarning(new Range(5, 58, 5, 58 + 5), 'Unexpected tool name \'false\', expected a string literal.'),
                    new ExpectedDiagnosticWarning(new Range(5, 65, 5, 65 + 2), 'Tool name cannot be empty.'),
                    new ExpectedDiagnosticWarning(new Range(5, 70, 5, 70 + 12), 'Duplicate tool name \'tool_name2\'.'),
                    new ExpectedDiagnosticWarning(new Range(5, 1, 5, 84), `Tools can only be used when in 'agent' mode, but the mode is set to 'ask'. The tools will be ignored.`),
                    new ExpectedDiagnosticWarning(new Range(6, 3, 6, 3 + 37), `Duplicate property 'tools' will be ignored.`),
                    new ExpectedDiagnosticWarning(new Range(7, 1, 7, 1 + 19), `Duplicate property 'tools' will be ignored.`),
                ]);
            });
            suite('tools metadata', () => {
                test('tool names can be quoted and non-quoted string', async () => {
                    const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                        /* 01 */ "---",
                        /* 02 */ "tools: [tool1, 'tool2', \"tool3\", tool-4]",
                        /* 03 */ "---",
                        /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                    ], PROMPT_LANGUAGE_ID);
                    await test.allSettled();
                    const { header, metadata } = test.parser;
                    assertDefined(header, 'Prompt header must be defined.');
                    assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                    const { tools } = metadata;
                    assert.deepStrictEqual(tools, ['tool1', 'tool2', 'tool3', 'tool-4'], 'Mode metadata must have correct value.');
                    await test.validateHeaderDiagnostics([]);
                });
            });
            suite('applyTo metadata', () => {
                suite('language', () => {
                    test('prompt', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "applyTo: '**/*'",
                            /* 03 */ "mode: \"ask\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert.deepStrictEqual(metadata, {
                            promptType: PromptsType.prompt,
                            mode: ChatModeKind.Ask,
                        }, 'Must have correct metadata.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 1 + 15), `Unknown property 'applyTo' will be ignored.`),
                        ]);
                    });
                    test('instructions', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "applyTo: '**/*'",
                            /* 03 */ "mode: \"edit\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert.deepStrictEqual(metadata, {
                            promptType: PromptsType.instructions,
                            applyTo: '**/*',
                        }, 'Must have correct metadata.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(3, 1, 3, 13), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                });
            });
            test('invalid glob pattern', async () => {
                const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                    /* 01 */ "---",
                    /* 02 */ "mode: \"agent\"",
                    /* 03 */ "applyTo: ''",
                    /* 04 */ "---",
                    /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                ], INSTRUCTIONS_LANGUAGE_ID);
                await test.allSettled();
                const { header, metadata } = test.parser;
                assertDefined(header, 'Prompt header must be defined.');
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.instructions,
                }, 'Must have correct metadata.');
                await test.validateHeaderDiagnostics([
                    new ExpectedDiagnosticWarning(new Range(2, 1, 2, 14), `Unknown property 'mode' will be ignored.`),
                    new ExpectedDiagnosticWarning(new Range(3, 10, 3, 10 + 2), `Invalid glob pattern ''.`),
                ]);
            });
            suite('mode', () => {
                suite('invalid', () => {
                    test('quoted string value', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "mode: \"my-mode\"",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 7 + 9), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('single-token unquoted-string value', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "mode: myMode ",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 7 + 6), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('unquoted string value', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "mode: my-mode",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 7 + 7), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('multi-token unquoted-string value', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "mode: my mode is your mode\t \t",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 7 + 20), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('after a description metadata', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ "description: my clear but concise description",
                            /* 03 */ "mode: mode24",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(3, 1, 3, 7 + 6), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('boolean value', async () => {
                        const booleanValue = randomBoolean();
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ `	mode: \t${booleanValue}\t`,
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 2, 2, 9 + `${booleanValue}`.length), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('empty quoted string value', async () => {
                        const quotedString = (randomBoolean())
                            ? `''`
                            : '""';
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ `		mode: ${quotedString}`,
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 3, 2, 9 + `${quotedString}`.length), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('empty value', async () => {
                        const value = (randomBoolean())
                            ? '\t\t  \t\t'
                            : ' \t \v \t ';
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ `	\vmode: ${value}`,
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 3, 2, 9), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                    test('void value', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/my.prompt.md'), [
                            /* 01 */ "---",
                            /* 02 */ `	mode: `,
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], INSTRUCTIONS_LANGUAGE_ID);
                        await test.allSettled();
                        const { header } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 2, 2, 8), `Unknown property 'mode' will be ignored.`),
                        ]);
                    });
                });
            });
            suite('tools and mode compatibility', () => {
                suite('tools is set', () => {
                    test('ask mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ",
                            /* 03 */ "mode: \"ask\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assert.equal(tools, undefined, 'Tools metadata must not be defined.');
                        assert.strictEqual(mode, ChatModeKind.Ask, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 38), 'Tools can only be used when in \'agent\' mode, but the mode is set to \'ask\'. The tools will be ignored.'),
                        ]);
                    });
                    test('edit mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ",
                            /* 03 */ "mode: \"edit\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assert.equal(tools, undefined, 'Tools metadata must not be defined.');
                        assert.strictEqual(mode, ChatModeKind.Edit, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticWarning(new Range(2, 1, 2, 38), 'Tools can only be used when in \'agent\' mode, but the mode is set to \'edit\'. The tools will be ignored.'),
                        ]);
                    });
                    test('agent mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ",
                            /* 03 */ "mode: \"agent\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assertDefined(tools, 'Tools metadata must be defined.');
                        assert.strictEqual(mode, ChatModeKind.Agent, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([]);
                    });
                    test('no mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assertDefined(tools, 'Tools metadata must be defined.');
                        assert.strictEqual(mode, ChatModeKind.Agent, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([]);
                    });
                    test('invalid mode', async () => {
                        const value = (randomBoolean())
                            ? 'unknown mode  '
                            : 'unknown';
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "tools: [ 'tool_name3', \"tool_name4\" ]  \t\t  ",
                            /* 03 */ `mode:  \t\t${value}`,
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assertDefined(tools, 'Tools metadata must be defined.');
                        assert.strictEqual(mode, ChatModeKind.Agent, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticError(new Range(3, 10, 3, 10 + value.trim().length), `The 'mode' metadata must be one of 'ask' | 'edit' | 'agent', got '${value.trim()}'.`),
                        ]);
                    });
                });
                suite('tools is not set', () => {
                    test('ask mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "description: ['my prompt', 'description.']",
                            /* 03 */ "mode: \"ask\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assert(tools === undefined, 'Tools metadata must not be defined.');
                        assert.strictEqual(mode, ChatModeKind.Ask, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([
                            new ExpectedDiagnosticError(new Range(2, 14, 2, 14 + 29), `The 'description' metadata must be a 'string', got 'array'.`),
                        ]);
                    });
                    test('edit mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "description: my prompt description. \t\t  \t\t   ",
                            /* 03 */ "mode: \"edit\"",
                            /* 04 */ "---",
                            /* 05 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assert(tools === undefined, 'Tools metadata must not be defined.');
                        assert.strictEqual(mode, ChatModeKind.Edit, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([]);
                    });
                    test('agent mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "mode: \"agent\"",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assert(metadata?.promptType === PromptsType.prompt, `Must be a 'prompt' metadata, got '${JSON.stringify(metadata)}'.`);
                        const { tools, mode } = metadata;
                        assert(tools === undefined, 'Tools metadata must not be defined.');
                        assert.strictEqual(mode, ChatModeKind.Agent, 'Mode metadata must have correct value.');
                        await test.validateHeaderDiagnostics([]);
                    });
                    test('no mode', async () => {
                        const test = createTest(URI.file('/absolute/folder/and/a/filename.txt'), [
                            /* 01 */ "---",
                            /* 02 */ "description: 'My prompt.'",
                            /* 03 */ "---",
                            /* 04 */ "The cactus on my desk has a thriving Instagram account.",
                        ], PROMPT_LANGUAGE_ID);
                        await test.allSettled();
                        const { header, metadata } = test.parser;
                        assertDefined(header, 'Prompt header must be defined.');
                        assertDefined(metadata, 'Prompt metadata and metadata must be defined.');
                        assert(('tools' in metadata) === false, 'Tools metadata must not be defined.');
                        assert(('mode' in metadata) === false, 'Mode metadata must not be defined.');
                        await test.validateHeaderDiagnostics([]);
                    });
                });
            });
        });
    });
    test('gets disposed with the model', async () => {
        const test = createTest(URI.file('/some/path/file.prompt.md'), [
            'line1',
            'line2',
            'line3',
        ]);
        // no references in the model contents
        await test.validateReferences([]);
        test.model.dispose();
        assert(test.parser.isDisposed, 'The parser should be disposed with its model.');
    });
    test('toString()', async () => {
        const modelUri = URI.file('/Users/legomushroom/repos/prompt-snippets/README.md');
        const test = createTest(modelUri, [
            'line1',
            'line2',
            'line3',
        ]);
        assert.strictEqual(test.parser.toString(), `text-model-prompt:${modelUri.path}`, 'The parser should provide correct `toString()` implementation.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvdGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUV6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUs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