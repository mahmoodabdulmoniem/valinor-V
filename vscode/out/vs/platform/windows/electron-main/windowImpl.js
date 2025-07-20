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
import electron, { screen } from 'electron';
import { DeferredPromise, RunOnceScheduler, timeout, Delayer } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { getMarks, mark } from '../../../base/common/performance.js';
import { isBigSurOrNewer, isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { release } from 'os';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IApplicationStorageMainService, IStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { getMenuBarVisibility, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, DEFAULT_CUSTOM_TITLEBAR_HEIGHT } from '../../window/common/window.js';
import { defaultBrowserWindowOptions, getAllWindowsExcludingOffscreen, IWindowsMainService, WindowStateValidator } from './windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { IStateService } from '../../state/node/state.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { errorHandler } from '../../../base/common/errors.js';
var ReadyState;
(function (ReadyState) {
    /**
     * This window has not loaded anything yet
     * and this is the initial state of every
     * window.
     */
    ReadyState[ReadyState["NONE"] = 0] = "NONE";
    /**
     * This window is navigating, either for the
     * first time or subsequent times.
     */
    ReadyState[ReadyState["NAVIGATING"] = 1] = "NAVIGATING";
    /**
     * This window has finished loading and is ready
     * to forward IPC requests to the web contents.
     */
    ReadyState[ReadyState["READY"] = 2] = "READY";
})(ReadyState || (ReadyState = {}));
class DockBadgeManager {
    constructor() {
        this.windows = new Set();
    }
    static { this.INSTANCE = new DockBadgeManager(); }
    acquireBadge(window) {
        this.windows.add(window.id);
        electron.app.setBadgeCount(isLinux ? 1 /* only numbers supported */ : undefined /* generic dot */);
        return {
            dispose: () => {
                this.windows.delete(window.id);
                if (this.windows.size === 0) {
                    electron.app.setBadgeCount(0);
                }
            }
        };
    }
}
export class BaseWindow extends Disposable {
    get lastFocusTime() { return this._lastFocusTime; }
    get win() { return this._win; }
    setWin(win, options) {
        this._win = win;
        // Window Events
        this._register(Event.fromNodeEventEmitter(win, 'maximize')(() => {
            if (isWindows && this.environmentMainService.enableRDPDisplayTracking && this._win) {
                const [x, y] = this._win.getPosition();
                const [width, height] = this._win.getSize();
                this.maximizedWindowState = { mode: 0 /* WindowMode.Maximized */, width, height, x, y };
                this.logService.debug(`Saved maximized window ${this.id} display state:`, this.maximizedWindowState);
            }
            this._onDidMaximize.fire();
        }));
        this._register(Event.fromNodeEventEmitter(win, 'unmaximize')(() => {
            if (isWindows && this.environmentMainService.enableRDPDisplayTracking && this.maximizedWindowState) {
                this.maximizedWindowState = undefined;
                this.logService.debug(`Cleared maximized window ${this.id} state`);
            }
            this._onDidUnmaximize.fire();
        }));
        this._register(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this._onDidClose.fire();
            this.dispose();
        }));
        this._register(Event.fromNodeEventEmitter(win, 'focus')(() => {
            this.clearNotifyFocus();
            this._lastFocusTime = Date.now();
        }));
        this._register(Event.fromNodeEventEmitter(this._win, 'enter-full-screen')(() => this._onDidEnterFullScreen.fire()));
        this._register(Event.fromNodeEventEmitter(this._win, 'leave-full-screen')(() => this._onDidLeaveFullScreen.fire()));
        this._register(Event.fromNodeEventEmitter(this._win, 'always-on-top-changed', (_, alwaysOnTop) => alwaysOnTop)(alwaysOnTop => this._onDidChangeAlwaysOnTop.fire(alwaysOnTop)));
        // Sheet Offsets
        const useCustomTitleStyle = !hasNativeTitlebar(this.configurationService, options?.titleBarStyle === 'hidden' ? "custom" /* TitlebarStyle.CUSTOM */ : undefined /* unknown */);
        if (isMacintosh && useCustomTitleStyle) {
            win.setSheetOffset(isBigSurOrNewer(release()) ? 28 : 22); // offset dialogs by the height of the custom title bar if we have any
        }
        // Update the window controls immediately based on cached or default values
        if (useCustomTitleStyle && useWindowControlsOverlay(this.configurationService)) {
            const cachedWindowControlHeight = this.stateService.getItem((BaseWindow.windowControlHeightStateStorageKey));
            if (cachedWindowControlHeight) {
                this.updateWindowControls({ height: cachedWindowControlHeight });
            }
            else {
                this.updateWindowControls({ height: DEFAULT_CUSTOM_TITLEBAR_HEIGHT });
            }
        }
        // Setup windows/linux system context menu so it only is allowed over the app icon
        if ((isWindows || isLinux) && useCustomTitleStyle) {
            this._register(Event.fromNodeEventEmitter(win, 'system-context-menu', (event, point) => ({ event, point }))(e => {
                const [x, y] = win.getPosition();
                const cursorPos = electron.screen.screenToDipPoint(e.point);
                const cx = Math.floor(cursorPos.x) - x;
                const cy = Math.floor(cursorPos.y) - y;
                // TODO@bpasero TODO@deepak1556 workaround for https://github.com/microsoft/vscode/issues/250626
                // where showing the custom menu seems broken on Windows
                if (isLinux) {
                    if (cx > 35 /* Cursor is beyond app icon in title bar */) {
                        e.event.preventDefault();
                        this._onDidTriggerSystemContextMenu.fire({ x: cx, y: cy });
                    }
                }
            }));
        }
        // Open devtools if instructed from command line args
        if (this.environmentMainService.args['open-devtools'] === true) {
            win.webContents.openDevTools();
        }
        // macOS: Window Fullscreen Transitions
        if (isMacintosh) {
            this._register(this.onDidEnterFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
            this._register(this.onDidLeaveFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
        }
        if (isWindows && this.environmentMainService.enableRDPDisplayTracking) {
            // Handles the display-added event on Windows RDP multi-monitor scenarios.
            // This helps restore maximized windows to their correct monitor after RDP reconnection.
            // Refs https://github.com/electron/electron/issues/47016
            this._register(Event.fromNodeEventEmitter(screen, 'display-added', (event, display) => ({ event, display }))((e) => {
                this.onDisplayAdded(e.display);
            }));
        }
    }
    onDisplayAdded(display) {
        const state = this.maximizedWindowState;
        if (state && this._win && WindowStateValidator.validateWindowStateOnDisplay(state, display)) {
            this.logService.debug(`Setting maximized window ${this.id} bounds to match newly added display`, state);
            this._win.setBounds(state);
        }
    }
    constructor(configurationService, stateService, environmentMainService, logService) {
        super();
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        //#region Events
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidMaximize = this._register(new Emitter());
        this.onDidMaximize = this._onDidMaximize.event;
        this._onDidUnmaximize = this._register(new Emitter());
        this.onDidUnmaximize = this._onDidUnmaximize.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this._onDidEnterFullScreen = this._register(new Emitter());
        this.onDidEnterFullScreen = this._onDidEnterFullScreen.event;
        this._onDidLeaveFullScreen = this._register(new Emitter());
        this.onDidLeaveFullScreen = this._onDidLeaveFullScreen.event;
        this._onDidChangeAlwaysOnTop = this._register(new Emitter());
        this.onDidChangeAlwaysOnTop = this._onDidChangeAlwaysOnTop.event;
        this._lastFocusTime = Date.now(); // window is shown on creation so take current time
        this._win = null;
        this.notifyFocusDisposable = this._register(new MutableDisposable());
        //#endregion
        //#region Fullscreen
        this.transientIsNativeFullScreen = undefined;
        this.joinNativeFullScreenTransition = undefined;
    }
    applyState(state, hasMultipleDisplays = electron.screen.getAllDisplays().length > 0) {
        // TODO@electron (Electron 4 regression): when running on multiple displays where the target display
        // to open the window has a larger resolution than the primary display, the window will not size
        // correctly unless we set the bounds again (https://github.com/microsoft/vscode/issues/74872)
        //
        // Extended to cover Windows as well as Mac (https://github.com/microsoft/vscode/issues/146499)
        //
        // However, when running with native tabs with multiple windows we cannot use this workaround
        // because there is a potential that the new window will be added as native tab instead of being
        // a window on its own. In that case calling setBounds() would cause https://github.com/microsoft/vscode/issues/75830
        const windowSettings = this.configurationService.getValue('window');
        const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
        if ((isMacintosh || isWindows) && hasMultipleDisplays && (!useNativeTabs || getAllWindowsExcludingOffscreen().length === 1)) {
            if ([state.width, state.height, state.x, state.y].every(value => typeof value === 'number')) {
                this._win?.setBounds({
                    width: state.width,
                    height: state.height,
                    x: state.x,
                    y: state.y
                });
            }
        }
        if (state.mode === 0 /* WindowMode.Maximized */ || state.mode === 3 /* WindowMode.Fullscreen */) {
            // this call may or may not show the window, depends
            // on the platform: currently on Windows and Linux will
            // show the window as active. To be on the safe side,
            // we show the window at the end of this block.
            this._win?.maximize();
            if (state.mode === 3 /* WindowMode.Fullscreen */) {
                this.setFullScreen(true, true);
            }
            // to reduce flicker from the default window size
            // to maximize or fullscreen, we only show after
            this._win?.show();
        }
    }
    setRepresentedFilename(filename) {
        if (isMacintosh) {
            this.win?.setRepresentedFilename(filename);
        }
        else {
            this.representedFilename = filename;
        }
    }
    getRepresentedFilename() {
        if (isMacintosh) {
            return this.win?.getRepresentedFilename();
        }
        return this.representedFilename;
    }
    setDocumentEdited(edited) {
        if (isMacintosh) {
            this.win?.setDocumentEdited(edited);
        }
        this.documentEdited = edited;
    }
    isDocumentEdited() {
        if (isMacintosh) {
            return Boolean(this.win?.isDocumentEdited());
        }
        return !!this.documentEdited;
    }
    focus(options) {
        switch (options?.mode ?? 0 /* FocusMode.Transfer */) {
            case 0 /* FocusMode.Transfer */:
                this.doFocusWindow();
                break;
            case 1 /* FocusMode.Notify */:
                this.showNotifyFocus();
                break;
            case 2 /* FocusMode.Force */:
                if (isMacintosh) {
                    electron.app.focus({ steal: true });
                }
                this.doFocusWindow();
                break;
        }
    }
    showNotifyFocus() {
        const disposables = new DisposableStore();
        this.notifyFocusDisposable.value = disposables;
        // Badge
        disposables.add(DockBadgeManager.INSTANCE.acquireBadge(this));
        // Flash/Bounce
        if (isWindows || isLinux) {
            this.win?.flashFrame(true);
            disposables.add(toDisposable(() => this.win?.flashFrame(false)));
        }
        else if (isMacintosh) {
            electron.app.dock?.bounce('informational');
        }
    }
    clearNotifyFocus() {
        this.notifyFocusDisposable.clear();
    }
    doFocusWindow() {
        const win = this.win;
        if (!win) {
            return;
        }
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    }
    //#region Window Control Overlays
    static { this.windowControlHeightStateStorageKey = 'windowControlHeight'; }
    updateWindowControls(options) {
        const win = this.win;
        if (!win) {
            return;
        }
        // Cache the height for speeds lookups on startup
        if (options.height) {
            this.stateService.setItem((CodeWindow.windowControlHeightStateStorageKey), options.height);
        }
        // Windows/Linux: update window controls via setTitleBarOverlay()
        if (!isMacintosh && useWindowControlsOverlay(this.configurationService)) {
            win.setTitleBarOverlay({
                color: options.backgroundColor?.trim() === '' ? undefined : options.backgroundColor,
                symbolColor: options.foregroundColor?.trim() === '' ? undefined : options.foregroundColor,
                height: options.height ? options.height - 1 : undefined // account for window border
            });
        }
        // macOS: update window controls via setWindowButtonPosition()
        else if (isMacintosh && options.height !== undefined) {
            // The traffic lights have a height of 12px. There's an invisible margin
            // of 2px at the top and bottom, and 1px on the left and right. Therefore,
            // the height for centering is 12px + 2 * 2px = 16px. When the position
            // is set, the horizontal margin is offset to ensure the distance between
            // the traffic lights and the window frame is equal in both directions.
            const offset = Math.floor((options.height - 16) / 2);
            if (!offset) {
                win.setWindowButtonPosition(null);
            }
            else {
                win.setWindowButtonPosition({ x: offset + 1, y: offset });
            }
        }
    }
    toggleFullScreen() {
        this.setFullScreen(!this.isFullScreen, false);
    }
    setFullScreen(fullscreen, fromRestore) {
        // Set fullscreen state
        if (useNativeFullScreen(this.configurationService)) {
            this.setNativeFullScreen(fullscreen, fromRestore);
        }
        else {
            this.setSimpleFullScreen(fullscreen);
        }
    }
    get isFullScreen() {
        if (isMacintosh && typeof this.transientIsNativeFullScreen === 'boolean') {
            return this.transientIsNativeFullScreen;
        }
        const win = this.win;
        const isFullScreen = win?.isFullScreen();
        const isSimpleFullScreen = win?.isSimpleFullScreen();
        return Boolean(isFullScreen || isSimpleFullScreen);
    }
    setNativeFullScreen(fullscreen, fromRestore) {
        const win = this.win;
        if (win?.isSimpleFullScreen()) {
            win?.setSimpleFullScreen(false);
        }
        this.doSetNativeFullScreen(fullscreen, fromRestore);
    }
    doSetNativeFullScreen(fullscreen, fromRestore) {
        if (isMacintosh) {
            // macOS: Electron windows report `false` for `isFullScreen()` for as long
            // as the fullscreen transition animation takes place. As such, we need to
            // listen to the transition events and carry around an intermediate state
            // for knowing if we are in fullscreen or not
            // Refs: https://github.com/electron/electron/issues/35360
            this.transientIsNativeFullScreen = fullscreen;
            const joinNativeFullScreenTransition = this.joinNativeFullScreenTransition = new DeferredPromise();
            (async () => {
                const transitioned = await Promise.race([
                    joinNativeFullScreenTransition.p,
                    timeout(10000).then(() => false)
                ]);
                if (this.joinNativeFullScreenTransition !== joinNativeFullScreenTransition) {
                    return; // another transition was requested later
                }
                this.transientIsNativeFullScreen = undefined;
                this.joinNativeFullScreenTransition = undefined;
                // There is one interesting gotcha on macOS: when you are opening a new
                // window from a fullscreen window, that new window will immediately
                // open fullscreen and emit the `enter-full-screen` event even before we
                // reach this method. In that case, we actually will timeout after 10s
                // for detecting the transition and as such it is important that we only
                // signal to leave fullscreen if the window reports as not being in fullscreen.
                if (!transitioned && fullscreen && fromRestore && this.win && !this.win.isFullScreen()) {
                    // We have seen requests for fullscreen failing eventually after some
                    // time, for example when an OS update was performed and windows restore.
                    // In those cases a user would find a window that is not in fullscreen
                    // but also does not show any custom titlebar (and thus window controls)
                    // because we think the window is in fullscreen.
                    //
                    // As a workaround in that case we emit a warning and leave fullscreen
                    // so that at least the window controls are back.
                    this.logService.warn('window: native macOS fullscreen transition did not happen within 10s from restoring');
                    this._onDidLeaveFullScreen.fire();
                }
            })();
        }
        const win = this.win;
        win?.setFullScreen(fullscreen);
    }
    setSimpleFullScreen(fullscreen) {
        const win = this.win;
        if (win?.isFullScreen()) {
            this.doSetNativeFullScreen(false, false);
        }
        win?.setSimpleFullScreen(fullscreen);
        win?.webContents.focus(); // workaround issue where focus is not going into window
    }
    dispose() {
        super.dispose();
        this._win = null; // Important to dereference the window object to allow for GC
    }
}
let CodeWindow = class CodeWindow extends BaseWindow {
    get id() { return this._id; }
    get backupPath() { return this._config?.backupPath; }
    get openedWorkspace() { return this._config?.workspace; }
    get profile() {
        if (!this.config) {
            return undefined;
        }
        const profile = this.userDataProfilesService.profiles.find(profile => profile.id === this.config?.profiles.profile.id);
        if (this.isExtensionDevelopmentHost && profile) {
            return profile;
        }
        return this.userDataProfilesService.getProfileForWorkspace(this.config.workspace ?? toWorkspaceIdentifier(this.backupPath, this.isExtensionDevelopmentHost)) ?? this.userDataProfilesService.defaultProfile;
    }
    get remoteAuthority() { return this._config?.remoteAuthority; }
    get config() { return this._config; }
    get isExtensionDevelopmentHost() { return !!(this._config?.extensionDevelopmentPath); }
    get isExtensionTestHost() { return !!(this._config?.extensionTestsPath); }
    get isExtensionDevelopmentTestFromCli() { return this.isExtensionDevelopmentHost && this.isExtensionTestHost && !this._config?.debugId; }
    constructor(config, logService, loggerMainService, environmentMainService, policyService, userDataProfilesService, fileService, applicationStorageMainService, storageMainService, configurationService, themeMainService, workspacesManagementMainService, backupMainService, telemetryService, dialogMainService, lifecycleMainService, productService, protocolMainService, windowsMainService, stateService, instantiationService) {
        super(configurationService, stateService, environmentMainService, logService);
        this.loggerMainService = loggerMainService;
        this.policyService = policyService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.storageMainService = storageMainService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.backupMainService = backupMainService;
        this.telemetryService = telemetryService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.productService = productService;
        this.windowsMainService = windowsMainService;
        //#region Events
        this._onWillLoad = this._register(new Emitter());
        this.onWillLoad = this._onWillLoad.event;
        this._onDidSignalReady = this._register(new Emitter());
        this.onDidSignalReady = this._onDidSignalReady.event;
        this._onDidDestroy = this._register(new Emitter());
        this.onDidDestroy = this._onDidDestroy.event;
        this.whenReadyCallbacks = [];
        this.touchBarGroups = [];
        this.currentHttpProxy = undefined;
        this.currentNoProxy = undefined;
        this.customZoomLevel = undefined;
        this.wasLoaded = false;
        this.readyState = 0 /* ReadyState.NONE */;
        //#region create browser window
        {
            this.configObjectUrl = this._register(protocolMainService.createIPCObjectUrl());
            // Load window state
            const [state, hasMultipleDisplays] = this.restoreWindowState(config.state);
            this.windowState = state;
            this.logService.trace('window#ctor: using window state', state);
            const options = instantiationService.invokeFunction(defaultBrowserWindowOptions, this.windowState, undefined, {
                preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-browser/preload.js').fsPath,
                additionalArguments: [`--vscode-window-config=${this.configObjectUrl.resource.toString()}`],
                v8CacheOptions: this.environmentMainService.useCodeCache ? 'bypassHeatCheck' : 'none',
            });
            // Create the browser window
            mark('code/willCreateCodeBrowserWindow');
            this._win = new electron.BrowserWindow(options);
            mark('code/didCreateCodeBrowserWindow');
            this._id = this._win.id;
            this.setWin(this._win, options);
            // Apply some state after window creation
            this.applyState(this.windowState, hasMultipleDisplays);
            this._lastFocusTime = Date.now(); // since we show directly, we need to set the last focus time too
        }
        //#endregion
        //#region JS Callstack Collector
        let sampleInterval = parseInt(this.environmentMainService.args['unresponsive-sample-interval'] || '1000');
        let samplePeriod = parseInt(this.environmentMainService.args['unresponsive-sample-period'] || '15000');
        if (sampleInterval <= 0 || samplePeriod <= 0 || sampleInterval > samplePeriod) {
            this.logService.warn(`Invalid unresponsive sample interval (${sampleInterval}ms) or period (${samplePeriod}ms), using defaults.`);
            sampleInterval = 1000;
            samplePeriod = 15000;
        }
        this.jsCallStackMap = new Map();
        this.jsCallStackEffectiveSampleCount = Math.round(samplePeriod / sampleInterval);
        this.jsCallStackCollector = this._register(new Delayer(sampleInterval));
        this.jsCallStackCollectorStopScheduler = this._register(new RunOnceScheduler(() => {
            this.stopCollectingJScallStacks(); // Stop collecting after 15s max
        }, samplePeriod));
        //#endregion
        // respect configured menu bar visibility
        this.onConfigurationUpdated();
        // macOS: touch bar support
        this.createTouchBar();
        // Eventing
        this.registerListeners();
    }
    setReady() {
        this.logService.trace(`window#load: window reported ready (id: ${this._id})`);
        this.readyState = 2 /* ReadyState.READY */;
        // inform all waiting promises that we are ready now
        while (this.whenReadyCallbacks.length) {
            this.whenReadyCallbacks.pop()(this);
        }
        // Events
        this._onDidSignalReady.fire();
    }
    ready() {
        return new Promise(resolve => {
            if (this.isReady) {
                return resolve(this);
            }
            // otherwise keep and call later when we are ready
            this.whenReadyCallbacks.push(resolve);
        });
    }
    get isReady() {
        return this.readyState === 2 /* ReadyState.READY */;
    }
    get whenClosedOrLoaded() {
        return new Promise(resolve => {
            function handle() {
                closeListener.dispose();
                loadListener.dispose();
                resolve();
            }
            const closeListener = this.onDidClose(() => handle());
            const loadListener = this.onWillLoad(() => handle());
        });
    }
    registerListeners() {
        // Window error conditions to handle
        this._register(Event.fromNodeEventEmitter(this._win, 'unresponsive')(() => this.onWindowError(1 /* WindowError.UNRESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win, 'responsive')(() => this.onWindowError(4 /* WindowError.RESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'render-process-gone', (event, details) => details)(details => this.onWindowError(2 /* WindowError.PROCESS_GONE */, { ...details })));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-fail-load', (event, exitCode, reason) => ({ exitCode, reason }))(({ exitCode, reason }) => this.onWindowError(3 /* WindowError.LOAD */, { reason, exitCode })));
        // Prevent windows/iframes from blocking the unload
        // through DOM events. We have our own logic for
        // unloading a window that should not be confused
        // with the DOM way.
        // (https://github.com/microsoft/vscode/issues/122736)
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'will-prevent-unload')(event => event.preventDefault()));
        // Remember that we loaded
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-finish-load')(() => {
            // Associate properties from the load request if provided
            if (this.pendingLoadConfig) {
                this._config = this.pendingLoadConfig;
                this.pendingLoadConfig = undefined;
            }
        }));
        // Window (Un)Maximize
        this._register(this.onDidMaximize(() => {
            if (this._config) {
                this._config.maximized = true;
            }
        }));
        this._register(this.onDidUnmaximize(() => {
            if (this._config) {
                this._config.maximized = false;
            }
        }));
        // Window Fullscreen
        this._register(this.onDidEnterFullScreen(() => {
            this.sendWhenReady('vscode:enterFullScreen', CancellationToken.None);
        }));
        this._register(this.onDidLeaveFullScreen(() => {
            this.sendWhenReady('vscode:leaveFullScreen', CancellationToken.None);
        }));
        // Handle configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        // Handle Workspace events
        this._register(this.workspacesManagementMainService.onDidDeleteUntitledWorkspace(e => this.onDidDeleteUntitledWorkspace(e)));
        // Inject headers when requests are incoming
        const urls = ['https://*.vsassets.io/*'];
        if (this.productService.extensionsGallery?.serviceUrl) {
            const serviceUrl = URI.parse(this.productService.extensionsGallery.serviceUrl);
            urls.push(`${serviceUrl.scheme}://${serviceUrl.authority}/*`);
        }
        this._win.webContents.session.webRequest.onBeforeSendHeaders({ urls }, async (details, cb) => {
            const headers = await this.getMarketplaceHeaders();
            cb({ cancel: false, requestHeaders: Object.assign(details.requestHeaders, headers) });
        });
    }
    getMarketplaceHeaders() {
        if (!this.marketplaceHeadersPromise) {
            this.marketplaceHeadersPromise = resolveMarketplaceHeaders(this.productService.version, this.productService, this.environmentMainService, this.configurationService, this.fileService, this.applicationStorageMainService, this.telemetryService);
        }
        return this.marketplaceHeadersPromise;
    }
    async onWindowError(type, details) {
        switch (type) {
            case 2 /* WindowError.PROCESS_GONE */:
                this.logService.error(`CodeWindow: renderer process gone (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
            case 1 /* WindowError.UNRESPONSIVE */:
                this.logService.error('CodeWindow: detected unresponsive');
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.logService.error('CodeWindow: recovered from unresponsive');
                break;
            case 3 /* WindowError.LOAD */:
                this.logService.error(`CodeWindow: failed to load (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
        }
        this.telemetryService.publicLog2('windowerror', {
            type,
            reason: details?.reason,
            code: details?.exitCode
        });
        // Inform User if non-recoverable
        switch (type) {
            case 1 /* WindowError.UNRESPONSIVE */:
            case 2 /* WindowError.PROCESS_GONE */:
                // If we run extension tests from CLI, we want to signal
                // back this state to the test runner by exiting with a
                // non-zero exit code.
                if (this.isExtensionDevelopmentTestFromCli) {
                    this.lifecycleMainService.kill(1);
                    return;
                }
                // If we run smoke tests, want to proceed with an orderly
                // shutdown as much as possible by destroying the window
                // and then calling the normal `quit` routine.
                if (this.environmentMainService.args['enable-smoke-test-driver']) {
                    await this.destroyWindow(false, false);
                    this.lifecycleMainService.quit(); // still allow for an orderly shutdown
                    return;
                }
                // Unresponsive
                if (type === 1 /* WindowError.UNRESPONSIVE */) {
                    if (this.isExtensionDevelopmentHost || this.isExtensionTestHost || (this._win && this._win.webContents && this._win.webContents.isDevToolsOpened())) {
                        // TODO@electron Workaround for https://github.com/microsoft/vscode/issues/56994
                        // In certain cases the window can report unresponsiveness because a breakpoint was hit
                        // and the process is stopped executing. The most typical cases are:
                        // - devtools are opened and debugging happens
                        // - window is an extensions development host that is being debugged
                        // - window is an extension test development host that is being debugged
                        return;
                    }
                    // Interrupt V8 and collect JavaScript stack
                    this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
                    // Stack collection will stop under any of the following conditions:
                    // - The window becomes responsive again
                    // - The window is destroyed i-e reopen or closed
                    // - sampling period is complete, default is 15s
                    this.jsCallStackCollectorStopScheduler.schedule();
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen"),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close"),
                            localize({ key: 'wait', comment: ['&& denotes a mnemonic'] }, "&&Keep Waiting")
                        ],
                        message: localize('appStalled', "The window is not responding"),
                        detail: localize('appStalledDetail', "You can reopen or close the window or keep waiting."),
                        checkboxLabel: this._config?.workspace ? localize('doNotRestoreEditors', "Don't restore editors") : undefined
                    }, this._win);
                    // Handle choice
                    if (response !== 2 /* keep waiting */) {
                        const reopen = response === 0;
                        this.stopCollectingJScallStacks();
                        await this.destroyWindow(reopen, checkboxChecked);
                    }
                }
                // Process gone
                else if (type === 2 /* WindowError.PROCESS_GONE */) {
                    let message;
                    if (!details) {
                        message = localize('appGone', "The window terminated unexpectedly");
                    }
                    else {
                        message = localize('appGoneDetails', "The window terminated unexpectedly (reason: '{0}', code: '{1}')", details.reason, details.exitCode ?? '<unknown>');
                    }
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            this._config?.workspace ? localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen") : localize({ key: 'newWindow', comment: ['&& denotes a mnemonic'] }, "&&New Window"),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close")
                        ],
                        message,
                        detail: this._config?.workspace ?
                            localize('appGoneDetailWorkspace', "We are sorry for the inconvenience. You can reopen the window to continue where you left off.") :
                            localize('appGoneDetailEmptyWindow', "We are sorry for the inconvenience. You can open a new empty window to start again."),
                        checkboxLabel: this._config?.workspace ? localize('doNotRestoreEditors', "Don't restore editors") : undefined
                    }, this._win);
                    // Handle choice
                    const reopen = response === 0;
                    await this.destroyWindow(reopen, checkboxChecked);
                }
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.stopCollectingJScallStacks();
                break;
        }
    }
    async destroyWindow(reopen, skipRestoreEditors) {
        const workspace = this._config?.workspace;
        // check to discard editor state first
        if (skipRestoreEditors && workspace) {
            try {
                const workspaceStorage = this.storageMainService.workspaceStorage(workspace);
                await workspaceStorage.init();
                workspaceStorage.delete('memento/workbench.parts.editor');
                await workspaceStorage.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        // 'close' event will not be fired on destroy(), so signal crash via explicit event
        this._onDidDestroy.fire();
        try {
            // ask the windows service to open a new fresh window if specified
            if (reopen && this._config) {
                // We have to reconstruct a openable from the current workspace
                let uriToOpen = undefined;
                let forceEmpty = undefined;
                if (isSingleFolderWorkspaceIdentifier(workspace)) {
                    uriToOpen = { folderUri: workspace.uri };
                }
                else if (isWorkspaceIdentifier(workspace)) {
                    uriToOpen = { workspaceUri: workspace.configPath };
                }
                else {
                    forceEmpty = true;
                }
                // Delegate to windows service
                const window = (await this.windowsMainService.open({
                    context: 5 /* OpenContext.API */,
                    userEnv: this._config.userEnv,
                    cli: {
                        ...this.environmentMainService.args,
                        _: [] // we pass in the workspace to open explicitly via `urisToOpen`
                    },
                    urisToOpen: uriToOpen ? [uriToOpen] : undefined,
                    forceEmpty,
                    forceNewWindow: true,
                    remoteAuthority: this.remoteAuthority
                })).at(0);
                window?.focus();
            }
        }
        finally {
            // make sure to destroy the window as its renderer process is gone. do this
            // after the code for reopening the window, to prevent the entire application
            // from quitting when the last window closes as a result.
            this._win?.destroy();
        }
    }
    onDidDeleteUntitledWorkspace(workspace) {
        // Make sure to update our workspace config if we detect that it
        // was deleted
        if (this._config?.workspace?.id === workspace.id) {
            this._config.workspace = undefined;
        }
    }
    onConfigurationUpdated(e) {
        // Menubar
        if (!e || e.affectsConfiguration("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */)) {
            const newMenuBarVisibility = this.getMenuBarVisibility();
            if (newMenuBarVisibility !== this.currentMenuBarVisibility) {
                this.currentMenuBarVisibility = newMenuBarVisibility;
                this.setMenuBarVisibility(newMenuBarVisibility);
            }
        }
        // Proxy
        if (!e || e.affectsConfiguration('http.proxy') || e.affectsConfiguration('http.noProxy')) {
            const inspect = this.configurationService.inspect('http.proxy');
            let newHttpProxy = (inspect.userLocalValue || '').trim()
                || (process.env['https_proxy'] || process.env['HTTPS_PROXY'] || process.env['http_proxy'] || process.env['HTTP_PROXY'] || '').trim() // Not standardized.
                || undefined;
            if (newHttpProxy?.indexOf('@') !== -1) {
                const uri = URI.parse(newHttpProxy);
                const i = uri.authority.indexOf('@');
                if (i !== -1) {
                    newHttpProxy = uri.with({ authority: uri.authority.substring(i + 1) })
                        .toString();
                }
            }
            if (newHttpProxy?.endsWith('/')) {
                newHttpProxy = newHttpProxy.substr(0, newHttpProxy.length - 1);
            }
            const newNoProxy = (this.configurationService.getValue('http.noProxy') || []).map((item) => item.trim()).join(',')
                || (process.env['no_proxy'] || process.env['NO_PROXY'] || '').trim() || undefined; // Not standardized.
            if ((newHttpProxy || '').indexOf('@') === -1 && (newHttpProxy !== this.currentHttpProxy || newNoProxy !== this.currentNoProxy)) {
                this.currentHttpProxy = newHttpProxy;
                this.currentNoProxy = newNoProxy;
                const proxyRules = newHttpProxy || '';
                const proxyBypassRules = newNoProxy ? `${newNoProxy},<local>` : '<local>';
                this.logService.trace(`Setting proxy to '${proxyRules}', bypassing '${proxyBypassRules}'`);
                this._win.webContents.session.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
                electron.app.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
            }
        }
    }
    addTabbedWindow(window) {
        if (isMacintosh && window.win) {
            this._win.addTabbedWindow(window.win);
        }
    }
    load(configuration, options = Object.create(null)) {
        this.logService.trace(`window#load: attempt to load window (id: ${this._id})`);
        // Clear Document Edited if needed
        if (this.isDocumentEdited()) {
            if (!options.isReload || !this.backupMainService.isHotExitEnabled()) {
                this.setDocumentEdited(false);
            }
        }
        // Clear Title and Filename if needed
        if (!options.isReload) {
            if (this.getRepresentedFilename()) {
                this.setRepresentedFilename('');
            }
            this._win.setTitle(this.productService.nameLong);
        }
        // Update configuration values based on our window context
        // and set it into the config object URL for usage.
        this.updateConfiguration(configuration, options);
        // If this is the first time the window is loaded, we associate the paths
        // directly with the window because we assume the loading will just work
        if (this.readyState === 0 /* ReadyState.NONE */) {
            this._config = configuration;
        }
        // Otherwise, the window is currently showing a folder and if there is an
        // unload handler preventing the load, we cannot just associate the paths
        // because the loading might be vetoed. Instead we associate it later when
        // the window load event has fired.
        else {
            this.pendingLoadConfig = configuration;
        }
        // Indicate we are navigting now
        this.readyState = 1 /* ReadyState.NAVIGATING */;
        // Load URL
        this._win.loadURL(FileAccess.asBrowserUri(`vs/code/electron-browser/workbench/workbench${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));
        // Remember that we did load
        const wasLoaded = this.wasLoaded;
        this.wasLoaded = true;
        // Make window visible if it did not open in N seconds because this indicates an error
        // Only do this when running out of sources and not when running tests
        if (!this.environmentMainService.isBuilt && !this.environmentMainService.extensionTestsLocationURI) {
            this._register(new RunOnceScheduler(() => {
                if (this._win && !this._win.isVisible() && !this._win.isMinimized()) {
                    this._win.show();
                    this.focus({ mode: 2 /* FocusMode.Force */ });
                    this._win.webContents.openDevTools();
                }
            }, 10000)).schedule();
        }
        // Event
        this._onWillLoad.fire({ workspace: configuration.workspace, reason: options.isReload ? 3 /* LoadReason.RELOAD */ : wasLoaded ? 2 /* LoadReason.LOAD */ : 1 /* LoadReason.INITIAL */ });
    }
    updateConfiguration(configuration, options) {
        // If this window was loaded before from the command line
        // (as indicated by VSCODE_CLI environment), make sure to
        // preserve that user environment in subsequent loads,
        // unless the new configuration context was also a CLI
        // (for https://github.com/microsoft/vscode/issues/108571)
        // Also, preserve the environment if we're loading from an
        // extension development host that had its environment set
        // (for https://github.com/microsoft/vscode/issues/123508)
        const currentUserEnv = (this._config ?? this.pendingLoadConfig)?.userEnv;
        if (currentUserEnv) {
            const shouldPreserveLaunchCliEnvironment = isLaunchedFromCli(currentUserEnv) && !isLaunchedFromCli(configuration.userEnv);
            const shouldPreserveDebugEnvironmnet = this.isExtensionDevelopmentHost;
            if (shouldPreserveLaunchCliEnvironment || shouldPreserveDebugEnvironmnet) {
                configuration.userEnv = { ...currentUserEnv, ...configuration.userEnv }; // still allow to override certain environment as passed in
            }
        }
        // If named pipe was instantiated for the crashpad_handler process, reuse the same
        // pipe for new app instances connecting to the original app instance.
        // Ref: https://github.com/microsoft/vscode/issues/115874
        if (process.env['CHROME_CRASHPAD_PIPE_NAME']) {
            Object.assign(configuration.userEnv, {
                CHROME_CRASHPAD_PIPE_NAME: process.env['CHROME_CRASHPAD_PIPE_NAME']
            });
        }
        // Add disable-extensions to the config, but do not preserve it on currentConfig or
        // pendingLoadConfig so that it is applied only on this load
        if (options.disableExtensions !== undefined) {
            configuration['disable-extensions'] = options.disableExtensions;
        }
        // Update window related properties
        try {
            configuration.handle = VSBuffer.wrap(this._win.getNativeWindowHandle());
        }
        catch (error) {
            this.logService.error(`Error getting native window handle: ${error}`);
        }
        configuration.fullscreen = this.isFullScreen;
        configuration.maximized = this._win.isMaximized();
        configuration.partsSplash = this.themeMainService.getWindowSplash(configuration.workspace);
        configuration.zoomLevel = this.getZoomLevel();
        configuration.isCustomZoomLevel = typeof this.customZoomLevel === 'number';
        if (configuration.isCustomZoomLevel && configuration.partsSplash) {
            configuration.partsSplash.zoomLevel = configuration.zoomLevel;
        }
        // Update with latest perf marks
        mark('code/willOpenNewWindow');
        configuration.perfMarks = getMarks();
        // Update in config object URL for usage in renderer
        this.configObjectUrl.update(configuration);
    }
    async reload(cli) {
        // Copy our current config for reuse
        const configuration = Object.assign({}, this._config);
        // Validate workspace
        configuration.workspace = await this.validateWorkspaceBeforeReload(configuration);
        // Delete some properties we do not want during reload
        delete configuration.filesToOpenOrCreate;
        delete configuration.filesToDiff;
        delete configuration.filesToMerge;
        delete configuration.filesToWait;
        // Some configuration things get inherited if the window is being reloaded and we are
        // in extension development mode. These options are all development related.
        if (this.isExtensionDevelopmentHost && cli) {
            configuration.verbose = cli.verbose;
            configuration.debugId = cli.debugId;
            configuration.extensionEnvironment = cli.extensionEnvironment;
            configuration['inspect-extensions'] = cli['inspect-extensions'];
            configuration['inspect-brk-extensions'] = cli['inspect-brk-extensions'];
            configuration['extensions-dir'] = cli['extensions-dir'];
        }
        configuration.accessibilitySupport = electron.app.isAccessibilitySupportEnabled();
        configuration.isInitialStartup = false; // since this is a reload
        configuration.policiesData = this.policyService.serialize(); // set policies data again
        configuration.continueOn = this.environmentMainService.continueOn;
        configuration.profiles = {
            all: this.userDataProfilesService.profiles,
            profile: this.profile || this.userDataProfilesService.defaultProfile,
            home: this.userDataProfilesService.profilesHome
        };
        configuration.logLevel = this.loggerMainService.getLogLevel();
        configuration.loggers = this.loggerMainService.getGlobalLoggers();
        // Load config
        this.load(configuration, { isReload: true, disableExtensions: cli?.['disable-extensions'] });
    }
    async validateWorkspaceBeforeReload(configuration) {
        // Multi folder
        if (isWorkspaceIdentifier(configuration.workspace)) {
            const configPath = configuration.workspace.configPath;
            if (configPath.scheme === Schemas.file) {
                const workspaceExists = await this.fileService.exists(configPath);
                if (!workspaceExists) {
                    return undefined;
                }
            }
        }
        // Single folder
        else if (isSingleFolderWorkspaceIdentifier(configuration.workspace)) {
            const uri = configuration.workspace.uri;
            if (uri.scheme === Schemas.file) {
                const folderExists = await this.fileService.exists(uri);
                if (!folderExists) {
                    return undefined;
                }
            }
        }
        // Workspace is valid
        return configuration.workspace;
    }
    serializeWindowState() {
        if (!this._win) {
            return defaultWindowState();
        }
        // fullscreen gets special treatment
        if (this.isFullScreen) {
            let display;
            try {
                display = electron.screen.getDisplayMatching(this.getBounds());
            }
            catch (error) {
                // Electron has weird conditions under which it throws errors
                // e.g. https://github.com/microsoft/vscode/issues/100334 when
                // large numbers are passed in
            }
            const defaultState = defaultWindowState();
            return {
                mode: 3 /* WindowMode.Fullscreen */,
                display: display ? display.id : undefined,
                // Still carry over window dimensions from previous sessions
                // if we can compute it in fullscreen state.
                // does not seem possible in all cases on Linux for example
                // (https://github.com/microsoft/vscode/issues/58218) so we
                // fallback to the defaults in that case.
                width: this.windowState.width || defaultState.width,
                height: this.windowState.height || defaultState.height,
                x: this.windowState.x || 0,
                y: this.windowState.y || 0,
                zoomLevel: this.customZoomLevel
            };
        }
        const state = Object.create(null);
        let mode;
        // get window mode
        if (!isMacintosh && this._win.isMaximized()) {
            mode = 0 /* WindowMode.Maximized */;
        }
        else {
            mode = 1 /* WindowMode.Normal */;
        }
        // we don't want to save minimized state, only maximized or normal
        if (mode === 0 /* WindowMode.Maximized */) {
            state.mode = 0 /* WindowMode.Maximized */;
        }
        else {
            state.mode = 1 /* WindowMode.Normal */;
        }
        // only consider non-minimized window states
        if (mode === 1 /* WindowMode.Normal */ || mode === 0 /* WindowMode.Maximized */) {
            let bounds;
            if (mode === 1 /* WindowMode.Normal */) {
                bounds = this.getBounds();
            }
            else {
                bounds = this._win.getNormalBounds(); // make sure to persist the normal bounds when maximized to be able to restore them
            }
            state.x = bounds.x;
            state.y = bounds.y;
            state.width = bounds.width;
            state.height = bounds.height;
        }
        state.zoomLevel = this.customZoomLevel;
        return state;
    }
    restoreWindowState(state) {
        mark('code/willRestoreCodeWindowState');
        let hasMultipleDisplays = false;
        if (state) {
            // Window zoom
            this.customZoomLevel = state.zoomLevel;
            // Window dimensions
            try {
                const displays = electron.screen.getAllDisplays();
                hasMultipleDisplays = displays.length > 1;
                state = WindowStateValidator.validateWindowState(this.logService, state, displays);
            }
            catch (err) {
                this.logService.warn(`Unexpected error validating window state: ${err}\n${err.stack}`); // somehow display API can be picky about the state to validate
            }
        }
        mark('code/didRestoreCodeWindowState');
        return [state || defaultWindowState(), hasMultipleDisplays];
    }
    getBounds() {
        const [x, y] = this._win.getPosition();
        const [width, height] = this._win.getSize();
        return { x, y, width, height };
    }
    setFullScreen(fullscreen, fromRestore) {
        super.setFullScreen(fullscreen, fromRestore);
        // Events
        this.sendWhenReady(fullscreen ? 'vscode:enterFullScreen' : 'vscode:leaveFullScreen', CancellationToken.None);
        // Respect configured menu bar visibility or default to toggle if not set
        if (this.currentMenuBarVisibility) {
            this.setMenuBarVisibility(this.currentMenuBarVisibility, false);
        }
    }
    getMenuBarVisibility() {
        let menuBarVisibility = getMenuBarVisibility(this.configurationService);
        if (['visible', 'toggle', 'hidden'].indexOf(menuBarVisibility) < 0) {
            menuBarVisibility = 'classic';
        }
        return menuBarVisibility;
    }
    setMenuBarVisibility(visibility, notify = true) {
        if (isMacintosh) {
            return; // ignore for macOS platform
        }
        if (visibility === 'toggle') {
            if (notify) {
                this.send('vscode:showInfoMessage', localize('hiddenMenuBar', "You can still access the menu bar by pressing the Alt-key."));
            }
        }
        if (visibility === 'hidden') {
            // for some weird reason that I have no explanation for, the menu bar is not hiding when calling
            // this without timeout (see https://github.com/microsoft/vscode/issues/19777). there seems to be
            // a timing issue with us opening the first window and the menu bar getting created. somehow the
            // fact that we want to hide the menu without being able to bring it back via Alt key makes Electron
            // still show the menu. Unable to reproduce from a simple Hello World application though...
            setTimeout(() => {
                this.doSetMenuBarVisibility(visibility);
            });
        }
        else {
            this.doSetMenuBarVisibility(visibility);
        }
    }
    doSetMenuBarVisibility(visibility) {
        const isFullscreen = this.isFullScreen;
        switch (visibility) {
            case ('classic'):
                this._win.setMenuBarVisibility(!isFullscreen);
                this._win.autoHideMenuBar = isFullscreen;
                break;
            case ('visible'):
                this._win.setMenuBarVisibility(true);
                this._win.autoHideMenuBar = false;
                break;
            case ('toggle'):
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = true;
                break;
            case ('hidden'):
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = false;
                break;
        }
    }
    notifyZoomLevel(zoomLevel) {
        this.customZoomLevel = zoomLevel;
    }
    getZoomLevel() {
        if (typeof this.customZoomLevel === 'number') {
            return this.customZoomLevel;
        }
        const windowSettings = this.configurationService.getValue('window');
        return windowSettings?.zoomLevel;
    }
    close() {
        this._win?.close();
    }
    sendWhenReady(channel, token, ...args) {
        if (this.isReady) {
            this.send(channel, ...args);
        }
        else {
            this.ready().then(() => {
                if (!token.isCancellationRequested) {
                    this.send(channel, ...args);
                }
            });
        }
    }
    send(channel, ...args) {
        if (this._win) {
            if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
                this.logService.warn(`Sending IPC message to channel '${channel}' for window that is destroyed`);
                return;
            }
            try {
                this._win.webContents.send(channel, ...args);
            }
            catch (error) {
                this.logService.warn(`Error sending IPC message to channel '${channel}' of window ${this._id}: ${toErrorMessage(error)}`);
            }
        }
    }
    updateTouchBar(groups) {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // Update segments for all groups. Setting the segments property
        // of the group directly prevents ugly flickering from happening
        this.touchBarGroups.forEach((touchBarGroup, index) => {
            const commands = groups[index];
            touchBarGroup.segments = this.createTouchBarGroupSegments(commands);
        });
    }
    createTouchBar() {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // To avoid flickering, we try to reuse the touch bar group
        // as much as possible by creating a large number of groups
        // for reusing later.
        for (let i = 0; i < 10; i++) {
            const groupTouchBar = this.createTouchBarGroup();
            this.touchBarGroups.push(groupTouchBar);
        }
        this._win.setTouchBar(new electron.TouchBar({ items: this.touchBarGroups }));
    }
    createTouchBarGroup(items = []) {
        // Group Segments
        const segments = this.createTouchBarGroupSegments(items);
        // Group Control
        const control = new electron.TouchBar.TouchBarSegmentedControl({
            segments,
            mode: 'buttons',
            segmentStyle: 'automatic',
            change: (selectedIndex) => {
                this.sendWhenReady('vscode:runAction', CancellationToken.None, { id: control.segments[selectedIndex].id, from: 'touchbar' });
            }
        });
        return control;
    }
    createTouchBarGroupSegments(items = []) {
        const segments = items.map(item => {
            let icon;
            if (item.icon && !ThemeIcon.isThemeIcon(item.icon) && item.icon?.dark?.scheme === Schemas.file) {
                icon = electron.nativeImage.createFromPath(URI.revive(item.icon.dark).fsPath);
                if (icon.isEmpty()) {
                    icon = undefined;
                }
            }
            let title;
            if (typeof item.title === 'string') {
                title = item.title;
            }
            else {
                title = item.title.value;
            }
            return {
                id: item.id,
                label: !icon ? title : undefined,
                icon
            };
        });
        return segments;
    }
    async startCollectingJScallStacks() {
        if (!this.jsCallStackCollector.isTriggered()) {
            const stack = await this._win.webContents.mainFrame.collectJavaScriptCallStack();
            // Increment the count for this stack trace
            if (stack) {
                const count = this.jsCallStackMap.get(stack) || 0;
                this.jsCallStackMap.set(stack, count + 1);
            }
            this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
        }
    }
    stopCollectingJScallStacks() {
        this.jsCallStackCollectorStopScheduler.cancel();
        this.jsCallStackCollector.cancel();
        if (this.jsCallStackMap.size) {
            let logMessage = `CodeWindow unresponsive samples:\n`;
            let samples = 0;
            const sortedEntries = Array.from(this.jsCallStackMap.entries())
                .sort((a, b) => b[1] - a[1]);
            for (const [stack, count] of sortedEntries) {
                samples += count;
                // If the stack appears more than 20 percent of the time, log it
                // to the error telemetry as UnresponsiveSampleError.
                if (Math.round((count * 100) / this.jsCallStackEffectiveSampleCount) > 20) {
                    const fakeError = new UnresponsiveError(stack, this.id, this.win?.webContents.getOSProcessId());
                    errorHandler.onUnexpectedError(fakeError);
                }
                logMessage += `<${count}> ${stack}\n`;
            }
            logMessage += `Total Samples: ${samples}\n`;
            logMessage += 'For full overview of the unresponsive period, capture cpu profile via https://aka.ms/vscode-tracing-cpu-profile';
            this.logService.error(logMessage);
        }
        this.jsCallStackMap.clear();
    }
    matches(webContents) {
        return this._win?.webContents.id === webContents.id;
    }
    dispose() {
        super.dispose();
        // Deregister the loggers for this window
        this.loggerMainService.deregisterLoggers(this.id);
    }
};
CodeWindow = __decorate([
    __param(1, ILogService),
    __param(2, ILoggerMainService),
    __param(3, IEnvironmentMainService),
    __param(4, IPolicyService),
    __param(5, IUserDataProfilesMainService),
    __param(6, IFileService),
    __param(7, IApplicationStorageMainService),
    __param(8, IStorageMainService),
    __param(9, IConfigurationService),
    __param(10, IThemeMainService),
    __param(11, IWorkspacesManagementMainService),
    __param(12, IBackupMainService),
    __param(13, ITelemetryService),
    __param(14, IDialogMainService),
    __param(15, ILifecycleMainService),
    __param(16, IProductService),
    __param(17, IProtocolMainService),
    __param(18, IWindowsMainService),
    __param(19, IStateService),
    __param(20, IInstantiationService)
], CodeWindow);
export { CodeWindow };
class UnresponsiveError extends Error {
    constructor(sample, windowId, pid = 0) {
        // Since the stacks are available via the sample
        // we can avoid collecting them when constructing the error.
        const stackTraceLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        super(`UnresponsiveSampleError: from window with ID ${windowId} belonging to process with pid ${pid}`);
        Error.stackTraceLimit = stackTraceLimit;
        this.name = 'UnresponsiveSampleError';
        this.stack = sample;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9lbGVjdHJvbi1tYWluL3dpbmRvd0ltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxRQUFRLEVBQUUsRUFBNEMsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlILE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRTdCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxN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