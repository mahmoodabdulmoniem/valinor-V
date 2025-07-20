/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { hasWorkspaceFileExtension, IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { dirname } from '../../../base/common/resources.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IPathService } from '../../services/path/common/pathService.js';
export const ADD_ROOT_FOLDER_COMMAND_ID = 'addRootFolder';
export const ADD_ROOT_FOLDER_LABEL = localize2('addFolderToWorkspace', 'Add Folder to Workspace...');
export const SET_ROOT_FOLDER_COMMAND_ID = 'setRootFolder';
export const PICK_WORKSPACE_FOLDER_COMMAND_ID = '_workbench.pickWorkspaceFolder';
// Command registration
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileFolderAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: '_files.pickFolderAndOpen',
    handler: (accessor, options) => accessor.get(IFileDialogService).pickFolderAndOpen(options)
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFolderAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.openWorkspaceInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickWorkspaceAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: ADD_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.addFolders(folders.map(folder => ({ uri: folder })));
    }
});
CommandsRegistry.registerCommand({
    id: SET_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.updateFolders(0, contextService.getWorkspace().folders.length, folders.map(folder => ({ uri: folder })));
    }
});
async function selectWorkspaceFolders(accessor) {
    const dialogsService = accessor.get(IFileDialogService);
    const pathService = accessor.get(IPathService);
    const folders = await dialogsService.showOpenDialog({
        openLabel: mnemonicButtonLabel(localize({ key: 'add', comment: ['&& denotes a mnemonic'] }, "&&Add")),
        title: localize('addFolderToWorkspaceTitle', "Add Folder to Workspace"),
        canSelectFolders: true,
        canSelectMany: true,
        defaultUri: await dialogsService.defaultFolderPath(),
        availableFileSystems: [pathService.defaultUriScheme]
    });
    return folders;
}
CommandsRegistry.registerCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, async function (accessor, args) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderPicks = folders.map(folder => {
        const label = folder.name;
        const description = labelService.getUriLabel(dirname(folder.uri), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined, // https://github.com/microsoft/vscode/issues/183418
            folder,
            iconClasses: getIconClasses(modelService, languageService, folder.uri, FileKind.ROOT_FOLDER)
        };
    });
    const options = (args ? args[0] : undefined) || Object.create(null);
    if (!options.activeItem) {
        options.activeItem = folderPicks[0];
    }
    if (!options.placeHolder) {
        options.placeHolder = localize('workspaceFolderPickerPlaceholder', "Select workspace folder");
    }
    if (typeof options.matchOnDescription !== 'boolean') {
        options.matchOnDescription = true;
    }
    const token = (args ? args[1] : undefined) || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    if (pick) {
        return folders[folderPicks.indexOf(pick)];
    }
    return;
});
CommandsRegistry.registerCommand({
    id: 'vscode.openFolder',
    handler: (accessor, uriComponents, arg) => {
        const commandService = accessor.get(ICommandService);
        // Be compatible to previous args by converting to options
        if (typeof arg === 'boolean') {
            arg = { forceNewWindow: arg };
        }
        // Without URI, ask to pick a folder or workspace to open
        if (!uriComponents) {
            const options = {
                forceNewWindow: arg?.forceNewWindow
            };
            if (arg?.forceLocalWindow) {
                options.remoteAuthority = null;
                options.availableFileSystems = ['file'];
            }
            return commandService.executeCommand('_files.pickFolderAndOpen', options);
        }
        const uri = URI.from(uriComponents, true);
        const options = {
            forceNewWindow: arg?.forceNewWindow,
            forceReuseWindow: arg?.forceReuseWindow,
            noRecentEntry: arg?.noRecentEntry,
            remoteAuthority: arg?.forceLocalWindow ? null : undefined,
            forceProfile: arg?.forceProfile,
            forceTempProfile: arg?.forceTempProfile,
        };
        const workspaceToOpen = (hasWorkspaceFileExtension(uri) || uri.scheme === Schemas.untitled) ? { workspaceUri: uri } : { folderUri: uri };
        const filesToOpen = arg?.filesToOpen?.map(file => ({ fileUri: URI.from(file, true) })) ?? [];
        return commandService.executeCommand('_files.windowOpen', [workspaceToOpen, ...filesToOpen], options);
    },
    metadata: {
        description: 'Open a folder or workspace in the current window or new window depending on the newWindow argument. Note that opening in the same window will shutdown the current extension host process and start a new one on the given folder/workspace unless the newWindow parameter is set to true.',
        args: [
            {
                name: 'uri', description: '(optional) Uri of the folder or workspace file to open. If not provided, a native dialog will ask the user for the folder',
                constraint: (value) => value === undefined || value === null || value instanceof URI
            },
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`forceNewWindow`: Whether to open the folder/workspace in a new window or the same. Defaults to opening in the same window. ' +
                    '`forceReuseWindow`: Whether to force opening the folder/workspace in the same window.  Defaults to false. ' +
                    '`noRecentEntry`: Whether the opened URI will appear in the \'Open Recent\' list. Defaults to false. ' +
                    '`forceLocalWindow`: Whether to force opening the folder/workspace in a local window. Defaults to false. ' +
                    '`forceProfile`: The profile to use when opening the folder/workspace. Defaults to the current profile. ' +
                    '`forceTempProfile`: Whether to use a temporary profile when opening the folder/workspace. Defaults to false. ' +
                    '`filesToOpen`: An array of files to open in the new window. Defaults to an empty array. ' +
                    'Note, for backward compatibility, options can also be of type boolean, representing the `forceNewWindow` setting.',
                constraint: (value) => value === undefined || typeof value === 'object' || typeof value === 'boolean'
            }
        ]
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.newWindow',
    handler: (accessor, options) => {
        const commandService = accessor.get(ICommandService);
        const commandOptions = {
            forceReuseWindow: options && options.reuseWindow,
            remoteAuthority: options && options.remoteAuthority
        };
        return commandService.executeCommand('_files.newWindow', commandOptions);
    },
    metadata: {
        description: 'Opens an new window depending on the newWindow argument.',
        args: [
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`reuseWindow`: Whether to open a new window or the same. Defaults to opening in a new window. ',
                constraint: (value) => value === undefined || typeof value === 'object'
            }
        ]
    }
});
// recent history commands
CommandsRegistry.registerCommand('_workbench.removeFromRecentlyOpened', function (accessor, uri) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.removeRecentlyOpened([uri]);
});
CommandsRegistry.registerCommand({
    id: 'vscode.removeFromRecentlyOpened',
    handler: (accessor, path) => {
        const workspacesService = accessor.get(IWorkspacesService);
        if (typeof path === 'string') {
            path = path.match(/^[^:/?#]+:\/\//) ? URI.parse(path) : URI.file(path);
        }
        else {
            path = URI.revive(path); // called from extension host
        }
        return workspacesService.removeRecentlyOpened([path]);
    },
    metadata: {
        description: 'Removes an entry with the given path from the recently opened list.',
        args: [
            { name: 'path', description: 'URI or URI string to remove from recently opened.', constraint: (value) => typeof value === 'string' || value instanceof URI }
        ]
    }
});
CommandsRegistry.registerCommand('_workbench.addToRecentlyOpened', async function (accessor, recentEntry) {
    const workspacesService = accessor.get(IWorkspacesService);
    const uri = recentEntry.uri;
    const label = recentEntry.label;
    const remoteAuthority = recentEntry.remoteAuthority;
    let recent = undefined;
    if (recentEntry.type === 'workspace') {
        const workspace = await workspacesService.getWorkspaceIdentifier(uri);
        recent = { workspace, label, remoteAuthority };
    }
    else if (recentEntry.type === 'folder') {
        recent = { folderUri: uri, label, remoteAuthority };
    }
    else {
        recent = { fileUri: uri, label, remoteAuthority };
    }
    return workspacesService.addRecentlyOpened([recent]);
});
CommandsRegistry.registerCommand('_workbench.getRecentlyOpened', async function (accessor) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.getRecentlyOpened();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd29ya3NwYWNlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFnQyxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxHQUFHLEVBQWlC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