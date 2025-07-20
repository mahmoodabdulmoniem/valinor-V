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
import { Emitter, Event } from '../../../base/common/event.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { DefaultURITransformer, transformAndReviveIncomingURIs } from '../../../base/common/uriIpc.js';
import { IAllowedMcpServersService } from './mcpManagement.js';
import { AbstractMcpManagementService } from './mcpManagementService.js';
function transformIncomingURI(uri, transformer) {
    return uri ? URI.revive(transformer ? transformer.transformIncoming(uri) : uri) : undefined;
}
function transformIncomingServer(mcpServer, transformer) {
    transformer = transformer ? transformer : DefaultURITransformer;
    const manifest = mcpServer.manifest;
    const transformed = transformAndReviveIncomingURIs({ ...mcpServer, ...{ manifest: undefined } }, transformer);
    return { ...transformed, ...{ manifest } };
}
function transformIncomingOptions(options, transformer) {
    return options?.mcpResource ? transformAndReviveIncomingURIs(options, transformer ?? DefaultURITransformer) : options;
}
function transformOutgoingExtension(extension, transformer) {
    return transformer ? cloneAndChange(extension, value => value instanceof URI ? transformer.transformOutgoingURI(value) : undefined) : extension;
}
function transformOutgoingURI(uri, transformer) {
    return transformer ? transformer.transformOutgoingURI(uri) : uri;
}
export class McpManagementChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
        this.onInstallMcpServer = Event.buffer(service.onInstallMcpServer, true);
        this.onDidInstallMcpServers = Event.buffer(service.onDidInstallMcpServers, true);
        this.onDidUpdateMcpServers = Event.buffer(service.onDidUpdateMcpServers, true);
        this.onUninstallMcpServer = Event.buffer(service.onUninstallMcpServer, true);
        this.onDidUninstallMcpServer = Event.buffer(service.onDidUninstallMcpServer, true);
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onInstallMcpServer': {
                return Event.map(this.onInstallMcpServer, event => {
                    return { ...event, mcpResource: transformOutgoingURI(event.mcpResource, uriTransformer) };
                });
            }
            case 'onDidInstallMcpServers': {
                return Event.map(this.onDidInstallMcpServers, results => results.map(i => ({
                    ...i,
                    local: i.local ? transformOutgoingExtension(i.local, uriTransformer) : i.local,
                    mcpResource: transformOutgoingURI(i.mcpResource, uriTransformer)
                })));
            }
            case 'onDidUpdateMcpServers': {
                return Event.map(this.onDidUpdateMcpServers, results => results.map(i => ({
                    ...i,
                    local: i.local ? transformOutgoingExtension(i.local, uriTransformer) : i.local,
                    mcpResource: transformOutgoingURI(i.mcpResource, uriTransformer)
                })));
            }
            case 'onUninstallMcpServer': {
                return Event.map(this.onUninstallMcpServer, event => {
                    return { ...event, mcpResource: transformOutgoingURI(event.mcpResource, uriTransformer) };
                });
            }
            case 'onDidUninstallMcpServer': {
                return Event.map(this.onDidUninstallMcpServer, event => {
                    return { ...event, mcpResource: transformOutgoingURI(event.mcpResource, uriTransformer) };
                });
            }
        }
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'getInstalled': {
                const mcpServers = await this.service.getInstalled(transformIncomingURI(args[0], uriTransformer));
                return mcpServers.map(e => transformOutgoingExtension(e, uriTransformer));
            }
            case 'install': {
                return this.service.install(args[0], transformIncomingOptions(args[1], uriTransformer));
            }
            case 'installFromGallery': {
                return this.service.installFromGallery(args[0], transformIncomingOptions(args[1], uriTransformer));
            }
            case 'uninstall': {
                return this.service.uninstall(transformIncomingServer(args[0], uriTransformer), transformIncomingOptions(args[1], uriTransformer));
            }
            case 'updateMetadata': {
                return this.service.updateMetadata(transformIncomingServer(args[0], uriTransformer), args[1], transformIncomingURI(args[2], uriTransformer));
            }
        }
        throw new Error('Invalid call');
    }
}
let McpManagementChannelClient = class McpManagementChannelClient extends AbstractMcpManagementService {
    get onInstallMcpServer() { return this._onInstallMcpServer.event; }
    get onDidInstallMcpServers() { return this._onDidInstallMcpServers.event; }
    get onUninstallMcpServer() { return this._onUninstallMcpServer.event; }
    get onDidUninstallMcpServer() { return this._onDidUninstallMcpServer.event; }
    get onDidUpdateMcpServers() { return this._onDidUpdateMcpServers.event; }
    constructor(channel, allowedMcpServersService) {
        super(allowedMcpServersService);
        this.channel = channel;
        this._onInstallMcpServer = this._register(new Emitter());
        this._onDidInstallMcpServers = this._register(new Emitter());
        this._onUninstallMcpServer = this._register(new Emitter());
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this._register(this.channel.listen('onInstallMcpServer')(e => this._onInstallMcpServer.fire(({ ...e, mcpResource: transformIncomingURI(e.mcpResource, null) }))));
        this._register(this.channel.listen('onDidInstallMcpServers')(results => this._onDidInstallMcpServers.fire(results.map(e => ({ ...e, local: e.local ? transformIncomingServer(e.local, null) : e.local, mcpResource: transformIncomingURI(e.mcpResource, null) })))));
        this._register(this.channel.listen('onDidUpdateMcpServers')(results => this._onDidUpdateMcpServers.fire(results.map(e => ({ ...e, local: e.local ? transformIncomingServer(e.local, null) : e.local, mcpResource: transformIncomingURI(e.mcpResource, null) })))));
        this._register(this.channel.listen('onUninstallMcpServer')(e => this._onUninstallMcpServer.fire(({ ...e, mcpResource: transformIncomingURI(e.mcpResource, null) }))));
        this._register(this.channel.listen('onDidUninstallMcpServer')(e => this._onDidUninstallMcpServer.fire(({ ...e, mcpResource: transformIncomingURI(e.mcpResource, null) }))));
    }
    install(server, options) {
        return Promise.resolve(this.channel.call('install', [server, options])).then(local => transformIncomingServer(local, null));
    }
    installFromGallery(extension, installOptions) {
        return Promise.resolve(this.channel.call('installFromGallery', [extension, installOptions])).then(local => transformIncomingServer(local, null));
    }
    uninstall(extension, options) {
        return Promise.resolve(this.channel.call('uninstall', [extension, options]));
    }
    getInstalled(mcpResource) {
        return Promise.resolve(this.channel.call('getInstalled', [mcpResource]))
            .then(servers => servers.map(server => transformIncomingServer(server, null)));
    }
    updateMetadata(local, gallery, mcpResource) {
        return Promise.resolve(this.channel.call('updateMetadata', [local, gallery, mcpResource])).then(local => transformIncomingServer(local, null));
    }
};
McpManagementChannelClient = __decorate([
    __param(1, IAllowedMcpServersService)
], McpManagementChannelClient);
export { McpManagementChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudElwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL2NvbW1vbi9tY3BNYW5hZ2VtZW50SXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFtQiw4QkFBOEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXhILE9BQU8sRUFBME4seUJBQXlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN2UixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUl6RSxTQUFTLG9CQUFvQixDQUFDLEdBQThCLEVBQUUsV0FBbUM7SUFDaEcsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDN0YsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsU0FBMEIsRUFBRSxXQUFtQztJQUMvRixXQUFXLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ2hFLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUM7SUFDcEMsTUFBTSxXQUFXLEdBQUcsOEJBQThCLENBQUMsRUFB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