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
var FilesRenderer_1, FileDragAndDrop_1;
import * as DOM from '../../../../../base/browser/dom.js';
import * as glob from '../../../../../base/common/glob.js';
import { IProgressService, } from '../../../../../platform/progress/common/progress.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IFileService, FileKind } from '../../../../../platform/files/common/files.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Disposable, dispose, toDisposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IContextMenuService, IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ExplorerFindProviderActive } from '../../common/files.js';
import { dirname, joinPath, distinctParents, relativePath } from '../../../../../base/common/resources.js';
import { InputBox } from '../../../../../base/browser/ui/inputbox/inputBox.js';
import { localize } from '../../../../../nls.js';
import { createSingleCallFunction } from '../../../../../base/common/functional.js';
import { equals, deepClone } from '../../../../../base/common/objects.js';
import * as path from '../../../../../base/common/path.js';
import { ExplorerItem, NewExplorerItem } from '../../common/explorerModel.js';
import { compareFileExtensionsDefault, compareFileNamesDefault, compareFileNamesUpper, compareFileExtensionsUpper, compareFileNamesLower, compareFileExtensionsLower, compareFileNamesUnicode, compareFileExtensionsUnicode } from '../../../../../base/common/comparers.js';
import { CodeDataTransfers, containsDragType } from '../../../../../platform/dnd/browser/dnd.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { Schemas } from '../../../../../base/common/network.js';
import { NativeDragAndDropData, ExternalElementsDragAndDropData } from '../../../../../base/browser/ui/list/listView.js';
import { isMacintosh, isWeb } from '../../../../../base/common/platform.js';
import { IDialogService, getFileNamesMessage } from '../../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceEditingService } from '../../../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { findValidPasteFileTarget } from '../fileActions.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { Emitter, Event, EventMultiplexer } from '../../../../../base/common/event.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { isNumber } from '../../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from '../files.js';
import { BrowserFileUpload, ExternalFileImport, getMultipleFilesOverwriteConfirm } from '../fileImportExport.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { WebFileSystemAccess } from '../../../../../platform/files/browser/webFileSystemAccess.js';
import { IgnoreFile } from '../../../../services/search/common/ignoreFile.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { defaultCountBadgeStyles, defaultInputBoxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { timeout } from '../../../../../base/common/async.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { explorerFileContribRegistry } from '../explorerFileContrib.js';
import { ISearchService, getExcludes } from '../../../../services/search/common/search.js';
import { TreeFindMatchType, TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CountBadge } from '../../../../../base/browser/ui/countBadge/countBadge.js';
import { listFilterMatchHighlight, listFilterMatchHighlightBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../platform/theme/common/colorUtils.js';
export class ExplorerDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return ExplorerDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return FilesRenderer.ID;
    }
}
export const explorerRootErrorEmitter = new Emitter();
let ExplorerDataSource = class ExplorerDataSource {
    constructor(fileFilter, findProvider, progressService, configService, notificationService, layoutService, fileService, explorerService, contextService, filesConfigService) {
        this.fileFilter = fileFilter;
        this.findProvider = findProvider;
        this.progressService = progressService;
        this.configService = configService;
        this.notificationService = notificationService;
        this.layoutService = layoutService;
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.contextService = contextService;
        this.filesConfigService = filesConfigService;
    }
    getParent(element) {
        if (element.parent) {
            return element.parent;
        }
        throw new Error('getParent only supported for cached parents');
    }
    hasChildren(element) {
        // don't render nest parents as containing children when all the children are filtered out
        return Array.isArray(element) || element.hasChildren((stat) => this.fileFilter.filter(stat, 1 /* TreeVisibility.Visible */));
    }
    getChildren(element) {
        if (Array.isArray(element)) {
            return element;
        }
        if (this.findProvider.isShowingFilterResults()) {
            return Array.from(element.children.values());
        }
        const hasError = element.error;
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const children = element.fetchChildren(sortOrder);
        if (Array.isArray(children)) {
            // fast path when children are known sync (i.e. nested children)
            return children;
        }
        const promise = children.then(children => {
            // Clear previous error decoration on root folder
            if (element instanceof ExplorerItem && element.isRoot && !element.error && hasError && this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */) {
                explorerRootErrorEmitter.fire(element.resource);
            }
            return children;
        }, e => {
            if (element instanceof ExplorerItem && element.isRoot) {
                if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                    // Single folder create a dummy explorer item to show error
                    const placeholder = new ExplorerItem(element.resource, this.fileService, this.configService, this.filesConfigService, undefined, undefined, false);
                    placeholder.error = e;
                    return [placeholder];
                }
                else {
                    explorerRootErrorEmitter.fire(element.resource);
                }
            }
            else {
                // Do not show error for roots since we already use an explorer decoration to notify user
                this.notificationService.error(e);
            }
            return []; // we could not resolve any children because of an error
        });
        this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: this.layoutService.isRestored() ? 800 : 1500 // reduce progress visibility when still restoring
        }, _progress => promise);
        return promise;
    }
};
ExplorerDataSource = __decorate([
    __param(2, IProgressService),
    __param(3, IConfigurationService),
    __param(4, INotificationService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IFileService),
    __param(7, IExplorerService),
    __param(8, IWorkspaceContextService),
    __param(9, IFilesConfigurationService)
], ExplorerDataSource);
export { ExplorerDataSource };
export class PhantomExplorerItem extends ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory) {
        super(resource, fileService, configService, filesConfigService, _parent, _isDirectory);
    }
}
class ExplorerFindHighlightTree {
    constructor() {
        this._tree = new Map();
        this._highlightedItems = new Map();
    }
    get highlightedItems() {
        return Array.from(this._highlightedItems.values());
    }
    get(item) {
        const result = this.find(item);
        if (result === undefined) {
            return 0;
        }
        const { treeLayer, relPath } = result;
        this._highlightedItems.set(relPath, item);
        return treeLayer.childMatches;
    }
    find(item) {
        const rootLayer = this._tree.get(item.root.name);
        if (rootLayer === undefined) {
            return undefined;
        }
        const relPath = relativePath(item.root.resource, item.resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        if (relPath === '') {
            return { treeLayer: rootLayer, relPath };
        }
        let treeLayer = rootLayer;
        for (const segment of relPath.split('/')) {
            if (!treeLayer.stats[segment]) {
                return undefined;
            }
            treeLayer = treeLayer.stats[segment];
        }
        return { treeLayer, relPath };
    }
    add(resource, root) {
        const relPath = relativePath(root.resource, resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        let rootLayer = this._tree.get(root.name);
        if (!rootLayer) {
            rootLayer = { childMatches: 0, stats: {}, isMatch: false };
            this._tree.set(root.name, rootLayer);
        }
        rootLayer.childMatches++;
        let treeLayer = rootLayer;
        for (const stat of relPath.split('/')) {
            if (!treeLayer.stats[stat]) {
                treeLayer.stats[stat] = { childMatches: 0, stats: {}, isMatch: false };
            }
            treeLayer = treeLayer.stats[stat];
            treeLayer.childMatches++;
        }
        treeLayer.childMatches--; // the last segment is the file itself
        treeLayer.isMatch = true;
    }
    isMatch(item) {
        const result = this.find(item);
        if (result === undefined) {
            return false;
        }
        const { treeLayer } = result;
        return treeLayer.isMatch;
    }
    clear() {
        this._tree.clear();
    }
}
let ExplorerFindProvider = class ExplorerFindProvider {
    get highlightTree() {
        return this.findHighlightTree;
    }
    constructor(filesFilter, treeProvider, searchService, fileService, configurationService, filesConfigService, progressService, explorerService, contextKeyService) {
        this.filesFilter = filesFilter;
        this.treeProvider = treeProvider;
        this.searchService = searchService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.filesConfigService = filesConfigService;
        this.progressService = progressService;
        this.explorerService = explorerService;
        this.sessionId = 0;
        this.phantomParents = new Set();
        this.findHighlightTree = new ExplorerFindHighlightTree();
        this.explorerFindActiveContextKey = ExplorerFindProviderActive.bindTo(contextKeyService);
    }
    isShowingFilterResults() {
        return !!this.filterSessionStartState;
    }
    isVisible(element) {
        if (!this.filterSessionStartState) {
            return true;
        }
        if (this.explorerService.isEditable(element)) {
            return true;
        }
        return this.filterSessionStartState.rootsWithProviders.has(element.root) ? element.isMarkedAsFiltered() : true;
    }
    startSession() {
        this.sessionId++;
    }
    async endSession() {
        // Restore view state
        if (this.filterSessionStartState) {
            await this.endFilterSession();
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
    }
    async find(pattern, toggles, token) {
        const promise = this.doFind(pattern, toggles, token);
        return await this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: 750,
        }, _progress => promise);
    }
    async doFind(pattern, toggles, token) {
        if (toggles.findMode === TreeFindMode.Highlight) {
            if (this.filterSessionStartState) {
                await this.endFilterSession();
            }
            if (!this.highlightSessionStartState) {
                this.startHighlightSession();
            }
            return await this.doHighlightFind(pattern, toggles.matchType, token);
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
        if (!this.filterSessionStartState) {
            this.startFilterSession();
        }
        return await this.doFilterFind(pattern, toggles.matchType, token);
    }
    // Filter
    startFilterSession() {
        const tree = this.treeProvider();
        const input = tree.getInput();
        if (!input) {
            return;
        }
        const roots = this.explorerService.roots.filter(root => this.searchSupportsScheme(root.resource.scheme));
        this.filterSessionStartState = { viewState: tree.getViewState(), input, rootsWithProviders: new Set(roots) };
        this.explorerFindActiveContextKey.set(true);
    }
    async doFilterFind(pattern, matchType, token) {
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state');
        }
        const roots = Array.from(this.filterSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearPhantomElements();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceFilterResults(explorerRoot, files, directories);
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input);
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => item.isMarkedAsFiltered(),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults ? localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") : undefined
        };
    }
    addWorkspaceFilterResults(root, files, directories) {
        const results = [
            ...files.map(file => ({ resource: file, isDirectory: false })),
            ...directories.map(directory => ({ resource: directory, isDirectory: true }))
        ];
        for (const { resource, isDirectory } of results) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                element.markItemAndParentsAsFiltered();
                continue;
            }
            // File is not in the model, create phantom items for the file and it's parents
            const phantomElements = this.createPhantomItems(resource, root, isDirectory);
            if (phantomElements.length === 0) {
                throw new Error('Phantom item was not created even though it is not in the model');
            }
            // Store the first ancestor of the file which is already present in the model
            const firstPhantomParent = phantomElements[0].parent;
            if (!(firstPhantomParent instanceof PhantomExplorerItem)) {
                this.phantomParents.add(firstPhantomParent);
            }
            const phantomFileElement = phantomElements[phantomElements.length - 1];
            phantomFileElement.markItemAndParentsAsFiltered();
        }
    }
    createPhantomItems(resource, root, resourceIsDirectory) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        const phantomElements = [];
        let currentItem = root;
        let currentResource = root.resource;
        const pathSegments = relativePathToRoot.split('/');
        for (const stat of pathSegments) {
            currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
            let child = currentItem.getChild(stat);
            if (!child) {
                const isDirectory = pathSegments[pathSegments.length - 1] === stat ? resourceIsDirectory : true;
                child = new PhantomExplorerItem(currentResource, this.fileService, this.configurationService, this.filesConfigService, currentItem, isDirectory);
                currentItem.addChild(child);
                phantomElements.push(child);
            }
            currentItem = child;
        }
        return phantomElements;
    }
    async endFilterSession() {
        this.clearPhantomElements();
        this.explorerFindActiveContextKey.set(false);
        // Restore view state
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state to restore');
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input, this.filterSessionStartState.viewState);
        this.filterSessionStartState = undefined;
        this.explorerService.refresh();
    }
    clearPhantomElements() {
        for (const phantomParent of this.phantomParents) {
            // Clear phantom nodes from model
            phantomParent.forgetChildren();
        }
        this.phantomParents.clear();
        this.explorerService.roots.forEach(root => root.unmarkItemAndChildren());
    }
    // Highlight
    startHighlightSession() {
        const roots = this.explorerService.roots.filter(root => this.searchSupportsScheme(root.resource.scheme));
        this.highlightSessionStartState = { rootsWithProviders: new Set(roots) };
    }
    async doHighlightFind(pattern, matchType, token) {
        if (!this.highlightSessionStartState) {
            throw new Error('ExplorerFindProvider: no highlight session state');
        }
        const roots = Array.from(this.highlightSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearHighlights();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceHighlightResults(explorerRoot, files.concat(directories));
        }
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => this.findHighlightTree.isMatch(item) || (this.findHighlightTree.get(item) > 0 && this.treeProvider().isCollapsed(item)),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults ? localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") : undefined
        };
    }
    addWorkspaceHighlightResults(root, resources) {
        const highlightedDirectories = new Set();
        const storeDirectories = (item) => {
            while (item) {
                highlightedDirectories.add(item);
                item = item.parent;
            }
        };
        for (const resource of resources) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                this.findHighlightTree.add(resource, root);
                storeDirectories(element.parent);
                continue;
            }
            const firstParent = findFirstParent(resource, root);
            if (firstParent) {
                this.findHighlightTree.add(resource, root);
                storeDirectories(firstParent.parent);
            }
        }
        const tree = this.treeProvider();
        for (const directory of highlightedDirectories) {
            if (tree.hasNode(directory)) {
                tree.rerender(directory);
            }
        }
    }
    endHighlightSession() {
        this.highlightSessionStartState = undefined;
        this.clearHighlights();
    }
    clearHighlights() {
        const tree = this.treeProvider();
        for (const item of this.findHighlightTree.highlightedItems) {
            if (tree.hasNode(item)) {
                tree.rerender(item);
            }
        }
        this.findHighlightTree.clear();
    }
    // Search
    searchSupportsScheme(scheme) {
        // Limited by the search API
        if (scheme !== Schemas.file && scheme !== Schemas.vscodeRemote) {
            return false;
        }
        return this.searchService.schemeHasFileSearchProvider(scheme);
    }
    async getSearchResults(pattern, roots, matchType, token) {
        const patternLowercase = pattern.toLowerCase();
        const isFuzzyMatch = matchType === TreeFindMatchType.Fuzzy;
        return await Promise.all(roots.map((root, index) => this.searchInWorkspace(patternLowercase, root, index, isFuzzyMatch, token)));
    }
    async searchInWorkspace(patternLowercase, root, rootIndex, isFuzzyMatch, token) {
        const segmentMatchPattern = caseInsensitiveGlobPattern(isFuzzyMatch ? fuzzyMatchingGlobPattern(patternLowercase) : continousMatchingGlobPattern(patternLowercase));
        const searchExcludePattern = getExcludes(this.configurationService.getValue({ resource: root.resource })) || {};
        const searchOptions = {
            folderQueries: [{
                    folder: root.resource,
                    disregardIgnoreFiles: !this.configurationService.getValue('explorer.excludeGitIgnore'),
                }],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            cacheKey: `explorerfindprovider:${root.name}:${rootIndex}:${this.sessionId}`,
            excludePattern: searchExcludePattern,
        };
        let fileResults;
        let folderResults;
        try {
            [fileResults, folderResults] = await Promise.all([
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}`, maxResults: 512 }, token),
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}/**` }, token)
            ]);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        if (!fileResults || !folderResults || token.isCancellationRequested) {
            return { explorerRoot: root, files: [], directories: [], hitMaxResults: false };
        }
        const fileResultResources = fileResults.results.map(result => result.resource);
        const directoryResources = getMatchingDirectoriesFromFiles(folderResults.results.map(result => result.resource), root, segmentMatchPattern);
        const filteredFileResources = fileResultResources.filter(resource => !this.filesFilter.isIgnored(resource, root.resource, false));
        const filteredDirectoryResources = directoryResources.filter(resource => !this.filesFilter.isIgnored(resource, root.resource, true));
        return { explorerRoot: root, files: filteredFileResources, directories: filteredDirectoryResources, hitMaxResults: !!fileResults.limitHit || !!folderResults.limitHit };
    }
};
ExplorerFindProvider = __decorate([
    __param(2, ISearchService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IFilesConfigurationService),
    __param(6, IProgressService),
    __param(7, IExplorerService),
    __param(8, IContextKeyService)
], ExplorerFindProvider);
export { ExplorerFindProvider };
function getMatchingDirectoriesFromFiles(resources, root, segmentMatchPattern) {
    const uniqueDirectories = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        let dirResource = root.resource;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueDirectories.add(dirResource);
        }
    }
    const matchingDirectories = [];
    for (const dirResource of uniqueDirectories) {
        const stats = dirResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingDirectories.push(dirResource);
    }
    return matchingDirectories;
}
function findFirstParent(resource, root) {
    const relativePathToRoot = relativePath(root.resource, resource);
    if (!relativePathToRoot) {
        throw new Error('Resource is not a child of the root');
    }
    let currentItem = root;
    let currentResource = root.resource;
    const pathSegments = relativePathToRoot.split('/');
    for (const stat of pathSegments) {
        currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
        const child = currentItem.getChild(stat);
        if (!child) {
            return currentItem;
        }
        currentItem = child;
    }
    return undefined;
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
export class CompressedNavigationController {
    static { this.ID = 0; }
    get index() { return this._index; }
    get count() { return this.items.length; }
    get current() { return this.items[this._index]; }
    get currentId() { return `${this.id}_${this.index}`; }
    get labels() { return this._labels; }
    constructor(id, items, templateData, depth, collapsed) {
        this.id = id;
        this.items = items;
        this.depth = depth;
        this.collapsed = collapsed;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._index = items.length - 1;
        this.updateLabels(templateData);
        this._updateLabelDisposable = templateData.label.onDidRender(() => this.updateLabels(templateData));
    }
    updateLabels(templateData) {
        this._labels = Array.from(templateData.container.querySelectorAll('.label-name'));
        let parents = '';
        for (let i = 0; i < this.labels.length; i++) {
            const ariaLabel = parents.length ? `${this.items[i].name}, compact, ${parents}` : this.items[i].name;
            this.labels[i].setAttribute('aria-label', ariaLabel);
            this.labels[i].setAttribute('aria-level', `${this.depth + i}`);
            parents = parents.length ? `${this.items[i].name} ${parents}` : this.items[i].name;
        }
        this.updateCollapsed(this.collapsed);
        if (this._index < this.labels.length) {
            this.labels[this._index].classList.add('active');
        }
    }
    previous() {
        if (this._index <= 0) {
            return;
        }
        this.setIndex(this._index - 1);
    }
    next() {
        if (this._index >= this.items.length - 1) {
            return;
        }
        this.setIndex(this._index + 1);
    }
    first() {
        if (this._index === 0) {
            return;
        }
        this.setIndex(0);
    }
    last() {
        if (this._index === this.items.length - 1) {
            return;
        }
        this.setIndex(this.items.length - 1);
    }
    setIndex(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        this.labels[this._index].classList.remove('active');
        this._index = index;
        this.labels[this._index].classList.add('active');
        this._onDidChange.fire();
    }
    updateCollapsed(collapsed) {
        this.collapsed = collapsed;
        for (let i = 0; i < this.labels.length; i++) {
            this.labels[i].setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateLabelDisposable.dispose();
    }
}
let FilesRenderer = class FilesRenderer {
    static { FilesRenderer_1 = this; }
    static { this.ID = 'file'; }
    constructor(container, labels, highlightTree, updateWidth, contextViewService, themeService, configurationService, explorerService, labelService, contextService, contextMenuService, instantiationService) {
        this.labels = labels;
        this.highlightTree = highlightTree;
        this.updateWidth = updateWidth;
        this.contextViewService = contextViewService;
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.labelService = labelService;
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.compressedNavigationControllers = new Map();
        this._onDidChangeActiveDescendant = new EventMultiplexer();
        this.onDidChangeActiveDescendant = this._onDidChangeActiveDescendant.event;
        this.config = this.configurationService.getValue();
        const updateOffsetStyles = () => {
            const indent = this.configurationService.getValue('workbench.tree.indent');
            const offset = Math.max(22 - indent, 0); // derived via inspection
            container.style.setProperty(`--vscode-explorer-align-offset-margin-left`, `${offset}px`);
        };
        this.configListener = this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('explorer')) {
                this.config = this.configurationService.getValue();
            }
            if (e.affectsConfiguration('workbench.tree.indent')) {
                updateOffsetStyles();
            }
        });
        updateOffsetStyles();
    }
    getWidgetAriaLabel() {
        return localize('treeAriaLabel', "Files Explorer");
    }
    get templateId() {
        return FilesRenderer_1.ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true }));
        templateDisposables.add(label.onDidRender(() => {
            try {
                if (templateData.currentContext) {
                    this.updateWidth(templateData.currentContext);
                }
            }
            catch (e) {
                // noop since the element might no longer be in the tree, no update of width necessary
            }
        }));
        const contribs = explorerFileContribRegistry.create(this.instantiationService, container, templateDisposables);
        templateDisposables.add(explorerFileContribRegistry.onDidRegisterDescriptor(d => {
            const contr = d.create(this.instantiationService, container);
            contribs.push(templateDisposables.add(contr));
            contr.setResource(templateData.currentContext?.resource);
        }));
        const templateData = { templateDisposables, elementDisposables: templateDisposables.add(new DisposableStore()), label, container, contribs };
        return templateData;
    }
    renderElement(node, index, templateData) {
        const stat = node.element;
        templateData.currentContext = stat;
        const editableData = this.explorerService.getEditableData(stat);
        templateData.label.element.classList.remove('compressed');
        // File Label
        if (!editableData) {
            templateData.label.element.style.display = 'flex';
            this.renderStat(stat, stat.name, undefined, node.filterData, templateData);
        }
        // Input Box
        else {
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach(c => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, stat, editableData));
        }
    }
    renderCompressedElements(node, index, templateData) {
        const stat = node.element.elements[node.element.elements.length - 1];
        templateData.currentContext = stat;
        const editable = node.element.elements.filter(e => this.explorerService.isEditable(e));
        const editableData = editable.length === 0 ? undefined : this.explorerService.getEditableData(editable[0]);
        // File Label
        if (!editableData) {
            templateData.label.element.classList.add('compressed');
            templateData.label.element.style.display = 'flex';
            const id = `compressed-explorer_${CompressedNavigationController.ID++}`;
            const labels = node.element.elements.map(e => e.name);
            // If there is a fuzzy score, we need to adjust the offset of the score
            // to align with the last stat of the compressed label
            let fuzzyScore = node.filterData;
            if (fuzzyScore && fuzzyScore.length > 2) {
                const filterDataOffset = labels.join('/').length - labels[labels.length - 1].length;
                fuzzyScore = [fuzzyScore[0], fuzzyScore[1] + filterDataOffset, ...fuzzyScore.slice(2)];
            }
            this.renderStat(stat, labels, id, fuzzyScore, templateData);
            const compressedNavigationController = new CompressedNavigationController(id, node.element.elements, templateData, node.depth, node.collapsed);
            templateData.elementDisposables.add(compressedNavigationController);
            const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
            this.compressedNavigationControllers.set(stat, [...nodeControllers, compressedNavigationController]);
            // accessibility
            templateData.elementDisposables.add(this._onDidChangeActiveDescendant.add(compressedNavigationController.onDidChange));
            templateData.elementDisposables.add(DOM.addDisposableListener(templateData.container, 'mousedown', e => {
                const result = getIconLabelNameFromHTMLElement(e.target);
                if (result) {
                    compressedNavigationController.setIndex(result.index);
                }
            }));
            templateData.elementDisposables.add(toDisposable(() => {
                const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
                const renderedIndex = nodeControllers.findIndex(controller => controller === compressedNavigationController);
                if (renderedIndex < 0) {
                    throw new Error('Disposing unknown navigation controller');
                }
                if (nodeControllers.length === 1) {
                    this.compressedNavigationControllers.delete(stat);
                }
                else {
                    nodeControllers.splice(renderedIndex, 1);
                }
            }));
        }
        // Input Box
        else {
            templateData.label.element.classList.remove('compressed');
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach(c => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, editable[0], editableData));
        }
    }
    renderStat(stat, label, domId, filterData, templateData) {
        templateData.label.element.style.display = 'flex';
        const extraClasses = ['explorer-item'];
        if (this.explorerService.isCut(stat)) {
            extraClasses.push('cut');
        }
        // Offset nested children unless folders have both chevrons and icons, otherwise alignment breaks
        const theme = this.themeService.getFileIconTheme();
        // Hack to always render chevrons for file nests, or else may not be able to identify them.
        const twistieContainer = templateData.container.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.toggle('force-twistie', stat.hasNests && theme.hidesExplorerArrows);
        // when explorer arrows are hidden or there are no folder icons, nests get misaligned as they are forced to have arrows and files typically have icons
        // Apply some CSS magic to get things looking as reasonable as possible.
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        templateData.contribs.forEach(c => c.setResource(stat.resource));
        templateData.label.setResource({ resource: stat.resource, name: label }, {
            fileKind: stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE,
            extraClasses: realignNestedChildren ? [...extraClasses, 'align-nest-icon-with-parent-icon'] : extraClasses,
            fileDecorations: this.config.explorer.decorations,
            matches: createMatches(filterData),
            separator: this.labelService.getSeparator(stat.resource.scheme, stat.resource.authority),
            domId
        });
        const highlightResults = stat.isDirectory ? this.highlightTree.get(stat) : 0;
        if (highlightResults > 0) {
            const badge = new CountBadge(templateData.label.element.lastElementChild, {}, { ...defaultCountBadgeStyles, badgeBackground: asCssVariable(listFilterMatchHighlight), badgeBorder: asCssVariable(listFilterMatchHighlightBorder) });
            badge.setCount(highlightResults);
            badge.setTitleFormat(localize('explorerHighlightFolderBadgeTitle', "Directory contains {0} matches", highlightResults));
            templateData.elementDisposables.add(badge);
        }
        templateData.label.element.classList.toggle('highlight-badge', highlightResults > 0);
    }
    renderInputBox(container, stat, editableData) {
        // Use a file label only for the icon next to the input box
        const label = this.labels.create(container);
        const extraClasses = ['explorer-item', 'explorer-item-edited'];
        const fileKind = stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE;
        const theme = this.themeService.getFileIconTheme();
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        const labelOptions = {
            hidePath: true,
            hideLabel: true,
            fileKind,
            extraClasses: realignNestedChildren ? [...extraClasses, 'align-nest-icon-with-parent-icon'] : extraClasses,
        };
        const parent = stat.name ? dirname(stat.resource) : stat.resource;
        const value = stat.name || '';
        label.setFile(joinPath(parent, value || ' '), labelOptions); // Use icon for ' ' if name is empty.
        // hack: hide label
        label.element.firstElementChild.style.display = 'none';
        // Input field for name
        const inputBox = new InputBox(label.element, this.contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */
                    };
                }
            },
            ariaLabel: localize('fileInputAriaLabel', "Type file name. Press Enter to confirm or Escape to cancel."),
            inputBoxStyles: defaultInputBoxStyles,
        });
        const lastDot = value.lastIndexOf('.');
        let currentSelectionState = 'prefix';
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: lastDot > 0 && !stat.isDirectory ? lastDot : value.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            label.element.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            label.element.remove();
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info ? 1 /* MessageType.INFO */ : message.severity === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const toDispose = [
            inputBox,
            inputBox.onDidChange(value => {
                label.setFile(joinPath(parent, value || ' '), labelOptions); // update label icon while typing!
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                if (e.equals(60 /* KeyCode.F2 */)) {
                    const dotIndex = inputBox.value.lastIndexOf('.');
                    if (stat.isDirectory || dotIndex === -1) {
                        return;
                    }
                    if (currentSelectionState === 'prefix') {
                        currentSelectionState = 'all';
                        inputBox.select({ start: 0, end: inputBox.value.length });
                    }
                    else if (currentSelectionState === 'all') {
                        currentSelectionState = 'suffix';
                        inputBox.select({ start: dotIndex + 1, end: inputBox.value.length });
                    }
                    else {
                        currentSelectionState = 'prefix';
                        inputBox.select({ start: 0, end: dotIndex });
                    }
                }
                else if (e.equals(3 /* KeyCode.Enter */)) {
                    if (!inputBox.validate()) {
                        done(true, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e) => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, async () => {
                while (true) {
                    await timeout(0);
                    const ownerDocument = inputBox.inputElement.ownerDocument;
                    if (!ownerDocument.hasFocus()) {
                        break;
                    }
                    if (DOM.isActiveElement(inputBox.inputElement)) {
                        return;
                    }
                    else if (DOM.isHTMLElement(ownerDocument.activeElement) && DOM.hasParentWithClass(ownerDocument.activeElement, 'context-view')) {
                        await Event.toPromise(this.contextMenuService.onDidHideContextMenu);
                    }
                    else {
                        break;
                    }
                }
                done(inputBox.isInputValid(), true);
            }),
            label
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(element, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    getCompressedNavigationController(stat) {
        return this.compressedNavigationControllers.get(stat);
    }
    // IAccessibilityProvider
    getAriaLabel(element) {
        return element.name;
    }
    getAriaLevel(element) {
        // We need to comput aria level on our own since children of compact folders will otherwise have an incorrect level	#107235
        let depth = 0;
        let parent = element.parent;
        while (parent) {
            parent = parent.parent;
            depth++;
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            depth = depth + 1;
        }
        return depth;
    }
    getActiveDescendantId(stat) {
        return this.compressedNavigationControllers.get(stat)?.[0]?.currentId ?? undefined;
    }
    dispose() {
        this.configListener.dispose();
    }
};
FilesRenderer = FilesRenderer_1 = __decorate([
    __param(4, IContextViewService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IExplorerService),
    __param(8, ILabelService),
    __param(9, IWorkspaceContextService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService)
], FilesRenderer);
export { FilesRenderer };
/**
 * Respects files.exclude setting in filtering out content from the explorer.
 * Makes sure that visible editors are always shown in the explorer even if they are filtered out by settings.
 */
let FilesFilter = class FilesFilter {
    constructor(contextService, configurationService, explorerService, editorService, uriIdentityService, fileService) {
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.hiddenExpressionPerRoot = new Map();
        this.editorsAffectingFilter = new Set();
        this._onDidChange = new Emitter();
        this.toDispose = [];
        // List of ignoreFile resources. Used to detect changes to the ignoreFiles.
        this.ignoreFileResourcesPerRoot = new Map();
        // Ignore tree per root. Similar to `hiddenExpressionPerRoot`
        // Note: URI in the ternary search tree is the URI of the folder containing the ignore file
        // It is not the ignore file itself. This is because of the way the IgnoreFile works and nested paths
        this.ignoreTreesPerRoot = new Map();
        this.toDispose.push(this.contextService.onDidChangeWorkspaceFolders(() => this.updateConfiguration()));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('files.exclude') || e.affectsConfiguration('explorer.excludeGitIgnore')) {
                this.updateConfiguration();
            }
        }));
        this.toDispose.push(this.fileService.onDidFilesChange(e => {
            // Check to see if the update contains any of the ignoreFileResources
            for (const [root, ignoreFileResourceSet] of this.ignoreFileResourcesPerRoot.entries()) {
                ignoreFileResourceSet.forEach(async (ignoreResource) => {
                    if (e.contains(ignoreResource, 0 /* FileChangeType.UPDATED */)) {
                        await this.processIgnoreFile(root, ignoreResource, true);
                    }
                    if (e.contains(ignoreResource, 2 /* FileChangeType.DELETED */)) {
                        this.ignoreTreesPerRoot.get(root)?.delete(dirname(ignoreResource));
                        ignoreFileResourceSet.delete(ignoreResource);
                        this._onDidChange.fire();
                    }
                });
            }
        }));
        this.toDispose.push(this.editorService.onDidVisibleEditorsChange(() => {
            const editors = this.editorService.visibleEditors;
            let shouldFire = false;
            for (const e of editors) {
                if (!e.resource) {
                    continue;
                }
                const stat = this.explorerService.findClosest(e.resource);
                if (stat && stat.isExcluded) {
                    // A filtered resource suddenly became visible since user opened an editor
                    shouldFire = true;
                    break;
                }
            }
            for (const e of this.editorsAffectingFilter) {
                if (!editors.includes(e)) {
                    // Editor that was affecting filtering is no longer visible
                    shouldFire = true;
                    break;
                }
            }
            if (shouldFire) {
                this.editorsAffectingFilter.clear();
                this._onDidChange.fire();
            }
        }));
        this.updateConfiguration();
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    updateConfiguration() {
        let shouldFire = false;
        let updatedGitIgnoreSetting = false;
        this.contextService.getWorkspace().folders.forEach(folder => {
            const configuration = this.configurationService.getValue({ resource: folder.uri });
            const excludesConfig = configuration?.files?.exclude || Object.create(null);
            const parseIgnoreFile = configuration.explorer.excludeGitIgnore;
            // If we should be parsing ignoreFiles for this workspace and don't have an ignore tree initialize one
            if (parseIgnoreFile && !this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.set(folder.uri.toString(), new ResourceSet());
                this.ignoreTreesPerRoot.set(folder.uri.toString(), TernarySearchTree.forUris((uri) => this.uriIdentityService.extUri.ignorePathCasing(uri)));
            }
            // If we shouldn't be parsing ignore files but have an ignore tree, clear the ignore tree
            if (!parseIgnoreFile && this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.delete(folder.uri.toString());
                this.ignoreTreesPerRoot.delete(folder.uri.toString());
            }
            if (!shouldFire) {
                const cached = this.hiddenExpressionPerRoot.get(folder.uri.toString());
                shouldFire = !cached || !equals(cached.original, excludesConfig);
            }
            const excludesConfigCopy = deepClone(excludesConfig); // do not keep the config, as it gets mutated under our hoods
            this.hiddenExpressionPerRoot.set(folder.uri.toString(), { original: excludesConfigCopy, parsed: glob.parse(excludesConfigCopy) });
        });
        if (shouldFire || updatedGitIgnoreSetting) {
            this.editorsAffectingFilter.clear();
            this._onDidChange.fire();
        }
    }
    /**
     * Given a .gitignore file resource, processes the resource and adds it to the ignore tree which hides explorer items
     * @param root The root folder of the workspace as a string. Used for lookup key for ignore tree and resource list
     * @param ignoreFileResource The resource of the .gitignore file
     * @param update Whether or not we're updating an existing ignore file. If true it deletes the old entry
     */
    async processIgnoreFile(root, ignoreFileResource, update) {
        // Get the name of the directory which the ignore file is in
        const dirUri = dirname(ignoreFileResource);
        const ignoreTree = this.ignoreTreesPerRoot.get(root);
        if (!ignoreTree) {
            return;
        }
        // Don't process a directory if we already have it in the tree
        if (!update && ignoreTree.has(dirUri)) {
            return;
        }
        // Maybe we need a cancellation token here in case it's super long?
        const content = await this.fileService.readFile(ignoreFileResource);
        // If it's just an update we update the contents keeping all references the same
        if (update) {
            const ignoreFile = ignoreTree.get(dirUri);
            ignoreFile?.updateContents(content.value.toString());
        }
        else {
            // Otherwise we create a new ignorefile and add it to the tree
            const ignoreParent = ignoreTree.findSubstr(dirUri);
            const ignoreFile = new IgnoreFile(content.value.toString(), dirUri.path, ignoreParent);
            ignoreTree.set(dirUri, ignoreFile);
            // If we haven't seen this resource before then we need to add it to the list of resources we're tracking
            if (!this.ignoreFileResourcesPerRoot.get(root)?.has(ignoreFileResource)) {
                this.ignoreFileResourcesPerRoot.get(root)?.add(ignoreFileResource);
            }
        }
        // Notify the explorer of the change so we may ignore these files
        this._onDidChange.fire();
    }
    filter(stat, parentVisibility) {
        // Add newly visited .gitignore files to the ignore tree
        if (stat.name === '.gitignore' && this.ignoreTreesPerRoot.has(stat.root.resource.toString())) {
            this.processIgnoreFile(stat.root.resource.toString(), stat.resource, false);
            return true;
        }
        return this.isVisible(stat, parentVisibility);
    }
    isVisible(stat, parentVisibility) {
        stat.isExcluded = false;
        if (parentVisibility === 0 /* TreeVisibility.Hidden */) {
            stat.isExcluded = true;
            return false;
        }
        if (this.explorerService.getEditableData(stat)) {
            return true; // always visible
        }
        // Hide those that match Hidden Patterns
        const cached = this.hiddenExpressionPerRoot.get(stat.root.resource.toString());
        const globMatch = cached?.parsed(path.relative(stat.root.resource.path, stat.resource.path), stat.name, name => !!(stat.parent && stat.parent.getChild(name)));
        // Small optimization to only run isHiddenResource (traverse gitIgnore) if the globMatch from fileExclude returned nothing
        const isHiddenResource = !!globMatch ? true : this.isIgnored(stat.resource, stat.root.resource, stat.isDirectory);
        if (isHiddenResource || stat.parent?.isExcluded) {
            stat.isExcluded = true;
            const editors = this.editorService.visibleEditors;
            const editor = editors.find(e => e.resource && this.uriIdentityService.extUri.isEqualOrParent(e.resource, stat.resource));
            if (editor && stat.root === this.explorerService.findClosestRoot(stat.resource)) {
                this.editorsAffectingFilter.add(editor);
                return true; // Show all opened files and their parents
            }
            return false; // hidden through pattern
        }
        return true;
    }
    isIgnored(resource, rootResource, isDirectory) {
        const ignoreFile = this.ignoreTreesPerRoot.get(rootResource.toString())?.findSubstr(resource);
        const isIncludedInTraversal = ignoreFile?.isPathIncludedInTraversal(resource.path, isDirectory);
        // Doing !undefined returns true and we want it to be false when undefined because that means it's not included in the ignore file
        return isIncludedInTraversal === undefined ? false : !isIncludedInTraversal;
    }
    dispose() {
        dispose(this.toDispose);
    }
};
FilesFilter = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IConfigurationService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IUriIdentityService),
    __param(5, IFileService)
], FilesFilter);
export { FilesFilter };
// Explorer Sorter
let FileSorter = class FileSorter {
    constructor(explorerService, contextService) {
        this.explorerService = explorerService;
        this.contextService = contextService;
    }
    compare(statA, statB) {
        // Do not sort roots
        if (statA.isRoot) {
            if (statB.isRoot) {
                const workspaceA = this.contextService.getWorkspaceFolder(statA.resource);
                const workspaceB = this.contextService.getWorkspaceFolder(statB.resource);
                return workspaceA && workspaceB ? (workspaceA.index - workspaceB.index) : -1;
            }
            return -1;
        }
        if (statB.isRoot) {
            return 1;
        }
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const lexicographicOptions = this.explorerService.sortOrderConfiguration.lexicographicOptions;
        const reverse = this.explorerService.sortOrderConfiguration.reverse;
        if (reverse) {
            [statA, statB] = [statB, statA];
        }
        let compareFileNames;
        let compareFileExtensions;
        switch (lexicographicOptions) {
            case 'upper':
                compareFileNames = compareFileNamesUpper;
                compareFileExtensions = compareFileExtensionsUpper;
                break;
            case 'lower':
                compareFileNames = compareFileNamesLower;
                compareFileExtensions = compareFileExtensionsLower;
                break;
            case 'unicode':
                compareFileNames = compareFileNamesUnicode;
                compareFileExtensions = compareFileExtensionsUnicode;
                break;
            default:
                // 'default'
                compareFileNames = compareFileNamesDefault;
                compareFileExtensions = compareFileExtensionsDefault;
        }
        // Sort Directories
        switch (sortOrder) {
            case 'type':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.isDirectory && statB.isDirectory) {
                    return compareFileNames(statA.name, statB.name);
                }
                break;
            case 'filesFirst':
                if (statA.isDirectory && !statB.isDirectory) {
                    return 1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return -1;
                }
                break;
            case 'foldersNestsFiles':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.hasNests && !statB.hasNests) {
                    return -1;
                }
                if (statB.hasNests && !statA.hasNests) {
                    return 1;
                }
                break;
            case 'mixed':
                break; // not sorting when "mixed" is on
            default: /* 'default', 'modified' */
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                break;
        }
        // Sort Files
        switch (sortOrder) {
            case 'type':
                return compareFileExtensions(statA.name, statB.name);
            case 'modified':
                if (statA.mtime !== statB.mtime) {
                    return (statA.mtime && statB.mtime && statA.mtime < statB.mtime) ? 1 : -1;
                }
                return compareFileNames(statA.name, statB.name);
            default: /* 'default', 'mixed', 'filesFirst' */
                return compareFileNames(statA.name, statB.name);
        }
    }
};
FileSorter = __decorate([
    __param(0, IExplorerService),
    __param(1, IWorkspaceContextService)
], FileSorter);
export { FileSorter };
let FileDragAndDrop = class FileDragAndDrop {
    static { FileDragAndDrop_1 = this; }
    static { this.CONFIRM_DND_SETTING_KEY = 'explorer.confirmDragAndDrop'; }
    constructor(isCollapsed, explorerService, editorService, dialogService, contextService, fileService, configurationService, instantiationService, workspaceEditingService, uriIdentityService) {
        this.isCollapsed = isCollapsed;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.workspaceEditingService = workspaceEditingService;
        this.uriIdentityService = uriIdentityService;
        this.compressedDropTargetDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.dropEnabled = false;
        const updateDropEnablement = (e) => {
            if (!e || e.affectsConfiguration('explorer.enableDragAndDrop')) {
                this.dropEnabled = this.configurationService.getValue('explorer.enableDragAndDrop');
            }
        };
        updateDropEnablement(undefined);
        this.disposables.add(this.configurationService.onDidChangeConfiguration(e => updateDropEnablement(e)));
    }
    onDragOver(data, target, targetIndex, targetSector, originalEvent) {
        if (!this.dropEnabled) {
            return false;
        }
        // Compressed folders
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                const iconLabelName = getIconLabelNameFromHTMLElement(originalEvent.target);
                if (iconLabelName && iconLabelName.index < iconLabelName.count - 1) {
                    const result = this.handleDragOver(data, compressedTarget, targetIndex, targetSector, originalEvent);
                    if (result) {
                        if (iconLabelName.element !== this.compressedDragOverElement) {
                            this.compressedDragOverElement = iconLabelName.element;
                            this.compressedDropTargetDisposable.dispose();
                            this.compressedDropTargetDisposable = toDisposable(() => {
                                iconLabelName.element.classList.remove('drop-target');
                                this.compressedDragOverElement = undefined;
                            });
                            iconLabelName.element.classList.add('drop-target');
                        }
                        return typeof result === 'boolean' ? result : { ...result, feedback: [] };
                    }
                    this.compressedDropTargetDisposable.dispose();
                    return false;
                }
            }
        }
        this.compressedDropTargetDisposable.dispose();
        return this.handleDragOver(data, target, targetIndex, targetSector, originalEvent);
    }
    handleDragOver(data, target, targetIndex, targetSector, originalEvent) {
        const isCopy = originalEvent && ((originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh));
        const isNative = data instanceof NativeDragAndDropData;
        const effectType = (isNative || isCopy) ? 0 /* ListDragOverEffectType.Copy */ : 1 /* ListDragOverEffectType.Move */;
        const effect = { type: effectType, position: "drop-target" /* ListDragOverEffectPosition.Over */ };
        // Native DND
        if (isNative) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES, DataTransfers.RESOURCES)) {
                return false;
            }
        }
        // Other-Tree DND
        else if (data instanceof ExternalElementsDragAndDropData) {
            return false;
        }
        // In-Explorer DND
        else {
            const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
            const isRootsReorder = items.every(item => item.isRoot);
            if (!target) {
                // Dropping onto the empty area. Do not accept if items dragged are already
                // children of the root unless we are copying the file
                if (!isCopy && items.every(i => !!i.parent && i.parent.isRoot)) {
                    return false;
                }
                // root is added after last root folder when hovering on empty background
                if (isRootsReorder) {
                    return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: "drop-target-after" /* ListDragOverEffectPosition.After */ } };
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: false };
            }
            if (!Array.isArray(items)) {
                return false;
            }
            if (!isCopy && items.every((source) => source.isReadonly)) {
                return false; // Cannot move readonly items unless we copy
            }
            if (items.some((source) => {
                if (source.isRoot) {
                    return false; // Root folders are handled seperately
                }
                if (this.uriIdentityService.extUri.isEqual(source.resource, target.resource)) {
                    return true; // Can not move anything onto itself excpet for root folders
                }
                if (!isCopy && this.uriIdentityService.extUri.isEqual(dirname(source.resource), target.resource)) {
                    return true; // Can not move a file to the same parent unless we copy
                }
                if (this.uriIdentityService.extUri.isEqualOrParent(target.resource, source.resource)) {
                    return true; // Can not move a parent folder into one of its children
                }
                return false;
            })) {
                return false;
            }
            // reordering roots
            if (isRootsReorder) {
                if (!target.isRoot) {
                    return false;
                }
                let dropEffectPosition = undefined;
                switch (targetSector) {
                    case 0 /* ListViewTargetSector.TOP */:
                    case 1 /* ListViewTargetSector.CENTER_TOP */:
                        dropEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                        break;
                    case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    case 3 /* ListViewTargetSector.BOTTOM */:
                        dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                        break;
                }
                return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition } };
            }
        }
        // All (target = model)
        if (!target) {
            return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect };
        }
        // All (target = file/folder)
        else {
            if (target.isDirectory) {
                if (target.isReadonly) {
                    return false;
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: true };
            }
            if (this.contextService.getWorkspace().folders.every(folder => folder.uri.toString() !== target.resource.toString())) {
                return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */, effect };
            }
        }
        return false;
    }
    getDragURI(element) {
        if (this.explorerService.isEditable(element)) {
            return null;
        }
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const stat = FileDragAndDrop_1.getCompressedStatFromDragEvent(elements[0], originalEvent);
            return stat.name;
        }
        return String(elements.length);
    }
    onDragStart(data, originalEvent) {
        const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data, originalEvent);
        if (items && items.length && originalEvent.dataTransfer) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, items, originalEvent));
            // The only custom data transfer we set from the explorer is a file transfer
            // to be able to DND between multiple code file explorers across windows
            const fileResources = items.filter(s => s.resource.scheme === Schemas.file).map(r => r.resource.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    async drop(data, target, targetIndex, targetSector, originalEvent) {
        this.compressedDropTargetDisposable.dispose();
        // Find compressed target
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                target = compressedTarget;
            }
        }
        // Find parent to add to
        if (!target) {
            target = this.explorerService.roots[this.explorerService.roots.length - 1];
            targetSector = 3 /* ListViewTargetSector.BOTTOM */;
        }
        if (!target.isDirectory && target.parent) {
            target = target.parent;
        }
        if (target.isReadonly) {
            return;
        }
        const resolvedTarget = target;
        if (!resolvedTarget) {
            return;
        }
        try {
            // External file DND (Import/Upload file)
            if (data instanceof NativeDragAndDropData) {
                // Use local file import when supported
                if (!isWeb || (isTemporaryWorkspace(this.contextService.getWorkspace()) && WebFileSystemAccess.supported(mainWindow))) {
                    const fileImport = this.instantiationService.createInstance(ExternalFileImport);
                    await fileImport.import(resolvedTarget, originalEvent, mainWindow);
                }
                // Otherwise fallback to browser based file upload
                else {
                    const browserUpload = this.instantiationService.createInstance(BrowserFileUpload);
                    await browserUpload.upload(target, originalEvent);
                }
            }
            // In-Explorer DND (Move/Copy file)
            else {
                await this.handleExplorerDrop(data, resolvedTarget, targetIndex, targetSector, originalEvent);
            }
        }
        catch (error) {
            this.dialogService.error(toErrorMessage(error));
        }
    }
    async handleExplorerDrop(data, target, targetIndex, targetSector, originalEvent) {
        const elementsData = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
        const distinctItems = new Map(elementsData.map(element => [element, this.isCollapsed(element)]));
        for (const [item, collapsed] of distinctItems) {
            if (collapsed) {
                const nestedChildren = item.nestedChildren;
                if (nestedChildren) {
                    for (const child of nestedChildren) {
                        // if parent is collapsed, then the nested children is considered collapsed to operate as a group
                        // and skip collapsed state check since they're not in the tree
                        distinctItems.set(child, true);
                    }
                }
            }
        }
        const items = distinctParents([...distinctItems.keys()], s => s.resource);
        const isCopy = (originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh);
        // Handle confirm setting
        const confirmDragAndDrop = !isCopy && this.configurationService.getValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY);
        if (confirmDragAndDrop) {
            const message = items.length > 1 && items.every(s => s.isRoot) ? localize('confirmRootsMove', "Are you sure you want to change the order of multiple root folders in your workspace?")
                : items.length > 1 ? localize('confirmMultiMove', "Are you sure you want to move the following {0} files into '{1}'?", items.length, target.name)
                    : items[0].isRoot ? localize('confirmRootMove', "Are you sure you want to change the order of root folder '{0}' in your workspace?", items[0].name)
                        : localize('confirmMove', "Are you sure you want to move '{0}' into '{1}'?", items[0].name, target.name);
            const detail = items.length > 1 && !items.every(s => s.isRoot) ? getFileNamesMessage(items.map(i => i.resource)) : undefined;
            const confirmation = await this.dialogService.confirm({
                message,
                detail,
                checkbox: {
                    label: localize('doNotAskAgain', "Do not ask me again")
                },
                primaryButton: localize({ key: 'moveButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Move")
            });
            if (!confirmation.confirmed) {
                return;
            }
            // Check for confirmation checkbox
            if (confirmation.checkboxChecked === true) {
                await this.configurationService.updateValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY, false);
            }
        }
        await this.doHandleRootDrop(items.filter(s => s.isRoot), target, targetSector);
        const sources = items.filter(s => !s.isRoot);
        if (isCopy) {
            return this.doHandleExplorerDropOnCopy(sources, target);
        }
        return this.doHandleExplorerDropOnMove(sources, target);
    }
    async doHandleRootDrop(roots, target, targetSector) {
        if (roots.length === 0) {
            return;
        }
        const folders = this.contextService.getWorkspace().folders;
        let targetIndex;
        const sourceIndices = [];
        const workspaceCreationData = [];
        const rootsToMove = [];
        for (let index = 0; index < folders.length; index++) {
            const data = {
                uri: folders[index].uri,
                name: folders[index].name
            };
            // Is current target
            if (target instanceof ExplorerItem && this.uriIdentityService.extUri.isEqual(folders[index].uri, target.resource)) {
                targetIndex = index;
            }
            // Is current source
            for (const root of roots) {
                if (this.uriIdentityService.extUri.isEqual(folders[index].uri, root.resource)) {
                    sourceIndices.push(index);
                    break;
                }
            }
            if (roots.every(r => r.resource.toString() !== folders[index].uri.toString())) {
                workspaceCreationData.push(data);
            }
            else {
                rootsToMove.push(data);
            }
        }
        if (targetIndex === undefined) {
            targetIndex = workspaceCreationData.length;
        }
        else {
            switch (targetSector) {
                case 3 /* ListViewTargetSector.BOTTOM */:
                case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    targetIndex++;
                    break;
            }
            // Adjust target index if source was located before target.
            // The move will cause the index to change
            for (const sourceIndex of sourceIndices) {
                if (sourceIndex < targetIndex) {
                    targetIndex--;
                }
            }
        }
        workspaceCreationData.splice(targetIndex, 0, ...rootsToMove);
        return this.workspaceEditingService.updateFolders(0, workspaceCreationData.length, workspaceCreationData);
    }
    async doHandleExplorerDropOnCopy(sources, target) {
        // Reuse duplicate action when user copies
        const explorerConfig = this.configurationService.getValue().explorer;
        const resourceFileEdits = [];
        for (const { resource, isDirectory } of sources) {
            const allowOverwrite = explorerConfig.incrementalNaming === 'disabled';
            const newResource = await findValidPasteFileTarget(this.explorerService, this.fileService, this.dialogService, target, { resource, isDirectory, allowOverwrite }, explorerConfig.incrementalNaming);
            if (!newResource) {
                continue;
            }
            const resourceEdit = new ResourceFileEdit(resource, newResource, { copy: true, overwrite: allowOverwrite });
            resourceFileEdits.push(resourceEdit);
        }
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        await this.explorerService.applyBulkEdit(resourceFileEdits, {
            confirmBeforeUndo: explorerConfig.confirmUndo === "default" /* UndoConfirmLevel.Default */ || explorerConfig.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('copy', "Copy {0}", labelSuffix),
            progressLabel: localize('copying', "Copying {0}", labelSuffix),
        });
        const editors = resourceFileEdits.filter(edit => {
            const item = edit.newResource ? this.explorerService.findClosest(edit.newResource) : undefined;
            return item && !item.isDirectory;
        }).map(edit => ({ resource: edit.newResource, options: { pinned: true } }));
        await this.editorService.openEditors(editors);
    }
    async doHandleExplorerDropOnMove(sources, target) {
        // Do not allow moving readonly items
        const resourceFileEdits = sources.filter(source => !source.isReadonly).map(source => new ResourceFileEdit(source.resource, joinPath(target.resource, source.name)));
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        const options = {
            confirmBeforeUndo: this.configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('move', "Move {0}", labelSuffix),
            progressLabel: localize('moving', "Moving {0}", labelSuffix)
        };
        try {
            await this.explorerService.applyBulkEdit(resourceFileEdits, options);
        }
        catch (error) {
            // Conflict
            if (error.fileOperationResult === 4 /* FileOperationResult.FILE_MOVE_CONFLICT */) {
                const overwrites = [];
                for (const edit of resourceFileEdits) {
                    if (edit.newResource && await this.fileService.exists(edit.newResource)) {
                        overwrites.push(edit.newResource);
                    }
                }
                // Move with overwrite if the user confirms
                const confirm = getMultipleFilesOverwriteConfirm(overwrites);
                const { confirmed } = await this.dialogService.confirm(confirm);
                if (confirmed) {
                    await this.explorerService.applyBulkEdit(resourceFileEdits.map(re => new ResourceFileEdit(re.oldResource, re.newResource, { overwrite: true })), options);
                }
            }
            // Any other error: bubble up
            else {
                throw error;
            }
        }
    }
    static getStatsFromDragAndDropData(data, dragStartEvent) {
        if (data.context) {
            return data.context;
        }
        // Detect compressed folder dragging
        if (dragStartEvent && data.elements.length === 1) {
            data.context = [FileDragAndDrop_1.getCompressedStatFromDragEvent(data.elements[0], dragStartEvent)];
            return data.context;
        }
        return data.elements;
    }
    static getCompressedStatFromDragEvent(stat, dragEvent) {
        const target = DOM.getWindow(dragEvent).document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
        const iconLabelName = getIconLabelNameFromHTMLElement(target);
        if (iconLabelName) {
            const { count, index } = iconLabelName;
            let i = count - 1;
            while (i > index && stat.parent) {
                stat = stat.parent;
                i--;
            }
            return stat;
        }
        return stat;
    }
    onDragEnd() {
        this.compressedDropTargetDisposable.dispose();
    }
    dispose() {
        this.compressedDropTargetDisposable.dispose();
    }
};
FileDragAndDrop = FileDragAndDrop_1 = __decorate([
    __param(1, IExplorerService),
    __param(2, IEditorService),
    __param(3, IDialogService),
    __param(4, IWorkspaceContextService),
    __param(5, IFileService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService),
    __param(8, IWorkspaceEditingService),
    __param(9, IUriIdentityService)
], FileDragAndDrop);
export { FileDragAndDrop };
function getIconLabelNameFromHTMLElement(target) {
    if (!(DOM.isHTMLElement(target))) {
        return null;
    }
    let element = target;
    while (element && !element.classList.contains('monaco-list-row')) {
        if (element.classList.contains('label-name') && element.hasAttribute('data-icon-label-count')) {
            const count = Number(element.getAttribute('data-icon-label-count'));
            const index = Number(element.getAttribute('data-icon-label-index'));
            if (isNumber(count) && isNumber(index)) {
                return { element: element, count, index };
            }
        }
        element = element.parentElement;
    }
    return null;
}
export function isCompressedFolderName(target) {
    return !!getIconLabelNameFromHTMLElement(target);
}
export class ExplorerCompressionDelegate {
    isIncompressible(stat) {
        return stat.isRoot || !stat.isDirectory || stat instanceof NewExplorerItem || (!stat.parent || stat.parent.isRoot);
    }
}
function getFileOrFolderLabelSuffix(items) {
    if (items.length === 1) {
        return items[0].name;
    }
    if (items.every(i => i.isDirectory)) {
        return localize('numberOfFolders', "{0} folders", items.length);
    }
    if (items.every(i => !i.isDirectory)) {
        return localize('numberOfFiles', "{0} files", items.length);
    }
    return `${items.length} files and folders`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3MvZXhwbG9yZXJWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsZ0JBQWdCLEdBQXFCLE1BQU0scURBQXFELENBQUM7QUFDMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUEyRCxNQUFNLCtDQUErQyxDQUFDO0FBQ2hKLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSx1REFBdUQsQ0FBQztBQUN2SSxPQUFPLEVBQWUsVUFBVSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJMUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBNkIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNqSSxPQUFPLEVBQUUsMEJBQTBCLEVBQXlDLE1BQU0sdUJBQXVCLENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlD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QU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3JHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDL0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BGLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0MsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsZUFBZSxDQUFDLFNBQWtCO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUUsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkMsQ0FBQzs7QUFZSyxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhOzthQUNULE9BQUUsR0FBRyxNQUFNLEFBQVQsQ0FBVTtJQVM1QixZQUNDLFNBQXNCLEVBQ2QsTUFBc0IsRUFDdEIsYUFBeUMsRUFDekMsV0FBeUMsRUFDNUIsa0JBQXdELEVBQzlELFlBQTRDLEVBQ3BDLG9CQUE0RCxFQUNqRSxlQUFrRCxFQUNyRCxZQUE0QyxFQUNqQyxjQUF5RCxFQUM5RCxrQkFBd0QsRUFDdEQsb0JBQTREO1FBVjNFLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQ3RCLGtCQUFhLEdBQWIsYUFBYSxDQUE0QjtRQUN6QyxnQkFBVyxHQUFYLFdBQVcsQ0FBOEI7UUFDWCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzdDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDaEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3BDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ2hCLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUM3Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFqQjVFLG9DQUErQixHQUFHLElBQUksR0FBRyxFQUFrRCxDQUFDO1FBRTVGLGlDQUE0QixHQUFHLElBQUksZ0JBQWdCLEVBQVEsQ0FBQztRQUMzRCxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDO1FBZ0I5RSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXVCLENBQUM7UUFFeEUsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7WUFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ25GLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtZQUNsRSxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDMUYsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEQsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztnQkFDckQsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxrQkFBa0IsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sZUFBYSxDQUFDLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUM5QyxJQUFJLENBQUM7Z0JBQ0osSUFBSSxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osc0ZBQXNGO1lBQ3ZGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxRQUFRLEdBQUcsMkJBQTJCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUMvRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0UsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0QsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5QyxLQUFLLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sWUFBWSxHQUFzQixFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUNoSyxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXlDLEVBQUUsS0FBYSxFQUFFLFlBQStCO1FBQ3RHLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDMUIsWUFBWSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEUsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUxRCxhQUFhO1FBQ2IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELFlBQVk7YUFDUCxDQUFDO1lBQ0wsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7WUFDbEQsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDdEcsQ0FBQztJQUNGLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxJQUE4RCxFQUFFLEtBQWEsRUFBRSxZQUErQjtRQUN0SSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckUsWUFBWSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzRyxhQUFhO1FBQ2IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkQsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7WUFFbEQsTUFBTSxFQUFFLEdBQUcsdUJBQXVCLDhCQUE4QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDeEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXRELHVFQUF1RTtZQUN2RSxzREFBc0Q7WUFDdEQsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQW9DLENBQUM7WUFDM0QsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BGLFVBQVUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsZ0JBQWdCLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEYsQ0FBQztZQUVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRTVELE1BQU0sOEJBQThCLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9JLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUVwRSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3RSxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsZUFBZSxFQUFFLDhCQUE4QixDQUFDLENBQUMsQ0FBQztZQUVyRyxnQkFBZ0I7WUFDaEIsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFFdkgsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3RHLE1BQU0sTUFBTSxHQUFHLCtCQUErQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFekQsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWiw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDckQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzdFLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEtBQUssOEJBQThCLENBQUMsQ0FBQztnQkFFN0csSUFBSSxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztnQkFFRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25ELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsWUFBWTthQUNQLENBQUM7WUFDTCxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzFELFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ2xELFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzdELFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzdHLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQWtCLEVBQUUsS0FBd0IsRUFBRSxLQUF5QixFQUFFLFVBQWtDLEVBQUUsWUFBK0I7UUFDOUosWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDbEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsaUdBQWlHO1FBQ2pHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVuRCwyRkFBMkY7UUFDM0YsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDbEgsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUVoRyxzSkFBc0o7UUFDdEosd0VBQXdFO1FBQ3hFLE1BQU0seUJBQXlCLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3RyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxZQUFZLElBQUkseUJBQXlCLENBQUM7UUFDN0UsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLFlBQVksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3hFLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNqRyxZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLEVBQUUsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtZQUMxRyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVztZQUNqRCxPQUFPLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUNsQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDeEYsS0FBSztTQUNMLENBQUMsQ0FBQztRQUVILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RSxJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUErQixFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDblAsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGdDQUFnQyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUN4SCxZQUFZLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFTyxjQUFjLENBQUMsU0FBc0IsRUFBRSxJQUFrQixFQUFFLFlBQTJCO1FBRTdGLDJEQUEyRDtRQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QyxNQUFNLFlBQVksR0FBRyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFFekcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ25ELE1BQU0seUJBQXlCLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3RyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxZQUFZLElBQUkseUJBQXlCLENBQUM7UUFFN0UsTUFBTSxZQUFZLEdBQXNCO1lBQ3ZDLFFBQVEsRUFBRSxJQUFJO1lBQ2QsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRO1lBQ1IsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxFQUFFLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7U0FDMUcsQ0FBQztRQUdGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7UUFFOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxHQUFHLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztRQUVsRyxtQkFBbUI7UUFDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUV4RSx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDckUsaUJBQWlCLEVBQUU7Z0JBQ2xCLFVBQVUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO29CQUNyQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3RELElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ3JELE9BQU8sSUFBSSxDQUFDO29CQUNiLENBQUM7b0JBRUQsT0FBTzt3QkFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87d0JBQ3hCLGFBQWEsRUFBRSxJQUFJO3dCQUNuQixJQUFJLDJCQUFtQjtxQkFDdkIsQ0FBQztnQkFDSCxDQUFDO2FBQ0Q7WUFDRCxTQUFTLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDZEQUE2RCxDQUFDO1lBQ3hHLGNBQWMsRUFBRSxxQkFBcUI7U0FDckMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLHFCQUFxQixHQUFHLFFBQVEsQ0FBQztRQUVyQyxRQUFRLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUN2QixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRTlGLE1BQU0sSUFBSSxHQUFHLHdCQUF3QixDQUFDLENBQUMsT0FBZ0IsRUFBRSxhQUFzQixFQUFFLEVBQUU7WUFDbEYsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztZQUNyQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQixLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxFQUFFO1lBQ3JDLElBQUksUUFBUSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQy9ELElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDcEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO3dCQUN4QixhQUFhLEVBQUUsSUFBSTt3QkFDbkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLDBCQUFrQixDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsNkJBQXFCLENBQUMsMEJBQWtCO3FCQUM3SSxDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRix3QkFBd0IsRUFBRSxDQUFDO1FBRTNCLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLFFBQVE7WUFDUixRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUM1QixLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxJQUFJLEdBQUcsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsa0NBQWtDO1lBQ2hHLENBQUMsQ0FBQztZQUNGLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBaUIsRUFBRSxFQUFFO2dCQUN0RyxJQUFJLENBQUMsQ0FBQyxNQUFNLHFCQUFZLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pELElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDekMsT0FBTztvQkFDUixDQUFDO29CQUNELElBQUkscUJBQXFCLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQ3hDLHFCQUFxQixHQUFHLEtBQUssQ0FBQzt3QkFDOUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztvQkFDM0QsQ0FBQzt5QkFBTSxJQUFJLHFCQUFxQixLQUFLLEtBQUssRUFBRSxDQUFDO3dCQUM1QyxxQkFBcUIsR0FBRyxRQUFRLENBQUM7d0JBQ2pDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUN0RSxDQUFDO3lCQUFNLENBQUM7d0JBQ1AscUJBQXFCLEdBQUcsUUFBUSxDQUFDO3dCQUNqQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDOUMsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sdUJBQWUsRUFBRSxDQUFDO29CQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7d0JBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2xCLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLHdCQUFnQixFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25CLENBQUM7WUFDRixDQUFDLENBQUM7WUFDRixHQUFHLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQWlCLEVBQUUsRUFBRTtnQkFDcEcsd0JBQXdCLEVBQUUsQ0FBQztZQUM1QixDQUFDLENBQUM7WUFDRixHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDL0UsT0FBTyxJQUFJLEVBQUUsQ0FBQztvQkFDYixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFakIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7b0JBQzFELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzt3QkFDL0IsTUFBTTtvQkFDUCxDQUFDO29CQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQzt3QkFDbEQsT0FBTztvQkFDUixDQUFDO3lCQUFNLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQzt3QkFDbEksTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsTUFBTTtvQkFDUCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUM7WUFDRixLQUFLO1NBQ0wsQ0FBQztRQUVGLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUE0QyxFQUFFLEtBQWEsRUFBRSxZQUErQjtRQUMxRyxZQUFZLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUN4QyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELHlCQUF5QixDQUFDLElBQThELEVBQUUsS0FBYSxFQUFFLFlBQStCO1FBQ3ZJLFlBQVksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQ3hDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQStCO1FBQzlDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQsaUNBQWlDLENBQUMsSUFBa0I7UUFDbkQsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCx5QkFBeUI7SUFFekIsWUFBWSxDQUFDLE9BQXFCO1FBQ2pDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQXFCO1FBQ2pDLDJIQUEySDtRQUMzSCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLE9BQU8sTUFBTSxFQUFFLENBQUM7WUFDZixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUN2QixLQUFLLEVBQUUsQ0FBQztRQUNULENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUscUNBQTZCLEVBQUUsQ0FBQztZQUMxRSxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQscUJBQXFCLENBQUMsSUFBa0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxJQUFJLFNBQVMsQ0FBQztJQUNwRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQzs7QUFuWVcsYUFBYTtJQWV2QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEscUJBQXFCLENBQUE7R0F0QlgsYUFBYSxDQW9ZekI7O0FBT0Q7OztHQUdHO0FBQ0ksSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVztJQVl2QixZQUMyQixjQUF5RCxFQUM1RCxvQkFBNEQsRUFDakUsZUFBa0QsRUFDcEQsYUFBOEMsRUFDekMsa0JBQXdELEVBQy9ELFdBQTBDO1FBTGIsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDaEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ25DLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN4Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzlDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBakJqRCw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUNwRSwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ2hELGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUNuQyxjQUFTLEdBQWtCLEVBQUUsQ0FBQztRQUN0QywyRUFBMkU7UUFDbkUsK0JBQTBCLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFDcEUsNkRBQTZEO1FBQzdELDJGQUEyRjtRQUMzRixxR0FBcUc7UUFDN0YsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7UUFVbEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQztnQkFDcEcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pELHFFQUFxRTtZQUNyRSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDdkYscUJBQXFCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQyxjQUFjLEVBQUMsRUFBRTtvQkFDcEQsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsaUNBQXlCLEVBQUUsQ0FBQzt3QkFDeEQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFDRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxpQ0FBeUIsRUFBRSxDQUFDO3dCQUN4RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDbkUscUJBQXFCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUM3QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUMxQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRTtZQUNyRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQztZQUNsRCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFFdkIsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDakIsU0FBUztnQkFDVixDQUFDO2dCQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUM3QiwwRUFBMEU7b0JBQzFFLFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQ2xCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMxQiwyREFBMkQ7b0JBQzNELFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQ2xCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQUNoQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLHVCQUF1QixHQUFHLEtBQUssQ0FBQztRQUNwQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBc0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDeEcsTUFBTSxjQUFjLEdBQXFCLGFBQWEsRUFBRSxLQUFLLEVBQUUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUYsTUFBTSxlQUFlLEdBQVksYUFBYSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUV6RSxzR0FBc0c7WUFDdEcsSUFBSSxlQUFlLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM1RSx1QkFBdUIsR0FBRyxJQUFJLENBQUM7Z0JBQy9CLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlJLENBQUM7WUFFRCx5RkFBeUY7WUFDekYsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM1RSx1QkFBdUIsR0FBRyxJQUFJLENBQUM7Z0JBQy9CLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsVUFBVSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbEUsQ0FBQztZQUVELE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsNkRBQTZEO1lBRW5ILElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuSSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksVUFBVSxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsa0JBQXVCLEVBQUUsTUFBZ0I7UUFDdEYsNERBQTREO1FBQzVELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsOERBQThEO1FBQzlELElBQUksQ0FBQyxNQUFNLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU87UUFDUixDQUFDO1FBQ0QsbUVBQW1FO1FBQ25FLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVwRSxnRkFBZ0Y7UUFDaEYsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQzthQUFNLENBQUM7WUFDUCw4REFBOEQ7WUFDOUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDdkYsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbkMseUdBQXlHO1lBQ3pHLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDcEUsQ0FBQztRQUNGLENBQUM7UUFFRCxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQWtCLEVBQUUsZ0JBQWdDO1FBQzFELHdEQUF3RDtRQUN4RCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssWUFBWSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzlGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRU8sU0FBUyxDQUFDLElBQWtCLEVBQUUsZ0JBQWdDO1FBQ3JFLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksZ0JBQWdCLGtDQUEwQixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDdkIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU8sSUFBSSxDQUFDLENBQUMsaUJBQWlCO1FBQy9CLENBQUM7UUFFRCx3Q0FBd0M7UUFDeEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sU0FBUyxHQUFHLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0osMEhBQTBIO1FBQzFILE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xILElBQUksZ0JBQWdCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQztZQUNsRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzFILElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hDLE9BQU8sSUFBSSxDQUFDLENBQUMsMENBQTBDO1lBQ3hELENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQyxDQUFDLHlCQUF5QjtRQUN4QyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWEsRUFBRSxZQUFpQixFQUFFLFdBQW9CO1FBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlGLE1BQU0scUJBQXFCLEdBQUcsVUFBVSxFQUFFLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFaEcsa0lBQWtJO1FBQ2xJLE9BQU8scUJBQXFCLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDN0UsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRCxDQUFBO0FBL01ZLFdBQVc7SUFhckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0dBbEJGLFdBQVcsQ0ErTXZCOztBQUVELGtCQUFrQjtBQUNYLElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVU7SUFFdEIsWUFDb0MsZUFBaUMsRUFDekIsY0FBd0M7UUFEaEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3pCLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtJQUNoRixDQUFDO0lBRUwsT0FBTyxDQUFDLEtBQW1CLEVBQUUsS0FBbUI7UUFDL0Msb0JBQW9CO1FBQ3BCLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFFLE9BQU8sVUFBVSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsQ0FBQztZQUVELE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7UUFDeEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDO1FBQzlGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDO1FBQ3BFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsQ0FBQztRQUNyQixJQUFJLHFCQUFxQixDQUFDO1FBQzFCLFFBQVEsb0JBQW9CLEVBQUUsQ0FBQztZQUM5QixLQUFLLE9BQU87Z0JBQ1gsZ0JBQWdCLEdBQUcscUJBQXFCLENBQUM7Z0JBQ3pDLHFCQUFxQixHQUFHLDBCQUEwQixDQUFDO2dCQUNuRCxNQUFNO1lBQ1AsS0FBSyxPQUFPO2dCQUNYLGdCQUFnQixHQUFHLHFCQUFxQixDQUFDO2dCQUN6QyxxQkFBcUIsR0FBRywwQkFBMEIsQ0FBQztnQkFDbkQsTUFBTTtZQUNQLEtBQUssU0FBUztnQkFDYixnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQztnQkFDM0MscUJBQXFCLEdBQUcsNEJBQTRCLENBQUM7Z0JBQ3JELE1BQU07WUFDUDtnQkFDQyxZQUFZO2dCQUNaLGdCQUFnQixHQUFHLHVCQUF1QixDQUFDO2dCQUMzQyxxQkFBcUIsR0FBRyw0QkFBNEIsQ0FBQztRQUN2RCxDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbkIsS0FBSyxNQUFNO2dCQUNWLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWCxDQUFDO2dCQUVELElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUM1QyxPQUFPLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqRCxDQUFDO2dCQUVELE1BQU07WUFFUCxLQUFLLFlBQVk7Z0JBQ2hCLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzdDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxNQUFNO1lBRVAsS0FBSyxtQkFBbUI7Z0JBQ3ZCLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWCxDQUFDO2dCQUVELElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3ZDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3ZDLE9BQU8sQ0FBQyxDQUFDO2dCQUNWLENBQUM7Z0JBRUQsTUFBTTtZQUVQLEtBQUssT0FBTztnQkFDWCxNQUFNLENBQUMsaUNBQWlDO1lBRXpDLFNBQVMsMkJBQTJCO2dCQUNuQyxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzdDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzdDLE9BQU8sQ0FBQyxDQUFDO2dCQUNWLENBQUM7Z0JBRUQsTUFBTTtRQUNSLENBQUM7UUFFRCxhQUFhO1FBQ2IsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV0RCxLQUFLLFVBQVU7Z0JBQ2QsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0UsQ0FBQztnQkFFRCxPQUFPLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWpELFNBQVMsc0NBQXNDO2dCQUM5QyxPQUFPLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWpJWSxVQUFVO0lBR3BCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSx3QkFBd0IsQ0FBQTtHQUpkLFVBQVUsQ0FpSXRCOztBQUVNLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7O2FBQ0gsNEJBQXVCLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO0lBUWhGLFlBQ1MsV0FBNEMsRUFDbEMsZUFBeUMsRUFDM0MsYUFBcUMsRUFDckMsYUFBcUMsRUFDM0IsY0FBZ0QsRUFDNUQsV0FBaUMsRUFDeEIsb0JBQW1ELEVBQ25ELG9CQUFtRCxFQUNoRCx1QkFBeUQsRUFDOUQsa0JBQXdEO1FBVHJFLGdCQUFXLEdBQVgsV0FBVyxDQUFpQztRQUMxQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDbkMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzdCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNuQixtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDcEQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDaEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3hDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQWZ0RSxtQ0FBOEIsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQztRQUVyRCxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDN0MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFjM0IsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQXdDLEVBQUUsRUFBRTtZQUN6RSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3JGLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEcsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFzQixFQUFFLE1BQWdDLEVBQUUsV0FBK0IsRUFBRSxZQUE4QyxFQUFFLGFBQXdCO1FBQzdLLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLGdCQUFnQixHQUFHLGlCQUFlLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRS9GLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxhQUFhLEdBQUcsK0JBQStCLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUU1RSxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3BFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBRXJHLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQ1osSUFBSSxhQUFhLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDOzRCQUM5RCxJQUFJLENBQUMseUJBQXlCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQzs0QkFDdkQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUM5QyxJQUFJLENBQUMsOEJBQThCLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQ0FDdkQsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dDQUN0RCxJQUFJLENBQUMseUJBQXlCLEdBQUcsU0FBUyxDQUFDOzRCQUM1QyxDQUFDLENBQUMsQ0FBQzs0QkFFSCxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQ3BELENBQUM7d0JBRUQsT0FBTyxPQUFPLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7b0JBQzNFLENBQUM7b0JBRUQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM5QyxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsOEJBQThCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRU8sY0FBYyxDQUFDLElBQXNCLEVBQUUsTUFBZ0MsRUFBRSxXQUErQixFQUFFLFlBQThDLEVBQUUsYUFBd0I7UUFDekwsTUFBTSxNQUFNLEdBQUcsYUFBYSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDbkgsTUFBTSxRQUFRLEdBQUcsSUFBSSxZQUFZLHFCQUFxQixDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMscUNBQTZCLENBQUMsb0NBQTRCLENBQUM7UUFDcEcsTUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEscURBQWlDLEVBQUUsQ0FBQztRQUUvRSxhQUFhO1FBQ2IsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdHLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxpQkFBaUI7YUFDWixJQUFJLElBQUksWUFBWSwrQkFBK0IsRUFBRSxDQUFDO1lBQzFELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELGtCQUFrQjthQUNiLENBQUM7WUFDTCxNQUFNLEtBQUssR0FBRyxpQkFBZSxDQUFDLDJCQUEyQixDQUFDLElBQTZELENBQUMsQ0FBQztZQUN6SCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXhELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYiwyRUFBMkU7Z0JBQzNFLHNEQUFzRDtnQkFDdEQsSUFBSSxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNoRSxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELHlFQUF5RTtnQkFDekUsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxRQUFRLDREQUFrQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEgsQ0FBQztnQkFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUF5QixFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDckYsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELE9BQU8sS0FBSyxDQUFDLENBQUMsNENBQTRDO1lBQzNELENBQUM7WUFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDekIsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sS0FBSyxDQUFDLENBQUMsc0NBQXNDO2dCQUNyRCxDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDOUUsT0FBTyxJQUFJLENBQUMsQ0FBQyw0REFBNEQ7Z0JBQzFFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUNsRyxPQUFPLElBQUksQ0FBQyxDQUFDLHdEQUF3RDtnQkFDdEUsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3RGLE9BQU8sSUFBSSxDQUFDLENBQUMsd0RBQXdEO2dCQUN0RSxDQUFDO2dCQUVELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDSixPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztnQkFFRCxJQUFJLGtCQUFrQixHQUEyQyxTQUFTLENBQUM7Z0JBQzNFLFFBQVEsWUFBWSxFQUFFLENBQUM7b0JBQ3RCLHNDQUE4QjtvQkFDOUI7d0JBQ0Msa0JBQWtCLCtEQUFvQyxDQUFDO3dCQUFDLE1BQU07b0JBQy9ELGdEQUF3QztvQkFDeEM7d0JBQ0Msa0JBQWtCLDZEQUFtQyxDQUFDO3dCQUFDLE1BQU07Z0JBQy9ELENBQUM7Z0JBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1lBQ3RHLENBQUM7UUFDRixDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQXlCLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDbEUsQ0FBQztRQUVELDZCQUE2QjthQUN4QixDQUFDO1lBQ0wsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUN2QixPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQXlCLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNwRixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN0SCxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUF1QixFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ2hFLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQXFCO1FBQy9CLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUF3QixFQUFFLGFBQXdCO1FBQzlELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksR0FBRyxpQkFBZSxDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN4RixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQXNCLEVBQUUsYUFBd0I7UUFDM0QsTUFBTSxLQUFLLEdBQUcsaUJBQWUsQ0FBQywyQkFBMkIsQ0FBQyxJQUE2RCxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3hJLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pELDZGQUE2RjtZQUM3RixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRTFHLDRFQUE0RTtZQUM1RSx3RUFBd0U7WUFDeEUsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hHLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMxQixhQUFhLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQzVGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBc0IsRUFBRSxNQUFnQyxFQUFFLFdBQStCLEVBQUUsWUFBOEMsRUFBRSxhQUF3QjtRQUM3SyxJQUFJLENBQUMsOEJBQThCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFOUMseUJBQXlCO1FBQ3pCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLGdCQUFnQixHQUFHLGlCQUFlLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRS9GLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxHQUFHLGdCQUFnQixDQUFDO1lBQzNCLENBQUM7UUFDRixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0UsWUFBWSxzQ0FBOEIsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3hCLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUM5QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUM7WUFFSix5Q0FBeUM7WUFDekMsSUFBSSxJQUFJLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0MsdUNBQXVDO2dCQUN2QyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZILE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvQkFDaEYsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3BFLENBQUM7Z0JBQ0Qsa0RBQWtEO3FCQUM3QyxDQUFDO29CQUNMLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDbEYsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbkQsQ0FBQztZQUNGLENBQUM7WUFFRCxtQ0FBbUM7aUJBQzlCLENBQUM7Z0JBQ0wsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBNkQsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN4SixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBMkQsRUFBRSxNQUFvQixFQUFFLFdBQStCLEVBQUUsWUFBOEMsRUFBRSxhQUF3QjtRQUM1TixNQUFNLFlBQVksR0FBRyxpQkFBZSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpHLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUMvQyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQzNDLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQ3BCLEtBQUssTUFBTSxLQUFLLElBQUksY0FBYyxFQUFFLENBQUM7d0JBQ3BDLGlHQUFpRzt3QkFDakcsK0RBQStEO3dCQUMvRCxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDaEMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sTUFBTSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxXQUFXLENBQUMsQ0FBQztRQUVoRyx5QkFBeUI7UUFDekIsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLGlCQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMzSCxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHVGQUF1RixDQUFDO2dCQUNyTCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxtRUFBbUUsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2hKLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsbUZBQW1GLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDbEosQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsaURBQWlELEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUcsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUU3SCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNyRCxPQUFPO2dCQUNQLE1BQU07Z0JBQ04sUUFBUSxFQUFFO29CQUNULEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDO2lCQUN2RDtnQkFDRCxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUM7YUFDakcsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDN0IsT0FBTztZQUNSLENBQUM7WUFFRCxrQ0FBa0M7WUFDbEMsSUFBSSxZQUFZLENBQUMsZUFBZSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMzQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsaUJBQWUsQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3RixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRS9FLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFxQixFQUFFLE1BQW9CLEVBQUUsWUFBOEM7UUFDekgsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUM7UUFDM0QsSUFBSSxXQUErQixDQUFDO1FBQ3BDLE1BQU0sYUFBYSxHQUFhLEVBQUUsQ0FBQztRQUNuQyxNQUFNLHFCQUFxQixHQUFtQyxFQUFFLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQW1DLEVBQUUsQ0FBQztRQUV2RCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3JELE1BQU0sSUFBSSxHQUFHO2dCQUNaLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRztnQkFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJO2FBQ3pCLENBQUM7WUFFRixvQkFBb0I7WUFDcEIsSUFBSSxNQUFNLFlBQVksWUFBWSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ILFdBQVcsR0FBRyxLQUFLLENBQUM7WUFDckIsQ0FBQztZQUVELG9CQUFvQjtZQUNwQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQy9FLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzFCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMvRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMvQixXQUFXLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxZQUFZLEVBQUUsQ0FBQztnQkFDdEIseUNBQWlDO2dCQUNqQztvQkFDQyxXQUFXLEVBQUUsQ0FBQztvQkFDZCxNQUFNO1lBQ1IsQ0FBQztZQUNELDJEQUEyRDtZQUMzRCwwQ0FBMEM7WUFDMUMsS0FBSyxNQUFNLFdBQVcsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxXQUFXLEdBQUcsV0FBVyxFQUFFLENBQUM7b0JBQy9CLFdBQVcsRUFBRSxDQUFDO2dCQUNmLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFFN0QsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUMzRyxDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQixDQUFDLE9BQXVCLEVBQUUsTUFBb0I7UUFFckYsMENBQTBDO1FBQzFDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXVCLENBQUMsUUFBUSxDQUFDO1FBQzFGLE1BQU0saUJBQWlCLEdBQXVCLEVBQUUsQ0FBQztRQUNqRCxLQUFLLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDakQsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixLQUFLLFVBQVUsQ0FBQztZQUN2RSxNQUFNLFdBQVcsR0FBRyxNQUFNLHdCQUF3QixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQ3RFLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxhQUFhLEVBQ2xCLE1BQU0sRUFDTixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEVBQ3pDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FDaEMsQ0FBQztZQUNGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBQzVHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRTtZQUMzRCxpQkFBaUIsRUFBRSxjQUFjLENBQUMsV0FBVyw2Q0FBNkIsSUFBSSxjQUFjLENBQUMsV0FBVyw2Q0FBNkI7WUFDckksU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQztZQUNwRCxhQUFhLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDO1NBQzlELENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUMvRixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RSxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQUMsT0FBdUIsRUFBRSxNQUFvQjtRQUVyRixxQ0FBcUM7UUFDckMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEssTUFBTSxXQUFXLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUc7WUFDZixpQkFBaUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUF1QixDQUFDLFFBQVEsQ0FBQyxXQUFXLDZDQUE2QjtZQUM5SCxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ3BELGFBQWEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxXQUFXLENBQUM7U0FDNUQsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFFaEIsV0FBVztZQUNYLElBQXlCLEtBQU0sQ0FBQyxtQkFBbUIsbURBQTJDLEVBQUUsQ0FBQztnQkFFaEcsTUFBTSxVQUFVLEdBQVUsRUFBRSxDQUFDO2dCQUM3QixLQUFLLE1BQU0sSUFBSSxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3RDLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO3dCQUN6RSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDbkMsQ0FBQztnQkFDRixDQUFDO2dCQUVELDJDQUEyQztnQkFDM0MsTUFBTSxPQUFPLEdBQUcsZ0NBQWdDLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzdELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMzSixDQUFDO1lBQ0YsQ0FBQztZQUVELDZCQUE2QjtpQkFDeEIsQ0FBQztnQkFDTCxNQUFNLEtBQUssQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxJQUEyRCxFQUFFLGNBQTBCO1FBQ2pJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNyQixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxpQkFBZSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNsRyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDckIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRU8sTUFBTSxDQUFDLDhCQUE4QixDQUFDLElBQWtCLEVBQUUsU0FBb0I7UUFDckYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEcsTUFBTSxhQUFhLEdBQUcsK0JBQStCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLGFBQWEsQ0FBQztZQUV2QyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNuQixDQUFDLEVBQUUsQ0FBQztZQUNMLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQy9DLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQy9DLENBQUM7O0FBaGZXLGVBQWU7SUFXekIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsbUJBQW1CLENBQUE7R0FuQlQsZUFBZSxDQWlmM0I7O0FBRUQsU0FBUywrQkFBK0IsQ0FBQyxNQUFrRDtJQUMxRixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBdUIsTUFBTSxDQUFDO0lBRXpDLE9BQU8sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1FBQ2xFLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7WUFDL0YsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztZQUVwRSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7SUFDakMsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxNQUFrRDtJQUN4RixPQUFPLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRUQsTUFBTSxPQUFPLDJCQUEyQjtJQUV2QyxnQkFBZ0IsQ0FBQyxJQUFrQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksWUFBWSxlQUFlLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwSCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLDBCQUEwQixDQUFDLEtBQXFCO0lBQ3hELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sUUFBUSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7UUFDdEMsT0FBTyxRQUFRLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxDQUFDIn0=