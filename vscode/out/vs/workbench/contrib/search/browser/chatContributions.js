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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { getExcludes, ISearchService, VIEW_ID } from '../../../services/search/common/search.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatContextPickService, picksWithPromiseFn } from '../../chat/browser/chatContextPickService.js';
import { SearchContext } from '../common/constants.js';
import { SearchView } from './searchView.js';
import { basename, dirname, joinPath, relativePath } from '../../../../base/common/resources.js';
import { compare } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind, FileType, IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import * as glob from '../../../../base/common/glob.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
let SearchChatContextContribution = class SearchChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contributions.searchChatContextContribution'; }
    constructor(instantiationService, chatContextPickService) {
        super();
        this._store.add(chatContextPickService.registerChatContextItem(instantiationService.createInstance(SearchViewResultChatContextPick)));
        this._store.add(chatContextPickService.registerChatContextItem(instantiationService.createInstance(FilesAndFoldersPickerPick)));
        this._store.add(chatContextPickService.registerChatContextItem(this._store.add(instantiationService.createInstance(SymbolsContextPickerPick))));
    }
};
SearchChatContextContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], SearchChatContextContribution);
export { SearchChatContextContribution };
let SearchViewResultChatContextPick = class SearchViewResultChatContextPick {
    constructor(_contextKeyService, _viewsService, _labelService) {
        this._contextKeyService = _contextKeyService;
        this._viewsService = _viewsService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize('chatContext.searchResults', 'Search Results');
        this.icon = Codicon.search;
        this.ordinal = 500;
    }
    isEnabled() {
        return !!SearchContext.HasSearchResults.getValue(this._contextKeyService);
    }
    async asAttachment() {
        const searchView = this._viewsService.getViewWithId(VIEW_ID);
        if (!(searchView instanceof SearchView)) {
            return [];
        }
        return searchView.model.searchResult.matches().map(result => ({
            kind: 'file',
            id: result.resource.toString(),
            value: result.resource,
            name: this._labelService.getUriBasenameLabel(result.resource),
        }));
    }
};
SearchViewResultChatContextPick = __decorate([
    __param(0, IContextKeyService),
    __param(1, IViewsService),
    __param(2, ILabelService)
], SearchViewResultChatContextPick);
let SymbolsContextPickerPick = class SymbolsContextPickerPick {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.type = 'pickerPick';
        this.label = localize('symbols', 'Symbols...');
        this.icon = Codicon.symbolField;
        this.ordinal = -200;
    }
    dispose() {
        this._provider?.dispose();
    }
    asPicker() {
        return {
            placeholder: localize('select.symb', "Select a symbol"),
            picks: picksWithPromiseFn((query, token) => {
                this._provider ??= this._instantiationService.createInstance(SymbolsQuickAccessProvider);
                return this._provider.getSymbolPicks(query, undefined, token).then(symbolItems => {
                    const result = [];
                    for (const item of symbolItems) {
                        if (!item.symbol) {
                            continue;
                        }
                        const attachment = {
                            kind: 'symbol',
                            id: JSON.stringify(item.symbol.location),
                            value: item.symbol.location,
                            symbolKind: item.symbol.kind,
                            icon: SymbolKinds.toIcon(item.symbol.kind),
                            fullName: item.label,
                            name: item.symbol.name,
                        };
                        result.push({
                            label: item.symbol.name,
                            iconClass: ThemeIcon.asClassName(SymbolKinds.toIcon(item.symbol.kind)),
                            asAttachment() {
                                return attachment;
                            }
                        });
                    }
                    return result;
                });
            }),
        };
    }
};
SymbolsContextPickerPick = __decorate([
    __param(0, IInstantiationService)
], SymbolsContextPickerPick);
let FilesAndFoldersPickerPick = class FilesAndFoldersPickerPick {
    constructor(_searchService, _labelService, _modelService, _languageService, _configurationService, _workspaceService, _fileService, _historyService) {
        this._searchService = _searchService;
        this._labelService = _labelService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._historyService = _historyService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.folder', 'Files & Folders...');
        this.icon = Codicon.folder;
        this.ordinal = 600;
    }
    asPicker() {
        return {
            placeholder: localize('chatContext.attach.files.placeholder', "Search file or folder by name"),
            picks: picksWithPromiseFn(async (value, token) => {
                const workspaces = this._workspaceService.getWorkspace().folders.map(folder => folder.uri);
                const defaultItems = [];
                (await getTopLevelFolders(workspaces, this._fileService)).forEach(uri => defaultItems.push(this._createPickItem(uri, FileKind.FOLDER)));
                this._historyService.getHistory().filter(a => a.resource).slice(0, 30).forEach(uri => defaultItems.push(this._createPickItem(uri.resource, FileKind.FILE)));
                if (value === '') {
                    return defaultItems;
                }
                const result = [];
                await Promise.all(workspaces.map(async (workspace) => {
                    const { folders, files } = await searchFilesAndFolders(workspace, value, true, token, undefined, this._configurationService, this._searchService);
                    for (const folder of folders) {
                        result.push(this._createPickItem(folder, FileKind.FOLDER));
                    }
                    for (const file of files) {
                        result.push(this._createPickItem(file, FileKind.FILE));
                    }
                }));
                result.sort((a, b) => compare(a.label, b.label));
                return result;
            }),
        };
    }
    _createPickItem(resource, kind) {
        return {
            label: basename(resource),
            description: this._labelService.getUriLabel(dirname(resource), { relative: true }),
            iconClass: kind === FileKind.FILE
                ? getIconClasses(this._modelService, this._languageService, resource, FileKind.FILE).join(' ')
                : ThemeIcon.asClassName(Codicon.folder),
            asAttachment: () => {
                return {
                    kind: kind === FileKind.FILE ? 'file' : 'directory',
                    id: resource.toString(),
                    value: resource,
                    name: basename(resource),
                };
            }
        };
    }
};
FilesAndFoldersPickerPick = __decorate([
    __param(0, ISearchService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService),
    __param(7, IHistoryService)
], FilesAndFoldersPickerPick);
export async function searchFilesAndFolders(workspace, pattern, fuzzyMatch, token, cacheKey, configurationService, searchService) {
    const segmentMatchPattern = caseInsensitiveGlobPattern(fuzzyMatch ? fuzzyMatchingGlobPattern(pattern) : continousMatchingGlobPattern(pattern));
    const searchExcludePattern = getExcludes(configurationService.getValue({ resource: workspace })) || {};
    const searchOptions = {
        folderQueries: [{
                folder: workspace,
                disregardIgnoreFiles: configurationService.getValue('explorer.excludeGitIgnore'),
            }],
        type: 1 /* QueryType.File */,
        shouldGlobMatchFilePattern: true,
        cacheKey,
        excludePattern: searchExcludePattern,
        sortByScore: true,
    };
    let searchResult;
    try {
        searchResult = await searchService.fileSearch({ ...searchOptions, filePattern: `{**/${segmentMatchPattern}/**,${pattern}}` }, token);
    }
    catch (e) {
        if (!isCancellationError(e)) {
            throw e;
        }
    }
    if (!searchResult || token?.isCancellationRequested) {
        return { files: [], folders: [] };
    }
    const fileResources = searchResult.results.map(result => result.resource);
    const folderResources = getMatchingFoldersFromFiles(fileResources, workspace, segmentMatchPattern);
    return { folders: folderResources, files: fileResources };
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
// TODO: remove this and have support from the search service
function getMatchingFoldersFromFiles(resources, workspace, segmentMatchPattern) {
    const uniqueFolders = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(workspace, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the workspace');
        }
        let dirResource = workspace;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueFolders.add(dirResource);
        }
    }
    const matchingFolders = [];
    for (const folderResource of uniqueFolders) {
        const stats = folderResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingFolders.push(folderResource);
    }
    return matchingFolders;
}
export async function getTopLevelFolders(workspaces, fileService) {
    const folders = [];
    for (const workspace of workspaces) {
        const fileSystemProvider = fileService.getProvider(workspace.scheme);
        if (!fileSystemProvider) {
            continue;
        }
        const entries = await fileSystemProvider.readdir(workspace);
        for (const [name, type] of entries) {
            const entryResource = joinPath(workspace, name);
            if (type === FileType.Directory) {
                folders.push(entryResource);
            }
        }
    }
    return folders;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL2NoYXRDb250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFdBQVcsRUFBcUQsY0FBYyxFQUFhLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9KLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQXNELHVCQUF1QixFQUF5QixrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXRMLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxv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