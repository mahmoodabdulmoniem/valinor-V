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
import { Event } from '../../../base/common/event.js';
import { workbenchInstantiationService as browserWorkbenchInstantiationService, TestEncodingOracle, TestEnvironmentService, TestLifecycleService } from '../browser/workbenchTestServices.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { AbstractNativeExtensionTipsService } from '../../../platform/extensionManagement/common/extensionTipsService.js';
import { IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { NativeTextFileService } from '../../services/textfile/electron-browser/nativeTextFileService.js';
import { insert } from '../../../base/common/arrays.js';
import { Schemas } from '../../../base/common/network.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../platform/log/common/log.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { NativeWorkingCopyBackupService } from '../../services/workingCopy/electron-browser/workingCopyBackupService.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
export class TestSharedProcessService {
    createRawConnection() { throw new Error('Not Implemented'); }
    getChannel(channelName) { return undefined; }
    registerChannel(channelName, channel) { }
    notifyRestored() { }
}
export class TestNativeHostService {
    constructor() {
        this.windowId = -1;
        this.onDidOpenMainWindow = Event.None;
        this.onDidMaximizeWindow = Event.None;
        this.onDidUnmaximizeWindow = Event.None;
        this.onDidFocusMainWindow = Event.None;
        this.onDidBlurMainWindow = Event.None;
        this.onDidFocusMainOrAuxiliaryWindow = Event.None;
        this.onDidBlurMainOrAuxiliaryWindow = Event.None;
        this.onDidResumeOS = Event.None;
        this.onDidChangeColorScheme = Event.None;
        this.onDidChangePassword = Event.None;
        this.onDidTriggerWindowSystemContextMenu = Event.None;
        this.onDidChangeWindowFullScreen = Event.None;
        this.onDidChangeWindowAlwaysOnTop = Event.None;
        this.onDidChangeDisplay = Event.None;
        this.windowCount = Promise.resolve(1);
    }
    getWindowCount() { return this.windowCount; }
    async getWindows() { return []; }
    async getActiveWindowId() { return undefined; }
    async getActiveWindowPosition() { return undefined; }
    async getNativeWindowHandle(windowId) { return undefined; }
    openWindow(arg1, arg2) {
        throw new Error('Method not implemented.');
    }
    async toggleFullScreen() { }
    async isMaximized() { return true; }
    async isFullScreen() { return true; }
    async maximizeWindow() { }
    async unmaximizeWindow() { }
    async minimizeWindow() { }
    async moveWindowTop(options) { }
    async isWindowAlwaysOnTop(options) { return false; }
    async toggleWindowAlwaysOnTop(options) { }
    async setWindowAlwaysOnTop(alwaysOnTop, options) { }
    async getCursorScreenPoint() { throw new Error('Method not implemented.'); }
    async positionWindow(position, options) { }
    async updateWindowControls(options) { }
    async setMinimumSize(width, height) { }
    async saveWindowSplash(value) { }
    async setBackgroundThrottling(throttling) { }
    async focusWindow(options) { }
    async showMessageBox(options) { throw new Error('Method not implemented.'); }
    async showSaveDialog(options) { throw new Error('Method not implemented.'); }
    async showOpenDialog(options) { throw new Error('Method not implemented.'); }
    async pickFileFolderAndOpen(options) { }
    async pickFileAndOpen(options) { }
    async pickFolderAndOpen(options) { }
    async pickWorkspaceAndOpen(options) { }
    async showItemInFolder(path) { }
    async setRepresentedFilename(path) { }
    async isAdmin() { return false; }
    async writeElevated(source, target) { }
    async isRunningUnderARM64Translation() { return false; }
    async getOSProperties() { return Object.create(null); }
    async getOSStatistics() { return Object.create(null); }
    async getOSVirtualMachineHint() { return 0; }
    async getOSColorScheme() { return { dark: true, highContrast: false }; }
    async hasWSLFeatureInstalled() { return false; }
    async getProcessId() { throw new Error('Method not implemented.'); }
    async killProcess() { }
    async setDocumentEdited(edited) { }
    async openExternal(url, defaultApplication) { return false; }
    async updateTouchBar() { }
    async moveItemToTrash() { }
    async newWindowTab() { }
    async showPreviousWindowTab() { }
    async showNextWindowTab() { }
    async moveWindowTabToNewWindow() { }
    async mergeAllWindowTabs() { }
    async toggleWindowTabsBar() { }
    async installShellCommand() { }
    async uninstallShellCommand() { }
    async notifyReady() { }
    async relaunch(options) { }
    async reload() { }
    async closeWindow() { }
    async quit() { }
    async exit(code) { }
    async openDevTools(options) { }
    async toggleDevTools() { }
    async stopTracing() { }
    async openGPUInfoWindow() { }
    async resolveProxy(url) { return undefined; }
    async lookupAuthorization(authInfo) { return undefined; }
    async lookupKerberosAuthorization(url) { return undefined; }
    async loadCertificates() { return []; }
    async isPortFree() { return Promise.resolve(true); }
    async findFreePort(startPort, giveUpAfter, timeout, stride) { return -1; }
    async readClipboardText(type) { return ''; }
    async writeClipboardText(text, type) { }
    async readClipboardFindText() { return ''; }
    async writeClipboardFindText(text) { }
    async writeClipboardBuffer(format, buffer, type) { }
    async triggerPaste(options) { }
    async readImage() { return Uint8Array.from([]); }
    async readClipboardBuffer(format) { return VSBuffer.wrap(Uint8Array.from([])); }
    async hasClipboard(format, type) { return false; }
    async windowsGetStringRegKey(hive, path, name) { return undefined; }
    async profileRenderer() { throw new Error(); }
    async getScreenshot(rect) { return undefined; }
}
let TestExtensionTipsService = class TestExtensionTipsService extends AbstractNativeExtensionTipsService {
    constructor(environmentService, telemetryService, extensionManagementService, storageService, nativeHostService, extensionRecommendationNotificationService, fileService, productService) {
        super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
    }
};
TestExtensionTipsService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IExtensionManagementService),
    __param(3, IStorageService),
    __param(4, INativeHostService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IFileService),
    __param(7, IProductService)
], TestExtensionTipsService);
export { TestExtensionTipsService };
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = browserWorkbenchInstantiationService({
        workingCopyBackupService: () => disposables.add(new TestNativeWorkingCopyBackupService()),
        ...overrides
    }, disposables);
    instantiationService.stub(INativeHostService, new TestNativeHostService());
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, filesConfigurationService, contextService, modelService, fileService, nativeHostService, fileDialogService, workingCopyBackupService, workingCopyService, editorService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
        this.fileDialogService = fileDialogService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, IFilesConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, INativeHostService),
    __param(7, IFileDialogService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IWorkingCopyService),
    __param(10, IEditorService)
], TestServiceAccessor);
export { TestServiceAccessor };
export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestNativeWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor() {
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        super(environmentService, fileService, logService, lifecycleService);
        const inMemoryFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.inMemory, inMemoryFileSystemProvider));
        const uriIdentityService = this._register(new UriIdentityService(fileService));
        const userDataProfilesService = this._register(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this._register(fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, inMemoryFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
        this._register(fileService);
        this._register(lifecycleService);
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9lbGVjdHJvbi1icm93c2VyL3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLDZCQUE2QixJQUFJLG9DQUFvQyxFQUE2QixrQkFBa0IsRUFBRSxzQkFBc0IsRUFBeUUsb0JBQW9CLEVBQXVCLE1BQU0scUNBQXFDLENBQUM7QUFFclQsT0FBTyxFQUFFLGtCQUFrQixFQUFvRCxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxRQUFRLEVBQTRDLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxrQkFBa0IsRUFBNEIsTUFBTSw2Q0FBNkMsQ0FBQztBQUszRyxPQUFPLEVBQXVCLHlCQUF5QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUcvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNsSCxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUM1SSxPQUFPLEVBQUUsZUFBZSxFQUFF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