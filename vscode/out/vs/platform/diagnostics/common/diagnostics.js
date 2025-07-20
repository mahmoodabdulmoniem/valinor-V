/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ID = 'diagnosticsService';
export const IDiagnosticsService = createDecorator(ID);
export function isRemoteDiagnosticError(x) {
    const candidate = x;
    return !!candidate?.hostName && !!candidate?.errorMessage;
}
export class NullDiagnosticsService {
    async getPerformanceInfo(mainProcessInfo, remoteInfo) {
        return {};
    }
    async getSystemInfo(mainProcessInfo, remoteInfo) {
        return {
            processArgs: 'nullProcessArgs',
            gpuStatus: 'nullGpuStatus',
            screenReader: 'nullScreenReader',
            remoteData: [],
            os: 'nullOs',
            memory: 'nullMemory',
            vmHint: 'nullVmHint',
        };
    }
    async getDiagnostics(mainProcessInfo, remoteInfo) {
        return '';
    }
    async getWorkspaceFileExtensions(workspace) {
        return { extensions: [] };
    }
    async reportWorkspaceStats(workspace) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWdub3N0aWNzL2NvbW1vbi9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHOUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLG9CQUFvQixDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0IsRUFBRSxDQUFDLENBQUM7QUFtRjVFLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxDQUFVO0lBQ2pELE1BQU0sU0FBUyxHQUFHLENBQXVDLENBQUM7SUFDMUQsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQztBQUMzRCxDQUFDO0FBRUQsTUFBTSxPQUFPLHNCQUFzQjtJQUdsQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZUFBd0MsRUFBRSxVQUE4RDtRQUNoSSxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQXdDLEVBQUUsVUFBOEQ7UUFDM0gsT0FBTztZQUNOLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFLGtCQUFrQjtZQUNoQyxVQUFVLEVBQUUsRUFBRTtZQUNkLEVBQUUsRUFBRSxRQUFRO1lBQ1osTUFBTSxFQUFFLFlBQVk7WUFDcEIsTUFBTSxFQUFFLFlBQVk7U0FDcEIsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQXdDLEVBQUUsVUFBOEQ7UUFDNUgsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLFNBQXFCO1FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFnQyxJQUFtQixDQUFDO0NBRS9FIn0=