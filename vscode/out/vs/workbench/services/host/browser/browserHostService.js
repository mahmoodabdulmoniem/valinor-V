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
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHostService } from './host.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isFolderToOpen, isWorkspaceToOpen, isFileToOpen } from '../../../../platform/window/common/window.js';
import { isResourceEditorInput, pathsToEditors } from '../../../common/editor.js';
import { whenEditorClosed } from '../../../browser/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { EventType, ModifierKeyEmitter, addDisposableListener, addDisposableThrottledListener, detectFullscreen, disposableWindowInterval, getActiveDocument, getWindowId, onDidRegisterWindow, trackFocus } from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { parseLineAndColumnAware } from '../../../../base/common/extpath.js';
import { IWorkspaceEditingService } from '../../workspaces/common/workspaceEditing.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getWorkspaceIdentifier } from '../../workspaces/browser/workspaces.js';
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { isUndefined } from '../../../../base/common/types.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { mainWindow, isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { isIOS, isMacintosh } from '../../../../base/common/platform.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
var HostShutdownReason;
(function (HostShutdownReason) {
    /**
     * An unknown shutdown reason.
     */
    HostShutdownReason[HostShutdownReason["Unknown"] = 1] = "Unknown";
    /**
     * A shutdown that was potentially triggered by keyboard use.
     */
    HostShutdownReason[HostShutdownReason["Keyboard"] = 2] = "Keyboard";
    /**
     * An explicit shutdown via code.
     */
    HostShutdownReason[HostShutdownReason["Api"] = 3] = "Api";
})(HostShutdownReason || (HostShutdownReason = {}));
let BrowserHostService = class BrowserHostService extends Disposable {
    constructor(layoutService, configurationService, fileService, labelService, environmentService, instantiationService, lifecycleService, logService, dialogService, contextService, userDataProfilesService) {
        super();
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.userDataProfilesService = userDataProfilesService;
        this.shutdownReason = HostShutdownReason.Unknown;
        if (environmentService.options?.workspaceProvider) {
            this.workspaceProvider = environmentService.options.workspaceProvider;
        }
        else {
            this.workspaceProvider = new class {
                constructor() {
                    this.workspace = undefined;
                    this.trusted = undefined;
                }
                async open() { return true; }
            };
        }
        this.registerListeners();
    }
    registerListeners() {
        // Veto shutdown depending on `window.confirmBeforeClose` setting
        this._register(this.lifecycleService.onBeforeShutdown(e => this.onBeforeShutdown(e)));
        // Track modifier keys to detect keybinding usage
        this._register(ModifierKeyEmitter.getInstance().event(() => this.updateShutdownReasonFromEvent()));
    }
    onBeforeShutdown(e) {
        switch (this.shutdownReason) {
            // Unknown / Keyboard shows veto depending on setting
            case HostShutdownReason.Unknown:
            case HostShutdownReason.Keyboard: {
                const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
                if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && this.shutdownReason === HostShutdownReason.Keyboard)) {
                    e.veto(true, 'veto.confirmBeforeClose');
                }
                break;
            }
            // Api never shows veto
            case HostShutdownReason.Api:
                break;
        }
        // Unset for next shutdown
        this.shutdownReason = HostShutdownReason.Unknown;
    }
    updateShutdownReasonFromEvent() {
        if (this.shutdownReason === HostShutdownReason.Api) {
            return; // do not overwrite any explicitly set shutdown reason
        }
        if (ModifierKeyEmitter.getInstance().isModifierPressed) {
            this.shutdownReason = HostShutdownReason.Keyboard;
        }
        else {
            this.shutdownReason = HostShutdownReason.Unknown;
        }
    }
    //#region Focus
    get onDidChangeFocus() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const focusTracker = disposables.add(trackFocus(window));
            const visibilityTracker = disposables.add(new DomEmitter(window.document, 'visibilitychange'));
            Event.any(Event.map(focusTracker.onDidFocus, () => this.hasFocus, disposables), Event.map(focusTracker.onDidBlur, () => this.hasFocus, disposables), Event.map(visibilityTracker.event, () => this.hasFocus, disposables), Event.map(this.onDidChangeActiveWindow, () => this.hasFocus, disposables))(focus => emitter.fire(focus), undefined, disposables);
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get hasFocus() {
        return getActiveDocument().hasFocus();
    }
    async hadLastFocus() {
        return true;
    }
    async focus(targetWindow) {
        targetWindow.focus();
    }
    //#endregion
    //#region Window
    get onDidChangeActiveWindow() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            // Emit via focus tracking
            const focusTracker = disposables.add(trackFocus(window));
            disposables.add(focusTracker.onDidFocus(() => emitter.fire(windowId)));
            // Emit via interval: immediately when opening an auxiliary window,
            // it is possible that document focus has not yet changed, so we
            // poll for a while to ensure we catch the event.
            if (isAuxiliaryWindow(window)) {
                disposables.add(disposableWindowInterval(window, () => {
                    const hasFocus = window.document.hasFocus();
                    if (hasFocus) {
                        emitter.fire(windowId);
                    }
                    return hasFocus;
                }, 100, 20));
            }
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get onDidChangeFullScreen() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            const viewport = isIOS && window.visualViewport ? window.visualViewport /** Visual viewport */ : window /** Layout viewport */;
            // Fullscreen (Browser)
            for (const event of [EventType.FULLSCREEN_CHANGE, EventType.WK_FULLSCREEN_CHANGE]) {
                disposables.add(addDisposableListener(window.document, event, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) })));
            }
            // Fullscreen (Native)
            disposables.add(addDisposableThrottledListener(viewport, EventType.RESIZE, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) }), undefined, isMacintosh ? 2000 /* adjust for macOS animation */ : 800 /* can be throttled */));
        }, { window: mainWindow, disposables: this._store }));
        return emitter.event;
    }
    openWindow(arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(arg1, arg2);
        }
        return this.doOpenEmptyWindow(arg1);
    }
    async doOpenWindow(toOpen, options) {
        const payload = this.preservePayload(false /* not an empty window */, options);
        const fileOpenables = [];
        const foldersToAdd = [];
        const foldersToRemove = [];
        for (const openable of toOpen) {
            openable.label = openable.label || this.getRecentLabel(openable);
            // Folder
            if (isFolderToOpen(openable)) {
                if (options?.addMode) {
                    foldersToAdd.push({ uri: openable.folderUri });
                }
                else if (options?.removeMode) {
                    foldersToRemove.push(openable.folderUri);
                }
                else {
                    this.doOpen({ folderUri: openable.folderUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
                }
            }
            // Workspace
            else if (isWorkspaceToOpen(openable)) {
                this.doOpen({ workspaceUri: openable.workspaceUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
            }
            // File (handled later in bulk)
            else if (isFileToOpen(openable)) {
                fileOpenables.push(openable);
            }
        }
        // Handle Folders to add or remove
        if (foldersToAdd.length > 0 || foldersToRemove.length > 0) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                if (foldersToAdd.length > 0) {
                    await workspaceEditingService.addFolders(foldersToAdd);
                }
                if (foldersToRemove.length > 0) {
                    await workspaceEditingService.removeFolders(foldersToRemove);
                }
            });
        }
        // Handle Files
        if (fileOpenables.length > 0) {
            this.withServices(async (accessor) => {
                const editorService = accessor.get(IEditorService);
                // Support mergeMode
                if (options?.mergeMode && fileOpenables.length === 4) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 4 || !isResourceEditorInput(editors[0]) || !isResourceEditorInput(editors[1]) || !isResourceEditorInput(editors[2]) || !isResourceEditorInput(editors[3])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            input1: { resource: editors[0].resource },
                            input2: { resource: editors[1].resource },
                            base: { resource: editors[2].resource },
                            result: { resource: editors[3].resource },
                            options: { pinned: true }
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('mergeFile1', editors[0].resource.toString());
                        environment.set('mergeFile2', editors[1].resource.toString());
                        environment.set('mergeFileBase', editors[2].resource.toString());
                        environment.set('mergeFileResult', editors[3].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Support diffMode
                else if (options?.diffMode && fileOpenables.length === 2) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 2 || !isResourceEditorInput(editors[0]) || !isResourceEditorInput(editors[1])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            original: { resource: editors[0].resource },
                            modified: { resource: editors[1].resource },
                            options: { pinned: true }
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('diffFileSecondary', editors[0].resource.toString());
                        environment.set('diffFilePrimary', editors[1].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Just open normally
                else {
                    for (const openable of fileOpenables) {
                        // Same Window: open via editor service in current window
                        if (this.shouldReuse(options, true /* file */)) {
                            let openables = [];
                            // Support: --goto parameter to open on line/col
                            if (options?.gotoLineMode) {
                                const pathColumnAware = parseLineAndColumnAware(openable.fileUri.path);
                                openables = [{
                                        fileUri: openable.fileUri.with({ path: pathColumnAware.path }),
                                        options: {
                                            selection: !isUndefined(pathColumnAware.line) ? { startLineNumber: pathColumnAware.line, startColumn: pathColumnAware.column || 1 } : undefined
                                        }
                                    }];
                            }
                            else {
                                openables = [openable];
                            }
                            editorService.openEditors(coalesce(await pathsToEditors(openables, this.fileService, this.logService)), undefined, { validateTrust: true });
                        }
                        // New Window: open into empty window
                        else {
                            const environment = new Map();
                            environment.set('openFile', openable.fileUri.toString());
                            if (options?.gotoLineMode) {
                                environment.set('gotoLineMode', 'true');
                            }
                            this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                        }
                    }
                }
                // Support wait mode
                const waitMarkerFileURI = options?.waitMarkerFileURI;
                if (waitMarkerFileURI) {
                    (async () => {
                        // Wait for the resources to be closed in the text editor...
                        const filesToWaitFor = [];
                        if (options.mergeMode) {
                            filesToWaitFor.push(fileOpenables[3].fileUri /* [3] is the resulting merge file */);
                        }
                        else {
                            filesToWaitFor.push(...fileOpenables.map(fileOpenable => fileOpenable.fileUri));
                        }
                        await this.instantiationService.invokeFunction(accessor => whenEditorClosed(accessor, filesToWaitFor));
                        // ...before deleting the wait marker file
                        await this.fileService.del(waitMarkerFileURI);
                    })();
                }
            });
        }
    }
    withServices(fn) {
        // Host service is used in a lot of contexts and some services
        // need to be resolved dynamically to avoid cyclic dependencies
        // (https://github.com/microsoft/vscode/issues/108522)
        this.instantiationService.invokeFunction(accessor => fn(accessor));
    }
    preservePayload(isEmptyWindow, options) {
        // Selectively copy payload: for now only extension debugging properties are considered
        const newPayload = new Array();
        if (!isEmptyWindow && this.environmentService.extensionDevelopmentLocationURI) {
            newPayload.push(['extensionDevelopmentPath', this.environmentService.extensionDevelopmentLocationURI.toString()]);
            if (this.environmentService.debugExtensionHost.debugId) {
                newPayload.push(['debugId', this.environmentService.debugExtensionHost.debugId]);
            }
            if (this.environmentService.debugExtensionHost.port) {
                newPayload.push(['inspect-brk-extensions', String(this.environmentService.debugExtensionHost.port)]);
            }
        }
        const newWindowProfile = options?.forceProfile
            ? this.userDataProfilesService.profiles.find(profile => profile.name === options?.forceProfile)
            : undefined;
        if (newWindowProfile && !newWindowProfile.isDefault) {
            newPayload.push(['profile', newWindowProfile.name]);
        }
        return newPayload.length ? newPayload : undefined;
    }
    getRecentLabel(openable) {
        if (isFolderToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(openable.folderUri, { verbose: 2 /* Verbosity.LONG */ });
        }
        if (isWorkspaceToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(getWorkspaceIdentifier(openable.workspaceUri), { verbose: 2 /* Verbosity.LONG */ });
        }
        return this.labelService.getUriLabel(openable.fileUri, { appendWorkspaceSuffix: true });
    }
    shouldReuse(options = Object.create(null), isFile) {
        if (options.waitMarkerFileURI) {
            return true; // always handle --wait in same window
        }
        const windowConfig = this.configurationService.getValue('window');
        const openInNewWindowConfig = isFile ? (windowConfig?.openFilesInNewWindow || 'off' /* default */) : (windowConfig?.openFoldersInNewWindow || 'default' /* default */);
        let openInNewWindow = (options.preferNewWindow || !!options.forceNewWindow) && !options.forceReuseWindow;
        if (!options.forceNewWindow && !options.forceReuseWindow && (openInNewWindowConfig === 'on' || openInNewWindowConfig === 'off')) {
            openInNewWindow = (openInNewWindowConfig === 'on');
        }
        return !openInNewWindow;
    }
    async doOpenEmptyWindow(options) {
        return this.doOpen(undefined, {
            reuse: options?.forceReuseWindow,
            payload: this.preservePayload(true /* empty window */, options)
        });
    }
    async doOpen(workspace, options) {
        // When we are in a temporary workspace and are asked to open a local folder
        // we swap that folder into the workspace to avoid a window reload. Access
        // to local resources is only possible without a window reload because it
        // needs user activation.
        if (workspace && isFolderToOpen(workspace) && workspace.folderUri.scheme === Schemas.file && isTemporaryWorkspace(this.contextService.getWorkspace())) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                await workspaceEditingService.updateFolders(0, this.contextService.getWorkspace().folders.length, [{ uri: workspace.folderUri }]);
            });
            return;
        }
        // We know that `workspaceProvider.open` will trigger a shutdown
        // with `options.reuse` so we handle this expected shutdown
        if (options?.reuse) {
            await this.handleExpectedShutdown(4 /* ShutdownReason.LOAD */);
        }
        const opened = await this.workspaceProvider.open(workspace, options);
        if (!opened) {
            await this.dialogService.prompt({
                type: Severity.Warning,
                message: workspace ?
                    localize('unableToOpenExternalWorkspace', "The browser blocked opening a new tab or window for '{0}'. Press 'Retry' to try again.", this.getRecentLabel(workspace)) :
                    localize('unableToOpenExternal', "The browser blocked opening a new tab or window. Press 'Retry' to try again."),
                custom: {
                    markdownDetails: [{ markdown: new MarkdownString(localize('unableToOpenWindowDetail', "Please allow pop-ups for this website in your [browser settings]({0}).", 'https://aka.ms/allow-vscode-popup'), true) }]
                },
                buttons: [
                    {
                        label: localize({ key: 'retry', comment: ['&& denotes a mnemonic'] }, "&&Retry"),
                        run: () => this.workspaceProvider.open(workspace, options)
                    }
                ],
                cancelButton: true
            });
        }
    }
    async toggleFullScreen(targetWindow) {
        const target = this.layoutService.getContainer(targetWindow);
        // Chromium
        if (targetWindow.document.fullscreen !== undefined) {
            if (!targetWindow.document.fullscreen) {
                try {
                    return await target.requestFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): requestFullscreen failed'); // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
                }
            }
            else {
                try {
                    return await targetWindow.document.exitFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): exitFullscreen failed');
                }
            }
        }
        // Safari and Edge 14 are all using webkit prefix
        if (targetWindow.document.webkitIsFullScreen !== undefined) {
            try {
                if (!targetWindow.document.webkitIsFullScreen) {
                    target.webkitRequestFullscreen(); // it's async, but doesn't return a real promise.
                }
                else {
                    targetWindow.document.webkitExitFullscreen(); // it's async, but doesn't return a real promise.
                }
            }
            catch {
                this.logService.warn('toggleFullScreen(): requestFullscreen/exitFullscreen failed');
            }
        }
    }
    async moveTop(targetWindow) {
        // There seems to be no API to bring a window to front in browsers
    }
    async getCursorScreenPoint() {
        return undefined;
    }
    //#endregion
    //#region Lifecycle
    async restart() {
        this.reload();
    }
    async reload() {
        await this.handleExpectedShutdown(3 /* ShutdownReason.RELOAD */);
        mainWindow.location.reload();
    }
    async close() {
        await this.handleExpectedShutdown(1 /* ShutdownReason.CLOSE */);
        mainWindow.close();
    }
    async withExpectedShutdown(expectedShutdownTask) {
        const previousShutdownReason = this.shutdownReason;
        try {
            this.shutdownReason = HostShutdownReason.Api;
            return await expectedShutdownTask();
        }
        finally {
            this.shutdownReason = previousShutdownReason;
        }
    }
    async handleExpectedShutdown(reason) {
        // Update shutdown reason in a way that we do
        // not show a dialog because this is a expected
        // shutdown.
        this.shutdownReason = HostShutdownReason.Api;
        // Signal shutdown reason to lifecycle
        return this.lifecycleService.withExpectedShutdown(reason);
    }
    //#endregion
    //#region Screenshots
    async getScreenshot() {
        // Gets a screenshot from the browser. This gets the screenshot via the browser's display
        // media API which will typically offer a picker of all available screens and windows for
        // the user to select. Using the video stream provided by the display media API, this will
        // capture a single frame of the video and convert it to a JPEG image.
        const store = new DisposableStore();
        // Create a video element to play the captured screen source
        const video = document.createElement('video');
        store.add(toDisposable(() => video.remove()));
        let stream;
        try {
            // Create a stream from the screen source (capture screen without audio)
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: true
            });
            // Set the stream as the source of the video element
            video.srcObject = stream;
            video.play();
            // Wait for the video to load properly before capturing the screenshot
            await Promise.all([
                new Promise(r => store.add(addDisposableListener(video, 'loadedmetadata', () => r()))),
                new Promise(r => store.add(addDisposableListener(video, 'canplaythrough', () => r())))
            ]);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return undefined;
            }
            // Draw the portion of the video (x, y) with the specified width and height
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert the canvas to a Blob (JPEG format), use .95 for quality
            const blob = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95));
            if (!blob) {
                throw new Error('Failed to create blob from canvas');
            }
            const buf = await blob.bytes();
            return VSBuffer.wrap(buf);
        }
        catch (error) {
            console.error('Error taking screenshot:', error);
            return undefined;
        }
        finally {
            store.dispose();
            if (stream) {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
            }
        }
    }
    async getBrowserId() {
        return undefined;
    }
    //#endregion
    //#region Native Handle
    async getNativeWindowHandle(_windowId) {
        return undefined;
    }
};
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeActiveWindow", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFullScreen", null);
BrowserHostService = __decorate([
    __param(0, ILayoutService),
    __param(1, IConfigurationService),
    __param(2, IFileService),
    __param(3, ILabelService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IInstantiationService),
    __param(6, ILifecycleService),
    __param(7, ILogService),
    __param(8, IDialogService),
    __param(9, IWorkspaceContextService),
    __param(10, IUserDataProfilesService)
], BrowserHostService);
export { BrowserHostService };
registerSingleton(IHostService, BrowserHostService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaG9zdC9icm93c2VyL2Jyb3dzZXJIb3N0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDekMsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUF3RCxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFtRCxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ROLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBYSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsOEJBQThCLEVBQUUsZ0JBQWdCLEVBQUUsd0JBQXdCLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxNQUFNLGlD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