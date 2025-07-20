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
import { URI } from '../../../../../../base/common/uri.js';
import { isAbsolute } from '../../../../../../base/common/path.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { getPromptFileLocationsConfigKey, PromptsConfig } from '../config/config.js';
import { basename, dirname, joinPath } from '../../../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { getPromptFileExtension, getPromptFileType } from '../config/promptFileLocations.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { getExcludes, ISearchService } from '../../../../../services/search/common/search.js';
import { isCancellationError } from '../../../../../../base/common/errors.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
/**
 * Utility class to locate prompt files.
 */
let PromptFilesLocator = class PromptFilesLocator extends Disposable {
    constructor(fileService, configService, workspaceService, environmentService, searchService, userDataService, logService) {
        super();
        this.fileService = fileService;
        this.configService = configService;
        this.workspaceService = workspaceService;
        this.environmentService = environmentService;
        this.searchService = searchService;
        this.userDataService = userDataService;
        this.logService = logService;
    }
    /**
     * List all prompt files from the filesystem.
     *
     * @returns List of prompt files found in the workspace.
     */
    async listFiles(type, storage, token) {
        if (storage === 'local') {
            return await this.listFilesInLocal(type, token);
        }
        else {
            return await this.listFilesInUserData(type, token);
        }
    }
    async listFilesInUserData(type, token) {
        const files = await this.resolveFilesAtLocation(this.userDataService.currentProfile.promptsHome, token);
        return files.filter(file => getPromptFileType(file) === type);
    }
    async getCopilotInstructionsFiles(instructionFilePaths) {
        const { folders } = this.workspaceService.getWorkspace();
        const result = [];
        for (const folder of folders) {
            for (const instructionFilePath of instructionFilePaths) {
                const file = joinPath(folder.uri, instructionFilePath);
                if (await this.fileService.exists(file)) {
                    result.push(file);
                }
            }
        }
        return result;
    }
    createFilesUpdatedEvent(type) {
        const disposables = new DisposableStore();
        const eventEmitter = disposables.add(new Emitter());
        const userDataFolder = this.userDataService.currentProfile.promptsHome;
        const key = getPromptFileLocationsConfigKey(type);
        let parentFolders = this.getLocalParentFolders(type);
        const externalFolderWatchers = disposables.add(new DisposableStore());
        const updateExternalFolderWatchers = () => {
            externalFolderWatchers.clear();
            for (const folder of parentFolders) {
                if (!this.workspaceService.getWorkspaceFolder(folder.parent)) {
                    // if the folder is not part of the workspace, we need to watch it
                    const recursive = folder.filePattern !== undefined;
                    externalFolderWatchers.add(this.fileService.watch(folder.parent, { recursive, excludes: [] }));
                }
            }
        };
        updateExternalFolderWatchers();
        disposables.add(this.configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(key)) {
                parentFolders = this.getLocalParentFolders(type);
                updateExternalFolderWatchers();
                eventEmitter.fire();
            }
        }));
        disposables.add(this.fileService.onDidFilesChange(e => {
            if (e.affects(userDataFolder)) {
                eventEmitter.fire();
                return;
            }
            if (parentFolders.some(folder => e.affects(folder.parent))) {
                eventEmitter.fire();
                return;
            }
        }));
        disposables.add(this.fileService.watch(userDataFolder));
        return { event: eventEmitter.event, dispose: () => disposables.dispose() };
    }
    /**
     * Get all possible unambiguous prompt file source folders based on
     * the current workspace folder structure.
     *
     * This method is currently primarily used by the `> Create Prompt`
     * command that providers users with the list of destination folders
     * for a newly created prompt file. Because such a list cannot contain
     * paths that include `glob pattern` in them, we need to process config
     * values and try to create a list of clear and unambiguous locations.
     *
     * @returns List of possible unambiguous prompt file folders.
     */
    getConfigBasedSourceFolders(type) {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService, type);
        const absoluteLocations = this.toAbsoluteLocations(configuredLocations);
        // locations in the settings can contain glob patterns so we need
        // to process them to get "clean" paths; the goal here is to have
        // a list of unambiguous folder paths where prompt files are stored
        const result = new ResourceSet();
        for (let absoluteLocation of absoluteLocations) {
            const baseName = basename(absoluteLocation);
            // if a path ends with a well-known "any file" pattern, remove
            // it so we can get the dirname path of that setting value
            const filePatterns = ['*.md', `*${getPromptFileExtension(type)}`];
            for (const filePattern of filePatterns) {
                if (baseName === filePattern) {
                    absoluteLocation = dirname(absoluteLocation);
                    continue;
                }
            }
            // likewise, if the pattern ends with single `*` (any file name)
            // remove it to get the dirname path of the setting value
            if (baseName === '*') {
                absoluteLocation = dirname(absoluteLocation);
            }
            // if after replacing the "file name" glob pattern, the path
            // still contains a glob pattern, then ignore the path
            if (isValidGlob(absoluteLocation.path) === true) {
                continue;
            }
            result.add(absoluteLocation);
        }
        return [...result];
    }
    /**
     * Finds all existent prompt files in the configured local source folders.
     *
     * @returns List of prompt files found in the local source folders.
     */
    async listFilesInLocal(type, token) {
        // find all prompt files in the provided locations, then match
        // the found file paths against (possible) glob patterns
        const paths = new ResourceSet();
        for (const { parent, filePattern } of this.getLocalParentFolders(type)) {
            const files = (filePattern === undefined)
                ? await this.resolveFilesAtLocation(parent, token) // if the location does not contain a glob pattern, resolve the location directly
                : await this.searchFilesInLocation(parent, filePattern, token);
            for (const file of files) {
                if (getPromptFileType(file) === type) {
                    paths.add(file);
                }
            }
            if (token.isCancellationRequested) {
                return [];
            }
        }
        return [...paths];
    }
    getLocalParentFolders(type) {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService, type);
        const absoluteLocations = this.toAbsoluteLocations(configuredLocations);
        return absoluteLocations.map(firstNonGlobParentAndPattern);
    }
    /**
     * Converts locations defined in `settings` to absolute filesystem path URIs.
     * This conversion is needed because locations in settings can be relative,
     * hence we need to resolve them based on the current workspace folders.
     */
    toAbsoluteLocations(configuredLocations) {
        const result = new ResourceSet();
        const { folders } = this.workspaceService.getWorkspace();
        for (const configuredLocation of configuredLocations) {
            try {
                if (isAbsolute(configuredLocation)) {
                    let uri = URI.file(configuredLocation);
                    const remoteAuthority = this.environmentService.remoteAuthority;
                    if (remoteAuthority) {
                        // if the location is absolute and we are in a remote environment,
                        // we need to convert it to a file URI with the remote authority
                        uri = uri.with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });
                    }
                    result.add(uri);
                }
                else {
                    for (const workspaceFolder of folders) {
                        const absolutePath = joinPath(workspaceFolder.uri, configuredLocation);
                        result.add(absolutePath);
                    }
                }
            }
            catch (error) {
                this.logService.error(`Failed to resolve prompt file location: ${configuredLocation}`, error);
            }
        }
        return [...result];
    }
    /**
     * Uses the file service to resolve the provided location and return either the file at the location of files in the directory.
     */
    async resolveFilesAtLocation(location, token) {
        try {
            const info = await this.fileService.resolve(location);
            if (info.isFile) {
                return [info.resource];
            }
            else if (info.isDirectory && info.children) {
                const result = [];
                for (const child of info.children) {
                    if (child.isFile) {
                        result.push(child.resource);
                    }
                }
                return result;
            }
        }
        catch (error) {
        }
        return [];
    }
    /**
     * Uses the search service to find all files at the provided location
     */
    async searchFilesInLocation(folder, filePattern, token) {
        const disregardIgnoreFiles = this.configService.getValue('explorer.excludeGitIgnore');
        const workspaceRoot = this.workspaceService.getWorkspaceFolder(folder);
        const getExcludePattern = (folder) => getExcludes(this.configService.getValue({ resource: folder })) || {};
        const searchOptions = {
            folderQueries: [{ folder, disregardIgnoreFiles }],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            excludePattern: workspaceRoot ? getExcludePattern(workspaceRoot.uri) : undefined,
            sortByScore: true,
            filePattern
        };
        try {
            const searchResult = await this.searchService.fileSearch(searchOptions, token);
            if (token?.isCancellationRequested) {
                return [];
            }
            return searchResult.results.map(r => r.resource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        return [];
    }
};
PromptFilesLocator = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ISearchService),
    __param(5, IUserDataProfileService),
    __param(6, ILogService)
], PromptFilesLocator);
export { PromptFilesLocator };
/**
 * Checks if the provided `pattern` could be a valid glob pattern.
 */
export function isValidGlob(pattern) {
    let squareBrackets = false;
    let squareBracketsCount = 0;
    let curlyBrackets = false;
    let curlyBracketsCount = 0;
    let previousCharacter;
    for (const char of pattern) {
        // skip all escaped characters
        if (previousCharacter === '\\') {
            previousCharacter = char;
            continue;
        }
        if (char === '*') {
            return true;
        }
        if (char === '?') {
            return true;
        }
        if (char === '[') {
            squareBrackets = true;
            squareBracketsCount++;
            previousCharacter = char;
            continue;
        }
        if (char === ']') {
            squareBrackets = true;
            squareBracketsCount--;
            previousCharacter = char;
            continue;
        }
        if (char === '{') {
            curlyBrackets = true;
            curlyBracketsCount++;
            continue;
        }
        if (char === '}') {
            curlyBrackets = true;
            curlyBracketsCount--;
            previousCharacter = char;
            continue;
        }
        previousCharacter = char;
    }
    // if square brackets exist and are in pairs, this is a `valid glob`
    if (squareBrackets && (squareBracketsCount === 0)) {
        return true;
    }
    // if curly brackets exist and are in pairs, this is a `valid glob`
    if (curlyBrackets && (curlyBracketsCount === 0)) {
        return true;
    }
    return false;
}
/**
 * Finds the first parent of the provided location that does not contain a `glob pattern`.
 *
 * Asumes that the location that is provided has a valid path (is abstract)
 *
 * ## Examples
 *
 * ```typescript
 * assert.strictDeepEqual(
 *     firstNonGlobParentAndPattern(URI.file('/home/user/{folder1,folder2}/file.md')).path,
 *     { parent: URI.file('/home/user'), filePattern: '{folder1,folder2}/file.md' },
 *     'Must find correct non-glob parent dirname.',
 * );
 * ```
 */
function firstNonGlobParentAndPattern(location) {
    const segments = location.path.split('/');
    let i = 0;
    while (i < segments.length && isValidGlob(segments[i]) === false) {
        i++;
    }
    if (i === segments.length) {
        // the path does not contain a glob pattern, so we can
        // just find all prompt files in the provided location
        return { parent: location };
    }
    const parent = location.with({ path: segments.slice(0, i).join('/') });
    if (i === segments.length - 1 && segments[i] === '*' || segments[i] === ``) {
        return { parent };
    }
    // the path contains a glob pattern, so we search in last folder that does not contain a glob pattern
    return {
        parent,
        filePattern: segments.slice(i).join('/')
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvcHJvbXB0RmlsZXNMb2NhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsYUFBYSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDaEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQW9DLGNBQWMsRUFBYSxNQUFNLGlEQUFpRCxDQUFDO0FBRTNJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSx1QkFB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