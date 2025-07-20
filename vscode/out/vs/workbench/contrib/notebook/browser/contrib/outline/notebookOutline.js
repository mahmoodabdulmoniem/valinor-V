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
import { localize } from '../../../../../../nls.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { ToolBar } from '../../../../../../base/browser/ui/toolbar/toolbar.js';
import { IconLabel } from '../../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { createMatches } from '../../../../../../base/common/filters.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { getIconClassesForLanguageId } from '../../../../../../editor/common/services/getIconClasses.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { listErrorForeground, listWarningForeground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { NotebookEditor } from '../../notebookEditor.js';
import { CellKind, NotebookCellsChangeType, NotebookSetting } from '../../../common/notebookCommon.js';
import { IEditorService, SIDE_GROUP } from '../../../../../services/editor/common/editorService.js';
import { IOutlineService } from '../../../../../services/outline/browser/outline.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../../platform/contextkey/common/contextkey.js';
import { MenuEntryActionViewItem, getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Delayer, disposableTimeout } from '../../../../../../base/common/async.js';
import { IOutlinePane } from '../../../../outline/browser/outline.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../common/notebookContextKeys.js';
import { INotebookCellOutlineDataSourceFactory } from '../../viewModel/notebookOutlineDataSourceFactory.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { safeIntl } from '../../../../../../base/common/date.js';
class NotebookOutlineTemplate {
    static { this.templateId = 'NotebookOutlineRenderer'; }
    constructor(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables) {
        this.container = container;
        this.iconClass = iconClass;
        this.iconLabel = iconLabel;
        this.decoration = decoration;
        this.actionMenu = actionMenu;
        this.elementDisposables = elementDisposables;
    }
}
let NotebookOutlineRenderer = class NotebookOutlineRenderer {
    constructor(_editor, _target, _themeService, _configurationService, _contextMenuService, _contextKeyService, _menuService, _instantiationService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._instantiationService = _instantiationService;
        this.templateId = NotebookOutlineTemplate.templateId;
    }
    renderTemplate(container) {
        const elementDisposables = new DisposableStore();
        container.classList.add('notebook-outline-element', 'show-file-icons');
        const iconClass = document.createElement('div');
        container.append(iconClass);
        const iconLabel = new IconLabel(container, { supportHighlights: true });
        const decoration = document.createElement('div');
        decoration.className = 'element-decoration';
        container.append(decoration);
        const actionMenu = document.createElement('div');
        actionMenu.className = 'action-menu';
        container.append(actionMenu);
        return new NotebookOutlineTemplate(container, iconClass, iconLabel, decoration, actionMenu, elementDisposables);
    }
    renderElement(node, _index, template) {
        const extraClasses = [];
        const options = {
            matches: createMatches(node.filterData),
            labelEscapeNewLines: true,
            extraClasses,
        };
        const isCodeCell = node.element.cell.cellKind === CellKind.Code;
        if (node.element.level >= 8) { // symbol
            template.iconClass.className = 'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        else if (isCodeCell && this._themeService.getFileIconTheme().hasFileIcons && !node.element.isExecuting) {
            template.iconClass.className = '';
            extraClasses.push(...getIconClassesForLanguageId(node.element.cell.language ?? ''));
        }
        else {
            template.iconClass.className = 'element-icon ' + ThemeIcon.asClassNameArray(node.element.icon).join(' ');
        }
        template.iconLabel.setLabel(' ' + node.element.label, undefined, options);
        const { markerInfo } = node.element;
        template.container.style.removeProperty('--outline-element-color');
        template.decoration.innerText = '';
        if (markerInfo) {
            const problem = this._configurationService.getValue('problems.visibility');
            const useBadges = this._configurationService.getValue("outline.problems.badges" /* OutlineConfigKeys.problemsBadges */);
            if (!useBadges || !problem) {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = '';
            }
            else if (markerInfo.count === 0) {
                template.decoration.classList.add('bubble');
                template.decoration.innerText = '\uea71';
            }
            else {
                template.decoration.classList.remove('bubble');
                template.decoration.innerText = markerInfo.count > 9 ? '9+' : String(markerInfo.count);
            }
            const color = this._themeService.getColorTheme().getColor(markerInfo.topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
            if (problem === undefined) {
                return;
            }
            const useColors = this._configurationService.getValue("outline.problems.colors" /* OutlineConfigKeys.problemsColors */);
            if (!useColors || !problem) {
                template.container.style.removeProperty('--outline-element-color');
                template.decoration.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
            else {
                template.container.style.setProperty('--outline-element-color', color?.toString() ?? 'inherit');
            }
        }
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            if (!this._editor) {
                return;
            }
            const nbCell = node.element.cell;
            const nbViewModel = this._editor.getViewModel();
            if (!nbViewModel) {
                return;
            }
            const idx = nbViewModel.getCellIndex(nbCell);
            const length = isCodeCell ? 0 : nbViewModel.getFoldedLength(idx);
            const scopedContextKeyService = template.elementDisposables.add(this._contextKeyService.createScoped(template.container));
            NotebookOutlineContext.CellKind.bindTo(scopedContextKeyService).set(isCodeCell ? CellKind.Code : CellKind.Markup);
            NotebookOutlineContext.CellHasChildren.bindTo(scopedContextKeyService).set(length > 0);
            NotebookOutlineContext.CellHasHeader.bindTo(scopedContextKeyService).set(node.element.level !== 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */);
            NotebookOutlineContext.OutlineElementTarget.bindTo(scopedContextKeyService).set(this._target);
            this.setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell);
            const outlineEntryToolbar = template.elementDisposables.add(new ToolBar(template.actionMenu, this._contextMenuService, {
                actionViewItemProvider: action => {
                    if (action instanceof MenuItemAction) {
                        return this._instantiationService.createInstance(MenuEntryActionViewItem, action, undefined);
                    }
                    return undefined;
                },
            }));
            const menu = template.elementDisposables.add(this._menuService.createMenu(MenuId.NotebookOutlineActionMenu, scopedContextKeyService));
            const actions = getOutlineToolbarActions(menu, { notebookEditor: this._editor, outlineEntry: node.element });
            outlineEntryToolbar.setActions(actions.primary, actions.secondary);
            this.setupToolbarListeners(this._editor, outlineEntryToolbar, menu, actions, node.element, template);
            template.actionMenu.style.padding = '0 0.8em 0 0.4em';
        }
    }
    disposeTemplate(templateData) {
        templateData.iconLabel.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
        DOM.clearNode(templateData.actionMenu);
    }
    setupFolding(isCodeCell, nbViewModel, scopedContextKeyService, template, nbCell) {
        const foldingState = isCodeCell ? 0 /* CellFoldingState.None */ : (nbCell.foldingState);
        const foldingStateCtx = NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService);
        foldingStateCtx.set(foldingState);
        if (!isCodeCell) {
            template.elementDisposables.add(nbViewModel.onDidFoldingStateChanged(() => {
                const foldingState = nbCell.foldingState;
                NotebookOutlineContext.CellFoldingState.bindTo(scopedContextKeyService).set(foldingState);
                foldingStateCtx.set(foldingState);
            }));
        }
    }
    setupToolbarListeners(editor, toolbar, menu, initActions, entry, templateData) {
        // same fix as in cellToolbars setupListeners re #103926
        let dropdownIsVisible = false;
        let deferredUpdate;
        toolbar.setActions(initActions.primary, initActions.secondary);
        templateData.elementDisposables.add(menu.onDidChange(() => {
            if (dropdownIsVisible) {
                const actions = getOutlineToolbarActions(menu, { notebookEditor: editor, outlineEntry: entry });
                deferredUpdate = () => toolbar.setActions(actions.primary, actions.secondary);
                return;
            }
            const actions = getOutlineToolbarActions(menu, { notebookEditor: editor, outlineEntry: entry });
            toolbar.setActions(actions.primary, actions.secondary);
        }));
        templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
        templateData.elementDisposables.add(toolbar.onDidChangeDropdownVisibility(visible => {
            dropdownIsVisible = visible;
            if (visible) {
                templateData.container.classList.add('notebook-outline-toolbar-dropdown-active');
            }
            else {
                templateData.container.classList.remove('notebook-outline-toolbar-dropdown-active');
            }
            if (deferredUpdate && !visible) {
                disposableTimeout(() => {
                    deferredUpdate?.();
                }, 0, templateData.elementDisposables);
                deferredUpdate = undefined;
            }
        }));
    }
};
NotebookOutlineRenderer = __decorate([
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IMenuService),
    __param(7, IInstantiationService)
], NotebookOutlineRenderer);
function getOutlineToolbarActions(menu, args) {
    return getActionBarActions(menu.getActions({ shouldForwardArgs: true, arg: args }), g => /^inline/.test(g));
}
class NotebookOutlineAccessibility {
    getAriaLabel(element) {
        return element.label;
    }
    getWidgetAriaLabel() {
        return '';
    }
}
class NotebookNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
class NotebookOutlineVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return NotebookOutlineTemplate.templateId;
    }
}
let NotebookQuickPickProvider = class NotebookQuickPickProvider {
    constructor(notebookCellOutlineDataSourceRef, _configurationService, _themeService) {
        this.notebookCellOutlineDataSourceRef = notebookCellOutlineDataSourceRef;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._disposables = new DisposableStore();
        this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.gotoSymbolsAllSymbols)) {
                this.gotoShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.gotoSymbolsAllSymbols);
            }
        }));
    }
    getQuickPickElements() {
        const bucket = [];
        for (const entry of this.notebookCellOutlineDataSourceRef?.object?.entries ?? []) {
            entry.asFlatList(bucket);
        }
        const result = [];
        const { hasFileIcons } = this._themeService.getFileIconTheme();
        const isSymbol = (element) => !!element.symbolKind;
        const isCodeCell = (element) => (element.cell.cellKind === CellKind.Code && element.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */); // code cell entries are exactly level 7 by this constant
        for (let i = 0; i < bucket.length; i++) {
            const element = bucket[i];
            const nextElement = bucket[i + 1]; // can be undefined
            if (!this.gotoShowCodeCellSymbols
                && isSymbol(element)) {
                continue;
            }
            if (this.gotoShowCodeCellSymbols
                && isCodeCell(element)
                && nextElement && isSymbol(nextElement)) {
                continue;
            }
            const useFileIcon = hasFileIcons && !element.symbolKind;
            // todo@jrieken it is fishy that codicons cannot be used with iconClasses
            // but file icons can...
            result.push({
                element,
                label: useFileIcon ? element.label : `$(${element.icon.id}) ${element.label}`,
                ariaLabel: element.label,
                iconClasses: useFileIcon ? getIconClassesForLanguageId(element.cell.language ?? '') : undefined,
            });
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookQuickPickProvider = __decorate([
    __param(1, IConfigurationService),
    __param(2, IThemeService)
], NotebookQuickPickProvider);
export { NotebookQuickPickProvider };
/**
 * Checks if the given outline entry should be filtered out of the outlinePane
 *
 * @param entry the OutlineEntry to check
 * @param showMarkdownHeadersOnly whether to show only markdown headers
 * @param showCodeCells whether to show code cells
 * @param showCodeCellSymbols whether to show code cell symbols
 * @returns true if the entry should be filtered out of the outlinePane, false if the entry should be visible.
 */
function filterEntry(entry, showMarkdownHeadersOnly, showCodeCells, showCodeCellSymbols) {
    // if any are true, return true, this entry should NOT be included in the outline
    if ((showMarkdownHeadersOnly && entry.cell.cellKind === CellKind.Markup && entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) || // show headers only   + cell is mkdn + is level 7 (not header)
        (!showCodeCells && entry.cell.cellKind === CellKind.Code) || // show code cells off + cell is code
        (!showCodeCellSymbols && entry.cell.cellKind === CellKind.Code && entry.level > 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) // show symbols off    + cell is code + is level >7 (nb symbol levels)
    ) {
        return true;
    }
    return false;
}
let NotebookOutlinePaneProvider = class NotebookOutlinePaneProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.showCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
            }
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly)) {
                this.showMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
            }
        }));
    }
    getActiveEntry() {
        const newActive = this.outlineDataSourceRef?.object?.activeElement;
        if (!newActive) {
            return undefined;
        }
        if (!filterEntry(newActive, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
            return newActive;
        }
        // find a valid parent
        let parent = newActive.parent;
        while (parent) {
            if (filterEntry(parent, this.showMarkdownHeadersOnly, this.showCodeCells, this.showCodeCellSymbols)) {
                parent = parent.parent;
            }
            else {
                return parent;
            }
        }
        // no valid parent found, return undefined
        return undefined;
    }
    *getChildren(element) {
        const isOutline = element instanceof NotebookCellOutline;
        const entries = isOutline ? this.outlineDataSourceRef?.object?.entries ?? [] : element.children;
        for (const entry of entries) {
            if (entry.cell.cellKind === CellKind.Markup) {
                if (!this.showMarkdownHeadersOnly) {
                    yield entry;
                }
                else if (entry.level < 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
            else if (this.showCodeCells && entry.cell.cellKind === CellKind.Code) {
                if (this.showCodeCellSymbols) {
                    yield entry;
                }
                else if (entry.level === 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */) {
                    yield entry;
                }
            }
        }
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookOutlinePaneProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookOutlinePaneProvider);
export { NotebookOutlinePaneProvider };
let NotebookBreadcrumbsProvider = class NotebookBreadcrumbsProvider {
    constructor(outlineDataSourceRef, _configurationService) {
        this.outlineDataSourceRef = outlineDataSourceRef;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.showCodeCells = this._configurationService.getValue(NotebookSetting.breadcrumbsShowCodeCells);
            }
        }));
    }
    getBreadcrumbElements() {
        const result = [];
        let candidate = this.outlineDataSourceRef?.object?.activeElement;
        while (candidate) {
            if (this.showCodeCells || candidate.cell.cellKind !== CellKind.Code) {
                result.unshift(candidate);
            }
            candidate = candidate.parent;
        }
        return result;
    }
    dispose() {
        this._disposables.dispose();
    }
};
NotebookBreadcrumbsProvider = __decorate([
    __param(1, IConfigurationService)
], NotebookBreadcrumbsProvider);
export { NotebookBreadcrumbsProvider };
class NotebookComparator {
    constructor() {
        this._collator = safeIntl.Collator(undefined, { numeric: true });
    }
    compareByPosition(a, b) {
        return a.index - b.index;
    }
    compareByType(a, b) {
        return a.cell.cellKind - b.cell.cellKind || this._collator.value.compare(a.label, b.label);
    }
    compareByName(a, b) {
        return this._collator.value.compare(a.label, b.label);
    }
}
let NotebookCellOutline = class NotebookCellOutline {
    // getters
    get activeElement() {
        this.checkDelayer();
        if (this._target === 1 /* OutlineTarget.OutlinePane */) {
            return this.config.treeDataSource.getActiveEntry();
        }
        else {
            console.error('activeElement should not be called outside of the OutlinePane');
            return undefined;
        }
    }
    get entries() {
        this.checkDelayer();
        return this._outlineDataSourceReference?.object?.entries ?? [];
    }
    get uri() {
        return this._outlineDataSourceReference?.object?.uri;
    }
    get isEmpty() {
        if (!this._outlineDataSourceReference?.object?.entries) {
            return true;
        }
        return !this._outlineDataSourceReference.object.entries.some(entry => {
            return !filterEntry(entry, this.outlineShowMarkdownHeadersOnly, this.outlineShowCodeCells, this.outlineShowCodeCellSymbols);
        });
    }
    checkDelayer() {
        if (this.delayerRecomputeState.isTriggered()) {
            this.delayerRecomputeState.cancel();
            this.recomputeState();
        }
    }
    constructor(_editor, _target, _themeService, _editorService, _instantiationService, _configurationService, _languageFeaturesService, _notebookExecutionStateService) {
        this._editor = _editor;
        this._target = _target;
        this._themeService = _themeService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.outlineKind = 'notebookCells';
        this._disposables = new DisposableStore();
        this._modelDisposables = new DisposableStore();
        this._dataSourceDisposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.delayerRecomputeState = this._disposables.add(new Delayer(300));
        this.delayerRecomputeActive = this._disposables.add(new Delayer(200));
        // this can be long, because it will force a recompute at the end, so ideally we only do this once all nb language features are registered
        this.delayerRecomputeSymbols = this._disposables.add(new Delayer(2000));
        this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        this.initializeOutline();
        const delegate = new NotebookOutlineVirtualDelegate();
        const renderers = [this._instantiationService.createInstance(NotebookOutlineRenderer, this._editor.getControl(), this._target)];
        const comparator = new NotebookComparator();
        const options = {
            collapseByDefault: this._target === 2 /* OutlineTarget.Breadcrumbs */ || (this._target === 1 /* OutlineTarget.OutlinePane */ && this._configurationService.getValue("outline.collapseItems" /* OutlineConfigKeys.collapseItems */) === "alwaysCollapse" /* OutlineConfigCollapseItemsValues.Collapsed */),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            accessibilityProvider: new NotebookOutlineAccessibility(),
            identityProvider: { getId: element => element.cell.uri.toString() },
            keyboardNavigationLabelProvider: new NotebookNavigationLabelProvider()
        };
        this.config = {
            treeDataSource: this._treeDataSource,
            quickPickDataSource: this._quickPickDataSource,
            breadcrumbsDataSource: this._breadcrumbsDataSource,
            delegate,
            renderers,
            comparator,
            options
        };
    }
    initializeOutline() {
        // initial setup
        this.setDataSources();
        this.setModelListeners();
        // reset the data sources + model listeners when we get a new notebook model
        this._disposables.add(this._editor.onDidChangeModel(() => {
            this.setDataSources();
            this.setModelListeners();
            this.computeSymbols();
        }));
        // recompute symbols as document symbol providers are updated in the language features registry
        this._disposables.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
            this.delayedComputeSymbols();
        }));
        // recompute active when the selection changes
        this._disposables.add(this._editor.onDidChangeSelection(() => {
            this.delayedRecomputeActive();
        }));
        // recompute state when filter config changes
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowMarkdownHeadersOnly) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCells) ||
                e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols) ||
                e.affectsConfiguration(NotebookSetting.breadcrumbsShowCodeCells)) {
                this.outlineShowCodeCells = this._configurationService.getValue(NotebookSetting.outlineShowCodeCells);
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.outlineShowMarkdownHeadersOnly = this._configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
                this.delayedRecomputeState();
            }
        }));
        // recompute state when execution states change
        this._disposables.add(this._notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && !!this._editor.textModel && e.affectsNotebook(this._editor.textModel?.uri)) {
                this.delayedRecomputeState();
            }
        }));
        // recompute symbols when the configuration changes (recompute state - and therefore recompute active - is also called within compute symbols)
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.outlineShowCodeCellSymbols)) {
                this.outlineShowCodeCellSymbols = this._configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
                this.computeSymbols();
            }
        }));
        // fire a change event when the theme changes
        this._disposables.add(this._themeService.onDidFileIconThemeChange(() => {
            this._onDidChange.fire({});
        }));
        // finish with a recompute state
        this.recomputeState();
    }
    /**
     * set up the primary data source + three viewing sources for the various outline views
     */
    setDataSources() {
        const notebookEditor = this._editor.getControl();
        this._outlineDataSourceReference?.dispose();
        this._dataSourceDisposables.clear();
        if (!notebookEditor?.hasModel()) {
            this._outlineDataSourceReference = undefined;
        }
        else {
            this._outlineDataSourceReference = this._dataSourceDisposables.add(this._instantiationService.invokeFunction((accessor) => accessor.get(INotebookCellOutlineDataSourceFactory).getOrCreate(notebookEditor)));
            // escalate outline data source change events
            this._dataSourceDisposables.add(this._outlineDataSourceReference.object.onDidChange(() => {
                this._onDidChange.fire({});
            }));
        }
        // these fields can be passed undefined outlineDataSources. View Providers all handle it accordingly
        this._treeDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookOutlinePaneProvider, this._outlineDataSourceReference));
        this._quickPickDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookQuickPickProvider, this._outlineDataSourceReference));
        this._breadcrumbsDataSource = this._dataSourceDisposables.add(this._instantiationService.createInstance(NotebookBreadcrumbsProvider, this._outlineDataSourceReference));
    }
    /**
     * set up the listeners for the outline content, these respond to model changes in the notebook
     */
    setModelListeners() {
        this._modelDisposables.clear();
        if (!this._editor.textModel) {
            return;
        }
        // Perhaps this is the first time we're building the outline
        if (!this.entries.length) {
            this.computeSymbols();
        }
        // recompute state when there are notebook content changes
        this._modelDisposables.add(this._editor.textModel.onDidChangeContent(contentChanges => {
            if (contentChanges.rawEvents.some(c => c.kind === NotebookCellsChangeType.ChangeCellContent ||
                c.kind === NotebookCellsChangeType.ChangeCellInternalMetadata ||
                c.kind === NotebookCellsChangeType.Move ||
                c.kind === NotebookCellsChangeType.ModelChange)) {
                this.delayedRecomputeState();
            }
        }));
    }
    async computeSymbols(cancelToken = CancellationToken.None) {
        if (this._target === 1 /* OutlineTarget.OutlinePane */ && this.outlineShowCodeCellSymbols) {
            // No need to wait for this, we want the outline to show up quickly.
            void this.doComputeSymbols(cancelToken);
        }
    }
    async doComputeSymbols(cancelToken) {
        await this._outlineDataSourceReference?.object?.computeFullSymbols(cancelToken);
    }
    async delayedComputeSymbols() {
        this.delayerRecomputeState.cancel();
        this.delayerRecomputeActive.cancel();
        this.delayerRecomputeSymbols.trigger(() => { this.computeSymbols(); });
    }
    recomputeState() { this._outlineDataSourceReference?.object?.recomputeState(); }
    delayedRecomputeState() {
        this.delayerRecomputeActive.cancel(); // Active is always recomputed after a recomputing the State.
        this.delayerRecomputeState.trigger(() => { this.recomputeState(); });
    }
    recomputeActive() { this._outlineDataSourceReference?.object?.recomputeActive(); }
    delayedRecomputeActive() {
        this.delayerRecomputeActive.trigger(() => { this.recomputeActive(); });
    }
    async reveal(entry, options, sideBySide) {
        const notebookEditorOptions = {
            ...options,
            override: this._editor.input?.editorId,
            cellRevealType: 2 /* CellRevealType.Top */,
            selection: entry.position,
            viewState: undefined,
        };
        await this._editorService.openEditor({
            resource: entry.cell.uri,
            options: notebookEditorOptions,
        }, sideBySide ? SIDE_GROUP : undefined);
    }
    preview(entry) {
        const widget = this._editor.getControl();
        if (!widget) {
            return Disposable.None;
        }
        if (entry.range) {
            const range = Range.lift(entry.range);
            widget.revealRangeInCenterIfOutsideViewportAsync(entry.cell, range);
        }
        else {
            widget.revealInCenterIfOutsideViewport(entry.cell);
        }
        const ids = widget.deltaCellDecorations([], [{
                handle: entry.cell.handle,
                options: { className: 'nb-symbolHighlight', outputClassName: 'nb-symbolHighlight' }
            }]);
        let editorDecorations;
        widget.changeModelDecorations(accessor => {
            if (entry.range) {
                const decorations = [
                    {
                        range: entry.range, options: {
                            description: 'document-symbols-outline-range-highlight',
                            className: 'rangeHighlight',
                            isWholeLine: true
                        }
                    }
                ];
                const deltaDecoration = {
                    ownerId: entry.cell.handle,
                    decorations: decorations
                };
                editorDecorations = accessor.deltaDecorations([], [deltaDecoration]);
            }
        });
        return toDisposable(() => {
            widget.deltaCellDecorations(ids, []);
            if (editorDecorations?.length) {
                widget.changeModelDecorations(accessor => {
                    accessor.deltaDecorations(editorDecorations, []);
                });
            }
        });
    }
    captureViewState() {
        const widget = this._editor.getControl();
        const viewState = widget?.getEditorViewState();
        return toDisposable(() => {
            if (viewState) {
                widget?.restoreListViewState(viewState);
            }
        });
    }
    dispose() {
        this._onDidChange.dispose();
        this._disposables.dispose();
        this._modelDisposables.dispose();
        this._dataSourceDisposables.dispose();
        this._outlineDataSourceReference?.dispose();
    }
};
NotebookCellOutline = __decorate([
    __param(2, IThemeService),
    __param(3, IEditorService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILanguageFeaturesService),
    __param(7, INotebookExecutionStateService)
], NotebookCellOutline);
export { NotebookCellOutline };
let NotebookOutlineCreator = class NotebookOutlineCreator {
    constructor(outlineService, _instantiationService) {
        this._instantiationService = _instantiationService;
        const reg = outlineService.registerOutlineCreator(this);
        this.dispose = () => reg.dispose();
    }
    matches(candidate) {
        return candidate.getId() === NotebookEditor.ID;
    }
    async createOutline(editor, target, cancelToken) {
        const outline = this._instantiationService.createInstance(NotebookCellOutline, editor, target);
        if (target === 4 /* OutlineTarget.QuickPick */) {
            // The quickpick creates the outline on demand
            // so we need to ensure the symbols are pre-cached before the entries are syncronously requested
            await outline.doComputeSymbols(cancelToken);
        }
        return outline;
    }
};
NotebookOutlineCreator = __decorate([
    __param(0, IOutlineService),
    __param(1, IInstantiationService)
], NotebookOutlineCreator);
export { NotebookOutlineCreator };
export const NotebookOutlineContext = {
    CellKind: new RawContextKey('notebookCellKind', undefined),
    CellHasChildren: new RawContextKey('notebookCellHasChildren', false),
    CellHasHeader: new RawContextKey('notebookCellHasHeader', false),
    CellFoldingState: new RawContextKey('notebookCellFoldingState', 0 /* CellFoldingState.None */),
    OutlineElementTarget: new RawContextKey('notebookOutlineElementTarget', undefined),
};
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookOutlineCreator, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    'properties': {
        [NotebookSetting.outlineShowMarkdownHeadersOnly]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showMarkdownHeadersOnly', "When enabled, notebook outline will show only markdown cells containing a header.")
        },
        [NotebookSetting.outlineShowCodeCells]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('outline.showCodeCells', "When enabled, notebook outline shows code cells.")
        },
        [NotebookSetting.outlineShowCodeCellSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('outline.showCodeCellSymbols', "When enabled, notebook outline shows code cell symbols. Relies on `notebook.outline.showCodeCells` being enabled.")
        },
        [NotebookSetting.breadcrumbsShowCodeCells]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('breadcrumbs.showCodeCells', "When enabled, notebook breadcrumbs contain code cells.")
        },
        [NotebookSetting.gotoSymbolsAllSymbols]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('notebook.gotoSymbols.showAllSymbols', "When enabled, the Go to Symbol Quick Pick will display full code symbols from the notebook, as well as Markdown headers.")
        },
    }
});
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    submenu: MenuId.NotebookOutlineFilter,
    title: localize('filter', "Filter Entries"),
    icon: Codicon.filter,
    group: 'navigation',
    order: -1,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), NOTEBOOK_IS_ACTIVE_EDITOR),
});
registerAction2(class ToggleShowMarkdownHeadersOnly extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleShowMarkdownHeadersOnly',
            title: localize('toggleShowMarkdownHeadersOnly', "Markdown Headers Only"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showMarkdownHeadersOnly', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                group: '0_markdown_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showMarkdownHeadersOnly = configurationService.getValue(NotebookSetting.outlineShowMarkdownHeadersOnly);
        configurationService.updateValue(NotebookSetting.outlineShowMarkdownHeadersOnly, !showMarkdownHeadersOnly);
    }
});
registerAction2(class ToggleCodeCellEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCells',
            title: localize('toggleCodeCells', "Code Cells"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCells', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 1,
                group: '1_code_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCells = configurationService.getValue(NotebookSetting.outlineShowCodeCells);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCells, !showCodeCells);
    }
});
registerAction2(class ToggleCodeCellSymbolEntries extends Action2 {
    constructor() {
        super({
            id: 'notebook.outline.toggleCodeCellSymbols',
            title: localize('toggleCodeCellSymbols', "Code Cell Symbols"),
            f1: false,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.outline.showCodeCellSymbols', true)
            },
            menu: {
                id: MenuId.NotebookOutlineFilter,
                order: 2,
                group: '1_code_cells',
            }
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const showCodeCellSymbols = configurationService.getValue(NotebookSetting.outlineShowCodeCellSymbols);
        configurationService.updateValue(NotebookSetting.outlineShowCodeCellSymbols, !showCodeCellSymbols);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvb3V0bGluZS9ub3RlYm9va091dGxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9FLE9BQU8sRUFBMEIsU0FBUyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFJN0csT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQW1CLE1BQU0sNENBQTRDLENBQUM7QUFDckksT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXZFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sMEVBQTBFLENBQUM7QUFFekosT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLGtFQUFrRSxDQUFDO0FBRTNILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEYsT0FB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