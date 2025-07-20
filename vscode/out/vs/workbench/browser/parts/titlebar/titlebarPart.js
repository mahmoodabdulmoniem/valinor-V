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
var AuxiliaryBrowserTitlebarPart_1;
import './media/titlebarpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MultiWindowParts, Part } from '../../part.js';
import { getWCOTitlebarAreaRect, getZoomFactor, isWCOEnabled } from '../../../../base/browser/browser.js';
import { getTitleBarStyle, getMenuBarVisibility, hasCustomTitlebar, hasNativeTitlebar, DEFAULT_CUSTOM_TITLEBAR_HEIGHT, getWindowControlsStyle, hasNativeMenu } from '../../../../platform/window/common/window.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TITLE_BAR_ACTIVE_BACKGROUND, TITLE_BAR_ACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_BACKGROUND, TITLE_BAR_BORDER, WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { isMacintosh, isWindows, isLinux, isWeb, isNative, platformLocale } from '../../../../base/common/platform.js';
import { Color } from '../../../../base/common/color.js';
import { EventType, EventHelper, Dimension, append, $, addDisposableListener, prepend, reset, getWindow, getWindowId, isAncestor, getActiveDocument, isHTMLElement } from '../../../../base/browser/dom.js';
import { CustomMenubarControl } from './menubarControl.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { createActionViewItem, fillInActionBarActions as fillInActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { WindowTitle } from './windowTitle.js';
import { CommandCenterControl } from './commandCenterControl.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../../common/activity.js';
import { AccountsActivityActionViewItem, isAccountsActionVisible, SimpleAccountActivityActionViewItem, SimpleGlobalActivityActionViewItem } from '../globalCompositeBar.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from '../editor/editorCommands.js';
import { EditorPane } from '../editor/editorPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EditorCommandsContextActionRunner } from '../editor/editorTabsControl.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ACCOUNTS_ACTIVITY_TILE_ACTION, GLOBAL_ACTIVITY_TITLE_ACTION } from './titlebarActions.js';
import { createInstantHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { safeIntl } from '../../../../base/common/date.js';
import { IsCompactTitleBarContext, TitleBarVisibleContext } from '../../../common/contextkeys.js';
let BrowserTitleService = class BrowserTitleService extends MultiWindowParts {
    constructor(instantiationService, storageService, themeService) {
        super('workbench.titleService', themeService, storageService);
        this.instantiationService = instantiationService;
        this.properties = undefined;
        this.variables = new Map();
        this.mainPart = this._register(this.createMainTitlebarPart());
        this.onMenubarVisibilityChange = this.mainPart.onMenubarVisibilityChange;
        this._register(this.registerPart(this.mainPart));
        this.registerActions();
        this.registerAPICommands();
    }
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainBrowserTitlebarPart);
    }
    registerActions() {
        // Focus action
        const that = this;
        this._register(registerAction2(class FocusTitleBar extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.focusTitleBar`,
                    title: localize2('focusTitleBar', 'Focus Title Bar'),
                    category: Categories.View,
                    f1: true,
                    precondition: TitleBarVisibleContext
                });
            }
            run() {
                that.getPartByDocument(getActiveDocument())?.focus();
            }
        }));
    }
    registerAPICommands() {
        this._register(CommandsRegistry.registerCommand({
            id: 'registerWindowTitleVariable',
            handler: (accessor, name, contextKey) => {
                this.registerVariables([{ name, contextKey }]);
            },
            metadata: {
                description: 'Registers a new title variable',
                args: [
                    { name: 'name', schema: { type: 'string' }, description: 'The name of the variable to register' },
                    { name: 'contextKey', schema: { type: 'string' }, description: 'The context key to use for the value of the variable' }
                ]
            }
        }));
    }
    //#region Auxiliary Titlebar Parts
    createAuxiliaryTitlebarPart(container, editorGroupsContainer, instantiationService) {
        const titlebarPartContainer = $('.part.titlebar', { role: 'none' });
        titlebarPartContainer.style.position = 'relative';
        container.insertBefore(titlebarPartContainer, container.firstChild); // ensure we are first element
        const disposables = new DisposableStore();
        const titlebarPart = this.doCreateAuxiliaryTitlebarPart(titlebarPartContainer, editorGroupsContainer, instantiationService);
        disposables.add(this.registerPart(titlebarPart));
        disposables.add(Event.runAndSubscribe(titlebarPart.onDidChange, () => titlebarPartContainer.style.height = `${titlebarPart.height}px`));
        titlebarPart.create(titlebarPartContainer);
        if (this.properties) {
            titlebarPart.updateProperties(this.properties);
        }
        if (this.variables.size) {
            titlebarPart.registerVariables(Array.from(this.variables.values()));
        }
        Event.once(titlebarPart.onWillDispose)(() => disposables.dispose());
        return titlebarPart;
    }
    doCreateAuxiliaryTitlebarPart(container, editorGroupsContainer, instantiationService) {
        return instantiationService.createInstance(AuxiliaryBrowserTitlebarPart, container, editorGroupsContainer, this.mainPart);
    }
    updateProperties(properties) {
        this.properties = properties;
        for (const part of this.parts) {
            part.updateProperties(properties);
        }
    }
    registerVariables(variables) {
        const newVariables = [];
        for (const variable of variables) {
            if (!this.variables.has(variable.name)) {
                this.variables.set(variable.name, variable);
                newVariables.push(variable);
            }
        }
        for (const part of this.parts) {
            part.registerVariables(newVariables);
        }
    }
};
BrowserTitleService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService)
], BrowserTitleService);
export { BrowserTitleService };
let BrowserTitlebarPart = class BrowserTitlebarPart extends Part {
    get minimumHeight() {
        const wcoEnabled = isWeb && isWCOEnabled();
        let value = this.isCommandCenterVisible || wcoEnabled ? DEFAULT_CUSTOM_TITLEBAR_HEIGHT : 30;
        if (wcoEnabled) {
            value = Math.max(value, getWCOTitlebarAreaRect(getWindow(this.element))?.height ?? 0);
        }
        return value / (this.preventZoom ? getZoomFactor(getWindow(this.element)) : 1);
    }
    get maximumHeight() { return this.minimumHeight; }
    constructor(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorService, menuService, keybindingService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.editorGroupsContainer = editorGroupsContainer;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.hostService = hostService;
        this.editorService = editorService;
        this.menuService = menuService;
        this.keybindingService = keybindingService;
        //#region IView
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        //#endregion
        //#region Events
        this._onMenubarVisibilityChange = this._register(new Emitter());
        this.onMenubarVisibilityChange = this._onMenubarVisibilityChange.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.customMenubar = this._register(new MutableDisposable());
        this.actionToolBarDisposable = this._register(new DisposableStore());
        this.editorActionsChangeDisposable = this._register(new DisposableStore());
        this.globalToolbarMenuDisposables = this._register(new DisposableStore());
        this.editorToolbarMenuDisposables = this._register(new DisposableStore());
        this.layoutToolbarMenuDisposables = this._register(new DisposableStore());
        this.activityToolbarDisposables = this._register(new DisposableStore());
        this.titleDisposables = this._register(new DisposableStore());
        this.isInactive = false;
        this.isCompact = false;
        this.isAuxiliary = targetWindow.vscodeWindowId !== mainWindow.vscodeWindowId;
        this.isCompactContextKey = IsCompactTitleBarContext.bindTo(this.contextKeyService);
        this.titleBarStyle = getTitleBarStyle(this.configurationService);
        this.windowTitle = this._register(instantiationService.createInstance(WindowTitle, targetWindow));
        this.hoverDelegate = this._register(createInstantHoverDelegate());
        this.registerListeners(getWindowId(targetWindow));
    }
    registerListeners(targetWindowId) {
        this._register(this.hostService.onDidChangeFocus(focused => focused ? this.onFocus() : this.onBlur()));
        this._register(this.hostService.onDidChangeActiveWindow(windowId => windowId === targetWindowId ? this.onFocus() : this.onBlur()));
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChanged(e)));
        this._register(this.editorGroupsContainer.onDidChangeEditorPartOptions(e => this.onEditorPartConfigurationChange(e)));
    }
    onBlur() {
        this.isInactive = true;
        this.updateStyles();
    }
    onFocus() {
        this.isInactive = false;
        this.updateStyles();
    }
    onEditorPartConfigurationChange({ oldPartOptions, newPartOptions }) {
        if (oldPartOptions.editorActionsLocation !== newPartOptions.editorActionsLocation ||
            oldPartOptions.showTabs !== newPartOptions.showTabs) {
            if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
                this.createActionToolBar();
                this.createActionToolBarMenus({ editorActions: true });
                this._onDidChange.fire(undefined);
            }
        }
    }
    onConfigurationChanged(event) {
        // Custom menu bar (disabled if auxiliary)
        if (!this.isAuxiliary && !hasNativeMenu(this.configurationService, this.titleBarStyle) && (!isMacintosh || isWeb)) {
            if (event.affectsConfiguration("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */)) {
                if (this.currentMenubarVisibility === 'compact') {
                    this.uninstallMenubar();
                }
                else {
                    this.installMenubar();
                }
            }
        }
        // Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
            const affectsLayoutControl = event.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
            const affectsActivityControl = event.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
            if (affectsLayoutControl || affectsActivityControl) {
                this.createActionToolBarMenus({ layoutActions: affectsLayoutControl, activityActions: affectsActivityControl });
                this._onDidChange.fire(undefined);
            }
        }
        // Command Center
        if (event.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
            this.recreateTitle();
        }
    }
    recreateTitle() {
        this.createTitle();
        this._onDidChange.fire(undefined);
    }
    updateOptions(options) {
        const oldIsCompact = this.isCompact;
        this.isCompact = options.compact;
        this.isCompactContextKey.set(this.isCompact);
        if (oldIsCompact !== this.isCompact) {
            this.recreateTitle();
            this.createActionToolBarMenus(true);
        }
    }
    installMenubar() {
        if (this.menubar) {
            return; // If the menubar is already installed, skip
        }
        this.customMenubar.value = this.instantiationService.createInstance(CustomMenubarControl);
        this.menubar = append(this.leftContent, $('div.menubar'));
        this.menubar.setAttribute('role', 'menubar');
        this._register(this.customMenubar.value.onVisibilityChange(e => this.onMenubarVisibilityChanged(e)));
        this.customMenubar.value.create(this.menubar);
    }
    uninstallMenubar() {
        this.customMenubar.value = undefined;
        this.menubar?.remove();
        this.menubar = undefined;
        this.onMenubarVisibilityChanged(false);
    }
    onMenubarVisibilityChanged(visible) {
        if (isWeb || isWindows || isLinux) {
            if (this.lastLayoutDimensions) {
                this.layout(this.lastLayoutDimensions.width, this.lastLayoutDimensions.height);
            }
            this._onMenubarVisibilityChange.fire(visible);
        }
    }
    updateProperties(properties) {
        this.windowTitle.updateProperties(properties);
    }
    registerVariables(variables) {
        this.windowTitle.registerVariables(variables);
    }
    createContentArea(parent) {
        this.element = parent;
        this.rootContainer = append(parent, $('.titlebar-container'));
        this.leftContent = append(this.rootContainer, $('.titlebar-left'));
        this.centerContent = append(this.rootContainer, $('.titlebar-center'));
        this.rightContent = append(this.rootContainer, $('.titlebar-right'));
        // App Icon (Windows, Linux)
        if ((isWindows || isLinux) && !hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            this.appIcon = prepend(this.leftContent, $('a.window-appicon'));
        }
        // Draggable region that we can manipulate for #52522
        this.dragRegion = prepend(this.rootContainer, $('div.titlebar-drag-region'));
        // Menubar: install a custom menu bar depending on configuration
        if (!this.isAuxiliary &&
            !hasNativeMenu(this.configurationService, this.titleBarStyle) &&
            (!isMacintosh || isWeb) &&
            this.currentMenubarVisibility !== 'compact') {
            this.installMenubar();
        }
        // Title
        this.title = append(this.centerContent, $('div.window-title'));
        this.createTitle();
        // Create Toolbar Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            this.actionToolBarElement = append(this.rightContent, $('div.action-toolbar-container'));
            this.createActionToolBar();
            this.createActionToolBarMenus();
        }
        // Window Controls Container
        if (!hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            let primaryWindowControlsLocation = isMacintosh ? 'left' : 'right';
            if (isMacintosh && isNative) {
                // Check if the locale is RTL, macOS will move traffic lights in RTL locales
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/textInfo
                const localeInfo = safeIntl.Locale(platformLocale).value;
                if (localeInfo?.textInfo?.direction === 'rtl') {
                    primaryWindowControlsLocation = 'right';
                }
            }
            if (isMacintosh && isNative && primaryWindowControlsLocation === 'left') {
                // macOS native: controls are on the left and the container is not needed to make room
                // for something, except for web where a custom menu being supported). not putting the
                // container helps with allowing to move the window when clicking very close to the
                // window control buttons.
            }
            else if (getWindowControlsStyle(this.configurationService) === "hidden" /* WindowControlsStyle.HIDDEN */) {
                // Linux/Windows: controls are explicitly disabled
            }
            else {
                this.windowControlsContainer = append(primaryWindowControlsLocation === 'left' ? this.leftContent : this.rightContent, $('div.window-controls-container'));
                if (isWeb) {
                    // Web: its possible to have control overlays on both sides, for example on macOS
                    // with window controls on the left and PWA controls on the right.
                    append(primaryWindowControlsLocation === 'left' ? this.rightContent : this.leftContent, $('div.window-controls-container'));
                }
                if (isWCOEnabled()) {
                    this.windowControlsContainer.classList.add('wco-enabled');
                }
            }
        }
        // Context menu over title bar: depending on the OS and the location of the click this will either be
        // the overall context menu for the entire title bar or a specific title context menu.
        // Windows / Linux: we only support the overall context menu on the title bar
        // macOS: we support both the overall context menu and the title context menu.
        //        in addition, we allow Cmd+click to bring up the title context menu.
        {
            this._register(addDisposableListener(this.rootContainer, EventType.CONTEXT_MENU, e => {
                EventHelper.stop(e);
                let targetMenu;
                if (isMacintosh && isHTMLElement(e.target) && isAncestor(e.target, this.title)) {
                    targetMenu = MenuId.TitleBarTitleContext;
                }
                else {
                    targetMenu = MenuId.TitleBarContext;
                }
                this.onContextMenu(e, targetMenu);
            }));
            if (isMacintosh) {
                this._register(addDisposableListener(this.title, EventType.MOUSE_DOWN, e => {
                    if (e.metaKey) {
                        EventHelper.stop(e, true /* stop bubbling to prevent command center from opening */);
                        this.onContextMenu(e, MenuId.TitleBarTitleContext);
                    }
                }, true /* capture phase to prevent command center from opening */));
            }
        }
        this.updateStyles();
        return this.element;
    }
    createTitle() {
        this.titleDisposables.clear();
        const isShowingTitleInNativeTitlebar = hasNativeTitlebar(this.configurationService, this.titleBarStyle);
        // Text Title
        if (!this.isCommandCenterVisible) {
            if (!isShowingTitleInNativeTitlebar) {
                this.title.innerText = this.windowTitle.value;
                this.titleDisposables.add(this.windowTitle.onDidChange(() => {
                    this.title.innerText = this.windowTitle.value;
                    if (this.lastLayoutDimensions) {
                        this.updateLayout(this.lastLayoutDimensions); // layout menubar and other renderings in the titlebar
                    }
                }));
            }
            else {
                reset(this.title);
            }
        }
        // Menu Title
        else {
            const commandCenter = this.instantiationService.createInstance(CommandCenterControl, this.windowTitle, this.hoverDelegate);
            reset(this.title, commandCenter.element);
            this.titleDisposables.add(commandCenter);
        }
    }
    actionViewItemProvider(action, options) {
        // --- Activity Actions
        if (!this.isAuxiliary) {
            if (action.id === GLOBAL_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleGlobalActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
            if (action.id === ACCOUNTS_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleAccountActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
        }
        // --- Editor Actions
        const activeEditorPane = this.editorGroupsContainer.activeGroup?.activeEditorPane;
        if (activeEditorPane && activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, { ...options, menuAsChild: false });
    }
    getKeybinding(action) {
        const editorPaneAwareContextKeyService = this.editorGroupsContainer.activeGroup?.activeEditorPane?.scopedContextKeyService ?? this.contextKeyService;
        return this.keybindingService.lookupKeybinding(action.id, editorPaneAwareContextKeyService);
    }
    createActionToolBar() {
        // Creates the action tool bar. Depends on the configuration of the title bar menus
        // Requires to be recreated whenever editor actions enablement changes
        this.actionToolBarDisposable.clear();
        this.actionToolBar = this.actionToolBarDisposable.add(this.instantiationService.createInstance(WorkbenchToolBar, this.actionToolBarElement, {
            contextMenu: MenuId.TitleBarContext,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelTitleActions', "Title actions"),
            getKeyBinding: action => this.getKeybinding(action),
            overflowBehavior: { maxItems: 9, exempted: [ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID, ...EDITOR_CORE_NAVIGATION_COMMANDS] },
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            telemetrySource: 'titlePart',
            highlightToggledItems: this.editorActionsEnabled || this.isAuxiliary, // Only show toggled state for editor actions or auxiliary title bars
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            hoverDelegate: this.hoverDelegate
        }));
        if (this.editorActionsEnabled) {
            this.actionToolBarDisposable.add(this.editorGroupsContainer.onDidChangeActiveGroup(() => this.createActionToolBarMenus({ editorActions: true })));
        }
    }
    createActionToolBarMenus(update = true) {
        if (update === true) {
            update = { editorActions: true, layoutActions: true, globalActions: true, activityActions: true };
        }
        const updateToolBarActions = () => {
            const actions = { primary: [], secondary: [] };
            // --- Editor Actions
            if (this.editorActionsEnabled) {
                this.editorActionsChangeDisposable.clear();
                const activeGroup = this.editorGroupsContainer.activeGroup;
                if (activeGroup) {
                    const editorActions = activeGroup.createEditorActions(this.editorActionsChangeDisposable, this.isAuxiliary && this.isCompact ? MenuId.CompactWindowEditorTitle : MenuId.EditorTitle);
                    actions.primary.push(...editorActions.actions.primary);
                    actions.secondary.push(...editorActions.actions.secondary);
                    this.editorActionsChangeDisposable.add(editorActions.onDidChange(() => updateToolBarActions()));
                }
            }
            // --- Global Actions
            if (this.globalToolbarMenu) {
                fillInActionBarActions(this.globalToolbarMenu.getActions(), actions);
            }
            // --- Layout Actions
            if (this.layoutToolbarMenu) {
                fillInActionBarActions(this.layoutToolbarMenu.getActions(), actions, () => !this.editorActionsEnabled || this.isCompact // layout actions move to "..." if editor actions are enabled unless compact
                );
            }
            // --- Activity Actions (always at the end)
            if (this.activityActionsEnabled) {
                if (isAccountsActionVisible(this.storageService)) {
                    actions.primary.push(ACCOUNTS_ACTIVITY_TILE_ACTION);
                }
                actions.primary.push(GLOBAL_ACTIVITY_TITLE_ACTION);
            }
            this.actionToolBar.setActions(prepareActions(actions.primary), prepareActions(actions.secondary));
        };
        // Create/Update the menus which should be in the title tool bar
        if (update.editorActions) {
            this.editorToolbarMenuDisposables.clear();
            // The editor toolbar menu is handled by the editor group so we do not need to manage it here.
            // However, depending on the active editor, we need to update the context and action runner of the toolbar menu.
            if (this.editorActionsEnabled && this.editorService.activeEditor !== undefined) {
                const context = { groupId: this.editorGroupsContainer.activeGroup.id };
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new EditorCommandsContextActionRunner(context));
                this.actionToolBar.context = context;
            }
            else {
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new ActionRunner());
                this.actionToolBar.context = undefined;
            }
        }
        if (update.layoutActions) {
            this.layoutToolbarMenuDisposables.clear();
            if (this.layoutControlEnabled) {
                this.layoutToolbarMenu = this.menuService.createMenu(MenuId.LayoutControlMenu, this.contextKeyService);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu.onDidChange(() => updateToolBarActions()));
            }
            else {
                this.layoutToolbarMenu = undefined;
            }
        }
        if (update.globalActions) {
            this.globalToolbarMenuDisposables.clear();
            if (this.globalActionsEnabled) {
                this.globalToolbarMenu = this.menuService.createMenu(MenuId.TitleBar, this.contextKeyService);
                this.globalToolbarMenuDisposables.add(this.globalToolbarMenu);
                this.globalToolbarMenuDisposables.add(this.globalToolbarMenu.onDidChange(() => updateToolBarActions()));
            }
            else {
                this.globalToolbarMenu = undefined;
            }
        }
        if (update.activityActions) {
            this.activityToolbarDisposables.clear();
            if (this.activityActionsEnabled) {
                this.activityToolbarDisposables.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, this._store)(() => updateToolBarActions()));
            }
        }
        updateToolBarActions();
    }
    updateStyles() {
        super.updateStyles();
        // Part container
        if (this.element) {
            if (this.isInactive) {
                this.element.classList.add('inactive');
            }
            else {
                this.element.classList.remove('inactive');
            }
            const titleBackground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_BACKGROUND : TITLE_BAR_ACTIVE_BACKGROUND, (color, theme) => {
                // LCD Rendering Support: the title bar part is a defining its own GPU layer.
                // To benefit from LCD font rendering, we must ensure that we always set an
                // opaque background color. As such, we compute an opaque color given we know
                // the background color is the workbench background.
                return color.isOpaque() ? color : color.makeOpaque(WORKBENCH_BACKGROUND(theme));
            }) || '';
            this.element.style.backgroundColor = titleBackground;
            if (this.appIconBadge) {
                this.appIconBadge.style.backgroundColor = titleBackground;
            }
            if (titleBackground && Color.fromHex(titleBackground).isLighter()) {
                this.element.classList.add('light');
            }
            else {
                this.element.classList.remove('light');
            }
            const titleForeground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_FOREGROUND : TITLE_BAR_ACTIVE_FOREGROUND);
            this.element.style.color = titleForeground || '';
            const titleBorder = this.getColor(TITLE_BAR_BORDER);
            this.element.style.borderBottom = titleBorder ? `1px solid ${titleBorder}` : '';
        }
    }
    onContextMenu(e, menuId) {
        const event = new StandardMouseEvent(getWindow(this.element), e);
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            menuId,
            contextKeyService: this.contextKeyService,
            domForShadowRoot: isMacintosh && isNative ? event.target : undefined
        });
    }
    get currentMenubarVisibility() {
        if (this.isAuxiliary) {
            return 'hidden';
        }
        return getMenuBarVisibility(this.configurationService);
    }
    get layoutControlEnabled() {
        return this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) !== false;
    }
    get isCommandCenterVisible() {
        return !this.isCompact && this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
    }
    get editorActionsEnabled() {
        return (this.editorGroupsContainer.partOptions.editorActionsLocation === "titleBar" /* EditorActionsLocation.TITLEBAR */ ||
            (this.editorGroupsContainer.partOptions.editorActionsLocation === "default" /* EditorActionsLocation.DEFAULT */ &&
                this.editorGroupsContainer.partOptions.showTabs === "none" /* EditorTabsMode.NONE */));
    }
    get activityActionsEnabled() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        return !this.isCompact && !this.isAuxiliary && (activityBarPosition === "top" /* ActivityBarPosition.TOP */ || activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */);
    }
    get globalActionsEnabled() {
        return !this.isCompact;
    }
    get hasZoomableElements() {
        const hasMenubar = !(this.currentMenubarVisibility === 'hidden' || this.currentMenubarVisibility === 'compact' || (!isWeb && isMacintosh));
        const hasCommandCenter = this.isCommandCenterVisible;
        const hasToolBarActions = this.globalActionsEnabled || this.layoutControlEnabled || this.editorActionsEnabled || this.activityActionsEnabled;
        return hasMenubar || hasCommandCenter || hasToolBarActions;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the title bar
        return getZoomFactor(getWindow(this.element)) < 1 || !this.hasZoomableElements;
    }
    layout(width, height) {
        this.updateLayout(new Dimension(width, height));
        super.layoutContents(width, height);
    }
    updateLayout(dimension) {
        this.lastLayoutDimensions = dimension;
        if (!hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            return;
        }
        const zoomFactor = getZoomFactor(getWindow(this.element));
        this.element.style.setProperty('--zoom-factor', zoomFactor.toString());
        this.rootContainer.classList.toggle('counter-zoom', this.preventZoom);
        if (this.customMenubar.value) {
            const menubarDimension = new Dimension(0, dimension.height);
            this.customMenubar.value.layout(menubarDimension);
        }
        const hasCenter = this.isCommandCenterVisible || this.title.innerText !== '';
        this.rootContainer.classList.toggle('has-center', hasCenter);
    }
    focus() {
        if (this.customMenubar.value) {
            this.customMenubar.value.toggleFocus();
        }
        else {
            this.element.querySelector('[tabindex]:not([tabindex="-1"])')?.focus();
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
};
BrowserTitlebarPart = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorService),
    __param(13, IMenuService),
    __param(14, IKeybindingService)
], BrowserTitlebarPart);
export { BrowserTitlebarPart };
let MainBrowserTitlebarPart = class MainBrowserTitlebarPart extends BrowserTitlebarPart {
    constructor(contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, editorGroupService.mainPart, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorService, menuService, keybindingService);
    }
};
MainBrowserTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IContextKeyService),
    __param(8, IHostService),
    __param(9, IEditorGroupsService),
    __param(10, IEditorService),
    __param(11, IMenuService),
    __param(12, IKeybindingService)
], MainBrowserTitlebarPart);
export { MainBrowserTitlebarPart };
let AuxiliaryBrowserTitlebarPart = class AuxiliaryBrowserTitlebarPart extends BrowserTitlebarPart {
    static { AuxiliaryBrowserTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() { return this.minimumHeight; }
    constructor(container, editorGroupsContainer, mainTitlebar, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        const id = AuxiliaryBrowserTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorService, menuService, keybindingService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the main title bar
        // The auxiliary title bar never contains any zoomable items itself,
        // but we want to match the behavior of the main title bar.
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryBrowserTitlebarPart = AuxiliaryBrowserTitlebarPart_1 = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorGroupsService),
    __param(13, IEditorService),
    __param(14, IMenuService),
    __param(15, IKeybindingService)
], AuxiliaryBrowserTitlebarPart);
export { AuxiliaryBrowserTitlebarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci90aXRsZWJhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRXZELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUcsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSw4QkFBOEIsRUFBRSxzQkFBc0IsRUFBb0QsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeFIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUE2QixNQUFNLDREQUE0RCxDQUFDO0FBQzlILE9BQU8sRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDJCQUEyQixFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLGdCQUFnQixFQUFFLG9CQUFv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