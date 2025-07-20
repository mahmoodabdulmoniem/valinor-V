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
import { VSBuffer } from '../../../base/common/buffer.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractJsonSynchronizer } from './abstractJsonSynchronizer.js';
import { AbstractInitializer } from './abstractSynchronizer.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService } from './userDataSync.js';
export function getTasksContentFromSyncContent(syncContent, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        return parsed.tasks ?? null;
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let TasksSynchroniser = class TasksSynchroniser extends AbstractJsonSynchronizer {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, telemetryService, uriIdentityService) {
        super(profile.tasksResource, { syncResource: "tasks" /* SyncResource.Tasks */, profile }, collection, 'tasks.json', fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
    }
    getContentFromSyncContent(syncContent) {
        return getTasksContentFromSyncContent(syncContent, this.logService);
    }
    toSyncContent(tasks) {
        return tasks ? { tasks } : {};
    }
};
TasksSynchroniser = __decorate([
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
], TasksSynchroniser);
export { TasksSynchroniser };
let TasksInitializer = class TasksInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("tasks" /* SyncResource.Tasks */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
        this.tasksResource = this.userDataProfilesService.defaultProfile.tasksResource;
    }
    async doInitialize(remoteUserData) {
        const tasksContent = remoteUserData.syncData ? getTasksContentFromSyncContent(remoteUserData.syncData.content, this.logService) : null;
        if (!tasksContent) {
            this.logService.info('Skipping initializing tasks because remote tasks does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing tasks because local tasks exist.');
            return;
        }
        await this.fileService.writeFile(this.tasksResource, VSBuffer.fromString(tasksContent));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        return this.fileService.exists(this.tasksResource);
    }
};
TasksInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], TasksInitializer);
export { TasksInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3Rhc2tzU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFtQiw4QkFBOEIsRUFBeUIsdUJBQXVCLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQWdCLE1BQU0sbUJBQW1CLENBQUM7QUFNN00sTUFBTSxVQUFVLDhCQUE4QixDQUFDLFdBQW1CLEVBQUUsVUFBdUI7SUFDMUYsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQXNCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUQsT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUks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