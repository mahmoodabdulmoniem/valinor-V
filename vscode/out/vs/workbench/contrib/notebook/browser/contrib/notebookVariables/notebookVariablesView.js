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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { CONTEXT_VARIABLE_EXTENSIONID, CONTEXT_VARIABLE_INTERFACES, CONTEXT_VARIABLE_LANGUAGE, CONTEXT_VARIABLE_NAME, CONTEXT_VARIABLE_TYPE, CONTEXT_VARIABLE_VALUE } from '../../../../debug/common/debug.js';
import { NotebookVariableDataSource } from './notebookVariablesDataSource.js';
import { NOTEBOOK_TITLE, NotebookVariableAccessibilityProvider, NotebookVariableRenderer, NotebookVariablesDelegate, REPL_TITLE } from './notebookVariablesTree.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { isCompositeNotebookEditorInput } from '../../../common/notebookEditorInput.js';
let NotebookVariablesView = class NotebookVariablesView extends ViewPane {
    static { this.ID = 'notebookVariablesView'; }
    constructor(options, editorService, notebookKernelService, notebookExecutionStateService, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.notebookKernelService = notebookKernelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.menuService = menuService;
        this._register(this.editorService.onDidActiveEditorChange(() => this.handleActiveEditorChange()));
        this._register(this.notebookKernelService.onDidNotebookVariablesUpdate(this.handleVariablesChanged.bind(this)));
        this._register(this.notebookExecutionStateService.onDidChangeExecution(this.handleExecutionStateChange.bind(this)));
        this._register(this.editorService.onDidCloseEditor((e) => this.handleCloseEditor(e)));
        this.accessibilityProvider = new NotebookVariableAccessibilityProvider();
        this.handleActiveEditorChange(false);
        this.dataSource = new NotebookVariableDataSource(this.notebookKernelService);
        this.updateScheduler = new RunOnceScheduler(() => this.tree?.updateChildren(), 100);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'notebookVariablesTree', container, new NotebookVariablesDelegate(), [this.instantiationService.createInstance(NotebookVariableRenderer)], this.dataSource, {
            accessibilityProvider: this.accessibilityProvider,
            identityProvider: { getId: (e) => e.id },
        });
        this.tree.layout();
        if (this.activeNotebook) {
            this.tree.setInput({ kind: 'root', notebook: this.activeNotebook });
        }
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
    }
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        const element = e.element;
        const arg = {
            source: element.notebook.uri.toString(),
            name: element.name,
            value: element.value,
            type: element.type,
            expression: element.expression,
            language: element.language,
            extensionId: element.extensionId
        };
        const overlayedContext = this.contextKeyService.createOverlay([
            [CONTEXT_VARIABLE_NAME.key, element.name],
            [CONTEXT_VARIABLE_VALUE.key, element.value],
            [CONTEXT_VARIABLE_TYPE.key, element.type],
            [CONTEXT_VARIABLE_INTERFACES.key, element.interfaces],
            [CONTEXT_VARIABLE_LANGUAGE.key, element.language],
            [CONTEXT_VARIABLE_EXTENSIONID.key, element.extensionId]
        ]);
        const menuActions = this.menuService.getMenuActions(MenuId.NotebookVariablesContext, overlayedContext, { arg, shouldForwardArgs: true });
        const actions = getFlatContextMenuActions(menuActions);
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions
        });
    }
    focus() {
        super.focus();
        this.tree?.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree?.layout(height, width);
    }
    setActiveNotebook(notebookDocument, editor, doUpdate = true) {
        this.activeNotebook = notebookDocument;
        if (isCompositeNotebookEditorInput(editor.input)) {
            this.updateTitle(REPL_TITLE.value);
            this.accessibilityProvider.updateWidgetAriaLabel(REPL_TITLE.value);
        }
        else {
            this.updateTitle(NOTEBOOK_TITLE.value);
            this.accessibilityProvider.updateWidgetAriaLabel(NOTEBOOK_TITLE.value);
        }
        if (doUpdate) {
            this.tree?.setInput({ kind: 'root', notebook: notebookDocument });
            this.updateScheduler.schedule();
        }
    }
    getActiveNotebook() {
        const notebookEditor = this.editorService.activeEditorPane;
        const notebookDocument = getNotebookEditorFromEditorPane(notebookEditor)?.textModel;
        return notebookDocument && notebookEditor ? { notebookDocument, notebookEditor } : undefined;
    }
    handleCloseEditor(e) {
        if (e.editor.resource && e.editor.resource.toString() === this.activeNotebook?.uri.toString()) {
            this.tree?.setInput({ kind: 'empty' });
            this.updateScheduler.schedule();
        }
    }
    handleActiveEditorChange(doUpdate = true) {
        const found = this.getActiveNotebook();
        if (found && found.notebookDocument !== this.activeNotebook) {
            this.setActiveNotebook(found.notebookDocument, found.notebookEditor, doUpdate);
        }
    }
    handleExecutionStateChange(event) {
        if (this.activeNotebook && event.affectsNotebook(this.activeNotebook.uri)) {
            // new execution state means either new variables or the kernel is busy so we shouldn't ask
            this.dataSource.cancel();
            // changed === undefined -> excecution ended
            if (event.changed === undefined) {
                this.updateScheduler.schedule();
            }
            else {
                this.updateScheduler.cancel();
            }
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach(editor => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && event.affectsNotebook(notebookDocument.uri)) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
    handleVariablesChanged(notebookUri) {
        if (this.activeNotebook && notebookUri.toString() === this.activeNotebook.uri.toString()) {
            this.updateScheduler.schedule();
        }
        else if (!this.getActiveNotebook()) {
            // check if the updated variables are for a visible notebook
            this.editorService.visibleEditorPanes.forEach(editor => {
                const notebookDocument = getNotebookEditorFromEditorPane(editor)?.textModel;
                if (notebookDocument && notebookDocument.uri.toString() === notebookUri.toString()) {
                    this.setActiveNotebook(notebookDocument, editor);
                }
            });
        }
    }
};
NotebookVariablesView = __decorate([
    __param(1, IEditorService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IContextKeyService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IQuickInputService),
    __param(12, ICommandService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], NotebookVariablesView);
export { NotebookVariablesView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tWYXJpYWJsZXNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxD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