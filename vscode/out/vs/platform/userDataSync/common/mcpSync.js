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
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { AbstractJsonSynchronizer } from './abstractJsonSynchronizer.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService } from './userDataSync.js';
export function getMcpContentFromSyncContent(syncContent, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        return parsed.mcp ?? null;
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let McpSynchroniser = class McpSynchroniser extends AbstractJsonSynchronizer {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, telemetryService, uriIdentityService) {
        super(profile.mcpResource, { syncResource: "mcp" /* SyncResource.Mcp */, profile }, collection, 'mcp.json', fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
    }
    getContentFromSyncContent(syncContent) {
        return getMcpContentFromSyncContent(syncContent, this.logService);
    }
    toSyncContent(mcp) {
        return mcp ? { mcp } : {};
    }
};
McpSynchroniser = __decorate([
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncLocalStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IConfigurationService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IFileService),
    __param(8, IEnvironmentService),
    __param(9, IStorageService),
    __param(10, ITelemetryService),
    __param(11, IUriIdentityService)
], McpSynchroniser);
export { McpSynchroniser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU3luYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9tY3BTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLDhCQUE4QixFQUF5Qix1QkFBdUIsRUFBRSw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBZ0IsTUFBTSxtQkFBbUIsQ0FBQztBQU01TCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsV0FBbUIsRUFBRSxVQUF1QjtJQUN4RixJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sR0FBb0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN4RCxPQUFPLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7QUFDRixDQUFDO0FBRU0sSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSx3QkFBd0I7SUFFNUQsWUFDQyxPQUF5QixFQUN6QixVQUE4QixFQUNILHdCQUFtRCxFQUM5Qyw2QkFBNkQsRUFDcEUsVUFBbUMsRUFDckMsb0JBQTJDLEVBQ2xDLDZCQUE2RCxFQUMvRSxXQUF5QixFQUNsQixrQkFBdUMsRUFDM0MsY0FBK0IsRUFDN0IsZ0JBQW1DLEVBQ2pDLGtCQUF1QztRQUU1RCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLFlBQVksOEJBQWtCLEVBQUUsT0FBTyxFQUFFLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2xULENBQUM7SUFFUyx5QkFBeUIsQ0FBQyxXQUFtQjtRQUN0RCxPQUFPLDRCQUE0QixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVTLGFBQWEsQ0FBQyxHQUFrQjtRQUN6QyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRCxDQUFBO0FBMUJZLGVBQWU7SUFLekIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxtQkFBbUIsQ0FBQTtHQWRULGVBQWUsQ0EwQjNCIn0=