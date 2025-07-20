/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ChatViewId } from '../chat.js';
class ConfigModeActionImpl extends Action2 {
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.mode.select-dialog.placeholder', 'Select the chat mode file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.mode, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
// Separate action `Configure Mode` link in the mode picker.
const PICKER_CONFIGURE_MODES_ACTION_ID = 'workbench.action.chat.picker.configmode';
class PickerConfigModeAction extends ConfigModeActionImpl {
    constructor() {
        super({
            id: PICKER_CONFIGURE_MODES_ACTION_ID,
            title: localize2('select-mode', "Configure Modes..."),
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatModePicker,
            }
        });
    }
}
/**
 * Action ID for the `Configure Custom Chat Mode` action.
 */
const CONFIGURE_MODES_ACTION_ID = 'workbench.action.chat.manage.mode';
class ManageModeAction extends ConfigModeActionImpl {
    constructor() {
        super({
            id: CONFIGURE_MODES_ACTION_ID,
            title: localize2('configure-modes', "Configure Chat Modes..."),
            shortTitle: localize('configure-modes.short', "Modes"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            menu: [
                {
                    id: CHAT_CONFIG_MENU_ID,
                    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                    order: 12,
                    group: '0_level'
                }
            ]
        });
    }
}
/**
 * Helper to register all the `Run Current Prompt` actions.
 */
export function registerChatModeActions() {
    registerAction2(ManageModeAction);
    registerAction2(PickerConfigModeAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NoYXRNb2RlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXhDLE1BQWUsb0JBQXFCLFNBQVEsT0FBTztJQUNsQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25ELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRXpELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUUvRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQzNCLHlDQUF5QyxFQUN6QyxtQ0FBbUMsQ0FDbkMsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzFHLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELDREQUE0RDtBQUU1RCxNQUFNLGdDQUFnQyxHQUFHLHlDQUF5QyxDQUFDO0FBRW5GLE1BQU0sc0JBQXVCLFNBQVEsb0JBQW9CO0lBQ3hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQztZQUNyRCxRQUFRLEVBQUUsYUFBYTtZQUN2QixFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7YUFDekI7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0seUJBQXlCLEdBQUcsbUNBQW1DLENBQUM7QUFFdEUsTUFBTSxnQkFBaUIsU0FBUSxvQkFBb0I7SUFDbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUM7WUFDOUQsVUFBVSxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUM7WUFDdEQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDO1lBQ25GLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQ3RILEtBQUssRUFBRSxFQUFFO29CQUNULEtBQUssRUFBRSxTQUFTO2lCQUNoQjthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBR0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsdUJBQXVCO0lBQ3RDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3pDLENBQUMifQ==