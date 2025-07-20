/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { Action2, MenuId } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IsDevelopmentContext } from '../../../platform/contextkey/common/contextkeys.js';
import { INativeWorkbenchEnvironmentService } from '../../services/environment/electron-browser/environmentService.js';
import { URI } from '../../../base/common/uri.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IProgressService } from '../../../platform/progress/common/progress.js';
export class ToggleDevToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleDevTools',
            title: localize2('toggleDevTools', 'Toggle Developer Tools'),
            category: Categories.Developer,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                when: IsDevelopmentContext,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */ }
            },
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '5_tools',
                order: 1
            }
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        return nativeHostService.toggleDevTools({ targetWindowId: getActiveWindow().vscodeWindowId });
    }
}
export class ConfigureRuntimeArgumentsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.configureRuntimeArguments',
            title: localize2('configureRuntimeArguments', 'Configure Runtime Arguments'),
            category: Categories.Preferences,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        await editorService.openEditor({
            resource: environmentService.argvResource,
            options: { pinned: true }
        });
    }
}
export class ReloadWindowWithExtensionsDisabledAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.reloadWindowWithExtensionsDisabled',
            title: localize2('reloadWindowWithExtensionsDisabled', 'Reload with Extensions Disabled'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        return accessor.get(INativeHostService).reload({ disableExtensions: true });
    }
}
export class OpenUserDataFolderAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.revealUserDataFolder',
            title: localize2('revealUserDataFolder', 'Reveal User Data Folder'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        return nativeHostService.showItemInFolder(URI.file(environmentService.userDataPath).fsPath);
    }
}
export class ShowGPUInfoAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showGPUInfo',
            title: localize2('showGPUInfo', 'Show GPU Info'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        nativeHostService.openGPUInfoWindow();
    }
}
export class StopTracing extends Action2 {
    static { this.ID = 'workbench.action.stopTracing'; }
    constructor() {
        super({
            id: StopTracing.ID,
            title: localize2('stopTracing', 'Stop Tracing'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const environmentService = accessor.get(INativeEnvironmentService);
        const dialogService = accessor.get(IDialogService);
        const nativeHostService = accessor.get(INativeHostService);
        const progressService = accessor.get(IProgressService);
        if (!environmentService.args.trace) {
            const { confirmed } = await dialogService.confirm({
                message: localize('stopTracing.message', "Tracing requires to launch with a '--trace' argument"),
                primaryButton: localize({ key: 'stopTracing.button', comment: ['&& denotes a mnemonic'] }, "&&Relaunch and Enable Tracing"),
            });
            if (confirmed) {
                return nativeHostService.relaunch({ addArgs: ['--trace'] });
            }
        }
        await progressService.withProgress({
            location: 20 /* ProgressLocation.Dialog */,
            title: localize('stopTracing.title', "Creating trace file..."),
            cancellable: false,
            detail: localize('stopTracing.detail', "This can take up to one minute to complete.")
        }, () => nativeHostService.stopTracing());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2ZWxvcGVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLWJyb3dzZXIvYWN0aW9ucy9kZXZlbG9wZXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXZHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSwrQ0FBK0MsQ0FBQztBQUVuRyxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsT0FBTztJQUVoRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQ0FBaUM7WUFD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