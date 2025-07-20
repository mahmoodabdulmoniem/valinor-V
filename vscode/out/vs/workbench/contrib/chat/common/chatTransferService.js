var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { areWorkspaceFoldersEmpty } from '../../../services/workspaces/common/workspaceUtils.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatTransferService = createDecorator('chatTransferService');
const transferredWorkspacesKey = 'chat.transferedWorkspaces';
let ChatTransferService = class ChatTransferService {
    constructor(workspaceService, storageService, fileService, workspaceTrustManagementService) {
        this.workspaceService = workspaceService;
        this.storageService = storageService;
        this.fileService = fileService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
    }
    deleteWorkspaceFromTransferredList(workspace) {
        const transferredWorkspaces = this.storageService.getObject(transferredWorkspacesKey, 0 /* StorageScope.PROFILE */, []);
        const updatedWorkspaces = transferredWorkspaces.filter(uri => uri !== workspace.toString());
        this.storageService.store(transferredWorkspacesKey, updatedWorkspaces, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    addWorkspaceToTransferred(workspace) {
        const transferredWorkspaces = this.storageService.getObject(transferredWorkspacesKey, 0 /* StorageScope.PROFILE */, []);
        transferredWorkspaces.push(workspace.toString());
        this.storageService.store(transferredWorkspacesKey, transferredWorkspaces, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    async checkAndSetTransferredWorkspaceTrust() {
        const workspace = this.workspaceService.getWorkspace();
        const currentWorkspaceUri = workspace.folders[0]?.uri;
        if (!currentWorkspaceUri) {
            return;
        }
        if (this.isChatTransferredWorkspace(currentWorkspaceUri, this.storageService) && await areWorkspaceFoldersEmpty(workspace, this.fileService)) {
            await this.workspaceTrustManagementService.setWorkspaceTrust(true);
            this.deleteWorkspaceFromTransferredList(currentWorkspaceUri);
        }
    }
    isChatTransferredWorkspace(workspace, storageService) {
        if (!workspace) {
            return false;
        }
        const chatWorkspaceTransfer = storageService.getObject(transferredWorkspacesKey, 0 /* StorageScope.PROFILE */, []);
        return chatWorkspaceTransfer.some(item => item.toString() === workspace.toString());
    }
};
ChatTransferService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IStorageService),
    __param(2, IFileService),
    __param(3, IWorkspaceTrustManagementService)
], ChatTransferService);
export { ChatTransferService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyYW5zZmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFRyYW5zZmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMzRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHN0YsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBQ2pHLE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCLENBQUM7QUFTdEQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFHL0IsWUFDNEMsZ0JBQTBDLEVBQ25ELGNBQStCLEVBQ2xDLFdBQXlCLEVBQ0wsK0JBQWlFO1FBSHpFLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7UUFDbkQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2xDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ0wsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztJQUNqSCxDQUFDO0lBRUwsa0NBQWtDLENBQUMsU0FBYztRQUNoRCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFXLHdCQUF3QixnQ0FBd0IsRUFBRSxDQUFDLENBQUM7UUFDMUgsTUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsaUJBQWlCLDhEQUE4QyxDQUFDO0lBQ3JILENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxTQUFjO1FBQ3ZDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQVcsd0JBQXdCLGdDQUF3QixFQUFFLENBQUMsQ0FBQztRQUMxSCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUscUJBQXFCLDhEQUE4QyxDQUFDO0lBQ3pILENBQUM7SUFFRCxLQUFLLENBQUMsb0NBQW9DO1FBQ3pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2RCxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1FBQ3RELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLE1BQU0sd0JBQXdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzlJLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRUQsMEJBQTBCLENBQUMsU0FBYyxFQUFFLGNBQStCO1FBQ3pFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLHFCQUFxQixHQUFVLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLGdDQUF3QixFQUFFLENBQUMsQ0FBQztRQUNsSCxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNyRixDQUFDO0NBQ0QsQ0FBQTtBQXpDWSxtQkFBbUI7SUFJN0IsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxnQ0FBZ0MsQ0FBQTtHQVB0QixtQkFBbUIsQ0F5Qy9CIn0=