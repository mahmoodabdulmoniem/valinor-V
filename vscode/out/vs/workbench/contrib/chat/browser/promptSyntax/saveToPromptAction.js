/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertDefined } from '../../../../../base/common/types.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { chatSubcommandLeader } from '../../common/chatParserTypes.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
/**
 * Action ID for the `Save Prompt` action.
 */
const SAVE_TO_PROMPT_ACTION_ID = 'workbench.action.chat.save-to-prompt';
/**
 * Name of the in-chat slash command associated with this action.
 */
export const SAVE_TO_PROMPT_SLASH_COMMAND_NAME = 'save';
/**
 * Class that defines the `Save Prompt` action.
 */
class SaveToPromptAction extends Action2 {
    constructor() {
        super({
            id: SAVE_TO_PROMPT_ACTION_ID,
            title: localize2('workbench.actions.save-to-prompt.label', "Save chat session to a prompt file"),
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, options) {
        const logService = accessor.get(ILogService);
        const editorService = accessor.get(IEditorService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const logPrefix = 'save to prompt';
        const { chat } = options;
        const { viewModel } = chat;
        assertDefined(viewModel, 'No view model found on currently the active chat widget.');
        const { model } = viewModel;
        const turns = [];
        for (const request of model.getRequests()) {
            const { message, response: responseModel } = request;
            if (isSaveToPromptSlashCommand(message)) {
                continue;
            }
            if (responseModel === undefined) {
                logService.warn(`[${logPrefix}]: skipping request '${request.id}' with no response`);
                continue;
            }
            const { response } = responseModel;
            const tools = new Set();
            for (const record of response.value) {
                if (('toolId' in record === false) || !record.toolId) {
                    continue;
                }
                const tool = toolsService.getTool(record.toolId);
                if ((tool === undefined) || (!tool.toolReferenceName)) {
                    continue;
                }
                tools.add(tool.toolReferenceName);
            }
            turns.push({
                request: message.text,
                response: response.getMarkdown(),
                tools,
            });
        }
        const promptText = renderPrompt(turns);
        const editor = await editorService.openEditor({
            resource: undefined,
            contents: promptText,
            languageId: PROMPT_LANGUAGE_ID,
        });
        assertDefined(editor, 'Failed to open untitled editor for the prompt.');
        editor.focus();
        return editor;
    }
}
/**
 * Check if provided message belongs to the `save to prompt` slash
 * command itself that was run in the chat to invoke this action.
 */
function isSaveToPromptSlashCommand(message) {
    const { parts } = message;
    if (parts.length < 1) {
        return false;
    }
    const firstPart = parts[0];
    if (firstPart.kind !== 'slash') {
        return false;
    }
    if (firstPart.text !== `${chatSubcommandLeader}${SAVE_TO_PROMPT_SLASH_COMMAND_NAME}`) {
        return false;
    }
    return true;
}
/**
 * Render the response part of a `request`/`response` turn pair.
 */
function renderResponse(response) {
    // if response starts with a code block, add an extra new line
    // before it, to prevent full blockquote from being be broken
    const delimiter = (response.startsWith('```'))
        ? '\n>'
        : ' ';
    // add `>` to the beginning of each line of the response
    // so it looks like a blockquote citing Copilot
    const quotedResponse = response.replaceAll('\n', '\n> ');
    return `> Copilot:${delimiter}${quotedResponse}`;
}
/**
 * Render a single `request`/`response` turn of the chat session.
 */
function renderTurn(turn) {
    const { request, response } = turn;
    return `\n${request}\n\n${renderResponse(response)}`;
}
/**
 * Render the entire chat session as a markdown prompt.
 */
function renderPrompt(turns) {
    const content = [];
    const allTools = new Set();
    // render each turn and collect tool names
    // that were used in the each turn
    for (const turn of turns) {
        content.push(renderTurn(turn));
        // collect all used tools into a set of strings
        for (const tool of turn.tools) {
            allTools.add(tool);
        }
    }
    const result = [];
    // add prompt header
    if (allTools.size !== 0) {
        result.push(renderHeader(allTools));
    }
    // add chat request/response turns
    result.push(content.join('\n'));
    // add trailing empty line
    result.push('');
    return result.join('\n');
}
/**
 * Render the `tools` metadata inside prompt header.
 */
function renderTools(tools) {
    const toolStrings = [...tools].map((tool) => {
        return `'${tool}'`;
    });
    return `tools: [${toolStrings.join(', ')}]`;
}
/**
 * Render prompt header.
 */
function renderHeader(tools) {
    // skip rendering the header if no tools provided
    if (tools.size === 0) {
        return '';
    }
    return [
        '---',
        renderTools(tools),
        '---',
    ].join('\n');
}
/**
 * Runs the `Save To Prompt` action with provided options. We export this
 * function instead of {@link SAVE_TO_PROMPT_ACTION_ID} directly to
 * encapsulate/enforce the correct options to be passed to the action.
 */
export function runSaveToPromptAction(options, commandService) {
    return commandService.executeCommand(SAVE_TO_PROMPT_ACTION_ID, options);
}
/**
 * Helper to register all the `Save Prompt` actions.
 */
export function registerSaveToPromptActions() {
    registerAction2(SaveToPromptAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVRvUHJvbXB0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3NhdmVUb1Byb21wdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBSTFEOztHQUVHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBRyxzQ0FBc0MsQ0FBQztBQUV4RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLE1BQU0sQ0FBQztBQVl4RDs7R0FFRztBQUNILE1BQU0sa0JB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