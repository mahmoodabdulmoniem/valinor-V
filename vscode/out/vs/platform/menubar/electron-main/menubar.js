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
var Menubar_1;
import { app, BrowserWindow, Menu, MenuItem } from 'electron';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicMenuLabel } from '../../../base/common/labels.js';
import { isMacintosh, language } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { isMenubarMenuItemAction, isMenubarMenuItemRecentAction, isMenubarMenuItemSeparator, isMenubarMenuItemSubmenu } from '../common/menubar.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { IStateService } from '../../state/node/state.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUpdateService } from '../../update/common/update.js';
import { hasNativeMenu } from '../../window/common/window.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { IWorkspacesHistoryMainService } from '../../workspaces/electron-main/workspacesHistoryMainService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
const telemetryFrom = 'menu';
let Menubar = class Menubar extends Disposable {
    static { Menubar_1 = this; }
    static { this.lastKnownMenubarStorageKey = 'lastKnownMenubarData'; }
    constructor(updateService, configurationService, windowsMainService, environmentMainService, telemetryService, workspacesHistoryMainService, stateService, lifecycleMainService, logService, nativeHostMainService, productService, auxiliaryWindowsMainService) {
        super();
        this.updateService = updateService;
        this.configurationService = configurationService;
        this.windowsMainService = windowsMainService;
        this.environmentMainService = environmentMainService;
        this.telemetryService = telemetryService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.stateService = stateService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.nativeHostMainService = nativeHostMainService;
        this.productService = productService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.fallbackMenuHandlers = Object.create(null);
        this.menuUpdater = new RunOnceScheduler(() => this.doUpdateMenu(), 0);
        this.menuGC = new RunOnceScheduler(() => { this.oldMenus = []; }, 10000);
        this.menubarMenus = Object.create(null);
        this.keybindings = Object.create(null);
        this.showNativeMenu = hasNativeMenu(configurationService);
        if (isMacintosh || this.showNativeMenu) {
            this.restoreCachedMenubarData();
        }
        this.addFallbackHandlers();
        this.closedLastWindow = false;
        this.noActiveMainWindow = false;
        this.oldMenus = [];
        this.install();
        this.registerListeners();
    }
    restoreCachedMenubarData() {
        const menubarData = this.stateService.getItem(Menubar_1.lastKnownMenubarStorageKey);
        if (menubarData) {
            if (menubarData.menus) {
                this.menubarMenus = menubarData.menus;
            }
            if (menubarData.keybindings) {
                this.keybindings = menubarData.keybindings;
            }
        }
    }
    addFallbackHandlers() {
        // File Menu Items
        this.fallbackMenuHandlers['workbench.action.files.newUntitledFile'] = (menuItem, win, event) => {
            if (!this.runActionInRenderer({ type: 'commandId', commandId: 'workbench.action.files.newUntitledFile' })) { // this is one of the few supported actions when aux window has focus
                this.windowsMainService.openEmptyWindow({ context: 2 /* OpenContext.MENU */, contextWindowId: win?.id });
            }
        };
        this.fallbackMenuHandlers['workbench.action.newWindow'] = (menuItem, win, event) => this.windowsMainService.openEmptyWindow({ context: 2 /* OpenContext.MENU */, contextWindowId: win?.id });
        this.fallbackMenuHandlers['workbench.action.files.openFileFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFileFolderAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        this.fallbackMenuHandlers['workbench.action.files.openFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFolderAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        this.fallbackMenuHandlers['workbench.action.openWorkspace'] = (menuItem, win, event) => this.nativeHostMainService.pickWorkspaceAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtraData: { from: telemetryFrom } });
        // Recent Menu Items
        this.fallbackMenuHandlers['workbench.action.clearRecentFiles'] = () => this.workspacesHistoryMainService.clearRecentlyOpened({ confirm: true /* ask for confirmation */ });
        // Help Menu Items
        const youTubeUrl = this.productService.youTubeUrl;
        if (youTubeUrl) {
            this.fallbackMenuHandlers['workbench.action.openYouTubeUrl'] = () => this.openUrl(youTubeUrl, 'openYouTubeUrl');
        }
        const requestFeatureUrl = this.productService.requestFeatureUrl;
        if (requestFeatureUrl) {
            this.fallbackMenuHandlers['workbench.action.openRequestFeatureUrl'] = () => this.openUrl(requestFeatureUrl, 'openUserVoiceUrl');
        }
        const reportIssueUrl = this.productService.reportIssueUrl;
        if (reportIssueUrl) {
            this.fallbackMenuHandlers['workbench.action.openIssueReporter'] = () => this.openUrl(reportIssueUrl, 'openReportIssues');
        }
        const licenseUrl = this.productService.licenseUrl;
        if (licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openLicenseUrl'] = () => {
                if (language) {
                    const queryArgChar = licenseUrl.indexOf('?') > 0 ? '&' : '?';
                    this.openUrl(`${licenseUrl}${queryArgChar}lang=${language}`, 'openLicenseUrl');
                }
                else {
                    this.openUrl(licenseUrl, 'openLicenseUrl');
                }
            };
        }
        const privacyStatementUrl = this.productService.privacyStatementUrl;
        if (privacyStatementUrl && licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openPrivacyStatementUrl'] = () => {
                this.openUrl(privacyStatementUrl, 'openPrivacyStatement');
            };
        }
    }
    registerListeners() {
        // Keep flag when app quits
        this._register(this.lifecycleMainService.onWillShutdown(() => this.willShutdown = true));
        // Listen to some events from window service to update menu
        this._register(this.windowsMainService.onDidChangeWindowsCount(e => this.onDidChangeWindowsCount(e)));
        this._register(this.nativeHostMainService.onDidBlurMainWindow(() => this.onDidChangeWindowFocus()));
        this._register(this.nativeHostMainService.onDidFocusMainWindow(() => this.onDidChangeWindowFocus()));
    }
    get currentEnableMenuBarMnemonics() {
        const enableMenuBarMnemonics = this.configurationService.getValue('window.enableMenuBarMnemonics');
        if (typeof enableMenuBarMnemonics !== 'boolean') {
            return true;
        }
        return enableMenuBarMnemonics;
    }
    get currentEnableNativeTabs() {
        if (!isMacintosh) {
            return false;
        }
        const enableNativeTabs = this.configurationService.getValue('window.nativeTabs');
        if (typeof enableNativeTabs !== 'boolean') {
            return false;
        }
        return enableNativeTabs;
    }
    updateMenu(menubarData, windowId) {
        this.menubarMenus = menubarData.menus;
        this.keybindings = menubarData.keybindings;
        // Save off new menu and keybindings
        this.stateService.setItem(Menubar_1.lastKnownMenubarStorageKey, menubarData);
        this.scheduleUpdateMenu();
    }
    scheduleUpdateMenu() {
        this.menuUpdater.schedule(); // buffer multiple attempts to update the menu
    }
    doUpdateMenu() {
        // Due to limitations in Electron, it is not possible to update menu items dynamically. The suggested
        // workaround from Electron is to set the application menu again.
        // See also https://github.com/electron/electron/issues/846
        //
        // Run delayed to prevent updating menu while it is open
        if (!this.willShutdown) {
            setTimeout(() => {
                if (!this.willShutdown) {
                    this.install();
                }
            }, 10 /* delay this because there is an issue with updating a menu when it is open */);
        }
    }
    onDidChangeWindowsCount(e) {
        if (!isMacintosh) {
            return;
        }
        // Update menu if window count goes from N > 0 or 0 > N to update menu item enablement
        if ((e.oldCount === 0 && e.newCount > 0) || (e.oldCount > 0 && e.newCount === 0)) {
            this.closedLastWindow = e.newCount === 0;
            this.scheduleUpdateMenu();
        }
    }
    onDidChangeWindowFocus() {
        if (!isMacintosh) {
            return;
        }
        const focusedWindow = BrowserWindow.getFocusedWindow();
        this.noActiveMainWindow = !focusedWindow || !!this.auxiliaryWindowsMainService.getWindowByWebContents(focusedWindow.webContents);
        this.scheduleUpdateMenu();
    }
    install() {
        // Store old menu in our array to avoid GC to collect the menu and crash. See #55347
        // TODO@sbatten Remove this when fixed upstream by Electron
        const oldMenu = Menu.getApplicationMenu();
        if (oldMenu) {
            this.oldMenus.push(oldMenu);
        }
        // If we don't have a menu yet, set it to null to avoid the electron menu.
        // This should only happen on the first launch ever
        if (Object.keys(this.menubarMenus).length === 0) {
            this.doSetApplicationMenu(isMacintosh ? new Menu() : null);
            return;
        }
        // Menus
        const menubar = new Menu();
        // Mac: Application
        let macApplicationMenuItem;
        if (isMacintosh) {
            const applicationMenu = new Menu();
            macApplicationMenuItem = new MenuItem({ label: this.productService.nameShort, submenu: applicationMenu });
            this.setMacApplicationMenu(applicationMenu);
            menubar.append(macApplicationMenuItem);
        }
        // Mac: Dock
        if (isMacintosh && !this.appMenuInstalled) {
            this.appMenuInstalled = true;
            const dockMenu = new Menu();
            dockMenu.append(new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, "New &&Window")), click: () => this.windowsMainService.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ }) }));
            app.dock.setMenu(dockMenu);
        }
        // File
        if (this.shouldDrawMenu('File')) {
            const fileMenu = new Menu();
            const fileMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, "&&File")), submenu: fileMenu });
            this.setMenuById(fileMenu, 'File');
            menubar.append(fileMenuItem);
        }
        // Edit
        if (this.shouldDrawMenu('Edit')) {
            const editMenu = new Menu();
            const editMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, "&&Edit")), submenu: editMenu });
            this.setMenuById(editMenu, 'Edit');
            menubar.append(editMenuItem);
        }
        // Selection
        if (this.shouldDrawMenu('Selection')) {
            const selectionMenu = new Menu();
            const selectionMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, "&&Selection")), submenu: selectionMenu });
            this.setMenuById(selectionMenu, 'Selection');
            menubar.append(selectionMenuItem);
        }
        // View
        if (this.shouldDrawMenu('View')) {
            const viewMenu = new Menu();
            const viewMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, "&&View")), submenu: viewMenu });
            this.setMenuById(viewMenu, 'View');
            menubar.append(viewMenuItem);
        }
        // Go
        if (this.shouldDrawMenu('Go')) {
            const gotoMenu = new Menu();
            const gotoMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, "&&Go")), submenu: gotoMenu });
            this.setMenuById(gotoMenu, 'Go');
            menubar.append(gotoMenuItem);
        }
        // Debug
        if (this.shouldDrawMenu('Run')) {
            const debugMenu = new Menu();
            const debugMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mRun', comment: ['&& denotes a mnemonic'] }, "&&Run")), submenu: debugMenu });
            this.setMenuById(debugMenu, 'Run');
            menubar.append(debugMenuItem);
        }
        // Terminal
        if (this.shouldDrawMenu('Terminal')) {
            const terminalMenu = new Menu();
            const terminalMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, "&&Terminal")), submenu: terminalMenu });
            this.setMenuById(terminalMenu, 'Terminal');
            menubar.append(terminalMenuItem);
        }
        // Mac: Window
        let macWindowMenuItem;
        if (this.shouldDrawMenu('Window')) {
            const windowMenu = new Menu();
            macWindowMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize('mWindow', "Window")), submenu: windowMenu, role: 'window' });
            this.setMacWindowMenu(windowMenu);
        }
        if (macWindowMenuItem) {
            menubar.append(macWindowMenuItem);
        }
        // Help
        if (this.shouldDrawMenu('Help')) {
            const helpMenu = new Menu();
            const helpMenuItem = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, "&&Help")), submenu: helpMenu, role: 'help' });
            this.setMenuById(helpMenu, 'Help');
            menubar.append(helpMenuItem);
        }
        if (menubar.items && menubar.items.length > 0) {
            this.doSetApplicationMenu(menubar);
        }
        else {
            this.doSetApplicationMenu(null);
        }
        // Dispose of older menus after some time
        this.menuGC.schedule();
    }
    doSetApplicationMenu(menu) {
        // Setting the application menu sets it to all opened windows,
        // but we currently do not support a menu in auxiliary windows,
        // so we need to unset it there.
        //
        // This is a bit ugly but `setApplicationMenu()` has some nice
        // behaviour we want:
        // - on macOS it is required because menus are application set
        // - we use `getApplicationMenu()` to access the current state
        // - new windows immediately get the same menu when opening
        //   reducing overall flicker for these
        Menu.setApplicationMenu(menu);
        if (menu) {
            for (const window of this.auxiliaryWindowsMainService.getWindows()) {
                window.win?.setMenu(null);
            }
        }
    }
    setMacApplicationMenu(macApplicationMenu) {
        const about = this.createMenuItem(nls.localize('mAbout', "About {0}", this.productService.nameLong), 'workbench.action.showAboutDialog');
        const checkForUpdates = this.getUpdateMenuItems();
        let preferences;
        if (this.shouldDrawMenu('Preferences')) {
            const preferencesMenu = new Menu();
            this.setMenuById(preferencesMenu, 'Preferences');
            preferences = new MenuItem({ label: this.mnemonicLabel(nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, "&&Preferences")), submenu: preferencesMenu });
        }
        const servicesMenu = new Menu();
        const services = new MenuItem({ label: nls.localize('mServices', "Services"), role: 'services', submenu: servicesMenu });
        const hide = new MenuItem({ label: nls.localize('mHide', "Hide {0}", this.productService.nameLong), role: 'hide', accelerator: 'Command+H' });
        const hideOthers = new MenuItem({ label: nls.localize('mHideOthers', "Hide Others"), role: 'hideOthers', accelerator: 'Command+Alt+H' });
        const showAll = new MenuItem({ label: nls.localize('mShowAll', "Show All"), role: 'unhide' });
        const quit = new MenuItem(this.likeAction('workbench.action.quit', {
            label: nls.localize('miQuit', "Quit {0}", this.productService.nameLong), click: async (item, window, event) => {
                const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
                if (this.windowsMainService.getWindowCount() === 0 || // allow to quit when no more windows are open
                    !!BrowserWindow.getFocusedWindow() || // allow to quit when window has focus (fix for https://github.com/microsoft/vscode/issues/39191)
                    lastActiveWindow?.win?.isMinimized() // allow to quit when window has no focus but is minimized (https://github.com/microsoft/vscode/issues/63000)
                ) {
                    const confirmed = await this.confirmBeforeQuit(event);
                    if (confirmed) {
                        this.nativeHostMainService.quit(undefined);
                    }
                }
            }
        }));
        const actions = [about];
        actions.push(...checkForUpdates);
        if (preferences) {
            actions.push(...[
                __separator__(),
                preferences
            ]);
        }
        actions.push(...[
            __separator__(),
            services,
            __separator__(),
            hide,
            hideOthers,
            showAll,
            __separator__(),
            quit
        ]);
        actions.forEach(i => macApplicationMenu.append(i));
    }
    async confirmBeforeQuit(event) {
        if (this.windowsMainService.getWindowCount() === 0) {
            return true; // never confirm when no windows are opened
        }
        const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
        if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && this.isKeyboardEvent(event))) {
            const { response } = await this.nativeHostMainService.showMessageBox(this.windowsMainService.getFocusedWindow()?.id, {
                type: 'question',
                buttons: [
                    isMacintosh ? nls.localize({ key: 'quit', comment: ['&& denotes a mnemonic'] }, "&&Quit") : nls.localize({ key: 'exit', comment: ['&& denotes a mnemonic'] }, "&&Exit"),
                    nls.localize('cancel', "Cancel")
                ],
                message: isMacintosh ? nls.localize('quitMessageMac', "Are you sure you want to quit?") : nls.localize('quitMessage', "Are you sure you want to exit?")
            });
            return response === 0;
        }
        return true;
    }
    shouldDrawMenu(menuId) {
        // We need to draw an empty menu to override the electron default
        if (!isMacintosh && !this.showNativeMenu) {
            return false;
        }
        switch (menuId) {
            case 'File':
            case 'Help':
                if (isMacintosh) {
                    return (this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) || (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) || (!!this.menubarMenus && !!this.menubarMenus[menuId]);
                }
            case 'Window':
                if (isMacintosh) {
                    return (this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) || (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) || !!this.menubarMenus;
                }
            default:
                return this.windowsMainService.getWindowCount() > 0 && (!!this.menubarMenus && !!this.menubarMenus[menuId]);
        }
    }
    setMenu(menu, items) {
        items.forEach((item) => {
            if (isMenubarMenuItemSeparator(item)) {
                menu.append(__separator__());
            }
            else if (isMenubarMenuItemSubmenu(item)) {
                const submenu = new Menu();
                const submenuItem = new MenuItem({ label: this.mnemonicLabel(item.label), submenu });
                this.setMenu(submenu, item.submenu.items);
                menu.append(submenuItem);
            }
            else if (isMenubarMenuItemRecentAction(item)) {
                menu.append(this.createOpenRecentMenuItem(item));
            }
            else if (isMenubarMenuItemAction(item)) {
                if (item.id === 'workbench.action.showAboutDialog') {
                    this.insertCheckForUpdatesItems(menu);
                }
                if (isMacintosh) {
                    if ((this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) ||
                        (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow)) {
                        // In the fallback scenario, we are either disabled or using a fallback handler
                        if (this.fallbackMenuHandlers[item.id]) {
                            menu.append(new MenuItem(this.likeAction(item.id, { label: this.mnemonicLabel(item.label), click: this.fallbackMenuHandlers[item.id] })));
                        }
                        else {
                            menu.append(this.createMenuItem(item.label, item.id, false, item.checked));
                        }
                    }
                    else {
                        menu.append(this.createMenuItem(item.label, item.id, item.enabled === false ? false : true, !!item.checked));
                    }
                }
                else {
                    menu.append(this.createMenuItem(item.label, item.id, item.enabled === false ? false : true, !!item.checked));
                }
            }
        });
    }
    setMenuById(menu, menuId) {
        if (this.menubarMenus && this.menubarMenus[menuId]) {
            this.setMenu(menu, this.menubarMenus[menuId].items);
        }
    }
    insertCheckForUpdatesItems(menu) {
        const updateItems = this.getUpdateMenuItems();
        if (updateItems.length) {
            updateItems.forEach(i => menu.append(i));
            menu.append(__separator__());
        }
    }
    createOpenRecentMenuItem(item) {
        const revivedUri = URI.revive(item.uri);
        const commandId = item.id;
        const openable = (commandId === 'openRecentFile') ? { fileUri: revivedUri } :
            (commandId === 'openRecentWorkspace') ? { workspaceUri: revivedUri } : { folderUri: revivedUri };
        return new MenuItem(this.likeAction(commandId, {
            label: item.label,
            click: async (menuItem, win, event) => {
                const openInNewWindow = this.isOptionClick(event);
                const success = (await this.windowsMainService.open({
                    context: 2 /* OpenContext.MENU */,
                    cli: this.environmentMainService.args,
                    urisToOpen: [openable],
                    forceNewWindow: openInNewWindow,
                    gotoLineMode: false,
                    remoteAuthority: item.remoteAuthority
                })).length > 0;
                if (!success) {
                    await this.workspacesHistoryMainService.removeRecentlyOpened([revivedUri]);
                }
            }
        }, false));
    }
    isOptionClick(event) {
        return !!(event && ((!isMacintosh && (event.ctrlKey || event.shiftKey)) || (isMacintosh && (event.metaKey || event.altKey))));
    }
    isKeyboardEvent(event) {
        return !!(event.triggeredByAccelerator || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    createRoleMenuItem(label, commandId, role) {
        const options = {
            label: this.mnemonicLabel(label),
            role,
            enabled: true
        };
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    setMacWindowMenu(macWindowMenu) {
        const minimize = new MenuItem({ label: nls.localize('mMinimize', "Minimize"), role: 'minimize', accelerator: 'Command+M', enabled: this.windowsMainService.getWindowCount() > 0 });
        const zoom = new MenuItem({ label: nls.localize('mZoom', "Zoom"), role: 'zoom', enabled: this.windowsMainService.getWindowCount() > 0 });
        const bringAllToFront = new MenuItem({ label: nls.localize('mBringToFront', "Bring All to Front"), role: 'front', enabled: this.windowsMainService.getWindowCount() > 0 });
        const switchWindow = this.createMenuItem(nls.localize({ key: 'miSwitchWindow', comment: ['&& denotes a mnemonic'] }, "Switch &&Window..."), 'workbench.action.switchWindow');
        const nativeTabMenuItems = [];
        if (this.currentEnableNativeTabs) {
            nativeTabMenuItems.push(__separator__());
            nativeTabMenuItems.push(this.createMenuItem(nls.localize('mNewTab', "New Tab"), 'workbench.action.newWindowTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowPreviousTab', "Show Previous Tab"), 'workbench.action.showPreviousWindowTab', 'selectPreviousTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowNextTab', "Show Next Tab"), 'workbench.action.showNextWindowTab', 'selectNextTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMoveTabToNewWindow', "Move Tab to New Window"), 'workbench.action.moveWindowTabToNewWindow', 'moveTabToNewWindow'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMergeAllWindows', "Merge All Windows"), 'workbench.action.mergeAllWindowTabs', 'mergeAllWindows'));
        }
        [
            minimize,
            zoom,
            __separator__(),
            switchWindow,
            ...nativeTabMenuItems,
            __separator__(),
            bringAllToFront
        ].forEach(item => macWindowMenu.append(item));
    }
    getUpdateMenuItems() {
        const state = this.updateService.state;
        switch (state.type) {
            case "idle" /* StateType.Idle */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miCheckForUpdates', "Check for &&Updates...")), click: () => setTimeout(() => {
                            this.reportMenuActionTelemetry('CheckForUpdate');
                            this.updateService.checkForUpdates(true);
                        }, 0)
                    })];
            case "checking for updates" /* StateType.CheckingForUpdates */:
                return [new MenuItem({ label: nls.localize('miCheckingForUpdates', "Checking for Updates..."), enabled: false })];
            case "available for download" /* StateType.AvailableForDownload */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miDownloadUpdate', "D&&ownload Available Update")), click: () => {
                            this.updateService.downloadUpdate();
                        }
                    })];
            case "downloading" /* StateType.Downloading */:
                return [new MenuItem({ label: nls.localize('miDownloadingUpdate', "Downloading Update..."), enabled: false })];
            case "downloaded" /* StateType.Downloaded */:
                return isMacintosh ? [] : [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miInstallUpdate', "Install &&Update...")), click: () => {
                            this.reportMenuActionTelemetry('InstallUpdate');
                            this.updateService.applyUpdate();
                        }
                    })];
            case "updating" /* StateType.Updating */:
                return [new MenuItem({ label: nls.localize('miInstallingUpdate', "Installing Update..."), enabled: false })];
            case "ready" /* StateType.Ready */:
                return [new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miRestartToUpdate', "Restart to &&Update")), click: () => {
                            this.reportMenuActionTelemetry('RestartToUpdate');
                            this.updateService.quitAndInstall();
                        }
                    })];
            default:
                return [];
        }
    }
    createMenuItem(arg1, arg2, arg3, arg4) {
        const label = this.mnemonicLabel(arg1);
        const click = (typeof arg2 === 'function') ? arg2 : (menuItem, win, event) => {
            const userSettingsLabel = menuItem ? menuItem.userSettingsLabel : null;
            let commandId = arg2;
            if (Array.isArray(arg2)) {
                commandId = this.isOptionClick(event) ? arg2[1] : arg2[0]; // support alternative action if we got multiple action Ids and the option key was pressed while invoking
            }
            if (userSettingsLabel && event.triggeredByAccelerator) {
                this.runActionInRenderer({ type: 'keybinding', userSettingsLabel });
            }
            else {
                this.runActionInRenderer({ type: 'commandId', commandId });
            }
        };
        const enabled = typeof arg3 === 'boolean' ? arg3 : this.windowsMainService.getWindowCount() > 0;
        const checked = typeof arg4 === 'boolean' ? arg4 : false;
        const options = {
            label,
            click,
            enabled
        };
        if (checked) {
            options.type = 'checkbox';
            options.checked = checked;
        }
        let commandId;
        if (typeof arg2 === 'string') {
            commandId = arg2;
        }
        else if (Array.isArray(arg2)) {
            commandId = arg2[0];
        }
        if (isMacintosh) {
            // Add role for special case menu items
            if (commandId === 'editor.action.clipboardCutAction') {
                options.role = 'cut';
            }
            else if (commandId === 'editor.action.clipboardCopyAction') {
                options.role = 'copy';
            }
            else if (commandId === 'editor.action.clipboardPasteAction') {
                options.role = 'paste';
            }
            // Add context aware click handlers for special case menu items
            if (commandId === 'undo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.undo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('undo:')
                });
            }
            else if (commandId === 'redo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.redo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('redo:')
                });
            }
            else if (commandId === 'editor.action.selectAll') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: devTools => devTools.selectAll(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('selectAll:')
                });
            }
        }
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    makeContextAwareClickHandler(click, contextSpecificHandlers) {
        return (menuItem, win, event) => {
            // No Active Window
            const activeWindow = BrowserWindow.getFocusedWindow();
            if (!activeWindow) {
                return contextSpecificHandlers.inNoWindow();
            }
            // DevTools focused
            if (activeWindow.webContents.isDevToolsFocused() &&
                activeWindow.webContents.devToolsWebContents) {
                return contextSpecificHandlers.inDevTools(activeWindow.webContents.devToolsWebContents);
            }
            // Finally execute command in Window
            click(menuItem, win || activeWindow, event);
        };
    }
    runActionInRenderer(invocation) {
        // We want to support auxililary windows that may have focus by
        // returning their parent windows as target to support running
        // actions via the main window.
        let activeBrowserWindow = BrowserWindow.getFocusedWindow();
        if (activeBrowserWindow) {
            const auxiliaryWindowCandidate = this.auxiliaryWindowsMainService.getWindowByWebContents(activeBrowserWindow.webContents);
            if (auxiliaryWindowCandidate) {
                activeBrowserWindow = this.windowsMainService.getWindowById(auxiliaryWindowCandidate.parentId)?.win ?? null;
            }
        }
        // We make sure to not run actions when the window has no focus, this helps
        // for https://github.com/microsoft/vscode/issues/25907 and specifically for
        // https://github.com/microsoft/vscode/issues/11928
        // Still allow to run when the last active window is minimized though for
        // https://github.com/microsoft/vscode/issues/63000
        if (!activeBrowserWindow) {
            const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
            if (lastActiveWindow?.win?.isMinimized()) {
                activeBrowserWindow = lastActiveWindow.win;
            }
        }
        const activeWindow = activeBrowserWindow ? this.windowsMainService.getWindowById(activeBrowserWindow.id) : undefined;
        if (activeWindow) {
            this.logService.trace('menubar#runActionInRenderer', invocation);
            if (isMacintosh && !this.environmentMainService.isBuilt && !activeWindow.isReady) {
                if ((invocation.type === 'commandId' && invocation.commandId === 'workbench.action.toggleDevTools') || (invocation.type !== 'commandId' && invocation.userSettingsLabel === 'alt+cmd+i')) {
                    // prevent this action from running twice on macOS (https://github.com/microsoft/vscode/issues/62719)
                    // we already register a keybinding in workbench.ts for opening developer tools in case something
                    // goes wrong and that keybinding is only removed when the application has loaded (= window ready).
                    return false;
                }
            }
            if (invocation.type === 'commandId') {
                const runActionPayload = { id: invocation.commandId, from: 'menu' };
                activeWindow.sendWhenReady('vscode:runAction', CancellationToken.None, runActionPayload);
            }
            else {
                const runKeybindingPayload = { userSettingsLabel: invocation.userSettingsLabel };
                activeWindow.sendWhenReady('vscode:runKeybinding', CancellationToken.None, runKeybindingPayload);
            }
            return true;
        }
        else {
            this.logService.trace('menubar#runActionInRenderer: no active window found', invocation);
            return false;
        }
    }
    withKeybinding(commandId, options) {
        const binding = typeof commandId === 'string' ? this.keybindings[commandId] : undefined;
        // Apply binding if there is one
        if (binding?.label) {
            // if the binding is native, we can just apply it
            if (binding.isNative !== false) {
                options.accelerator = binding.label;
                options.userSettingsLabel = binding.userSettingsLabel;
            }
            // the keybinding is not native so we cannot show it as part of the accelerator of
            // the menu item. we fallback to a different strategy so that we always display it
            else if (typeof options.label === 'string') {
                const bindingIndex = options.label.indexOf('[');
                if (bindingIndex >= 0) {
                    options.label = `${options.label.substr(0, bindingIndex)} [${binding.label}]`;
                }
                else {
                    options.label = `${options.label} [${binding.label}]`;
                }
            }
        }
        // Unset bindings if there is none
        else {
            options.accelerator = undefined;
        }
        return options;
    }
    likeAction(commandId, options, setAccelerator = !options.accelerator) {
        if (setAccelerator) {
            options = this.withKeybinding(commandId, options);
        }
        const originalClick = options.click;
        options.click = (item, window, event) => {
            this.reportMenuActionTelemetry(commandId);
            originalClick?.(item, window, event);
        };
        return options;
    }
    openUrl(url, id) {
        this.nativeHostMainService.openExternal(undefined, url);
        this.reportMenuActionTelemetry(id);
    }
    reportMenuActionTelemetry(id) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id, from: telemetryFrom });
    }
    mnemonicLabel(label) {
        return mnemonicMenuLabel(label, !this.currentEnableMenuBarMnemonics);
    }
};
Menubar = Menubar_1 = __decorate([
    __param(0, IUpdateService),
    __param(1, IConfigurationService),
    __param(2, IWindowsMainService),
    __param(3, IEnvironmentMainService),
    __param(4, ITelemetryService),
    __param(5, IWorkspacesHistoryMainService),
    __param(6, IStateService),
    __param(7, ILifecycleMainService),
    __param(8, ILogService),
    __param(9, INativeHostMainService),
    __param(10, IProductService),
    __param(11, IAuxiliaryWindowsMainService)
], Menubar);
export { Menubar };
function __separator__() {
    return new MenuItem({ type: 'separator' });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWVudWJhci9lbGVjdHJvbi1tYWluL21lbnViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUE2QixJQUFJLEVBQUUsUUFBUSxFQUEyQyxNQUFNLFVBQVUsQ0FBQztBQUVsSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQWdGLHVCQUF1QixFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLHdCQUF3QixFQUFtQixNQUFNLHNCQUFzQixDQUFDO0FBQ25QLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLCtCQUErQixDQUFDO0FBQzFFLE9BQU8sRUFBeUYsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckosT0FBTyxFQUE2QixtQkFBbUIsRUFBZSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUM7QUFnQnRCLElBQU0sT0FBTyxHQUFiLE1BQU0sT0FBUSxTQUFRLFVBQVU7O2FBRWQsK0JBQTBCLEdBQUcsc0JBQXNCLEFBQXpCLENBQTBCO0lBcUI1RSxZQUNpQixhQUE4QyxFQUN2QyxvQkFBNEQsRUFDOUQsa0JBQXdELEVBQ3BELHNCQUFnRSxFQUN0RSxnQkFBb0QsRUFDeEMsNEJBQTRFLEVBQzVGLFlBQTRDLEVBQ3BDLG9CQUE0RCxFQUN0RSxVQUF3QyxFQUM3QixxQkFBOEQsRUFDckUsY0FBZ0QsRUFDbkMsMkJBQTBFO1FBRXhHLEtBQUssRUFBRSxDQUFDO1FBYnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzdDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDbkMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUNyRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3ZCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDM0UsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ1osMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNwRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDbEIsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE4QjtRQWR4Rix5QkFBb0IsR0FBZ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQWtCeEssSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekUsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTFELElBQUksV0FBVyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFFM0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRWhDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBRW5CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQWUsU0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDaEcsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ3ZDLENBQUM7WUFFRCxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQjtRQUUxQixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdDQUF3QyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzlGLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSx3Q0FBd0MsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFFQUFxRTtnQkFDakwsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLE9BQU8sMEJBQWtCLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2xHLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEVBQUUsT0FBTywwQkFBa0IsRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckwsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVDQUF1QyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2UCxJQUFJLENBQUMsb0JBQW9CLENBQUMsbUNBQW1DLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9PLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL08sb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxtQ0FBbUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBRTNLLGtCQUFrQjtRQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQztRQUNsRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQ0FBaUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakgsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQztRQUNoRSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdDQUF3QyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQztRQUMxRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDMUgsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDO1FBQ2xELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlDQUFpQyxDQUFDLEdBQUcsR0FBRyxFQUFFO2dCQUNuRSxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFVBQVUsR0FBRyxZQUFZLFFBQVEsUUFBUSxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQzVDLENBQUM7WUFDRixDQUFDLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDO1FBQ3BFLElBQUksbUJBQW1CLElBQUksVUFBVSxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLDBDQUEwQyxDQUFDLEdBQUcsR0FBRyxFQUFFO2dCQUM1RSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUI7UUFFeEIsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFekYsMkRBQTJEO1FBQzNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFRCxJQUFZLDZCQUE2QjtRQUN4QyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNuRyxJQUFJLE9BQU8sc0JBQXNCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxzQkFBc0IsQ0FBQztJQUMvQixDQUFDO0lBRUQsSUFBWSx1QkFBdUI7UUFDbEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pGLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFDO0lBQ3pCLENBQUM7SUFFRCxVQUFVLENBQUMsV0FBeUIsRUFBRSxRQUFnQjtRQUNyRCxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO1FBRTNDLG9DQUFvQztRQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFPLENBQUMsMEJBQTBCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFM0UsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUdPLGtCQUFrQjtRQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsOENBQThDO0lBQzVFLENBQUM7SUFFTyxZQUFZO1FBRW5CLHFHQUFxRztRQUNyRyxpRUFBaUU7UUFDakUsMkRBQTJEO1FBQzNELEVBQUU7UUFDRix3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsQ0FBQztZQUNGLENBQUMsRUFBRSxFQUFFLENBQUMsK0VBQStFLENBQUMsQ0FBQztRQUN4RixDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLENBQTRCO1FBQzNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELHNGQUFzRjtRQUN0RixJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsS0FBSyxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDdkQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsc0JBQXNCLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFTyxPQUFPO1FBQ2Qsb0ZBQW9GO1FBQ3BGLDJEQUEyRDtRQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUVELDBFQUEwRTtRQUMxRSxtREFBbUQ7UUFDbkQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0QsT0FBTztRQUNSLENBQUM7UUFFRCxRQUFRO1FBQ1IsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUUzQixtQkFBbUI7UUFDbkIsSUFBSSxzQkFBZ0MsQ0FBQztRQUNyQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sZUFBZSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDbkMsc0JBQXNCLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7WUFDMUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsWUFBWTtRQUNaLElBQUksV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUU3QixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzVCLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLE9BQU8sMEJBQWtCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTVPLEdBQUcsQ0FBQyxJQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFFRCxPQUFPO1FBQ1AsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM1QixNQUFNLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2xLLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELE9BQU87UUFDUCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDbEssSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsWUFBWTtRQUNaLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sYUFBYSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDakMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ3RMLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsT0FBTztRQUNQLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDNUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNsSyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxLQUFLO1FBQ0wsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM1QixNQUFNLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hLLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELFFBQVE7UUFDUixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzdCLE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDbEssSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsV0FBVztRQUNYLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sWUFBWSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ2xMLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsY0FBYztRQUNkLElBQUksaUJBQXVDLENBQUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM5QixpQkFBaUIsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN4SSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU87UUFDUCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNoTCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRU8sb0JBQW9CLENBQUMsSUFBcUI7UUFFakQsOERBQThEO1FBQzlELCtEQUErRDtRQUMvRCxnQ0FBZ0M7UUFDaEMsRUFBRTtRQUNGLDhEQUE4RDtRQUM5RCxxQkFBcUI7UUFDckIsOERBQThEO1FBQzlELDhEQUE4RDtRQUM5RCwyREFBMkQ7UUFDM0QsdUNBQXVDO1FBRXZDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5QixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDcEUsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQUMsa0JBQXdCO1FBQ3JELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztRQUN6SSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUVsRCxJQUFJLFdBQVcsQ0FBQztRQUNoQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxNQUFNLGVBQWUsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ2pELFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ2xMLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDekgsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUM5SSxNQUFNLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3pJLE1BQU0sT0FBTyxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsdUJBQXVCLEVBQUU7WUFDbEUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDN0csTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDdkUsSUFDQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFLLDhDQUE4QztvQkFDakcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFPLGlHQUFpRztvQkFDMUksZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFJLDZHQUE2RztrQkFDcEosQ0FBQztvQkFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdEQsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUM1QyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUVqQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRztnQkFDZixhQUFhLEVBQUU7Z0JBQ2YsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUc7WUFDZixhQUFhLEVBQUU7WUFDZixRQUFRO1lBQ1IsYUFBYSxFQUFFO1lBQ2YsSUFBSTtZQUNKLFVBQVU7WUFDVixPQUFPO1lBQ1AsYUFBYSxFQUFFO1lBQ2YsSUFBSTtTQUNKLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLEtBQW9CO1FBQ25ELElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDLENBQUMsMkNBQTJDO1FBQ3pELENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNDLDJCQUEyQixDQUFDLENBQUM7UUFDaEksSUFBSSxrQkFBa0IsS0FBSyxRQUFRLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxjQUFjLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0csTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQ3BILElBQUksRUFBRSxVQUFVO2dCQUNoQixPQUFPLEVBQUU7b0JBQ1IsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUM7b0JBQ3ZLLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztpQkFDaEM7Z0JBQ0QsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxnQ0FBZ0MsQ0FBQzthQUN2SixDQUFDLENBQUM7WUFFSCxPQUFPLFFBQVEsS0FBSyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFjO1FBQ3BDLGlFQUFpRTtRQUNqRSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDaEIsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1YsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDdk4sQ0FBQztZQUVGLEtBQUssUUFBUTtnQkFDWixJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3RMLENBQUM7WUFFRjtnQkFDQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzlHLENBQUM7SUFDRixDQUFDO0lBR08sT0FBTyxDQUFDLElBQVUsRUFBRSxLQUE2QjtRQUN4RCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBcUIsRUFBRSxFQUFFO1lBQ3ZDLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQzlCLENBQUM7aUJBQU0sSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUMzQixNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFCLENBQUM7aUJBQU0sSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xELENBQUM7aUJBQU0sSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssa0NBQWtDLEVBQUUsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO2dCQUVELElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQzt3QkFDNUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7d0JBQzVFLCtFQUErRTt3QkFDL0UsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7NEJBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNJLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDNUUsQ0FBQztvQkFDRixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUM5RyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQzlHLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sV0FBVyxDQUFDLElBQVUsRUFBRSxNQUFjO1FBQzdDLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQixDQUFDLElBQVU7UUFDNUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDOUMsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxJQUFrQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQzFCLE1BQU0sUUFBUSxHQUNiLENBQUMsU0FBUyxLQUFLLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7WUFDM0QsQ0FBQyxTQUFTLEtBQUsscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDO1FBRW5HLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQ25ELE9BQU8sMEJBQWtCO29CQUN6QixHQUFHLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUk7b0JBQ3JDLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQztvQkFDdEIsY0FBYyxFQUFFLGVBQWU7b0JBQy9CLFlBQVksRUFBRSxLQUFLO29CQUNuQixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7aUJBQ3JDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBRWYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNkLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDNUUsQ0FBQztZQUNGLENBQUM7U0FDRCxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDWixDQUFDO0lBRU8sYUFBYSxDQUFDLEtBQW9CO1FBQ3pDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvSCxDQUFDO0lBRU8sZUFBZSxDQUFDLEtBQW9CO1FBQzNDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLHNCQUFzQixJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3RyxDQUFDO0lBRU8sa0JBQWtCLENBQUMsS0FBYSxFQUFFLFNBQWlCLEVBQUUsSUFBUztRQUNyRSxNQUFNLE9BQU8sR0FBK0I7WUFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO1lBQ2hDLElBQUk7WUFDSixPQUFPLEVBQUUsSUFBSTtTQUNiLENBQUM7UUFFRixPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLGdCQUFnQixDQUFDLGFBQW1CO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkwsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekksTUFBTSxlQUFlLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzSyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQztRQUU3SyxNQUFNLGtCQUFrQixHQUFlLEVBQUUsQ0FBQztRQUMxQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBRXpDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztZQUVsSCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSx3Q0FBd0MsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7WUFDdkssa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsRUFBRSxvQ0FBb0MsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3ZKLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx3QkFBd0IsQ0FBQyxFQUFFLDJDQUEyQyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUNuTCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxxQ0FBcUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDbkssQ0FBQztRQUVEO1lBQ0MsUUFBUTtZQUNSLElBQUk7WUFDSixhQUFhLEVBQUU7WUFDZixZQUFZO1lBQ1osR0FBRyxrQkFBa0I7WUFDckIsYUFBYSxFQUFFO1lBQ2YsZUFBZTtTQUNmLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFFdkMsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEI7Z0JBQ0MsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDO3dCQUNwQixLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTs0QkFDcEgsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUM7NEJBQ2pELElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUMxQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUw7Z0JBQ0MsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUseUJBQXlCLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRW5IO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQzt3QkFDcEIsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTs0QkFDdkcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDckMsQ0FBQztxQkFDRCxDQUFDLENBQUMsQ0FBQztZQUVMO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVoSDtnQkFDQyxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDO3dCQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFOzRCQUM5RixJQUFJLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUM7NEJBQ2hELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ2xDLENBQUM7cUJBQ0QsQ0FBQyxDQUFDLENBQUM7WUFFTDtnQkFDQyxPQUFPLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFOUc7Z0JBQ0MsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDO3dCQUNwQixLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFOzRCQUNoRyxJQUFJLENBQUMseUJBQXlCLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs0QkFDbEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDckMsQ0FBQztxQkFDRCxDQUFDLENBQUMsQ0FBQztZQUVMO2dCQUNDLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFJTyxjQUFjLENBQUMsSUFBWSxFQUFFLElBQVMsRUFBRSxJQUFjLEVBQUUsSUFBYztRQUM3RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFlLENBQUMsT0FBTyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUE0QyxFQUFFLEdBQWtCLEVBQUUsS0FBb0IsRUFBRSxFQUFFO1lBQzFKLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN2RSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDckIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHlHQUF5RztZQUNySyxDQUFDO1lBRUQsSUFBSSxpQkFBaUIsSUFBSSxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDckUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEcsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUV6RCxNQUFNLE9BQU8sR0FBK0I7WUFDM0MsS0FBSztZQUNMLEtBQUs7WUFDTCxPQUFPO1NBQ1AsQ0FBQztRQUVGLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUMxQixPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUMzQixDQUFDO1FBRUQsSUFBSSxTQUE2QixDQUFDO1FBQ2xDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsU0FBUyxHQUFHLElBQUksQ0FBQztRQUNsQixDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUVqQix1Q0FBdUM7WUFDdkMsSUFBSSxTQUFTLEtBQUssa0NBQWtDLEVBQUUsQ0FBQztnQkFDdEQsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7WUFDdEIsQ0FBQztpQkFBTSxJQUFJLFNBQVMsS0FBSyxtQ0FBbUMsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUN2QixDQUFDO2lCQUFNLElBQUksU0FBUyxLQUFLLG9DQUFvQyxFQUFFLENBQUM7Z0JBQy9ELE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ3hCLENBQUM7WUFFRCwrREFBK0Q7WUFDL0QsSUFBSSxTQUFTLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRTtvQkFDeEQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDdkMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUM7aUJBQzFELENBQUMsQ0FBQztZQUNKLENBQUM7aUJBQU0sSUFBSSxTQUFTLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRTtvQkFDeEQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDdkMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUM7aUJBQzFELENBQUMsQ0FBQztZQUNKLENBQUM7aUJBQU0sSUFBSSxTQUFTLEtBQUsseUJBQXlCLEVBQUUsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxFQUFFO29CQUN4RCxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO29CQUM1QyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFlBQVksQ0FBQztpQkFDL0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLDRCQUE0QixDQUFDLEtBQTBFLEVBQUUsdUJBQThDO1FBQzlKLE9BQU8sQ0FBQyxRQUFrQixFQUFFLEdBQTJCLEVBQUUsS0FBb0IsRUFBRSxFQUFFO1lBRWhGLG1CQUFtQjtZQUNuQixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sdUJBQXVCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0MsQ0FBQztZQUVELG1CQUFtQjtZQUNuQixJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUU7Z0JBQy9DLFlBQVksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFFRCxvQ0FBb0M7WUFDcEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQztJQUNILENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxVQUErQjtRQUUxRCwrREFBK0Q7UUFDL0QsOERBQThEO1FBQzlELCtCQUErQjtRQUMvQixJQUFJLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzNELElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxSCxJQUFJLHdCQUF3QixFQUFFLENBQUM7Z0JBQzlCLG1CQUFtQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQztZQUM3RyxDQUFDO1FBQ0YsQ0FBQztRQUVELDJFQUEyRTtRQUMzRSw0RUFBNEU7UUFDNUUsbURBQW1EO1FBQ25ELHlFQUF5RTtRQUN6RSxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDMUIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUN2RSxJQUFJLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3JILElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFakUsSUFBSSxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksVUFBVSxDQUFDLFNBQVMsS0FBSyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksVUFBVSxDQUFDLGlCQUFpQixLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzFMLHFHQUFxRztvQkFDckcsaUdBQWlHO29CQUNqRyxtR0FBbUc7b0JBQ25HLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLGdCQUFnQixHQUFvQyxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDckcsWUFBWSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUMxRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxvQkFBb0IsR0FBd0MsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDdEgsWUFBWSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUNsRyxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXpGLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsU0FBNkIsRUFBRSxPQUE2RDtRQUNsSCxNQUFNLE9BQU8sR0FBRyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUV4RixnQ0FBZ0M7UUFDaEMsSUFBSSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFFcEIsaURBQWlEO1lBQ2pELElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUNwQyxPQUFPLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1lBQ3ZELENBQUM7WUFFRCxrRkFBa0Y7WUFDbEYsa0ZBQWtGO2lCQUM3RSxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hELElBQUksWUFBWSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN2QixPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQztnQkFDL0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQztnQkFDdkQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsa0NBQWtDO2FBQzdCLENBQUM7WUFDTCxPQUFPLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxTQUFpQixFQUFFLE9BQW1DLEVBQUUsY0FBYyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVc7UUFDL0csSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDcEMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzFDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDO1FBRUYsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLE9BQU8sQ0FBQyxHQUFXLEVBQUUsRUFBVTtRQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVPLHlCQUF5QixDQUFDLEVBQVU7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7SUFDL0osQ0FBQztJQUVPLGFBQWEsQ0FBQyxLQUFhO1FBQ2xDLE9BQU8saUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdEUsQ0FBQzs7QUFsMEJXLE9BQU87SUF3QmpCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDZCQUE2QixDQUFBO0lBQzdCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxlQUFlLENBQUE7SUFDZixZQUFBLDRCQUE0QixDQUFBO0dBbkNsQixPQUFPLENBbTBCbkI7O0FBRUQsU0FBUyxhQUFhO0lBQ3JCLE9BQU8sSUFBSSxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUM1QyxDQUFDIn0=