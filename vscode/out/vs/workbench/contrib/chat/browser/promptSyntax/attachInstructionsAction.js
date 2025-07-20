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
import { ChatViewId, IChatWidgetService, showChatView } from '../chat.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { getCleanPromptName } from '../../common/promptSyntax/config/promptFileLocations.js';
import { INSTRUCTIONS_LANGUAGE_ID, PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { compare } from '../../../../../base/common/strings.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { dirname } from '../../../../../base/common/resources.js';
import { PromptFileVariableKind, toPromptFileVariableEntry } from '../../common/chatVariableEntries.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
/**
 * Action ID for the `Attach Instruction` action.
 */
const ATTACH_INSTRUCTIONS_ACTION_ID = 'workbench.action.chat.attach.instructions';
/**
 * Action ID for the `Configure Instruction` action.
 */
const CONFIGURE_INSTRUCTIONS_ACTION_ID = 'workbench.action.chat.configure.instructions';
/**
 * Action to attach a prompt to a chat widget input.
 */
class AttachInstructionsAction extends Action2 {
    constructor() {
        super({
            id: ATTACH_INSTRUCTIONS_ACTION_ID,
            title: localize2('attach-instructions.capitalized.ellipses', "Attach Instructions..."),
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 90 /* KeyCode.Slash */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled)
            }
        });
    }
    async run(accessor, options) {
        const viewsService = accessor.get(IViewsService);
        const instaService = accessor.get(IInstantiationService);
        if (!options) {
            options = {
                resource: getActiveInstructionsFileUri(accessor),
                widget: getFocusedChatWidget(accessor),
            };
        }
        const pickers = instaService.createInstance(PromptFilePickers);
        const { skipSelectionDialog, resource } = options;
        const widget = options.widget ?? (await showChatView(viewsService));
        if (!widget) {
            return;
        }
        if (skipSelectionDialog && resource) {
            widget.attachmentModel.addContext(toPromptFileVariableEntry(resource, PromptFileVariableKind.Instruction));
            widget.focusInput();
            return;
        }
        const placeholder = localize('commands.instructions.select-dialog.placeholder', 'Select instructions files to attach');
        const result = await pickers.selectPromptFile({ resource, placeholder, type: PromptsType.instructions });
        if (result !== undefined) {
            widget.attachmentModel.addContext(toPromptFileVariableEntry(result.promptFile, PromptFileVariableKind.Instruction));
            widget.focusInput();
        }
    }
}
class ManageInstructionsFilesAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_INSTRUCTIONS_ACTION_ID,
            title: localize2('configure-instructions', "Configure Instructions..."),
            shortTitle: localize2('configure-instructions.short', "Instructions"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 11,
                group: '0_level'
            }
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.manage-dialog.placeholder', 'Select the instructions file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.instructions, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
function getFocusedChatWidget(accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const { lastFocusedWidget } = chatWidgetService;
    if (!lastFocusedWidget) {
        return undefined;
    }
    // the widget input `must` be focused at the time when command run
    if (!lastFocusedWidget.hasInputFocus()) {
        return undefined;
    }
    return lastFocusedWidget;
}
/**
 * Gets `URI` of a instructions file open in an active editor instance, if any.
 */
function getActiveInstructionsFileUri(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const model = codeEditorService.getActiveCodeEditor()?.getModel();
    if (model?.getLanguageId() === INSTRUCTIONS_LANGUAGE_ID) {
        return model.uri;
    }
    return undefined;
}
/**
 * Helper to register the `Attach Prompt` action.
 */
export function registerAttachPromptActions() {
    registerAction2(AttachInstructionsAction);
    registerAction2(ManageInstructionsFilesAction);
}
let ChatInstructionsPickerPick = class ChatInstructionsPickerPick {
    constructor(promptsService, labelService, configurationService) {
        this.promptsService = promptsService;
        this.labelService = labelService;
        this.configurationService = configurationService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.attach.instructions.label', 'Instructions...');
        this.icon = Codicon.bookmark;
        this.commandId = ATTACH_INSTRUCTIONS_ACTION_ID;
    }
    isEnabled(widget) {
        return PromptsConfig.enabled(this.configurationService);
    }
    asPicker() {
        const picks = this.promptsService.listPromptFiles(PromptsType.instructions, CancellationToken.None).then(value => {
            const result = [];
            value = value.slice(0).sort((a, b) => compare(a.storage, b.storage));
            let storageType;
            for (const { uri, storage } of value) {
                if (storageType !== storage) {
                    storageType = storage;
                    result.push({
                        type: 'separator',
                        label: storage === 'user'
                            ? localize('user-data-dir.capitalized', 'User data folder')
                            : this.labelService.getUriLabel(dirname(uri), { relative: true })
                    });
                }
                result.push({
                    label: getCleanPromptName(uri),
                    asAttachment: () => {
                        return toPromptFileVariableEntry(uri, PromptFileVariableKind.Instruction);
                    }
                });
            }
            return result;
        });
        return {
            placeholder: localize('placeholder', 'Select instructions files to attach'),
            picks,
            configure: {
                label: localize('configureInstructions', 'Configure Instructions...'),
                commandId: CONFIGURE_INSTRUCTIONS_ACTION_ID
            }
        };
    }
};
ChatInstructionsPickerPick = __decorate([
    __param(0, IPromptsService),
    __param(1, ILabelService),
    __param(2, IConfigurationService)
], ChatInstructionsPickerPick);
export { ChatInstructionsPickerPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoSW5zdHJ1Y3Rpb25zQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2F0dGFjaEluc3RydWN0aW9uc0FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFP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