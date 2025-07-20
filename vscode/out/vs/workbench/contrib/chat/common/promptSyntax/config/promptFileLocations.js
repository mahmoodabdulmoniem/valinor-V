/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../../base/common/path.js';
import { PromptsType } from '../promptTypes.js';
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * File extension for the reusable instruction files.
 */
export const INSTRUCTION_FILE_EXTENSION = '.instructions.md';
/**
 * File extension for the modes files.
 */
export const MODE_FILE_EXTENSION = '.chatmode.md';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * Default reusable prompt files source folder.
 */
export const PROMPT_DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Default reusable instructions files source folder.
 */
export const INSTRUCTIONS_DEFAULT_SOURCE_FOLDER = '.github/instructions';
/**
 * Default modes source folder.
 */
export const MODE_DEFAULT_SOURCE_FOLDER = '.github/chatmodes';
/**
 * Gets the prompt file type from the provided path.
 */
export function getPromptFileType(fileUri) {
    const filename = basename(fileUri.path);
    if (filename.endsWith(PROMPT_FILE_EXTENSION)) {
        return PromptsType.prompt;
    }
    if (filename.endsWith(INSTRUCTION_FILE_EXTENSION) || (filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME)) {
        return PromptsType.instructions;
    }
    if (filename.endsWith(MODE_FILE_EXTENSION)) {
        return PromptsType.mode;
    }
    return undefined;
}
/**
 * Check if provided URI points to a file that with prompt file extension.
 */
export function isPromptOrInstructionsFile(fileUri) {
    return getPromptFileType(fileUri) !== undefined;
}
export function getPromptFileExtension(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTION_FILE_EXTENSION;
        case PromptsType.prompt:
            return PROMPT_FILE_EXTENSION;
        case PromptsType.mode:
            return MODE_FILE_EXTENSION;
        default:
            throw new Error('Unknown prompt type');
    }
}
export function getPromptFileDefaultLocation(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTIONS_DEFAULT_SOURCE_FOLDER;
        case PromptsType.prompt:
            return PROMPT_DEFAULT_SOURCE_FOLDER;
        case PromptsType.mode:
            return MODE_DEFAULT_SOURCE_FOLDER;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Gets clean prompt name without file extension.
 */
export function getCleanPromptName(fileUri) {
    const fileName = basename(fileUri.path);
    const extensions = [
        PROMPT_FILE_EXTENSION,
        INSTRUCTION_FILE_EXTENSION,
        MODE_FILE_EXTENSION,
    ];
    for (const ext of extensions) {
        if (fileName.endsWith(ext)) {
            return basename(fileUri.path, ext);
        }
    }
    if (fileName === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME) {
        return basename(fileUri.path, '.md');
    }
    // because we now rely on the `prompt` language ID that can be explicitly
    // set for any document in the editor, any file can be a "prompt" file, so
    // to account for that, we return the full file name including the file
    // extension for all other cases
    return basename(fileUri.path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUxvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9wcm9tcHRGaWxlTG9jYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFaEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7QUFFbEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxrQkFBa0IsQ0FBQztBQUU3RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGNBQWMsQ0FBQztBQUVsRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHlCQUF5QixDQUFDO0FBRzlFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsaUJBQWlCLENBQUM7QUFFOUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxzQkFBc0IsQ0FBQztBQUV6RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLG1CQUFtQixDQUFDO0FBRTlEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLE9BQVk7SUFDN0MsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV4QyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO1FBQzlDLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssb0NBQW9DLENBQUMsRUFBRSxDQUFDO1FBQzFHLE9BQU8sV0FBVyxDQUFDLFlBQVksQ0FBQztJQUNqQyxDQUFDO0lBRUQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztRQUM1QyxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxPQUFZO0lBQ3RELE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxDQUFDO0FBQ2pELENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsSUFBaUI7SUFDdkQsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssV0FBVyxDQUFDLFlBQVk7WUFDNUIsT0FBTywwQkFBMEIsQ0FBQztRQUNuQyxLQUFLLFdBQVcsQ0FBQyxNQUFNO1lBQ3RCLE9BQU8scUJBQXFCLENBQUM7UUFDOUIsS0FBSyxXQUFXLENBQUMsSUFBSTtZQUNwQixPQUFPLG1CQUFtQixDQUFDO1FBQzVCO1lBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLElBQWlCO0lBQzdELFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFdBQVcsQ0FBQyxZQUFZO1lBQzVCLE9BQU8sa0NBQWtDLENBQUM7UUFDM0MsS0FBSyxXQUFXLENBQUMsTUFBTTtZQUN0QixPQUFPLDRCQUE0QixDQUFDO1FBQ3JDLEtBQUssV0FBVyxDQUFDLElBQUk7WUFDcEIsT0FBTywwQkFBMEIsQ0FBQztRQUNuQztZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN6QyxDQUFDO0FBQ0YsQ0FBQztBQUdEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLE9BQVk7SUFDOUMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV4QyxNQUFNLFVBQVUsR0FBRztRQUNsQixxQkFBcUI7UUFDckIsMEJBQTBCO1FBQzFCLG1CQUFtQjtLQUNuQixDQUFDO0lBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUM5QixJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxRQUFRLEtBQUssb0NBQW9DLEVBQUUsQ0FBQztRQUN2RCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCx5RUFBeUU7SUFDekUsMEVBQTBFO0lBQzFFLHVFQUF1RTtJQUN2RSxnQ0FBZ0M7SUFDaEMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUMifQ==