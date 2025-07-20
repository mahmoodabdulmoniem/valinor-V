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
import { listProcesses } from '../../../base/node/ps.js';
import { localize } from '../../../nls.js';
import { IDiagnosticsService, isRemoteDiagnosticError } from '../../diagnostics/common/diagnostics.js';
import { IDiagnosticsMainService } from '../../diagnostics/electron-main/diagnosticsMainService.js';
import { ILogService } from '../../log/common/log.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
let ProcessMainService = class ProcessMainService {
    constructor(logService, diagnosticsService, diagnosticsMainService) {
        this.logService = logService;
        this.diagnosticsService = diagnosticsService;
        this.diagnosticsMainService = diagnosticsMainService;
    }
    async resolveProcesses() {
        const mainProcessInfo = await this.diagnosticsMainService.getMainDiagnostics();
        const pidToNames = [];
        for (const window of mainProcessInfo.windows) {
            pidToNames.push([window.pid, `window [${window.id}] (${window.title})`]);
        }
        for (const { pid, name } of UtilityProcess.getAll()) {
            pidToNames.push([pid, name]);
        }
        const processes = [];
        try {
            processes.push({ name: localize('local', "Local"), rootProcess: await listProcesses(process.pid) });
            const remoteDiagnostics = await this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true });
            remoteDiagnostics.forEach(data => {
                if (isRemoteDiagnosticError(data)) {
                    processes.push({
                        name: data.hostName,
                        rootProcess: data
                    });
                }
                else {
                    if (data.processes) {
                        processes.push({
                            name: data.hostName,
                            rootProcess: data.processes
                        });
                    }
                }
            });
        }
        catch (e) {
            this.logService.error(`Listing processes failed: ${e}`);
        }
        return { pidToNames, processes };
    }
    async getSystemStatus() {
        const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);
        return this.diagnosticsService.getDiagnostics(info, remoteData);
    }
    async getSystemInfo() {
        const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: false, includeWorkspaceMetadata: false })]);
        const msg = await this.diagnosticsService.getSystemInfo(info, remoteData);
        return msg;
    }
    async getPerformanceInfo() {
        try {
            const [info, remoteData] = await Promise.all([this.diagnosticsMainService.getMainDiagnostics(), this.diagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true, includeWorkspaceMetadata: true })]);
            return await this.diagnosticsService.getPerformanceInfo(info, remoteData);
        }
        catch (error) {
            this.logService.warn('issueService#getPerformanceInfo ', error.message);
            throw error;
        }
    }
};
ProcessMainService = __decorate([
    __param(0, ILogService),
    __param(1, IDiagnosticsService),
    __param(2, IDiagnosticsMainService)
], ProcessMainService);
export { ProcessMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9jZXNzL2VsZWN0cm9uLW1haW4vcHJvY2Vzc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLG1CQUFtQixFQUEwQix1QkFBdUIsRUFBK0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1SixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRy9FLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBSTlCLFlBQytCLFVBQXVCLEVBQ2Ysa0JBQXVDLEVBQ25DLHNCQUErQztRQUYzRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2YsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNuQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO0lBRTFGLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFL0UsTUFBTSxVQUFVLEdBQXVCLEVBQUUsQ0FBQztRQUMxQyxLQUFLLE1BQU0sTUFBTSxJQUFJLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxD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