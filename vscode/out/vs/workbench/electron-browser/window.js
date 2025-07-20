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
var NativeWindow_1;
import './media/window.css';
import { localize } from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { equals } from '../../base/common/objects.js';
import { EventType, EventHelper, addDisposableListener, ModifierKeyEmitter, getActiveElement, hasWindow, getWindowById, getWindows, $ } from '../../base/browser/dom.js';
import { Action, Separator } from '../../base/common/actions.js';
import { IFileService } from '../../platform/files/common/files.js';
import { EditorResourceAccessor, SideBySideEditor, pathsToEditors, isResourceEditorInput } from '../common/editor.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { WindowMinimumSize, hasNativeTitlebar } from '../../platform/window/common/window.js';
import { ITitleService } from '../services/title/browser/titleService.js';
import { IWorkbenchThemeService } from '../services/themes/common/workbenchThemeService.js';
import { ApplyZoomTarget, applyZoom } from '../../platform/window/electron-browser/window.js';
import { setFullscreen, getZoomLevel, onDidChangeZoomLevel, getZoomFactor } from '../../base/browser/browser.js';
import { ICommandService, CommandsRegistry } from '../../platform/commands/common/commands.js';
import { ipcRenderer, process } from '../../base/parts/sandbox/electron-browser/globals.js';
import { IWorkspaceEditingService } from '../services/workspaces/common/workspaceEditing.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry } from '../../platform/actions/common/actions.js';
import { getFlatActionBarActions } from '../../platform/actions/browser/menuEntryActionViewItem.js';
import { RunOnceScheduler } from '../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../base/common/lifecycle.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { IIntegrityService } from '../services/integrity/common/integrity.js';
import { isWindows, isMacintosh } from '../../base/common/platform.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { INotificationService, NotificationPriority, Severity } from '../../platform/notification/common/notification.js';
import { IKeybindingService } from '../../platform/keybinding/common/keybinding.js';
import { INativeWorkbenchEnvironmentService } from '../services/environment/electron-browser/environmentService.js';
import { IAccessibilityService } from '../../platform/accessibility/common/accessibility.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { coalesce } from '../../base/common/arrays.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { IOpenerService } from '../../platform/opener/common/opener.js';
import { Schemas } from '../../base/common/network.js';
import { INativeHostService } from '../../platform/native/common/native.js';
import { posix } from '../../base/common/path.js';
import { ITunnelService, extractLocalHostUriMetaDataForPortMapping, extractQueryLocalHostUriMetaDataForPortMapping } from '../../platform/tunnel/common/tunnel.js';
import { IWorkbenchLayoutService, positionFromString } from '../services/layout/browser/layoutService.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService } from '../services/filesConfiguration/common/filesConfigurationService.js';
import { Event } from '../../base/common/event.js';
import { IRemoteAuthorityResolverService } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { whenEditorClosed } from '../browser/editor.js';
import { ISharedProcessService } from '../../platform/ipc/electron-browser/services.js';
import { IProgressService } from '../../platform/progress/common/progress.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { dirname } from '../../base/common/resources.js';
import { IBannerService } from '../services/banner/browser/bannerService.js';
import { Codicon } from '../../base/common/codicons.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { IPreferencesService } from '../services/preferences/common/preferences.js';
import { IUtilityProcessWorkerWorkbenchService } from '../services/utilityProcess/electron-browser/utilityProcessWorkerWorkbenchService.js';
import { registerWindowDriver } from '../services/driver/browser/driver.js';
import { mainWindow } from '../../base/browser/window.js';
import { BaseWindow } from '../browser/window.js';
import { IHostService } from '../services/host/browser/host.js';
import { IStatusbarService, ShowTooltipCommand } from '../services/statusbar/browser/statusbar.js';
import { ActionBar } from '../../base/browser/ui/actionbar/actionbar.js';
import { ThemeIcon } from '../../base/common/themables.js';
import { getWorkbenchContribution } from '../common/contributions.js';
import { DynamicWorkbenchSecurityConfiguration } from '../common/configuration.js';
import { nativeHoverDelegate } from '../../platform/hover/browser/hover.js';
let NativeWindow = NativeWindow_1 = class NativeWindow extends BaseWindow {
    constructor(editorService, editorGroupService, configurationService, titleService, themeService, notificationService, commandService, keybindingService, telemetryService, workspaceEditingService, fileService, menuService, lifecycleService, integrityService, nativeEnvironmentService, accessibilityService, contextService, openerService, nativeHostService, tunnelService, layoutService, workingCopyService, filesConfigurationService, productService, remoteAuthorityResolverService, dialogService, storageService, logService, instantiationService, sharedProcessService, progressService, labelService, bannerService, uriIdentityService, preferencesService, utilityProcessWorkerWorkbenchService, hostService) {
        super(mainWindow, undefined, hostService, nativeEnvironmentService);
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.titleService = titleService;
        this.themeService = themeService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        this.telemetryService = telemetryService;
        this.workspaceEditingService = workspaceEditingService;
        this.fileService = fileService;
        this.menuService = menuService;
        this.lifecycleService = lifecycleService;
        this.integrityService = integrityService;
        this.nativeEnvironmentService = nativeEnvironmentService;
        this.accessibilityService = accessibilityService;
        this.contextService = contextService;
        this.openerService = openerService;
        this.nativeHostService = nativeHostService;
        this.tunnelService = tunnelService;
        this.layoutService = layoutService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.productService = productService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.dialogService = dialogService;
        this.storageService = storageService;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.sharedProcessService = sharedProcessService;
        this.progressService = progressService;
        this.labelService = labelService;
        this.bannerService = bannerService;
        this.uriIdentityService = uriIdentityService;
        this.preferencesService = preferencesService;
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.customTitleContextMenuDisposable = this._register(new DisposableStore());
        this.addRemoveFoldersScheduler = this._register(new RunOnceScheduler(() => this.doAddRemoveFolders(), 100));
        this.pendingFoldersToAdd = [];
        this.pendingFoldersToRemove = [];
        this.isDocumentedEdited = false;
        this.touchBarDisposables = this._register(new DisposableStore());
        //#region Window Zoom
        this.mapWindowIdToZoomStatusEntry = new Map();
        this.configuredWindowZoomLevel = this.resolveConfiguredWindowZoomLevel();
        this.registerListeners();
        this.create();
    }
    registerListeners() {
        // Layout
        this._register(addDisposableListener(mainWindow, EventType.RESIZE, () => this.layoutService.layout()));
        // React to editor input changes
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateTouchbarMenu()));
        // Prevent opening a real URL inside the window
        for (const event of [EventType.DRAG_OVER, EventType.DROP]) {
            this._register(addDisposableListener(mainWindow.document.body, event, (e) => {
                EventHelper.stop(e);
            }));
        }
        // Support `runAction` event
        ipcRenderer.on('vscode:runAction', async (event, request) => {
            const args = request.args || [];
            // If we run an action from the touchbar, we fill in the currently active resource
            // as payload because the touch bar items are context aware depending on the editor
            if (request.from === 'touchbar') {
                const activeEditor = this.editorService.activeEditor;
                if (activeEditor) {
                    const resource = EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
                    if (resource) {
                        args.push(resource);
                    }
                }
            }
            else {
                args.push({ from: request.from });
            }
            try {
                await this.commandService.executeCommand(request.id, ...args);
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: request.id, from: request.from });
            }
            catch (error) {
                this.notificationService.error(error);
            }
        });
        // Support runKeybinding event
        ipcRenderer.on('vscode:runKeybinding', (event, request) => {
            const activeElement = getActiveElement();
            if (activeElement) {
                this.keybindingService.dispatchByUserSettingsLabel(request.userSettingsLabel, activeElement);
            }
        });
        // Shared Process crash reported from main
        ipcRenderer.on('vscode:reportSharedProcessCrash', (event, error) => {
            this.notificationService.prompt(Severity.Error, localize('sharedProcessCrash', "A shared background process terminated unexpectedly. Please restart the application to recover."), [{
                    label: localize('restart', "Restart"),
                    run: () => this.nativeHostService.relaunch()
                }], {
                priority: NotificationPriority.URGENT
            });
        });
        // Support openFiles event for existing and new files
        ipcRenderer.on('vscode:openFiles', (event, request) => { this.onOpenFiles(request); });
        // Support addRemoveFolders event for workspace management
        ipcRenderer.on('vscode:addRemoveFolders', (event, request) => this.onAddRemoveFoldersRequest(request));
        // Message support
        ipcRenderer.on('vscode:showInfoMessage', (event, message) => this.notificationService.info(message));
        // Shell Environment Issue Notifications
        ipcRenderer.on('vscode:showResolveShellEnvError', (event, message) => {
            this.notificationService.prompt(Severity.Error, message, [{
                    label: localize('restart', "Restart"),
                    run: () => this.nativeHostService.relaunch()
                },
                {
                    label: localize('configure', "Configure"),
                    run: () => this.preferencesService.openUserSettings({ query: 'application.shellEnvironmentResolutionTimeout' })
                },
                {
                    label: localize('learnMore', "Learn More"),
                    run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2149667')
                }]);
        });
        ipcRenderer.on('vscode:showCredentialsError', (event, message) => {
            this.notificationService.prompt(Severity.Error, localize('keychainWriteError', "Writing login information to the keychain failed with error '{0}'.", message), [{
                    label: localize('troubleshooting', "Troubleshooting Guide"),
                    run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2190713')
                }]);
        });
        ipcRenderer.on('vscode:showTranslatedBuildWarning', () => {
            this.notificationService.prompt(Severity.Warning, localize("runningTranslated", "You are running an emulated version of {0}. For better performance download the native arm64 version of {0} build for your machine.", this.productService.nameLong), [{
                    label: localize('downloadArmBuild', "Download"),
                    run: () => {
                        const quality = this.productService.quality;
                        const stableURL = 'https://code.visualstudio.com/docs/?dv=osx';
                        const insidersURL = 'https://code.visualstudio.com/docs/?dv=osx&build=insiders';
                        this.openerService.open(quality === 'stable' ? stableURL : insidersURL);
                    }
                }], {
                priority: NotificationPriority.URGENT
            });
        });
        ipcRenderer.on('vscode:showArgvParseWarning', (event, message) => {
            this.notificationService.prompt(Severity.Warning, localize("showArgvParseWarning", "The runtime arguments file 'argv.json' contains errors. Please correct them and restart."), [{
                    label: localize('showArgvParseWarningAction', "Open File"),
                    run: () => this.editorService.openEditor({ resource: this.nativeEnvironmentService.argvResource })
                }], {
                priority: NotificationPriority.URGENT
            });
        });
        // Fullscreen Events
        ipcRenderer.on('vscode:enterFullScreen', () => setFullscreen(true, mainWindow));
        ipcRenderer.on('vscode:leaveFullScreen', () => setFullscreen(false, mainWindow));
        // Proxy Login Dialog
        ipcRenderer.on('vscode:openProxyAuthenticationDialog', async (event, payload) => {
            const rememberCredentialsKey = 'window.rememberProxyCredentials';
            const rememberCredentials = this.storageService.getBoolean(rememberCredentialsKey, -1 /* StorageScope.APPLICATION */);
            const result = await this.dialogService.input({
                type: 'warning',
                message: localize('proxyAuthRequired', "Proxy Authentication Required"),
                primaryButton: localize({ key: 'loginButton', comment: ['&& denotes a mnemonic'] }, "&&Log In"),
                inputs: [
                    { placeholder: localize('username', "Username"), value: payload.username },
                    { placeholder: localize('password', "Password"), type: 'password', value: payload.password }
                ],
                detail: localize('proxyDetail', "The proxy {0} requires a username and password.", `${payload.authInfo.host}:${payload.authInfo.port}`),
                checkbox: {
                    label: localize('rememberCredentials', "Remember my credentials"),
                    checked: rememberCredentials
                }
            });
            // Reply back to the channel without result to indicate
            // that the login dialog was cancelled
            if (!result.confirmed || !result.values) {
                ipcRenderer.send(payload.replyChannel);
            }
            // Other reply back with the picked credentials
            else {
                // Update state based on checkbox
                if (result.checkboxChecked) {
                    this.storageService.store(rememberCredentialsKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                }
                else {
                    this.storageService.remove(rememberCredentialsKey, -1 /* StorageScope.APPLICATION */);
                }
                // Reply back to main side with credentials
                const [username, password] = result.values;
                ipcRenderer.send(payload.replyChannel, { username, password, remember: !!result.checkboxChecked });
            }
        });
        // Accessibility support changed event
        ipcRenderer.on('vscode:accessibilitySupportChanged', (event, accessibilitySupportEnabled) => {
            this.accessibilityService.setAccessibilitySupport(accessibilitySupportEnabled ? 2 /* AccessibilitySupport.Enabled */ : 1 /* AccessibilitySupport.Disabled */);
        });
        // Allow to update security settings around allowed UNC Host
        ipcRenderer.on('vscode:configureAllowedUNCHost', async (event, host) => {
            if (!isWindows) {
                return; // only supported on Windows
            }
            const allowedUncHosts = new Set();
            const configuredAllowedUncHosts = this.configurationService.getValue('security.allowedUNCHosts') ?? [];
            if (Array.isArray(configuredAllowedUncHosts)) {
                for (const configuredAllowedUncHost of configuredAllowedUncHosts) {
                    if (typeof configuredAllowedUncHost === 'string') {
                        allowedUncHosts.add(configuredAllowedUncHost);
                    }
                }
            }
            if (!allowedUncHosts.has(host)) {
                allowedUncHosts.add(host);
                await getWorkbenchContribution(DynamicWorkbenchSecurityConfiguration.ID).ready; // ensure this setting is registered
                this.configurationService.updateValue('security.allowedUNCHosts', [...allowedUncHosts.values()], 2 /* ConfigurationTarget.USER */);
            }
        });
        // Allow to update security settings around protocol handlers
        ipcRenderer.on('vscode:disablePromptForProtocolHandling', (event, kind) => {
            const setting = kind === 'local' ? 'security.promptForLocalFileProtocolHandling' : 'security.promptForRemoteFileProtocolHandling';
            this.configurationService.updateValue(setting, false);
        });
        // Window Zoom
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('window.zoomLevel') || (e.affectsConfiguration('window.zoomPerWindow') && this.configurationService.getValue('window.zoomPerWindow') === false)) {
                this.onDidChangeConfiguredWindowZoomLevel();
            }
            else if (e.affectsConfiguration('keyboard.touchbar.enabled') || e.affectsConfiguration('keyboard.touchbar.ignored')) {
                this.updateTouchbarMenu();
            }
        }));
        this._register(onDidChangeZoomLevel(targetWindowId => this.handleOnDidChangeZoomLevel(targetWindowId)));
        for (const part of this.editorGroupService.parts) {
            this.createWindowZoomStatusEntry(part);
        }
        this._register(this.editorGroupService.onDidCreateAuxiliaryEditorPart(part => this.createWindowZoomStatusEntry(part)));
        // Listen to visible editor changes (debounced in case a new editor opens immediately after)
        this._register(Event.debounce(this.editorService.onDidVisibleEditorsChange, () => undefined, 0, undefined, undefined, undefined, this._store)(() => this.maybeCloseWindow()));
        // Listen to editor closing (if we run with --wait)
        const filesToWait = this.nativeEnvironmentService.filesToWait;
        if (filesToWait) {
            this.trackClosedWaitFiles(filesToWait.waitMarkerFileUri, coalesce(filesToWait.paths.map(path => path.fileUri)));
        }
        // macOS OS integration: represented file name
        if (isMacintosh) {
            for (const part of this.editorGroupService.parts) {
                this.handleRepresentedFilename(part);
            }
            this._register(this.editorGroupService.onDidCreateAuxiliaryEditorPart(part => this.handleRepresentedFilename(part)));
        }
        // Document edited: indicate for dirty working copies
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => {
            const gotDirty = workingCopy.isDirty();
            if (gotDirty && !(workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) && this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)) {
                return; // do not indicate dirty of working copies that are auto saved after short delay
            }
            this.updateDocumentEdited(gotDirty ? true : undefined);
        }));
        this.updateDocumentEdited(undefined);
        // Detect minimize / maximize
        this._register(Event.any(Event.map(Event.filter(this.nativeHostService.onDidMaximizeWindow, windowId => !!hasWindow(windowId)), windowId => ({ maximized: true, windowId })), Event.map(Event.filter(this.nativeHostService.onDidUnmaximizeWindow, windowId => !!hasWindow(windowId)), windowId => ({ maximized: false, windowId })))(e => this.layoutService.updateWindowMaximizedState(getWindowById(e.windowId).window, e.maximized)));
        this.layoutService.updateWindowMaximizedState(mainWindow, this.nativeEnvironmentService.window.maximized ?? false);
        // Detect panel position to determine minimum width
        this._register(this.layoutService.onDidChangePanelPosition(pos => this.onDidChangePanelPosition(positionFromString(pos))));
        this.onDidChangePanelPosition(this.layoutService.getPanelPosition());
        // Lifecycle
        this._register(this.lifecycleService.onBeforeShutdown(e => this.onBeforeShutdown(e)));
        this._register(this.lifecycleService.onBeforeShutdownError(e => this.onBeforeShutdownError(e)));
        this._register(this.lifecycleService.onWillShutdown(e => this.onWillShutdown(e)));
    }
    handleRepresentedFilename(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        this.editorGroupService.getScopedInstantiationService(part).invokeFunction(accessor => {
            const editorService = accessor.get(IEditorService);
            disposables.add(editorService.onDidActiveEditorChange(() => this.updateRepresentedFilename(editorService, part.windowId)));
        });
    }
    updateRepresentedFilename(editorService, targetWindowId) {
        const file = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY, filterByScheme: Schemas.file });
        // Represented Filename
        this.nativeHostService.setRepresentedFilename(file?.fsPath ?? '', { targetWindowId });
        // Custom title menu (main window only currently)
        if (targetWindowId === mainWindow.vscodeWindowId) {
            this.provideCustomTitleContextMenu(file?.fsPath);
        }
    }
    //#region Window Lifecycle
    onBeforeShutdown({ veto, reason }) {
        if (reason === 1 /* ShutdownReason.CLOSE */) {
            const confirmBeforeCloseSetting = this.configurationService.getValue('window.confirmBeforeClose');
            const confirmBeforeClose = confirmBeforeCloseSetting === 'always' || (confirmBeforeCloseSetting === 'keyboardOnly' && ModifierKeyEmitter.getInstance().isModifierPressed);
            if (confirmBeforeClose) {
                // When we need to confirm on close or quit, veto the shutdown
                // with a long running promise to figure out whether shutdown
                // can proceed or not.
                return veto((async () => {
                    let actualReason = reason;
                    if (reason === 1 /* ShutdownReason.CLOSE */ && !isMacintosh) {
                        const windowCount = await this.nativeHostService.getWindowCount();
                        if (windowCount === 1) {
                            actualReason = 2 /* ShutdownReason.QUIT */; // Windows/Linux: closing last window means to QUIT
                        }
                    }
                    let confirmed = true;
                    if (confirmBeforeClose) {
                        confirmed = await this.instantiationService.invokeFunction(accessor => NativeWindow_1.confirmOnShutdown(accessor, actualReason));
                    }
                    // Progress for long running shutdown
                    if (confirmed) {
                        this.progressOnBeforeShutdown(reason);
                    }
                    return !confirmed;
                })(), 'veto.confirmBeforeClose');
            }
        }
        // Progress for long running shutdown
        this.progressOnBeforeShutdown(reason);
    }
    progressOnBeforeShutdown(reason) {
        this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */, // use window progress to not be too annoying about this operation
            delay: 800, // delay so that it only appears when operation takes a long time
            title: this.toShutdownLabel(reason, false),
        }, () => {
            return Event.toPromise(Event.any(this.lifecycleService.onWillShutdown, // dismiss this dialog when we shutdown
            this.lifecycleService.onShutdownVeto, // or when shutdown was vetoed
            this.dialogService.onWillShowDialog // or when a dialog asks for input
            ));
        });
    }
    onBeforeShutdownError({ error, reason }) {
        this.dialogService.error(this.toShutdownLabel(reason, true), localize('shutdownErrorDetail', "Error: {0}", toErrorMessage(error)));
    }
    onWillShutdown({ reason, force, joiners }) {
        // Delay so that the dialog only appears after timeout
        const shutdownDialogScheduler = new RunOnceScheduler(() => {
            const pendingJoiners = joiners();
            this.progressService.withProgress({
                location: 20 /* ProgressLocation.Dialog */, // use a dialog to prevent the user from making any more interactions now
                buttons: [this.toForceShutdownLabel(reason)], // allow to force shutdown anyway
                cancellable: false, // do not allow to cancel
                sticky: true, // do not allow to dismiss
                title: this.toShutdownLabel(reason, false),
                detail: pendingJoiners.length > 0 ? localize('willShutdownDetail', "The following operations are still running: \n{0}", pendingJoiners.map(joiner => `- ${joiner.label}`).join('\n')) : undefined
            }, () => {
                return Event.toPromise(this.lifecycleService.onDidShutdown); // dismiss this dialog when we actually shutdown
            }, () => {
                force();
            });
        }, 1200);
        shutdownDialogScheduler.schedule();
        // Dispose scheduler when we actually shutdown
        Event.once(this.lifecycleService.onDidShutdown)(() => shutdownDialogScheduler.dispose());
    }
    toShutdownLabel(reason, isError) {
        if (isError) {
            switch (reason) {
                case 1 /* ShutdownReason.CLOSE */:
                    return localize('shutdownErrorClose', "An unexpected error prevented the window to close");
                case 2 /* ShutdownReason.QUIT */:
                    return localize('shutdownErrorQuit', "An unexpected error prevented the application to quit");
                case 3 /* ShutdownReason.RELOAD */:
                    return localize('shutdownErrorReload', "An unexpected error prevented the window to reload");
                case 4 /* ShutdownReason.LOAD */:
                    return localize('shutdownErrorLoad', "An unexpected error prevented to change the workspace");
            }
        }
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                return localize('shutdownTitleClose', "Closing the window is taking a bit longer...");
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownTitleQuit', "Quitting the application is taking a bit longer...");
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownTitleReload', "Reloading the window is taking a bit longer...");
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownTitleLoad', "Changing the workspace is taking a bit longer...");
        }
    }
    toForceShutdownLabel(reason) {
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
                return localize('shutdownForceClose', "Close Anyway");
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownForceQuit', "Quit Anyway");
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownForceReload', "Reload Anyway");
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownForceLoad', "Change Anyway");
        }
    }
    //#endregion
    updateDocumentEdited(documentEdited) {
        let setDocumentEdited;
        if (typeof documentEdited === 'boolean') {
            setDocumentEdited = documentEdited;
        }
        else {
            setDocumentEdited = this.workingCopyService.hasDirty;
        }
        if ((!this.isDocumentedEdited && setDocumentEdited) || (this.isDocumentedEdited && !setDocumentEdited)) {
            this.isDocumentedEdited = setDocumentEdited;
            this.nativeHostService.setDocumentEdited(setDocumentEdited);
        }
    }
    getWindowMinimumWidth(panelPosition = this.layoutService.getPanelPosition()) {
        // if panel is on the side, then return the larger minwidth
        const panelOnSide = panelPosition === 0 /* Position.LEFT */ || panelPosition === 1 /* Position.RIGHT */;
        if (panelOnSide) {
            return WindowMinimumSize.WIDTH_WITH_VERTICAL_PANEL;
        }
        return WindowMinimumSize.WIDTH;
    }
    onDidChangePanelPosition(pos) {
        const minWidth = this.getWindowMinimumWidth(pos);
        this.nativeHostService.setMinimumSize(minWidth, undefined);
    }
    maybeCloseWindow() {
        const closeWhenEmpty = this.configurationService.getValue('window.closeWhenEmpty') || this.nativeEnvironmentService.args.wait;
        if (!closeWhenEmpty) {
            return; // return early if configured to not close when empty
        }
        // Close empty editor groups based on setting and environment
        for (const editorPart of this.editorGroupService.parts) {
            if (editorPart.groups.some(group => !group.isEmpty)) {
                continue; // not empty
            }
            if (editorPart === this.editorGroupService.mainPart && (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ || // only for empty windows
                this.environmentService.isExtensionDevelopment || // not when developing an extension
                this.editorService.visibleEditors.length > 0 // not when there are still editors open in other windows
            )) {
                continue;
            }
            if (editorPart === this.editorGroupService.mainPart) {
                this.nativeHostService.closeWindow();
            }
            else {
                editorPart.removeGroup(editorPart.activeGroup);
            }
        }
    }
    provideCustomTitleContextMenu(filePath) {
        // Clear old menu
        this.customTitleContextMenuDisposable.clear();
        // Only provide a menu when we have a file path and custom titlebar
        if (!filePath || hasNativeTitlebar(this.configurationService)) {
            return;
        }
        // Split up filepath into segments
        const segments = filePath.split(posix.sep);
        for (let i = segments.length; i > 0; i--) {
            const isFile = (i === segments.length);
            let pathOffset = i;
            if (!isFile) {
                pathOffset++; // for segments which are not the file name we want to open the folder
            }
            const path = URI.file(segments.slice(0, pathOffset).join(posix.sep));
            let label;
            if (!isFile) {
                label = this.labelService.getUriBasenameLabel(dirname(path));
            }
            else {
                label = this.labelService.getUriBasenameLabel(path);
            }
            const commandId = `workbench.action.revealPathInFinder${i}`;
            this.customTitleContextMenuDisposable.add(CommandsRegistry.registerCommand(commandId, () => this.nativeHostService.showItemInFolder(path.fsPath)));
            this.customTitleContextMenuDisposable.add(MenuRegistry.appendMenuItem(MenuId.TitleBarTitleContext, { command: { id: commandId, title: label || posix.sep }, order: -i, group: '1_file' }));
        }
    }
    create() {
        // Handle open calls
        this.setupOpenHandlers();
        // Notify some services about lifecycle phases
        this.lifecycleService.when(2 /* LifecyclePhase.Ready */).then(() => this.nativeHostService.notifyReady());
        this.lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            this.sharedProcessService.notifyRestored();
            this.utilityProcessWorkerWorkbenchService.notifyRestored();
        });
        // Check for situations that are worth warning the user about
        this.handleWarnings();
        // Touchbar menu (if enabled)
        this.updateTouchbarMenu();
        // Smoke Test Driver
        if (this.environmentService.enableSmokeTestDriver) {
            registerWindowDriver(this.instantiationService);
        }
    }
    async handleWarnings() {
        // After restored phase is fine for the following ones
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Integrity / Root warning
        (async () => {
            const isAdmin = await this.nativeHostService.isAdmin();
            const { isPure } = await this.integrityService.isPure();
            // Update to title
            this.titleService.updateProperties({ isPure, isAdmin });
            // Show warning message (unix only)
            if (isAdmin && !isWindows) {
                this.notificationService.warn(localize('runningAsRoot', "It is not recommended to run {0} as root user.", this.productService.nameShort));
            }
        })();
        // Installation Dir Warning
        if (this.environmentService.isBuilt && !this.environmentService.extensionDevelopmentLocationURI?.length) {
            let installLocationUri;
            if (isMacintosh) {
                // appRoot = /Applications/Visual Studio Code - Insiders.app/Contents/Resources/app
                installLocationUri = dirname(dirname(dirname(URI.file(this.nativeEnvironmentService.appRoot))));
            }
            else {
                // appRoot = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app
                // appRoot = /usr/share/code-insiders/resources/app
                installLocationUri = dirname(dirname(URI.file(this.nativeEnvironmentService.appRoot)));
            }
            for (const folder of this.contextService.getWorkspace().folders) {
                if (this.uriIdentityService.extUri.isEqualOrParent(folder.uri, installLocationUri)) {
                    this.bannerService.show({
                        id: 'appRootWarning.banner',
                        message: localize('appRootWarning.banner', "Files you store within the installation folder ('{0}') may be OVERWRITTEN or DELETED IRREVERSIBLY without warning at update time.", this.labelService.getUriLabel(installLocationUri)),
                        icon: Codicon.warning
                    });
                    break;
                }
            }
        }
        // Slow shell environment progress indicator
        const shellEnv = process.shellEnv();
        this.progressService.withProgress({
            title: localize('resolveShellEnvironment', "Resolving shell environment..."),
            location: 10 /* ProgressLocation.Window */,
            delay: 1600,
            buttons: [localize('learnMore', "Learn More")]
        }, () => shellEnv, () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2149667'));
    }
    async resolveExternalUri(uri, options) {
        let queryTunnel;
        if (options?.allowTunneling) {
            const portMappingRequest = extractLocalHostUriMetaDataForPortMapping(uri);
            const queryPortMapping = extractQueryLocalHostUriMetaDataForPortMapping(uri);
            if (queryPortMapping) {
                queryTunnel = await this.openTunnel(queryPortMapping.address, queryPortMapping.port);
                if (queryTunnel && (typeof queryTunnel !== 'string')) {
                    // If the tunnel was mapped to a different port, dispose it, because some services
                    // validate the port number in the query string.
                    if (queryTunnel.tunnelRemotePort !== queryPortMapping.port) {
                        queryTunnel.dispose();
                        queryTunnel = undefined;
                    }
                    else {
                        if (!portMappingRequest) {
                            const tunnel = queryTunnel;
                            return {
                                resolved: uri,
                                dispose: () => tunnel.dispose()
                            };
                        }
                    }
                }
            }
            if (portMappingRequest) {
                const tunnel = await this.openTunnel(portMappingRequest.address, portMappingRequest.port);
                if (tunnel && (typeof tunnel !== 'string')) {
                    const addressAsUri = URI.parse(tunnel.localAddress).with({ path: uri.path });
                    const resolved = addressAsUri.scheme.startsWith(uri.scheme) ? addressAsUri : uri.with({ authority: tunnel.localAddress });
                    return {
                        resolved,
                        dispose() {
                            tunnel.dispose();
                            if (queryTunnel && (typeof queryTunnel !== 'string')) {
                                queryTunnel.dispose();
                            }
                        }
                    };
                }
            }
        }
        if (!options?.openExternal) {
            const canHandleResource = await this.fileService.canHandleResource(uri);
            if (canHandleResource) {
                return {
                    resolved: URI.from({
                        scheme: this.productService.urlProtocol,
                        path: 'workspace',
                        query: uri.toString()
                    }),
                    dispose() { }
                };
            }
        }
        return undefined;
    }
    async openTunnel(address, port) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        const addressProvider = remoteAuthority ? {
            getAddress: async () => {
                return (await this.remoteAuthorityResolverService.resolveAuthority(remoteAuthority)).authority;
            }
        } : undefined;
        const tunnel = await this.tunnelService.getExistingTunnel(address, port);
        if (!tunnel || (typeof tunnel === 'string')) {
            return this.tunnelService.openTunnel(addressProvider, address, port);
        }
        return tunnel;
    }
    setupOpenHandlers() {
        // Handle external open() calls
        this.openerService.setDefaultExternalOpener({
            openExternal: async (href) => {
                const success = await this.nativeHostService.openExternal(href, this.configurationService.getValue('workbench.externalBrowser'));
                if (!success) {
                    const fileCandidate = URI.parse(href);
                    if (fileCandidate.scheme === Schemas.file) {
                        // if opening failed, and this is a file, we can still try to reveal it
                        await this.nativeHostService.showItemInFolder(fileCandidate.fsPath);
                    }
                }
                return true;
            }
        });
        // Register external URI resolver
        this.openerService.registerExternalUriResolver({
            resolveExternalUri: async (uri, options) => {
                return this.resolveExternalUri(uri, options);
            }
        });
    }
    updateTouchbarMenu() {
        if (!isMacintosh) {
            return; // macOS only
        }
        // Dispose old
        this.touchBarDisposables.clear();
        this.touchBarMenu = undefined;
        // Create new (delayed)
        const scheduler = this.touchBarDisposables.add(new RunOnceScheduler(() => this.doUpdateTouchbarMenu(scheduler), 300));
        scheduler.schedule();
    }
    doUpdateTouchbarMenu(scheduler) {
        if (!this.touchBarMenu) {
            const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService || this.editorGroupService.activeGroup.scopedContextKeyService;
            this.touchBarMenu = this.menuService.createMenu(MenuId.TouchBarContext, scopedContextKeyService);
            this.touchBarDisposables.add(this.touchBarMenu);
            this.touchBarDisposables.add(this.touchBarMenu.onDidChange(() => scheduler.schedule()));
        }
        const disabled = this.configurationService.getValue('keyboard.touchbar.enabled') === false;
        const touchbarIgnored = this.configurationService.getValue('keyboard.touchbar.ignored');
        const ignoredItems = Array.isArray(touchbarIgnored) ? touchbarIgnored : [];
        // Fill actions into groups respecting order
        const actions = getFlatActionBarActions(this.touchBarMenu.getActions());
        // Convert into command action multi array
        const items = [];
        let group = [];
        if (!disabled) {
            for (const action of actions) {
                // Command
                if (action instanceof MenuItemAction) {
                    if (ignoredItems.indexOf(action.item.id) >= 0) {
                        continue; // ignored
                    }
                    group.push(action.item);
                }
                // Separator
                else if (action instanceof Separator) {
                    if (group.length) {
                        items.push(group);
                    }
                    group = [];
                }
            }
            if (group.length) {
                items.push(group);
            }
        }
        // Only update if the actions have changed
        if (!equals(this.lastInstalledTouchedBar, items)) {
            this.lastInstalledTouchedBar = items;
            this.nativeHostService.updateTouchBar(items);
        }
    }
    //#endregion
    onAddRemoveFoldersRequest(request) {
        // Buffer all pending requests
        this.pendingFoldersToAdd.push(...request.foldersToAdd.map(folder => URI.revive(folder)));
        this.pendingFoldersToRemove.push(...request.foldersToRemove.map(folder => URI.revive(folder)));
        // Delay the adding of folders a bit to buffer in case more requests are coming
        if (!this.addRemoveFoldersScheduler.isScheduled()) {
            this.addRemoveFoldersScheduler.schedule();
        }
    }
    async doAddRemoveFolders() {
        const foldersToAdd = this.pendingFoldersToAdd.map(folder => ({ uri: folder }));
        const foldersToRemove = this.pendingFoldersToRemove.slice(0);
        this.pendingFoldersToAdd = [];
        this.pendingFoldersToRemove = [];
        if (foldersToAdd.length) {
            await this.workspaceEditingService.addFolders(foldersToAdd);
        }
        if (foldersToRemove.length) {
            await this.workspaceEditingService.removeFolders(foldersToRemove);
        }
    }
    async onOpenFiles(request) {
        const diffMode = !!(request.filesToDiff && (request.filesToDiff.length === 2));
        const mergeMode = !!(request.filesToMerge && (request.filesToMerge.length === 4));
        const inputs = coalesce(await pathsToEditors(mergeMode ? request.filesToMerge : diffMode ? request.filesToDiff : request.filesToOpenOrCreate, this.fileService, this.logService));
        if (inputs.length) {
            const openedEditorPanes = await this.openResources(inputs, diffMode, mergeMode);
            if (request.filesToWait) {
                // In wait mode, listen to changes to the editors and wait until the files
                // are closed that the user wants to wait for. When this happens we delete
                // the wait marker file to signal to the outside that editing is done.
                // However, it is possible that opening of the editors failed, as such we
                // check for whether editor panes got opened and otherwise delete the marker
                // right away.
                if (openedEditorPanes.length) {
                    return this.trackClosedWaitFiles(URI.revive(request.filesToWait.waitMarkerFileUri), coalesce(request.filesToWait.paths.map(path => URI.revive(path.fileUri))));
                }
                else {
                    return this.fileService.del(URI.revive(request.filesToWait.waitMarkerFileUri));
                }
            }
        }
    }
    async trackClosedWaitFiles(waitMarkerFile, resourcesToWaitFor) {
        // Wait for the resources to be closed in the text editor...
        await this.instantiationService.invokeFunction(accessor => whenEditorClosed(accessor, resourcesToWaitFor));
        // ...before deleting the wait marker file
        await this.fileService.del(waitMarkerFile);
    }
    async openResources(resources, diffMode, mergeMode) {
        const editors = [];
        if (mergeMode && isResourceEditorInput(resources[0]) && isResourceEditorInput(resources[1]) && isResourceEditorInput(resources[2]) && isResourceEditorInput(resources[3])) {
            const mergeEditor = {
                input1: { resource: resources[0].resource },
                input2: { resource: resources[1].resource },
                base: { resource: resources[2].resource },
                result: { resource: resources[3].resource },
                options: { pinned: true }
            };
            editors.push(mergeEditor);
        }
        else if (diffMode && isResourceEditorInput(resources[0]) && isResourceEditorInput(resources[1])) {
            const diffEditor = {
                original: { resource: resources[0].resource },
                modified: { resource: resources[1].resource },
                options: { pinned: true }
            };
            editors.push(diffEditor);
        }
        else {
            editors.push(...resources);
        }
        return this.editorService.openEditors(editors, undefined, { validateTrust: true });
    }
    resolveConfiguredWindowZoomLevel() {
        const windowZoomLevel = this.configurationService.getValue('window.zoomLevel');
        return typeof windowZoomLevel === 'number' ? windowZoomLevel : 0;
    }
    handleOnDidChangeZoomLevel(targetWindowId) {
        // Zoom status entry
        this.updateWindowZoomStatusEntry(targetWindowId);
        // Notify main process about a custom zoom level
        if (targetWindowId === mainWindow.vscodeWindowId) {
            const currentWindowZoomLevel = getZoomLevel(mainWindow);
            let notifyZoomLevel = undefined;
            if (this.configuredWindowZoomLevel !== currentWindowZoomLevel) {
                notifyZoomLevel = currentWindowZoomLevel;
            }
            ipcRenderer.invoke('vscode:notifyZoomLevel', notifyZoomLevel);
        }
    }
    createWindowZoomStatusEntry(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        this.mapWindowIdToZoomStatusEntry.set(part.windowId, disposables.add(scopedInstantiationService.createInstance(ZoomStatusEntry)));
        disposables.add(toDisposable(() => this.mapWindowIdToZoomStatusEntry.delete(part.windowId)));
        this.updateWindowZoomStatusEntry(part.windowId);
    }
    updateWindowZoomStatusEntry(targetWindowId) {
        const targetWindow = getWindowById(targetWindowId);
        const entry = this.mapWindowIdToZoomStatusEntry.get(targetWindowId);
        if (entry && targetWindow) {
            const currentZoomLevel = getZoomLevel(targetWindow.window);
            let text = undefined;
            if (currentZoomLevel < this.configuredWindowZoomLevel) {
                text = '$(zoom-out)';
            }
            else if (currentZoomLevel > this.configuredWindowZoomLevel) {
                text = '$(zoom-in)';
            }
            entry.updateZoomEntry(text ?? false, targetWindowId);
        }
    }
    onDidChangeConfiguredWindowZoomLevel() {
        this.configuredWindowZoomLevel = this.resolveConfiguredWindowZoomLevel();
        let applyZoomLevel = false;
        for (const { window } of getWindows()) {
            if (getZoomLevel(window) !== this.configuredWindowZoomLevel) {
                applyZoomLevel = true;
                break;
            }
        }
        if (applyZoomLevel) {
            applyZoom(this.configuredWindowZoomLevel, ApplyZoomTarget.ALL_WINDOWS);
        }
        for (const [windowId] of this.mapWindowIdToZoomStatusEntry) {
            this.updateWindowZoomStatusEntry(windowId);
        }
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, entry] of this.mapWindowIdToZoomStatusEntry) {
            entry.dispose();
        }
    }
};
NativeWindow = NativeWindow_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ITitleService),
    __param(4, IWorkbenchThemeService),
    __param(5, INotificationService),
    __param(6, ICommandService),
    __param(7, IKeybindingService),
    __param(8, ITelemetryService),
    __param(9, IWorkspaceEditingService),
    __param(10, IFileService),
    __param(11, IMenuService),
    __param(12, ILifecycleService),
    __param(13, IIntegrityService),
    __param(14, INativeWorkbenchEnvironmentService),
    __param(15, IAccessibilityService),
    __param(16, IWorkspaceContextService),
    __param(17, IOpenerService),
    __param(18, INativeHostService),
    __param(19, ITunnelService),
    __param(20, IWorkbenchLayoutService),
    __param(21, IWorkingCopyService),
    __param(22, IFilesConfigurationService),
    __param(23, IProductService),
    __param(24, IRemoteAuthorityResolverService),
    __param(25, IDialogService),
    __param(26, IStorageService),
    __param(27, ILogService),
    __param(28, IInstantiationService),
    __param(29, ISharedProcessService),
    __param(30, IProgressService),
    __param(31, ILabelService),
    __param(32, IBannerService),
    __param(33, IUriIdentityService),
    __param(34, IPreferencesService),
    __param(35, IUtilityProcessWorkerWorkbenchService),
    __param(36, IHostService)
], NativeWindow);
export { NativeWindow };
let ZoomStatusEntry = class ZoomStatusEntry extends Disposable {
    constructor(statusbarService, commandService, keybindingService) {
        super();
        this.statusbarService = statusbarService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        this.disposable = this._register(new MutableDisposable());
        this.zoomLevelLabel = undefined;
    }
    updateZoomEntry(visibleOrText, targetWindowId) {
        if (typeof visibleOrText === 'string') {
            if (!this.disposable.value) {
                this.createZoomEntry(visibleOrText);
            }
            this.updateZoomLevelLabel(targetWindowId);
        }
        else {
            this.disposable.clear();
        }
    }
    createZoomEntry(visibleOrText) {
        const disposables = new DisposableStore();
        this.disposable.value = disposables;
        const container = $('.zoom-status');
        const left = $('.zoom-status-left');
        container.appendChild(left);
        const zoomOutAction = disposables.add(new Action('workbench.action.zoomOut', localize('zoomOut', "Zoom Out"), ThemeIcon.asClassName(Codicon.remove), true, () => this.commandService.executeCommand(zoomOutAction.id)));
        const zoomInAction = disposables.add(new Action('workbench.action.zoomIn', localize('zoomIn', "Zoom In"), ThemeIcon.asClassName(Codicon.plus), true, () => this.commandService.executeCommand(zoomInAction.id)));
        const zoomResetAction = disposables.add(new Action('workbench.action.zoomReset', localize('zoomReset', "Reset"), undefined, true, () => this.commandService.executeCommand(zoomResetAction.id)));
        zoomResetAction.tooltip = localize('zoomResetLabel', "{0} ({1})", zoomResetAction.label, this.keybindingService.lookupKeybinding(zoomResetAction.id)?.getLabel());
        const zoomSettingsAction = disposables.add(new Action('workbench.action.openSettings', localize('zoomSettings', "Settings"), ThemeIcon.asClassName(Codicon.settingsGear), true, () => this.commandService.executeCommand(zoomSettingsAction.id, 'window.zoom')));
        const zoomLevelLabel = disposables.add(new Action('zoomLabel', undefined, undefined, false));
        this.zoomLevelLabel = zoomLevelLabel;
        disposables.add(toDisposable(() => this.zoomLevelLabel = undefined));
        const actionBarLeft = disposables.add(new ActionBar(left, { hoverDelegate: nativeHoverDelegate }));
        actionBarLeft.push(zoomOutAction, { icon: true, label: false, keybinding: this.keybindingService.lookupKeybinding(zoomOutAction.id)?.getLabel() });
        actionBarLeft.push(this.zoomLevelLabel, { icon: false, label: true });
        actionBarLeft.push(zoomInAction, { icon: true, label: false, keybinding: this.keybindingService.lookupKeybinding(zoomInAction.id)?.getLabel() });
        const right = $('.zoom-status-right');
        container.appendChild(right);
        const actionBarRight = disposables.add(new ActionBar(right, { hoverDelegate: nativeHoverDelegate }));
        actionBarRight.push(zoomResetAction, { icon: false, label: true });
        actionBarRight.push(zoomSettingsAction, { icon: true, label: false, keybinding: this.keybindingService.lookupKeybinding(zoomSettingsAction.id)?.getLabel() });
        const name = localize('status.windowZoom', "Window Zoom");
        disposables.add(this.statusbarService.addEntry({
            name,
            text: visibleOrText,
            tooltip: container,
            ariaLabel: name,
            command: ShowTooltipCommand,
            kind: 'prominent'
        }, 'status.windowZoom', 1 /* StatusbarAlignment.RIGHT */, 102));
    }
    updateZoomLevelLabel(targetWindowId) {
        if (this.zoomLevelLabel) {
            const targetWindow = getWindowById(targetWindowId, true).window;
            const zoomFactor = Math.round(getZoomFactor(targetWindow) * 100);
            const zoomLevel = getZoomLevel(targetWindow);
            this.zoomLevelLabel.label = `${zoomLevel}`;
            this.zoomLevelLabel.tooltip = localize('zoomNumber', "Zoom Level: {0} ({1}%)", zoomLevel, zoomFactor);
        }
    }
};
ZoomStatusEntry = __decorate([
    __param(0, IStatusbarService),
    __param(1, ICommandService),
    __param(2, IKeybindingService)
], ZoomStatusEntry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tYnJvd3Nlci93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pLLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUF1RSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQW9DLGdCQUFnQixFQUFFLGNBQWMsRUFBOEQscUJBQXFCLEVBQTZCLE1BQU0scUJBQXFCLENBQUM7QUFDL08sT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBNEksaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4TyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENB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