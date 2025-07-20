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
var EditorTabsControl_1;
import './media/editortabscontrol.css';
import { localize } from '../../../../nls.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, getActiveWindow, getWindow, isMouseEvent } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { DraggedEditorGroupIdentifier, fillEditorsDragData, isWindowDraggedOver } from '../../dnd.js';
import { EditorPane } from './editorPane.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { ResourceContextKey, ActiveEditorPinnedContext, ActiveEditorStickyContext, ActiveEditorGroupLockedContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, ActiveEditorFirstInGroupContext, ActiveEditorAvailableEditorIdsContext, applyAvailableEditorIds, ActiveEditorLastInGroupContext } from '../../../common/contextkeys.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { isFirefox } from '../../../../base/browser/browser.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from './editorCommands.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
export class EditorCommandsContextActionRunner extends ActionRunner {
    constructor(context) {
        super();
        this.context = context;
    }
    run(action, context) {
        // Even though we have a fixed context for editor commands,
        // allow to preserve the context that is given to us in case
        // it applies.
        let mergedContext = this.context;
        if (context?.preserveFocus) {
            mergedContext = {
                ...this.context,
                preserveFocus: true
            };
        }
        return super.run(action, mergedContext);
    }
}
let EditorTabsControl = class EditorTabsControl extends Themable {
    static { EditorTabsControl_1 = this; }
    static { this.EDITOR_TAB_HEIGHT = {
        normal: 35,
        compact: 22
    }; }
    constructor(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorResolverService, hostService) {
        super(themeService);
        this.parent = parent;
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.tabsModel = tabsModel;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.quickInputService = quickInputService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.editorActionsToolbarDisposables = this._register(new DisposableStore());
        this.editorActionsDisposables = this._register(new DisposableStore());
        this.renderDropdownAsChildElement = false;
        const container = this.create(parent);
        // Context Keys
        this.contextMenuContextKeyService = this._register(this.contextKeyService.createScoped(container));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextMenuContextKeyService])));
        this.resourceContext = this._register(scopedInstantiationService.createInstance(ResourceContextKey));
        this.editorPinnedContext = ActiveEditorPinnedContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsFirstContext = ActiveEditorFirstInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsLastContext = ActiveEditorLastInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorStickyContext = ActiveEditorStickyContext.bindTo(this.contextMenuContextKeyService);
        this.editorAvailableEditorIds = ActiveEditorAvailableEditorIdsContext.bindTo(this.contextMenuContextKeyService);
        this.editorCanSplitInGroupContext = ActiveEditorCanSplitInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.sideBySideEditorContext = SideBySideEditorActiveContext.bindTo(this.contextMenuContextKeyService);
        this.groupLockedContext = ActiveEditorGroupLockedContext.bindTo(this.contextMenuContextKeyService);
    }
    create(parent) {
        this.updateTabHeight();
        return parent;
    }
    get editorActionsEnabled() {
        return this.groupsView.partOptions.editorActionsLocation === 'default' && this.groupsView.partOptions.showTabs !== 'none';
    }
    createEditorActionsToolBar(parent, classes) {
        this.editorActionsToolbarContainer = $('div');
        this.editorActionsToolbarContainer.classList.add(...classes);
        parent.appendChild(this.editorActionsToolbarContainer);
        this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
    }
    handleEditorActionToolBarVisibility(container) {
        const editorActionsEnabled = this.editorActionsEnabled;
        const editorActionsVisible = !!this.editorActionsToolbar;
        // Create toolbar if it is enabled (and not yet created)
        if (editorActionsEnabled && !editorActionsVisible) {
            this.doCreateEditorActionsToolBar(container);
        }
        // Remove toolbar if it is not enabled (and is visible)
        else if (!editorActionsEnabled && editorActionsVisible) {
            this.editorActionsToolbar?.getElement().remove();
            this.editorActionsToolbar = undefined;
            this.editorActionsToolbarDisposables.clear();
            this.editorActionsDisposables.clear();
        }
        container.classList.toggle('hidden', !editorActionsEnabled);
    }
    doCreateEditorActionsToolBar(container) {
        const context = { groupId: this.groupView.id };
        // Toolbar Widget
        this.editorActionsToolbar = this.editorActionsToolbarDisposables.add(this.instantiationService.createInstance(WorkbenchToolBar, container, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelEditorActions', "Editor actions"),
            getKeyBinding: action => this.getKeybinding(action),
            actionRunner: this.editorActionsToolbarDisposables.add(new EditorCommandsContextActionRunner(context)),
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            renderDropdownAsChildElement: this.renderDropdownAsChildElement,
            telemetrySource: 'editorPart',
            resetMenu: MenuId.EditorTitle,
            overflowBehavior: { maxItems: 9, exempted: EDITOR_CORE_NAVIGATION_COMMANDS },
            highlightToggledItems: true
        }));
        // Context
        this.editorActionsToolbar.context = context;
        // Action Run Handling
        this.editorActionsToolbarDisposables.add(this.editorActionsToolbar.actionRunner.onDidRun(e => {
            // Notify for Error
            if (e.error && !isCancellationError(e.error)) {
                this.notificationService.error(e.error);
            }
        }));
    }
    actionViewItemProvider(action, options) {
        const activeEditorPane = this.groupView.activeEditorPane;
        // Check Active Editor
        if (activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, { ...options, menuAsChild: this.renderDropdownAsChildElement });
    }
    updateEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        this.editorActionsDisposables.clear();
        const editorActions = this.groupView.createEditorActions(this.editorActionsDisposables);
        this.editorActionsDisposables.add(editorActions.onDidChange(() => this.updateEditorActionsToolbar()));
        const editorActionsToolbar = assertReturnsDefined(this.editorActionsToolbar);
        const { primary, secondary } = this.prepareEditorActions(editorActions.actions);
        editorActionsToolbar.setActions(prepareActions(primary), prepareActions(secondary));
    }
    getEditorPaneAwareContextKeyService() {
        return this.groupView.activeEditorPane?.scopedContextKeyService ?? this.contextKeyService;
    }
    clearEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        const editorActionsToolbar = assertReturnsDefined(this.editorActionsToolbar);
        editorActionsToolbar.setActions([], []);
    }
    onGroupDragStart(e, element) {
        if (e.target !== element) {
            return false; // only if originating from tabs container
        }
        const isNewWindowOperation = this.isNewWindowOperation(e);
        // Set editor group as transfer
        this.groupTransfer.setData([new DraggedEditorGroupIdentifier(this.groupView.id)], DraggedEditorGroupIdentifier.prototype);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copyMove';
        }
        // Drag all tabs of the group if tabs are enabled
        let hasDataTransfer = false;
        if (this.groupsView.partOptions.showTabs === 'multiple') {
            hasDataTransfer = this.doFillResourceDataTransfers(this.groupView.getEditors(1 /* EditorsOrder.SEQUENTIAL */), e, isNewWindowOperation);
        }
        // Otherwise only drag the active editor
        else {
            if (this.groupView.activeEditor) {
                hasDataTransfer = this.doFillResourceDataTransfers([this.groupView.activeEditor], e, isNewWindowOperation);
            }
        }
        // Firefox: requires to set a text data transfer to get going
        if (!hasDataTransfer && isFirefox) {
            e.dataTransfer?.setData(DataTransfers.TEXT, String(this.groupView.label));
        }
        // Drag Image
        if (this.groupView.activeEditor) {
            let label = this.groupView.activeEditor.getName();
            if (this.groupsView.partOptions.showTabs === 'multiple' && this.groupView.count > 1) {
                label = localize('draggedEditorGroup', "{0} (+{1})", label, this.groupView.count - 1);
            }
            applyDragImage(e, element, label);
        }
        return isNewWindowOperation;
    }
    async onGroupDragEnd(e, previousDragEvent, element, isNewWindowOperation) {
        this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
        if (e.target !== element ||
            !isNewWindowOperation ||
            isWindowDraggedOver()) {
            return; // drag to open in new window is disabled
        }
        const auxiliaryEditorPart = await this.maybeCreateAuxiliaryEditorPartAt(e, element);
        if (!auxiliaryEditorPart) {
            return;
        }
        const targetGroup = auxiliaryEditorPart.activeGroup;
        this.groupsView.mergeGroup(this.groupView, targetGroup.id, {
            mode: this.isMoveOperation(previousDragEvent ?? e, targetGroup.id) ? 1 /* MergeGroupMode.MOVE_EDITORS */ : 0 /* MergeGroupMode.COPY_EDITORS */
        });
        targetGroup.focus();
    }
    async maybeCreateAuxiliaryEditorPartAt(e, offsetElement) {
        const { point, display } = await this.hostService.getCursorScreenPoint() ?? { point: { x: e.screenX, y: e.screenY } };
        const window = getActiveWindow();
        if (window.document.visibilityState === 'visible' && window.document.hasFocus()) {
            if (point.x >= window.screenX && point.x <= window.screenX + window.outerWidth && point.y >= window.screenY && point.y <= window.screenY + window.outerHeight) {
                return; // refuse to create as long as the mouse was released over active focused window to reduce chance of opening by accident
            }
        }
        const offsetX = offsetElement.offsetWidth / 2;
        const offsetY = 30 /* take title bar height into account (approximation) */ + offsetElement.offsetHeight / 2;
        const bounds = {
            x: point.x - offsetX,
            y: point.y - offsetY
        };
        if (display) {
            if (bounds.x < display.x) {
                bounds.x = display.x; // prevent overflow to the left
            }
            if (bounds.y < display.y) {
                bounds.y = display.y; // prevent overflow to the top
            }
        }
        return this.editorPartsView.createAuxiliaryEditorPart({ bounds });
    }
    isNewWindowOperation(e) {
        if (this.groupsView.partOptions.dragToOpenWindow) {
            return !e.altKey;
        }
        return e.altKey;
    }
    isMoveOperation(e, sourceGroup, sourceEditor) {
        if (sourceEditor?.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            return true; // Singleton editors cannot be split
        }
        const isCopy = (e.ctrlKey && !isMacintosh) || (e.altKey && isMacintosh);
        return (!isCopy || sourceGroup === this.groupView.id);
    }
    doFillResourceDataTransfers(editors, e, disableStandardTransfer) {
        if (editors.length) {
            this.instantiationService.invokeFunction(fillEditorsDragData, editors.map(editor => ({ editor, groupId: this.groupView.id })), e, { disableStandardTransfer });
            return true;
        }
        return false;
    }
    onTabContextMenu(editor, e, node) {
        // Update contexts based on editor picked and remember previous to restore
        this.resourceContext.set(EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }));
        this.editorPinnedContext.set(this.tabsModel.isPinned(editor));
        this.editorIsFirstContext.set(this.tabsModel.isFirst(editor));
        this.editorIsLastContext.set(this.tabsModel.isLast(editor));
        this.editorStickyContext.set(this.tabsModel.isSticky(editor));
        this.groupLockedContext.set(this.tabsModel.isLocked);
        this.editorCanSplitInGroupContext.set(editor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
        this.sideBySideEditorContext.set(editor.typeId === SideBySideEditorInput.ID);
        applyAvailableEditorIds(this.editorAvailableEditorIds, editor, this.editorResolverService);
        // Find target anchor
        let anchor = node;
        if (isMouseEvent(e)) {
            anchor = new StandardMouseEvent(getWindow(node), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => anchor,
            menuId: MenuId.EditorTitleContext,
            menuActionOptions: { shouldForwardArgs: true, arg: this.resourceContext.get() },
            contextKeyService: this.contextMenuContextKeyService,
            getActionsContext: () => ({ groupId: this.groupView.id, editorIndex: this.groupView.getIndexOfEditor(editor) }),
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id, this.contextMenuContextKeyService),
            onHide: () => this.groupsView.activeGroup.focus() // restore focus to active group
        });
    }
    getKeybinding(action) {
        return this.keybindingService.lookupKeybinding(action.id, this.getEditorPaneAwareContextKeyService());
    }
    getKeybindingLabel(action) {
        const keybinding = this.getKeybinding(action);
        return keybinding ? keybinding.getLabel() ?? undefined : undefined;
    }
    get tabHeight() {
        return this.groupsView.partOptions.tabHeight !== 'compact' ? EditorTabsControl_1.EDITOR_TAB_HEIGHT.normal : EditorTabsControl_1.EDITOR_TAB_HEIGHT.compact;
    }
    getHoverTitle(editor) {
        const title = editor.getTitle(2 /* Verbosity.LONG */);
        if (!this.tabsModel.isPinned(editor)) {
            return {
                markdown: new MarkdownString('', { supportThemeIcons: true, isTrusted: true }).
                    appendText(title).
                    appendMarkdown(' (_preview_ [$(gear)](command:workbench.action.openSettings?%5B%22workbench.editor.enablePreview%22%5D "Configure Preview Mode"))'),
                markdownNotSupportedFallback: title + ' (preview)'
            };
        }
        return title;
    }
    updateTabHeight() {
        this.parent.style.setProperty('--editor-group-tab-height', `${this.tabHeight}px`);
    }
    updateOptions(oldOptions, newOptions) {
        // Update tab height
        if (oldOptions.tabHeight !== newOptions.tabHeight) {
            this.updateTabHeight();
        }
        // Update Editor Actions Toolbar
        if (oldOptions.editorActionsLocation !== newOptions.editorActionsLocation ||
            oldOptions.showTabs !== newOptions.showTabs) {
            if (this.editorActionsToolbarContainer) {
                this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
                this.updateEditorActionsToolbar();
            }
        }
    }
};
EditorTabsControl = EditorTabsControl_1 = __decorate([
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IQuickInputService),
    __param(11, IThemeService),
    __param(12, IEditorResolverService),
    __param(13, IHostService)
], EditorTabsControl);
export { EditorTabsControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxDQUFDLEVBQWEsZUFBZSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1RSxPQUFPLEVBQXVDLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pILE9BQU8sRUFBVyxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDdkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEw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