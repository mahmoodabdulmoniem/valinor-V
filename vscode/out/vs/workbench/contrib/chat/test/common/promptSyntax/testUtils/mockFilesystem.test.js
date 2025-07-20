/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MockFilesystem } from './mockFilesystem.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
/**
 * Validates that file at {@link filePath} has expected attributes.
 */
async function validateFile(filePath, expectedFile, fileService) {
    let readFile;
    try {
        readFile = await fileService.resolve(URI.file(filePath));
    }
    catch (error) {
        throw new Error(`Failed to read file '${filePath}': ${error}.`);
    }
    assert.strictEqual(readFile.name, expectedFile.name, `File '${filePath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFile.resource, expectedFile.resource, `File '${filePath}' must have correct 'URI'.`);
    assert.strictEqual(readFile.isFile, expectedFile.isFile, `File '${filePath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFile.isDirectory, expectedFile.isDirectory, `File '${filePath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFile.isSymbolicLink, expectedFile.isSymbolicLink, `File '${filePath}' must have correct 'isSymbolicLink' value.`);
    assert.strictEqual(readFile.children, undefined, `File '${filePath}' must not have children.`);
    const fileContents = await fileService.readFile(readFile.resource);
    assert.strictEqual(fileContents.value.toString(), expectedFile.contents, `File '${expectedFile.resource.fsPath}' must have correct contents.`);
}
/**
 * Validates that folder at {@link folderPath} has expected attributes.
 */
async function validateFolder(folderPath, expectedFolder, fileService) {
    let readFolder;
    try {
        readFolder = await fileService.resolve(URI.file(folderPath));
    }
    catch (error) {
        throw new Error(`Failed to read folder '${folderPath}': ${error}.`);
    }
    assert.strictEqual(readFolder.name, expectedFolder.name, `Folder '${folderPath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFolder.resource, expectedFolder.resource, `Folder '${folderPath}' must have correct 'URI'.`);
    assert.strictEqual(readFolder.isFile, expectedFolder.isFile, `Folder '${folderPath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFolder.isDirectory, expectedFolder.isDirectory, `Folder '${folderPath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFolder.isSymbolicLink, expectedFolder.isSymbolicLink, `Folder '${folderPath}' must have correct 'isSymbolicLink' value.`);
    assertDefined(readFolder.children, `Folder '${folderPath}' must have children.`);
    assert.strictEqual(readFolder.children.length, expectedFolder.children.length, `Folder '${folderPath}' must have correct number of children.`);
    for (const expectedChild of expectedFolder.children) {
        const childPath = URI.joinPath(expectedFolder.resource, expectedChild.name).fsPath;
        if ('children' in expectedChild) {
            await validateFolder(childPath, expectedChild, fileService);
            continue;
        }
        await validateFile(childPath, expectedChild, fileService);
    }
}
suite('MockFilesystem', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let fileService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        fileService = disposables.add(instantiationService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, fileService);
    });
    test('mocks file structure', async () => {
        const mockFilesystem = instantiationService.createInstance(MockFilesystem, [
            {
                name: '/root/folder',
                children: [
                    {
                        name: 'file.txt',
                        contents: 'contents',
                    },
                    {
                        name: 'Subfolder',
                        children: [
                            {
                                name: 'test.ts',
                                contents: 'other contents',
                            },
                            {
                                name: 'file.test.ts',
                                contents: 'hello test',
                            },
                            {
                                name: '.file-2.TEST.ts',
                                contents: 'test hello',
                            },
                        ]
                    }
                ]
            }
        ]);
        await mockFilesystem.mock();
        /**
         * Validate files and folders next.
         */
        await validateFolder('/root/folder', {
            resource: URI.file('/root/folder'),
            name: 'folder',
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
            children: [
                {
                    resource: URI.file('/root/folder/file.txt'),
                    name: 'file.txt',
                    isFile: true,
                    isDirectory: false,
                    isSymbolicLink: false,
                    contents: 'contents',
                },
                {
                    resource: URI.file('/root/folder/Subfolder'),
                    name: 'Subfolder',
                    isFile: false,
                    isDirectory: true,
                    isSymbolicLink: false,
                    children: [
                        {
                            resource: URI.file('/root/folder/Subfolder/test.ts'),
                            name: 'test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'other contents',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/file.test.ts'),
                            name: 'file.test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'hello test',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/.file-2.TEST.ts'),
                            name: '.file-2.TEST.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'test hello',
                        },
                    ],
                }
            ],
        }, fileService);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL21vY2tGaWxlc3lzdGVtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsWUFBWSxFQUFhLE1BQU0scURBQXFELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDdEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUM7QUE4Qi9IOztHQUVHO0FBQ0gsS0FBSyxVQUFVLFlBQVksQ0FDMUIsUUFBZ0IsRUFDaEIsWUFBMkIsRUFDM0IsV0FBeUI7SUFFekIsSUFBSSxRQUErQixDQUFDO0lBQ3BDLElBQUksQ0FBQztRQUNKLFFBQVEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FB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