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
import * as fs from 'fs';
import { exec } from 'child_process';
import { app, BrowserWindow, clipboard, contentTracing, Menu, powerMonitor, screen, shell, webContents } from 'electron';
import { arch, cpus, freemem, loadavg, platform, release, totalmem, type } from 'os';
import { promisify } from 'util';
import { memoize } from '../../../base/common/decorators.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { matchesSomeScheme, Schemas } from '../../../base/common/network.js';
import { dirname, join, posix, resolve, win32 } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { virtualMachineHint } from '../../../base/node/id.js';
import { Promises, SymlinkSupport } from '../../../base/node/pfs.js';
import { findFreePort, isPortFree } from '../../../base/node/ports.js';
import { localize } from '../../../nls.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { defaultBrowserWindowOptions, IWindowsMainService } from '../../windows/electron-main/windows.js';
import { isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { hasWSLFeatureInstalled } from '../../remote/node/wsl.js';
import { WindowProfiler } from '../../profiling/electron-main/windowProfiling.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { CancellationError } from '../../../base/common/errors.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IProxyAuthService } from './auth.js';
import { IRequestService } from '../../request/common/request.js';
import { randomPath } from '../../../base/common/extpath.js';
export const INativeHostMainService = createDecorator('nativeHostMainService');
let NativeHostMainService = class NativeHostMainService extends Disposable {
    constructor(windowsMainService, auxiliaryWindowsMainService, dialogMainService, lifecycleMainService, environmentMainService, logService, productService, themeMainService, workspacesManagementMainService, configurationService, requestService, proxyAuthService, instantiationService) {
        super();
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.productService = productService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.proxyAuthService = proxyAuthService;
        this.instantiationService = instantiationService;
        this._onDidChangePassword = this._register(new Emitter());
        this.onDidChangePassword = this._onDidChangePassword.event;
        // Events
        {
            this.onDidOpenMainWindow = Event.map(this.windowsMainService.onDidOpenWindow, window => window.id);
            this.onDidTriggerWindowSystemContextMenu = Event.any(Event.map(this.windowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({ windowId: window.id, x, y })), Event.map(this.auxiliaryWindowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({ windowId: window.id, x, y })));
            this.onDidMaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidMaximizeWindow, window => window.id), Event.map(this.auxiliaryWindowsMainService.onDidMaximizeWindow, window => window.id));
            this.onDidUnmaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidUnmaximizeWindow, window => window.id), Event.map(this.auxiliaryWindowsMainService.onDidUnmaximizeWindow, window => window.id));
            this.onDidChangeWindowFullScreen = Event.any(Event.map(this.windowsMainService.onDidChangeFullScreen, e => ({ windowId: e.window.id, fullscreen: e.fullscreen })), Event.map(this.auxiliaryWindowsMainService.onDidChangeFullScreen, e => ({ windowId: e.window.id, fullscreen: e.fullscreen })));
            this.onDidChangeWindowAlwaysOnTop = Event.any(Event.None, // always on top is unsupported in main windows currently
            Event.map(this.auxiliaryWindowsMainService.onDidChangeAlwaysOnTop, e => ({ windowId: e.window.id, alwaysOnTop: e.alwaysOnTop })));
            this.onDidBlurMainWindow = Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId));
            this.onDidFocusMainWindow = Event.any(Event.map(Event.filter(Event.map(this.windowsMainService.onDidChangeWindowsCount, () => this.windowsMainService.getLastActiveWindow()), window => !!window), window => window.id), Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId)));
            this.onDidBlurMainOrAuxiliaryWindow = Event.any(this.onDidBlurMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), window => !!window), window => window.id));
            this.onDidFocusMainOrAuxiliaryWindow = Event.any(this.onDidFocusMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), window => !!window), window => window.id));
            this.onDidResumeOS = Event.fromNodeEventEmitter(powerMonitor, 'resume');
            this.onDidChangeColorScheme = this.themeMainService.onDidChangeColorScheme;
            this.onDidChangeDisplay = Event.debounce(Event.any(Event.filter(Event.fromNodeEventEmitter(screen, 'display-metrics-changed', (event, display, changedMetrics) => changedMetrics), changedMetrics => {
                // Electron will emit 'display-metrics-changed' events even when actually
                // going fullscreen, because the dock hides. However, we do not want to
                // react on this event as there is no change in display bounds.
                return !(Array.isArray(changedMetrics) && changedMetrics.length === 1 && changedMetrics[0] === 'workArea');
            }), Event.fromNodeEventEmitter(screen, 'display-added'), Event.fromNodeEventEmitter(screen, 'display-removed')), () => { }, 100);
        }
    }
    //#region Properties
    get windowId() { throw new Error('Not implemented in electron-main'); }
    async getWindows(windowId, options) {
        const mainWindows = this.windowsMainService.getWindows().map(window => ({
            id: window.id,
            workspace: window.openedWorkspace ?? toWorkspaceIdentifier(window.backupPath, window.isExtensionDevelopmentHost),
            title: window.win?.getTitle() ?? '',
            filename: window.getRepresentedFilename(),
            dirty: window.isDocumentEdited()
        }));
        const auxiliaryWindows = [];
        if (options.includeAuxiliaryWindows) {
            auxiliaryWindows.push(...this.auxiliaryWindowsMainService.getWindows().map(window => ({
                id: window.id,
                parentId: window.parentId,
                title: window.win?.getTitle() ?? '',
                filename: window.getRepresentedFilename()
            })));
        }
        return [...mainWindows, ...auxiliaryWindows];
    }
    async getWindowCount(windowId) {
        return this.windowsMainService.getWindowCount();
    }
    async getActiveWindowId(windowId) {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.id;
        }
        return undefined;
    }
    async getActiveWindowPosition() {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.getBounds();
        }
        return undefined;
    }
    async getNativeWindowHandle(fallbackWindowId, windowId) {
        const window = this.windowById(windowId, fallbackWindowId);
        if (window?.win) {
            return VSBuffer.wrap(window.win.getNativeWindowHandle());
        }
        return undefined;
    }
    openWindow(windowId, arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(windowId, arg1, arg2);
        }
        return this.doOpenEmptyWindow(windowId, arg1);
    }
    async doOpenWindow(windowId, toOpen, options = Object.create(null)) {
        if (toOpen.length > 0) {
            await this.windowsMainService.open({
                context: 5 /* OpenContext.API */,
                contextWindowId: windowId,
                urisToOpen: toOpen,
                cli: this.environmentMainService.args,
                forceNewWindow: options.forceNewWindow,
                forceReuseWindow: options.forceReuseWindow,
                preferNewWindow: options.preferNewWindow,
                diffMode: options.diffMode,
                mergeMode: options.mergeMode,
                addMode: options.addMode,
                removeMode: options.removeMode,
                gotoLineMode: options.gotoLineMode,
                noRecentEntry: options.noRecentEntry,
                waitMarkerFileURI: options.waitMarkerFileURI,
                remoteAuthority: options.remoteAuthority || undefined,
                forceProfile: options.forceProfile,
                forceTempProfile: options.forceTempProfile,
            });
        }
    }
    async doOpenEmptyWindow(windowId, options) {
        await this.windowsMainService.openEmptyWindow({
            context: 5 /* OpenContext.API */,
            contextWindowId: windowId
        }, options);
    }
    async isFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.isFullScreen ?? false;
    }
    async toggleFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.toggleFullScreen();
    }
    async getCursorScreenPoint(windowId) {
        const point = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(point);
        return { point, display: display.bounds };
    }
    async isMaximized(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.isMaximized() ?? false;
    }
    async maximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.maximize();
    }
    async unmaximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.unmaximize();
    }
    async minimizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.minimize();
    }
    async moveWindowTop(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.moveTop();
    }
    async isWindowAlwaysOnTop(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.isAlwaysOnTop() ?? false;
    }
    async toggleWindowAlwaysOnTop(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.setAlwaysOnTop(!window.win.isAlwaysOnTop());
    }
    async setWindowAlwaysOnTop(windowId, alwaysOnTop, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.setAlwaysOnTop(alwaysOnTop);
    }
    async positionWindow(windowId, position, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        if (window?.win) {
            if (window.win.isFullScreen()) {
                const fullscreenLeftFuture = Event.toPromise(Event.once(Event.fromNodeEventEmitter(window.win, 'leave-full-screen')));
                window.win.setFullScreen(false);
                await fullscreenLeftFuture;
            }
            window.win.setBounds(position);
        }
    }
    async updateWindowControls(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.updateWindowControls(options);
    }
    async focusWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.focus({ mode: options?.mode ?? 0 /* FocusMode.Transfer */ });
    }
    async setMinimumSize(windowId, width, height) {
        const window = this.codeWindowById(windowId);
        if (window?.win) {
            const [windowWidth, windowHeight] = window.win.getSize();
            const [minWindowWidth, minWindowHeight] = window.win.getMinimumSize();
            const [newMinWindowWidth, newMinWindowHeight] = [width ?? minWindowWidth, height ?? minWindowHeight];
            const [newWindowWidth, newWindowHeight] = [Math.max(windowWidth, newMinWindowWidth), Math.max(windowHeight, newMinWindowHeight)];
            if (minWindowWidth !== newMinWindowWidth || minWindowHeight !== newMinWindowHeight) {
                window.win.setMinimumSize(newMinWindowWidth, newMinWindowHeight);
            }
            if (windowWidth !== newWindowWidth || windowHeight !== newWindowHeight) {
                window.win.setSize(newWindowWidth, newWindowHeight);
            }
        }
    }
    async saveWindowSplash(windowId, splash) {
        const window = this.codeWindowById(windowId);
        this.themeMainService.saveWindowSplash(windowId, window?.openedWorkspace, splash);
    }
    async setBackgroundThrottling(windowId, allowed) {
        const window = this.codeWindowById(windowId);
        this.logService.trace(`Setting background throttling for window ${windowId} to '${allowed}'`);
        window?.win?.webContents?.setBackgroundThrottling(allowed);
    }
    //#endregion
    //#region macOS Shell Command
    async installShellCommand(windowId) {
        const { source, target } = await this.getShellCommandLink();
        // Only install unless already existing
        try {
            const { symbolicLink } = await SymlinkSupport.stat(source);
            if (symbolicLink && !symbolicLink.dangling) {
                const linkTargetRealPath = await Promises.realpath(source);
                if (target === linkTargetRealPath) {
                    return;
                }
            }
            // Different source, delete it first
            await fs.promises.unlink(source);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error; // throw on any error but file not found
            }
        }
        try {
            await fs.promises.symlink(target, source);
        }
        catch (error) {
            if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
                throw error;
            }
            const { response } = await this.showMessageBox(windowId, {
                type: 'info',
                message: localize('warnEscalation', "{0} will now prompt with 'osascript' for Administrator privileges to install the shell command.", this.productService.nameShort),
                buttons: [
                    localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    localize('cancel', "Cancel")
                ]
            });
            if (response === 1 /* Cancel */) {
                throw new CancellationError();
            }
            try {
                const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
                await promisify(exec)(command);
            }
            catch (error) {
                throw new Error(localize('cantCreateBinFolder', "Unable to install the shell command '{0}'.", source));
            }
        }
    }
    async uninstallShellCommand(windowId) {
        const { source } = await this.getShellCommandLink();
        try {
            await fs.promises.unlink(source);
        }
        catch (error) {
            switch (error.code) {
                case 'EACCES': {
                    const { response } = await this.showMessageBox(windowId, {
                        type: 'info',
                        message: localize('warnEscalationUninstall', "{0} will now prompt with 'osascript' for Administrator privileges to uninstall the shell command.", this.productService.nameShort),
                        buttons: [
                            localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                            localize('cancel', "Cancel")
                        ]
                    });
                    if (response === 1 /* Cancel */) {
                        throw new CancellationError();
                    }
                    try {
                        const command = `osascript -e "do shell script \\"rm \'${source}\'\\" with administrator privileges"`;
                        await promisify(exec)(command);
                    }
                    catch (error) {
                        throw new Error(localize('cantUninstall', "Unable to uninstall the shell command '{0}'.", source));
                    }
                    break;
                }
                case 'ENOENT':
                    break; // ignore file not found
                default:
                    throw error;
            }
        }
    }
    async getShellCommandLink() {
        const target = resolve(this.environmentMainService.appRoot, 'bin', 'code');
        const source = `/usr/local/bin/${this.productService.applicationName}`;
        // Ensure source exists
        const sourceExists = await Promises.exists(target);
        if (!sourceExists) {
            throw new Error(localize('sourceMissing', "Unable to find shell script in '{0}'", target));
        }
        return { source, target };
    }
    //#endregion
    //#region Dialog
    async showMessageBox(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showMessageBox(options, window?.win ?? undefined);
    }
    async showSaveDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showSaveDialog(options, window?.win ?? undefined);
    }
    async showOpenDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showOpenDialog(options, window?.win ?? undefined);
    }
    async pickFileFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFileFolder(options);
        if (paths) {
            await this.doOpenPicked(await Promise.all(paths.map(async (path) => (await SymlinkSupport.existsDirectory(path)) ? { folderUri: URI.file(path) } : { fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFolder(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ folderUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFileAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFile(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickWorkspaceAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickWorkspace(options);
        if (paths) {
            await this.doOpenPicked(paths.map(path => ({ workspaceUri: URI.file(path) })), options, windowId);
        }
    }
    async doOpenPicked(openable, options, windowId) {
        await this.windowsMainService.open({
            context: 3 /* OpenContext.DIALOG */,
            contextWindowId: windowId,
            cli: this.environmentMainService.args,
            urisToOpen: openable,
            forceNewWindow: options.forceNewWindow,
            /* remoteAuthority will be determined based on openable */
        });
    }
    //#endregion
    //#region OS
    async showItemInFolder(windowId, path) {
        shell.showItemInFolder(path);
    }
    async setRepresentedFilename(windowId, path, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setRepresentedFilename(path);
    }
    async setDocumentEdited(windowId, edited, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setDocumentEdited(edited);
    }
    async openExternal(windowId, url, defaultApplication) {
        this.environmentMainService.unsetSnapExportedVariables();
        try {
            if (matchesSomeScheme(url, Schemas.http, Schemas.https)) {
                this.openExternalBrowser(windowId, url, defaultApplication);
            }
            else {
                this.doOpenShellExternal(windowId, url);
            }
        }
        finally {
            this.environmentMainService.restoreSnapExportedVariables();
        }
        return true;
    }
    async openExternalBrowser(windowId, url, defaultApplication) {
        const configuredBrowser = defaultApplication ?? this.configurationService.getValue('workbench.externalBrowser');
        if (!configuredBrowser) {
            return this.doOpenShellExternal(windowId, url);
        }
        if (configuredBrowser.includes(posix.sep) || configuredBrowser.includes(win32.sep)) {
            const browserPathExists = await Promises.exists(configuredBrowser);
            if (!browserPathExists) {
                this.logService.error(`Configured external browser path does not exist: ${configuredBrowser}`);
                return this.doOpenShellExternal(windowId, url);
            }
        }
        try {
            const { default: open, apps } = await import('open');
            const res = await open(url, {
                app: {
                    // Use `open.apps` helper to allow cross-platform browser
                    // aliases to be looked up properly. Fallback to the
                    // configured value if not found.
                    name: Object.hasOwn(apps, configuredBrowser) ? apps[configuredBrowser] : configuredBrowser
                }
            });
            if (!isWindows) {
                // On Linux/macOS, listen to stderr and treat that as failure
                // for opening the browser to fallback to the default.
                // On Windows, unfortunately PowerShell seems to always write
                // to stderr so we cannot use it there
                // (see also https://github.com/microsoft/vscode/issues/230636)
                res.stderr?.once('data', (data) => {
                    this.logService.error(`Error openening external URL '${url}' using browser '${configuredBrowser}': ${data.toString()}`);
                    return this.doOpenShellExternal(windowId, url);
                });
            }
        }
        catch (error) {
            this.logService.error(`Unable to open external URL '${url}' using browser '${configuredBrowser}' due to ${error}.`);
            return this.doOpenShellExternal(windowId, url);
        }
    }
    async doOpenShellExternal(windowId, url) {
        try {
            await shell.openExternal(url);
        }
        catch (error) {
            let isLink;
            let message;
            if (matchesSomeScheme(url, Schemas.http, Schemas.https)) {
                isLink = true;
                message = localize('openExternalErrorLinkMessage', "An error occurred opening a link in your default browser.");
            }
            else {
                isLink = false;
                message = localize('openExternalProgramErrorMessage', "An error occurred opening an external program.");
            }
            const { response } = await this.dialogMainService.showMessageBox({
                type: 'error',
                message,
                detail: error.message,
                buttons: isLink ? [
                    localize({ key: 'copyLink', comment: ['&& denotes a mnemonic'] }, "&&Copy Link"),
                    localize('cancel', "Cancel")
                ] : [
                    localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK")
                ]
            }, this.windowById(windowId)?.win ?? undefined);
            if (response === 1 /* Cancel */) {
                return;
            }
            this.writeClipboardText(windowId, url);
        }
    }
    moveItemToTrash(windowId, fullPath) {
        return shell.trashItem(fullPath);
    }
    async isAdmin() {
        let isAdmin;
        if (isWindows) {
            isAdmin = (await import('native-is-elevated')).default();
        }
        else {
            isAdmin = process.getuid?.() === 0;
        }
        return isAdmin;
    }
    async writeElevated(windowId, source, target, options) {
        const sudoPrompt = await import('@vscode/sudo-prompt');
        const argsFile = randomPath(this.environmentMainService.userDataPath, 'code-elevated');
        await Promises.writeFile(argsFile, JSON.stringify({ source: source.fsPath, target: target.fsPath }));
        try {
            await new Promise((resolve, reject) => {
                const sudoCommand = [`"${this.cliPath}"`];
                if (options?.unlock) {
                    sudoCommand.push('--file-chmod');
                }
                sudoCommand.push('--file-write', `"${argsFile}"`);
                const promptOptions = {
                    name: this.productService.nameLong.replace('-', ''),
                    icns: (isMacintosh && this.environmentMainService.isBuilt) ? join(dirname(this.environmentMainService.appRoot), `${this.productService.nameShort}.icns`) : undefined
                };
                this.logService.trace(`[sudo-prompt] running command: ${sudoCommand.join(' ')}`);
                sudoPrompt.exec(sudoCommand.join(' '), promptOptions, (error, stdout, stderr) => {
                    if (stdout) {
                        this.logService.trace(`[sudo-prompt] received stdout: ${stdout}`);
                    }
                    if (stderr) {
                        this.logService.error(`[sudo-prompt] received stderr: ${stderr}`);
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
        }
        finally {
            await fs.promises.unlink(argsFile);
        }
    }
    async isRunningUnderARM64Translation() {
        if (isLinux || isWindows) {
            return false;
        }
        return app.runningUnderARM64Translation;
    }
    get cliPath() {
        // Windows
        if (isWindows) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}.cmd`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.bat');
        }
        // Linux
        if (isLinux) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
        }
        // macOS
        if (this.environmentMainService.isBuilt) {
            return join(this.environmentMainService.appRoot, 'bin', 'code');
        }
        return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
    }
    async getOSStatistics() {
        return {
            totalmem: totalmem(),
            freemem: freemem(),
            loadavg: loadavg()
        };
    }
    async getOSProperties() {
        return {
            arch: arch(),
            platform: platform(),
            release: release(),
            type: type(),
            cpus: cpus()
        };
    }
    async getOSVirtualMachineHint() {
        return virtualMachineHint.value();
    }
    async getOSColorScheme() {
        return this.themeMainService.getColorScheme();
    }
    // WSL
    async hasWSLFeatureInstalled() {
        return isWindows && hasWSLFeatureInstalled();
    }
    //#endregion
    //#region Screenshots
    async getScreenshot(windowId, rect, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        const captured = await window?.win?.webContents.capturePage(rect);
        const buf = captured?.toJPEG(95);
        return buf && VSBuffer.wrap(buf);
    }
    //#endregion
    //#region Process
    async getProcessId(windowId) {
        const window = this.windowById(undefined, windowId);
        return window?.win?.webContents.getOSProcessId();
    }
    async killProcess(windowId, pid, code) {
        process.kill(pid, code);
    }
    //#endregion
    //#region Clipboard
    async readClipboardText(windowId, type) {
        return clipboard.readText(type);
    }
    async triggerPaste(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.webContents.paste() ?? Promise.resolve();
    }
    async readImage() {
        return clipboard.readImage().toPNG();
    }
    async writeClipboardText(windowId, text, type) {
        return clipboard.writeText(text, type);
    }
    async readClipboardFindText(windowId) {
        return clipboard.readFindText();
    }
    async writeClipboardFindText(windowId, text) {
        return clipboard.writeFindText(text);
    }
    async writeClipboardBuffer(windowId, format, buffer, type) {
        return clipboard.writeBuffer(format, Buffer.from(buffer.buffer), type);
    }
    async readClipboardBuffer(windowId, format) {
        return VSBuffer.wrap(clipboard.readBuffer(format));
    }
    async hasClipboard(windowId, format, type) {
        return clipboard.has(format, type);
    }
    //#endregion
    //#region macOS Touchbar
    async newWindowTab() {
        await this.windowsMainService.open({
            context: 5 /* OpenContext.API */,
            cli: this.environmentMainService.args,
            forceNewTabbedWindow: true,
            forceEmpty: true,
            remoteAuthority: this.environmentMainService.args.remote || undefined
        });
    }
    async showPreviousWindowTab() {
        Menu.sendActionToFirstResponder('selectPreviousTab:');
    }
    async showNextWindowTab() {
        Menu.sendActionToFirstResponder('selectNextTab:');
    }
    async moveWindowTabToNewWindow() {
        Menu.sendActionToFirstResponder('moveTabToNewWindow:');
    }
    async mergeAllWindowTabs() {
        Menu.sendActionToFirstResponder('mergeAllWindows:');
    }
    async toggleWindowTabsBar() {
        Menu.sendActionToFirstResponder('toggleTabBar:');
    }
    async updateTouchBar(windowId, items) {
        const window = this.codeWindowById(windowId);
        window?.updateTouchBar(items);
    }
    //#endregion
    //#region Lifecycle
    async notifyReady(windowId) {
        const window = this.codeWindowById(windowId);
        window?.setReady();
    }
    async relaunch(windowId, options) {
        return this.lifecycleMainService.relaunch(options);
    }
    async reload(windowId, options) {
        const window = this.codeWindowById(windowId);
        if (window) {
            // Special case: support `transient` workspaces by preventing
            // the reload and rather go back to an empty window. Transient
            // workspaces should never restore, even when the user wants
            // to reload.
            // For: https://github.com/microsoft/vscode/issues/119695
            if (isWorkspaceIdentifier(window.openedWorkspace)) {
                const configPath = window.openedWorkspace.configPath;
                if (configPath.scheme === Schemas.file) {
                    const workspace = await this.workspacesManagementMainService.resolveLocalWorkspace(configPath);
                    if (workspace?.transient) {
                        return this.openWindow(window.id, { forceReuseWindow: true });
                    }
                }
            }
            // Proceed normally to reload the window
            return this.lifecycleMainService.reload(window, options?.disableExtensions !== undefined ? { _: [], 'disable-extensions': options.disableExtensions } : undefined);
        }
    }
    async closeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.close();
    }
    async quit(windowId) {
        // If the user selected to exit from an extension development host window, do not quit, but just
        // close the window unless this is the last window that is opened.
        const window = this.windowsMainService.getLastActiveWindow();
        if (window?.isExtensionDevelopmentHost && this.windowsMainService.getWindowCount() > 1 && window.win) {
            window.win.close();
        }
        // Otherwise: normal quit
        else {
            this.lifecycleMainService.quit();
        }
    }
    async exit(windowId, code) {
        await this.lifecycleMainService.kill(code);
    }
    //#endregion
    //#region Connectivity
    async resolveProxy(windowId, url) {
        const window = this.codeWindowById(windowId);
        const session = window?.win?.webContents?.session;
        return session?.resolveProxy(url);
    }
    async lookupAuthorization(_windowId, authInfo) {
        return this.proxyAuthService.lookupAuthorization(authInfo);
    }
    async lookupKerberosAuthorization(_windowId, url) {
        return this.requestService.lookupKerberosAuthorization(url);
    }
    async loadCertificates(_windowId) {
        return this.requestService.loadCertificates();
    }
    isPortFree(windowId, port) {
        return isPortFree(port, 1_000);
    }
    findFreePort(windowId, startPort, giveUpAfter, timeout, stride = 1) {
        return findFreePort(startPort, giveUpAfter, timeout, stride);
    }
    async openDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.openDevTools(options?.mode ? { mode: options.mode, activate: options.activate } : undefined);
    }
    async toggleDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.toggleDevTools();
    }
    async openGPUInfoWindow(windowId) {
        const parentWindow = this.codeWindowById(windowId);
        if (!parentWindow) {
            return;
        }
        if (typeof this.gpuInfoWindowId !== 'number') {
            const options = this.instantiationService.invokeFunction(defaultBrowserWindowOptions, defaultWindowState(), { forceNativeTitlebar: true });
            options.backgroundColor = undefined;
            const gpuInfoWindow = new BrowserWindow(options);
            gpuInfoWindow.setMenuBarVisibility(false);
            gpuInfoWindow.loadURL('chrome://gpu');
            gpuInfoWindow.once('ready-to-show', () => gpuInfoWindow.show());
            gpuInfoWindow.once('close', () => this.gpuInfoWindowId = undefined);
            parentWindow.win?.on('close', () => {
                if (this.gpuInfoWindowId) {
                    BrowserWindow.fromId(this.gpuInfoWindowId)?.close();
                    this.gpuInfoWindowId = undefined;
                }
            });
            this.gpuInfoWindowId = gpuInfoWindow.id;
        }
        if (typeof this.gpuInfoWindowId === 'number') {
            const window = BrowserWindow.fromId(this.gpuInfoWindowId);
            if (window?.isMinimized()) {
                window?.restore();
            }
            window?.focus();
        }
    }
    async stopTracing(windowId) {
        if (!this.environmentMainService.args.trace) {
            return; // requires tracing to be on
        }
        const path = await contentTracing.stopRecording(`${randomPath(this.environmentMainService.userHome.fsPath, this.productService.applicationName)}.trace.txt`);
        // Inform user to report an issue
        await this.dialogMainService.showMessageBox({
            type: 'info',
            message: localize('trace.message', "Successfully created the trace file"),
            detail: localize('trace.detail', "Please create an issue and manually attach the following file:\n{0}", path),
            buttons: [localize({ key: 'trace.ok', comment: ['&& denotes a mnemonic'] }, "&&OK")],
        }, BrowserWindow.getFocusedWindow() ?? undefined);
        // Show item in explorer
        this.showItemInFolder(undefined, path);
    }
    //#endregion
    // #region Performance
    async profileRenderer(windowId, session, duration) {
        const window = this.codeWindowById(windowId);
        if (!window || !window.win) {
            throw new Error();
        }
        const profiler = new WindowProfiler(window.win, session, this.logService);
        const result = await profiler.inspect(duration);
        return result;
    }
    // #endregion
    //#region Registry (windows)
    async windowsGetStringRegKey(windowId, hive, path, name) {
        if (!isWindows) {
            return undefined;
        }
        const Registry = await import('@vscode/windows-registry');
        try {
            return Registry.GetStringRegKey(hive, path, name);
        }
        catch {
            return undefined;
        }
    }
    //#endregion
    windowById(windowId, fallbackCodeWindowId) {
        return this.codeWindowById(windowId) ?? this.auxiliaryWindowById(windowId) ?? this.codeWindowById(fallbackCodeWindowId);
    }
    codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
__decorate([
    memoize
], NativeHostMainService.prototype, "cliPath", null);
NativeHostMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IAuxiliaryWindowsMainService),
    __param(2, IDialogMainService),
    __param(3, ILifecycleMainService),
    __param(4, IEnvironmentMainService),
    __param(5, ILogService),
    __param(6, IProductService),
    __param(7, IThemeMainService),
    __param(8, IWorkspacesManagementMainService),
    __param(9, IConfigurationService),
    __param(10, IRequestService),
    __param(11, IProxyAuthService),
    __param(12, IInstantiationService)
], NativeHostMainService);
export { NativeHostMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdE1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9uYXRpdmUvZWxlY3Ryb24tbWFpbi9uYXRpdmVIb3N0TWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFXLElBQUksRUFBMkcsWUFBWSxFQUE0QyxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNyUixPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLFdB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