/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dirname } from '../../../../base/common/resources.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import * as Constants from '../common/constants.js';
import * as SearchEditorConstants from '../../searchEditor/browser/constants.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { resolveResourcesForSearchIncludes } from '../../../services/search/common/queryBuilder.js';
import { getMultiSelectedResources, IExplorerService } from '../../files/browser/files.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ExplorerFolderContext, ExplorerRootContext, FilesExplorerFocusCondition, VIEWLET_ID as VIEWLET_ID_FILES } from '../../files/common/files.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { category, getElementsToOperateOn, getSearchView, openSearchView } from './searchActionsBase.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { Schemas } from '../../../../base/common/network.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { forcedExpandRecursively } from './searchActionsTopBar.js';
import { isSearchTreeFileMatch, isSearchTreeMatch } from './searchTreeModel/searchTreeCommon.js';
//#endregion
registerAction2(class RestrictSearchToFolderAction extends Action2 {
    constructor() {
        super({
            id: "search.action.restrictSearchToFolder" /* Constants.SearchCommandIds.RestrictSearchToFolderId */,
            title: nls.localize2('restrictResultsToFolder', "Restrict Search to Folder"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ResourceFolderFocusKey),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 3,
                    when: ContextKeyExpr.and(Constants.SearchContext.ResourceFolderFocusKey)
                }
            ]
        });
    }
    async run(accessor, folderMatch) {
        await searchWithFolderCommand(accessor, false, true, undefined, folderMatch);
    }
});
registerAction2(class ExpandSelectedTreeCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.expandRecursively" /* Constants.SearchCommandIds.ExpandRecursivelyCommandId */,
            title: nls.localize('search.expandRecursively', "Expand Recursively"),
            category,
            menu: [{
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.FolderFocusKey, Constants.SearchContext.HasSearchResults),
                    group: 'search',
                    order: 4
                }]
        });
    }
    async run(accessor) {
        return expandSelectSubtree(accessor);
    }
});
registerAction2(class ExcludeFolderFromSearchAction extends Action2 {
    constructor() {
        super({
            id: "search.action.excludeFromSearch" /* Constants.SearchCommandIds.ExcludeFolderFromSearchId */,
            title: nls.localize2('excludeFolderFromSearch', "Exclude Folder from Search"),
            category,
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 4,
                    when: Constants.SearchContext.ResourceFolderFocusKey
                }
            ]
        });
    }
    async run(accessor, folderMatch) {
        await searchWithFolderCommand(accessor, false, false, undefined, folderMatch);
    }
});
registerAction2(class RevealInSideBarForSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.revealInSideBar" /* Constants.SearchCommandIds.RevealInSideBarForSearchResults */,
            title: nls.localize2('revealInSideBar', "Reveal in Explorer View"),
            category,
            menu: [{
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.FileFocusKey, Constants.SearchContext.HasSearchResults),
                    group: 'search_3',
                    order: 1
                }]
        });
    }
    async run(accessor, args) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const explorerService = accessor.get(IExplorerService);
        const contextService = accessor.get(IWorkspaceContextService);
        const searchView = getSearchView(accessor.get(IViewsService));
        if (!searchView) {
            return;
        }
        let fileMatch;
        if (isSearchTreeFileMatch(args)) {
            fileMatch = args;
        }
        else {
            args = searchView.getControl().getFocus()[0];
            return;
        }
        paneCompositeService.openPaneComposite(VIEWLET_ID_FILES, 0 /* ViewContainerLocation.Sidebar */, false).then((viewlet) => {
            if (!viewlet) {
                return;
            }
            const explorerViewContainer = viewlet.getViewPaneContainer();
            const uri = fileMatch.resource;
            if (uri && contextService.isInsideWorkspace(uri)) {
                const explorerView = explorerViewContainer.getExplorerView();
                explorerView.setExpanded(true);
                explorerService.select(uri, true).then(() => explorerView.focus(), onUnexpectedError);
            }
        });
    }
});
// Find in Files by default is the same as View: Show Search, but can be configured to open a search editor instead with the `search.mode` binding
registerAction2(class FindInFilesAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.findInFiles" /* Constants.SearchCommandIds.FindInFilesActionId */,
            title: {
                ...nls.localize2('findInFiles', "Find in Files"),
                mnemonicTitle: nls.localize({ key: 'miFindInFiles', comment: ['&& denotes a mnemonic'] }, "Find &&in Files"),
            },
            metadata: {
                description: nls.localize('findInFiles.description', "Open a workspace search"),
                args: [
                    {
                        name: nls.localize('findInFiles.args', "A set of options for the search"),
                        schema: {
                            type: 'object',
                            properties: {
                                query: { 'type': 'string' },
                                replace: { 'type': 'string' },
                                preserveCase: { 'type': 'boolean' },
                                triggerSearch: { 'type': 'boolean' },
                                filesToInclude: { 'type': 'string' },
                                filesToExclude: { 'type': 'string' },
                                isRegex: { 'type': 'boolean' },
                                isCaseSensitive: { 'type': 'boolean' },
                                matchWholeWord: { 'type': 'boolean' },
                                useExcludeSettingsAndIgnoreFiles: { 'type': 'boolean' },
                                onlyOpenEditors: { 'type': 'boolean' },
                                showIncludesExcludes: { 'type': 'boolean' }
                            }
                        }
                    },
                ]
            },
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            },
            menu: [{
                    id: MenuId.MenubarEditMenu,
                    group: '4_find_global',
                    order: 1,
                }],
            f1: true
        });
    }
    async run(accessor, args = {}) {
        findInFilesCommand(accessor, args);
    }
});
registerAction2(class FindInFolderAction extends Action2 {
    // from explorer
    constructor() {
        super({
            id: "filesExplorer.findInFolder" /* Constants.SearchCommandIds.FindInFolderId */,
            title: nls.localize2('findInFolder', "Find in Folder..."),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
            },
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: '4_search',
                    order: 10,
                    when: ExplorerFolderContext
                }
            ]
        });
    }
    async run(accessor, resource) {
        await searchWithFolderCommand(accessor, true, true, resource);
    }
});
registerAction2(class FindInWorkspaceAction extends Action2 {
    // from explorer
    constructor() {
        super({
            id: "filesExplorer.findInWorkspace" /* Constants.SearchCommandIds.FindInWorkspaceId */,
            title: nls.localize2('findInWorkspace', "Find in Workspace..."),
            category,
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: '4_search',
                    order: 10,
                    when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext.toNegated())
                }
            ]
        });
    }
    async run(accessor) {
        const searchConfig = accessor.get(IConfigurationService).getValue().search;
        const mode = searchConfig.mode;
        if (mode === 'view') {
            const searchView = await openSearchView(accessor.get(IViewsService), true);
            searchView?.searchInFolders();
        }
        else {
            return accessor.get(ICommandService).executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                location: mode === 'newEditor' ? 'new' : 'reuse',
                filesToInclude: '',
            });
        }
    }
});
//#region Helpers
async function expandSelectSubtree(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        const selected = viewer.getFocus()[0];
        await forcedExpandRecursively(viewer, selected);
    }
}
async function searchWithFolderCommand(accessor, isFromExplorer, isIncludes, resource, folderMatch) {
    const fileService = accessor.get(IFileService);
    const viewsService = accessor.get(IViewsService);
    const contextService = accessor.get(IWorkspaceContextService);
    const commandService = accessor.get(ICommandService);
    const searchConfig = accessor.get(IConfigurationService).getValue().search;
    const mode = searchConfig.mode;
    let resources;
    if (isFromExplorer) {
        resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    }
    else {
        const searchView = getSearchView(viewsService);
        if (!searchView) {
            return;
        }
        resources = getMultiSelectedSearchResources(searchView.getControl(), folderMatch, searchConfig);
    }
    const resolvedResources = fileService.resolveAll(resources.map(resource => ({ resource }))).then(results => {
        const folders = [];
        results.forEach(result => {
            if (result.success && result.stat) {
                folders.push(result.stat.isDirectory ? result.stat.resource : dirname(result.stat.resource));
            }
        });
        return resolveResourcesForSearchIncludes(folders, contextService);
    });
    if (mode === 'view') {
        const searchView = await openSearchView(viewsService, true);
        if (resources && resources.length && searchView) {
            if (isIncludes) {
                searchView.searchInFolders(await resolvedResources);
            }
            else {
                searchView.searchOutsideOfFolders(await resolvedResources);
            }
        }
        return undefined;
    }
    else {
        if (isIncludes) {
            return commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                filesToInclude: (await resolvedResources).join(', '),
                showIncludesExcludes: true,
                location: mode === 'newEditor' ? 'new' : 'reuse',
            });
        }
        else {
            return commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                filesToExclude: (await resolvedResources).join(', '),
                showIncludesExcludes: true,
                location: mode === 'newEditor' ? 'new' : 'reuse',
            });
        }
    }
}
function getMultiSelectedSearchResources(viewer, currElement, sortConfig) {
    return getElementsToOperateOn(viewer, currElement, sortConfig)
        .map((renderableMatch) => ((isSearchTreeMatch(renderableMatch)) ? null : renderableMatch.resource))
        .filter((renderableMatch) => (renderableMatch !== null));
}
export async function findInFilesCommand(accessor, _args = {}) {
    const searchConfig = accessor.get(IConfigurationService).getValue().search;
    const viewsService = accessor.get(IViewsService);
    const commandService = accessor.get(ICommandService);
    const args = {};
    if (Object.keys(_args).length !== 0) {
        // resolve variables in the same way as in
        // https://github.com/microsoft/vscode/blob/8b76efe9d317d50cb5b57a7658e09ce6ebffaf36/src/vs/workbench/contrib/searchEditor/browser/searchEditorActions.ts#L152-L158
        const configurationResolverService = accessor.get(IConfigurationResolverService);
        const historyService = accessor.get(IHistoryService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot();
        const filteredActiveWorkspaceRootUri = activeWorkspaceRootUri?.scheme === Schemas.file || activeWorkspaceRootUri?.scheme === Schemas.vscodeRemote ? activeWorkspaceRootUri : undefined;
        const lastActiveWorkspaceRoot = filteredActiveWorkspaceRootUri ? workspaceContextService.getWorkspaceFolder(filteredActiveWorkspaceRootUri) ?? undefined : undefined;
        for (const entry of Object.entries(_args)) {
            const name = entry[0];
            const value = entry[1];
            if (value !== undefined) {
                args[name] = (typeof value === 'string') ? await configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, value) : value;
            }
        }
    }
    const mode = searchConfig.mode;
    if (mode === 'view') {
        openSearchView(viewsService, false).then(openedView => {
            if (openedView) {
                const searchAndReplaceWidget = openedView.searchAndReplaceWidget;
                searchAndReplaceWidget.toggleReplace(typeof args.replace === 'string');
                let updatedText = false;
                if (typeof args.query !== 'string') {
                    updatedText = openedView.updateTextFromFindWidgetOrSelection({ allowUnselectedWord: typeof args.replace !== 'string' });
                }
                openedView.setSearchParameters(args);
                if (typeof args.showIncludesExcludes === 'boolean') {
                    openedView.toggleQueryDetails(false, args.showIncludesExcludes);
                }
                openedView.searchAndReplaceWidget.focus(undefined, updatedText, updatedText);
            }
        });
    }
    else {
        const convertArgs = (args) => ({
            location: mode === 'newEditor' ? 'new' : 'reuse',
            query: args.query,
            filesToInclude: args.filesToInclude,
            filesToExclude: args.filesToExclude,
            matchWholeWord: args.matchWholeWord,
            isCaseSensitive: args.isCaseSensitive,
            isRegexp: args.isRegex,
            useExcludeSettingsAndIgnoreFiles: args.useExcludeSettingsAndIgnoreFiles,
            onlyOpenEditors: args.onlyOpenEditors,
            showIncludesExcludes: !!(args.filesToExclude || args.filesToExclude || !args.useExcludeSettingsAndIgnoreFiles),
        });
        commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, convertArgs(args));
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0ZpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNGaW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsWUFBWSxFQUFzQyxNQUFNLGtEQUFrRCxDQUFDO0FBRXBILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFDO0FBQ3BELE9BQU8sS0FBSyxxQkFBcUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUlqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHbEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSwy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