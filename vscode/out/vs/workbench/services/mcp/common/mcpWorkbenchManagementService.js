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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IMcpManagementService, IMcpGalleryService, IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
import { IInstantiationService, refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { Emitter } from '../../../../base/common/event.js';
import { IMcpResourceScannerService } from '../../../../platform/mcp/common/mcpResourceScannerService.js';
import { isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { MCP_CONFIGURATION_KEY, WORKSPACE_STANDALONE_CONFIGURATIONS } from '../../configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { McpManagementChannelClient } from '../../../../platform/mcp/common/mcpManagementIpc.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { AbstractMcpManagementService, AbstractMcpResourceManagementService } from '../../../../platform/mcp/common/mcpManagementService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ResourceMap } from '../../../../base/common/map.js';
export var LocalMcpServerScope;
(function (LocalMcpServerScope) {
    LocalMcpServerScope["User"] = "user";
    LocalMcpServerScope["RemoteUser"] = "remoteUser";
    LocalMcpServerScope["Workspace"] = "workspace";
})(LocalMcpServerScope || (LocalMcpServerScope = {}));
export const IWorkbenchMcpManagementService = refineServiceDecorator(IMcpManagementService);
let WorkbenchMcpManagementService = class WorkbenchMcpManagementService extends AbstractMcpManagementService {
    constructor(mcpManagementService, allowedMcpServersService, userDataProfileService, uriIdentityService, workspaceContextService, remoteAgentService, userDataProfilesService, remoteUserDataProfilesService, instantiationService) {
        super(allowedMcpServersService);
        this.mcpManagementService = mcpManagementService;
        this.userDataProfileService = userDataProfileService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceContextService = workspaceContextService;
        this.userDataProfilesService = userDataProfilesService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this.onDidInstallMcpServers = this._onDidInstallMcpServers.event;
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this.onDidUpdateMcpServers = this._onDidUpdateMcpServers.event;
        this._onUninstallMcpServer = this._register(new Emitter());
        this.onUninstallMcpServer = this._onUninstallMcpServer.event;
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.onDidUninstallMcpServer = this._onDidUninstallMcpServer.event;
        this._onInstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onInstallMcpServerInCurrentProfile = this._onInstallMcpServerInCurrentProfile.event;
        this._onDidInstallMcpServersInCurrentProfile = this._register(new Emitter());
        this.onDidInstallMcpServersInCurrentProfile = this._onDidInstallMcpServersInCurrentProfile.event;
        this._onDidUpdateMcpServersInCurrentProfile = this._register(new Emitter());
        this.onDidUpdateMcpServersInCurrentProfile = this._onDidUpdateMcpServersInCurrentProfile.event;
        this._onUninstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onUninstallMcpServerInCurrentProfile = this._onUninstallMcpServerInCurrentProfile.event;
        this._onDidUninstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onDidUninstallMcpServerInCurrentProfile = this._onDidUninstallMcpServerInCurrentProfile.event;
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this.workspaceMcpManagementService = this._register(instantiationService.createInstance(WorkspaceMcpManagementService));
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            this.remoteMcpManagementService = this._register(instantiationService.createInstance(McpManagementChannelClient, remoteAgentConnection.getChannel('mcpManagement')));
        }
        this._register(this.mcpManagementService.onInstallMcpServer(e => {
            this._onInstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onInstallMcpServerInCurrentProfile.fire(e);
            }
        }));
        this._register(this.mcpManagementService.onDidInstallMcpServers(e => {
            const { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile } = this.createInstallMcpServerResultsFromEvent(e, "user" /* LocalMcpServerScope.User */);
            this._onDidInstallMcpServers.fire(mcpServerInstallResult);
            if (mcpServerInstallResultInCurrentProfile.length) {
                this._onDidInstallMcpServersInCurrentProfile.fire(mcpServerInstallResultInCurrentProfile);
            }
        }));
        this._register(this.mcpManagementService.onDidUpdateMcpServers(e => {
            const { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile } = this.createInstallMcpServerResultsFromEvent(e, "user" /* LocalMcpServerScope.User */);
            this._onDidUpdateMcpServers.fire(mcpServerInstallResult);
            if (mcpServerInstallResultInCurrentProfile.length) {
                this._onDidUpdateMcpServersInCurrentProfile.fire(mcpServerInstallResultInCurrentProfile);
            }
        }));
        this._register(this.mcpManagementService.onUninstallMcpServer(e => {
            this._onUninstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onUninstallMcpServerInCurrentProfile.fire(e);
            }
        }));
        this._register(this.mcpManagementService.onDidUninstallMcpServer(e => {
            this._onDidUninstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onDidUninstallMcpServerInCurrentProfile.fire(e);
            }
        }));
        this._register(this.workspaceMcpManagementService.onInstallMcpServer(async (e) => {
            this._onInstallMcpServer.fire(e);
            this._onInstallMcpServerInCurrentProfile.fire(e);
        }));
        this._register(this.workspaceMcpManagementService.onDidInstallMcpServers(async (e) => {
            const { mcpServerInstallResult } = this.createInstallMcpServerResultsFromEvent(e, "workspace" /* LocalMcpServerScope.Workspace */);
            this._onDidInstallMcpServers.fire(mcpServerInstallResult);
            this._onDidInstallMcpServersInCurrentProfile.fire(mcpServerInstallResult);
        }));
        this._register(this.workspaceMcpManagementService.onUninstallMcpServer(async (e) => {
            this._onUninstallMcpServer.fire(e);
            this._onUninstallMcpServerInCurrentProfile.fire(e);
        }));
        this._register(this.workspaceMcpManagementService.onDidUninstallMcpServer(async (e) => {
            this._onDidUninstallMcpServer.fire(e);
            this._onDidUninstallMcpServerInCurrentProfile.fire(e);
        }));
        this._register(this.workspaceMcpManagementService.onDidUpdateMcpServers(e => {
            const { mcpServerInstallResult } = this.createInstallMcpServerResultsFromEvent(e, "workspace" /* LocalMcpServerScope.Workspace */);
            this._onDidUpdateMcpServers.fire(mcpServerInstallResult);
            this._onDidUpdateMcpServersInCurrentProfile.fire(mcpServerInstallResult);
        }));
        if (this.remoteMcpManagementService) {
            this._register(this.remoteMcpManagementService.onInstallMcpServer(async (e) => {
                this._onInstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onInstallMcpServerInCurrentProfile.fire(e);
                }
            }));
            this._register(this.remoteMcpManagementService.onDidInstallMcpServers(e => this.handleRemoteInstallMcpServerResultsFromEvent(e, this._onDidInstallMcpServers, this._onDidInstallMcpServersInCurrentProfile)));
            this._register(this.remoteMcpManagementService.onDidUpdateMcpServers(e => this.handleRemoteInstallMcpServerResultsFromEvent(e, this._onDidInstallMcpServers, this._onDidInstallMcpServersInCurrentProfile)));
            this._register(this.remoteMcpManagementService.onUninstallMcpServer(async (e) => {
                this._onUninstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onUninstallMcpServerInCurrentProfile.fire(e);
                }
            }));
            this._register(this.remoteMcpManagementService.onDidUninstallMcpServer(async (e) => {
                this._onDidUninstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onDidUninstallMcpServerInCurrentProfile.fire(e);
                }
            }));
        }
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.mcpResource, e.profile.mcpResource)) {
                this._onDidChangeProfile.fire();
            }
        }));
    }
    createInstallMcpServerResultsFromEvent(e, scope) {
        const mcpServerInstallResult = [];
        const mcpServerInstallResultInCurrentProfile = [];
        for (const result of e) {
            const workbenchResult = {
                ...result,
                local: result.local ? this.toWorkspaceMcpServer(result.local, scope) : undefined
            };
            mcpServerInstallResult.push(workbenchResult);
            if (this.uriIdentityService.extUri.isEqual(result.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                mcpServerInstallResultInCurrentProfile.push(workbenchResult);
            }
        }
        return { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile };
    }
    async handleRemoteInstallMcpServerResultsFromEvent(e, emitter, currentProfileEmitter) {
        const mcpServerInstallResult = [];
        const mcpServerInstallResultInCurrentProfile = [];
        const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
        for (const result of e) {
            const workbenchResult = {
                ...result,
                local: result.local ? this.toWorkspaceMcpServer(result.local, "remoteUser" /* LocalMcpServerScope.RemoteUser */) : undefined
            };
            mcpServerInstallResult.push(workbenchResult);
            if (remoteMcpResource ? this.uriIdentityService.extUri.isEqual(result.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                mcpServerInstallResultInCurrentProfile.push(workbenchResult);
            }
        }
        emitter.fire(mcpServerInstallResult);
        if (mcpServerInstallResultInCurrentProfile.length) {
            currentProfileEmitter.fire(mcpServerInstallResultInCurrentProfile);
        }
    }
    async getInstalled() {
        const installed = [];
        const [userServers, remoteServers, workspaceServers] = await Promise.all([
            this.mcpManagementService.getInstalled(this.userDataProfileService.currentProfile.mcpResource),
            this.remoteMcpManagementService?.getInstalled(await this.getRemoteMcpResource()) ?? Promise.resolve([]),
            this.workspaceMcpManagementService?.getInstalled() ?? Promise.resolve([]),
        ]);
        for (const server of userServers) {
            installed.push(this.toWorkspaceMcpServer(server, "user" /* LocalMcpServerScope.User */));
        }
        for (const server of remoteServers) {
            installed.push(this.toWorkspaceMcpServer(server, "remoteUser" /* LocalMcpServerScope.RemoteUser */));
        }
        for (const server of workspaceServers) {
            installed.push(this.toWorkspaceMcpServer(server, "workspace" /* LocalMcpServerScope.Workspace */));
        }
        return installed;
    }
    toWorkspaceMcpServer(server, scope) {
        return { ...server, scope };
    }
    async install(server, options) {
        options = options ?? {};
        if (options.target === 5 /* ConfigurationTarget.WORKSPACE */ || isWorkspaceFolder(options.target)) {
            const mcpResource = options.target === 5 /* ConfigurationTarget.WORKSPACE */ ? this.workspaceContextService.getWorkspace().configuration : options.target.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]);
            if (!mcpResource) {
                throw new Error(`Illegal target: ${options.target}`);
            }
            options.mcpResource = mcpResource;
            return this.workspaceMcpManagementService.install(server, options);
        }
        if (options.target === 4 /* ConfigurationTarget.USER_REMOTE */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${options.target}`);
            }
            options.mcpResource = await this.getRemoteMcpResource(options.mcpResource);
            return this.remoteMcpManagementService.install(server, options);
        }
        if (options.target && options.target !== 2 /* ConfigurationTarget.USER */ && options.target !== 3 /* ConfigurationTarget.USER_LOCAL */) {
            throw new Error(`Illegal target: ${options.target}`);
        }
        options.mcpResource = this.userDataProfileService.currentProfile.mcpResource;
        return this.mcpManagementService.install(server, options);
    }
    installFromGallery(server, options) {
        options = options ?? {};
        if (!options.mcpResource) {
            options.mcpResource = this.userDataProfileService.currentProfile.mcpResource;
        }
        return this.mcpManagementService.installFromGallery(server, options);
    }
    updateMetadata(local, server, profileLocation) {
        if (local.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            return this.workspaceMcpManagementService.updateMetadata(local, server, profileLocation);
        }
        if (local.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${local.scope}`);
            }
            return this.remoteMcpManagementService.updateMetadata(local, server, profileLocation);
        }
        return this.mcpManagementService.updateMetadata(local, server, profileLocation);
    }
    async uninstall(server) {
        if (server.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            return this.workspaceMcpManagementService.uninstall(server);
        }
        if (server.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${server.scope}`);
            }
            return this.remoteMcpManagementService.uninstall(server);
        }
        return this.mcpManagementService.uninstall(server, { mcpResource: this.userDataProfileService.currentProfile.mcpResource });
    }
    async getRemoteMcpResource(mcpResource) {
        if (!mcpResource && this.userDataProfileService.currentProfile.isDefault) {
            return undefined;
        }
        mcpResource = mcpResource ?? this.userDataProfileService.currentProfile.mcpResource;
        let profile = this.userDataProfilesService.profiles.find(p => this.uriIdentityService.extUri.isEqual(p.mcpResource, mcpResource));
        if (profile) {
            profile = await this.remoteUserDataProfilesService.getRemoteProfile(profile);
        }
        else {
            profile = (await this.remoteUserDataProfilesService.getRemoteProfiles()).find(p => this.uriIdentityService.extUri.isEqual(p.mcpResource, mcpResource));
        }
        return profile?.mcpResource;
    }
};
WorkbenchMcpManagementService = __decorate([
    __param(1, IAllowedMcpServersService),
    __param(2, IUserDataProfileService),
    __param(3, IUriIdentityService),
    __param(4, IWorkspaceContextService),
    __param(5, IRemoteAgentService),
    __param(6, IUserDataProfilesService),
    __param(7, IRemoteUserDataProfilesService),
    __param(8, IInstantiationService)
], WorkbenchMcpManagementService);
export { WorkbenchMcpManagementService };
let WorkspaceMcpResourceManagementService = class WorkspaceMcpResourceManagementService extends AbstractMcpResourceManagementService {
    constructor(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService) {
        super(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService);
    }
    installFromGallery() {
        throw new Error('Not supported');
    }
    updateMetadata() {
        throw new Error('Not supported');
    }
    installFromUri() {
        throw new Error('Not supported');
    }
    async getLocalServerInfo() {
        return undefined;
    }
};
WorkspaceMcpResourceManagementService = __decorate([
    __param(2, IMcpGalleryService),
    __param(3, IFileService),
    __param(4, IUriIdentityService),
    __param(5, ILogService),
    __param(6, IMcpResourceScannerService)
], WorkspaceMcpResourceManagementService);
let WorkspaceMcpManagementService = class WorkspaceMcpManagementService extends AbstractMcpManagementService {
    constructor(allowedMcpServersService, uriIdentityService, logService, workspaceContextService, instantiationService) {
        super(allowedMcpServersService);
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.workspaceContextService = workspaceContextService;
        this.instantiationService = instantiationService;
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this.onDidInstallMcpServers = this._onDidInstallMcpServers.event;
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this.onDidUpdateMcpServers = this._onDidUpdateMcpServers.event;
        this._onUninstallMcpServer = this._register(new Emitter());
        this.onUninstallMcpServer = this._onUninstallMcpServer.event;
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.onDidUninstallMcpServer = this._onDidUninstallMcpServer.event;
        this.allMcpServers = [];
        this.workspaceMcpManagementServices = new ResourceMap();
        this.initialize();
    }
    async initialize() {
        try {
            await this.onDidChangeWorkbenchState();
            await this.onDidChangeWorkspaceFolders({ added: this.workspaceContextService.getWorkspace().folders, removed: [], changed: [] });
            this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(e => this.onDidChangeWorkspaceFolders(e)));
            this._register(this.workspaceContextService.onDidChangeWorkbenchState(e => this.onDidChangeWorkbenchState()));
        }
        catch (error) {
            this.logService.error('Failed to initialize workspace folders', error);
        }
    }
    async onDidChangeWorkbenchState() {
        if (this.workspaceConfiguration) {
            await this.removeWorkspaceService(this.workspaceConfiguration);
        }
        this.workspaceConfiguration = this.workspaceContextService.getWorkspace().configuration;
        if (this.workspaceConfiguration) {
            await this.addWorkspaceService(this.workspaceConfiguration, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    async onDidChangeWorkspaceFolders(e) {
        try {
            await Promise.allSettled(e.removed.map(folder => this.removeWorkspaceService(folder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]))));
        }
        catch (error) {
            this.logService.error(error);
        }
        try {
            await Promise.allSettled(e.added.map(folder => this.addWorkspaceService(folder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]), 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)));
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async addWorkspaceService(mcpResource, target) {
        if (this.workspaceMcpManagementServices.has(mcpResource)) {
            return;
        }
        const disposables = new DisposableStore();
        const service = disposables.add(this.instantiationService.createInstance(WorkspaceMcpResourceManagementService, mcpResource, target));
        try {
            const installedServers = await service.getInstalled();
            this.allMcpServers.push(...installedServers);
            if (installedServers.length > 0) {
                const installResults = installedServers.map(server => ({
                    name: server.name,
                    local: server,
                    mcpResource: server.mcpResource
                }));
                this._onDidInstallMcpServers.fire(installResults);
            }
        }
        catch (error) {
            this.logService.warn('Failed to get installed servers from', mcpResource.toString(), error);
        }
        disposables.add(service.onInstallMcpServer(e => this._onInstallMcpServer.fire(e)));
        disposables.add(service.onDidInstallMcpServers(e => {
            for (const { local } of e) {
                if (local) {
                    this.allMcpServers.push(local);
                }
            }
            this._onDidInstallMcpServers.fire(e);
        }));
        disposables.add(service.onDidUpdateMcpServers(e => {
            for (const { local, mcpResource } of e) {
                if (local) {
                    const index = this.allMcpServers.findIndex(server => this.uriIdentityService.extUri.isEqual(server.mcpResource, mcpResource) && server.name === local.name);
                    if (index !== -1) {
                        this.allMcpServers.splice(index, 1, local);
                    }
                }
            }
            this._onDidUpdateMcpServers.fire(e);
        }));
        disposables.add(service.onUninstallMcpServer(e => this._onUninstallMcpServer.fire(e)));
        disposables.add(service.onDidUninstallMcpServer(e => {
            const index = this.allMcpServers.findIndex(server => this.uriIdentityService.extUri.isEqual(server.mcpResource, e.mcpResource) && server.name === e.name);
            if (index !== -1) {
                this.allMcpServers.splice(index, 1);
                this._onDidUninstallMcpServer.fire(e);
            }
        }));
        this.workspaceMcpManagementServices.set(mcpResource, { service, dispose: () => disposables.dispose() });
    }
    async removeWorkspaceService(mcpResource) {
        const serviceItem = this.workspaceMcpManagementServices.get(mcpResource);
        if (serviceItem) {
            try {
                const installedServers = await serviceItem.service.getInstalled();
                this.allMcpServers = this.allMcpServers.filter(server => !installedServers.some(uninstalled => this.uriIdentityService.extUri.isEqual(uninstalled.mcpResource, server.mcpResource)));
                for (const server of installedServers) {
                    this._onDidUninstallMcpServer.fire({
                        name: server.name,
                        mcpResource: server.mcpResource
                    });
                }
            }
            catch (error) {
                this.logService.warn('Failed to get installed servers from', mcpResource.toString(), error);
            }
            this.workspaceMcpManagementServices.delete(mcpResource);
            serviceItem.dispose();
        }
    }
    async getInstalled() {
        return this.allMcpServers;
    }
    async install(server, options) {
        if (!options?.mcpResource) {
            throw new Error('MCP resource is required');
        }
        const mcpManagementServiceItem = this.workspaceMcpManagementServices.get(options?.mcpResource);
        if (!mcpManagementServiceItem) {
            throw new Error(`No MCP management service found for resource: ${options?.mcpResource.toString()}`);
        }
        return mcpManagementServiceItem.service.install(server, options);
    }
    async uninstall(server, options) {
        const mcpResource = server.mcpResource;
        const mcpManagementServiceItem = this.workspaceMcpManagementServices.get(mcpResource);
        if (!mcpManagementServiceItem) {
            throw new Error(`No MCP management service found for resource: ${mcpResource.toString()}`);
        }
        return mcpManagementServiceItem.service.uninstall(server, options);
    }
    installFromGallery() {
        throw new Error('Not supported');
    }
    updateMetadata() {
        throw new Error('Not supported');
    }
    dispose() {
        this.workspaceMcpManagementServices.forEach(service => service.dispose());
        this.workspaceMcpManagementServices.clear();
        super.dispose();
    }
};
WorkspaceMcpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, IUriIdentityService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, IInstantiationService)
], WorkspaceMcpManagementService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwV29ya2JlbmNoTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9tY3AvY29tbW9uL21jcFdvcmtiZW5jaE1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQW1CLHFCQUFxQixFQUFnSyxrQkFBa0IsRUFBb0IseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6VSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMzSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFxQixNQUFNLDhEQUE4RCxDQUFDO0FBQzdILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBa0QsTUFBTSxvREFBb0QsQ0FBQztBQUNqSyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFJaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENB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