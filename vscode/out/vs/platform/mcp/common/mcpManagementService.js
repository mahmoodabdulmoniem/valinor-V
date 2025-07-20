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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { equals } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IMcpGalleryService, IAllowedMcpServersService } from './mcpManagement.js';
import { IMcpResourceScannerService } from './mcpResourceScannerService.js';
let AbstractMcpResourceManagementService = class AbstractMcpResourceManagementService extends Disposable {
    get onDidInstallMcpServers() { return this._onDidInstallMcpServers.event; }
    get onDidUpdateMcpServers() { return this._onDidUpdateMcpServers.event; }
    get onUninstallMcpServer() { return this._onUninstallMcpServer.event; }
    get onDidUninstallMcpServer() { return this._onDidUninstallMcpServer.event; }
    constructor(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService) {
        super();
        this.mcpResource = mcpResource;
        this.target = target;
        this.mcpGalleryService = mcpGalleryService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.mcpResourceScannerService = mcpResourceScannerService;
        this.local = new Map();
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this._onUninstallMcpServer = this._register(new Emitter());
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.updateLocal(), 50));
    }
    initialize() {
        if (!this.initializePromise) {
            this.initializePromise = (async () => {
                this.local = await this.populateLocalServers();
                this.startWatching();
            })();
        }
        return this.initializePromise;
    }
    async populateLocalServers() {
        this.logService.trace('AbstractMcpResourceManagementService#populateLocalServers', this.mcpResource.toString());
        const local = new Map();
        try {
            const scannedMcpServers = await this.mcpResourceScannerService.scanMcpServers(this.mcpResource, this.target);
            if (scannedMcpServers.servers) {
                await Promise.allSettled(Object.entries(scannedMcpServers.servers).map(async ([name, scannedServer]) => {
                    const server = await this.scanLocalServer(name, scannedServer);
                    local.set(name, server);
                }));
            }
        }
        catch (error) {
            this.logService.debug('Could not read user MCP servers:', error);
            throw error;
        }
        return local;
    }
    startWatching() {
        this._register(this.fileService.watch(this.mcpResource));
        this._register(this.fileService.onDidFilesChange(e => {
            if (e.affects(this.mcpResource)) {
                this.reloadConfigurationScheduler.schedule();
            }
        }));
    }
    async updateLocal() {
        try {
            const current = await this.populateLocalServers();
            const added = [];
            const updated = [];
            const removed = [...this.local.keys()].filter(name => !current.has(name));
            for (const server of removed) {
                this.local.delete(server);
            }
            for (const [name, server] of current) {
                const previous = this.local.get(name);
                if (previous) {
                    if (!equals(previous, server)) {
                        updated.push(server);
                        this.local.set(name, server);
                    }
                }
                else {
                    added.push(server);
                    this.local.set(name, server);
                }
            }
            for (const server of removed) {
                this.local.delete(server);
                this._onDidUninstallMcpServer.fire({ name: server, mcpResource: this.mcpResource });
            }
            if (updated.length) {
                this._onDidUpdateMcpServers.fire(updated.map(server => ({ name: server.name, local: server, mcpResource: this.mcpResource })));
            }
            if (added.length) {
                this._onDidInstallMcpServers.fire(added.map(server => ({ name: server.name, local: server, mcpResource: this.mcpResource })));
            }
        }
        catch (error) {
            this.logService.error('Failed to load installed MCP servers:', error);
        }
    }
    async getInstalled() {
        await this.initialize();
        return Array.from(this.local.values());
    }
    async scanLocalServer(name, config) {
        let mcpServerInfo = await this.getLocalServerInfo(name, config);
        if (!mcpServerInfo) {
            mcpServerInfo = { name, version: config.version };
        }
        return {
            name,
            config,
            mcpResource: this.mcpResource,
            version: mcpServerInfo.version,
            location: mcpServerInfo.location,
            id: mcpServerInfo.id,
            displayName: mcpServerInfo.displayName,
            description: mcpServerInfo.description,
            publisher: mcpServerInfo.publisher,
            publisherDisplayName: mcpServerInfo.publisherDisplayName,
            repositoryUrl: mcpServerInfo.repositoryUrl,
            readmeUrl: mcpServerInfo.readmeUrl,
            icon: mcpServerInfo.icon,
            codicon: mcpServerInfo.codicon,
            manifest: mcpServerInfo.manifest,
            source: config.gallery ? 'gallery' : 'local'
        };
    }
    async install(server, options) {
        this.logService.trace('MCP Management Service: install', server.name);
        this._onInstallMcpServer.fire({ name: server.name, mcpResource: this.mcpResource });
        try {
            await this.mcpResourceScannerService.addMcpServers([server], this.mcpResource, this.target);
            await this.updateLocal();
            const local = this.local.get(server.name);
            if (!local) {
                throw new Error(`Failed to install MCP server: ${server.name}`);
            }
            return local;
        }
        catch (e) {
            this._onDidInstallMcpServers.fire([{ name: server.name, error: e, mcpResource: this.mcpResource }]);
            throw e;
        }
    }
    async uninstall(server, options) {
        this.logService.trace('MCP Management Service: uninstall', server.name);
        this._onUninstallMcpServer.fire({ name: server.name, mcpResource: this.mcpResource });
        try {
            const currentServers = await this.mcpResourceScannerService.scanMcpServers(this.mcpResource, this.target);
            if (!currentServers.servers) {
                return;
            }
            await this.mcpResourceScannerService.removeMcpServers([server.name], this.mcpResource, this.target);
            if (server.location) {
                await this.fileService.del(URI.revive(server.location), { recursive: true });
            }
            await this.updateLocal();
        }
        catch (e) {
            this._onDidUninstallMcpServer.fire({ name: server.name, error: e, mcpResource: this.mcpResource });
            throw e;
        }
    }
    toScannedMcpServerAndInputs(manifest, packageType) {
        if (packageType === undefined) {
            packageType = manifest.packages?.[0]?.registry_name ?? "remote" /* PackageType.REMOTE */;
        }
        let config;
        const inputs = [];
        if (packageType === "remote" /* PackageType.REMOTE */ && manifest.remotes?.length) {
            const headers = {};
            for (const input of manifest.remotes[0].headers ?? []) {
                const variables = input.variables ? this.getVariables(input.variables) : [];
                let value = input.value;
                for (const variable of variables) {
                    value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                }
                headers[input.name] = value;
                if (variables.length) {
                    inputs.push(...variables);
                }
            }
            config = {
                type: "http" /* McpServerType.REMOTE */,
                url: manifest.remotes[0].url,
                headers: Object.keys(headers).length ? headers : undefined,
            };
        }
        else {
            const serverPackage = manifest.packages?.find(p => p.registry_name === packageType) ?? manifest.packages?.[0];
            if (!serverPackage) {
                throw new Error(`No server package found`);
            }
            const args = [];
            const env = {};
            if (serverPackage.registry_name === "docker" /* PackageType.DOCKER */) {
                args.push('run');
                args.push('-i');
                args.push('--rm');
            }
            for (const arg of serverPackage.runtime_arguments ?? []) {
                const variables = arg.variables ? this.getVariables(arg.variables) : [];
                if (arg.type === 'positional') {
                    let value = arg.value;
                    if (value) {
                        for (const variable of variables) {
                            value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                        }
                    }
                    args.push(value ?? arg.value_hint);
                }
                else if (arg.type === 'named') {
                    args.push(arg.name);
                    if (arg.value) {
                        let value = arg.value;
                        for (const variable of variables) {
                            value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                        }
                        args.push(value);
                    }
                }
                if (variables.length) {
                    inputs.push(...variables);
                }
            }
            for (const input of serverPackage.environment_variables ?? []) {
                const variables = input.variables ? this.getVariables(input.variables) : [];
                let value = input.value;
                for (const variable of variables) {
                    value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                }
                env[input.name] = value;
                if (variables.length) {
                    inputs.push(...variables);
                }
                if (serverPackage.registry_name === "docker" /* PackageType.DOCKER */) {
                    args.push('-e');
                    args.push(input.name);
                }
            }
            if (serverPackage.registry_name === "npm" /* PackageType.NODE */) {
                args.push(serverPackage.version ? `${serverPackage.name}@${serverPackage.version}` : serverPackage.name);
            }
            else if (serverPackage.registry_name === "pypi" /* PackageType.PYTHON */) {
                args.push(serverPackage.version ? `${serverPackage.name}==${serverPackage.version}` : serverPackage.name);
            }
            else if (serverPackage.registry_name === "docker" /* PackageType.DOCKER */) {
                args.push(serverPackage.version ? `${serverPackage.name}:${serverPackage.version}` : serverPackage.name);
            }
            else if (serverPackage.registry_name === "nuget" /* PackageType.NUGET */) {
                args.push(serverPackage.version ? `${serverPackage.name}@${serverPackage.version}` : serverPackage.name);
            }
            if (serverPackage.package_arguments && serverPackage.registry_name === "nuget" /* PackageType.NUGET */) {
                args.push('--');
            }
            for (const arg of serverPackage.package_arguments ?? []) {
                const variables = arg.variables ? this.getVariables(arg.variables) : [];
                if (arg.type === 'positional') {
                    let value = arg.value;
                    if (value) {
                        for (const variable of variables) {
                            value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                        }
                    }
                    args.push(value ?? arg.value_hint);
                }
                else if (arg.type === 'named') {
                    args.push(arg.name);
                    if (arg.value) {
                        let value = arg.value;
                        for (const variable of variables) {
                            value = value.replace(`{${variable.id}}`, `{input:${variable.id}}`);
                        }
                        args.push(value);
                    }
                }
                if (variables.length) {
                    inputs.push(...variables);
                }
            }
            config = {
                type: "stdio" /* McpServerType.LOCAL */,
                command: this.getCommandName(serverPackage.registry_name),
                args: args.length ? args : undefined,
                env: Object.keys(env).length ? env : undefined,
            };
        }
        return {
            config,
            inputs: inputs.length ? inputs : undefined,
        };
    }
    getCommandName(packageType) {
        switch (packageType) {
            case "npm" /* PackageType.NODE */: return 'npx';
            case "docker" /* PackageType.DOCKER */: return 'docker';
            case "pypi" /* PackageType.PYTHON */: return 'uvx';
            case "nuget" /* PackageType.NUGET */: return 'dnx';
        }
        return packageType;
    }
    getVariables(variableInputs) {
        const variables = [];
        for (const [key, value] of Object.entries(variableInputs)) {
            variables.push({
                id: key,
                type: value.choices ? "pickString" /* McpServerVariableType.PICK */ : "promptString" /* McpServerVariableType.PROMPT */,
                description: value.description ?? '',
                password: !!value.is_secret,
                default: value.default,
                options: value.choices,
            });
        }
        return variables;
    }
};
AbstractMcpResourceManagementService = __decorate([
    __param(2, IMcpGalleryService),
    __param(3, IFileService),
    __param(4, IUriIdentityService),
    __param(5, ILogService),
    __param(6, IMcpResourceScannerService)
], AbstractMcpResourceManagementService);
export { AbstractMcpResourceManagementService };
let McpUserResourceManagementService = class McpUserResourceManagementService extends AbstractMcpResourceManagementService {
    constructor(mcpResource, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService, environmentService) {
        super(mcpResource, 2 /* ConfigurationTarget.USER */, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService);
        this.mcpLocation = uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'mcp');
    }
    async installFromGallery(server, options) {
        this.logService.trace('MCP Management Service: installGallery', server.url);
        this._onInstallMcpServer.fire({ name: server.name, mcpResource: this.mcpResource });
        try {
            const manifest = await this.updateMetadataFromGallery(server);
            const { config, inputs } = this.toScannedMcpServerAndInputs(manifest, options?.packageType);
            const installable = {
                name: server.name,
                config: {
                    ...config,
                    gallery: true,
                    version: server.version
                },
                inputs
            };
            await this.mcpResourceScannerService.addMcpServers([installable], this.mcpResource, this.target);
            await this.updateLocal();
            const local = (await this.getInstalled()).find(s => s.name === server.name);
            if (!local) {
                throw new Error(`Failed to install MCP server: ${server.name}`);
            }
            return local;
        }
        catch (e) {
            this._onDidInstallMcpServers.fire([{ name: server.name, source: server, error: e, mcpResource: this.mcpResource }]);
            throw e;
        }
    }
    async updateMetadata(local, gallery) {
        await this.updateMetadataFromGallery(gallery);
        await this.updateLocal();
        const updatedLocal = (await this.getInstalled()).find(s => s.name === local.name);
        if (!updatedLocal) {
            throw new Error(`Failed to find MCP server: ${local.name}`);
        }
        return updatedLocal;
    }
    async updateMetadataFromGallery(gallery) {
        const manifest = await this.mcpGalleryService.getManifest(gallery, CancellationToken.None);
        const location = this.getLocation(gallery.name, gallery.version);
        const manifestPath = this.uriIdentityService.extUri.joinPath(location, 'manifest.json');
        const local = {
            id: gallery.id,
            name: gallery.name,
            displayName: gallery.displayName,
            description: gallery.description,
            version: gallery.version,
            publisher: gallery.publisher,
            publisherDisplayName: gallery.publisherDisplayName,
            repositoryUrl: gallery.repositoryUrl,
            licenseUrl: gallery.licenseUrl,
            icon: gallery.icon,
            codicon: gallery.codicon,
            manifest,
        };
        await this.fileService.writeFile(manifestPath, VSBuffer.fromString(JSON.stringify(local)));
        if (gallery.readmeUrl) {
            const readme = await this.mcpGalleryService.getReadme(gallery, CancellationToken.None);
            await this.fileService.writeFile(this.uriIdentityService.extUri.joinPath(location, 'README.md'), VSBuffer.fromString(readme));
        }
        return manifest;
    }
    async getLocalServerInfo(name, mcpServerConfig) {
        let storedMcpServerInfo;
        let location;
        let readmeUrl;
        if (mcpServerConfig.gallery) {
            location = this.getLocation(name, mcpServerConfig.version);
            const manifestLocation = this.uriIdentityService.extUri.joinPath(location, 'manifest.json');
            try {
                const content = await this.fileService.readFile(manifestLocation);
                storedMcpServerInfo = JSON.parse(content.value.toString());
                storedMcpServerInfo.location = location;
                readmeUrl = this.uriIdentityService.extUri.joinPath(location, 'README.md');
                if (!await this.fileService.exists(readmeUrl)) {
                    readmeUrl = undefined;
                }
                storedMcpServerInfo.readmeUrl = readmeUrl;
            }
            catch (e) {
                this.logService.error('MCP Management Service: failed to read manifest', location.toString(), e);
            }
        }
        return storedMcpServerInfo;
    }
    getLocation(name, version) {
        name = name.replace('/', '.');
        return this.uriIdentityService.extUri.joinPath(this.mcpLocation, version ? `${name}-${version}` : name);
    }
    installFromUri(uri, options) {
        throw new Error('Method not supported.');
    }
};
McpUserResourceManagementService = __decorate([
    __param(1, IMcpGalleryService),
    __param(2, IFileService),
    __param(3, IUriIdentityService),
    __param(4, ILogService),
    __param(5, IMcpResourceScannerService),
    __param(6, IEnvironmentService)
], McpUserResourceManagementService);
export { McpUserResourceManagementService };
let AbstractMcpManagementService = class AbstractMcpManagementService extends Disposable {
    constructor(allowedMcpServersService) {
        super();
        this.allowedMcpServersService = allowedMcpServersService;
    }
    canInstall(server) {
        const allowedToInstall = this.allowedMcpServersService.isAllowed(server);
        if (allowedToInstall !== true) {
            return new MarkdownString(localize('not allowed to install', "This mcp server cannot be installed because {0}", allowedToInstall.value));
        }
        return true;
    }
};
AbstractMcpManagementService = __decorate([
    __param(0, IAllowedMcpServersService)
], AbstractMcpManagementService);
export { AbstractMcpManagementService };
let McpManagementService = class McpManagementService extends AbstractMcpManagementService {
    constructor(allowedMcpServersService, userDataProfilesService, instantiationService) {
        super(allowedMcpServersService);
        this.userDataProfilesService = userDataProfilesService;
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
        this.mcpResourceManagementServices = new ResourceMap();
    }
    getMcpResourceManagementService(mcpResource) {
        let mcpResourceManagementService = this.mcpResourceManagementServices.get(mcpResource);
        if (!mcpResourceManagementService) {
            const disposables = new DisposableStore();
            const service = disposables.add(this.createMcpResourceManagementService(mcpResource));
            disposables.add(service.onInstallMcpServer(e => this._onInstallMcpServer.fire(e)));
            disposables.add(service.onDidInstallMcpServers(e => this._onDidInstallMcpServers.fire(e)));
            disposables.add(service.onDidUpdateMcpServers(e => this._onDidUpdateMcpServers.fire(e)));
            disposables.add(service.onUninstallMcpServer(e => this._onUninstallMcpServer.fire(e)));
            disposables.add(service.onDidUninstallMcpServer(e => this._onDidUninstallMcpServer.fire(e)));
            this.mcpResourceManagementServices.set(mcpResource, mcpResourceManagementService = { service, dispose: () => disposables.dispose() });
        }
        return mcpResourceManagementService.service;
    }
    async getInstalled(mcpResource) {
        const mcpResourceUri = mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).getInstalled();
    }
    async install(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).install(server, options);
    }
    async uninstall(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).uninstall(server, options);
    }
    async installFromGallery(server, options) {
        const mcpResourceUri = options?.mcpResource || this.userDataProfilesService.defaultProfile.mcpResource;
        return this.getMcpResourceManagementService(mcpResourceUri).installFromGallery(server, options);
    }
    async updateMetadata(local, gallery, mcpResource) {
        return this.getMcpResourceManagementService(mcpResource || this.userDataProfilesService.defaultProfile.mcpResource).updateMetadata(local, gallery);
    }
    dispose() {
        this.mcpResourceManagementServices.forEach(service => service.dispose());
        this.mcpResourceManagementServices.clear();
        super.dispose();
    }
    createMcpResourceManagementService(mcpResource) {
        return this.instantiationService.createInstance(McpUserResourceManagementService, mcpResource);
    }
};
McpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, IUserDataProfilesService),
    __param(2, IInstantiationService)
], McpManagementService);
export { McpManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9jb21tb24vbWNwTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFD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