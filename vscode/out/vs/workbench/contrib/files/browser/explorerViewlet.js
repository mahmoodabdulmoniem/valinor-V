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
import './media/explorerviewlet.css';
import { localize, localize2 } from '../../../../nls.js';
import { mark } from '../../../../base/common/performance.js';
import { VIEWLET_ID, VIEW_ID, ExplorerViewletVisibleContext } from '../common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExplorerView } from './views/explorerView.js';
import { EmptyView } from './views/emptyView.js';
import { OpenEditorsView } from './views/openEditorsView.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Extensions, IViewDescriptorService, ViewContentGroups } from '../../../common/views.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { WorkbenchStateContext, RemoteNameContext, OpenFolderWorkspaceSupportContext } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { AddRootFolderAction, OpenFolderAction, OpenFolderViaWorkspaceAction } from '../../../browser/actions/workspaceActions.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { isMouseEvent } from '../../../../base/browser/dom.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const explorerViewIcon = registerIcon('explorer-view-icon', Codicon.files, localize('explorerViewIcon', 'View icon of the explorer view.'));
const openEditorsViewIcon = registerIcon('open-editors-view-icon', Codicon.book, localize('openEditorsIcon', 'View icon of the open editors view.'));
let ExplorerViewletViewsContribution = class ExplorerViewletViewsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.explorerViewletViews'; }
    constructor(workspaceContextService, progressService) {
        super();
        this.workspaceContextService = workspaceContextService;
        progressService.withProgress({ location: 1 /* ProgressLocation.Explorer */ }, () => workspaceContextService.getCompleteWorkspace()).finally(() => {
            this.registerViews();
            this._register(workspaceContextService.onDidChangeWorkbenchState(() => this.registerViews()));
            this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => this.registerViews()));
        });
    }
    registerViews() {
        mark('code/willRegisterExplorerViews');
        const viewDescriptors = viewsRegistry.getViews(VIEW_CONTAINER);
        const viewDescriptorsToRegister = [];
        const viewDescriptorsToDeregister = [];
        const openEditorsViewDescriptor = this.createOpenEditorsViewDescriptor();
        if (!viewDescriptors.some(v => v.id === openEditorsViewDescriptor.id)) {
            viewDescriptorsToRegister.push(openEditorsViewDescriptor);
        }
        const explorerViewDescriptor = this.createExplorerViewDescriptor();
        const registeredExplorerViewDescriptor = viewDescriptors.find(v => v.id === explorerViewDescriptor.id);
        const emptyViewDescriptor = this.createEmptyViewDescriptor();
        const registeredEmptyViewDescriptor = viewDescriptors.find(v => v.id === emptyViewDescriptor.id);
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ || this.workspaceContextService.getWorkspace().folders.length === 0) {
            if (registeredExplorerViewDescriptor) {
                viewDescriptorsToDeregister.push(registeredExplorerViewDescriptor);
            }
            if (!registeredEmptyViewDescriptor) {
                viewDescriptorsToRegister.push(emptyViewDescriptor);
            }
        }
        else {
            if (registeredEmptyViewDescriptor) {
                viewDescriptorsToDeregister.push(registeredEmptyViewDescriptor);
            }
            if (!registeredExplorerViewDescriptor) {
                viewDescriptorsToRegister.push(explorerViewDescriptor);
            }
        }
        if (viewDescriptorsToDeregister.length) {
            viewsRegistry.deregisterViews(viewDescriptorsToDeregister, VIEW_CONTAINER);
        }
        if (viewDescriptorsToRegister.length) {
            viewsRegistry.registerViews(viewDescriptorsToRegister, VIEW_CONTAINER);
        }
        mark('code/didRegisterExplorerViews');
    }
    createOpenEditorsViewDescriptor() {
        return {
            id: OpenEditorsView.ID,
            name: OpenEditorsView.NAME,
            ctorDescriptor: new SyncDescriptor(OpenEditorsView),
            containerIcon: openEditorsViewIcon,
            order: 0,
            canToggleVisibility: true,
            canMoveView: true,
            collapsed: false,
            hideByDefault: true,
            focusCommand: {
                id: 'workbench.files.action.focusOpenEditorsView',
                keybindings: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 35 /* KeyCode.KeyE */) }
            }
        };
    }
    createEmptyViewDescriptor() {
        return {
            id: EmptyView.ID,
            name: EmptyView.NAME,
            containerIcon: explorerViewIcon,
            ctorDescriptor: new SyncDescriptor(EmptyView),
            order: 1,
            canToggleVisibility: true,
            focusCommand: {
                id: 'workbench.explorer.fileView.focus'
            }
        };
    }
    createExplorerViewDescriptor() {
        return {
            id: VIEW_ID,
            name: localize2('folders', "Folders"),
            containerIcon: explorerViewIcon,
            ctorDescriptor: new SyncDescriptor(ExplorerView),
            order: 1,
            canMoveView: true,
            canToggleVisibility: false,
            focusCommand: {
                id: 'workbench.explorer.fileView.focus'
            }
        };
    }
};
ExplorerViewletViewsContribution = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IProgressService)
], ExplorerViewletViewsContribution);
export { ExplorerViewletViewsContribution };
let ExplorerViewPaneContainer = class ExplorerViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, contextService, storageService, configurationService, instantiationService, contextKeyService, themeService, contextMenuService, extensionService, viewDescriptorService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.viewletVisibleContextKey = ExplorerViewletVisibleContext.bindTo(contextKeyService);
        this._register(this.contextService.onDidChangeWorkspaceName(e => this.updateTitleArea()));
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('explorer-viewlet');
    }
    createView(viewDescriptor, options) {
        if (viewDescriptor.id === VIEW_ID) {
            return this.instantiationService.createInstance(ExplorerView, {
                ...options, delegate: {
                    willOpenElement: e => {
                        if (!isMouseEvent(e)) {
                            return; // only delay when user clicks
                        }
                        const openEditorsView = this.getOpenEditorsView();
                        if (openEditorsView) {
                            let delay = 0;
                            const config = this.configurationService.getValue();
                            if (!!config.workbench?.editor?.enablePreview) {
                                // delay open editors view when preview is enabled
                                // to accomodate for the user doing a double click
                                // to pin the editor.
                                // without this delay a double click would be not
                                // possible because the next element would move
                                // under the mouse after the first click.
                                delay = 250;
                            }
                            openEditorsView.setStructuralRefreshDelay(delay);
                        }
                    },
                    didOpenElement: e => {
                        if (!isMouseEvent(e)) {
                            return; // only delay when user clicks
                        }
                        const openEditorsView = this.getOpenEditorsView();
                        openEditorsView?.setStructuralRefreshDelay(0);
                    }
                }
            });
        }
        return super.createView(viewDescriptor, options);
    }
    getExplorerView() {
        return this.getView(VIEW_ID);
    }
    getOpenEditorsView() {
        return this.getView(OpenEditorsView.ID);
    }
    setVisible(visible) {
        this.viewletVisibleContextKey.set(visible);
        super.setVisible(visible);
    }
    focus() {
        const explorerView = this.getView(VIEW_ID);
        if (explorerView && this.panes.every(p => !p.isExpanded())) {
            explorerView.setExpanded(true);
        }
        if (explorerView?.isExpanded()) {
            explorerView.focus();
        }
        else {
            super.focus();
        }
    }
};
ExplorerViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, IContextMenuService),
    __param(9, IExtensionService),
    __param(10, IViewDescriptorService),
    __param(11, ILogService)
], ExplorerViewPaneContainer);
export { ExplorerViewPaneContainer };
const viewContainerRegistry = Registry.as(Extensions.ViewContainersRegistry);
/**
 * Explorer viewlet container.
 */
export const VIEW_CONTAINER = viewContainerRegistry.registerViewContainer({
    id: VIEWLET_ID,
    title: localize2('explore', "Explorer"),
    ctorDescriptor: new SyncDescriptor(ExplorerViewPaneContainer),
    storageId: 'workbench.explorer.views.state',
    icon: explorerViewIcon,
    alwaysUseContainerInfo: true,
    hideIfEmpty: true,
    order: 0,
    openCommandActionDescriptor: {
        id: VIEWLET_ID,
        title: localize2('explore', "Explorer"),
        mnemonicTitle: localize({ key: 'miViewExplorer', comment: ['&& denotes a mnemonic'] }, "&&Explorer"),
        keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 35 /* KeyCode.KeyE */ },
        order: 0
    },
}, 0 /* ViewContainerLocation.Sidebar */, { isDefault: true });
const openFolder = localize('openFolder', "Open Folder");
const addAFolder = localize('addAFolder', "add a folder");
const openRecent = localize('openRecent', "Open Recent");
const addRootFolderButton = `[${openFolder}](command:${AddRootFolderAction.ID})`;
const addAFolderButton = `[${addAFolder}](command:${AddRootFolderAction.ID})`;
const openFolderButton = `[${openFolder}](command:${OpenFolderAction.ID})`;
const openFolderViaWorkspaceButton = `[${openFolder}](command:${OpenFolderViaWorkspaceAction.ID})`;
const openRecentButton = `[${openRecent}](command:${OpenRecentAction.ID})`;
const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({ key: 'noWorkspaceHelp', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change'] }, "You have not yet added a folder to the workspace.\n{0}", addRootFolderButton),
    when: ContextKeyExpr.and(
    // inside a .code-workspace
    WorkbenchStateContext.isEqualTo('workspace'), 
    // unless we cannot enter or open workspaces (e.g. web serverless)
    OpenFolderWorkspaceSupportContext),
    group: ViewContentGroups.Open,
    order: 1
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({ key: 'noFolderHelpWeb', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change'] }, "You have not yet opened a folder.\n{0}\n{1}", openFolderViaWorkspaceButton, openRecentButton),
    when: ContextKeyExpr.and(
    // inside a .code-workspace
    WorkbenchStateContext.isEqualTo('workspace'), 
    // we cannot enter workspaces (e.g. web serverless)
    OpenFolderWorkspaceSupportContext.toNegated()),
    group: ViewContentGroups.Open,
    order: 1
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({ key: 'remoteNoFolderHelp', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change'] }, "Connected to remote.\n{0}", openFolderButton),
    when: ContextKeyExpr.and(
    // not inside a .code-workspace
    WorkbenchStateContext.notEqualsTo('workspace'), 
    // connected to a remote
    RemoteNameContext.notEqualsTo(''), 
    // but not in web
    IsWebContext.toNegated()),
    group: ViewContentGroups.Open,
    order: 1
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({ key: 'noFolderButEditorsHelp', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change'] }, "You have not yet opened a folder.\n{0}\nOpening a folder will close all currently open editors. To keep them open, {1} instead.", openFolderButton, addAFolderButton),
    when: ContextKeyExpr.and(
    // editors are opened
    ContextKeyExpr.has('editorIsOpen'), ContextKeyExpr.or(
    // not inside a .code-workspace and local
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), RemoteNameContext.isEqualTo('')), 
    // not inside a .code-workspace and web
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), IsWebContext))),
    group: ViewContentGroups.Open,
    order: 1
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({ key: 'noFolderHelp', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change'] }, "You have not yet opened a folder.\n{0}", openFolderButton),
    when: ContextKeyExpr.and(
    // no editor is open
    ContextKeyExpr.has('editorIsOpen')?.negate(), ContextKeyExpr.or(
    // not inside a .code-workspace and local
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), RemoteNameContext.isEqualTo('')), 
    // not inside a .code-workspace and web
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), IsWebContext))),
    group: ViewContentGroups.Open,
    order: 1
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3bGV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2V4cGxvcmVyVmlld2xldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUF1Qiw2QkFBNkIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFlLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFB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