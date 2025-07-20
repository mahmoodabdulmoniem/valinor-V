/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatViewId, showChatView } from '../chat.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { OS } from '../../../../../base/common/platform.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { assertDefined } from '../../../../../base/common/types.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { PromptsType, PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { localize, localize2 } from '../../../../../nls.js';
import { UILabelProvider } from '../../../../../base/common/keybindingLabels.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { getPromptCommandName } from '../../common/promptSyntax/service/promptsServiceImpl.js';
/**
 * Condition for the `Run Current Prompt` action.
 */
const EDITOR_ACTIONS_CONDITION = ContextKeyExpr.and(ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled), ResourceContextKey.HasResource, ResourceContextKey.LangId.isEqualTo(PROMPT_LANGUAGE_ID));
/**
 * Keybinding of the action.
 */
const COMMAND_KEY_BINDING = 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ | 512 /* KeyMod.Alt */;
/**
 * Action ID for the `Run Current Prompt` action.
 */
const RUN_CURRENT_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt.current';
/**
 * Action ID for the `Run Prompt...` action.
 */
const RUN_SELECTED_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt';
/**
 * Action ID for the `Configure Prompt Files...` action.
 */
const CONFIGURE_PROMPTS_ACTION_ID = 'workbench.action.chat.configure.prompts';
/**
 * Base class of the `Run Prompt` action.
 */
class RunPromptBaseAction extends Action2 {
    constructor(options) {
        super({
            id: options.id,
            title: options.title,
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            icon: options.icon,
            keybinding: {
                when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EDITOR_ACTIONS_CONDITION),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: options.keybinding,
            },
            menu: [
                {
                    id: MenuId.EditorTitleRun,
                    group: 'navigation',
                    order: options.alt ? 0 : 1,
                    alt: options.alt,
                    when: EDITOR_ACTIONS_CONDITION,
                },
            ],
        });
    }
    /**
     * Executes the run prompt action with provided options.
     */
    async execute(resource, inNewChat, accessor) {
        const viewsService = accessor.get(IViewsService);
        const commandService = accessor.get(ICommandService);
        resource ||= getActivePromptFileUri(accessor);
        assertDefined(resource, 'Cannot find URI resource for an active text editor.');
        if (inNewChat === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await showChatView(viewsService);
        if (widget) {
            widget.setInput(`/${getPromptCommandName(resource.path)}`);
            // submit the prompt immediately
            await widget.acceptInput();
        }
        return widget;
    }
}
const RUN_CURRENT_PROMPT_ACTION_TITLE = localize2('run-prompt.capitalized', "Run Prompt in Current Chat");
const RUN_CURRENT_PROMPT_ACTION_ICON = Codicon.playCircle;
/**
 * The default `Run Current Prompt` action.
 */
class RunCurrentPromptAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_ACTION_ID,
            title: RUN_CURRENT_PROMPT_ACTION_TITLE,
            icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING,
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, false, accessor);
    }
}
class RunSelectedPromptAction extends Action2 {
    constructor() {
        super({
            id: RUN_SELECTED_PROMPT_ACTION_ID,
            title: localize2('run-prompt.capitalized.ellipses', "Run Prompt..."),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            keybinding: {
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: COMMAND_KEY_BINDING,
            },
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const commandService = accessor.get(ICommandService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.select-dialog.placeholder', 'Select the prompt file to run (hold {0}-key to use in new chat)', UILabelProvider.modifierLabels[OS].ctrlKey);
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt });
        if (result === undefined) {
            return;
        }
        const { promptFile, keyMods } = result;
        if (keyMods.ctrlCmd === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await showChatView(viewsService);
        if (widget) {
            widget.setInput(`/${getPromptCommandName(promptFile.path)}`);
            // submit the prompt immediately
            await widget.acceptInput();
            widget.focusInput();
        }
    }
}
class ManagePromptFilesAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_PROMPTS_ACTION_ID,
            title: localize2('configure-prompts', "Configure Prompt Files..."),
            shortTitle: localize2('configure-prompts.short', "Prompt Files"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 10,
                group: '0_level'
            },
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.manage-dialog.placeholder', 'Select the prompt file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
/**
 * Gets `URI` of a prompt file open in an active editor instance, if any.
 */
function getActivePromptFileUri(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const model = codeEditorService.getActiveCodeEditor()?.getModel();
    if (model?.getLanguageId() === PROMPT_LANGUAGE_ID) {
        return model.uri;
    }
    return undefined;
}
/**
 * Action ID for the `Run Current Prompt In New Chat` action.
 */
const RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID = 'workbench.action.chat.run-in-new-chat.prompt.current';
const RUN_IN_NEW_CHAT_ACTION_TITLE = localize2('run-prompt-in-new-chat.capitalized', "Run Prompt In New Chat");
/**
 * Icon for the `Run Current Prompt In New Chat` action.
 */
const RUN_IN_NEW_CHAT_ACTION_ICON = Codicon.play;
/**
 * `Run Current Prompt In New Chat` action.
 */
class RunCurrentPromptInNewChatAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID,
            title: RUN_IN_NEW_CHAT_ACTION_TITLE,
            icon: RUN_IN_NEW_CHAT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING | 2048 /* KeyMod.CtrlCmd */,
            alt: {
                id: RUN_CURRENT_PROMPT_ACTION_ID,
                title: RUN_CURRENT_PROMPT_ACTION_TITLE,
                icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            },
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, true, accessor);
    }
}
/**
 * Helper to register all the `Run Current Prompt` actions.
 */
export function registerRunPromptActions() {
    registerAction2(RunCurrentPromptInNewChatAction);
    registerAction2(RunCurrentPromptAction);
    registerAction2(RunSelectedPromptAction);
    registerAction2(ManagePromptFilesAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuUHJvbXB0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3J1blByb21wdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbkcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRixPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztB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