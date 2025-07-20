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
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IMcpGalleryService } from '../common/mcpManagement.js';
import { McpUserResourceManagementService as CommonMcpUserResourceManagementService, McpManagementService as CommonMcpManagementService } from '../common/mcpManagementService.js';
import { IMcpResourceScannerService } from '../common/mcpResourceScannerService.js';
let McpUserResourceManagementService = class McpUserResourceManagementService extends CommonMcpUserResourceManagementService {
    constructor(mcpResource, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService, environmentService) {
        super(mcpResource, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService, environmentService);
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
export class McpManagementService extends CommonMcpManagementService {
    createMcpResourceManagementService(mcpResource) {
        return this.instantiationService.createInstance(McpUserResourceManagementService, mcpResource);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9ub2RlL21jcE1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUF5QixNQUFNLDRCQUE0QixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxnQ0FBZ0MsSUFBSSxzQ0FBc0MsRUFBRSxvQkFBb0IsSUFBSSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25MLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRzdFLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsc0NBQXNDO0lBQzNGLFlBQ0MsV0FBZ0IsRUFDSSxpQkFBcUMsRUFDM0MsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQy9DLFVBQXVCLEVBQ1IseUJBQXFELEVBQzVELGtCQUF1QztRQUU1RCxLQUFLLENBQUMsV0FBVyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUseUJBQXlCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNuSSxDQUFDO0NBQ0QsQ0FBQTtBQVpZLGdDQUFnQztJQUcxQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxtQkFBbUIsQ0FBQTtHQVJULGdDQUFnQyxDQVk1Qzs7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsMEJBQTBCO0lBQ2hELGtDQUFrQyxDQUFDLFdBQWdCO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNoRyxDQUFDO0NBQ0QifQ==