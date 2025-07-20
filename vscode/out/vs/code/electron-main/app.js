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
var CodeApplication_1;
import { app, protocol, session, systemPreferences } from 'electron';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { validatedIpcMain } from '../../base/parts/ipc/electron-main/ipcMain.js';
import { hostname, release } from 'os';
import { VSBuffer } from '../../base/common/buffer.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { Event } from '../../base/common/event.js';
import { parse } from '../../base/common/jsonc.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { Schemas, VSCODE_AUTHORITY } from '../../base/common/network.js';
import { join, posix } from '../../base/common/path.js';
import { isLinux, isLinuxSnap, isMacintosh, isWindows, OS } from '../../base/common/platform.js';
import { assertType } from '../../base/common/types.js';
import { URI } from '../../base/common/uri.js';
import { generateUuid } from '../../base/common/uuid.js';
import { registerContextMenuListener } from '../../base/parts/contextmenu/electron-main/contextmenu.js';
import { getDelayedChannel, ProxyChannel, StaticRouter } from '../../base/parts/ipc/common/ipc.js';
import { Server as ElectronIPCServer } from '../../base/parts/ipc/electron-main/ipc.electron.js';
import { Client as MessagePortClient } from '../../base/parts/ipc/electron-main/ipc.mp.js';
import { IProxyAuthService, ProxyAuthService } from '../../platform/native/electron-main/auth.js';
import { localize } from '../../nls.js';
import { IBackupMainService } from '../../platform/backup/electron-main/backup.js';
import { BackupMainService } from '../../platform/backup/electron-main/backupMainService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ElectronExtensionHostDebugBroadcastChannel } from '../../platform/debug/electron-main/extensionHostDebugIpc.js';
import { IDiagnosticsService } from '../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsMainService, IDiagnosticsMainService } from '../../platform/diagnostics/electron-main/diagnosticsMainService.js';
import { DialogMainService, IDialogMainService } from '../../platform/dialogs/electron-main/dialogMainService.js';
import { IEncryptionMainService } from '../../platform/encryption/common/encryptionService.js';
import { EncryptionMainService } from '../../platform/encryption/electron-main/encryptionMainService.js';
import { NativeBrowserElementsMainService, INativeBrowserElementsMainService } from '../../platform/browserElements/electron-main/nativeBrowserElementsMainService.js';
import { IEnvironmentMainService } from '../../platform/environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../platform/environment/node/argvHelper.js';
import { getResolvedShellEnv } from '../../platform/shell/node/shellEnv.js';
import { IExtensionHostStarter, ipcExtensionHostStarterChannelName } from '../../platform/extensions/common/extensionHostStarter.js';
import { ExtensionHostStarter } from '../../platform/extensions/electron-main/extensionHostStarter.js';
import { IExternalTerminalMainService } from '../../platform/externalTerminal/electron-main/externalTerminal.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService } from '../../platform/externalTerminal/node/externalTerminalService.js';
import { LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../platform/files/common/diskFileSystemProviderClient.js';
import { IFileService } from '../../platform/files/common/files.js';
import { DiskFileSystemProviderChannel } from '../../platform/files/electron-main/diskFileSystemProviderServer.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ProcessMainService } from '../../platform/process/electron-main/processMainService.js';
import { IKeyboardLayoutMainService, KeyboardLayoutMainService } from '../../platform/keyboardLayout/electron-main/keyboardLayoutMainService.js';
import { ILaunchMainService, LaunchMainService } from '../../platform/launch/electron-main/launchMainService.js';
import { ILifecycleMainService } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { ILoggerService, ILogService } from '../../platform/log/common/log.js';
import { IMenubarMainService, MenubarMainService } from '../../platform/menubar/electron-main/menubarMainService.js';
import { INativeHostMainService, NativeHostMainService } from '../../platform/native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { getRemoteAuthority } from '../../platform/remote/common/remoteHosts.js';
import { SharedProcess } from '../../platform/sharedProcess/electron-main/sharedProcess.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { IStateService } from '../../platform/state/node/state.js';
import { StorageDatabaseChannel } from '../../platform/storage/electron-main/storageIpc.js';
import { ApplicationStorageMainService, IApplicationStorageMainService, IStorageMainService, StorageMainService } from '../../platform/storage/electron-main/storageMainService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderClient } from '../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryService } from '../../platform/telemetry/common/telemetryService.js';
import { getPiiPathsFromEnvironment, getTelemetryLevel, isInternalTelemetry, NullTelemetryService, supportsTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import { IUpdateService } from '../../platform/update/common/update.js';
import { UpdateChannel } from '../../platform/update/common/updateIpc.js';
import { DarwinUpdateService } from '../../platform/update/electron-main/updateService.darwin.js';
import { LinuxUpdateService } from '../../platform/update/electron-main/updateService.linux.js';
import { SnapUpdateService } from '../../platform/update/electron-main/updateService.snap.js';
import { Win32UpdateService } from '../../platform/update/electron-main/updateService.win32.js';
import { IURLService } from '../../platform/url/common/url.js';
import { URLHandlerChannelClient, URLHandlerRouter } from '../../platform/url/common/urlIpc.js';
import { NativeURLService } from '../../platform/url/common/urlService.js';
import { ElectronURLListener } from '../../platform/url/electron-main/electronUrlListener.js';
import { IWebviewManagerService } from '../../platform/webview/common/webviewManagerService.js';
import { WebviewMainService } from '../../platform/webview/electron-main/webviewMainService.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../platform/window/common/window.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService } from '../../platform/windows/electron-main/windows.js';
import { WindowsMainService } from '../../platform/windows/electron-main/windowsMainService.js';
import { ActiveWindowManager } from '../../platform/windows/node/windowTracker.js';
import { hasWorkspaceFileExtension } from '../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../platform/workspaces/common/workspaces.js';
import { IWorkspacesHistoryMainService, WorkspacesHistoryMainService } from '../../platform/workspaces/electron-main/workspacesHistoryMainService.js';
import { WorkspacesMainService } from '../../platform/workspaces/electron-main/workspacesMainService.js';
import { IWorkspacesManagementMainService, WorkspacesManagementMainService } from '../../platform/workspaces/electron-main/workspacesManagementMainService.js';
import { IPolicyService } from '../../platform/policy/common/policy.js';
import { PolicyChannel } from '../../platform/policy/common/policyIpc.js';
import { IUserDataProfilesMainService } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { UserDataProfilesHandler } from '../../platform/userDataProfile/electron-main/userDataProfilesHandler.js';
import { ProfileStorageChangesListenerChannel } from '../../platform/userDataProfile/electron-main/userDataProfileStorageIpc.js';
import { Promises, RunOnceScheduler, runWhenGlobalIdle } from '../../base/common/async.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId, validatedevDeviceId } from '../../platform/telemetry/electron-main/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LoggerChannel } from '../../platform/log/electron-main/logIpc.js';
import { ILoggerMainService } from '../../platform/log/electron-main/loggerService.js';
import { IUtilityProcessWorkerMainService, UtilityProcessWorkerMainService } from '../../platform/utilityProcess/electron-main/utilityProcessWorkerMainService.js';
import { ipcUtilityProcessWorkerChannelName } from '../../platform/utilityProcess/common/utilityProcessWorkerService.js';
import { ILocalPtyService, TerminalIpcChannels } from '../../platform/terminal/common/terminal.js';
import { ElectronPtyHostStarter } from '../../platform/terminal/electron-main/electronPtyHostStarter.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, NodeRemoteResourceRouter } from '../../platform/remote/common/electronRemoteResources.js';
import { Lazy } from '../../base/common/lazy.js';
import { IAuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { AuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindowsMainService.js';
import { normalizeNFC } from '../../base/common/normalization.js';
import { ICSSDevelopmentService, CSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IWebContentExtractorService } from '../../platform/webContentExtractor/common/webContentExtractor.js';
import { NativeWebContentExtractorService } from '../../platform/webContentExtractor/electron-main/webContentExtractorService.js';
import ErrorTelemetry from '../../platform/telemetry/electron-main/errorTelemetry.js';
/**
 * The main VS Code application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
let CodeApplication = class CodeApplication extends Disposable {
    static { CodeApplication_1 = this; }
    static { this.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY = {
        [Schemas.file]: 'security.promptForLocalFileProtocolHandling',
        [Schemas.vscodeRemote]: 'security.promptForRemoteFileProtocolHandling'
    }; }
    constructor(mainProcessNodeIpcServer, userEnv, mainInstantiationService, logService, loggerService, environmentMainService, lifecycleMainService, configurationService, stateService, fileService, productService, userDataProfilesMainService) {
        super();
        this.mainProcessNodeIpcServer = mainProcessNodeIpcServer;
        this.userEnv = userEnv;
        this.mainInstantiationService = mainInstantiationService;
        this.logService = logService;
        this.loggerService = loggerService;
        this.environmentMainService = environmentMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.fileService = fileService;
        this.productService = productService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.configureSession();
        this.registerListeners();
    }
    configureSession() {
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        const isUrlFromWindow = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}`);
        const isUrlFromWebview = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeWebview}://`);
        const alwaysAllowedPermissions = new Set(['pointerLock', 'notifications']);
        const allowedPermissionsInWebview = new Set([
            ...alwaysAllowedPermissions,
            'clipboard-read',
            'clipboard-sanitized-write',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        const allowedPermissionsInCore = new Set([
            ...alwaysAllowedPermissions,
            'media',
            'local-fonts',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return callback(allowedPermissionsInWebview.has(permission));
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return callback(allowedPermissionsInCore.has(permission));
            }
            return callback(false);
        });
        session.defaultSession.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return allowedPermissionsInWebview.has(permission);
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return allowedPermissionsInCore.has(permission);
            }
            return false;
        });
        //#endregion
        //#region Request filtering
        // Block all SVG requests from unsupported origins
        const supportedSvgSchemes = new Set([Schemas.file, Schemas.vscodeFileResource, Schemas.vscodeRemoteResource, Schemas.vscodeManagedRemoteResource, 'devtools']);
        // But allow them if they are made from inside an webview
        const isSafeFrame = (requestFrame) => {
            for (let frame = requestFrame; frame; frame = frame.parent) {
                if (frame.url.startsWith(`${Schemas.vscodeWebview}://`)) {
                    return true;
                }
            }
            return false;
        };
        const isSvgRequestFromSafeContext = (details) => {
            return details.resourceType === 'xhr' || isSafeFrame(details.frame);
        };
        const isAllowedVsCodeFileRequest = (details) => {
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main windows (or shared process) and not from embedded content
            const windows = getAllWindowsExcludingOffscreen();
            for (const window of windows) {
                if (frame.processId === window.webContents.mainFrame.processId) {
                    return true;
                }
            }
            return false;
        };
        const isAllowedWebviewRequest = (uri, details) => {
            if (uri.path !== '/index.html') {
                return true; // Only restrict top level page of webviews: index.html
            }
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main editor windows.
            for (const window of this.windowsMainService.getWindows()) {
                if (window.win) {
                    if (frame.processId === window.win.webContents.mainFrame.processId) {
                        return true;
                    }
                }
            }
            return false;
        };
        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            const uri = URI.parse(details.url);
            if (uri.scheme === Schemas.vscodeWebview) {
                if (!isAllowedWebviewRequest(uri, details)) {
                    this.logService.error('Blocked vscode-webview request', details.url);
                    return callback({ cancel: true });
                }
            }
            if (uri.scheme === Schemas.vscodeFileResource) {
                if (!isAllowedVsCodeFileRequest(details)) {
                    this.logService.error('Blocked vscode-file request', details.url);
                    return callback({ cancel: true });
                }
            }
            // Block most svgs
            if (uri.path.endsWith('.svg')) {
                const isSafeResourceUrl = supportedSvgSchemes.has(uri.scheme);
                if (!isSafeResourceUrl) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        // Configure SVG header content type properly
        // https://github.com/microsoft/vscode/issues/97564
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = details.responseHeaders;
            const contentTypes = (responseHeaders['content-type'] || responseHeaders['Content-Type']);
            if (contentTypes && Array.isArray(contentTypes)) {
                const uri = URI.parse(details.url);
                if (uri.path.endsWith('.svg')) {
                    if (supportedSvgSchemes.has(uri.scheme)) {
                        responseHeaders['Content-Type'] = ['image/svg+xml'];
                        return callback({ cancel: false, responseHeaders });
                    }
                }
                // remote extension schemes have the following format
                // http://127.0.0.1:<port>/vscode-remote-resource?path=
                if (!uri.path.endsWith(Schemas.vscodeRemoteResource) && contentTypes.some(contentType => contentType.toLowerCase().includes('image/svg'))) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        //#endregion
        //#region Allow CORS for the PRSS CDN
        // https://github.com/microsoft/vscode-remote-release/issues/9246
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            if (details.url.startsWith('https://vscode.download.prss.microsoft.com/')) {
                const responseHeaders = details.responseHeaders ?? Object.create(null);
                if (responseHeaders['Access-Control-Allow-Origin'] === undefined) {
                    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
                    return callback({ cancel: false, responseHeaders });
                }
            }
            return callback({ cancel: false });
        });
        const defaultSession = session.defaultSession;
        if (typeof defaultSession.setCodeCachePath === 'function' && this.environmentMainService.codeCachePath) {
            // Make sure to partition Chrome's code cache folder
            // in the same way as our code cache path to help
            // invalidate caches that we know are invalid
            // (https://github.com/microsoft/vscode/issues/120655)
            defaultSession.setCodeCachePath(join(this.environmentMainService.codeCachePath, 'chrome'));
        }
        //#endregion
        //#region UNC Host Allowlist (Windows)
        if (isWindows) {
            if (this.configurationService.getValue('security.restrictUNCAccess') === false) {
                disableUNCAccessRestrictions();
            }
            else {
                addUNCHostToAllowlist(this.configurationService.getValue('security.allowedUNCHosts'));
            }
        }
        //#endregion
    }
    registerListeners() {
        // Dispose on shutdown
        Event.once(this.lifecycleMainService.onWillShutdown)(() => this.dispose());
        // Contextmenu via IPC support
        registerContextMenuListener();
        // Accessibility change event
        app.on('accessibility-support-changed', (event, accessibilitySupportEnabled) => {
            this.windowsMainService?.sendToAll('vscode:accessibilitySupportChanged', accessibilitySupportEnabled);
        });
        // macOS dock activate
        app.on('activate', async (event, hasVisibleWindows) => {
            this.logService.trace('app#activate');
            // Mac only event: open new window when we get activated
            if (!hasVisibleWindows) {
                await this.windowsMainService?.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ });
            }
        });
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        app.on('web-contents-created', (event, contents) => {
            // Auxiliary Window: delegate to `AuxiliaryWindow` class
            if (contents?.opener?.url.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}/`)) {
                this.logService.trace('[aux window]  app.on("web-contents-created"): Registering auxiliary window');
                this.auxiliaryWindowsMainService?.registerWindow(contents);
            }
            // Block any in-page navigation
            contents.on('will-navigate', event => {
                this.logService.error('webContents#will-navigate: Prevented webcontent navigation');
                event.preventDefault();
            });
            // All Windows: only allow about:blank auxiliary windows to open
            // For all other URLs, delegate to the OS.
            contents.setWindowOpenHandler(details => {
                // about:blank windows can open as window witho our default options
                if (details.url === 'about:blank') {
                    this.logService.trace('[aux window] webContents#setWindowOpenHandler: Allowing auxiliary window to open on about:blank');
                    return {
                        action: 'allow',
                        overrideBrowserWindowOptions: this.auxiliaryWindowsMainService?.createWindow(details)
                    };
                }
                // Any other URL: delegate to OS
                else {
                    this.logService.trace(`webContents#setWindowOpenHandler: Prevented opening window with URL ${details.url}}`);
                    this.nativeHostMainService?.openExternal(undefined, details.url);
                    return { action: 'deny' };
                }
            });
        });
        //#endregion
        let macOpenFileURIs = [];
        let runningTimeout = undefined;
        app.on('open-file', (event, path) => {
            path = normalizeNFC(path); // macOS only: normalize paths to NFC form
            this.logService.trace('app#open-file: ', path);
            event.preventDefault();
            // Keep in array because more might come!
            macOpenFileURIs.push(hasWorkspaceFileExtension(path) ? { workspaceUri: URI.file(path) } : { fileUri: URI.file(path) });
            // Clear previous handler if any
            if (runningTimeout !== undefined) {
                clearTimeout(runningTimeout);
                runningTimeout = undefined;
            }
            // Handle paths delayed in case more are coming!
            runningTimeout = setTimeout(async () => {
                await this.windowsMainService?.open({
                    context: 1 /* OpenContext.DOCK */ /* can also be opening from finder while app is running */,
                    cli: this.environmentMainService.args,
                    urisToOpen: macOpenFileURIs,
                    gotoLineMode: false,
                    preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in a new window */
                });
                macOpenFileURIs = [];
                runningTimeout = undefined;
            }, 100);
        });
        app.on('new-window-for-tab', async () => {
            await this.windowsMainService?.openEmptyWindow({ context: 4 /* OpenContext.DESKTOP */ }); //macOS native tab "+" button
        });
        //#region Bootstrap IPC Handlers
        validatedIpcMain.handle('vscode:fetchShellEnv', event => {
            // Prefer to use the args and env from the target window
            // when resolving the shell env. It is possible that
            // a first window was opened from the UI but a second
            // from the CLI and that has implications for whether to
            // resolve the shell environment or not.
            //
            // Window can be undefined for e.g. the shared process
            // that is not part of our windows registry!
            const window = this.windowsMainService?.getWindowByWebContents(event.sender); // Note: this can be `undefined` for the shared process
            let args;
            let env;
            if (window?.config) {
                args = window.config;
                env = { ...process.env, ...window.config.userEnv };
            }
            else {
                args = this.environmentMainService.args;
                env = process.env;
            }
            // Resolve shell env
            return this.resolveShellEnvironment(args, env, false);
        });
        validatedIpcMain.on('vscode:toggleDevTools', event => event.sender.toggleDevTools());
        validatedIpcMain.on('vscode:openDevTools', event => event.sender.openDevTools());
        validatedIpcMain.on('vscode:reloadWindow', event => event.sender.reload());
        validatedIpcMain.handle('vscode:notifyZoomLevel', async (event, zoomLevel) => {
            const window = this.windowsMainService?.getWindowByWebContents(event.sender);
            if (window) {
                window.notifyZoomLevel(zoomLevel);
            }
        });
        //#endregion
    }
    async startup() {
        this.logService.debug('Starting VS Code');
        this.logService.debug(`from: ${this.environmentMainService.appRoot}`);
        this.logService.debug('args:', this.environmentMainService.args);
        // Make sure we associate the program with the app user model id
        // This will help Windows to associate the running program with
        // any shortcut that is pinned to the taskbar and prevent showing
        // two icons in the taskbar for the same app.
        const win32AppUserModelId = this.productService.win32AppUserModelId;
        if (isWindows && win32AppUserModelId) {
            app.setAppUserModelId(win32AppUserModelId);
        }
        // Fix native tabs on macOS 10.13
        // macOS enables a compatibility patch for any bundle ID beginning with
        // "com.microsoft.", which breaks native tabs for VS Code when using this
        // identifier (from the official build).
        // Explicitly opt out of the patch here before creating any windows.
        // See: https://github.com/microsoft/vscode/issues/35361#issuecomment-399794085
        try {
            if (isMacintosh && this.configurationService.getValue('window.nativeTabs') === true && !systemPreferences.getUserDefault('NSUseImprovedLayoutPass', 'boolean')) {
                systemPreferences.setUserDefault('NSUseImprovedLayoutPass', 'boolean', true);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        // Main process server (electron IPC based)
        const mainProcessElectronServer = new ElectronIPCServer();
        Event.once(this.lifecycleMainService.onWillShutdown)(e => {
            if (e.reason === 2 /* ShutdownReason.KILL */) {
                // When we go down abnormally, make sure to free up
                // any IPC we accept from other windows to reduce
                // the chance of doing work after we go down. Kill
                // is special in that it does not orderly shutdown
                // windows.
                mainProcessElectronServer.dispose();
            }
        });
        // Resolve unique machine ID
        this.logService.trace('Resolving machine identifier...');
        const [machineId, sqmId, devDeviceId] = await Promise.all([
            resolveMachineId(this.stateService, this.logService),
            resolveSqmId(this.stateService, this.logService),
            resolvedevDeviceId(this.stateService, this.logService)
        ]);
        this.logService.trace(`Resolved machine identifier: ${machineId}`);
        // Shared process
        const { sharedProcessReady, sharedProcessClient } = this.setupSharedProcess(machineId, sqmId, devDeviceId);
        // Services
        const appInstantiationService = await this.initServices(machineId, sqmId, devDeviceId, sharedProcessReady);
        // Error telemetry
        appInstantiationService.invokeFunction(accessor => this._register(new ErrorTelemetry(accessor.get(ILogService), accessor.get(ITelemetryService))));
        // Auth Handler
        appInstantiationService.invokeFunction(accessor => accessor.get(IProxyAuthService));
        // Transient profiles handler
        this._register(appInstantiationService.createInstance(UserDataProfilesHandler));
        // Init Channels
        appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));
        // Setup Protocol URL Handlers
        const initialProtocolUrls = await appInstantiationService.invokeFunction(accessor => this.setupProtocolUrlHandlers(accessor, mainProcessElectronServer));
        // Setup vscode-remote-resource protocol handler
        this.setupManagedRemoteResourceUrlHandler(mainProcessElectronServer);
        // Signal phase: ready - before opening first window
        this.lifecycleMainService.phase = 2 /* LifecycleMainPhase.Ready */;
        // Open Windows
        await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, initialProtocolUrls));
        // Signal phase: after window open
        this.lifecycleMainService.phase = 3 /* LifecycleMainPhase.AfterWindowOpen */;
        // Post Open Windows Tasks
        this.afterWindowOpen();
        // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
        const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
            this._register(runWhenGlobalIdle(() => {
                // Signal phase: eventually
                this.lifecycleMainService.phase = 4 /* LifecycleMainPhase.Eventually */;
                // Eventually Post Open Window Tasks
                this.eventuallyAfterWindowOpen();
            }, 2500));
        }, 2500));
        eventuallyPhaseScheduler.schedule();
    }
    async setupProtocolUrlHandlers(accessor, mainProcessElectronServer) {
        const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
        const urlService = accessor.get(IURLService);
        const nativeHostMainService = this.nativeHostMainService = accessor.get(INativeHostMainService);
        const dialogMainService = accessor.get(IDialogMainService);
        // Install URL handlers that deal with protocl URLs either
        // from this process by opening windows and/or by forwarding
        // the URLs into a window process to be handled there.
        const app = this;
        urlService.registerHandler({
            async handleURL(uri, options) {
                return app.handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options);
            }
        });
        const activeWindowManager = this._register(new ActiveWindowManager({
            onDidOpenMainWindow: nativeHostMainService.onDidOpenMainWindow,
            onDidFocusMainWindow: nativeHostMainService.onDidFocusMainWindow,
            getActiveWindowId: () => nativeHostMainService.getActiveWindowId(-1)
        }));
        const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
        const urlHandlerRouter = new URLHandlerRouter(activeWindowRouter, this.logService);
        const urlHandlerChannel = mainProcessElectronServer.getChannel('urlHandler', urlHandlerRouter);
        urlService.registerHandler(new URLHandlerChannelClient(urlHandlerChannel));
        const initialProtocolUrls = await this.resolveInitialProtocolUrls(windowsMainService, dialogMainService);
        this._register(new ElectronURLListener(initialProtocolUrls?.urls, urlService, windowsMainService, this.environmentMainService, this.productService, this.logService));
        return initialProtocolUrls;
    }
    setupManagedRemoteResourceUrlHandler(mainProcessElectronServer) {
        const notFound = () => ({ statusCode: 404, data: 'Not found' });
        const remoteResourceChannel = new Lazy(() => mainProcessElectronServer.getChannel(NODE_REMOTE_RESOURCE_CHANNEL_NAME, new NodeRemoteResourceRouter()));
        protocol.registerBufferProtocol(Schemas.vscodeManagedRemoteResource, (request, callback) => {
            const url = URI.parse(request.url);
            if (!url.authority.startsWith('window:')) {
                return callback(notFound());
            }
            remoteResourceChannel.value.call(NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, [url]).then(r => callback({ ...r, data: Buffer.from(r.body, 'base64') }), err => {
                this.logService.warn('error dispatching remote resource call', err);
                callback({ statusCode: 500, data: String(err) });
            });
        });
    }
    async resolveInitialProtocolUrls(windowsMainService, dialogMainService) {
        /**
         * Protocol URL handling on startup is complex, refer to
         * {@link IInitialProtocolUrls} for an explainer.
         */
        // Windows/Linux: protocol handler invokes CLI with --open-url
        const protocolUrlsFromCommandLine = this.environmentMainService.args['open-url'] ? this.environmentMainService.args._urls || [] : [];
        if (protocolUrlsFromCommandLine.length > 0) {
            this.logService.trace('app#resolveInitialProtocolUrls() protocol urls from command line:', protocolUrlsFromCommandLine);
        }
        // macOS: open-url events that were received before the app is ready
        const protocolUrlsFromEvent = (global.getOpenUrls() || []);
        if (protocolUrlsFromEvent.length > 0) {
            this.logService.trace(`app#resolveInitialProtocolUrls() protocol urls from macOS 'open-url' event:`, protocolUrlsFromEvent);
        }
        if (protocolUrlsFromCommandLine.length + protocolUrlsFromEvent.length === 0) {
            return undefined;
        }
        const protocolUrls = [
            ...protocolUrlsFromCommandLine,
            ...protocolUrlsFromEvent
        ].map(url => {
            try {
                return { uri: URI.parse(url), originalUrl: url };
            }
            catch {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url failed to parse:', url);
                return undefined;
            }
        });
        const openables = [];
        const urls = [];
        for (const protocolUrl of protocolUrls) {
            if (!protocolUrl) {
                continue; // invalid
            }
            const windowOpenable = this.getWindowOpenableFromProtocolUrl(protocolUrl.uri);
            if (windowOpenable) {
                if (await this.shouldBlockOpenable(windowOpenable, windowsMainService, dialogMainService)) {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url was blocked:', protocolUrl.uri.toString(true));
                    continue; // blocked
                }
                else {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be handled as window to open:', protocolUrl.uri.toString(true), windowOpenable);
                    openables.push(windowOpenable); // handled as window to open
                }
            }
            else {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be passed to active window for handling:', protocolUrl.uri.toString(true));
                urls.push(protocolUrl); // handled within active window
            }
        }
        return { urls, openables };
    }
    async shouldBlockOpenable(openable, windowsMainService, dialogMainService) {
        let openableUri;
        let message;
        if (isWorkspaceToOpen(openable)) {
            openableUri = openable.workspaceUri;
            message = localize('confirmOpenMessageWorkspace', "An external application wants to open '{0}' in {1}. Do you want to open this workspace file?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        else if (isFolderToOpen(openable)) {
            openableUri = openable.folderUri;
            message = localize('confirmOpenMessageFolder', "An external application wants to open '{0}' in {1}. Do you want to open this folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        else {
            openableUri = openable.fileUri;
            message = localize('confirmOpenMessageFileOrFolder', "An external application wants to open '{0}' in {1}. Do you want to open this file or folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService }) : openableUri.toString(true), this.productService.nameShort);
        }
        if (openableUri.scheme !== Schemas.file && openableUri.scheme !== Schemas.vscodeRemote) {
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            //
            // NOTE: we currently only ask for confirmation for `file` and `vscode-remote`
            // authorities here. There is an additional confirmation for `extension.id`
            // authorities from within the window.
            //
            // IF YOU ARE PLANNING ON ADDING ANOTHER AUTHORITY HERE, MAKE SURE TO ALSO
            // ADD IT TO THE CONFIRMATION CODE BELOW OR INSIDE THE WINDOW!
            //
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            return false;
        }
        const askForConfirmation = this.configurationService.getValue(CodeApplication_1.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY[openableUri.scheme]);
        if (askForConfirmation === false) {
            return false; // not blocked via settings
        }
        const { response, checkboxChecked } = await dialogMainService.showMessageBox({
            type: 'warning',
            buttons: [
                localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
                localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, "&&No")
            ],
            message,
            detail: localize('confirmOpenDetail', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"),
            checkboxLabel: openableUri.scheme === Schemas.file ? localize('doNotAskAgainLocal', "Allow opening local paths without asking") : localize('doNotAskAgainRemote', "Allow opening remote paths without asking"),
            cancelId: 1
        });
        if (response !== 0) {
            return true; // blocked by user choice
        }
        if (checkboxChecked) {
            // Due to https://github.com/microsoft/vscode/issues/195436, we can only
            // update settings from within a window. But we do not know if a window
            // is about to open or can already handle the request, so we have to send
            // to any current window and any newly opening window.
            const request = { channel: 'vscode:disablePromptForProtocolHandling', args: openableUri.scheme === Schemas.file ? 'local' : 'remote' };
            windowsMainService.sendToFocused(request.channel, request.args);
            windowsMainService.sendToOpeningWindow(request.channel, request.args);
        }
        return false; // not blocked by user choice
    }
    getWindowOpenableFromProtocolUrl(uri) {
        if (!uri.path) {
            return undefined;
        }
        // File path
        if (uri.authority === Schemas.file) {
            const fileUri = URI.file(uri.fsPath);
            if (hasWorkspaceFileExtension(fileUri)) {
                return { workspaceUri: fileUri };
            }
            return { fileUri };
        }
        // Remote path
        else if (uri.authority === Schemas.vscodeRemote) {
            // Example conversion:
            // From: vscode://vscode-remote/wsl+ubuntu/mnt/c/GitDevelopment/monaco
            //   To: vscode-remote://wsl+ubuntu/mnt/c/GitDevelopment/monaco
            const secondSlash = uri.path.indexOf(posix.sep, 1 /* skip over the leading slash */);
            let authority;
            let path;
            if (secondSlash !== -1) {
                authority = uri.path.substring(1, secondSlash);
                path = uri.path.substring(secondSlash);
            }
            else {
                authority = uri.path.substring(1);
                path = '/';
            }
            let query = uri.query;
            const params = new URLSearchParams(uri.query);
            if (params.get('windowId') === '_blank') {
                // Make sure to unset any `windowId=_blank` here
                // https://github.com/microsoft/vscode/issues/191902
                params.delete('windowId');
                query = params.toString();
            }
            const remoteUri = URI.from({ scheme: Schemas.vscodeRemote, authority, path, query, fragment: uri.fragment });
            if (hasWorkspaceFileExtension(path)) {
                return { workspaceUri: remoteUri };
            }
            if (/:[\d]+$/.test(path)) {
                // path with :line:column syntax
                return { fileUri: remoteUri };
            }
            return { folderUri: remoteUri };
        }
        return undefined;
    }
    async handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options) {
        this.logService.trace('app#handleProtocolUrl():', uri.toString(true), options);
        // Support 'workspace' URLs (https://github.com/microsoft/vscode/issues/124263)
        if (uri.scheme === this.productService.urlProtocol && uri.path === 'workspace') {
            uri = uri.with({
                authority: 'file',
                path: URI.parse(uri.query).path,
                query: ''
            });
        }
        let shouldOpenInNewWindow = false;
        // We should handle the URI in a new window if the URL contains `windowId=_blank`
        const params = new URLSearchParams(uri.query);
        if (params.get('windowId') === '_blank') {
            this.logService.trace(`app#handleProtocolUrl() found 'windowId=_blank' as parameter, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            params.delete('windowId');
            uri = uri.with({ query: params.toString() });
            shouldOpenInNewWindow = true;
        }
        // or if no window is open (macOS only)
        else if (isMacintosh && windowsMainService.getWindowCount() === 0) {
            this.logService.trace(`app#handleProtocolUrl() running on macOS with no window open, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            shouldOpenInNewWindow = true;
        }
        // Pass along whether the application is being opened via a Continue On flow
        const continueOn = params.get('continueOn');
        if (continueOn !== null) {
            this.logService.trace(`app#handleProtocolUrl() found 'continueOn' as parameter:`, uri.toString(true));
            params.delete('continueOn');
            uri = uri.with({ query: params.toString() });
            this.environmentMainService.continueOn = continueOn ?? undefined;
        }
        // Check if the protocol URL is a window openable to open...
        const windowOpenableFromProtocolUrl = this.getWindowOpenableFromProtocolUrl(uri);
        if (windowOpenableFromProtocolUrl) {
            if (await this.shouldBlockOpenable(windowOpenableFromProtocolUrl, windowsMainService, dialogMainService)) {
                this.logService.trace('app#handleProtocolUrl() protocol url was blocked:', uri.toString(true));
                return true; // If openable should be blocked, behave as if it's handled
            }
            else {
                this.logService.trace('app#handleProtocolUrl() opening protocol url as window:', windowOpenableFromProtocolUrl, uri.toString(true));
                const window = (await windowsMainService.open({
                    context: 6 /* OpenContext.LINK */,
                    cli: { ...this.environmentMainService.args },
                    urisToOpen: [windowOpenableFromProtocolUrl],
                    forceNewWindow: shouldOpenInNewWindow,
                    gotoLineMode: true
                    // remoteAuthority: will be determined based on windowOpenableFromProtocolUrl
                })).at(0);
                window?.focus(); // this should help ensuring that the right window gets focus when multiple are opened
                return true;
            }
        }
        // ...or if we should open in a new window and then handle it within that window
        if (shouldOpenInNewWindow) {
            this.logService.trace('app#handleProtocolUrl() opening empty window and passing in protocol url:', uri.toString(true));
            const window = (await windowsMainService.open({
                context: 6 /* OpenContext.LINK */,
                cli: { ...this.environmentMainService.args },
                forceNewWindow: true,
                forceEmpty: true,
                gotoLineMode: true,
                remoteAuthority: getRemoteAuthority(uri)
            })).at(0);
            await window?.ready();
            return urlService.open(uri, options);
        }
        this.logService.trace('app#handleProtocolUrl(): not handled', uri.toString(true), options);
        return false;
    }
    setupSharedProcess(machineId, sqmId, devDeviceId) {
        const sharedProcess = this._register(this.mainInstantiationService.createInstance(SharedProcess, machineId, sqmId, devDeviceId));
        this._register(sharedProcess.onDidCrash(() => this.windowsMainService?.sendToFocused('vscode:reportSharedProcessCrash')));
        const sharedProcessClient = (async () => {
            this.logService.trace('Main->SharedProcess#connect');
            const port = await sharedProcess.connect();
            this.logService.trace('Main->SharedProcess#connect: connection established');
            return new MessagePortClient(port, 'main');
        })();
        const sharedProcessReady = (async () => {
            await sharedProcess.whenReady();
            return sharedProcessClient;
        })();
        return { sharedProcessReady, sharedProcessClient };
    }
    async initServices(machineId, sqmId, devDeviceId, sharedProcessReady) {
        const services = new ServiceCollection();
        // Update
        switch (process.platform) {
            case 'win32':
                services.set(IUpdateService, new SyncDescriptor(Win32UpdateService));
                break;
            case 'linux':
                if (isLinuxSnap) {
                    services.set(IUpdateService, new SyncDescriptor(SnapUpdateService, [process.env['SNAP'], process.env['SNAP_REVISION']]));
                }
                else {
                    services.set(IUpdateService, new SyncDescriptor(LinuxUpdateService));
                }
                break;
            case 'darwin':
                services.set(IUpdateService, new SyncDescriptor(DarwinUpdateService));
                break;
        }
        // Windows
        services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, sqmId, devDeviceId, this.userEnv], false));
        services.set(IAuxiliaryWindowsMainService, new SyncDescriptor(AuxiliaryWindowsMainService, undefined, false));
        // Dialogs
        const dialogMainService = new DialogMainService(this.logService, this.productService);
        services.set(IDialogMainService, dialogMainService);
        // Launch
        services.set(ILaunchMainService, new SyncDescriptor(LaunchMainService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsMainService, new SyncDescriptor(DiagnosticsMainService, undefined, false /* proxied to other processes */));
        services.set(IDiagnosticsService, ProxyChannel.toService(getDelayedChannel(sharedProcessReady.then(client => client.getChannel('diagnostics')))));
        // Encryption
        services.set(IEncryptionMainService, new SyncDescriptor(EncryptionMainService));
        // Browser Elements
        services.set(INativeBrowserElementsMainService, new SyncDescriptor(NativeBrowserElementsMainService, undefined, false /* proxied to other processes */));
        // Keyboard Layout
        services.set(IKeyboardLayoutMainService, new SyncDescriptor(KeyboardLayoutMainService));
        // Native Host
        services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService, undefined, false /* proxied to other processes */));
        // Web Contents Extractor
        services.set(IWebContentExtractorService, new SyncDescriptor(NativeWebContentExtractorService, undefined, false /* proxied to other processes */));
        // Webview Manager
        services.set(IWebviewManagerService, new SyncDescriptor(WebviewMainService));
        // Menubar
        services.set(IMenubarMainService, new SyncDescriptor(MenubarMainService));
        // Extension Host Starter
        services.set(IExtensionHostStarter, new SyncDescriptor(ExtensionHostStarter));
        // Storage
        services.set(IStorageMainService, new SyncDescriptor(StorageMainService));
        services.set(IApplicationStorageMainService, new SyncDescriptor(ApplicationStorageMainService));
        // Terminal
        const ptyHostStarter = new ElectronPtyHostStarter({
            graceTime: 60000 /* LocalReconnectConstants.GraceTime */,
            shortGraceTime: 6000 /* LocalReconnectConstants.ShortGraceTime */,
            scrollback: this.configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100
        }, this.configurationService, this.environmentMainService, this.lifecycleMainService, this.logService);
        const ptyHostService = new PtyHostService(ptyHostStarter, this.configurationService, this.logService, this.loggerService);
        services.set(ILocalPtyService, ptyHostService);
        // External terminal
        if (isWindows) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(WindowsExternalTerminalService));
        }
        else if (isMacintosh) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(MacExternalTerminalService));
        }
        else if (isLinux) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(LinuxExternalTerminalService));
        }
        // Backups
        const backupMainService = new BackupMainService(this.environmentMainService, this.configurationService, this.logService, this.stateService);
        services.set(IBackupMainService, backupMainService);
        // Workspaces
        const workspacesManagementMainService = new WorkspacesManagementMainService(this.environmentMainService, this.logService, this.userDataProfilesMainService, backupMainService, dialogMainService);
        services.set(IWorkspacesManagementMainService, workspacesManagementMainService);
        services.set(IWorkspacesService, new SyncDescriptor(WorkspacesMainService, undefined, false /* proxied to other processes */));
        services.set(IWorkspacesHistoryMainService, new SyncDescriptor(WorkspacesHistoryMainService, undefined, false));
        // URL handling
        services.set(IURLService, new SyncDescriptor(NativeURLService, undefined, false /* proxied to other processes */));
        // Telemetry
        if (supportsTelemetry(this.productService, this.environmentMainService)) {
            const isInternal = isInternalTelemetry(this.productService, this.configurationService);
            const channel = getDelayedChannel(sharedProcessReady.then(client => client.getChannel('telemetryAppender')));
            const appender = new TelemetryAppenderClient(channel);
            const commonProperties = resolveCommonProperties(release(), hostname(), process.arch, this.productService.commit, this.productService.version, machineId, sqmId, devDeviceId, isInternal, this.productService.date);
            const piiPaths = getPiiPathsFromEnvironment(this.environmentMainService);
            const config = { appenders: [appender], commonProperties, piiPaths, sendErrorTelemetry: true };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        // Default Extensions Profile Init
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        // Utility Process Worker
        services.set(IUtilityProcessWorkerMainService, new SyncDescriptor(UtilityProcessWorkerMainService, undefined, true));
        // Proxy Auth
        services.set(IProxyAuthService, new SyncDescriptor(ProxyAuthService));
        // MCP
        services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
        // Dev Only: CSS service (for ESM)
        services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
        // Init services that require it
        await Promises.settled([
            backupMainService.initialize(),
            workspacesManagementMainService.initialize()
        ]);
        return this.mainInstantiationService.createChild(services);
    }
    initChannels(accessor, mainProcessElectronServer, sharedProcessClient) {
        // Channels registered to node.js are exposed to second instances
        // launching because that is the only way the second instance
        // can talk to the first instance. Electron IPC does not work
        // across apps until `requestSingleInstance` APIs are adopted.
        const disposables = this._register(new DisposableStore());
        const launchChannel = ProxyChannel.fromService(accessor.get(ILaunchMainService), disposables, { disableMarshalling: true });
        this.mainProcessNodeIpcServer.registerChannel('launch', launchChannel);
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsMainService), disposables, { disableMarshalling: true });
        this.mainProcessNodeIpcServer.registerChannel('diagnostics', diagnosticsChannel);
        // Policies (main & shared process)
        const policyChannel = disposables.add(new PolicyChannel(accessor.get(IPolicyService)));
        mainProcessElectronServer.registerChannel('policy', policyChannel);
        sharedProcessClient.then(client => client.registerChannel('policy', policyChannel));
        // Local Files
        const diskFileSystemProvider = this.fileService.getProvider(Schemas.file);
        assertType(diskFileSystemProvider instanceof DiskFileSystemProvider);
        const fileSystemProviderChannel = disposables.add(new DiskFileSystemProviderChannel(diskFileSystemProvider, this.logService, this.environmentMainService));
        mainProcessElectronServer.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel);
        sharedProcessClient.then(client => client.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel));
        // User Data Profiles
        const userDataProfilesService = ProxyChannel.fromService(accessor.get(IUserDataProfilesMainService), disposables);
        mainProcessElectronServer.registerChannel('userDataProfiles', userDataProfilesService);
        sharedProcessClient.then(client => client.registerChannel('userDataProfiles', userDataProfilesService));
        // Update
        const updateChannel = new UpdateChannel(accessor.get(IUpdateService));
        mainProcessElectronServer.registerChannel('update', updateChannel);
        // Process
        const processChannel = ProxyChannel.fromService(new ProcessMainService(this.logService, accessor.get(IDiagnosticsService), accessor.get(IDiagnosticsMainService)), disposables);
        mainProcessElectronServer.registerChannel('process', processChannel);
        // Encryption
        const encryptionChannel = ProxyChannel.fromService(accessor.get(IEncryptionMainService), disposables);
        mainProcessElectronServer.registerChannel('encryption', encryptionChannel);
        // Browser Elements
        const browserElementsChannel = ProxyChannel.fromService(accessor.get(INativeBrowserElementsMainService), disposables);
        mainProcessElectronServer.registerChannel('browserElements', browserElementsChannel);
        sharedProcessClient.then(client => client.registerChannel('browserElements', browserElementsChannel));
        // Signing
        const signChannel = ProxyChannel.fromService(accessor.get(ISignService), disposables);
        mainProcessElectronServer.registerChannel('sign', signChannel);
        // Keyboard Layout
        const keyboardLayoutChannel = ProxyChannel.fromService(accessor.get(IKeyboardLayoutMainService), disposables);
        mainProcessElectronServer.registerChannel('keyboardLayout', keyboardLayoutChannel);
        // Native host (main & shared process)
        this.nativeHostMainService = accessor.get(INativeHostMainService);
        const nativeHostChannel = ProxyChannel.fromService(this.nativeHostMainService, disposables);
        mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel);
        sharedProcessClient.then(client => client.registerChannel('nativeHost', nativeHostChannel));
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(IWebContentExtractorService), disposables);
        mainProcessElectronServer.registerChannel('webContentExtractor', webContentExtractorChannel);
        // Workspaces
        const workspacesChannel = ProxyChannel.fromService(accessor.get(IWorkspacesService), disposables);
        mainProcessElectronServer.registerChannel('workspaces', workspacesChannel);
        // Menubar
        const menubarChannel = ProxyChannel.fromService(accessor.get(IMenubarMainService), disposables);
        mainProcessElectronServer.registerChannel('menubar', menubarChannel);
        // URL handling
        const urlChannel = ProxyChannel.fromService(accessor.get(IURLService), disposables);
        mainProcessElectronServer.registerChannel('url', urlChannel);
        // Webview Manager
        const webviewChannel = ProxyChannel.fromService(accessor.get(IWebviewManagerService), disposables);
        mainProcessElectronServer.registerChannel('webview', webviewChannel);
        // Storage (main & shared process)
        const storageChannel = disposables.add((new StorageDatabaseChannel(this.logService, accessor.get(IStorageMainService))));
        mainProcessElectronServer.registerChannel('storage', storageChannel);
        sharedProcessClient.then(client => client.registerChannel('storage', storageChannel));
        // Profile Storage Changes Listener (shared process)
        const profileStorageListener = disposables.add((new ProfileStorageChangesListenerChannel(accessor.get(IStorageMainService), accessor.get(IUserDataProfilesMainService), this.logService)));
        sharedProcessClient.then(client => client.registerChannel('profileStorageListener', profileStorageListener));
        // Terminal
        const ptyHostChannel = ProxyChannel.fromService(accessor.get(ILocalPtyService), disposables);
        mainProcessElectronServer.registerChannel(TerminalIpcChannels.LocalPty, ptyHostChannel);
        // External Terminal
        const externalTerminalChannel = ProxyChannel.fromService(accessor.get(IExternalTerminalMainService), disposables);
        mainProcessElectronServer.registerChannel('externalTerminal', externalTerminalChannel);
        // MCP
        const mcpDiscoveryChannel = ProxyChannel.fromService(accessor.get(INativeMcpDiscoveryHelperService), disposables);
        mainProcessElectronServer.registerChannel(NativeMcpDiscoveryHelperChannelName, mcpDiscoveryChannel);
        // Logger
        const loggerChannel = new LoggerChannel(accessor.get(ILoggerMainService));
        mainProcessElectronServer.registerChannel('logger', loggerChannel);
        sharedProcessClient.then(client => client.registerChannel('logger', loggerChannel));
        // Extension Host Debug Broadcasting
        const electronExtensionHostDebugBroadcastChannel = new ElectronExtensionHostDebugBroadcastChannel(accessor.get(IWindowsMainService));
        mainProcessElectronServer.registerChannel('extensionhostdebugservice', electronExtensionHostDebugBroadcastChannel);
        // Extension Host Starter
        const extensionHostStarterChannel = ProxyChannel.fromService(accessor.get(IExtensionHostStarter), disposables);
        mainProcessElectronServer.registerChannel(ipcExtensionHostStarterChannelName, extensionHostStarterChannel);
        // Utility Process Worker
        const utilityProcessWorkerChannel = ProxyChannel.fromService(accessor.get(IUtilityProcessWorkerMainService), disposables);
        mainProcessElectronServer.registerChannel(ipcUtilityProcessWorkerChannelName, utilityProcessWorkerChannel);
    }
    async openFirstWindow(accessor, initialProtocolUrls) {
        const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
        this.auxiliaryWindowsMainService = accessor.get(IAuxiliaryWindowsMainService);
        const context = isLaunchedFromCli(process.env) ? 0 /* OpenContext.CLI */ : 4 /* OpenContext.DESKTOP */;
        const args = this.environmentMainService.args;
        // First check for windows from protocol links to open
        if (initialProtocolUrls) {
            // Openables can open as windows directly
            if (initialProtocolUrls.openables.length > 0) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    urisToOpen: initialProtocolUrls.openables,
                    gotoLineMode: true,
                    initialStartup: true
                    // remoteAuthority: will be determined based on openables
                });
            }
            // Protocol links with `windowId=_blank` on startup
            // should be handled in a special way:
            // We take the first one of these and open an empty
            // window for it. This ensures we are not restoring
            // all windows of the previous session.
            // If there are any more URLs like these, they will
            // be handled from the URL listeners installed later.
            if (initialProtocolUrls.urls.length > 0) {
                for (const protocolUrl of initialProtocolUrls.urls) {
                    const params = new URLSearchParams(protocolUrl.uri.query);
                    if (params.get('windowId') === '_blank') {
                        // It is important here that we remove `windowId=_blank` from
                        // this URL because here we open an empty window for it.
                        params.delete('windowId');
                        protocolUrl.originalUrl = protocolUrl.uri.toString(true);
                        protocolUrl.uri = protocolUrl.uri.with({ query: params.toString() });
                        return windowsMainService.open({
                            context,
                            cli: args,
                            forceNewWindow: true,
                            forceEmpty: true,
                            gotoLineMode: true,
                            initialStartup: true
                            // remoteAuthority: will be determined based on openables
                        });
                    }
                }
            }
        }
        const macOpenFiles = global.macOpenFiles;
        const hasCliArgs = args._.length;
        const hasFolderURIs = !!args['folder-uri'];
        const hasFileURIs = !!args['file-uri'];
        const noRecentEntry = args['skip-add-to-recently-opened'] === true;
        const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
        const remoteAuthority = args.remote || undefined;
        const forceProfile = args.profile;
        const forceTempProfile = args['profile-temp'];
        // Started without file/folder arguments
        if (!hasCliArgs && !hasFolderURIs && !hasFileURIs) {
            // Force new window
            if (args['new-window'] || forceProfile || forceTempProfile) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    forceNewWindow: true,
                    forceEmpty: true,
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    remoteAuthority,
                    forceProfile,
                    forceTempProfile
                });
            }
            // mac: open-file event received on startup
            if (macOpenFiles.length) {
                return windowsMainService.open({
                    context: 1 /* OpenContext.DOCK */,
                    cli: args,
                    urisToOpen: macOpenFiles.map(path => {
                        path = normalizeNFC(path); // macOS only: normalize paths to NFC form
                        return (hasWorkspaceFileExtension(path) ? { workspaceUri: URI.file(path) } : { fileUri: URI.file(path) });
                    }),
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    // remoteAuthority: will be determined based on macOpenFiles
                });
            }
        }
        // default: read paths from cli
        return windowsMainService.open({
            context,
            cli: args,
            forceNewWindow: args['new-window'],
            diffMode: args.diff,
            mergeMode: args.merge,
            noRecentEntry,
            waitMarkerFileURI,
            gotoLineMode: args.goto,
            initialStartup: true,
            remoteAuthority,
            forceProfile,
            forceTempProfile
        });
    }
    afterWindowOpen() {
        // Windows: mutex
        this.installMutex();
        // Remote Authorities
        protocol.registerHttpProtocol(Schemas.vscodeRemoteResource, (request, callback) => {
            callback({
                url: request.url.replace(/^vscode-remote-resource:/, 'http:'),
                method: request.method
            });
        });
        // Start to fetch shell environment (if needed) after window has opened
        // Since this operation can take a long time, we want to warm it up while
        // the window is opening.
        // We also show an error to the user in case this fails.
        this.resolveShellEnvironment(this.environmentMainService.args, process.env, true);
        // Crash reporter
        this.updateCrashReporterEnablement();
        // macOS: rosetta translation warning
        if (isMacintosh && app.runningUnderARM64Translation) {
            this.windowsMainService?.sendToFocused('vscode:showTranslatedBuildWarning');
        }
    }
    async installMutex() {
        const win32MutexName = this.productService.win32MutexName;
        if (isWindows && win32MutexName) {
            try {
                const WindowsMutex = await import('@vscode/windows-mutex');
                const mutex = new WindowsMutex.Mutex(win32MutexName);
                Event.once(this.lifecycleMainService.onWillShutdown)(() => mutex.release());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async resolveShellEnvironment(args, env, notifyOnError) {
        try {
            return await getResolvedShellEnv(this.configurationService, this.logService, args, env);
        }
        catch (error) {
            const errorMessage = toErrorMessage(error);
            if (notifyOnError) {
                this.windowsMainService?.sendToFocused('vscode:showResolveShellEnvError', errorMessage);
            }
            else {
                this.logService.error(errorMessage);
            }
        }
        return {};
    }
    async updateCrashReporterEnablement() {
        // If enable-crash-reporter argv is undefined then this is a fresh start,
        // based on `telemetry.enableCrashreporter` settings, generate a UUID which
        // will be used as crash reporter id and also update the json file.
        try {
            const argvContent = await this.fileService.readFile(this.environmentMainService.argvResource);
            const argvString = argvContent.value.toString();
            const argvJSON = parse(argvString);
            const telemetryLevel = getTelemetryLevel(this.configurationService);
            const enableCrashReporter = telemetryLevel >= 1 /* TelemetryLevel.CRASH */;
            // Initial startup
            if (argvJSON['enable-crash-reporter'] === undefined) {
                const additionalArgvContent = [
                    '',
                    '	// Allows to disable crash reporting.',
                    '	// Should restart the app if the value is changed.',
                    `	"enable-crash-reporter": ${enableCrashReporter},`,
                    '',
                    '	// Unique id used for correlating crash reports sent from this instance.',
                    '	// Do not edit this value.',
                    `	"crash-reporter-id": "${generateUuid()}"`,
                    '}'
                ];
                const newArgvString = argvString.substring(0, argvString.length - 2).concat(',\n', additionalArgvContent.join('\n'));
                await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
            }
            // Subsequent startup: update crash reporter value if changed
            else {
                const newArgvString = argvString.replace(/"enable-crash-reporter": .*,/, `"enable-crash-reporter": ${enableCrashReporter},`);
                if (newArgvString !== argvString) {
                    await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
                }
            }
        }
        catch (error) {
            this.logService.error(error);
            // Inform the user via notification
            this.windowsMainService?.sendToFocused('vscode:showArgvParseWarning');
        }
    }
    eventuallyAfterWindowOpen() {
        // Validate Device ID is up to date (delay this as it has shown significant perf impact)
        // Refs: https://github.com/microsoft/vscode/issues/234064
        validatedevDeviceId(this.stateService, this.logService);
    }
};
CodeApplication = CodeApplication_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService),
    __param(4, ILoggerService),
    __param(5, IEnvironmentMainService),
    __param(6, ILifecycleMainService),
    __param(7, IConfigurationService),
    __param(8, IStateService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IUserDataProfilesMainService)
], CodeApplication);
export { CodeApplication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLW1haW4vYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQVcsaUJBQWlCLEVBQWdCLE1BQU0sVUFBVSxDQUFDO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RCxPQUFPLEVBQXVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0SCxPQUFPLEVBQUUs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