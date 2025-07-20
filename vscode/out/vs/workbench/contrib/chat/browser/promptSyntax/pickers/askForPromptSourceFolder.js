/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extUri, isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { PROMPT_DOCUMENTATION_URL, PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IPromptsService } from '../../../common/promptSyntax/service/promptsService.js';
/**
 * Asks the user for a specific prompt folder, if multiple folders provided.
 */
export async function askForPromptSourceFolder(accessor, type, existingFolder, isMove = false) {
    const quickInputService = accessor.get(IQuickInputService);
    const promptsService = accessor.get(IPromptsService);
    const labelService = accessor.get(ILabelService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    // get prompts source folders based on the prompt type
    const folders = promptsService.getSourceFolders(type);
    // if no source folders found, show 'learn more' dialog
    // note! this is a temporary solution and must be replaced with a dialog to select
    //       a custom folder path, or switch to a different prompt type
    if (folders.length === 0) {
        await showNoFoldersDialog(accessor, type);
        return;
    }
    const pickOptions = {
        placeHolder: existingFolder ? getPlaceholderStringforMove(type, isMove) : getPlaceholderStringforNew(type),
        canPickMany: false,
        matchOnDescription: true,
    };
    // create list of source folder locations
    const foldersList = folders.map(folder => {
        const uri = folder.uri;
        const detail = (existingFolder && isEqual(uri, existingFolder)) ? localize('current.folder', "Current Location") : undefined;
        if (folder.storage === 'user') {
            return {
                type: 'item',
                label: localize('commands.prompts.create.source-folder.user', "User Data Folder"),
                detail,
                tooltip: labelService.getUriLabel(uri),
                folder
            };
        }
        const { folders } = workspaceService.getWorkspace();
        const isMultirootWorkspace = (folders.length > 1);
        const firstFolder = folders[0];
        // if multi-root or empty workspace, or source folder `uri` does not point to
        // the root folder of a single-root workspace, return the default label and description
        if (isMultirootWorkspace || !firstFolder || !extUri.isEqual(firstFolder.uri, uri)) {
            return {
                type: 'item',
                label: labelService.getUriLabel(uri, { relative: true }),
                detail,
                tooltip: labelService.getUriLabel(uri),
                folder,
            };
        }
        // if source folder points to the root of this single-root workspace,
        // use appropriate label and description strings to prevent confusion
        return {
            type: 'item',
            label: localize('commands.prompts.create.source-folder.current-workspace', "Current Workspace"),
            detail,
            tooltip: labelService.getUriLabel(uri),
            folder,
        };
    });
    const answer = await quickInputService.pick(foldersList, pickOptions);
    if (!answer) {
        return;
    }
    return answer.folder;
}
function getPlaceholderStringforNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('workbench.command.instructions.create.location.placeholder', "Select a location to create the instructions file in...");
        case PromptsType.prompt:
            return localize('workbench.command.prompt.create.location.placeholder', "Select a location to create the prompt file in...");
        case PromptsType.mode:
            return localize('workbench.command.mode.create.location.placeholder', "Select a location to create the mode file in...");
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringforMove(type, isMove) {
    if (isMove) {
        switch (type) {
            case PromptsType.instructions:
                return localize('instructions.move.location.placeholder', "Select a location to move the instructions file to...");
            case PromptsType.prompt:
                return localize('prompt.move.location.placeholder', "Select a location to move the prompt file to...");
            case PromptsType.mode:
                return localize('mode.move.location.placeholder', "Select a location to move the mode file to...");
            default:
                throw new Error('Unknown prompt type');
        }
    }
    switch (type) {
        case PromptsType.instructions:
            return localize('instructions.copy.location.placeholder', "Select a location to copy the instructions file to...");
        case PromptsType.prompt:
            return localize('prompt.copy.location.placeholder', "Select a location to copy the prompt file to...");
        case PromptsType.mode:
            return localize('mode.copy.location.placeholder', "Select a location to copy the mode file to...");
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Shows a dialog to the user when no prompt source folders are found.
 *
 * Note! this is a temporary solution and must be replaced with a dialog to select
 *       a custom folder path, or switch to a different prompt type
 */
async function showNoFoldersDialog(accessor, type) {
    const quickInputService = accessor.get(IQuickInputService);
    const openerService = accessor.get(IOpenerService);
    const docsQuickPick = {
        type: 'item',
        label: getLearnLabel(type),
        description: PROMPT_DOCUMENTATION_URL,
        tooltip: PROMPT_DOCUMENTATION_URL,
        value: URI.parse(PROMPT_DOCUMENTATION_URL),
    };
    const result = await quickInputService.pick([docsQuickPick], {
        placeHolder: getMissingSourceFolderString(type),
        canPickMany: false,
    });
    if (result) {
        await openerService.open(result.value);
    }
}
function getLearnLabel(type) {
    switch (type) {
        case PromptsType.prompt:
            return localize('commands.prompts.create.ask-folder.empty.docs-label', 'Learn how to configure reusable prompts');
        case PromptsType.instructions:
            return localize('commands.instructions.create.ask-folder.empty.docs-label', 'Learn how to configure reusable instructions');
        case PromptsType.mode:
            return localize('commands.mode.create.ask-folder.empty.docs-label', 'Learn how to configure custom chat modes');
        default:
            throw new Error('Unknown prompt type');
    }
}
function getMissingSourceFolderString(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('commands.instructions.create.ask-folder.empty.placeholder', 'No instruction source folders found.');
        case PromptsType.prompt:
            return localize('commands.prompts.create.ask-folder.empty.placeholder', 'No prompt source folders found.');
        case PromptsType.mode:
            return localize('commands.mode.create.ask-folder.empty.placeholder', 'No custom chat mode source folders found.');
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3BpY2tlcnMvYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRyxPQUFPLEVBQWdCLGtCQUFrQixFQUFrQixNQUFNLDREQUE0RCxDQUFDO0FBQzlILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BHLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQU90Rzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsd0JBQXdCLENBQzdDLFFBQTBCLEVBQzFCLElBQWlCLEVBQ2pCLGNBQWdDLEVBQ2hDLFNBQWtCLEtBQUs7SUFFdkIsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDM0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNyRCxNQUFN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