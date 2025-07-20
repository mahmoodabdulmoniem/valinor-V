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
import { URI } from '../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(folders, fileService) {
        this.folders = folders;
        this.fileService = fileService;
    }
    /**
     * Starts the mock process.
     */
    async mock() {
        const result = await Promise.all(this.folders
            .map((folder) => {
            return this.mockFolder(folder);
        }));
        // wait for the filesystem event to settle before proceeding
        // this is temporary workaround and should be fixed once we
        // improve behavior of the `settled()` / `allSettled()` methods
        await timeout(25);
        return result;
    }
    /**
     * The internal implementation of the filesystem mocking process.
     *
     * @throws If a folder or file in the filesystem structure already exists.
     * 		   This is to prevent subtle errors caused by overwriting existing files.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder
            ? URI.joinPath(parentFolder, folder.name)
            : URI.file(folder.name);
        assert(!(await this.fileService.exists(folderUri)), `Folder '${folderUri.path}' already exists.`);
        try {
            await this.fileService.createFolder(folderUri);
        }
        catch (error) {
            throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                assert(!(await this.fileService.exists(childUri)), `File '${folderUri.path}' already exists.`);
                const contents = (typeof child.contents === 'string')
                    ? child.contents
                    : child.contents.join('\n');
                await this.fileService.writeFile(childUri, VSBuffer.fromString(contents));
                resolvedChildren.push({
                    ...child,
                    uri: childUri,
                });
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return {
            ...folder,
            uri: folderUri,
        };
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9tb2NrRmlsZXN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBNEJuRjs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFDMUIsWUFDa0IsT0FBc0IsRUFDUixXQUF5QjtRQUR2QyxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQ1IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFDckQsQ0FBQztJQUVMOztPQUVHO0lBQ0ksS0FBSyxDQUFDLElBQUk7UUFDaEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUMvQixJQUFJLENBQUMsT0FBTzthQUNWLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUNILENBQUM7UUFFRiw0REFBNEQ7UUFDNUQsMkRBQTJEO1FBQzNELCtEQUErRDtRQUMvRCxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVsQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLEtBQUssQ0FBQyxVQUFVLENBQ3ZCLE1BQW1CLEVBQ25CLFlBQWtCO1FBRWxCLE1BQU0sU0FBUyxHQUFHLFlBQVk7WUFDN0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpCLE1BQU0sQ0FDTCxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUMzQyxXQUFXLFNBQVMsQ0FBQyxJQUFJLG1CQUFtQixDQUM1QyxDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixTQUFTLENBQUMsTUFBTSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQW9ELEVBQUUsQ0FBQztRQUM3RSxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckQsb0JBQW9CO1lBQ3BCLElBQUksVUFBVSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN6QixNQUFNLENBQ0wsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDMUMsU0FBUyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FDMUMsQ0FBQztnQkFFRixNQUFNLFFBQVEsR0FBVyxDQUFDLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUM7b0JBQzVELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUTtvQkFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUU3QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBRTFFLGdCQUFnQixDQUFDLElBQUksQ0FBQztvQkFDckIsR0FBRyxLQUFLO29CQUNSLEdBQUcsRUFBRSxRQUFRO2lCQUNiLENBQUMsQ0FBQztnQkFFSCxTQUFTO1lBQ1YsQ0FBQztZQUVELGdEQUFnRDtZQUNoRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCxPQUFPO1lBQ04sR0FBRyxNQUFNO1lBQ1QsR0FBRyxFQUFFLFNBQVM7U0FDZCxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFuRlksY0FBYztJQUd4QixXQUFBLFlBQVksQ0FBQTtHQUhGLGNBQWMsQ0FtRjFCIn0=