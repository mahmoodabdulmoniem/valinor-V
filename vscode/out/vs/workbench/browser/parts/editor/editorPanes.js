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
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorExtensions, isEditorOpenError } from '../../../common/editor.js';
import { Dimension, show, hide, isAncestor, getActiveElement, getWindowById, isEditableElement, $ } from '../../../../base/browser/dom.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorProgressService, LongRunningOperation } from '../../../../platform/progress/common/progress.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from './editor.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ErrorPlaceholderEditor, WorkspaceTrustRequiredPlaceholderEditor } from './editorPlaceholder.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../../services/host/browser/host.js';
let EditorPanes = class EditorPanes extends Disposable {
    //#endregion
    get minimumWidth() { return this._activeEditorPane?.minimumWidth ?? DEFAULT_EDITOR_MIN_DIMENSIONS.width; }
    get minimumHeight() { return this._activeEditorPane?.minimumHeight ?? DEFAULT_EDITOR_MIN_DIMENSIONS.height; }
    get maximumWidth() { return this._activeEditorPane?.maximumWidth ?? DEFAULT_EDITOR_MAX_DIMENSIONS.width; }
    get maximumHeight() { return this._activeEditorPane?.maximumHeight ?? DEFAULT_EDITOR_MAX_DIMENSIONS.height; }
    get activeEditorPane() { return this._activeEditorPane; }
    constructor(editorGroupParent, editorPanesParent, groupView, layoutService, instantiationService, editorProgressService, workspaceTrustService, logService, dialogService, hostService) {
        super();
        this.editorGroupParent = editorGroupParent;
        this.editorPanesParent = editorPanesParent;
        this.groupView = groupView;
        this.layoutService = layoutService;
        this.instantiationService = instantiationService;
        this.workspaceTrustService = workspaceTrustService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        //#region Events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidChangeSizeConstraints = this._register(new Emitter());
        this.onDidChangeSizeConstraints = this._onDidChangeSizeConstraints.event;
        this._activeEditorPane = null;
        this.editorPanes = [];
        this.mapEditorPaneToPendingSetInput = new Map();
        this.activeEditorPaneDisposables = this._register(new DisposableStore());
        this.editorPanesRegistry = Registry.as(EditorExtensions.EditorPane);
        this.editorOperation = this._register(new LongRunningOperation(editorProgressService));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.workspaceTrustService.onDidChangeTrust(() => this.onDidChangeWorkspaceTrust()));
    }
    onDidChangeWorkspaceTrust() {
        // If the active editor pane requires workspace trust
        // we need to re-open it anytime trust changes to
        // account for it.
        // For that we explicitly call into the group-view
        // to handle errors properly.
        const editor = this._activeEditorPane?.input;
        const options = this._activeEditorPane?.options;
        if (editor?.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */)) {
            this.groupView.openEditor(editor, options);
        }
    }
    async openEditor(editor, options, internalOptions, context = Object.create(null)) {
        try {
            return await this.doOpenEditor(this.getEditorPaneDescriptor(editor), editor, options, internalOptions, context);
        }
        catch (error) {
            // First check if caller instructed us to ignore error handling
            if (options?.ignoreError) {
                return { error };
            }
            // In case of an error when opening an editor, we still want to show
            // an editor in the desired location to preserve the user intent and
            // view state (e.g. when restoring).
            //
            // For that reason we have place holder editors that can convey a
            // message with actions the user can click on.
            return this.doShowError(error, editor, options, internalOptions, context);
        }
    }
    async doShowError(error, editor, options, internalOptions, context) {
        // Always log the error to figure out what is going on
        this.logService.error(error);
        // Show as modal dialog when explicit user action unless disabled
        let errorHandled = false;
        if (options?.source === EditorOpenSource.USER && (!isEditorOpenError(error) || error.allowDialog)) {
            errorHandled = await this.doShowErrorDialog(error, editor);
        }
        // Return early if the user dealt with the error already
        if (errorHandled) {
            return { error };
        }
        // Show as editor placeholder: pass over the error to display
        const editorPlaceholderOptions = { ...options };
        if (!isCancellationError(error)) {
            editorPlaceholderOptions.error = error;
        }
        return {
            ...(await this.doOpenEditor(ErrorPlaceholderEditor.DESCRIPTOR, editor, editorPlaceholderOptions, internalOptions, context)),
            error
        };
    }
    async doShowErrorDialog(error, editor) {
        let severity = Severity.Error;
        let message = undefined;
        let detail = toErrorMessage(error);
        let errorActions = undefined;
        if (isEditorOpenError(error)) {
            errorActions = error.actions;
            severity = error.forceSeverity ?? Severity.Error;
            if (error.forceMessage) {
                message = error.message;
                detail = undefined;
            }
        }
        if (!message) {
            message = localize('editorOpenErrorDialog', "Unable to open '{0}'", editor.getName());
        }
        const buttons = [];
        if (errorActions && errorActions.length > 0) {
            for (const errorAction of errorActions) {
                buttons.push({
                    label: errorAction.label,
                    run: () => errorAction
                });
            }
        }
        else {
            buttons.push({
                label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                run: () => undefined
            });
        }
        let cancelButton = undefined;
        if (buttons.length === 1) {
            cancelButton = {
                run: () => {
                    errorHandled = true; // treat cancel as handled and do not show placeholder
                    return undefined;
                }
            };
        }
        let errorHandled = false; // by default, show placeholder
        const { result } = await this.dialogService.prompt({
            type: severity,
            message,
            detail,
            buttons,
            cancelButton
        });
        if (result) {
            const errorActionResult = result.run();
            if (errorActionResult instanceof Promise) {
                errorActionResult.catch(error => this.dialogService.error(toErrorMessage(error)));
            }
            errorHandled = true; // treat custom error action as handled and do not show placeholder
        }
        return errorHandled;
    }
    async doOpenEditor(descriptor, editor, options, internalOptions, context = Object.create(null)) {
        // Editor pane
        const pane = this.doShowEditorPane(descriptor);
        // Remember current active element for deciding to restore focus later
        const activeElement = getActiveElement();
        // Apply input to pane
        const { changed, cancelled } = await this.doSetInput(pane, editor, options, context);
        // Make sure to pass focus to the pane or otherwise
        // make sure that the pane window is visible unless
        // this has been explicitly disabled.
        if (!cancelled) {
            const focus = !options || !options.preserveFocus;
            if (focus && this.shouldRestoreFocus(activeElement)) {
                pane.focus();
            }
            else if (!internalOptions?.preserveWindowOrder) {
                this.hostService.moveTop(getWindowById(this.groupView.windowId, true).window);
            }
        }
        return { pane, changed, cancelled };
    }
    shouldRestoreFocus(expectedActiveElement) {
        if (!this.layoutService.isRestored()) {
            return true; // restore focus if we are not restored yet on startup
        }
        if (!expectedActiveElement) {
            return true; // restore focus if nothing was focused
        }
        const activeElement = getActiveElement();
        if (!activeElement || activeElement === expectedActiveElement.ownerDocument.body) {
            return true; // restore focus if nothing is focused currently
        }
        const same = expectedActiveElement === activeElement;
        if (same) {
            return true; // restore focus if same element is still active
        }
        if (!isEditableElement(activeElement)) {
            // This is to avoid regressions from not restoring focus as we used to:
            // Only allow a different input element (or textarea) to remain focused
            // but not other elements that do not accept text input.
            return true;
        }
        if (isAncestor(activeElement, this.editorGroupParent)) {
            return true; // restore focus if active element is still inside our editor group
        }
        return false; // do not restore focus
    }
    getEditorPaneDescriptor(editor) {
        if (editor.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */) && !this.workspaceTrustService.isWorkspaceTrusted()) {
            // Workspace trust: if an editor signals it needs workspace trust
            // but the current workspace is untrusted, we fallback to a generic
            // editor descriptor to indicate this an do NOT load the registered
            // editor.
            return WorkspaceTrustRequiredPlaceholderEditor.DESCRIPTOR;
        }
        return assertReturnsDefined(this.editorPanesRegistry.getEditorPane(editor));
    }
    doShowEditorPane(descriptor) {
        // Return early if the currently active editor pane can handle the input
        if (this._activeEditorPane && descriptor.describes(this._activeEditorPane)) {
            return this._activeEditorPane;
        }
        // Hide active one first
        this.doHideActiveEditorPane();
        // Create editor pane
        const editorPane = this.doCreateEditorPane(descriptor);
        // Set editor as active
        this.doSetActiveEditorPane(editorPane);
        // Show editor
        const container = assertReturnsDefined(editorPane.getContainer());
        this.editorPanesParent.appendChild(container);
        show(container);
        // Indicate to editor that it is now visible
        editorPane.setVisible(true);
        // Layout
        if (this.pagePosition) {
            editorPane.layout(new Dimension(this.pagePosition.width, this.pagePosition.height), { top: this.pagePosition.top, left: this.pagePosition.left });
        }
        // Boundary sashes
        if (this.boundarySashes) {
            editorPane.setBoundarySashes(this.boundarySashes);
        }
        return editorPane;
    }
    doCreateEditorPane(descriptor) {
        // Instantiate editor
        const editorPane = this.doInstantiateEditorPane(descriptor);
        // Create editor container as needed
        if (!editorPane.getContainer()) {
            const editorPaneContainer = $('.editor-instance');
            // It is cruicial to append the container to its parent before
            // passing on to the create() method of the pane so that the
            // right `window` can be determined in floating window cases.
            this.editorPanesParent.appendChild(editorPaneContainer);
            try {
                editorPane.create(editorPaneContainer);
            }
            catch (error) {
                // At this point the editor pane container is not healthy
                // and as such, we remove it from the pane parent and hide
                // it so that we have a chance to show an error placeholder.
                // Not doing so would result in multiple `.editor-instance`
                // lingering around in the DOM.
                editorPaneContainer.remove();
                hide(editorPaneContainer);
                throw error;
            }
        }
        return editorPane;
    }
    doInstantiateEditorPane(descriptor) {
        // Return early if already instantiated
        const existingEditorPane = this.editorPanes.find(editorPane => descriptor.describes(editorPane));
        if (existingEditorPane) {
            return existingEditorPane;
        }
        // Otherwise instantiate new
        const editorPane = this._register(descriptor.instantiate(this.instantiationService, this.groupView));
        this.editorPanes.push(editorPane);
        return editorPane;
    }
    doSetActiveEditorPane(editorPane) {
        this._activeEditorPane = editorPane;
        // Clear out previous active editor pane listeners
        this.activeEditorPaneDisposables.clear();
        // Listen to editor pane changes
        if (editorPane) {
            this.activeEditorPaneDisposables.add(editorPane.onDidChangeSizeConstraints(e => this._onDidChangeSizeConstraints.fire(e)));
            this.activeEditorPaneDisposables.add(editorPane.onDidFocus(() => this._onDidFocus.fire()));
        }
        // Indicate that size constraints could have changed due to new editor
        this._onDidChangeSizeConstraints.fire(undefined);
    }
    async doSetInput(editorPane, editor, options, context) {
        // If the input did not change, return early and only
        // apply the options unless the options instruct us to
        // force open it even if it is the same
        let inputMatches = editorPane.input?.matches(editor);
        if (inputMatches && !options?.forceReload) {
            // We have to await a pending `setInput()` call for this
            // pane before we can call into `setOptions()`, otherwise
            // we risk calling when the input is not yet fully applied.
            if (this.mapEditorPaneToPendingSetInput.has(editorPane)) {
                await this.mapEditorPaneToPendingSetInput.get(editorPane);
            }
            // At this point, the input might have changed, so we check again
            inputMatches = editorPane.input?.matches(editor);
            if (inputMatches) {
                editorPane.setOptions(options);
            }
            return { changed: false, cancelled: !inputMatches };
        }
        // Start a new editor input operation to report progress
        // and to support cancellation. Any new operation that is
        // started will cancel the previous one.
        const operation = this.editorOperation.start(this.layoutService.isRestored() ? 800 : 3200);
        let cancelled = false;
        try {
            // Clear the current input before setting new input
            // This ensures that a slow loading input will not
            // be visible for the duration of the new input to
            // load (https://github.com/microsoft/vscode/issues/34697)
            editorPane.clearInput();
            // Set the input to the editor pane and keep track of it
            const pendingSetInput = editorPane.setInput(editor, options, context, operation.token);
            this.mapEditorPaneToPendingSetInput.set(editorPane, pendingSetInput);
            await pendingSetInput;
            if (!operation.isCurrent()) {
                cancelled = true;
            }
        }
        catch (error) {
            if (!operation.isCurrent()) {
                cancelled = true;
            }
            else {
                throw error;
            }
        }
        finally {
            if (operation.isCurrent()) {
                this.mapEditorPaneToPendingSetInput.delete(editorPane);
            }
            operation.stop();
        }
        return { changed: !inputMatches, cancelled };
    }
    doHideActiveEditorPane() {
        if (!this._activeEditorPane) {
            return;
        }
        // Stop any running operation
        this.editorOperation.stop();
        // Indicate to editor pane before removing the editor from
        // the DOM to give a chance to persist certain state that
        // might depend on still being the active DOM element.
        this.safeRun(() => this._activeEditorPane?.clearInput());
        this.safeRun(() => this._activeEditorPane?.setVisible(false));
        // Clear any pending setInput promise
        this.mapEditorPaneToPendingSetInput.delete(this._activeEditorPane);
        // Remove editor pane from parent
        const editorPaneContainer = this._activeEditorPane.getContainer();
        if (editorPaneContainer) {
            editorPaneContainer.remove();
            hide(editorPaneContainer);
        }
        // Clear active editor pane
        this.doSetActiveEditorPane(null);
    }
    closeEditor(editor) {
        if (this._activeEditorPane?.input && editor.matches(this._activeEditorPane.input)) {
            this.doHideActiveEditorPane();
        }
    }
    setVisible(visible) {
        this.safeRun(() => this._activeEditorPane?.setVisible(visible));
    }
    layout(pagePosition) {
        this.pagePosition = pagePosition;
        this.safeRun(() => this._activeEditorPane?.layout(new Dimension(pagePosition.width, pagePosition.height), pagePosition));
    }
    setBoundarySashes(sashes) {
        this.boundarySashes = sashes;
        this.safeRun(() => this._activeEditorPane?.setBoundarySashes(sashes));
    }
    safeRun(fn) {
        // We delegate many calls to the active editor pane which
        // can be any kind of editor. We must ensure that our calls
        // do not throw, for example in `layout()` because that can
        // mess with the grid layout.
        try {
            fn();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
};
EditorPanes = __decorate([
    __param(3, IWorkbenchLayoutService),
    __param(4, IInstantiationService),
    __param(5, IEditorProgressService),
    __param(6, IWorkspaceTrustManagementService),
    __param(7, ILogService),
    __param(8, IDialogService),
    __param(9, IHostService)
], EditorPanes);
export { EditorPanes };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFtRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWpKLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBd0IsVUFBVSxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEgsT0FBTyxFQUFvQiw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBOEIsTUFBTSxhQUFhLENBQUM7QUFDekksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURB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