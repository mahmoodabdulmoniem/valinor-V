/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Documentation link for the reusable prompts feature.
 */
export const PROMPT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
export const INSTRUCTIONS_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-instructions';
export const MODE_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-chat-modes'; // todo
/**
 * Language ID for the reusable prompt syntax.
 */
export const PROMPT_LANGUAGE_ID = 'prompt';
/**
 * Language ID for instructions syntax.
 */
export const INSTRUCTIONS_LANGUAGE_ID = 'instructions';
/**
 * Language ID for modes syntax.
 */
export const MODE_LANGUAGE_ID = 'chatmode';
/**
 * Prompt and instructions files language selector.
 */
export const ALL_PROMPTS_LANGUAGE_SELECTOR = [PROMPT_LANGUAGE_ID, INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID];
/**
 * The language id for for a prompts type.
 */
export function getLanguageIdForPromptsType(type) {
    switch (type) {
        case PromptsType.prompt:
            return PROMPT_LANGUAGE_ID;
        case PromptsType.instructions:
            return INSTRUCTIONS_LANGUAGE_ID;
        case PromptsType.mode:
            return MODE_LANGUAGE_ID;
        default:
            throw new Error(`Unknown prompt type: ${type}`);
    }
}
export function getPromptsTypeForLanguageId(languageId) {
    switch (languageId) {
        case PROMPT_LANGUAGE_ID:
            return PromptsType.prompt;
        case INSTRUCTIONS_LANGUAGE_ID:
            return PromptsType.instructions;
        case MODE_LANGUAGE_ID:
            return PromptsType.mode;
        default:
            return undefined;
    }
}
/**
 * What the prompt is used for.
 */
export var PromptsType;
(function (PromptsType) {
    PromptsType["instructions"] = "instructions";
    PromptsType["prompt"] = "prompt";
    PromptsType["mode"] = "mode";
})(PromptsType || (PromptsType = {}));
export function isValidPromptType(type) {
    return Object.values(PromptsType).includes(type);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wcm9tcHRUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLDRDQUE0QyxDQUFDO0FBQ3JGLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGdEQUFnRCxDQUFDO0FBQy9GLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLDhDQUE4QyxDQUFDLENBQUMsT0FBTztBQUU3Rjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQztBQUUzQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGNBQWMsQ0FBQztBQUV2RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztBQUUzQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFxQixDQUFDLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFFaEk7O0dBRUc7QUFDSCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsSUFBaUI7SUFDNUQsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssV0FBVyxDQUFDLE1BQU07WUFDdEIsT0FBTyxrQkFBa0IsQ0FBQztRQUMzQixLQUFLLFdBQVcsQ0FBQyxZQUFZO1lBQzVCLE9BQU8sd0JBQXdCLENBQUM7UUFDakMsS0FBSyxXQUFXLENBQUMsSUFBSTtZQUNwQixPQUFPLGdCQUFnQixDQUFDO1FBQ3pCO1lBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxVQUFrQjtJQUM3RCxRQUFRLFVBQVUsRUFBRSxDQUFDO1FBQ3BCLEtBQUssa0JBQWtCO1lBQ3RCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQztRQUMzQixLQUFLLHdCQUF3QjtZQUM1QixPQUFPLFdBQVcsQ0FBQyxZQUFZLENBQUM7UUFDakMsS0FBSyxnQkFBZ0I7WUFDcEIsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQ3pCO1lBQ0MsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFHRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFdBSVg7QUFKRCxXQUFZLFdBQVc7SUFDdEIsNENBQTZCLENBQUE7SUFDN0IsZ0NBQWlCLENBQUE7SUFDakIsNEJBQWEsQ0FBQTtBQUNkLENBQUMsRUFKVyxXQUFXLEtBQVgsV0FBVyxRQUl0QjtBQUNELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxJQUFZO0lBQzdDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBbUIsQ0FBQyxDQUFDO0FBQ2pFLENBQUMifQ==