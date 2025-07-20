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
import { Disposable, DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Throttler } from '../../../../../base/common/async.js';
import { URI } from '../../../../../base/common/uri.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { IMcpWorkbenchService } from '../mcpTypes.js';
import { mcpConfigurationSection } from '../mcpConfiguration.js';
import { posix as pathPosix, win32 as pathWin32, sep as pathSep } from '../../../../../base/common/path.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { getMcpServerMapping } from '../mcpConfigFileUtils.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { isWindows } from '../../../../../base/common/platform.js';
let InstalledMcpServersDiscovery = class InstalledMcpServersDiscovery extends Disposable {
    constructor(mcpWorkbenchService, mcpRegistry, remoteAgentService, textModelService) {
        super();
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.mcpRegistry = mcpRegistry;
        this.remoteAgentService = remoteAgentService;
        this.textModelService = textModelService;
        this.collectionDisposables = this._register(new DisposableMap());
    }
    start() {
        const throttler = this._register(new Throttler());
        this._register(this.mcpWorkbenchService.onChange(() => throttler.queue(() => this.sync())));
        this.sync();
    }
    async getServerIdMapping(resource, pathToServers) {
        const store = new DisposableStore();
        try {
            const ref = await this.textModelService.createModelReference(resource);
            store.add(ref);
            const serverIdMapping = getMcpServerMapping({ model: ref.object.textEditorModel, pathToServers });
            return serverIdMapping;
        }
        catch {
            return new Map();
        }
        finally {
            store.dispose();
        }
    }
    async sync() {
        try {
            const remoteEnv = await this.remoteAgentService.getEnvironment();
            const collections = new Map();
            const mcpConfigPathInfos = new ResourceMap();
            for (const server of this.mcpWorkbenchService.local) {
                if (!server.local) {
                    continue;
                }
                let mcpConfigPathPromise = mcpConfigPathInfos.get(server.local.mcpResource);
                if (!mcpConfigPathPromise) {
                    mcpConfigPathPromise = (async (local) => {
                        const mcpConfigPath = this.mcpWorkbenchService.getMcpConfigPath(local);
                        const locations = mcpConfigPath?.uri ? await this.getServerIdMapping(mcpConfigPath?.uri, mcpConfigPath.section ? [...mcpConfigPath.section, 'servers'] : ['servers']) : new Map();
                        return mcpConfigPath ? { ...mcpConfigPath, locations } : undefined;
                    })(server.local);
                    mcpConfigPathInfos.set(server.local.mcpResource, mcpConfigPathPromise);
                }
                const config = server.local.config;
                const mcpConfigPath = await mcpConfigPathPromise;
                const collectionId = `mcp.config.${mcpConfigPath ? mcpConfigPath.id : 'unknown'}`;
                let definitions = collections.get(collectionId);
                if (!definitions) {
                    definitions = [mcpConfigPath, [], server];
                    collections.set(collectionId, definitions);
                }
                const { isAbsolute, join, sep } = mcpConfigPath?.remoteAuthority && remoteEnv
                    ? (remoteEnv.os === 1 /* OperatingSystem.Windows */ ? pathWin32 : pathPosix)
                    : (isWindows ? pathWin32 : pathPosix);
                const fsPathForRemote = (uri) => {
                    const fsPathLocal = uri.fsPath;
                    return fsPathLocal.replaceAll(pathSep, sep);
                };
                definitions[1].push({
                    id: `${collectionId}.${server.local.name}`,
                    label: server.local.name,
                    launch: config.type === 'http' ? {
                        type: 2 /* McpServerTransportType.HTTP */,
                        uri: URI.parse(config.url),
                        headers: Object.entries(config.headers || {}),
                    } : {
                        type: 1 /* McpServerTransportType.Stdio */,
                        command: config.command,
                        args: config.args || [],
                        env: config.env || {},
                        envFile: config.envFile,
                        cwd: config.cwd
                            // if the cwd is defined in a workspace folder but not absolute (and not
                            // a variable or tilde-expansion) then resolve it in the workspace folder
                            // if the cwd is defined in a workspace folder but not absolute (and not
                            // a variable or tilde-expansion) then resolve it in the workspace folder
                            ? (!isAbsolute(config.cwd) && !config.cwd.startsWith('~') && !config.cwd.startsWith('${') && mcpConfigPath?.workspaceFolder
                                ? join(fsPathForRemote(mcpConfigPath.workspaceFolder.uri), config.cwd)
                                : config.cwd)
                            : mcpConfigPath?.workspaceFolder
                                ? fsPathForRemote(mcpConfigPath.workspaceFolder.uri)
                                : undefined,
                    },
                    roots: mcpConfigPath?.workspaceFolder ? [mcpConfigPath.workspaceFolder.uri] : undefined,
                    variableReplacement: {
                        folder: mcpConfigPath?.workspaceFolder,
                        section: mcpConfigurationSection,
                        target: mcpConfigPath?.target ?? 2 /* ConfigurationTarget.USER */,
                    },
                    devMode: config.dev,
                    presentation: {
                        order: mcpConfigPath?.order,
                        origin: mcpConfigPath?.locations.get(server.local.name)
                    }
                });
            }
            for (const [id, [mcpConfigPath, serverDefinitions]] of collections) {
                this.collectionDisposables.deleteAndDispose(id);
                this.collectionDisposables.set(id, this.mcpRegistry.registerCollection({
                    id,
                    label: mcpConfigPath?.label ?? '',
                    presentation: {
                        order: serverDefinitions[0]?.presentation?.order,
                        origin: mcpConfigPath?.uri,
                    },
                    remoteAuthority: mcpConfigPath?.remoteAuthority ?? null,
                    serverDefinitions: observableValue(this, serverDefinitions),
                    isTrustedByDefault: true,
                    configTarget: mcpConfigPath?.target ?? 2 /* ConfigurationTarget.USER */,
                    scope: mcpConfigPath?.scope ?? 0 /* StorageScope.PROFILE */,
                }));
            }
            for (const [id] of this.collectionDisposables) {
                if (!collections.has(id)) {
                    this.collectionDisposables.deleteAndDispose(id);
                }
            }
        }
        catch (error) {
            this.collectionDisposables.clearAndDisposeAll();
        }
    }
};
InstalledMcpServersDiscovery = __decorate([
    __param(0, IMcpWorkbenchService),
    __param(1, IMcpRegistry),
    __param(2, IRemoteAgentService),
    __param(3, ITextModelService)
], InstalledMcpServersDiscovery);
export { InstalledMcpServersDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbGVkTWNwU2VydmVyc0Rpc2NvdmVyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvaW5zdGFsbGVkTWNwU2VydmVyc0Rpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQStDLG9CQUFvQixFQUF1QyxNQUFNLGdCQUFnQixDQUFDO0FBRXhJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsR0FBRyxJQUFJLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQztBQUU3RSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFJM0QsWUFDdUIsbUJBQTBELEVBQ2xFLFdBQTBDLEVBQ25DLGtCQUF3RCxFQUMxRCxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFMK0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUNqRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNsQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3pDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFOdkQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBdUIsQ0FBQyxDQUFDO0lBU2xHLENBQUM7SUFFTSxLQUFLO1FBQ1gsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYSxFQUFFLGFBQXVCO1FBQ3RFLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLE1BQU0sZUFBZSxHQUFHLG1CQUFtQixDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDbEcsT0FBTyxlQUFlLENBQUM7UUFDeEIsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNsQixDQUFDO2dCQUFTLENBQUM7WUFDVixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBb0YsQ0FBQztZQUNoSCxNQUFNLGtCQUFrQixHQUFHLElBQUksV0FBVyxFQUE4RSxDQUFDO1lBQ3pILEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNuQixTQUFTO2dCQUNWLENBQUM7Z0JBRUQsSUFBSSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDNUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQzNCLG9CQUFvQixHQUFHLENBQUMsS0FBSyxFQUFFLEtBQXNCLEVBQUUsRUFBRTt3QkFDeEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUN2RSxNQUFNLFNBQVMsR0FBRyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7d0JBQ2xMLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7b0JBQ3BFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3hFLENBQUM7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ25DLE1BQU0sYUFBYSxHQUFHLE1BQU0sb0JBQW9CLENBQUM7Z0JBQ2pELE1BQU0sWUFBWSxHQUFHLGNBQWMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFFbEYsSUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQixXQUFXLEdBQUcsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztnQkFFRCxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxhQUFhLEVBQUUsZUFBZSxJQUFJLFNBQVM7b0JBQzVFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLG9DQUE0QixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztvQkFDcEUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFO29CQUNwQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO29CQUMvQixPQUFPLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDLENBQUM7Z0JBRUYsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDbkIsRUFBRSxFQUFFLEdBQUcsWUFBWSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO29CQUMxQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJO29CQUN4QixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUNoQyxJQUFJLHFDQUE2Qjt3QkFDakMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzt3QkFDMUIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7cUJBQzdDLENBQUMsQ0FBQyxDQUFDO3dCQUNILElBQUksc0NBQThCO3dCQUNsQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87d0JBQ3ZCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7d0JBQ3ZCLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLEVBQUU7d0JBQ3JCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTzt3QkFDdkIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHOzRCQUNkLHdFQUF3RTs0QkFDeEUseUVBQXlFOzRCQUN6RSx3RUFBd0U7NEJBQ3hFLHlFQUF5RTs0QkFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLEVBQUUsZUFBZTtnQ0FDMUgsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDO2dDQUN0RSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzs0QkFDZCxDQUFDLENBQUMsYUFBYSxFQUFFLGVBQWU7Z0NBQy9CLENBQUMsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUM7Z0NBQ3BELENBQUMsQ0FBQyxTQUFTO3FCQUNiO29CQUNELEtBQUssRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQ3ZGLG1CQUFtQixFQUFFO3dCQUNwQixNQUFNLEVBQUUsYUFBYSxFQUFFLGVBQWU7d0JBQ3RDLE9BQU8sRUFBRSx1QkFBdUI7d0JBQ2hDLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBNEI7cUJBQ3pEO29CQUNELE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRztvQkFDbkIsWUFBWSxFQUFFO3dCQUNiLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSzt3QkFDM0IsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3FCQUN2RDtpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDcEUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDO29CQUN0RSxFQUFFO29CQUNGLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLFlBQVksRUFBRTt3QkFDYixLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUs7d0JBQ2hELE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRztxQkFDMUI7b0JBQ0QsZUFBZSxFQUFFLGFBQWEsRUFBRSxlQUFlLElBQUksSUFBSTtvQkFDdkQsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztvQkFDM0Qsa0JBQWtCLEVBQUUsSUFBSTtvQkFDeEIsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUE0QjtvQkFDL0QsS0FBSyxFQUFFLGFBQWEsRUFBRSxLQUFLLGdDQUF3QjtpQkFDbkQsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBQ0QsS0FBSyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQzFCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakQsQ0FBQztZQUNGLENBQUM7UUFFRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMscUJBQXFCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNqRCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF4SVksNEJBQTRCO0lBS3RDLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7R0FSUCw0QkFBNEIsQ0F3SXhDIn0=