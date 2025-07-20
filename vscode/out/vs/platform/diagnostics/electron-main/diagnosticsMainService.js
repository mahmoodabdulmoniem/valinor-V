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
import { app } from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService } from '../../windows/electron-main/windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { ILogService } from '../../log/common/log.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
export const ID = 'diagnosticsMainService';
export const IDiagnosticsMainService = createDecorator(ID);
let DiagnosticsMainService = class DiagnosticsMainService {
    constructor(windowsMainService, workspacesManagementMainService, logService) {
        this.windowsMainService = windowsMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.logService = logService;
    }
    async getRemoteDiagnostics(options) {
        const windows = this.windowsMainService.getWindows();
        const diagnostics = await Promise.all(windows.map(async (window) => {
            const remoteAuthority = window.remoteAuthority;
            if (!remoteAuthority) {
                return undefined;
            }
            const replyChannel = `vscode:getDiagnosticInfoResponse${window.id}`;
            const args = {
                includeProcesses: options.includeProcesses,
                folders: options.includeWorkspaceMetadata ? await this.getFolderURIs(window) : undefined
            };
            return new Promise(resolve => {
                window.sendWhenReady('vscode:getDiagnosticInfo', CancellationToken.None, { replyChannel, args });
                validatedIpcMain.once(replyChannel, (_, data) => {
                    // No data is returned if getting the connection fails.
                    if (!data) {
                        resolve({ hostName: remoteAuthority, errorMessage: `Unable to resolve connection to '${remoteAuthority}'.` });
                    }
                    resolve(data);
                });
                setTimeout(() => {
                    resolve({ hostName: remoteAuthority, errorMessage: `Connection to '${remoteAuthority}' could not be established` });
                }, 5000);
            });
        }));
        return diagnostics.filter((x) => !!x);
    }
    async getMainDiagnostics() {
        this.logService.trace('Received request for main process info from other instance.');
        const windows = [];
        for (const window of getAllWindowsExcludingOffscreen()) {
            const codeWindow = this.windowsMainService.getWindowById(window.id);
            if (codeWindow) {
                windows.push(await this.codeWindowToInfo(codeWindow));
            }
            else {
                windows.push(this.browserWindowToInfo(window));
            }
        }
        const pidToNames = [];
        for (const { pid, name } of UtilityProcess.getAll()) {
            pidToNames.push({ pid, name });
        }
        return {
            mainPID: process.pid,
            mainArguments: process.argv.slice(1),
            windows,
            pidToNames,
            screenReader: !!app.accessibilitySupportEnabled,
            gpuFeatureStatus: app.getGPUFeatureStatus()
        };
    }
    async codeWindowToInfo(window) {
        const folderURIs = await this.getFolderURIs(window);
        const win = assertReturnsDefined(window.win);
        return this.browserWindowToInfo(win, folderURIs, window.remoteAuthority);
    }
    browserWindowToInfo(window, folderURIs = [], remoteAuthority) {
        return {
            id: window.id,
            pid: window.webContents.getOSProcessId(),
            title: window.getTitle(),
            folderURIs,
            remoteAuthority
        };
    }
    async getFolderURIs(window) {
        const folderURIs = [];
        const workspace = window.openedWorkspace;
        if (isSingleFolderWorkspaceIdentifier(workspace)) {
            folderURIs.push(workspace.uri);
        }
        else if (isWorkspaceIdentifier(workspace)) {
            const resolvedWorkspace = await this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath); // workspace folders can only be shown for local (resolved) workspaces
            if (resolvedWorkspace) {
                const rootFolders = resolvedWorkspace.folders;
                rootFolders.forEach(root => {
                    folderURIs.push(root.uri);
                });
            }
        }
        return folderURIs;
    }
};
DiagnosticsMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IWorkspacesManagementMainService),
    __param(2, ILogService)
], DiagnosticsMainService);
export { DiagnosticsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhZ25vc3RpY3MvZWxlY3Ryb24tbWFpbi9kaWFnbm9zdGljc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQW9DLE1BQU0sVUFBVSxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNySCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQztBQUMzQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLEVBQUUsQ0FBQyxDQUFDO0FBYTdFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBSWxDLFlBQ3VDLGtCQUF1QyxFQUMxQiwrQkFBaUUsRUFDdEYsVUFBdUI7UUFG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