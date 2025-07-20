/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { NotPromptFile } from '../../../../common/promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { NullPolicyService } from '../../../../../../../platform/policy/common/policy.js';
import { Line } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/line.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { LinesDecoder } from '../../../../common/promptSyntax/codecs/base/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FilePromptContentProvider } from '../../../../common/promptSyntax/contentProviders/filePromptContentsProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
/**
 * Timeout to wait for the content changed event to be emitted.
 */
const CONTENT_CHANGED_TIMEOUT = 50;
suite('FilePromptContentsProvider', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        const fileSystemProvider = testDisposables.add(new InMemoryFileSystemProvider());
        testDisposables.add(nullFileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('provides contents of a file', async () => {
        const fileService = instantiationService.get(IFileService);
        const fileName = `file-${randomInt(10000)}.prompt.md`;
        const fileUri = URI.file(`/${fileName}`);
        if (await fileService.exists(fileUri)) {
            await fileService.del(fileUri);
        }
        await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
        await timeout(5);
        const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true }));
        let streamOrError;
        testDisposables.add(contentsProvider.onContentChanged((event) => {
            streamOrError = event;
        }));
        contentsProvider.start();
        await timeout(CONTENT_CHANGED_TIMEOUT);
        assertDefined(streamOrError, 'The `streamOrError` must be defined.');
        assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
        const stream = new LinesDecoder(streamOrError);
        const receivedLines = await stream.consumeAll();
        assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
        const expectedLine = new Line(1, 'Hello, world!');
        const receivedLine = receivedLines[0];
        assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
    });
    suite('options', () => {
        suite('allowNonPromptFiles', () => {
            test('true', async () => {
                const fileService = instantiationService.get(IFileService);
                const fileName = (randomBoolean() === true)
                    ? `file-${randomInt(10_000)}.md`
                    : `file-${randomInt(10_000)}.txt`;
                const fileUri = URI.file(`/${fileName}`);
                if (await fileService.exists(fileUri)) {
                    await fileService.del(fileUri);
                }
                await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
                await timeout(5);
                const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true }));
                let streamOrError;
                testDisposables.add(contentsProvider.onContentChanged((event) => {
                    streamOrError = event;
                }));
                contentsProvider.start();
                await timeout(CONTENT_CHANGED_TIMEOUT);
                assertDefined(streamOrError, 'The `streamOrError` must be defined.');
                assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
                const stream = new LinesDecoder(streamOrError);
                const receivedLines = await stream.consumeAll();
                assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
                const expectedLine = new Line(1, 'Hello, world!');
                const receivedLine = receivedLines[0];
                assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
            });
            test('false', async () => {
                const fileService = instantiationService.get(IFileService);
                const fileName = (randomBoolean() === true)
                    ? `file-${randomInt(10_000)}.md`
                    : `file-${randomInt(10_000)}.txt`;
                const fileUri = URI.file(`/${fileName}`);
                if (await fileService.exists(fileUri)) {
                    await fileService.del(fileUri);
                }
                await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
                await timeout(5);
                const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: false, languageId: undefined, updateOnChange: true }));
                let streamOrError;
                testDisposables.add(contentsProvider.onContentChanged((event) => {
                    streamOrError = event;
                }));
                contentsProvider.start();
                await timeout(CONTENT_CHANGED_TIMEOUT);
                assertDefined(streamOrError, 'The `streamOrError` must be defined.');
                assert(streamOrError instanceof NotPromptFile, `Provider must produce an 'NotPromptFile' error, got '${streamOrError}'.`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy9maWxlUHJvbXB0Q29udGVudHNQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FB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