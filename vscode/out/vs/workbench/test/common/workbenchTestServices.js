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
import { join } from '../../../base/common/path.js';
import { basename, isEqual, isEqualOrParent } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { isLinux, isMacintosh } from '../../../base/common/platform.js';
import { InMemoryStorageService } from '../../../platform/storage/common/storage.js';
import { NullExtensionService } from '../../services/extensions/common/extensions.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import product from '../../../platform/product/common/product.js';
import { AbstractLoggerService, LogLevel, NullLogger } from '../../../platform/log/common/log.js';
export class TestLoggerService extends AbstractLoggerService {
    constructor(logsHome) {
        super(LogLevel.Info, logsHome ?? URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    doCreateLogger() { return new NullLogger(); }
}
let TestTextResourcePropertiesService = class TestTextResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return (isLinux || isMacintosh) ? '\n' : '\r\n';
    }
};
TestTextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], TestTextResourcePropertiesService);
export { TestTextResourcePropertiesService };
export class TestContextService {
    get onDidChangeWorkspaceName() { return this._onDidChangeWorkspaceName.event; }
    get onWillChangeWorkspaceFolders() { return this._onWillChangeWorkspaceFolders.event; }
    get onDidChangeWorkspaceFolders() { return this._onDidChangeWorkspaceFolders.event; }
    get onDidChangeWorkbenchState() { return this._onDidChangeWorkbenchState.event; }
    constructor(workspace = TestWorkspace, options = null) {
        this.workspace = workspace;
        this.options = options || Object.create(null);
        this._onDidChangeWorkspaceName = new Emitter();
        this._onWillChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkbenchState = new Emitter();
    }
    getFolders() {
        return this.workspace ? this.workspace.folders : [];
    }
    getWorkbenchState() {
        if (this.workspace.configuration) {
            return 3 /* WorkbenchState.WORKSPACE */;
        }
        if (this.workspace.folders.length) {
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkspaceFolder(resource) {
        return this.workspace.getFolder(resource);
    }
    setWorkspace(workspace) {
        this.workspace = workspace;
    }
    getOptions() {
        return this.options;
    }
    updateOptions() { }
    isInsideWorkspace(resource) {
        if (resource && this.workspace) {
            return isEqualOrParent(resource, this.workspace.folders[0].uri);
        }
        return false;
    }
    toResource(workspaceRelativePath) {
        return URI.file(join('C:\\', workspaceRelativePath));
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return URI.isUri(workspaceIdOrFolder) && isEqual(this.workspace.folders[0].uri, workspaceIdOrFolder);
    }
}
export class TestStorageService extends InMemoryStorageService {
    testEmitWillSaveState(reason) {
        super.emitWillSaveState(reason);
    }
}
export class TestHistoryService {
    constructor(root) {
        this.root = root;
    }
    async reopenLastClosedEditor() { }
    async goForward() { }
    async goBack() { }
    async goPrevious() { }
    async goLast() { }
    removeFromHistory(_input) { }
    clear() { }
    clearRecentlyOpened() { }
    getHistory() { return []; }
    async openNextRecentlyUsedEditor(group) { }
    async openPreviouslyUsedEditor(group) { }
    getLastActiveWorkspaceRoot(_schemeFilter) { return this.root; }
    getLastActiveFile(_schemeFilter) { return undefined; }
}
export class TestWorkingCopy extends Disposable {
    constructor(resource, isDirty = false, typeId = 'testWorkingCopyType') {
        super();
        this.resource = resource;
        this.typeId = typeId;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this.dirty = false;
        this.name = basename(this.resource);
        this.dirty = isDirty;
    }
    setDirty(dirty) {
        if (this.dirty !== dirty) {
            this.dirty = dirty;
            this._onDidChangeDirty.fire();
        }
    }
    setContent(content) {
        this._onDidChangeContent.fire();
    }
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    async save(options, stat) {
        this._onDidSave.fire({ reason: options?.reason ?? 1 /* SaveReason.EXPLICIT */, stat: stat ?? createFileStat(this.resource), source: options?.source });
        return true;
    }
    async revert(options) {
        this.setDirty(false);
    }
    async backup(token) {
        return {};
    }
}
export function createFileStat(resource, readonly = false, isFile, isDirectory, isSymbolicLink, children) {
    return {
        resource,
        etag: Date.now().toString(),
        mtime: Date.now(),
        ctime: Date.now(),
        size: 42,
        isFile: isFile ?? true,
        isDirectory: isDirectory ?? false,
        isSymbolicLink: isSymbolicLink ?? false,
        readonly,
        locked: false,
        name: basename(resource),
        children: children?.map(c => createFileStat(c.resource, false, c.isFile, c.isDirectory, c.isSymbolicLink)),
    };
}
export class TestWorkingCopyFileService {
    constructor() {
        this.onWillRunWorkingCopyFileOperation = Event.None;
        this.onDidFailWorkingCopyFileOperation = Event.None;
        this.onDidRunWorkingCopyFileOperation = Event.None;
        this.hasSaveParticipants = false;
    }
    addFileOperationParticipant(participant) { return Disposable.None; }
    addSaveParticipant(participant) { return Disposable.None; }
    async runSaveParticipants(workingCopy, context, progress, token) { }
    async delete(operations, token, undoInfo) { }
    registerWorkingCopyProvider(provider) { return Disposable.None; }
    getDirty(resource) { return []; }
    create(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    createFolder(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    move(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    copy(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
}
export function mock() {
    return function () { };
}
export class TestExtensionService extends NullExtensionService {
}
export const TestProductService = { _serviceBrand: undefined, ...product };
export class TestActivityService {
    constructor() {
        this.onDidChangeActivity = Event.None;
    }
    getViewContainerActivities(viewContainerId) {
        return [];
    }
    getActivity(id) {
        return [];
    }
    showViewContainerActivity(viewContainerId, badge) {
        return this;
    }
    showViewActivity(viewId, badge) {
        return this;
    }
    showAccountsActivity(activity) {
        return this;
    }
    showGlobalActivity(activity) {
        return this;
    }
    dispose() { }
}
export const NullFilesConfigurationService = new class {
    constructor() {
        this.onDidChangeAutoSaveConfiguration = Event.None;
        this.onDidChangeAutoSaveDisabled = Event.None;
        this.onDidChangeReadonly = Event.None;
        this.onDidChangeFilesAssociation = Event.None;
        this.isHotExitEnabled = false;
        this.hotExitConfiguration = undefined;
    }
    getAutoSaveConfiguration() { throw new Error('Method not implemented.'); }
    getAutoSaveMode() { throw new Error('Method not implemented.'); }
    hasShortAutoSaveDelay() { throw new Error('Method not implemented.'); }
    toggleAutoSave() { throw new Error('Method not implemented.'); }
    enableAutoSaveAfterShortDelay(resourceOrEditor) { throw new Error('Method not implemented.'); }
    disableAutoSave(resourceOrEditor) { throw new Error('Method not implemented.'); }
    isReadonly(resource, stat) { return false; }
    async updateReadonly(resource, readonly) { }
    preventSaveConflicts(resource, language) { throw new Error('Method not implemented.'); }
};
export class TestWorkspaceTrustEnablementService {
    constructor(isEnabled = true) {
        this.isEnabled = isEnabled;
    }
    isWorkspaceTrustEnabled() {
        return this.isEnabled;
    }
}
export class TestWorkspaceTrustManagementService extends Disposable {
    constructor(trusted = true) {
        super();
        this.trusted = trusted;
        this._onDidChangeTrust = this._register(new Emitter());
        this.onDidChangeTrust = this._onDidChangeTrust.event;
        this._onDidChangeTrustedFolders = this._register(new Emitter());
        this.onDidChangeTrustedFolders = this._onDidChangeTrustedFolders.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
    }
    get acceptsOutOfWorkspaceFiles() {
        throw new Error('Method not implemented.');
    }
    set acceptsOutOfWorkspaceFiles(value) {
        throw new Error('Method not implemented.');
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not implemented.');
    }
    getTrustedUris() {
        throw new Error('Method not implemented.');
    }
    setParentFolderTrust(trusted) {
        throw new Error('Method not implemented.');
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not implemented.');
    }
    async setTrustedUris(folders) {
        throw new Error('Method not implemented.');
    }
    async setUrisTrust(uris, trusted) {
        throw new Error('Method not implemented.');
    }
    canSetParentFolderTrust() {
        throw new Error('Method not implemented.');
    }
    canSetWorkspaceTrust() {
        throw new Error('Method not implemented.');
    }
    isWorkspaceTrusted() {
        return this.trusted;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    get workspaceTrustInitialized() {
        return Promise.resolve();
    }
    get workspaceResolved() {
        return Promise.resolve();
    }
    async setWorkspaceTrust(trusted) {
        if (this.trusted !== trusted) {
            this.trusted = trusted;
            this._onDidChangeTrust.fire(this.trusted);
        }
    }
}
export class TestWorkspaceTrustRequestService extends Disposable {
    constructor(_trusted) {
        super();
        this._trusted = _trusted;
        this._onDidInitiateOpenFilesTrustRequest = this._register(new Emitter());
        this.onDidInitiateOpenFilesTrustRequest = this._onDidInitiateOpenFilesTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequest = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequest = this._onDidInitiateWorkspaceTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
        this.requestOpenUrisHandler = async (uris) => {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        };
    }
    requestOpenFilesTrust(uris) {
        return this.requestOpenUrisHandler(uris);
    }
    async completeOpenFilesTrustRequest(result, saveResponse) {
        throw new Error('Method not implemented.');
    }
    cancelWorkspaceTrustRequest() {
        throw new Error('Method not implemented.');
    }
    async completeWorkspaceTrustRequest(trusted) {
        throw new Error('Method not implemented.');
    }
    async requestWorkspaceTrust(options) {
        return this._trusted;
    }
    requestWorkspaceTrustOnStartup() {
        throw new Error('Method not implemented.');
    }
}
export class TestMarkerService {
    constructor() {
        this.onMarkerChanged = Event.None;
    }
    getStatistics() { throw new Error('Method not implemented.'); }
    changeOne(owner, resource, markers) { }
    changeAll(owner, data) { }
    remove(owner, resources) { }
    read(filter) { return []; }
    installResourceFilter(resource, reason) {
        return { dispose: () => { } };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9jb21tb24vd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQXVCLE1BQU0sNkNBQTZDLENBQUM7QUFFMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFdEYsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTVFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBVyxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFTM0csTUFBTSxPQUFPLGlCQUFrQixTQUFRLHFCQUFxQjtJQUMzRCxZQUFZLFFBQWM7UUFDekIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFB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