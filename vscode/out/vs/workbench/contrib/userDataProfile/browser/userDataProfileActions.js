/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { PROFILES_CATEGORY } from '../../../services/userDataProfile/common/userDataProfile.js';
class CreateTransientProfileAction extends Action2 {
    static { this.ID = 'workbench.profiles.actions.createTemporaryProfile'; }
    static { this.TITLE = localize2('create temporary profile', "New Window with Temporary Profile"); }
    constructor() {
        super({
            id: CreateTransientProfileAction.ID,
            title: CreateTransientProfileAction.TITLE,
            category: PROFILES_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IHostService).openWindow({ forceTempProfile: true });
    }
}
registerAction2(CreateTransientProfileAction);
// Developer Actions
registerAction2(class CleanupProfilesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.cleanupProfiles',
            title: localize2('cleanup profile', "Cleanup Profiles"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(IUserDataProfilesService).cleanUp();
    }
});
registerAction2(class ResetWorkspacesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.resetWorkspaces',
            title: localize2('reset workspaces', "Reset Workspace Profiles Associations"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const userDataProfilesService = accessor.get(IUserDataProfilesService);
        return userDataProfilesService.resetWorkspaces();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRWhHLE1BQU0sNEJBQTZCLFNBQVEsT0FBTzthQUNqQyxPQUFFLEdBQUcsbURBQW1ELENBQUM7YUFDekQsVUFBSyxHQUFHLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ25HO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QixDQUFDLEVBQUU7WUFDbkMsS0FBSyxFQUFFLDRCQUE0QixDQUFDLEtBQUs7WUFDekMsUUFBUSxFQUFFLGlCQUFpQjtZQUMzQixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNuRSxDQUFDOztBQUdGLGVBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRTlDLG9CQUFvQjtBQUVwQixlQUFlLENBQUMsTUFBTSxxQkFBc0IsU0FBUSxPQUFPO0lBQzFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRDQUE0QztZQUNoRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDO1lBQ3ZELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3pELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSxxQkFBc0IsU0FBUSxPQUFPO0lBQzFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRDQUE0QztZQUNoRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLHVDQUF1QyxDQUFDO1lBQzdFLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sdUJBQXVCLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDbEQsQ0FBQztDQUNELENBQUMsQ0FBQyJ9