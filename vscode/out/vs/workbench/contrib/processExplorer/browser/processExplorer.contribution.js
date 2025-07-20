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
import { localize, localize2 } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ProcessExplorerEditorInput } from './processExplorerEditorInput.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { AUX_WINDOW_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
//#region --- process explorer
let ProcessExplorerEditorContribution = class ProcessExplorerEditorContribution {
    static { this.ID = 'workbench.contrib.processExplorerEditor'; }
    constructor(editorResolverService, instantiationService) {
        editorResolverService.registerEditor(`${ProcessExplorerEditorInput.RESOURCE.scheme}:**/**`, {
            id: ProcessExplorerEditorInput.ID,
            label: localize('promptOpenWith.processExplorer.displayName', "Process Explorer"),
            priority: RegisteredEditorPriority.exclusive
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === ProcessExplorerEditorInput.RESOURCE.scheme
        }, {
            createEditorInput: () => {
                return {
                    editor: instantiationService.createInstance(ProcessExplorerEditorInput),
                    options: {
                        pinned: true
                    }
                };
            }
        });
    }
};
ProcessExplorerEditorContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], ProcessExplorerEditorContribution);
registerWorkbenchContribution2(ProcessExplorerEditorContribution.ID, ProcessExplorerEditorContribution, 1 /* WorkbenchPhase.BlockStartup */);
class ProcessExplorerEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return ProcessExplorerEditorInput.instance;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ProcessExplorerEditorInput.ID, ProcessExplorerEditorInputSerializer);
//#endregion
//#region --- process explorer commands
const supported = ContextKeyExpr.or(IsWebContext.negate(), RemoteNameContext.notEqualsTo('')); // only on desktop or in web with a remote
class OpenProcessExplorer extends Action2 {
    static { this.ID = 'workbench.action.openProcessExplorer'; }
    static { this.STATE_KEY = 'workbench.processExplorerWindowState'; }
    static { this.DEFAULT_STATE = { bounds: { width: 800, height: 500 } }; }
    constructor() {
        super({
            id: OpenProcessExplorer.ID,
            title: localize2('openProcessExplorer', 'Open Process Explorer'),
            category: Categories.Developer,
            precondition: supported,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const auxiliaryWindowService = accessor.get(IAuxiliaryWindowService);
        const storageService = accessor.get(IStorageService);
        const pane = await editorService.openEditor({
            resource: ProcessExplorerEditorInput.RESOURCE,
            options: {
                pinned: true,
                revealIfOpened: true,
                auxiliary: {
                    ...this.loadState(storageService),
                    compact: true,
                    alwaysOnTop: true
                }
            }
        }, AUX_WINDOW_GROUP);
        if (pane) {
            const listener = pane.input?.onWillDispose(() => {
                listener?.dispose();
                this.saveState(pane.group.id, storageService, editorGroupService, auxiliaryWindowService);
            });
        }
    }
    loadState(storageService) {
        const stateRaw = storageService.get(OpenProcessExplorer.STATE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!stateRaw) {
            return OpenProcessExplorer.DEFAULT_STATE;
        }
        try {
            return JSON.parse(stateRaw);
        }
        catch {
            return OpenProcessExplorer.DEFAULT_STATE;
        }
    }
    saveState(group, storageService, editorGroupService, auxiliaryWindowService) {
        const auxiliaryWindow = auxiliaryWindowService.getWindow(editorGroupService.getPart(group).windowId);
        if (!auxiliaryWindow) {
            return;
        }
        const bounds = auxiliaryWindow.createState().bounds;
        if (!bounds) {
            return;
        }
        storageService.store(OpenProcessExplorer.STATE_KEY, JSON.stringify({ bounds }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
}
registerAction2(OpenProcessExplorer);
MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
    group: '5_tools',
    command: {
        id: OpenProcessExplorer.ID,
        title: localize({ key: 'miOpenProcessExplorerer', comment: ['&& denotes a mnemonic'] }, "Open &&Process Explorer")
    },
    when: supported,
    order: 2
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJvY2Vzc0V4cGxvcmVyL2Jyb3dzZXIvcHJvY2Vzc0V4cGxvcmVyLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQXFCLGdCQUFnQixFQUEyQyxNQUFNLDJCQUEyQixDQUFDO0FBRXpILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzVILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDOUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0s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