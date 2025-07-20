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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import { assert } from '../../../../../../base/common/assert.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IPromptsService } from '../../../common/promptSyntax/service/promptsService.js';
import { dirname, extUri, joinPath } from '../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { getCleanPromptName } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType, INSTRUCTIONS_DOCUMENTATION_URL, MODE_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL } from '../../../common/promptSyntax/promptTypes.js';
import { NEW_PROMPT_COMMAND_ID, NEW_INSTRUCTIONS_COMMAND_ID, NEW_MODE_COMMAND_ID } from '../newPromptFileActions.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { askForPromptFileName } from './askForPromptName.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { UILabelProvider } from '../../../../../../base/common/keybindingLabels.js';
import { OS } from '../../../../../../base/common/platform.js';
import { askForPromptSourceFolder } from './askForPromptSourceFolder.js';
/**
 * Button that opens the documentation.
 */
const HELP_BUTTON = Object.freeze({
    tooltip: localize('help', "Help"),
    iconClass: ThemeIcon.asClassName(Codicon.question),
});
/**
 * A quick pick item that starts the 'New Prompt File' command.
 */
const NEW_PROMPT_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-promptfile.select-dialog.label', 'New prompt file...')}`,
    value: URI.parse(PROMPT_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_PROMPT_COMMAND_ID,
});
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_INSTRUCTIONS_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-instructionsfile.select-dialog.label', 'New instruction file...')}`,
    value: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_INSTRUCTIONS_COMMAND_ID,
});
/**
 * A quick pick item that starts the 'Update Instructions' command.
 */
const UPDATE_INSTRUCTIONS_OPTION = Object.freeze({
    type: 'item',
    label: `$(refresh) ${localize('commands.update-instructions.select-dialog.label', 'Generate instructions...')}`,
    value: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: 'workbench.action.chat.generateInstructions',
});
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_MODE_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-modefile.select-dialog.label', 'Create new custom chat mode file...')}`,
    value: URI.parse(MODE_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_MODE_COMMAND_ID,
});
/**
 * Button that opens a prompt file in the editor.
 */
const EDIT_BUTTON = Object.freeze({
    tooltip: localize('open', "Open in Editor"),
    iconClass: ThemeIcon.asClassName(Codicon.edit),
});
/**
 * Button that deletes a prompt file.
 */
const DELETE_BUTTON = Object.freeze({
    tooltip: localize('delete', "Delete"),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
});
/**
 * Button that renames a prompt file.
 */
const RENAME_BUTTON = Object.freeze({
    tooltip: localize('rename', "Rename"),
    iconClass: ThemeIcon.asClassName(Codicon.replace),
});
/**
 * Button that copies a prompt file.
 */
const COPY_BUTTON = Object.freeze({
    tooltip: localize('copy', "Copy or Move (press {0})", UILabelProvider.modifierLabels[OS].ctrlKey),
    iconClass: ThemeIcon.asClassName(Codicon.copy),
});
let PromptFilePickers = class PromptFilePickers {
    constructor(_labelService, _quickInputService, _openerService, _fileService, _dialogService, _commandService, _instaService, _promptsService) {
        this._labelService = _labelService;
        this._quickInputService = _quickInputService;
        this._openerService = _openerService;
        this._fileService = _fileService;
        this._dialogService = _dialogService;
        this._commandService = _commandService;
        this._instaService = _instaService;
        this._promptsService = _promptsService;
    }
    /**
     * Shows the prompt file selection dialog to the user that allows to run a prompt file(s).
     *
     * If {@link ISelectOptions.resource resource} is provided, the dialog will have
     * the resource pre-selected in the prompts list.
     */
    async selectPromptFile(options) {
        const quickPick = this._quickInputService.createQuickPick();
        quickPick.busy = true;
        quickPick.placeholder = localize('searching', 'Searching file system...');
        try {
            const fileOptions = await this._createPromptPickItems(options);
            const activeItem = options.resource && fileOptions.find(f => extUri.isEqual(f.value, options.resource));
            quickPick.activeItems = [activeItem ?? fileOptions[0]];
            quickPick.placeholder = options.placeholder;
            quickPick.canAcceptInBackground = true;
            quickPick.matchOnDescription = true;
            quickPick.items = fileOptions;
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            let isResolved = false;
            // then the dialog is hidden or disposed for other reason,
            // dispose everything and resolve the main promise
            disposables.add({
                dispose() {
                    quickPick.dispose();
                    if (!isResolved) {
                        resolve(undefined);
                        isResolved = true;
                    }
                },
            });
            // handle the prompt `accept` event
            disposables.add(quickPick.onDidAccept(async (event) => {
                const { selectedItems } = quickPick;
                const { keyMods } = quickPick;
                const selectedItem = selectedItems[0];
                if (selectedItem.commandId) {
                    await this._commandService.executeCommand(selectedItem.commandId);
                    return;
                }
                if (selectedItem) {
                    resolve({ promptFile: selectedItem.value, keyMods: { ...keyMods } });
                    isResolved = true;
                }
                // if user submitted their selection, close the dialog
                if (!event.inBackground) {
                    disposables.dispose();
                }
            }));
            // handle the `button click` event on a list item (edit, delete, etc.)
            disposables.add(quickPick.onDidTriggerItemButton(e => this._handleButtonClick(quickPick, e, options)));
            // when the dialog is hidden, dispose everything
            disposables.add(quickPick.onDidHide(disposables.dispose.bind(disposables)));
            // finally, reveal the dialog
            quickPick.show();
        });
    }
    async _createPromptPickItems(options) {
        const { resource } = options;
        const buttons = [];
        if (options.optionEdit !== false) {
            buttons.push(EDIT_BUTTON);
        }
        if (options.optionCopy !== false) {
            buttons.push(COPY_BUTTON);
        }
        if (options.optionRename !== false) {
            buttons.push(RENAME_BUTTON);
        }
        if (options.optionDelete !== false) {
            buttons.push(DELETE_BUTTON);
        }
        const promptFiles = await this._promptsService.listPromptFiles(options.type, CancellationToken.None);
        const fileOptions = promptFiles.map((promptFile) => {
            return this._createPromptPickItem(promptFile, buttons);
        });
        // if a resource is provided, create an `activeItem` for it to pre-select
        // it in the UI, and sort the list so the active item appears at the top
        let activeItem;
        if (options.resource) {
            activeItem = fileOptions.find((file) => {
                return extUri.isEqual(file.value, options.resource);
            });
            // if no item for the `resource` was found, it means that the resource is not
            // in the list of prompt files, so add a new item for it; this ensures that
            // the currently active prompt file is always available in the selection dialog,
            // even if it is not included in the prompts list otherwise(from location setting)
            if (!activeItem) {
                activeItem = this._createPromptPickItem({
                    uri: options.resource,
                    // "user" prompts are always registered in the prompts list, hence it
                    // should be safe to assume that `resource` is not "user" prompt here
                    storage: 'local',
                    type: options.type,
                }, buttons);
                fileOptions.push(activeItem);
            }
            fileOptions.sort((file1, file2) => {
                if (extUri.isEqual(file1.value, resource)) {
                    return -1;
                }
                if (extUri.isEqual(file2.value, resource)) {
                    return 1;
                }
                return 0;
            });
        }
        const newItems = options.optionNew !== false ? this._getNewItems(options.type) : [];
        if (newItems.length > 0) {
            fileOptions.splice(0, 0, ...newItems);
        }
        return fileOptions;
    }
    _getNewItems(type) {
        switch (type) {
            case PromptsType.prompt:
                return [NEW_PROMPT_FILE_OPTION];
            case PromptsType.instructions:
                return [NEW_INSTRUCTIONS_FILE_OPTION, UPDATE_INSTRUCTIONS_OPTION];
            case PromptsType.mode:
                return [NEW_MODE_FILE_OPTION];
            default:
                throw new Error(`Unknown prompt type '${type}'.`);
        }
    }
    _createPromptPickItem(promptFile, buttons) {
        const { uri, storage } = promptFile;
        const fileWithoutExtension = getCleanPromptName(uri);
        // if a "user" prompt, don't show its filesystem path in
        // the user interface, but do that for all the "local" ones
        const description = (storage === 'user')
            ? localize('user-data-dir.capitalized', 'User data folder')
            : this._labelService.getUriLabel(dirname(uri), { relative: true });
        const tooltip = (storage === 'user')
            ? description
            : uri.fsPath;
        return {
            id: uri.toString(),
            type: 'item',
            label: fileWithoutExtension,
            description,
            tooltip,
            value: uri,
            buttons
        };
    }
    async keepQuickPickOpen(quickPick, work) {
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        try {
            await work();
        }
        finally {
            quickPick.ignoreFocusOut = previousIgnoreFocusOut;
        }
    }
    async _handleButtonClick(quickPick, context, options) {
        const { item, button } = context;
        const { value, } = item;
        // `edit` button was pressed, open the prompt file in editor
        if (button === EDIT_BUTTON) {
            await this._openerService.open(value);
            return;
        }
        // `copy` button was pressed, open the prompt file in editor
        if (button === COPY_BUTTON) {
            const currentFolder = dirname(value);
            const isMove = quickPick.keyMods.ctrlCmd;
            const newFolder = await this._instaService.invokeFunction(askForPromptSourceFolder, options.type, currentFolder, isMove);
            if (!newFolder) {
                return;
            }
            const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, newFolder.uri, item.label);
            if (!newName) {
                return;
            }
            const newFile = joinPath(newFolder.uri, newName);
            if (isMove) {
                await this._fileService.move(value, newFile);
            }
            else {
                await this._fileService.copy(value, newFile);
            }
            await this._openerService.open(newFile);
            return;
        }
        // `rename` button was pressed, open a rename dialog
        if (button === RENAME_BUTTON) {
            const currentFolder = dirname(value);
            const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, currentFolder, item.label);
            if (newName) {
                const newFile = joinPath(currentFolder, newName);
                await this._fileService.move(value, newFile);
                await this._openerService.open(newFile);
            }
            return;
        }
        // `delete` button was pressed, delete the prompt file
        if (button === DELETE_BUTTON) {
            // sanity check to confirm our expectations
            assert((quickPick.activeItems.length < 2), `Expected maximum one active item, got '${quickPick.activeItems.length}'.`);
            const activeItem = quickPick.activeItems[0];
            // sanity checks - prompt file exists and is not a folder
            const info = await this._fileService.stat(value);
            assert(info.isDirectory === false, `'${value.fsPath}' points to a folder.`);
            // don't close the main prompt selection dialog by the confirmation dialog
            await this.keepQuickPickOpen(quickPick, async () => {
                const filename = getCleanPromptName(value);
                const { confirmed } = await this._dialogService.confirm({
                    message: localize('commands.prompts.use.select-dialog.delete-prompt.confirm.message', "Are you sure you want to delete '{0}'?", filename),
                });
                // if prompt deletion was not confirmed, nothing to do
                if (!confirmed) {
                    return;
                }
                // prompt deletion was confirmed so delete the prompt file
                await this._fileService.del(value);
                // remove the deleted prompt from the selection dialog list
                let removedIndex = -1;
                quickPick.items = quickPick.items.filter((option, index) => {
                    if (option === item) {
                        removedIndex = index;
                        return false;
                    }
                    return true;
                });
                // if the deleted item was active item, find a new item to set as active
                if (activeItem && (activeItem === item)) {
                    assert(removedIndex >= 0, 'Removed item index must be a valid index.');
                    // we set the previous item as new active, or the next item
                    // if removed prompt item was in the beginning of the list
                    const newActiveItemIndex = Math.max(removedIndex - 1, 0);
                    const newActiveItem = quickPick.items[newActiveItemIndex];
                    quickPick.activeItems = newActiveItem ? [newActiveItem] : [];
                }
            });
            return;
        }
        if (button === HELP_BUTTON) {
            // open the documentation
            await this._openerService.open(item.value);
            return;
        }
        throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
    }
};
PromptFilePickers = __decorate([
    __param(0, ILabelService),
    __param(1, IQuickInputService),
    __param(2, IOpenerService),
    __param(3, IFileService),
    __param(4, IDialogService),
    __param(5, ICommandService),
    __param(6, IInstantiationService),
    __param(7, IPromptsService)
], PromptFilePickers);
export { PromptFilePickers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVBpY2tlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvcGlja2Vycy9wcm9tcHRGaWxlUGlja2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FB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