/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { getPromptFileExtension } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import Severity from '../../../../../../base/common/severity.js';
import { isValidBasename } from '../../../../../../base/common/extpath.js';
/**
 * Asks the user for a file name.
 */
export async function askForPromptFileName(accessor, type, selectedFolder, existingFileName) {
    const quickInputService = accessor.get(IQuickInputService);
    const fileService = accessor.get(IFileService);
    const sanitizeInput = (input) => {
        const trimmedName = input.trim();
        if (!trimmedName) {
            return undefined;
        }
        const fileExtension = getPromptFileExtension(type);
        return (trimmedName.endsWith(fileExtension))
            ? trimmedName
            : `${trimmedName}${fileExtension}`;
    };
    const validateInput = async (value) => {
        const fileName = sanitizeInput(value);
        if (!fileName) {
            return {
                content: localize('askForPromptFileName.error.empty', "Please enter a name."),
                severity: Severity.Warning
            };
        }
        if (!isValidBasename(fileName)) {
            return {
                content: localize('askForPromptFileName.error.invalid', "The name contains invalid characters."),
                severity: Severity.Error
            };
        }
        const fileUri = URI.joinPath(selectedFolder, fileName);
        if (await fileService.exists(fileUri)) {
            return {
                content: localize('askForPromptFileName.error.exists', "A file for the given name already exists."),
                severity: Severity.Error
            };
        }
        return undefined;
    };
    const placeHolder = existingFileName ? getPlaceholderStringForRename(type) : getPlaceholderStringForNew(type);
    const result = await quickInputService.input({ placeHolder, validateInput, value: existingFileName });
    if (!result) {
        return undefined;
    }
    return sanitizeInput(result);
}
function getPlaceholderStringForNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('askForInstructionsFileName.placeholder', "Enter the name of the instructions file");
        case PromptsType.prompt:
            return localize('askForPromptFileName.placeholder', "Enter the name of the prompt file");
        case PromptsType.mode:
            return localize('askForModeFileName.placeholder', "Enter the name of the custom chat mode file");
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringForRename(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('askForRenamedInstructionsFileName.placeholder', "Enter a new name of the instructions file");
        case PromptsType.prompt:
            return localize('askForRenamedPromptFileName.placeholder', "Enter a new name of the prompt file");
        case PromptsType.mode:
            return localize('askForRenamedModeFileName.placeholder', "Enter a new name of the custom chat mode file");
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9waWNrZXJzL2Fza0ZvclByb21wdE5hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sUUFBUSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUczRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENBQ3pDLFFBQTBCLEVBQzFCLElBQWlCLEVBQ2pCLGNBQW1CLEVBQ25CLGdCQUF5QjtJQUV6QixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRS9DLE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7UUFDdkMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFX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