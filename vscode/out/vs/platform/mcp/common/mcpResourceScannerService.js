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
import { assertNever } from '../../../base/common/assert.js';
import { Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ConfigurationTargetToString } from '../../configuration/common/configuration.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
export const IMcpResourceScannerService = createDecorator('IMcpResourceScannerService');
let McpResourceScannerService = class McpResourceScannerService extends Disposable {
    constructor(fileService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.resourcesAccessQueueMap = new ResourceMap();
    }
    async scanMcpServers(mcpResource, target) {
        return this.withProfileMcpServers(mcpResource, target);
    }
    async addMcpServers(servers, mcpResource, target) {
        await this.withProfileMcpServers(mcpResource, target, scannedMcpServers => {
            let updatedInputs = scannedMcpServers.inputs ?? [];
            const existingServers = scannedMcpServers.servers ?? {};
            for (const { name, config, inputs } of servers) {
                existingServers[name] = config;
                if (inputs) {
                    const existingInputIds = new Set(updatedInputs.map(input => input.id));
                    const newInputs = inputs.filter(input => !existingInputIds.has(input.id));
                    updatedInputs = [...updatedInputs, ...newInputs];
                }
            }
            return { servers: existingServers, inputs: updatedInputs };
        });
    }
    async removeMcpServers(serverNames, mcpResource, target) {
        await this.withProfileMcpServers(mcpResource, target, scannedMcpServers => {
            for (const serverName of serverNames) {
                if (scannedMcpServers.servers?.[serverName]) {
                    delete scannedMcpServers.servers[serverName];
                }
            }
            return scannedMcpServers;
        });
    }
    async withProfileMcpServers(mcpResource, target, updateFn) {
        return this.getResourceAccessQueue(mcpResource)
            .queue(async () => {
            target = target ?? 2 /* ConfigurationTarget.USER */;
            let scannedMcpServers = {};
            try {
                const content = await this.fileService.readFile(mcpResource);
                const errors = [];
                const result = parse(content.value.toString(), errors, { allowTrailingComma: true, allowEmptyContent: true });
                if (errors.length > 0) {
                    throw new Error('Failed to parse scanned MCP servers: ' + errors.join(', '));
                }
                if (target === 2 /* ConfigurationTarget.USER */) {
                    scannedMcpServers = this.fromUserMcpServers(result);
                }
                else if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                    scannedMcpServers = this.fromWorkspaceFolderMcpServers(result);
                }
                else if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
                    const workspaceScannedMcpServers = result;
                    if (workspaceScannedMcpServers.settings?.mcp) {
                        scannedMcpServers = this.fromWorkspaceFolderMcpServers(workspaceScannedMcpServers.settings?.mcp);
                    }
                }
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
            }
            if (updateFn) {
                scannedMcpServers = updateFn(scannedMcpServers ?? {});
                if (target === 2 /* ConfigurationTarget.USER */) {
                    await this.writeScannedMcpServers(mcpResource, scannedMcpServers);
                }
                else if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                    await this.writeScannedMcpServersToWorkspaceFolder(mcpResource, scannedMcpServers);
                }
                else if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
                    await this.writeScannedMcpServersToWorkspace(mcpResource, scannedMcpServers);
                }
                else {
                    assertNever(target, `Invalid Target: ${ConfigurationTargetToString(target)}`);
                }
            }
            return scannedMcpServers;
        });
    }
    async writeScannedMcpServers(mcpResource, scannedMcpServers) {
        if ((scannedMcpServers.servers && Object.keys(scannedMcpServers.servers).length > 0) || (scannedMcpServers.inputs && scannedMcpServers.inputs.length > 0)) {
            await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedMcpServers, null, '\t')));
        }
        else {
            await this.fileService.del(mcpResource);
        }
    }
    async writeScannedMcpServersToWorkspaceFolder(mcpResource, scannedMcpServers) {
        await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedMcpServers, null, '\t')));
    }
    async writeScannedMcpServersToWorkspace(mcpResource, scannedMcpServers) {
        let scannedWorkspaceMcpServers;
        try {
            const content = await this.fileService.readFile(mcpResource);
            const errors = [];
            scannedWorkspaceMcpServers = parse(content.value.toString(), errors, { allowTrailingComma: true, allowEmptyContent: true });
            if (errors.length > 0) {
                throw new Error('Failed to parse scanned MCP servers: ' + errors.join(', '));
            }
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
            scannedWorkspaceMcpServers = { settings: {} };
        }
        if (!scannedWorkspaceMcpServers.settings) {
            scannedWorkspaceMcpServers.settings = {};
        }
        scannedWorkspaceMcpServers.settings.mcp = scannedMcpServers;
        await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedWorkspaceMcpServers, null, '\t')));
    }
    fromUserMcpServers(scannedMcpServers) {
        const userMcpServers = {
            inputs: scannedMcpServers.inputs
        };
        const servers = Object.entries(scannedMcpServers.servers ?? {});
        if (servers.length > 0) {
            userMcpServers.servers = {};
            for (const [serverName, server] of servers) {
                userMcpServers.servers[serverName] = this.sanitizeServer(server);
            }
        }
        return userMcpServers;
    }
    fromWorkspaceFolderMcpServers(scannedWorkspaceFolderMcpServers) {
        const scannedMcpServers = {
            inputs: scannedWorkspaceFolderMcpServers.inputs
        };
        const servers = Object.entries(scannedWorkspaceFolderMcpServers.servers ?? {});
        if (servers.length > 0) {
            scannedMcpServers.servers = {};
            for (const [serverName, config] of servers) {
                scannedMcpServers.servers[serverName] = this.sanitizeServer(config);
            }
        }
        return scannedMcpServers;
    }
    sanitizeServer(serverOrConfig) {
        let server;
        if (serverOrConfig.config) {
            const oldScannedMcpServer = serverOrConfig;
            server = {
                ...oldScannedMcpServer.config,
                version: oldScannedMcpServer.version,
                gallery: oldScannedMcpServer.gallery
            };
        }
        else {
            server = serverOrConfig;
        }
        if (server.type === undefined || (server.type !== "http" /* McpServerType.REMOTE */ && server.type !== "stdio" /* McpServerType.LOCAL */)) {
            server.type = server.command ? "stdio" /* McpServerType.LOCAL */ : "http" /* McpServerType.REMOTE */;
        }
        return server;
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            resourceQueue = new Queue();
            this.resourcesAccessQueueMap.set(file, resourceQueue);
        }
        return resourceQueue;
    }
};
McpResourceScannerService = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], McpResourceScannerService);
export { McpResourceScannerService };
registerSingleton(IMcpResourceScannerService, McpResourceScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL2NvbW1vbi9tY3BSZXNvdXJjZVNjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxLQUFLLEVBQWMsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRzFELE9BQU8sRUFBdUIsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRyxPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUF5QjlFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBNkIsNEJBQTRCLENBQUMsQ0FBQztBQVE3RyxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFLeEQsWUFDZSxXQUEwQyxFQUNuQyxrQkFBMEQ7UUFFL0UsS0FBSyxFQUFFLENBQUM7UUFIdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDaEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUovRCw0QkFBdUIsR0FBRyxJQUFJLFdBQVcsRUFBNkIsQ0FBQztJQU94RixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFnQixFQUFFLE1BQTBCO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFnQyxFQUFFLFdBQWdCLEVBQUUsTUFBMEI7UUFDakcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3pFLElBQUksYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7WUFDbkQsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUN4RCxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNoRCxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDO2dCQUMvQixJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN2RSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFFLGFBQWEsR0FBRyxDQUFDLEdBQUcsYUFBYSxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFxQixFQUFFLFdBQWdCLEVBQUUsTUFBMEI7UUFDekYsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3pFLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlDLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxpQkFBaUIsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQUMsV0FBZ0IsRUFBRSxNQUEwQixFQUFFLFFBQTJEO1FBQzVJLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQzthQUM3QyxLQUFLLENBQUMsS0FBSyxJQUFpQyxFQUFFO1lBQzlDLE1BQU0sR0FBRyxNQUFNLG9DQUE0QixDQUFDO1lBQzVDLElBQUksaUJBQWlCLEdBQXVCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDN0QsTUFBTSxNQUFNLEdBQWlCLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzlHLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzlFLENBQUM7Z0JBRUQsSUFBSSxNQUFNLHFDQUE2QixFQUFFLENBQUM7b0JBQ3pDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckQsQ0FBQztxQkFBTSxJQUFJLE1BQU0saURBQXlDLEVBQUUsQ0FBQztvQkFDNUQsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO3FCQUFNLElBQUksTUFBTSwwQ0FBa0MsRUFBRSxDQUFDO29CQUNyRCxNQUFNLDBCQUEwQixHQUFnQyxNQUFNLENBQUM7b0JBQ3ZFLElBQUksMEJBQTBCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO3dCQUM5QyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNsRyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsK0NBQXVDLEVBQUUsQ0FBQztvQkFDekUsTUFBTSxLQUFLLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFFdEQsSUFBSSxNQUFNLHFDQUE2QixFQUFFLENBQUM7b0JBQ3pDLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDO3FCQUFNLElBQUksTUFBTSxpREFBeUMsRUFBRSxDQUFDO29CQUM1RCxNQUFNLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDcEYsQ0FBQztxQkFBTSxJQUFJLE1BQU0sMENBQWtDLEVBQUUsQ0FBQztvQkFDckQsTUFBTSxJQUFJLENBQUMsaUNBQWlDLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQzlFLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxXQUFXLENBQUMsTUFBTSxFQUFFLG1CQUFtQiwyQkFBMkIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQy9FLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxpQkFBaUIsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsc0JBQXNCLENBQUMsV0FBZ0IsRUFBRSxpQkFBcUM7UUFDM0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkgsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHVDQUF1QyxDQUFDLFdBQWdCLEVBQUUsaUJBQXFDO1FBQzVHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25ILENBQUM7SUFFTyxLQUFLLENBQUMsaUNBQWlDLENBQUMsV0FBZ0IsRUFBRSxpQkFBcUM7UUFDdEcsSUFBSSwwQkFBbUUsQ0FBQztRQUN4RSxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdELE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7WUFDaEMsMEJBQTBCLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFnQyxDQUFDO1lBQzNKLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUUsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDLCtDQUF1QyxFQUFFLENBQUM7Z0JBQ3pFLE1BQU0sS0FBSyxDQUFDO1lBQ2IsQ0FBQztZQUNELDBCQUEwQixHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQy9DLENBQUM7UUFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUMsMEJBQTBCLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsMEJBQTBCLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQztRQUM1RCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1SCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsaUJBQXFDO1FBQy9ELE1BQU0sY0FBYyxHQUF1QjtZQUMxQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsTUFBTTtTQUNoQyxDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEUsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLGNBQWMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQzVCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDNUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUM7SUFDdkIsQ0FBQztJQUVPLDZCQUE2QixDQUFDLGdDQUFvRDtRQUN6RixNQUFNLGlCQUFpQixHQUF1QjtZQUM3QyxNQUFNLEVBQUUsZ0NBQWdDLENBQUMsTUFBTTtTQUMvQyxDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0UsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLGlCQUFpQixDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDL0IsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUM1QyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRSxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUM7SUFDMUIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxjQUF1RTtRQUM3RixJQUFJLE1BQStCLENBQUM7UUFDcEMsSUFBMkIsY0FBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25ELE1BQU0sbUJBQW1CLEdBQXlCLGNBQWMsQ0FBQztZQUNqRSxNQUFNLEdBQUc7Z0JBQ1IsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNO2dCQUM3QixPQUFPLEVBQUUsbUJBQW1CLENBQUMsT0FBTztnQkFDcEMsT0FBTyxFQUFFLG1CQUFtQixDQUFDLE9BQU87YUFDcEMsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLGNBQXlDLENBQUM7UUFDcEQsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxzQ0FBeUIsSUFBSSxNQUFNLENBQUMsSUFBSSxzQ0FBd0IsQ0FBQyxFQUFFLENBQUM7WUFDdkUsTUFBTyxDQUFDLElBQUksR0FBa0MsTUFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLG1DQUFxQixDQUFDLGtDQUFxQixDQUFDO1FBQ3JKLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxJQUFTO1FBQ3ZDLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLGFBQWEsR0FBRyxJQUFJLEtBQUssRUFBc0IsQ0FBQztZQUNoRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztDQUNELENBQUE7QUFsTFkseUJBQXlCO0lBTW5DLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxtQkFBbUIsQ0FBQTtHQVBULHlCQUF5QixDQWtMckM7O0FBRUQsaUJBQWlCLENBQUMsMEJBQTBCLEVBQUUseUJBQXlCLG9DQUE0QixDQUFDIn0=