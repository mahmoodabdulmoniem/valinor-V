/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
export function registerChatDeveloperActions() {
    registerAction2(OpenChatStorageFolderAction);
}
class OpenChatStorageFolderAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openStorageFolder'; }
    constructor() {
        super({
            id: OpenChatStorageFolderAction.ID,
            title: localize2('workbench.action.chat.openStorageFolder.label', "Open Chat Storage Folder"),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true,
            precondition: ChatContextKeys.enabled
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const nativeHostService = accessor.get(INativeHostService);
        const storagePath = chatService.getChatStorageFolder();
        nativeHostService.showItemInFolder(storagePath.fsPath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERldmVsb3BlckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tYnJvd3Nlci9hY3Rpb25zL2NoYXREZXZlbG9wZXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUzRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLDJCQUE0QixTQUFRLE9BQU87YUFDaEMsT0FBRSxHQUFHLHlDQUF5QyxDQUFDO0lBRS9EO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQixDQUFDLEVBQUU7WUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQywrQ0FBK0MsRUFBRSwwQkFBMEIsQ0FBQztZQUM3RixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzVELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDdkQsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELENBQUMifQ==