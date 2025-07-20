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
import { DisposableMap } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { FilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
import { claudeConfigToServerDefinition } from './nativeMcpDiscoveryAdapters.js';
let CursorWorkspaceMcpDiscoveryAdapter = class CursorWorkspaceMcpDiscoveryAdapter extends FilesystemMcpDiscovery {
    constructor(fileService, _workspaceContextService, mcpRegistry, configurationService, _remoteAgentService) {
        super(configurationService, fileService, mcpRegistry);
        this._workspaceContextService = _workspaceContextService;
        this._remoteAgentService = _remoteAgentService;
        this._collections = this._register(new DisposableMap());
    }
    start() {
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders(e => {
            for (const removed of e.removed) {
                this._collections.deleteAndDispose(removed.uri.toString());
            }
            for (const added of e.added) {
                this.watchFolder(added);
            }
        }));
        for (const folder of this._workspaceContextService.getWorkspace().folders) {
            this.watchFolder(folder);
        }
    }
    watchFolder(folder) {
        const configFile = joinPath(folder.uri, '.cursor', 'mcp.json');
        const collection = {
            id: `cursor-workspace.${folder.index}`,
            label: `${folder.name}/.cursor/mcp.json`,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority || null,
            scope: 1 /* StorageScope.WORKSPACE */,
            isTrustedByDefault: false,
            serverDefinitions: observableValue(this, []),
            configTarget: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
            presentation: {
                origin: configFile,
                order: 0 /* McpCollectionSortOrder.WorkspaceFolder */ + 1,
            },
        };
        this._collections.set(folder.uri.toString(), this.watchFile(URI.joinPath(folder.uri, '.cursor', 'mcp.json'), collection, "cursor-workspace" /* DiscoverySource.CursorWorkspace */, contents => {
            const defs = claudeConfigToServerDefinition(collection.id, contents, folder.uri);
            defs?.forEach(d => d.roots = [folder.uri]);
            return defs;
        }));
    }
};
CursorWorkspaceMcpDiscoveryAdapter = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, IMcpRegistry),
    __param(3, IConfigurationService),
    __param(4, IRemoteAgentService)
], CursorWorkspaceMcpDiscoveryAdapter);
export { CursorWorkspaceMcpDiscoveryAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlTWNwRGlzY292ZXJ5QWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3Zlcnkvd29ya3NwYWNlTWNwRGlzY292ZXJ5QWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzNILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQW9CLE1BQU0sdURBQXVELENBQUM7QUFDbkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBR3RELE9BQU8sRUFBRSxzQkFBc0IsRUFBbUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxRSxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLHNCQUFzQjtJQUc3RSxZQUNlLFdBQXlCLEVBQ2Isd0JBQW1FLEVBQy9FLFdBQXlCLEVBQ2hCLG9CQUEyQyxFQUM3QyxtQkFBeUQ7UUFFOUUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLFdBQVcs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