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
import { Event } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { IContextKeyService, setConstant as setConstantContextKey } from '../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, IsMacContext, IsLinuxContext, IsWindowsContext, IsWebContext, IsMacNativeContext, IsDevelopmentContext, IsIOSContext, ProductQualityContext, IsMobileContext } from '../../platform/contextkey/common/contextkeys.js';
import { SplitEditorsVertically, InEditorZenModeContext, AuxiliaryBarVisibleContext, SideBarVisibleContext, PanelAlignmentContext, PanelMaximizedContext, PanelVisibleContext, EmbedderIdentifierContext, EditorTabsVisibleContext, IsMainEditorCenteredLayoutContext, MainEditorAreaVisibleContext, DirtyWorkingCopiesContext, EmptyWorkspaceSupportContext, EnterMultiRootWorkspaceSupportContext, HasWebFileSystemAccess, IsMainWindowFullscreenContext, OpenFolderWorkspaceSupportContext, RemoteNameContext, VirtualWorkspaceContext, WorkbenchStateContext, WorkspaceFolderCountContext, PanelPositionContext, TemporaryWorkspaceContext, TitleBarVisibleContext, TitleBarStyleContext, IsAuxiliaryWindowFocusedContext, ActiveEditorGroupEmptyContext, ActiveEditorGroupIndexContext, ActiveEditorGroupLastContext, ActiveEditorGroupLockedContext, MultipleEditorGroupsContext, EditorsVisibleContext, AuxiliaryBarMaximizedContext } from '../common/contextkeys.js';
import { trackFocus, addDisposableListener, EventType, onDidRegisterWindow, getActiveWindow, isEditableElement } from '../../base/browser/dom.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService } from '../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../services/environment/common/environmentService.js';
import { IWorkspaceContextService, isTemporaryWorkspace } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchLayoutService, positionToString } from '../services/layout/browser/layoutService.js';
import { getRemoteName } from '../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceScheme } from '../../platform/workspace/common/virtualWorkspace.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { isNative } from '../../base/common/platform.js';
import { IPaneCompositePartService } from '../services/panecomposite/browser/panecomposite.js';
import { WebFileSystemAccess } from '../../platform/files/browser/webFileSystemAccess.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { getTitleBarStyle } from '../../platform/window/common/window.js';
import { mainWindow } from '../../base/browser/window.js';
import { isFullscreen, onDidChangeFullscreen } from '../../base/browser/browser.js';
import { IEditorService } from '../services/editor/common/editorService.js';
let WorkbenchContextKeysHandler = class WorkbenchContextKeysHandler extends Disposable {
    constructor(contextKeyService, contextService, configurationService, environmentService, productService, editorGroupService, editorService, layoutService, paneCompositeService, workingCopyService) {
        super();
        this.contextKeyService = contextKeyService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.editorGroupService = editorGroupService;
        this.editorService = editorService;
        this.layoutService = layoutService;
        this.paneCompositeService = paneCompositeService;
        this.workingCopyService = workingCopyService;
        // Platform
        IsMacContext.bindTo(this.contextKeyService);
        IsLinuxContext.bindTo(this.contextKeyService);
        IsWindowsContext.bindTo(this.contextKeyService);
        IsWebContext.bindTo(this.contextKeyService);
        IsMacNativeContext.bindTo(this.contextKeyService);
        IsIOSContext.bindTo(this.contextKeyService);
        IsMobileContext.bindTo(this.contextKeyService);
        RemoteNameContext.bindTo(this.contextKeyService).set(getRemoteName(this.environmentService.remoteAuthority) || '');
        this.virtualWorkspaceContext = VirtualWorkspaceContext.bindTo(this.contextKeyService);
        this.temporaryWorkspaceContext = TemporaryWorkspaceContext.bindTo(this.contextKeyService);
        this.updateWorkspaceContextKeys();
        // Capabilities
        HasWebFileSystemAccess.bindTo(this.contextKeyService).set(WebFileSystemAccess.supported(mainWindow));
        // Development
        const isDevelopment = !this.environmentService.isBuilt || this.environmentService.isExtensionDevelopment;
        IsDevelopmentContext.bindTo(this.contextKeyService).set(isDevelopment);
        setConstantContextKey(IsDevelopmentContext.key, isDevelopment);
        // Product Service
        ProductQualityContext.bindTo(this.contextKeyService).set(this.productService.quality || '');
        EmbedderIdentifierContext.bindTo(this.contextKeyService).set(productService.embedderIdentifier);
        // Editor Groups
        this.activeEditorGroupEmpty = ActiveEditorGroupEmptyContext.bindTo(this.contextKeyService);
        this.activeEditorGroupIndex = ActiveEditorGroupIndexContext.bindTo(this.contextKeyService);
        this.activeEditorGroupLast = ActiveEditorGroupLastContext.bindTo(this.contextKeyService);
        this.activeEditorGroupLocked = ActiveEditorGroupLockedContext.bindTo(this.contextKeyService);
        this.multipleEditorGroupsContext = MultipleEditorGroupsContext.bindTo(this.contextKeyService);
        // Editors
        this.editorsVisibleContext = EditorsVisibleContext.bindTo(this.contextKeyService);
        // Working Copies
        this.dirtyWorkingCopiesContext = DirtyWorkingCopiesContext.bindTo(this.contextKeyService);
        this.dirtyWorkingCopiesContext.set(this.workingCopyService.hasDirty);
        // Inputs
        this.inputFocusedContext = InputFocusedContext.bindTo(this.contextKeyService);
        // Workbench State
        this.workbenchStateContext = WorkbenchStateContext.bindTo(this.contextKeyService);
        this.updateWorkbenchStateContextKey();
        // Workspace Folder Count
        this.workspaceFolderCountContext = WorkspaceFolderCountContext.bindTo(this.contextKeyService);
        this.updateWorkspaceFolderCountContextKey();
        // Opening folder support: support for opening a folder workspace
        // (e.g. "Open Folder...") is limited in web when not connected
        // to a remote.
        this.openFolderWorkspaceSupportContext = OpenFolderWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.openFolderWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Empty workspace support: empty workspaces require built-in file system
        // providers to be available that allow to enter a workspace or open loose
        // files. This condition is met:
        // - desktop: always
        // -     web: only when connected to a remote
        this.emptyWorkspaceSupportContext = EmptyWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.emptyWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Entering a multi root workspace support: support for entering a multi-root
        // workspace (e.g. "Open Workspace from File...", "Duplicate Workspace", "Save Workspace")
        // is driven by the ability to resolve a workspace configuration file (*.code-workspace)
        // with a built-in file system provider.
        // This condition is met:
        // - desktop: always
        // -     web: only when connected to a remote
        this.enterMultiRootWorkspaceSupportContext = EnterMultiRootWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.enterMultiRootWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Editor Layout
        this.splitEditorsVerticallyContext = SplitEditorsVertically.bindTo(this.contextKeyService);
        this.updateSplitEditorsVerticallyContext();
        // Window
        this.isMainWindowFullscreenContext = IsMainWindowFullscreenContext.bindTo(this.contextKeyService);
        this.isAuxiliaryWindowFocusedContext = IsAuxiliaryWindowFocusedContext.bindTo(this.contextKeyService);
        // Zen Mode
        this.inZenModeContext = InEditorZenModeContext.bindTo(this.contextKeyService);
        // Centered Layout (Main Editor)
        this.isMainEditorCenteredLayoutContext = IsMainEditorCenteredLayoutContext.bindTo(this.contextKeyService);
        // Editor Area
        this.mainEditorAreaVisibleContext = MainEditorAreaVisibleContext.bindTo(this.contextKeyService);
        this.editorTabsVisibleContext = EditorTabsVisibleContext.bindTo(this.contextKeyService);
        // Sidebar
        this.sideBarVisibleContext = SideBarVisibleContext.bindTo(this.contextKeyService);
        // Title Bar
        this.titleAreaVisibleContext = TitleBarVisibleContext.bindTo(this.contextKeyService);
        this.titleBarStyleContext = TitleBarStyleContext.bindTo(this.contextKeyService);
        this.updateTitleBarContextKeys();
        // Panel
        this.panelPositionContext = PanelPositionContext.bindTo(this.contextKeyService);
        this.panelPositionContext.set(positionToString(this.layoutService.getPanelPosition()));
        this.panelVisibleContext = PanelVisibleContext.bindTo(this.contextKeyService);
        this.panelVisibleContext.set(this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */));
        this.panelMaximizedContext = PanelMaximizedContext.bindTo(this.contextKeyService);
        this.panelMaximizedContext.set(this.layoutService.isPanelMaximized());
        this.panelAlignmentContext = PanelAlignmentContext.bindTo(this.contextKeyService);
        this.panelAlignmentContext.set(this.layoutService.getPanelAlignment());
        // Auxiliary Bar
        this.auxiliaryBarVisibleContext = AuxiliaryBarVisibleContext.bindTo(this.contextKeyService);
        this.auxiliaryBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */));
        this.auxiliaryBarMaximizedContext = AuxiliaryBarMaximizedContext.bindTo(this.contextKeyService);
        this.auxiliaryBarMaximizedContext.set(this.layoutService.isAuxiliaryBarMaximized());
        this.registerListeners();
    }
    registerListeners() {
        this.editorGroupService.whenReady.then(() => {
            this.updateEditorAreaContextKeys();
            this.updateActiveEditorGroupContextKeys();
            this.updateVisiblePanesContextKeys();
        });
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorService.onDidVisibleEditorsChange(() => this.updateVisiblePanesContextKeys()));
        this._register(this.editorGroupService.onDidAddGroup(() => this.updateEditorGroupsContextKeys()));
        this._register(this.editorGroupService.onDidRemoveGroup(() => this.updateEditorGroupsContextKeys()));
        this._register(this.editorGroupService.onDidChangeGroupIndex(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorGroupService.onDidChangeGroupLocked(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions(() => this.updateEditorAreaContextKeys()));
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => disposables.add(addDisposableListener(window, EventType.FOCUS_IN, () => this.updateInputContextKeys(window.document, disposables), true)), { window: mainWindow, disposables: this._store }));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateWorkbenchStateContextKey()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => {
            this.updateWorkspaceFolderCountContextKey();
            this.updateWorkspaceContextKeys();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.editor.openSideBySideDirection')) {
                this.updateSplitEditorsVerticallyContext();
            }
        }));
        this._register(this.layoutService.onDidChangeZenMode(enabled => this.inZenModeContext.set(enabled)));
        this._register(this.layoutService.onDidChangeActiveContainer(() => this.isAuxiliaryWindowFocusedContext.set(this.layoutService.activeContainer !== this.layoutService.mainContainer)));
        this._register(onDidChangeFullscreen(windowId => {
            if (windowId === mainWindow.vscodeWindowId) {
                this.isMainWindowFullscreenContext.set(isFullscreen(mainWindow));
            }
        }));
        this._register(this.layoutService.onDidChangeMainEditorCenteredLayout(centered => this.isMainEditorCenteredLayoutContext.set(centered)));
        this._register(this.layoutService.onDidChangePanelPosition(position => this.panelPositionContext.set(position)));
        this._register(this.layoutService.onDidChangePanelAlignment(alignment => this.panelAlignmentContext.set(alignment)));
        this._register(this.paneCompositeService.onDidPaneCompositeClose(() => this.updateSideBarContextKeys()));
        this._register(this.paneCompositeService.onDidPaneCompositeOpen(() => this.updateSideBarContextKeys()));
        this._register(this.layoutService.onDidChangePartVisibility(() => {
            this.mainEditorAreaVisibleContext.set(this.layoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow));
            this.panelVisibleContext.set(this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */));
            this.panelMaximizedContext.set(this.layoutService.isPanelMaximized());
            this.auxiliaryBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */));
            this.updateTitleBarContextKeys();
        }));
        this._register(this.layoutService.onDidChangeAuxiliaryBarMaximized(() => {
            this.auxiliaryBarMaximizedContext.set(this.layoutService.isAuxiliaryBarMaximized());
        }));
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.dirtyWorkingCopiesContext.set(workingCopy.isDirty() || this.workingCopyService.hasDirty)));
    }
    updateVisiblePanesContextKeys() {
        const visibleEditorPanes = this.editorService.visibleEditorPanes;
        if (visibleEditorPanes.length > 0) {
            this.editorsVisibleContext.set(true);
        }
        else {
            this.editorsVisibleContext.reset();
        }
    }
    // Context keys depending on the state of the editor group itself
    updateActiveEditorGroupContextKeys() {
        if (!this.editorService.activeEditor) {
            this.activeEditorGroupEmpty.set(true);
        }
        else {
            this.activeEditorGroupEmpty.reset();
        }
        const activeGroup = this.editorGroupService.activeGroup;
        this.activeEditorGroupIndex.set(activeGroup.index + 1); // not zero-indexed
        this.activeEditorGroupLocked.set(activeGroup.isLocked);
        this.updateEditorGroupsContextKeys();
    }
    // Context keys depending on the state of other editor groups
    updateEditorGroupsContextKeys() {
        const groupCount = this.editorGroupService.count;
        if (groupCount > 1) {
            this.multipleEditorGroupsContext.set(true);
        }
        else {
            this.multipleEditorGroupsContext.reset();
        }
        const activeGroup = this.editorGroupService.activeGroup;
        this.activeEditorGroupLast.set(activeGroup.index === groupCount - 1);
    }
    updateEditorAreaContextKeys() {
        this.editorTabsVisibleContext.set(this.editorGroupService.partOptions.showTabs === 'multiple');
    }
    updateInputContextKeys(ownerDocument, disposables) {
        function activeElementIsInput() {
            return !!ownerDocument.activeElement && isEditableElement(ownerDocument.activeElement);
        }
        const isInputFocused = activeElementIsInput();
        this.inputFocusedContext.set(isInputFocused);
        if (isInputFocused) {
            const tracker = disposables.add(trackFocus(ownerDocument.activeElement));
            Event.once(tracker.onDidBlur)(() => {
                // Ensure we are only updating the context key if we are
                // still in the same document that we are tracking. This
                // fixes a race condition in multi-window setups where
                // the blur event arrives in the inactive window overwriting
                // the context key of the active window. This is because
                // blur events from the focus tracker are emitted with a
                // timeout of 0.
                if (getActiveWindow().document === ownerDocument) {
                    this.inputFocusedContext.set(activeElementIsInput());
                }
                tracker.dispose();
            }, undefined, disposables);
        }
    }
    updateWorkbenchStateContextKey() {
        this.workbenchStateContext.set(this.getWorkbenchStateString());
    }
    updateWorkspaceFolderCountContextKey() {
        this.workspaceFolderCountContext.set(this.contextService.getWorkspace().folders.length);
    }
    updateSplitEditorsVerticallyContext() {
        const direction = preferredSideBySideGroupDirection(this.configurationService);
        this.splitEditorsVerticallyContext.set(direction === 1 /* GroupDirection.DOWN */);
    }
    getWorkbenchStateString() {
        switch (this.contextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */: return 'empty';
            case 2 /* WorkbenchState.FOLDER */: return 'folder';
            case 3 /* WorkbenchState.WORKSPACE */: return 'workspace';
        }
    }
    updateSideBarContextKeys() {
        this.sideBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */));
    }
    updateTitleBarContextKeys() {
        this.titleAreaVisibleContext.set(this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow));
        this.titleBarStyleContext.set(getTitleBarStyle(this.configurationService));
    }
    updateWorkspaceContextKeys() {
        this.virtualWorkspaceContext.set(getVirtualWorkspaceScheme(this.contextService.getWorkspace()) || '');
        this.temporaryWorkspaceContext.set(isTemporaryWorkspace(this.contextService.getWorkspace()));
    }
};
WorkbenchContextKeysHandler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IProductService),
    __param(5, IEditorGroupsService),
    __param(6, IEditorService),
    __param(7, IWorkbenchLayoutService),
    __param(8, IPaneCompositePartService),
    __param(9, IWorkingCopyService)
], WorkbenchContextKeysHandler);
export { WorkbenchContextKeysHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2NvbnRleHRrZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFtQixNQUFNLGdDQUFnQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxXQUFXLElBQUkscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2SSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BQLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxpQ0FBaUMsRUFBRSw0QkFBNEIsRUFBRSx5QkFBeUIsRUFBRSw0QkFBNEIsRUFBRSxxQ0FBcUMsRUFBRSxzQkFBc0IsRUFBRSw2QkFBNkIsRUFBRSxpQ0FBaUMsRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsRUFBRSxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBRSwrQkFBK0IsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSw0QkFBNEIsRUFBRSw4QkFBOEIsRUFBRSwyQkFBMkIsRUFBRSxxQkFB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