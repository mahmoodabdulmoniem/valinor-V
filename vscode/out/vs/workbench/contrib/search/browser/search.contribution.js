/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../../base/common/platform.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import * as nls from '../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { defaultQuickAccessContextKeyValue } from '../../../browser/quickaccess.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { AnythingQuickAccessProvider } from './anythingQuickAccess.js';
import { registerContributions as replaceContributions } from './replaceContributions.js';
import { registerContributions as notebookSearchContributions } from './notebookSearch/notebookSearchContributions.js';
import { searchViewIcon } from './searchIcons.js';
import { SearchView } from './searchView.js';
import { registerContributions as searchWidgetContributions } from './searchWidget.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { SearchViewModelWorkbenchService } from './searchTreeModel/searchModel.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { SEARCH_EXCLUDE_CONFIG, VIEWLET_ID, VIEW_ID, DEFAULT_MAX_SEARCH_RESULTS } from '../../../services/search/common/search.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { getWorkspaceSymbols } from '../common/search.js';
import { SearchChatContextContribution } from './chatContributions.js';
import './searchActionsCopy.js';
import './searchActionsFind.js';
import './searchActionsNav.js';
import './searchActionsRemoveReplace.js';
import './searchActionsSymbol.js';
import './searchActionsTopBar.js';
import './searchActionsTextQuickAccess.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX, TextSearchQuickAccess } from './quickTextSearch/textSearchQuickAccess.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
registerSingleton(ISearchViewModelWorkbenchService, SearchViewModelWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISearchHistoryService, SearchHistoryService, 1 /* InstantiationType.Delayed */);
replaceContributions();
notebookSearchContributions();
searchWidgetContributions();
registerWorkbenchContribution2(SearchChatContextContribution.ID, SearchChatContextContribution, 3 /* WorkbenchPhase.AfterRestored */);
const SEARCH_MODE_CONFIG = 'search.mode';
const viewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('search', "Search"),
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }]),
    hideIfEmpty: true,
    icon: searchViewIcon,
    order: 1,
}, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
const viewDescriptor = {
    id: VIEW_ID,
    containerIcon: searchViewIcon,
    name: nls.localize2('search', "Search"),
    ctorDescriptor: new SyncDescriptor(SearchView),
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: viewContainer.id,
        mnemonicTitle: nls.localize({ key: 'miViewSearch', comment: ['&& denotes a mnemonic'] }, "&&Search"),
        keybindings: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            // Yes, this is weird. See #116188, #115556, #115511, and now #124146, for examples of what can go wrong here.
            when: ContextKeyExpr.regex('neverMatch', /doesNotMatch/)
        },
        order: 1
    }
};
// Register search default location to sidebar
Registry.as(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);
// Register Quick Access Handler
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AnythingQuickAccessProvider,
    prefix: AnythingQuickAccessProvider.PREFIX,
    placeholder: nls.localize('anythingQuickAccessPlaceholder', "Search files by name (append {0} to go to line or {1} to go to symbol)", AbstractGotoLineQuickAccessProvider.PREFIX, GotoSymbolQuickAccessProvider.PREFIX),
    contextKey: defaultQuickAccessContextKeyValue,
    helpEntries: [{
            description: nls.localize('anythingQuickAccess', "Go to File"),
            commandId: 'workbench.action.quickOpen',
            commandCenterOrder: 10
        }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: SymbolsQuickAccessProvider,
    prefix: SymbolsQuickAccessProvider.PREFIX,
    placeholder: nls.localize('symbolsQuickAccessPlaceholder', "Type the name of a symbol to open."),
    contextKey: 'inWorkspaceSymbolsPicker',
    helpEntries: [{ description: nls.localize('symbolsQuickAccess', "Go to Symbol in Workspace"), commandId: "workbench.action.showAllSymbols" /* Constants.SearchCommandIds.ShowAllSymbolsActionId */ }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TextSearchQuickAccess,
    prefix: TEXT_SEARCH_QUICK_ACCESS_PREFIX,
    contextKey: 'inTextSearchPicker',
    placeholder: nls.localize('textSearchPickerPlaceholder', "Search for text in your workspace files."),
    helpEntries: [
        {
            description: nls.localize('textSearchPickerHelp', "Search for Text"),
            commandId: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            commandCenterOrder: 25,
        }
    ]
});
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'search',
    order: 13,
    title: nls.localize('searchConfigurationTitle', "Search"),
    type: 'object',
    properties: {
        [SEARCH_EXCLUDE_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize('exclude', "Configure [glob patterns](https://code.visualstudio.com/docs/editor/codebasics#_advanced-search-options) for excluding files and folders in fulltext searches and file search in quick open. To exclude files from the recently opened list in quick open, patterns must be absolute (for example `**/node_modules/**`). Inherits all glob patterns from the `#files.exclude#` setting."),
            default: { '**/node_modules': true, '**/bower_components': true, '**/*.code-search': true },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        description: nls.localize('exclude.boolean', "The glob pattern to match file paths against. Set to true or false to enable or disable the pattern."),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                markdownDescription: nls.localize({ key: 'exclude.when', comment: ['\\$(basename) should not be translated'] }, 'Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.')
                            }
                        }
                    }
                ]
            },
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        [SEARCH_MODE_CONFIG]: {
            type: 'string',
            enum: ['view', 'reuseEditor', 'newEditor'],
            default: 'view',
            markdownDescription: nls.localize('search.mode', "Controls where new `Search: Find in Files` and `Find in Folder` operations occur: either in the Search view, or in a search editor."),
            enumDescriptions: [
                nls.localize('search.mode.view', "Search in the Search view, either in the panel or side bars."),
                nls.localize('search.mode.reuseEditor', "Search in an existing search editor if present, otherwise in a new search editor."),
                nls.localize('search.mode.newEditor', "Search in a new search editor."),
            ]
        },
        'search.useRipgrep': {
            type: 'boolean',
            description: nls.localize('useRipgrep', "This setting is deprecated and now falls back on \"search.usePCRE2\"."),
            deprecationMessage: nls.localize('useRipgrepDeprecated', "Deprecated. Consider \"search.usePCRE2\" for advanced regex feature support."),
            default: true
        },
        'search.maintainFileSearchCache': {
            type: 'boolean',
            deprecationMessage: nls.localize('maintainFileSearchCacheDeprecated', "The search cache is kept in the extension host which never shuts down, so this setting is no longer needed."),
            description: nls.localize('search.maintainFileSearchCache', "When enabled, the searchService process will be kept alive instead of being shut down after an hour of inactivity. This will keep the file search cache in memory."),
            default: false
        },
        'search.useIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useIgnoreFiles', "Controls whether to use `.gitignore` and `.ignore` files when searching for files."),
            default: true,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useGlobalIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useGlobalIgnoreFiles', "Controls whether to use your global gitignore file (for example, from `$HOME/.config/git/ignore`) when searching for files. Requires {0} to be enabled.", '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useParentIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useParentIgnoreFiles', "Controls whether to use `.gitignore` and `.ignore` files in parent directories when searching for files. Requires {0} to be enabled.", '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.quickOpen.includeSymbols': {
            type: 'boolean',
            description: nls.localize('search.quickOpen.includeSymbols', "Whether to include results from a global symbol search in the file results for Quick Open."),
            default: false
        },
        'search.ripgrep.maxThreads': {
            type: 'number',
            description: nls.localize('search.ripgrep.maxThreads', "Number of threads to use for searching. When set to 0, the engine automatically determines this value."),
            default: 0
        },
        'search.quickOpen.includeHistory': {
            type: 'boolean',
            description: nls.localize('search.quickOpen.includeHistory', "Whether to include results from recently opened files in the file results for Quick Open."),
            default: true
        },
        'search.quickOpen.history.filterSortOrder': {
            type: 'string',
            enum: ['default', 'recency'],
            default: 'default',
            enumDescriptions: [
                nls.localize('filterSortOrder.default', 'History entries are sorted by relevance based on the filter value used. More relevant entries appear first.'),
                nls.localize('filterSortOrder.recency', 'History entries are sorted by recency. More recently opened entries appear first.')
            ],
            description: nls.localize('filterSortOrder', "Controls sorting order of editor history in quick open when filtering.")
        },
        'search.followSymlinks': {
            type: 'boolean',
            description: nls.localize('search.followSymlinks', "Controls whether to follow symlinks while searching."),
            default: true
        },
        'search.smartCase': {
            type: 'boolean',
            description: nls.localize('search.smartCase', "Search case-insensitively if the pattern is all lowercase, otherwise, search case-sensitively."),
            default: false
        },
        'search.globalFindClipboard': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.globalFindClipboard', "Controls whether the Search view should read or modify the shared find clipboard on macOS."),
            included: platform.isMacintosh
        },
        'search.location': {
            type: 'string',
            enum: ['sidebar', 'panel'],
            default: 'sidebar',
            description: nls.localize('search.location', "Controls whether the search will be shown as a view in the sidebar or as a panel in the panel area for more horizontal space."),
            deprecationMessage: nls.localize('search.location.deprecationMessage', "This setting is deprecated. You can drag the search icon to a new location instead.")
        },
        'search.maxResults': {
            type: ['number', 'null'],
            default: DEFAULT_MAX_SEARCH_RESULTS,
            markdownDescription: nls.localize('search.maxResults', "Controls the maximum number of search results, this can be set to `null` (empty) to return unlimited results.")
        },
        'search.collapseResults': {
            type: 'string',
            enum: ['auto', 'alwaysCollapse', 'alwaysExpand'],
            enumDescriptions: [
                nls.localize('search.collapseResults.auto', "Files with less than 10 results are expanded. Others are collapsed."),
                '',
                ''
            ],
            default: 'alwaysExpand',
            description: nls.localize('search.collapseAllResults', "Controls whether the search results will be collapsed or expanded."),
        },
        'search.useReplacePreview': {
            type: 'boolean',
            default: true,
            description: nls.localize('search.useReplacePreview', "Controls whether to open Replace Preview when selecting or replacing a match."),
        },
        'search.showLineNumbers': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.showLineNumbers', "Controls whether to show line numbers for search results."),
        },
        'search.usePCRE2': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.usePCRE2', "Whether to use the PCRE2 regex engine in text search. This enables using some advanced regex features like lookahead and backreferences. However, not all PCRE2 features are supported - only features that are also supported by JavaScript."),
            deprecationMessage: nls.localize('usePCRE2Deprecated', "Deprecated. PCRE2 will be used automatically when using regex features that are only supported by PCRE2."),
        },
        'search.actionsPosition': {
            type: 'string',
            enum: ['auto', 'right'],
            enumDescriptions: [
                nls.localize('search.actionsPositionAuto', "Position the actionbar to the right when the Search view is narrow, and immediately after the content when the Search view is wide."),
                nls.localize('search.actionsPositionRight', "Always position the actionbar to the right."),
            ],
            default: 'right',
            description: nls.localize('search.actionsPosition', "Controls the positioning of the actionbar on rows in the Search view.")
        },
        'search.searchOnType': {
            type: 'boolean',
            default: true,
            description: nls.localize('search.searchOnType', "Search all files as you type.")
        },
        'search.seedWithNearestWord': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.seedWithNearestWord', "Enable seeding search from the word nearest the cursor when the active editor has no selection.")
        },
        'search.seedOnFocus': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('search.seedOnFocus', "Update the search query to the editor's selected text when focusing the Search view. This happens either on click or when triggering the `workbench.views.search.focus` command.")
        },
        'search.searchOnTypeDebouncePeriod': {
            type: 'number',
            default: 300,
            markdownDescription: nls.localize('search.searchOnTypeDebouncePeriod', "When {0} is enabled, controls the timeout in milliseconds between a character being typed and the search starting. Has no effect when {0} is disabled.", '`#search.searchOnType#`')
        },
        'search.searchEditor.doubleClickBehaviour': {
            type: 'string',
            enum: ['selectWord', 'goToLocation', 'openLocationToSide'],
            default: 'goToLocation',
            enumDescriptions: [
                nls.localize('search.searchEditor.doubleClickBehaviour.selectWord', "Double-clicking selects the word under the cursor."),
                nls.localize('search.searchEditor.doubleClickBehaviour.goToLocation', "Double-clicking opens the result in the active editor group."),
                nls.localize('search.searchEditor.doubleClickBehaviour.openLocationToSide', "Double-clicking opens the result in the editor group to the side, creating one if it does not yet exist."),
            ],
            markdownDescription: nls.localize('search.searchEditor.doubleClickBehaviour', "Configure effect of double-clicking a result in a search editor.")
        },
        'search.searchEditor.singleClickBehaviour': {
            type: 'string',
            enum: ['default', 'peekDefinition',],
            default: 'default',
            enumDescriptions: [
                nls.localize('search.searchEditor.singleClickBehaviour.default', "Single-clicking does nothing."),
                nls.localize('search.searchEditor.singleClickBehaviour.peekDefinition', "Single-clicking opens a Peek Definition window."),
            ],
            markdownDescription: nls.localize('search.searchEditor.singleClickBehaviour', "Configure effect of single-clicking a result in a search editor.")
        },
        'search.searchEditor.reusePriorSearchConfiguration': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize({ key: 'search.searchEditor.reusePriorSearchConfiguration', comment: ['"Search Editor" is a type of editor that can display search results. "includes, excludes, and flags" refers to the "files to include" and "files to exclude" input boxes, and the flags that control whether a query is case-sensitive or a regex.'] }, "When enabled, new Search Editors will reuse the includes, excludes, and flags of the previously opened Search Editor.")
        },
        'search.searchEditor.defaultNumberOfContextLines': {
            type: ['number', 'null'],
            default: 1,
            markdownDescription: nls.localize('search.searchEditor.defaultNumberOfContextLines', "The default number of surrounding context lines to use when creating new Search Editors. If using `#search.searchEditor.reusePriorSearchConfiguration#`, this can be set to `null` (empty) to use the prior Search Editor's configuration.")
        },
        'search.searchEditor.focusResultsOnSearch': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('search.searchEditor.focusResultsOnSearch', "When a search is triggered, focus the Search Editor results instead of the Search Editor input.")
        },
        'search.sortOrder': {
            type: 'string',
            enum: ["default" /* SearchSortOrder.Default */, "fileNames" /* SearchSortOrder.FileNames */, "type" /* SearchSortOrder.Type */, "modified" /* SearchSortOrder.Modified */, "countDescending" /* SearchSortOrder.CountDescending */, "countAscending" /* SearchSortOrder.CountAscending */],
            default: "default" /* SearchSortOrder.Default */,
            enumDescriptions: [
                nls.localize('searchSortOrder.default', "Results are sorted by folder and file names, in alphabetical order."),
                nls.localize('searchSortOrder.filesOnly', "Results are sorted by file names ignoring folder order, in alphabetical order."),
                nls.localize('searchSortOrder.type', "Results are sorted by file extensions, in alphabetical order."),
                nls.localize('searchSortOrder.modified', "Results are sorted by file last modified date, in descending order."),
                nls.localize('searchSortOrder.countDescending', "Results are sorted by count per file, in descending order."),
                nls.localize('searchSortOrder.countAscending', "Results are sorted by count per file, in ascending order.")
            ],
            description: nls.localize('search.sortOrder', "Controls sorting order of search results.")
        },
        'search.decorations.colors': {
            type: 'boolean',
            description: nls.localize('search.decorations.colors', "Controls whether search file decorations should use colors."),
            default: true
        },
        'search.decorations.badges': {
            type: 'boolean',
            description: nls.localize('search.decorations.badges', "Controls whether search file decorations should use badges."),
            default: true
        },
        'search.defaultViewMode': {
            type: 'string',
            enum: ["tree" /* ViewMode.Tree */, "list" /* ViewMode.List */],
            default: "list" /* ViewMode.List */,
            enumDescriptions: [
                nls.localize('scm.defaultViewMode.tree', "Shows search results as a tree."),
                nls.localize('scm.defaultViewMode.list', "Shows search results as a list.")
            ],
            description: nls.localize('search.defaultViewMode', "Controls the default search result view mode.")
        },
        'search.quickAccess.preserveInput': {
            type: 'boolean',
            description: nls.localize('search.quickAccess.preserveInput', "Controls whether the last typed input to Quick Search should be restored when opening it the next time."),
            default: false
        },
        'search.experimental.closedNotebookRichContentResults': {
            type: 'boolean',
            description: nls.localize('search.experimental.closedNotebookResults', "Show notebook editor rich content results for closed notebooks. Please refresh your search results after changing this setting."),
            default: false
        },
        'search.searchView.semanticSearchBehavior': {
            type: 'string',
            description: nls.localize('search.searchView.semanticSearchBehavior', "Controls the behavior of the semantic search results displayed in the Search view."),
            enum: ["manual" /* SemanticSearchBehavior.Manual */, "runOnEmpty" /* SemanticSearchBehavior.RunOnEmpty */, "auto" /* SemanticSearchBehavior.Auto */],
            default: "manual" /* SemanticSearchBehavior.Manual */,
            enumDescriptions: [
                nls.localize('search.searchView.semanticSearchBehavior.manual', "Only request semantic search results manually."),
                nls.localize('search.searchView.semanticSearchBehavior.runOnEmpty', "Request semantic results automatically only when text search results are empty."),
                nls.localize('search.searchView.semanticSearchBehavior.auto', "Request semantic results automatically with every search.")
            ],
            tags: ['preview'],
        },
        'search.searchView.keywordSuggestions': {
            type: 'boolean',
            description: nls.localize('search.searchView.keywordSuggestions', "Enable keyword suggestions in the Search view."),
            default: false,
            tags: ['preview'],
        },
    }
});
CommandsRegistry.registerCommand('_executeWorkspaceSymbolProvider', async function (accessor, ...args) {
    const [query] = args;
    assertType(typeof query === 'string');
    const result = await getWorkspaceSymbols(query);
    return result.map(item => item.symbol);
});
// todo: @andreamah get rid of this after a few iterations
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'search.experimental.quickAccess.preserveInput',
        migrateFn: (value, _accessor) => ([
            ['search.quickAccess.preserveInput', { value }],
            ['search.experimental.quickAccess.preserveInput', { value: undefined }]
        ])
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzVILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFzQixVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDdkssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsSUFBSSxxQkFBcUIsRUFBd0IsTUFBTSx1REFBdUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLFVBQVUsSUFBSSxjQUFjLEVBQW1GLE1BQU0sMEJBQTBCLENBQUM7QUFDekosT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixJ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