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
var SearchView_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { ObjectTreeElementCollapseState } from '../../../../base/browser/ui/tree/tree.js';
import { Delayer, RunOnceScheduler, Throttler } from '../../../../base/common/async.js';
import * as errors from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import * as network from '../../../../base/common/network.js';
import './media/searchview.css';
import { getCodeEditor, isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { CommonFindController } from '../../../../editor/contrib/find/browser/findController.js';
import { MultiCursorSelectionController } from '../../../../editor/contrib/multicursor/browser/multicursor.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getSelectionKeyboardEvent, WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService, withSelection } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { defaultInputBoxStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { OpenFolderAction } from '../../../browser/actions/workspaceActions.js';
import { ResourceListDnDHandler } from '../../../browser/dnd.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { NotebookEditor } from '../../notebook/browser/notebookEditor.js';
import { ExcludePatternInputWidget, IncludePatternInputWidget } from './patternInputWidget.js';
import { appendKeyBindingLabel } from './searchActionsBase.js';
import { searchDetailsIcon } from './searchIcons.js';
import { renderSearchMessage } from './searchMessage.js';
import { FileMatchRenderer, FolderMatchRenderer, MatchRenderer, SearchAccessibilityProvider, SearchDelegate, TextSearchResultRenderer } from './searchResultsView.js';
import { SearchWidget } from './searchWidget.js';
import * as Constants from '../common/constants.js';
import { IReplaceService } from './replace.js';
import { getOutOfWorkspaceEditorResources, SearchStateKey, SearchUIState } from '../common/search.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { createEditorFromSearchResult } from '../../searchEditor/browser/searchEditorActions.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService, TextSearchCompleteMessageType, isAIKeyword } from '../../../services/search/common/search.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { isSearchTreeMatch, SearchModelLocation, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchNoRoot, isSearchTreeFolderMatchWithResource, isSearchTreeFolderMatchWorkspaceRoot, isSearchResult, isTextSearchHeading, isSearchHeader } from './searchTreeModel/searchTreeCommon.js';
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
import { searchMatchComparer } from './searchCompare.js';
import { AIFolderMatchWorkspaceRootImpl } from './AISearch/aiSearchModel.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { forcedExpandRecursively } from './searchActionsTopBar.js';
const $ = dom.$;
export var SearchViewPosition;
(function (SearchViewPosition) {
    SearchViewPosition[SearchViewPosition["SideBar"] = 0] = "SideBar";
    SearchViewPosition[SearchViewPosition["Panel"] = 1] = "Panel";
})(SearchViewPosition || (SearchViewPosition = {}));
const SEARCH_CANCELLED_MESSAGE = nls.localize('searchCanceled', "Search was canceled before any results could be found - ");
const DEBOUNCE_DELAY = 75;
let SearchView = class SearchView extends ViewPane {
    static { SearchView_1 = this; }
    static { this.ACTIONS_RIGHT_CLASS_NAME = 'actions-right'; }
    constructor(options, fileService, editorService, codeEditorService, progressService, notificationService, dialogService, commandService, contextViewService, instantiationService, viewDescriptorService, configurationService, contextService, searchViewModelWorkbenchService, contextKeyService, replaceService, textFileService, preferencesService, themeService, searchHistoryService, contextMenuService, accessibilityService, keybindingService, storageService, searchService, openerService, hoverService, notebookService, logService, accessibilitySignalService, telemetryService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.fileService = fileService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.contextViewService = contextViewService;
        this.contextService = contextService;
        this.searchViewModelWorkbenchService = searchViewModelWorkbenchService;
        this.replaceService = replaceService;
        this.textFileService = textFileService;
        this.preferencesService = preferencesService;
        this.searchHistoryService = searchHistoryService;
        this.accessibilityService = accessibilityService;
        this.storageService = storageService;
        this.searchService = searchService;
        this.notebookService = notebookService;
        this.logService = logService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.telemetryService = telemetryService;
        this.isDisposed = false;
        this.lastFocusState = 'input';
        this.messageDisposables = new DisposableStore();
        this.currentSearchQ = Promise.resolve();
        this.pauseSearching = false;
        this._visibleMatches = 0;
        this._cachedKeywords = [];
        this.container = dom.$('.search-view');
        // globals
        this.viewletVisible = Constants.SearchContext.SearchViewVisibleKey.bindTo(this.contextKeyService);
        this.firstMatchFocused = Constants.SearchContext.FirstMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrMatchFocused = Constants.SearchContext.FileMatchOrMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchFocus = Constants.SearchContext.FileMatchOrFolderMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchWithResourceFocus = Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey.bindTo(this.contextKeyService);
        this.fileMatchFocused = Constants.SearchContext.FileFocusKey.bindTo(this.contextKeyService);
        this.folderMatchFocused = Constants.SearchContext.FolderFocusKey.bindTo(this.contextKeyService);
        this.folderMatchWithResourceFocused = Constants.SearchContext.ResourceFolderFocusKey.bindTo(this.contextKeyService);
        this.searchResultHeaderFocused = Constants.SearchContext.SearchResultHeaderFocused.bindTo(this.contextKeyService);
        this.hasSearchResultsKey = Constants.SearchContext.HasSearchResults.bindTo(this.contextKeyService);
        this.matchFocused = Constants.SearchContext.MatchFocusKey.bindTo(this.contextKeyService);
        this.searchStateKey = SearchStateKey.bindTo(this.contextKeyService);
        this.hasSearchPatternKey = Constants.SearchContext.ViewHasSearchPatternKey.bindTo(this.contextKeyService);
        this.hasReplacePatternKey = Constants.SearchContext.ViewHasReplacePatternKey.bindTo(this.contextKeyService);
        this.hasFilePatternKey = Constants.SearchContext.ViewHasFilePatternKey.bindTo(this.contextKeyService);
        this.hasSomeCollapsibleResultKey = Constants.SearchContext.ViewHasSomeCollapsibleKey.bindTo(this.contextKeyService);
        this.treeViewKey = Constants.SearchContext.InTreeViewKey.bindTo(this.contextKeyService);
        this.refreshTreeController = this._register(this.instantiationService.createInstance(RefreshTreeController, this, () => this.searchConfig));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            const keys = Constants.SearchContext.hasAIResultProvider.keys();
            if (e.affectsSome(new Set(keys))) {
                this.refreshHasAISetting();
            }
        }));
        // scoped
        this.contextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        Constants.SearchContext.SearchViewFocusedKey.bindTo(this.contextKeyService).set(true);
        this.inputBoxFocused = Constants.SearchContext.InputBoxFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternIncludesFocused = Constants.SearchContext.PatternIncludesFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternExclusionsFocused = Constants.SearchContext.PatternExcludesFocusedKey.bindTo(this.contextKeyService);
        this.isEditableItem = Constants.SearchContext.IsEditableItemKey.bindTo(this.contextKeyService);
        this.instantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('search.sortOrder')) {
                if (this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                    // If changing away from modified, remove all fileStats
                    // so that updated files are re-retrieved next time.
                    this.removeFileStats();
                }
                await this.refreshTreeController.queue();
            }
        }));
        this.viewModel = this.searchViewModelWorkbenchService.searchModel;
        this.queryBuilder = this.instantiationService.createInstance(QueryBuilder);
        this.memento = new Memento(this.id, storageService);
        this.viewletState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this._register(this.fileService.onDidFilesChange(e => this.onFilesChanged(e)));
        this._register(this.textFileService.untitled.onWillDispose(model => this.onUntitledDidDispose(model.resource)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onDidChangeWorkbenchState()));
        this._register(this.searchHistoryService.onDidClearHistory(() => this.clearHistory()));
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this.delayedRefresh = this._register(new Delayer(250));
        this.addToSearchHistoryDelayer = this._register(new Delayer(2000));
        this.toggleCollapseStateDelayer = this._register(new Delayer(100));
        this.triggerQueryDelayer = this._register(new Delayer(0));
        this.treeAccessibilityProvider = this.instantiationService.createInstance(SearchAccessibilityProvider, this);
        this.isTreeLayoutViewVisible = this.viewletState['view.treeLayout'] ?? (this.searchConfig.defaultViewMode === "tree" /* ViewMode.Tree */);
        this._refreshResultsScheduler = this._register(new RunOnceScheduler(this._updateResults.bind(this), 80));
        // storage service listener for for roaming changes
        this._register(this.storageService.onWillSaveState(() => {
            this._saveSearchHistoryService();
        }));
        this._register(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, SearchHistoryService.SEARCH_HISTORY_KEY, this._store)(() => {
            const restoredHistory = this.searchHistoryService.load();
            if (restoredHistory.include) {
                this.inputPatternIncludes.prependHistory(restoredHistory.include);
            }
            if (restoredHistory.exclude) {
                this.inputPatternExcludes.prependHistory(restoredHistory.exclude);
            }
            if (restoredHistory.search) {
                this.searchWidget.prependSearchHistory(restoredHistory.search);
            }
            if (restoredHistory.replace) {
                this.searchWidget.prependReplaceHistory(restoredHistory.replace);
            }
        }));
        this.changedWhileHidden = this.hasSearchResults();
    }
    get cachedResults() {
        return this._cachedResults;
    }
    async queueRefreshTree() {
        return this.refreshTreeController.queue();
    }
    get isTreeLayoutViewVisible() {
        return this.treeViewKey.get() ?? false;
    }
    set isTreeLayoutViewVisible(visible) {
        this.treeViewKey.set(visible);
    }
    async setTreeView(visible) {
        if (visible === this.isTreeLayoutViewVisible) {
            return;
        }
        this.isTreeLayoutViewVisible = visible;
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        return this.refreshTreeController.queue();
    }
    get state() {
        return this.searchStateKey.get() ?? SearchUIState.Idle;
    }
    set state(v) {
        this.searchStateKey.set(v);
    }
    getContainer() {
        return this.container;
    }
    get searchResult() {
        return this.viewModel && this.viewModel.searchResult;
    }
    get model() {
        return this.viewModel;
    }
    async refreshHasAISetting() {
        const shouldShowAI = this.shouldShowAIResults();
        if (!this.tree || !this.tree.hasNode(this.searchResult)) {
            return;
        }
        if (shouldShowAI && !this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            if (this.model.searchResult.getCachedSearchComplete(false)) {
                return this.refreshAndUpdateCount();
            }
        }
        else if (!shouldShowAI && this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            return this.refreshAndUpdateCount();
        }
    }
    onDidChangeWorkbenchState() {
        if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ && this.searchWithoutFolderMessageElement) {
            dom.hide(this.searchWithoutFolderMessageElement);
        }
    }
    refreshInputs() {
        this.pauseSearching = true;
        this.searchWidget.setValue(this.viewModel.searchResult.query?.contentPattern.pattern ?? '');
        this.searchWidget.setReplaceAllActionState(false);
        this.searchWidget.toggleReplace(true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(this.viewModel.searchResult.query?.onlyOpenEditors || false);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(!this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles || true);
        this.searchIncludePattern.setValue('');
        this.searchExcludePattern.setValue('');
        this.pauseSearching = false;
    }
    async replaceSearchModel(searchModel, asyncResults) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 0 }, _progress => {
            return new Promise(resolve => progressComplete = resolve);
        });
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._refreshResultsScheduler.schedule();
        // remove old model and use the new searchModel
        searchModel.location = SearchModelLocation.PANEL;
        searchModel.replaceActive = this.viewModel.isReplaceActive();
        searchModel.replaceString = this.searchWidget.getReplaceValue();
        this._onSearchResultChangedDisposable?.dispose();
        this._onSearchResultChangedDisposable = this._register(searchModel.onSearchResultChanged(async (event) => this.onSearchResultsChanged(event)));
        // this call will also dispose of the old model
        this.searchViewModelWorkbenchService.searchModel = searchModel;
        this.viewModel = searchModel;
        this.tree.setInput(this.viewModel.searchResult);
        await this.onSearchResultsChanged();
        this.refreshInputs();
        asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            return this.onSearchComplete(progressComplete, undefined, undefined, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, undefined, undefined);
        });
        await this.expandIfSingularResult();
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.container = dom.append(parent, dom.$('.search-view'));
        this.searchWidgetsContainerElement = dom.append(this.container, $('.search-widgets-container'));
        this.createSearchWidget(this.searchWidgetsContainerElement);
        const history = this.searchHistoryService.load();
        const filePatterns = this.viewletState['query.filePatterns'] || '';
        const patternExclusions = this.viewletState['query.folderExclusions'] || '';
        const patternExclusionsHistory = history.exclude || [];
        const patternIncludes = this.viewletState['query.folderIncludes'] || '';
        const patternIncludesHistory = history.include || [];
        const onlyOpenEditors = this.viewletState['query.onlyOpenEditors'] || false;
        const queryDetailsExpanded = this.viewletState['query.queryDetailsExpanded'] || '';
        const useExcludesAndIgnoreFiles = typeof this.viewletState['query.useExcludesAndIgnoreFiles'] === 'boolean' ?
            this.viewletState['query.useExcludesAndIgnoreFiles'] : true;
        this.queryDetails = dom.append(this.searchWidgetsContainerElement, $('.query-details'));
        // Toggle query details button
        const toggleQueryDetailsLabel = nls.localize('moreSearch', "Toggle Search Details");
        this.toggleQueryDetailsButton = dom.append(this.queryDetails, $('.more' + ThemeIcon.asCSSSelector(searchDetailsIcon), { tabindex: 0, role: 'button', 'aria-label': toggleQueryDetailsLabel }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.toggleQueryDetailsButton, toggleQueryDetailsLabel));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.CLICK, e => {
            dom.EventHelper.stop(e);
            this.toggleQueryDetails(!this.accessibilityService.isScreenReaderOptimized());
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e);
                this.toggleQueryDetails(false);
            }
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this.searchWidget.isReplaceActive()) {
                    this.searchWidget.focusReplaceAllAction();
                }
                else {
                    this.searchWidget.isReplaceShown() ? this.searchWidget.replaceInput?.focusOnPreserve() : this.searchWidget.focusRegexAction();
                }
                dom.EventHelper.stop(e);
            }
        }));
        // folder includes list
        const folderIncludesList = dom.append(this.queryDetails, $('.file-types.includes'));
        const filesToIncludeTitle = nls.localize('searchScope.includes', "files to include");
        dom.append(folderIncludesList, $('h4', undefined, filesToIncludeTitle));
        this.inputPatternIncludes = this._register(this.instantiationService.createInstance(IncludePatternInputWidget, folderIncludesList, this.contextViewService, {
            ariaLabel: filesToIncludeTitle,
            placeholder: nls.localize('placeholder.includes', "e.g. *.ts, src/**/include"),
            showPlaceholderOnFocus: true,
            history: patternIncludesHistory,
            inputBoxStyles: defaultInputBoxStyles
        }));
        this.inputPatternIncludes.setValue(patternIncludes);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(onlyOpenEditors);
        this._register(this.inputPatternIncludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternIncludes.onChangeSearchInEditorsBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternIncludes.inputFocusTracker, this.inputPatternIncludesFocused);
        // excludes list
        const excludesList = dom.append(this.queryDetails, $('.file-types.excludes'));
        const excludesTitle = nls.localize('searchScope.excludes', "files to exclude");
        dom.append(excludesList, $('h4', undefined, excludesTitle));
        this.inputPatternExcludes = this._register(this.instantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
            ariaLabel: excludesTitle,
            placeholder: nls.localize('placeholder.excludes', "e.g. *.ts, src/**/exclude"),
            showPlaceholderOnFocus: true,
            history: patternExclusionsHistory,
            inputBoxStyles: defaultInputBoxStyles
        }));
        this.inputPatternExcludes.setValue(patternExclusions);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(useExcludesAndIgnoreFiles);
        this._register(this.inputPatternExcludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternExcludes.inputFocusTracker, this.inputPatternExclusionsFocused);
        const updateHasFilePatternKey = () => this.hasFilePatternKey.set(this.inputPatternIncludes.getValue().length > 0 || this.inputPatternExcludes.getValue().length > 0);
        updateHasFilePatternKey();
        const onFilePatternSubmit = (triggeredOnType) => {
            this.triggerQueryChange({ triggeredOnType, delay: this.searchConfig.searchOnTypeDebouncePeriod });
            if (triggeredOnType) {
                updateHasFilePatternKey();
            }
        };
        this._register(this.inputPatternIncludes.onSubmit(onFilePatternSubmit));
        this._register(this.inputPatternExcludes.onSubmit(onFilePatternSubmit));
        this.messagesElement = dom.append(this.container, $('.messages.text-search-provider-messages'));
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        this.createSearchResultsView(this.container);
        if (filePatterns !== '' || patternExclusions !== '' || patternIncludes !== '' || queryDetailsExpanded !== '' || !useExcludesAndIgnoreFiles) {
            this.toggleQueryDetails(true, true, true);
        }
        this._onSearchResultChangedDisposable = this._register(this.viewModel.onSearchResultChanged(async (event) => await this.onSearchResultsChanged(event)));
        // Subscribe to AI search result changes and update the tree when new AI results are reported
        this._onAIResultChangedDisposable?.dispose();
        this._onAIResultChangedDisposable = this._register(this.viewModel.searchResult.aiTextSearchResult.onChange((e) => {
            // Only refresh the AI node, not the whole tree
            if (this.tree && this.tree.hasNode(this.searchResult.aiTextSearchResult) && !e.removed) {
                this.tree.updateChildren(this.searchResult.aiTextSearchResult);
            }
        }));
        this._register(this.onDidChangeBodyVisibility(visible => this.onVisibilityChanged(visible)));
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this._register(this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this));
    }
    updateIndentStyles(theme) {
        this.resultsElement.classList.toggle('hide-arrows', this.isTreeLayoutViewVisible && theme.hidesExplorerArrows);
    }
    async onVisibilityChanged(visible) {
        this.viewletVisible.set(visible);
        if (visible) {
            if (this.changedWhileHidden) {
                // Render if results changed while viewlet was hidden - #37818
                await this.refreshAndUpdateCount();
                this.changedWhileHidden = false;
            }
        }
        else {
            // Reset last focus to input to preserve opening the viewlet always focusing the query editor.
            this.lastFocusState = 'input';
        }
        // Enable highlights if there are searchresults
        this.viewModel?.searchResult.toggleHighlights(visible);
    }
    get searchAndReplaceWidget() {
        return this.searchWidget;
    }
    get searchIncludePattern() {
        return this.inputPatternIncludes;
    }
    get searchExcludePattern() {
        return this.inputPatternExcludes;
    }
    createSearchWidget(container) {
        const contentPattern = this.viewletState['query.contentPattern'] || '';
        const replaceText = this.viewletState['query.replaceText'] || '';
        const isRegex = this.viewletState['query.regex'] === true;
        const isWholeWords = this.viewletState['query.wholeWords'] === true;
        const isCaseSensitive = this.viewletState['query.caseSensitive'] === true;
        const history = this.searchHistoryService.load();
        const searchHistory = history.search || this.viewletState['query.searchHistory'] || [];
        const replaceHistory = history.replace || this.viewletState['query.replaceHistory'] || [];
        const showReplace = typeof this.viewletState['view.showReplace'] === 'boolean' ? this.viewletState['view.showReplace'] : true;
        const preserveCase = this.viewletState['query.preserveCase'] === true;
        const isInNotebookMarkdownInput = this.viewletState['query.isInNotebookMarkdownInput'] ?? true;
        const isInNotebookMarkdownPreview = this.viewletState['query.isInNotebookMarkdownPreview'] ?? true;
        const isInNotebookCellInput = this.viewletState['query.isInNotebookCellInput'] ?? true;
        const isInNotebookCellOutput = this.viewletState['query.isInNotebookCellOutput'] ?? true;
        this.searchWidget = this._register(this.instantiationService.createInstance(SearchWidget, container, {
            value: contentPattern,
            replaceValue: replaceText,
            isRegex: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWholeWords: isWholeWords,
            searchHistory: searchHistory,
            replaceHistory: replaceHistory,
            preserveCase: preserveCase,
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
            notebookOptions: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput,
            }
        }));
        if (!this.searchWidget.searchInput || !this.searchWidget.replaceInput) {
            this.logService.warn(`Cannot fully create search widget. Search or replace input undefined. SearchInput: ${this.searchWidget.searchInput}, ReplaceInput: ${this.searchWidget.replaceInput}`);
            return;
        }
        if (showReplace) {
            this.searchWidget.toggleReplace(true);
        }
        this._register(this.searchWidget.onSearchSubmit(options => {
            const shouldRenderAIResults = this.configurationService.getValue('search').searchView.semanticSearchBehavior;
            if (shouldRenderAIResults === "auto" /* SemanticSearchBehavior.Auto */) {
                this.logService.info(`SearchView: Automatically rendering AI results`);
            }
            this.triggerQueryChange({
                ...options,
                shouldKeepAIResults: false,
                shouldUpdateAISearch: shouldRenderAIResults === "auto" /* SemanticSearchBehavior.Auto */,
            });
        }));
        this._register(this.searchWidget.onSearchCancel(({ focus }) => this.cancelSearch(focus)));
        this._register(this.searchWidget.searchInput.onDidOptionChange(() => {
            this.triggerQueryChange({ shouldKeepAIResults: true });
        }));
        this._register(this.searchWidget.getNotebookFilters().onDidChange(() => this.triggerQueryChange({ shouldKeepAIResults: true })));
        const updateHasPatternKey = () => this.hasSearchPatternKey.set(this.searchWidget.searchInput ? (this.searchWidget.searchInput.getValue().length > 0) : false);
        updateHasPatternKey();
        this._register(this.searchWidget.searchInput.onDidChange(() => updateHasPatternKey()));
        const updateHasReplacePatternKey = () => this.hasReplacePatternKey.set(this.searchWidget.getReplaceValue().length > 0);
        updateHasReplacePatternKey();
        this._register(this.searchWidget.replaceInput.inputBox.onDidChange(() => updateHasReplacePatternKey()));
        this._register(this.searchWidget.onDidHeightChange(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceToggled(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceStateChange(async (state) => {
            this.viewModel.replaceActive = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onPreserveCaseChange(async (state) => {
            this.viewModel.preserveCase = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onReplaceValueChanged(() => {
            this.viewModel.replaceString = this.searchWidget.getReplaceValue();
            this.delayedRefresh.trigger(async () => this.refreshTreeController.queue());
        }));
        this._register(this.searchWidget.onBlur(() => {
            this.toggleQueryDetailsButton.focus();
        }));
        this._register(this.searchWidget.onReplaceAll(() => this.replaceAll()));
        this.trackInputBox(this.searchWidget.searchInputFocusTracker);
        this.trackInputBox(this.searchWidget.replaceInputFocusTracker);
    }
    shouldShowAIResults() {
        const hasProvider = Constants.SearchContext.hasAIResultProvider.getValue(this.contextKeyService);
        return !!hasProvider;
    }
    async onConfigurationUpdated(event) {
        if (event && (event.affectsConfiguration('search.decorations.colors') || event.affectsConfiguration('search.decorations.badges'))) {
            return this.refreshTreeController.queue();
        }
    }
    trackInputBox(inputFocusTracker, contextKey) {
        if (!inputFocusTracker) {
            return;
        }
        this._register(inputFocusTracker.onDidFocus(() => {
            this.lastFocusState = 'input';
            this.inputBoxFocused.set(true);
            contextKey?.set(true);
        }));
        this._register(inputFocusTracker.onDidBlur(() => {
            this.inputBoxFocused.set(this.searchWidget.searchInputHasFocus()
                || this.searchWidget.replaceInputHasFocus()
                || this.inputPatternIncludes.inputHasFocus()
                || this.inputPatternExcludes.inputHasFocus());
            contextKey?.set(false);
        }));
    }
    async onSearchResultsChanged(event) {
        if (this.isVisible()) {
            return this.refreshAndUpdateCount(event);
        }
        else {
            this.changedWhileHidden = true;
        }
    }
    async refreshAndUpdateCount(event) {
        this.searchWidget.setReplaceAllActionState(!this.viewModel.searchResult.isEmpty());
        this.updateSearchResultCount(this.viewModel.searchResult.query.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, event?.clearingAll);
        return this.refreshTreeController.queue(event);
    }
    originalShouldCollapse(match) {
        const collapseResults = this.searchConfig.collapseResults;
        return (collapseResults === 'alwaysCollapse' ||
            (!(isSearchTreeMatch(match)) && match.count() > 10 && collapseResults !== 'alwaysExpand')) ?
            ObjectTreeElementCollapseState.PreserveOrCollapsed : ObjectTreeElementCollapseState.PreserveOrExpanded;
    }
    shouldCollapseAccordingToConfig(match) {
        const collapseResults = this.originalShouldCollapse(match);
        if (collapseResults === ObjectTreeElementCollapseState.PreserveOrCollapsed) {
            return true;
        }
        return false;
    }
    replaceAll() {
        if (this.viewModel.searchResult.count() === 0) {
            return;
        }
        const occurrences = this.viewModel.searchResult.count();
        const fileCount = this.viewModel.searchResult.fileCount();
        const replaceValue = this.searchWidget.getReplaceValue() || '';
        const afterReplaceAllMessage = this.buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue);
        let progressComplete;
        let progressReporter;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 100, total: occurrences }, p => {
            progressReporter = p;
            return new Promise(resolve => progressComplete = resolve);
        });
        const confirmation = {
            title: nls.localize('replaceAll.confirmation.title', "Replace All"),
            message: this.buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue),
            primaryButton: nls.localize({ key: 'replaceAll.confirm.button', comment: ['&& denotes a mnemonic'] }, "&&Replace")
        };
        this.dialogService.confirm(confirmation).then(res => {
            if (res.confirmed) {
                this.searchWidget.setReplaceAllActionState(false);
                this.viewModel.searchResult.replaceAll(progressReporter).then(() => {
                    progressComplete();
                    const messageEl = this.clearMessage();
                    dom.append(messageEl, afterReplaceAllMessage);
                    this.reLayout();
                }, (error) => {
                    progressComplete();
                    errors.isCancellationError(error);
                    this.notificationService.error(error);
                });
            }
            else {
                progressComplete();
            }
        });
    }
    buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue) {
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (replaceValue) {
                    return nls.localize('replaceAll.occurrence.file.message', "Replaced {0} occurrence across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
                }
                return nls.localize('removeAll.occurrence.file.message', "Replaced {0} occurrence across {1} file.", occurrences, fileCount);
            }
            if (replaceValue) {
                return nls.localize('replaceAll.occurrence.files.message', "Replaced {0} occurrence across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrence.files.message', "Replaced {0} occurrence across {1} files.", occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (replaceValue) {
                return nls.localize('replaceAll.occurrences.file.message', "Replaced {0} occurrences across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrences.file.message', "Replaced {0} occurrences across {1} file.", occurrences, fileCount);
        }
        if (replaceValue) {
            return nls.localize('replaceAll.occurrences.files.message', "Replaced {0} occurrences across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
        }
        return nls.localize('removeAll.occurrences.files.message', "Replaced {0} occurrences across {1} files.", occurrences, fileCount);
    }
    buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue) {
        // Helper to truncate long values to 10 lines max
        const truncateValue = (value) => {
            if (!value) {
                return value;
            }
            const lines = value.split('\n');
            if (lines.length > 10) {
                return lines.slice(0, 10).join('\n') + '\n...';
            }
            return value;
        };
        const displayReplaceValue = truncateValue(replaceValue);
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (displayReplaceValue) {
                    return nls.localize('removeAll.occurrence.file.confirmation.message', "Replace {0} occurrence across {1} file with '{2}'?", occurrences, fileCount, displayReplaceValue);
                }
                return nls.localize('replaceAll.occurrence.file.confirmation.message', "Replace {0} occurrence across {1} file?", occurrences, fileCount);
            }
            if (displayReplaceValue) {
                return nls.localize('removeAll.occurrence.files.confirmation.message', "Replace {0} occurrence across {1} files with '{2}'?", occurrences, fileCount, displayReplaceValue);
            }
            return nls.localize('replaceAll.occurrence.files.confirmation.message', "Replace {0} occurrence across {1} files?", occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (displayReplaceValue) {
                return nls.localize('removeAll.occurrences.file.confirmation.message', "Replace {0} occurrences across {1} file with '{2}'?", occurrences, fileCount, displayReplaceValue);
            }
            return nls.localize('replaceAll.occurrences.file.confirmation.message', "Replace {0} occurrences across {1} file?", occurrences, fileCount);
        }
        if (displayReplaceValue) {
            return nls.localize('removeAll.occurrences.files.confirmation.message', "Replace {0} occurrences across {1} files with '{2}'?", occurrences, fileCount, displayReplaceValue);
        }
        return nls.localize('replaceAll.occurrences.files.confirmation.message', "Replace {0} occurrences across {1} files?", occurrences, fileCount);
    }
    clearMessage() {
        this.searchWithoutFolderMessageElement = undefined;
        const wasHidden = this.messagesElement.style.display === 'none';
        dom.clearNode(this.messagesElement);
        dom.show(this.messagesElement);
        this.messageDisposables.clear();
        const newMessage = dom.append(this.messagesElement, $('.message'));
        if (wasHidden) {
            this.reLayout();
        }
        return newMessage;
    }
    createSearchResultsView(container) {
        this.resultsElement = dom.append(container, $('.results.show-file-icons.file-icon-themable-tree'));
        const delegate = this.instantiationService.createInstance(SearchDelegate);
        const identityProvider = {
            getId(element) {
                return element.id();
            }
        };
        this.searchDataSource = this.instantiationService.createInstance(SearchViewDataSource, this);
        this.treeLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility }));
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'SearchView', this.resultsElement, delegate, {
            isIncompressible: (element) => {
                if (isSearchTreeFolderMatch(element) && !isTextSearchHeading(element.parent()) && !(isSearchTreeFolderMatchWorkspaceRoot(element.parent())) && !(isSearchTreeFolderMatchNoRoot(element.parent()))) {
                    return false;
                }
                return true;
            }
        }, [
            this._register(this.instantiationService.createInstance(FolderMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(FileMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(TextSearchResultRenderer, this.treeLabels)),
            this._register(this.instantiationService.createInstance(MatchRenderer, this)),
        ], this.searchDataSource, {
            identityProvider,
            accessibilityProvider: this.treeAccessibilityProvider,
            dnd: this.instantiationService.createInstance(ResourceListDnDHandler, element => {
                if (isSearchTreeFileMatch(element)) {
                    return element.resource;
                }
                if (isSearchTreeMatch(element)) {
                    return withSelection(element.parent().resource, element.range());
                }
                return null;
            }),
            multipleSelectionSupport: true,
            selectionNavigation: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            paddingBottom: SearchDelegate.ITEM_HEIGHT,
            collapseByDefault: (e) => {
                if (isTextSearchHeading(e)) {
                    // always collapse the ai text search result, but always expand the text result
                    return e.isAIContributed;
                }
                // always expand compressed nodes
                if (isSearchTreeFolderMatch(e) && e.matches().length === 1 && isSearchTreeFolderMatch(e.matches()[0])) {
                    return false;
                }
                return this.shouldCollapseAccordingToConfig(e);
            }
        }));
        Constants.SearchContext.SearchResultListFocusedKey.bindTo(this.tree.contextKeyService);
        this.tree.setInput(this.viewModel.searchResult);
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        const updateHasSomeCollapsible = () => this.toggleCollapseStateDelayer.trigger(() => this.hasSomeCollapsibleResultKey.set(this.hasSomeCollapsible()));
        updateHasSomeCollapsible();
        this._register(this.tree.onDidChangeCollapseState(() => updateHasSomeCollapsible()));
        this._register(this.tree.onDidChangeModel(() => updateHasSomeCollapsible()));
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, DEBOUNCE_DELAY, true)(options => {
            if (isSearchTreeMatch(options.element)) {
                const selectedMatch = options.element;
                this.currentSelectedFileMatch?.setSelectedMatch(null);
                this.currentSelectedFileMatch = selectedMatch.parent();
                this.currentSelectedFileMatch.setSelectedMatch(selectedMatch);
                this.onFocus(selectedMatch, options.editorOptions.preserveFocus, options.sideBySide, options.editorOptions.pinned);
            }
        }));
        this._register(Event.debounce(this.tree.onDidChangeFocus, (last, event) => event, DEBOUNCE_DELAY, true)(() => {
            const selection = this.tree.getSelection();
            const focus = this.tree.getFocus()[0];
            if (selection.length > 1 && isSearchTreeMatch(focus)) {
                this.onFocus(focus, true);
            }
        }));
        this._register(Event.any(this.tree.onDidFocus, this.tree.onDidChangeFocus)(() => {
            const focus = this.tree.getFocus()[0];
            if (this.tree.isDOMFocused()) {
                const firstElem = this.tree.getFirstElementChild(this.tree.getInput());
                this.firstMatchFocused.set(firstElem === focus);
                this.fileMatchOrMatchFocused.set(!!focus);
                this.fileMatchFocused.set(isSearchTreeFileMatch(focus));
                this.folderMatchFocused.set(isSearchTreeFolderMatch(focus));
                this.matchFocused.set(isSearchTreeMatch(focus));
                this.fileMatchOrFolderMatchFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatch(focus));
                this.fileMatchOrFolderMatchWithResourceFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatchWithResource(focus));
                this.folderMatchWithResourceFocused.set(isSearchTreeFolderMatchWithResource(focus));
                this.searchResultHeaderFocused.set(isSearchHeader(focus));
                this.lastFocusState = 'tree';
            }
            let editable = false;
            if (isSearchTreeMatch(focus)) {
                editable = !focus.isReadonly;
            }
            else if (isSearchTreeFileMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            else if (isSearchTreeFolderMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            this.isEditableItem.set(editable);
        }));
        this._register(this.tree.onDidBlur(() => {
            this.firstMatchFocused.reset();
            this.fileMatchOrMatchFocused.reset();
            this.fileMatchFocused.reset();
            this.folderMatchFocused.reset();
            this.matchFocused.reset();
            this.fileMatchOrFolderMatchFocus.reset();
            this.fileMatchOrFolderMatchWithResourceFocus.reset();
            this.folderMatchWithResourceFocused.reset();
            this.searchResultHeaderFocused.reset();
            this.isEditableItem.reset();
        }));
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selection = this.tree.getSelection();
        let arg;
        let context;
        if (selection && selection.length > 0) {
            arg = e.element;
            context = selection;
        }
        else {
            context = e.element;
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.SearchContext,
            menuActionOptions: { shouldForwardArgs: true, arg },
            contextKeyService: this.contextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => context,
        });
    }
    hasSomeCollapsible() {
        const viewer = this.getControl();
        const navigator = viewer.navigate();
        let node = navigator.first();
        const shouldShowAI = this.shouldShowAIResults();
        do {
            if (node && !viewer.isCollapsed(node) && (!shouldShowAI || !(isTextSearchHeading(node)))) {
                // ignore the ai text search result id
                return true;
            }
        } while (node = navigator.next());
        return false;
    }
    async selectNextMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        // Expand the initial selected node, if needed
        if (selected && !(isSearchTreeMatch(selected))) {
            if (this.tree.isCollapsed(selected)) {
                await this.tree.expand(selected);
            }
        }
        const navigator = this.tree.navigate(selected);
        let next = navigator.next();
        if (!next) {
            next = navigator.first();
        }
        // Expand until first child is a Match
        while (next && !(isSearchTreeMatch(next))) {
            if (this.tree.isCollapsed(next)) {
                await this.tree.expand(next);
            }
            // Select the first child
            next = navigator.next();
        }
        // Reveal the newly selected element
        if (next) {
            if (next === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([next], event);
            this.tree.setSelection([next], event);
            this.tree.reveal(next);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(next);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    async selectPreviousMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        let navigator = this.tree.navigate(selected);
        let prev = navigator.previous();
        // Select previous until find a Match or a collapsed item
        while (!prev || (!(isSearchTreeMatch(prev)) && !this.tree.isCollapsed(prev))) {
            const nextPrev = prev ? navigator.previous() : navigator.last();
            if (!prev && !nextPrev) {
                return;
            }
            prev = nextPrev;
        }
        // Expand until last child is a Match
        while (prev && !(isSearchTreeMatch(prev))) {
            const nextItem = navigator.next();
            if (!nextItem) {
                break;
            }
            await this.tree.expand(prev);
            navigator = this.tree.navigate(nextItem); // recreate navigator because modifying the tree can invalidate it
            prev = nextItem ? navigator.previous() : navigator.last(); // select last child
        }
        // Reveal the newly selected element
        if (prev) {
            if (prev === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([prev], event);
            this.tree.setSelection([prev], event);
            this.tree.reveal(prev);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(prev);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    moveFocusToResults() {
        this.tree.domFocus();
    }
    focus() {
        super.focus();
        if (this.lastFocusState === 'input' || !this.hasSearchResults()) {
            const updatedText = this.searchConfig.seedOnFocus ? this.updateTextFromSelection({ allowSearchOnType: false }) : false;
            this.searchWidget.focus(undefined, undefined, updatedText);
        }
        else {
            this.tree.domFocus();
        }
    }
    updateTextFromFindWidgetOrSelection({ allowUnselectedWord = true, allowSearchOnType = true }) {
        let activeEditor = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeEditor) && !activeEditor?.hasTextFocus()) {
            const controller = CommonFindController.get(activeEditor);
            if (controller && controller.isFindInputFocused()) {
                return this.updateTextFromFindWidget(controller, { allowSearchOnType });
            }
            const editors = this.codeEditorService.listCodeEditors();
            activeEditor = editors.find(editor => editor instanceof EmbeddedCodeEditorWidget && editor.getParentEditor() === activeEditor && editor.hasTextFocus())
                ?? activeEditor;
        }
        return this.updateTextFromSelection({ allowUnselectedWord, allowSearchOnType }, activeEditor);
    }
    updateTextFromFindWidget(controller, { allowSearchOnType = true }) {
        if (!this.searchConfig.seedWithNearestWord && (dom.getActiveWindow().getSelection()?.toString() ?? '') === '') {
            return false;
        }
        const searchString = controller.getState().searchString;
        if (searchString === '') {
            return false;
        }
        this.searchWidget.searchInput?.setCaseSensitive(controller.getState().matchCase);
        this.searchWidget.searchInput?.setWholeWords(controller.getState().wholeWord);
        this.searchWidget.searchInput?.setRegex(controller.getState().isRegex);
        this.updateText(searchString, allowSearchOnType);
        return true;
    }
    updateTextFromSelection({ allowUnselectedWord = true, allowSearchOnType = true }, editor) {
        const seedSearchStringFromSelection = this.configurationService.getValue('editor').find.seedSearchStringFromSelection;
        if (!seedSearchStringFromSelection || seedSearchStringFromSelection === 'never') {
            return false;
        }
        let selectedText = this.getSearchTextFromEditor(allowUnselectedWord, editor);
        if (selectedText === null) {
            return false;
        }
        if (this.searchWidget.searchInput?.getRegex()) {
            selectedText = strings.escapeRegExpCharacters(selectedText);
        }
        this.updateText(selectedText, allowSearchOnType);
        return true;
    }
    updateText(text, allowSearchOnType = true) {
        if (allowSearchOnType && !this.viewModel.searchResult.isDirty) {
            this.searchWidget.setValue(text);
        }
        else {
            this.pauseSearching = true;
            this.searchWidget.setValue(text);
            this.pauseSearching = false;
        }
    }
    focusNextInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            if (this.searchWidget.isReplaceShown()) {
                this.searchWidget.focus(true, true);
            }
            else {
                this.moveFocusFromSearchOrReplace();
            }
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.moveFocusFromSearchOrReplace();
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.inputPatternExcludes.focus();
            this.inputPatternExcludes.select();
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.selectTreeIfNotSelected();
            return;
        }
    }
    moveFocusFromSearchOrReplace() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, this.showsFileTypes());
        }
        else {
            this.selectTreeIfNotSelected();
        }
    }
    focusPreviousInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.searchWidget.focus(true);
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.searchWidget.focus(true, true);
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.inputPatternIncludes.focus();
            this.inputPatternIncludes.select();
            return;
        }
        if (this.tree.isDOMFocused()) {
            this.moveFocusFromResults();
            return;
        }
    }
    moveFocusFromResults() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, true, false, true);
        }
        else {
            this.searchWidget.focus(true, true);
        }
    }
    reLayout() {
        if (this.isDisposed || !this.size) {
            return;
        }
        const actionsPosition = this.searchConfig.actionsPosition;
        this.getContainer().classList.toggle(SearchView_1.ACTIONS_RIGHT_CLASS_NAME, actionsPosition === 'right');
        this.searchWidget.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternExcludes.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternIncludes.setWidth(this.size.width - 28 /* container margin */);
        const widgetHeight = dom.getTotalHeight(this.searchWidgetsContainerElement);
        const messagesHeight = dom.getTotalHeight(this.messagesElement);
        this.tree.layout(this.size.height - widgetHeight - messagesHeight, this.size.width - 28);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.size = new dom.Dimension(width, height);
        this.reLayout();
    }
    getControl() {
        return this.tree;
    }
    allSearchFieldsClear() {
        return this.searchWidget.getReplaceValue() === '' &&
            (!this.searchWidget.searchInput || this.searchWidget.searchInput.getValue() === '');
    }
    allFilePatternFieldsClear() {
        return this.searchExcludePattern.getValue() === '' &&
            this.searchIncludePattern.getValue() === '';
    }
    hasSearchResults() {
        return !this.viewModel.searchResult.isEmpty();
    }
    clearSearchResults(clearInput = true) {
        this.viewModel.searchResult.clear();
        this.showEmptyStage(true);
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        if (clearInput) {
            if (this.allSearchFieldsClear()) {
                this.clearFilePatternFields();
            }
            this.searchWidget.clear();
        }
        this.viewModel.cancelSearch();
        this.viewModel.cancelAISearch();
        this.tree.ariaLabel = nls.localize('emptySearch', "Empty Search");
        this.accessibilitySignalService.playSignal(AccessibilitySignal.clear);
        this.reLayout();
    }
    clearFilePatternFields() {
        this.searchExcludePattern.clear();
        this.searchIncludePattern.clear();
    }
    cancelSearch(focus = true) {
        if (this.viewModel.cancelSearch() && this.viewModel.cancelAISearch()) {
            if (focus) {
                this.searchWidget.focus();
            }
            return true;
        }
        return false;
    }
    selectTreeIfNotSelected() {
        if (this.tree.getNode(undefined)) {
            this.tree.domFocus();
            const selection = this.tree.getSelection();
            if (selection.length === 0) {
                const event = getSelectionKeyboardEvent();
                this.tree.focusNext(undefined, undefined, event);
                this.tree.setSelection(this.tree.getFocus(), event);
            }
        }
    }
    getSearchTextFromEditor(allowUnselectedWord, editor) {
        if (dom.isAncestorOfActiveElement(this.getContainer())) {
            return null;
        }
        editor = editor ?? this.editorService.activeTextEditorControl;
        if (!editor) {
            return null;
        }
        const allowUnselected = this.searchConfig.seedWithNearestWord && allowUnselectedWord;
        return getSelectionTextFromEditor(allowUnselected, editor);
    }
    showsFileTypes() {
        return this.queryDetails.classList.contains('more');
    }
    toggleCaseSensitive() {
        this.searchWidget.searchInput?.setCaseSensitive(!this.searchWidget.searchInput.getCaseSensitive());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleWholeWords() {
        this.searchWidget.searchInput?.setWholeWords(!this.searchWidget.searchInput.getWholeWords());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleRegex() {
        this.searchWidget.searchInput?.setRegex(!this.searchWidget.searchInput.getRegex());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    togglePreserveCase() {
        this.searchWidget.replaceInput?.setPreserveCase(!this.searchWidget.replaceInput.getPreserveCase());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    setSearchParameters(args = {}) {
        if (typeof args.isCaseSensitive === 'boolean') {
            this.searchWidget.searchInput?.setCaseSensitive(args.isCaseSensitive);
        }
        if (typeof args.matchWholeWord === 'boolean') {
            this.searchWidget.searchInput?.setWholeWords(args.matchWholeWord);
        }
        if (typeof args.isRegex === 'boolean') {
            this.searchWidget.searchInput?.setRegex(args.isRegex);
        }
        if (typeof args.filesToInclude === 'string') {
            this.searchIncludePattern.setValue(String(args.filesToInclude));
        }
        if (typeof args.filesToExclude === 'string') {
            this.searchExcludePattern.setValue(String(args.filesToExclude));
        }
        if (typeof args.query === 'string') {
            this.searchWidget.searchInput?.setValue(args.query);
        }
        if (typeof args.replace === 'string') {
            this.searchWidget.replaceInput?.setValue(args.replace);
        }
        else {
            if (this.searchWidget.replaceInput && this.searchWidget.replaceInput.getValue() !== '') {
                this.searchWidget.replaceInput.setValue('');
            }
        }
        if (typeof args.triggerSearch === 'boolean' && args.triggerSearch) {
            this.triggerQueryChange();
        }
        if (typeof args.preserveCase === 'boolean') {
            this.searchWidget.replaceInput?.setPreserveCase(args.preserveCase);
        }
        if (typeof args.useExcludeSettingsAndIgnoreFiles === 'boolean') {
            this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(args.useExcludeSettingsAndIgnoreFiles);
        }
        if (typeof args.onlyOpenEditors === 'boolean') {
            this.searchIncludePattern.setOnlySearchInOpenEditors(args.onlyOpenEditors);
        }
    }
    toggleQueryDetails(moveFocus = true, show, skipLayout, reverse) {
        const cls = 'more';
        show = typeof show === 'undefined' ? !this.queryDetails.classList.contains(cls) : Boolean(show);
        this.viewletState['query.queryDetailsExpanded'] = show;
        skipLayout = Boolean(skipLayout);
        if (show) {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'true');
            this.queryDetails.classList.add(cls);
            if (moveFocus) {
                if (reverse) {
                    this.inputPatternExcludes.focus();
                    this.inputPatternExcludes.select();
                }
                else {
                    this.inputPatternIncludes.focus();
                    this.inputPatternIncludes.select();
                }
            }
        }
        else {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'false');
            this.queryDetails.classList.remove(cls);
            if (moveFocus) {
                this.searchWidget.focus();
            }
        }
        if (!skipLayout && this.size) {
            this.reLayout();
        }
    }
    searchInFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(true, folderPaths);
    }
    searchOutsideOfFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(false, folderPaths);
    }
    _searchWithIncludeOrExclude(include, folderPaths) {
        if (!folderPaths.length || folderPaths.some(folderPath => folderPath === '.')) {
            this.inputPatternIncludes.setValue('');
            this.searchWidget.focus();
            return;
        }
        // Show 'files to include' box
        if (!this.showsFileTypes()) {
            this.toggleQueryDetails(true, true);
        }
        (include ? this.inputPatternIncludes : this.inputPatternExcludes).setValue(folderPaths.join(', '));
        this.searchWidget.focus(false);
    }
    triggerQueryChange(_options) {
        const options = { preserveFocus: true, triggeredOnType: false, delay: 0, ..._options };
        if (options.triggeredOnType && !this.searchConfig.searchOnType) {
            return;
        }
        if (!this.pauseSearching) {
            const delay = options.triggeredOnType ? options.delay : 0;
            this.triggerQueryDelayer.trigger(() => {
                this._onQueryChanged(options.preserveFocus, options.triggeredOnType, options.shouldKeepAIResults, options.shouldUpdateAISearch);
            }, delay);
        }
    }
    _getExcludePattern() {
        return this.inputPatternExcludes.getValue().trim();
    }
    _getIncludePattern() {
        return this.inputPatternIncludes.getValue().trim();
    }
    _onQueryChanged(preserveFocus, triggeredOnType = false, shouldKeepAIResults = false, shouldUpdateAISearch = false) {
        if (!(this.searchWidget.searchInput?.inputBox.isInputValid())) {
            return;
        }
        const isRegex = this.searchWidget.searchInput.getRegex();
        const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
        const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
        const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
        const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
        const isWholeWords = this.searchWidget.searchInput.getWholeWords();
        const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
        const contentPattern = this.searchWidget.searchInput.getValue();
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes.useExcludesAndIgnoreFiles();
        const onlySearchInOpenEditors = this.inputPatternIncludes.onlySearchInOpenEditors();
        if (contentPattern.length === 0) {
            this.clearSearchResults(false);
            this.clearMessage();
            this.clearAIResults();
            return;
        }
        const content = {
            pattern: contentPattern,
            isRegExp: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWordMatch: isWholeWords,
            notebookInfo: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput
            }
        };
        const excludePattern = [{ pattern: this.inputPatternExcludes.getValue() }];
        const includePattern = this.inputPatternIncludes.getValue();
        // Need the full match line to correctly calculate replace text, if this is a search/replace with regex group references ($1, $2, ...).
        // 10000 chars is enough to avoid sending huge amounts of text around, if you do a replace with a longer match, it may or may not resolve the group refs correctly.
        // https://github.com/microsoft/vscode/issues/58374
        const charsPerLine = content.isRegExp ? 10000 : 1000;
        const options = {
            _reason: 'searchView',
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            maxResults: this.searchConfig.maxResults ?? undefined,
            disregardIgnoreFiles: !useExcludesAndIgnoreFiles || undefined,
            disregardExcludeSettings: !useExcludesAndIgnoreFiles || undefined,
            onlyOpenEditors: onlySearchInOpenEditors,
            excludePattern,
            includePattern,
            previewOptions: {
                matchLines: 1,
                charsPerLine
            },
            isSmartCase: this.searchConfig.smartCase,
            expandPatterns: true
        };
        const folderResources = this.contextService.getWorkspace().folders;
        const onQueryValidationError = (err) => {
            this.searchWidget.searchInput?.showMessage({ content: err.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
        };
        let query;
        try {
            query = this.queryBuilder.text(content, folderResources.map(folder => folder.uri), options);
        }
        catch (err) {
            onQueryValidationError(err);
            return;
        }
        this.validateQuery(query).then(() => {
            if (!shouldKeepAIResults && shouldUpdateAISearch && this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
                this.tree.collapse(this.searchResult.aiTextSearchResult);
            }
            this.onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch);
            if (!preserveFocus) {
                this.searchWidget.focus(false, undefined, true); // focus back to input field
            }
        }, onQueryValidationError);
    }
    validateQuery(query) {
        // Validate folderQueries
        const folderQueriesExistP = query.folderQueries.map(fq => {
            return this.fileService.exists(fq.folder).catch(() => false);
        });
        return Promise.all(folderQueriesExistP).then(existResults => {
            // If no folders exist, show an error message about the first one
            const existingFolderQueries = query.folderQueries.filter((folderQuery, i) => existResults[i]);
            if (!query.folderQueries.length || existingFolderQueries.length) {
                query.folderQueries = existingFolderQueries;
            }
            else {
                const nonExistantPath = query.folderQueries[0].folder.fsPath;
                const searchPathNotFoundError = nls.localize('searchPathNotFoundError', "Search path not found: {0}", nonExistantPath);
                return Promise.reject(new Error(searchPathNotFoundError));
            }
            return undefined;
        });
    }
    onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        this.addToSearchHistoryDelayer.trigger(() => {
            this.searchWidget.searchInput?.onSearchSubmit();
            this.inputPatternExcludes.onSearchSubmit();
            this.inputPatternIncludes.onSearchSubmit();
        });
        this.viewModel.cancelSearch(true);
        if (!shouldKeepAIResults) {
            this.clearAIResults();
        }
        this.currentSearchQ = this.currentSearchQ
            .then(() => this.doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch))
            .then(() => undefined, () => undefined);
    }
    async _updateResults() {
        if (this.state === SearchUIState.Idle) {
            return;
        }
        try {
            // Search result tree update
            const fileCount = this.viewModel.searchResult.fileCount();
            if (this._visibleMatches !== fileCount) {
                this._visibleMatches = fileCount;
                await this.refreshAndUpdateCount();
            }
        }
        finally {
            // show frequent progress and results by scheduling updates 80 ms after the last one
            this._refreshResultsScheduler.schedule();
        }
    }
    async expandIfSingularResult() {
        // expand if just 1 file with less than 50 matches
        const collapseResults = this.searchConfig.collapseResults;
        if (collapseResults !== 'alwaysCollapse' && this.viewModel.searchResult.matches().length === 1) {
            const onlyMatch = this.viewModel.searchResult.matches()[0];
            await this.tree.expandTo(onlyMatch);
            if (onlyMatch.count() < 50) {
                await this.tree.expand(onlyMatch);
            }
        }
    }
    async onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true, keywords) {
        this.state = SearchUIState.Idle;
        // Complete up to 100% as needed
        progressComplete();
        if (shouldDoFinalRefresh) {
            // anything that gets called from `getChildren` should not do this, since the tree will refresh anyways.
            await this.refreshAndUpdateCount();
        }
        const allResults = !this.viewModel.searchResult.isEmpty();
        const aiResults = this.searchResult.getCachedSearchComplete(true);
        if (completed?.exit === 1 /* SearchCompletionExitCode.NewSearchStarted */) {
            return;
        }
        // Special case for when we have an AI provider registered
        Constants.SearchContext.AIResultsRequested.bindTo(this.contextKeyService).set(this.shouldShowAIResults() && !!aiResults);
        // Expand AI results if the node is collapsed
        if (completed && this.tree.hasNode(this.searchResult.aiTextSearchResult) && this.tree.isCollapsed(this.searchResult.aiTextSearchResult)) {
            this.tree.expand(this.searchResult.aiTextSearchResult);
            return;
        }
        if (this.shouldShowAIResults() && !allResults) {
            const messageEl = this.clearMessage();
            const noResultsMessage = nls.localize('noResultsFallback', "No results found. ");
            dom.append(messageEl, noResultsMessage);
            let aiName = 'Copilot';
            try {
                aiName = (await this.searchService.getAIName()) || aiName;
            }
            catch (e) {
                // ignore
            }
            if (aiName) {
                const searchWithAIButtonTooltip = appendKeyBindingLabel(nls.localize('triggerAISearch.tooltip', "Search with AI."), this.keybindingService.lookupKeybinding("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */));
                const searchWithAIButtonText = nls.localize('searchWithAIButtonTooltip', "Search with AI.");
                const searchWithAIButton = this.messageDisposables.add(new SearchLinkButton(searchWithAIButtonText, () => {
                    this.commandService.executeCommand("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */);
                }, this.hoverService, searchWithAIButtonTooltip));
                dom.append(messageEl, searchWithAIButton.element);
            }
            if (!aiResults) {
                return;
            }
        }
        if (!allResults) {
            const hasExcludes = !!excludePatternText;
            const hasIncludes = !!includePatternText;
            let message;
            if (!completed) {
                message = SEARCH_CANCELLED_MESSAGE;
            }
            else if (this.inputPatternIncludes.onlySearchInOpenEditors()) {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noOpenEditorResultsIncludesExcludes', "No results found in open editors matching '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noOpenEditorResultsIncludes', "No results found in open editors matching '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noOpenEditorResultsExcludes', "No results found in open editors excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noOpenEditorResultsFound', "No results found in open editors. Review your settings for configured exclusions and check your gitignore files - ");
                }
            }
            else {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noResultsIncludesExcludes', "No results found in '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noResultsIncludes', "No results found in '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noResultsExcludes', "No results found excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noResultsFound', "No results found. Review your settings for configured exclusions and check your gitignore files - ");
                }
            }
            // Indicate as status to ARIA
            aria.status(message);
            const messageEl = this.clearMessage();
            dom.append(messageEl, message);
            if (!completed) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearch.message', "Search again"), () => this.triggerQueryChange({ preserveFocus: false }), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else if (hasIncludes || hasExcludes) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearchInAll.message', "Search again in all files"), this.onSearchAgain.bind(this), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else {
                const openSettingsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.message', "Open Settings"), this.onOpenSettings.bind(this), this.hoverService));
                dom.append(messageEl, openSettingsButton.element);
            }
            if (completed) {
                dom.append(messageEl, $('span', undefined, ' - '));
                const learnMoreButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.learnMore', "Learn More"), this.onLearnMore.bind(this), this.hoverService));
                dom.append(messageEl, learnMoreButton.element);
            }
            if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                this.showSearchWithoutFolderMessage();
            }
            this.reLayout();
        }
        else {
            this.viewModel.searchResult.toggleHighlights(this.isVisible()); // show highlights
            // Indicate final search result count for ARIA
            aria.status(nls.localize('ariaSearchResultsStatus', "Search returned {0} results in {1} files", this.viewModel.searchResult.count(), this.viewModel.searchResult.fileCount()));
        }
        if (completed && completed.limitHit) {
            completed.messages.push({ type: TextSearchCompleteMessageType.Warning, text: nls.localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") });
        }
        if (completed && completed.messages) {
            for (const message of completed.messages) {
                this.addMessage(message);
            }
        }
        this.reLayout();
    }
    async onSearchError(e, progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true) {
        this.state = SearchUIState.Idle;
        if (errors.isCancellationError(e)) {
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh);
        }
        else {
            progressComplete();
            this.searchWidget.searchInput?.showMessage({ content: e.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
            return Promise.resolve();
        }
    }
    clearAIResults() {
        this.model.searchResult.aiTextSearchResult.hidden = true;
        this.refreshTreeController.clearAllPending();
        this._pendingSemanticSearchPromise = undefined;
        this._cachedResults = undefined;
        this._cachedKeywords = [];
        this.model.cancelAISearch(true);
        this.model.clearAiSearchResults();
    }
    async requestAIResults() {
        this.logService.info(`SearchView: Requesting semantic results from keybinding. Cached: ${!!this.cachedResults}`);
        if ((!this.cachedResults || this.cachedResults.results.length === 0) && !this._pendingSemanticSearchPromise) {
            this.clearAIResults();
        }
        this.model.searchResult.aiTextSearchResult.hidden = false;
        await this.queueRefreshTree();
        await forcedExpandRecursively(this.getControl(), this.model.searchResult.aiTextSearchResult);
    }
    async addAIResults() {
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        this.searchWidget.searchInput?.clearMessage();
        this.showEmptyStage();
        this._visibleMatches = 0;
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        // Reuse pending aiSearch if available
        let aiSearchPromise = this._pendingSemanticSearchPromise;
        if (!aiSearchPromise) {
            this.viewModel.searchResult.setAIQueryUsingTextQuery();
            aiSearchPromise = this._pendingSemanticSearchPromise = this.viewModel.aiSearch(() => {
                // Clear pending promise when first result comes in
                if (this._pendingSemanticSearchPromise === aiSearchPromise) {
                    this._pendingSemanticSearchPromise = undefined;
                }
            });
        }
        aiSearchPromise.then((complete) => {
            this.updateSearchResultCount(this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, false);
            return this.onSearchComplete(() => { }, excludePatternText, includePatternText, complete, false, complete.aiKeywords);
        }, (e) => {
            return this.onSearchError(e, () => { }, excludePatternText, includePatternText, undefined, false);
        });
    }
    doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: triggeredOnType ? 300 : 0 }, _progress => {
            return new Promise(resolve => progressComplete = resolve);
        });
        this.searchWidget.searchInput?.clearMessage();
        this.state = SearchUIState.Searching;
        this.showEmptyStage();
        if (this.model.searchResult.aiTextSearchResult.hidden && shouldUpdateAISearch) {
            this.logService.info(`SearchView: Semantic search visible. Keep semantic results: ${shouldKeepAIResults}. Update semantic search: ${shouldUpdateAISearch}`);
            this.model.searchResult.aiTextSearchResult.hidden = false;
        }
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._visibleMatches = 0;
        this._refreshResultsScheduler.schedule();
        this.searchWidget.setReplaceAllActionState(false);
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        const result = this.viewModel.search(query);
        if (!shouldKeepAIResults || shouldUpdateAISearch) {
            this.viewModel.searchResult.setAIQueryUsingTextQuery(query);
        }
        if (this.configurationService.getValue('search').searchView.keywordSuggestions) {
            this.getKeywordSuggestions();
        }
        return result.asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            const config = this.configurationService.getValue('search').searchView.semanticSearchBehavior;
            if (complete.results.length === 0 && config === "runOnEmpty" /* SemanticSearchBehavior.RunOnEmpty */) {
                this.logService.info(`SearchView: Requesting semantic results on empty search.`);
                this.model.searchResult.aiTextSearchResult.hidden = false;
            }
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, excludePatternText, includePatternText);
        });
    }
    onOpenSettings(e) {
        dom.EventHelper.stop(e, false);
        this.openSettings('@id:files.exclude,search.exclude,search.useParentIgnoreFiles,search.useGlobalIgnoreFiles,search.useIgnoreFiles');
    }
    openSettings(query) {
        const options = { query };
        return this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ?
            this.preferencesService.openWorkspaceSettings(options) :
            this.preferencesService.openUserSettings(options);
    }
    onLearnMore() {
        this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=853977'));
    }
    onSearchAgain() {
        this.inputPatternExcludes.setValue('');
        this.inputPatternIncludes.setValue('');
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
        this.triggerQueryChange({ preserveFocus: false });
    }
    onEnableExcludes() {
        this.toggleQueryDetails(false, true);
        this.searchExcludePattern.setUseExcludesAndIgnoreFiles(true);
    }
    onDisableSearchInOpenEditors() {
        this.toggleQueryDetails(false, true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
    }
    updateSearchResultCount(disregardExcludesAndIgnores, onlyOpenEditors, clear = false) {
        if (this._cachedKeywords.length > 0) {
            return;
        }
        const fileCount = this.viewModel.searchResult.fileCount(this.viewModel.searchResult.aiTextSearchResult.hidden);
        const resultCount = this.viewModel.searchResult.count(this.viewModel.searchResult.aiTextSearchResult.hidden);
        this.hasSearchResultsKey.set(fileCount > 0);
        const msgWasHidden = this.messagesElement.style.display === 'none';
        const messageEl = this.clearMessage();
        const resultMsg = clear ? '' : this.buildResultCountMessage(resultCount, fileCount);
        this.tree.ariaLabel = resultMsg + nls.localize('forTerm', " - Search: {0}", this.searchResult.query?.contentPattern.pattern ?? '');
        dom.append(messageEl, resultMsg);
        if (fileCount > 0) {
            if (disregardExcludesAndIgnores) {
                const excludesDisabledMessage = ' - ' + nls.localize('useIgnoresAndExcludesDisabled', "exclude settings and ignore files are disabled") + ' ';
                const enableExcludesButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('excludes.enable', "enable"), this.onEnableExcludes.bind(this), this.hoverService, nls.localize('useExcludesAndIgnoreFilesDescription', "Use Exclude Settings and Ignore Files")));
                dom.append(messageEl, $('span', undefined, excludesDisabledMessage, '(', enableExcludesButton.element, ')'));
            }
            if (onlyOpenEditors) {
                const searchingInOpenMessage = ' - ' + nls.localize('onlyOpenEditors', "searching only in open files") + ' ';
                const disableOpenEditorsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openEditors.disable', "disable"), this.onDisableSearchInOpenEditors.bind(this), this.hoverService, nls.localize('disableOpenEditors', "Search in entire workspace")));
                dom.append(messageEl, $('span', undefined, searchingInOpenMessage, '(', disableOpenEditorsButton.element, ')'));
            }
            dom.append(messageEl, ' - ');
            const openInEditorTooltip = appendKeyBindingLabel(nls.localize('openInEditor.tooltip', "Copy current search results to an editor"), this.keybindingService.lookupKeybinding("search.action.openInEditor" /* Constants.SearchCommandIds.OpenInEditorCommandId */));
            const openInEditorButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openInEditor.message', "Open in editor"), () => this.instantiationService.invokeFunction(createEditorFromSearchResult, this.searchResult, this.searchIncludePattern.getValue(), this.searchExcludePattern.getValue(), this.searchIncludePattern.onlySearchInOpenEditors()), this.hoverService, openInEditorTooltip));
            dom.append(messageEl, openInEditorButton.element);
            this.reLayout();
        }
        else if (!msgWasHidden) {
            dom.hide(this.messagesElement);
        }
    }
    handleKeywordClick(keyword, index) {
        this.searchWidget.searchInput?.setValue(keyword);
        this.triggerQueryChange({ preserveFocus: false, triggeredOnType: false, shouldKeepAIResults: false });
        this.telemetryService.publicLog2('searchKeywordClick', {
            index,
            maxKeywords: this._cachedKeywords.length
        });
    }
    updateKeywordSuggestionUI(keyword) {
        const element = this.messagesElement.firstChild;
        if (this._cachedKeywords.length > 0) {
            if (this._cachedKeywords.length >= 3) {
                // If we already have 3 keywords, just return
                return;
            }
            dom.append(element, ', ');
            const index = this._cachedKeywords.length;
            const button = this.messageDisposables.add(new SearchLinkButton(keyword.keyword, () => this.handleKeywordClick(keyword.keyword, index), this.hoverService));
            dom.append(element, button.element);
        }
        else {
            const messageEl = this.clearMessage();
            messageEl.classList.add('ai-keywords');
            // Add unclickable message
            const resultMsg = nls.localize('keywordSuggestion.message', "Search instead for: ");
            dom.append(messageEl, resultMsg);
            const button = this.messageDisposables.add(new SearchLinkButton(keyword.keyword, () => this.handleKeywordClick(keyword.keyword, 0), this.hoverService));
            dom.append(messageEl, button.element);
        }
        this._cachedKeywords.push(keyword.keyword);
    }
    async getKeywordSuggestions() {
        // Reuse pending aiSearch if available
        let aiSearchPromise = this._pendingSemanticSearchPromise;
        if (!aiSearchPromise) {
            this.viewModel.searchResult.setAIQueryUsingTextQuery();
            aiSearchPromise = this._pendingSemanticSearchPromise = this.viewModel.aiSearch(result => {
                if (result && isAIKeyword(result)) {
                    this.updateKeywordSuggestionUI(result);
                    return;
                }
                // Clear pending promise when first result comes in
                if (this._pendingSemanticSearchPromise === aiSearchPromise) {
                    this._pendingSemanticSearchPromise = undefined;
                }
            });
        }
        this._cachedResults = await aiSearchPromise;
    }
    addMessage(message) {
        const messageBox = this.messagesElement.firstChild;
        if (!messageBox) {
            return;
        }
        dom.append(messageBox, renderSearchMessage(message, this.instantiationService, this.notificationService, this.openerService, this.commandService, this.messageDisposables, () => this.triggerQueryChange()));
    }
    buildResultCountMessage(resultCount, fileCount) {
        if (resultCount === 1 && fileCount === 1) {
            return nls.localize('search.file.result', "{0} result in {1} file", resultCount, fileCount);
        }
        else if (resultCount === 1) {
            return nls.localize('search.files.result', "{0} result in {1} files", resultCount, fileCount);
        }
        else if (fileCount === 1) {
            return nls.localize('search.file.results', "{0} results in {1} file", resultCount, fileCount);
        }
        else {
            return nls.localize('search.files.results', "{0} results in {1} files", resultCount, fileCount);
        }
    }
    showSearchWithoutFolderMessage() {
        this.searchWithoutFolderMessageElement = this.clearMessage();
        const textEl = dom.append(this.searchWithoutFolderMessageElement, $('p', undefined, nls.localize('searchWithoutFolder', "You have not opened or specified a folder. Only open files are currently searched - ")));
        const openFolderButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openFolder', "Open Folder"), () => {
            this.commandService.executeCommand(OpenFolderAction.ID).catch(err => errors.onUnexpectedError(err));
        }, this.hoverService));
        dom.append(textEl, openFolderButton.element);
    }
    showEmptyStage(forceHideMessages = false) {
        const showingCancelled = (this.messagesElement.firstChild?.textContent?.indexOf(SEARCH_CANCELLED_MESSAGE) ?? -1) > -1;
        // clean up ui
        // this.replaceService.disposeAllReplacePreviews();
        if (showingCancelled || forceHideMessages || !this.configurationService.getValue().search.searchOnType) {
            // when in search to type, don't preemptively hide, as it causes flickering and shifting of the live results
            dom.hide(this.messagesElement);
        }
        dom.show(this.resultsElement);
        this.currentSelectedFileMatch = undefined;
    }
    shouldOpenInNotebookEditor(match, uri) {
        // Untitled files will return a false positive for getContributedNotebookTypes.
        // Since untitled files are already open, then untitled notebooks should return NotebookMatch results.
        return isIMatchInNotebook(match) || (uri.scheme !== network.Schemas.untitled && this.notebookService.getContributedNotebookTypes(uri).length > 0);
    }
    onFocus(lineMatch, preserveFocus, sideBySide, pinned) {
        const useReplacePreview = this.configurationService.getValue().search.useReplacePreview;
        const resource = isSearchTreeMatch(lineMatch) ? lineMatch.parent().resource : lineMatch.resource;
        return (useReplacePreview && this.viewModel.isReplaceActive() && !!this.viewModel.replaceString && !(this.shouldOpenInNotebookEditor(lineMatch, resource))) ?
            this.replaceService.openReplacePreview(lineMatch, preserveFocus, sideBySide, pinned) :
            this.open(lineMatch, preserveFocus, sideBySide, pinned, resource);
    }
    async open(element, preserveFocus, sideBySide, pinned, resourceInput) {
        const selection = getEditorSelectionFromMatch(element, this.viewModel);
        const oldParentMatches = isSearchTreeMatch(element) ? element.parent().matches() : [];
        const resource = resourceInput ?? (isSearchTreeMatch(element) ? element.parent().resource : element.resource);
        let editor;
        const options = {
            preserveFocus,
            pinned,
            selection,
            revealIfVisible: true,
        };
        try {
            editor = await this.editorService.openEditor({
                resource: resource,
                options,
            }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
            const editorControl = editor?.getControl();
            if (isSearchTreeMatch(element) && preserveFocus && isCodeEditor(editorControl)) {
                this.viewModel.searchResult.getRangeHighlightDecorations().highlightRange(editorControl.getModel(), element.range());
            }
            else {
                this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
            return;
        }
        if (editor instanceof NotebookEditor) {
            const elemParent = element.parent();
            if (isSearchTreeMatch(element)) {
                if (isIMatchInNotebook(element)) {
                    element.parent().showMatch(element);
                }
                else {
                    const editorWidget = editor.getControl();
                    if (editorWidget) {
                        // Ensure that the editor widget is binded. If if is, then this should return immediately.
                        // Otherwise, it will bind the widget.
                        elemParent.bindNotebookEditorWidget(editorWidget);
                        await elemParent.updateMatchesForEditorWidget();
                        const matchIndex = oldParentMatches.findIndex(e => e.id() === element.id());
                        const matches = elemParent.matches();
                        const match = matchIndex >= matches.length ? matches[matches.length - 1] : matches[matchIndex];
                        if (isIMatchInNotebook(match)) {
                            elemParent.showMatch(match);
                            if (!this.tree.getFocus().includes(match) || !this.tree.getSelection().includes(match)) {
                                this.tree.setSelection([match], getSelectionKeyboardEvent());
                                this.tree.setFocus([match]);
                            }
                        }
                    }
                }
            }
        }
    }
    openEditorWithMultiCursor(element) {
        const resource = isSearchTreeMatch(element) ? element.parent().resource : element.resource;
        return this.editorService.openEditor({
            resource: resource,
            options: {
                preserveFocus: false,
                pinned: true,
                revealIfVisible: true
            }
        }).then(editor => {
            if (editor) {
                let fileMatch = null;
                if (isSearchTreeFileMatch(element)) {
                    fileMatch = element;
                }
                else if (isSearchTreeMatch(element)) {
                    fileMatch = element.parent();
                }
                if (fileMatch) {
                    const selections = fileMatch.matches().map(m => new Selection(m.range().startLineNumber, m.range().startColumn, m.range().endLineNumber, m.range().endColumn));
                    const codeEditor = getCodeEditor(editor.getControl());
                    if (codeEditor) {
                        const multiCursorController = MultiCursorSelectionController.get(codeEditor);
                        multiCursorController?.selectAllUsingSelections(selections);
                    }
                }
            }
            this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
        }, errors.onUnexpectedError);
    }
    onUntitledDidDispose(resource) {
        if (!this.viewModel) {
            return;
        }
        // remove search results from this resource as it got disposed
        let matches = this.viewModel.searchResult.matches();
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
        matches = this.viewModel.searchResult.matches(true);
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
    }
    onFilesChanged(e) {
        if (!this.viewModel || (this.searchConfig.sortOrder !== "modified" /* SearchSortOrder.Modified */ && !e.gotDeleted())) {
            return;
        }
        const matches = this.viewModel.searchResult.matches();
        if (e.gotDeleted()) {
            const deletedMatches = matches.filter(m => e.contains(m.resource, 2 /* FileChangeType.DELETED */));
            this.viewModel.searchResult.remove(deletedMatches);
        }
        else {
            // Check if the changed file contained matches
            const changedMatches = matches.filter(m => e.contains(m.resource));
            if (changedMatches.length && this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // No matches need to be removed, but modified files need to have their file stat updated.
                this.updateFileStats(changedMatches).then(async () => this.refreshTreeController.queue());
            }
        }
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    clearHistory() {
        this.searchWidget.clearHistory();
        this.inputPatternExcludes.clearHistory();
        this.inputPatternIncludes.clearHistory();
    }
    saveState() {
        // This can be called before renderBody() method gets called for the first time
        // if we move the searchView inside another viewPaneContainer
        if (!this.searchWidget) {
            return;
        }
        const patternExcludes = this.inputPatternExcludes?.getValue().trim() ?? '';
        const patternIncludes = this.inputPatternIncludes?.getValue().trim() ?? '';
        const onlyOpenEditors = this.inputPatternIncludes?.onlySearchInOpenEditors() ?? false;
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes?.useExcludesAndIgnoreFiles() ?? true;
        const preserveCase = this.viewModel.preserveCase;
        if (this.searchWidget.searchInput) {
            const isRegex = this.searchWidget.searchInput.getRegex();
            const isWholeWords = this.searchWidget.searchInput.getWholeWords();
            const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
            const contentPattern = this.searchWidget.searchInput.getValue();
            const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
            const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
            const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
            const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
            this.viewletState['query.contentPattern'] = contentPattern;
            this.viewletState['query.regex'] = isRegex;
            this.viewletState['query.wholeWords'] = isWholeWords;
            this.viewletState['query.caseSensitive'] = isCaseSensitive;
            this.viewletState['query.isInNotebookMarkdownInput'] = isInNotebookMarkdownInput;
            this.viewletState['query.isInNotebookMarkdownPreview'] = isInNotebookMarkdownPreview;
            this.viewletState['query.isInNotebookCellInput'] = isInNotebookCellInput;
            this.viewletState['query.isInNotebookCellOutput'] = isInNotebookCellOutput;
        }
        this.viewletState['query.folderExclusions'] = patternExcludes;
        this.viewletState['query.folderIncludes'] = patternIncludes;
        this.viewletState['query.useExcludesAndIgnoreFiles'] = useExcludesAndIgnoreFiles;
        this.viewletState['query.preserveCase'] = preserveCase;
        this.viewletState['query.onlyOpenEditors'] = onlyOpenEditors;
        const isReplaceShown = this.searchAndReplaceWidget.isReplaceShown();
        this.viewletState['view.showReplace'] = isReplaceShown;
        this.viewletState['view.treeLayout'] = this.isTreeLayoutViewVisible;
        this.viewletState['query.replaceText'] = isReplaceShown && this.searchWidget.getReplaceValue();
        this._saveSearchHistoryService();
        this.memento.saveMemento();
        super.saveState();
    }
    _saveSearchHistoryService() {
        if (this.searchWidget === undefined) {
            return;
        }
        const history = Object.create(null);
        const searchHistory = this.searchWidget.getSearchHistory();
        if (searchHistory && searchHistory.length) {
            history.search = searchHistory;
        }
        const replaceHistory = this.searchWidget.getReplaceHistory();
        if (replaceHistory && replaceHistory.length) {
            history.replace = replaceHistory;
        }
        const patternExcludesHistory = this.inputPatternExcludes.getHistory();
        if (patternExcludesHistory && patternExcludesHistory.length) {
            history.exclude = patternExcludesHistory;
        }
        const patternIncludesHistory = this.inputPatternIncludes.getHistory();
        if (patternIncludesHistory && patternIncludesHistory.length) {
            history.include = patternIncludesHistory;
        }
        this.searchHistoryService.save(history);
    }
    async updateFileStats(elements) {
        const files = elements.map(f => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    removeFileStats() {
        for (const fileMatch of this.searchResult.matches()) {
            fileMatch.fileStat = undefined;
        }
        for (const fileMatch of this.searchResult.matches(true)) {
            fileMatch.fileStat = undefined;
        }
    }
    dispose() {
        this.isDisposed = true;
        this.saveState();
        super.dispose();
    }
};
SearchView = SearchView_1 = __decorate([
    __param(1, IFileService),
    __param(2, IEditorService),
    __param(3, ICodeEditorService),
    __param(4, IProgressService),
    __param(5, INotificationService),
    __param(6, IDialogService),
    __param(7, ICommandService),
    __param(8, IContextViewService),
    __param(9, IInstantiationService),
    __param(10, IViewDescriptorService),
    __param(11, IConfigurationService),
    __param(12, IWorkspaceContextService),
    __param(13, ISearchViewModelWorkbenchService),
    __param(14, IContextKeyService),
    __param(15, IReplaceService),
    __param(16, ITextFileService),
    __param(17, IPreferencesService),
    __param(18, IThemeService),
    __param(19, ISearchHistoryService),
    __param(20, IContextMenuService),
    __param(21, IAccessibilityService),
    __param(22, IKeybindingService),
    __param(23, IStorageService),
    __param(24, ISearchService),
    __param(25, IOpenerService),
    __param(26, IHoverService),
    __param(27, INotebookService),
    __param(28, ILogService),
    __param(29, IAccessibilitySignalService),
    __param(30, ITelemetryService)
], SearchView);
export { SearchView };
class SearchLinkButton extends Disposable {
    constructor(label, handler, hoverService, tooltip) {
        super();
        this.element = $('a.pointer', { tabindex: 0 }, label);
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, tooltip));
        this.addEventHandlers(handler);
    }
    addEventHandlers(handler) {
        const wrappedHandler = (e) => {
            dom.EventHelper.stop(e, false);
            handler(e);
        };
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, wrappedHandler));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                wrappedHandler(e);
                event.preventDefault();
                event.stopPropagation();
            }
        }));
    }
}
export function getEditorSelectionFromMatch(element, viewModel) {
    let match = null;
    if (isSearchTreeMatch(element)) {
        match = element;
    }
    if (isSearchTreeFileMatch(element) && element.count() > 0) {
        match = element.matches()[element.matches().length - 1];
    }
    if (match) {
        const range = match.range();
        if (viewModel.isReplaceActive() && !!viewModel.replaceString) {
            const replaceString = match.replaceString;
            return {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.startLineNumber,
                endColumn: range.startColumn + replaceString.length
            };
        }
        return range;
    }
    return undefined;
}
export function getSelectionTextFromEditor(allowUnselectedWord, activeEditor) {
    let editor = activeEditor;
    if (isDiffEditor(editor)) {
        if (editor.getOriginalEditor().hasTextFocus()) {
            editor = editor.getOriginalEditor();
        }
        else {
            editor = editor.getModifiedEditor();
        }
    }
    if (!isCodeEditor(editor) || !editor.hasModel()) {
        return null;
    }
    const range = editor.getSelection();
    if (!range) {
        return null;
    }
    if (range.isEmpty()) {
        if (allowUnselectedWord) {
            const wordAtPosition = editor.getModel().getWordAtPosition(range.getStartPosition());
            return wordAtPosition?.word ?? null;
        }
        else {
            return null;
        }
    }
    let searchText = '';
    for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
        let lineText = editor.getModel().getLineContent(i);
        if (i === range.endLineNumber) {
            lineText = lineText.substring(0, range.endColumn - 1);
        }
        if (i === range.startLineNumber) {
            lineText = lineText.substring(range.startColumn - 1);
        }
        if (i !== range.startLineNumber) {
            lineText = '\n' + lineText;
        }
        searchText += lineText;
    }
    return searchText;
}
let SearchViewDataSource = class SearchViewDataSource {
    constructor(searchView, configurationService) {
        this.searchView = searchView;
        this.configurationService = configurationService;
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    createSearchResultIterator(searchResult) {
        const ret = [];
        if (this.searchView.shouldShowAIResults() && searchResult.searchModel.hasPlainResults && !searchResult.aiTextSearchResult.hidden) {
            // as long as there is a query present, we can load AI results
            ret.push(searchResult.aiTextSearchResult);
        }
        if (!searchResult.plainTextSearchResult.isEmpty()) {
            if (!this.searchView.shouldShowAIResults() || searchResult.aiTextSearchResult.hidden) {
                // only one root, so just return the children
                return this.createTextSearchResultIterator(searchResult.plainTextSearchResult);
            }
            ret.push(searchResult.plainTextSearchResult);
        }
        return ret;
    }
    createTextSearchResultIterator(textSearchResult) {
        const folderMatches = textSearchResult.folderMatches()
            .filter(fm => !fm.isEmpty())
            .sort(searchMatchComparer);
        if (folderMatches.length === 1) {
            return this.createFolderIterator(folderMatches[0]);
        }
        return folderMatches;
    }
    createFolderIterator(folderMatch) {
        const matchArray = this.searchView.isTreeLayoutViewVisible ? folderMatch.matches() : folderMatch.allDownstreamFileMatches();
        let matches = matchArray;
        if (!(folderMatch instanceof AIFolderMatchWorkspaceRootImpl)) {
            matches = matchArray.sort((a, b) => searchMatchComparer(a, b, this.searchConfig.sortOrder));
        }
        return matches;
    }
    createFileIterator(fileMatch) {
        const matches = fileMatch.matches().sort(searchMatchComparer);
        return matches;
    }
    hasChildren(element) {
        if (isSearchTreeMatch(element)) {
            return false;
        }
        if (isTextSearchHeading(element) && element.isAIContributed) {
            return true;
        }
        const hasChildren = element.hasChildren;
        return hasChildren;
    }
    getChildren(element) {
        if (isSearchResult(element)) {
            return this.createSearchResultIterator(element);
        }
        else if (isTextSearchHeading(element)) {
            if (element.isAIContributed && (!this.searchView.model.hasAIResults || !!this.searchView._pendingSemanticSearchPromise)) {
                if (this.searchView.cachedResults) {
                    return this.createTextSearchResultIterator(element);
                }
                this.searchView.addAIResults();
                return new Promise(resolve => {
                    const disposable = element.onChange(() => {
                        disposable.dispose(); // Clean up listener after first result
                        resolve(this.createTextSearchResultIterator(element));
                    });
                });
            }
            return this.createTextSearchResultIterator(element);
        }
        else if (isSearchTreeFolderMatch(element)) {
            return this.createFolderIterator(element);
        }
        else if (isSearchTreeFileMatch(element)) {
            return this.createFileIterator(element);
        }
        return [];
    }
    getParent(element) {
        const parent = element.parent();
        if (isSearchResult(parent)) {
            throw new Error('Invalid element passed to getParent');
        }
        return parent;
    }
};
SearchViewDataSource = __decorate([
    __param(1, IConfigurationService)
], SearchViewDataSource);
let RefreshTreeController = class RefreshTreeController extends Disposable {
    constructor(searchView, geSearchConfig, fileService) {
        super();
        this.searchView = searchView;
        this.geSearchConfig = geSearchConfig;
        this.fileService = fileService;
        this.queuedIChangeEvents = [];
        this.refreshTreeThrottler = this._register(new Throttler());
    }
    clearAllPending() {
        this.searchView.getControl().cancelAllRefreshPromises();
    }
    async queue(e) {
        if (e) {
            this.queuedIChangeEvents.push(e);
        }
        return this.refreshTreeThrottler.queue(this.refreshTreeUsingQueue.bind(this));
    }
    async refreshTreeUsingQueue() {
        const aggregateChangeEvent = this.queuedIChangeEvents.length === 0 ? undefined : {
            elements: this.queuedIChangeEvents.map(e => e.elements).flat(),
            added: this.queuedIChangeEvents.some(e => e.added),
            removed: this.queuedIChangeEvents.some(e => e.removed),
            clearingAll: this.queuedIChangeEvents.some(e => e.clearingAll),
        };
        this.queuedIChangeEvents = [];
        return this.refreshTree(aggregateChangeEvent);
    }
    async retrieveFileStats() {
        const files = this.searchView.model.searchResult.matches().filter(f => !f.fileStat).map(f => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    async refreshTree(event) {
        const searchConfig = this.geSearchConfig();
        if (!event || event.added || event.removed) {
            // Refresh whole tree
            if (searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // Ensure all matches have retrieved their file stat
                await this.retrieveFileStats()
                    .then(() => this.searchView.getControl().updateChildren(undefined));
            }
            else {
                await this.searchView.getControl().updateChildren(undefined);
            }
        }
        else {
            // If updated counts affect our search order, re-sort the view.
            if (searchConfig.sortOrder === "countAscending" /* SearchSortOrder.CountAscending */ ||
                searchConfig.sortOrder === "countDescending" /* SearchSortOrder.CountDescending */) {
                await this.searchView.getControl().updateChildren(undefined);
            }
            else {
                const treeHasAllElements = event.elements.every(elem => this.searchView.getControl().hasNode(elem));
                if (treeHasAllElements) {
                    // IFileMatchInstance modified, refresh those elements
                    await Promise.all(event.elements.map(async (element) => {
                        await this.searchView.getControl().updateChildren(element);
                        this.searchView.getControl().rerender(element);
                    }));
                }
                else {
                    this.searchView.getControl().updateChildren(undefined);
                }
            }
        }
    }
};
RefreshTreeController = __decorate([
    __param(2, IFileService)
], RefreshTreeController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFDO0FBR2pFLE9BQU8sRUFBMkMsOEJBQThCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuSSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hGLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBRXBILE9BQU8sRUFB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