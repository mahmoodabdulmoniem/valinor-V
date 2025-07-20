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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { McpManagementChannelClient } from '../../../../platform/mcp/common/mcpManagementIpc.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { WorkbenchMcpManagementService as BaseWorkbenchMcpManagementService, IWorkbenchMcpManagementService } from '../common/mcpWorkbenchManagementService.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-browser/services.js';
import { IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
let WorkbenchMcpManagementService = class WorkbenchMcpManagementService extends BaseWorkbenchMcpManagementService {
    constructor(allowedMcpServersService, userDataProfileService, uriIdentityService, workspaceContextService, remoteAgentService, userDataProfilesService, remoteUserDataProfilesService, instantiationService, sharedProcessService) {
        const mcpManagementService = new McpManagementChannelClient(sharedProcessService.getChannel('mcpManagement'), allowedMcpServersService);
        super(mcpManagementService, allowedMcpServersService, userDataProfileService, uriIdentityService, workspaceContextService, remoteAgentService, userDataProfilesService, remoteUserDataProfilesService, instantiationService);
        this._register(mcpManagementService);
    }
};
WorkbenchMcpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, IUserDataProfileService),
    __param(2, IUriIdentityService),
    __param(3, IWorkspaceContextService),
    __param(4, IRemoteAgentService),
    __param(5, IUserDataProfilesService),
    __param(6, IRemoteUserDataProfilesService),
    __param(7, IInstantiationService),
    __param(8, ISharedProcessService)
], WorkbenchMcpManagementService);
export { WorkbenchMcpManagementService };
registerSingleton(IWorkbenchMcpManagementService, WorkbenchMcpManagementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwV29ya2JlbmNoTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9tY3AvZWxlY3Ryb24tYnJvd3Nlci9tY3BXb3JrYmVuY2hNYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0RyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEcsT0FBTyxFQUFFLDZCQUE2QixJQUFJLGlDQUFpQyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEssT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFdEYsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxpQ0FBaUM7SUFFbkYsWUFDNEIsd0JBQW1ELEVBQ3JELHNCQUErQyxFQUNuRCxrQkFBdUMsRUFDbEMsdUJBQWlELEVBQ3RELGtCQUF1QyxFQUNsQyx1QkFBaUQsRUFDM0MsNkJBQTZELEVBQ3RFLG9CQUEyQyxFQUMzQyxvQkFBMkM7UUFFbEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDBCQUEwQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3hJLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSw2QkFBNkIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQzdOLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0QsQ0FBQTtBQWpCWSw2QkFBNkI7SUFHdkMsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FYWCw2QkFBNkIsQ0FpQnpDOztBQUVELGlCQUFpQixDQUFDLDhCQUE4QixFQUFFLDZCQUE2QixvQ0FBNEIsQ0FBQyJ9