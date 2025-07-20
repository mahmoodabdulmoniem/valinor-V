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
var EditorGroupView_1;
import './media/editorgroupview.css';
import { EditorGroupModel, isGroupEditorCloseEvent, isGroupEditorOpenEvent, isSerializedEditorGroupModel } from '../../../common/editor/editorGroupModel.js';
import { EditorResourceAccessor, DEFAULT_EDITOR_ASSOCIATION, SideBySideEditor, EditorCloseContext, TEXT_DIFF_EDITOR_ID } from '../../../common/editor.js';
import { ActiveEditorGroupLockedContext, ActiveEditorDirtyContext, EditorGroupEditorsCountContext, ActiveEditorStickyContext, ActiveEditorPinnedContext, ActiveEditorLastInGroupContext, ActiveEditorFirstInGroupContext, ResourceContextKey, applyAvailableEditorIds, ActiveEditorAvailableEditorIdsContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, TextCompareEditorVisibleContext, TextCompareEditorActiveContext, ActiveEditorContext, ActiveEditorReadonlyContext, ActiveEditorCanRevertContext, ActiveEditorCanToggleReadonlyContext, ActiveCompareEditorCanSwapContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey } from '../../../common/contextkeys.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { Emitter, Relay } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Dimension, trackFocus, addDisposableListener, EventType, EventHelper, findParentWithClass, isAncestor, isMouseEvent, isActiveElement, getWindow, getActiveElement, $ } from '../../../../base/browser/dom.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { editorBackground, contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_GROUP_HEADER_TABS_BACKGROUND, EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND, EDITOR_GROUP_EMPTY_BACKGROUND, EDITOR_GROUP_HEADER_BORDER } from '../../../common/theme.js';
import { EditorPanes } from './editorPanes.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { EditorProgressIndicator } from '../../../services/progress/browser/progressIndicator.js';
import { localize } from '../../../../nls.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DeferredPromise, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { fillActiveEditorViewState } from './editor.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { hash } from '../../../../base/common/hash.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isLinux, isMacintosh, isNative, isWindows } from '../../../../base/common/platform.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { EditorGroupWatermark } from './editorGroupWatermark.js';
import { EditorTitleControl } from './editorTitleControl.js';
import { EditorPane } from './editorPane.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IFileService } from '../../../../platform/files/common/files.js';
let EditorGroupView = EditorGroupView_1 = class EditorGroupView extends Themable {
    //#region factory
    static createNew(editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, null, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createFromSerialized(serialized, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, serialized, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createCopy(copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    constructor(from, editorPartsView, groupsView, groupsLabel, _index, options, instantiationService, contextKeyService, themeService, telemetryService, keybindingService, menuService, contextMenuService, fileDialogService, editorService, filesConfigurationService, uriIdentityService, logService, editorResolverService, hostService, dialogService, fileService) {
        super(themeService);
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupsLabel = groupsLabel;
        this._index = _index;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.fileDialogService = fileDialogService;
        this.editorService = editorService;
        this.filesConfigurationService = filesConfigurationService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.dialogService = dialogService;
        this.fileService = fileService;
        //#region events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidModelChange = this._register(new Emitter());
        this.onDidModelChange = this._onDidModelChange.event;
        this._onDidActiveEditorChange = this._register(new Emitter());
        this.onDidActiveEditorChange = this._onDidActiveEditorChange.event;
        this._onDidOpenEditorFail = this._register(new Emitter());
        this.onDidOpenEditorFail = this._onDidOpenEditorFail.event;
        this._onWillCloseEditor = this._register(new Emitter());
        this.onWillCloseEditor = this._onWillCloseEditor.event;
        this._onDidCloseEditor = this._register(new Emitter());
        this.onDidCloseEditor = this._onDidCloseEditor.event;
        this._onWillMoveEditor = this._register(new Emitter());
        this.onWillMoveEditor = this._onWillMoveEditor.event;
        this._onWillOpenEditor = this._register(new Emitter());
        this.onWillOpenEditor = this._onWillOpenEditor.event;
        this.disposedEditorsWorker = this._register(new RunOnceWorker(editors => this.handleDisposedEditors(editors), 0));
        this.mapEditorToPendingConfirmation = new Map();
        this.containerToolBarMenuDisposable = this._register(new MutableDisposable());
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._disposed = false;
        //#endregion
        //#region ISerializableView
        this.element = $('div');
        this._onDidChange = this._register(new Relay());
        this.onDidChange = this._onDidChange.event;
        if (from instanceof EditorGroupView_1) {
            this.model = this._register(from.model.clone());
        }
        else if (isSerializedEditorGroupModel(from)) {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, from));
        }
        else {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, undefined));
        }
        //#region create()
        {
            // Scoped context key service
            this.scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            // Container
            this.element.classList.add(...coalesce(['editor-group-container', this.model.isLocked ? 'locked' : undefined]));
            // Container listeners
            this.registerContainerListeners();
            // Container toolbar
            this.createContainerToolbar();
            // Container context menu
            this.createContainerContextMenu();
            // Watermark & shortcuts
            this._register(this.instantiationService.createInstance(EditorGroupWatermark, this.element));
            // Progress bar
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
            // Scoped instantiation service
            this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService], [IEditorProgressService, this._register(new EditorProgressIndicator(this.progressBar, this))])));
            // Context keys
            this.resourceContext = this._register(this.scopedInstantiationService.createInstance(ResourceContextKey));
            this.handleGroupContextKeys();
            // Title container
            this.titleContainer = $('.title');
            this.element.appendChild(this.titleContainer);
            // Title control
            this.titleControl = this._register(this.scopedInstantiationService.createInstance(EditorTitleControl, this.titleContainer, this.editorPartsView, this.groupsView, this, this.model));
            // Editor container
            this.editorContainer = $('.editor-container');
            this.element.appendChild(this.editorContainer);
            // Editor pane
            this.editorPane = this._register(this.scopedInstantiationService.createInstance(EditorPanes, this.element, this.editorContainer, this));
            this._onDidChange.input = this.editorPane.onDidChangeSizeConstraints;
            // Track Focus
            this.doTrackFocus();
            // Update containers
            this.updateTitleContainer();
            this.updateContainer();
            // Update styles
            this.updateStyles();
        }
        //#endregion
        // Restore editors if provided
        const restoreEditorsPromise = this.restoreEditors(from, options) ?? Promise.resolve();
        // Signal restored once editors have restored
        restoreEditorsPromise.finally(() => {
            this.whenRestoredPromise.complete();
        });
        // Register Listeners
        this.registerListeners();
    }
    handleGroupContextKeys() {
        const groupActiveEditorDirtyContext = this.editorPartsView.bind(ActiveEditorDirtyContext, this);
        const groupActiveEditorPinnedContext = this.editorPartsView.bind(ActiveEditorPinnedContext, this);
        const groupActiveEditorFirstContext = this.editorPartsView.bind(ActiveEditorFirstInGroupContext, this);
        const groupActiveEditorLastContext = this.editorPartsView.bind(ActiveEditorLastInGroupContext, this);
        const groupActiveEditorStickyContext = this.editorPartsView.bind(ActiveEditorStickyContext, this);
        const groupEditorsCountContext = this.editorPartsView.bind(EditorGroupEditorsCountContext, this);
        const groupLockedContext = this.editorPartsView.bind(ActiveEditorGroupLockedContext, this);
        const multipleEditorsSelectedContext = MultipleEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const twoEditorsSelectedContext = TwoEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const selectedEditorsHaveFileOrUntitledResourceContext = SelectedEditorsInGroupFileOrUntitledResourceContextKey.bindTo(this.scopedContextKeyService);
        const groupActiveEditorContext = this.editorPartsView.bind(ActiveEditorContext, this);
        const groupActiveEditorIsReadonly = this.editorPartsView.bind(ActiveEditorReadonlyContext, this);
        const groupActiveEditorCanRevert = this.editorPartsView.bind(ActiveEditorCanRevertContext, this);
        const groupActiveEditorCanToggleReadonly = this.editorPartsView.bind(ActiveEditorCanToggleReadonlyContext, this);
        const groupActiveCompareEditorCanSwap = this.editorPartsView.bind(ActiveCompareEditorCanSwapContext, this);
        const groupTextCompareEditorVisibleContext = this.editorPartsView.bind(TextCompareEditorVisibleContext, this);
        const groupTextCompareEditorActiveContext = this.editorPartsView.bind(TextCompareEditorActiveContext, this);
        const groupActiveEditorAvailableEditorIds = this.editorPartsView.bind(ActiveEditorAvailableEditorIdsContext, this);
        const groupActiveEditorCanSplitInGroupContext = this.editorPartsView.bind(ActiveEditorCanSplitInGroupContext, this);
        const groupActiveEditorIsSideBySideEditorContext = this.editorPartsView.bind(SideBySideEditorActiveContext, this);
        const activeEditorListener = this._register(new MutableDisposable());
        const observeActiveEditor = () => {
            activeEditorListener.clear();
            this.scopedContextKeyService.bufferChangeEvents(() => {
                const activeEditor = this.activeEditor;
                const activeEditorPane = this.activeEditorPane;
                this.resourceContext.set(EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY }));
                applyAvailableEditorIds(groupActiveEditorAvailableEditorIds, activeEditor, this.editorResolverService);
                if (activeEditor) {
                    groupActiveEditorCanSplitInGroupContext.set(activeEditor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
                    groupActiveEditorIsSideBySideEditorContext.set(activeEditor.typeId === SideBySideEditorInput.ID);
                    groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    activeEditorListener.value = activeEditor.onDidChangeDirty(() => {
                        groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    });
                }
                else {
                    groupActiveEditorCanSplitInGroupContext.set(false);
                    groupActiveEditorIsSideBySideEditorContext.set(false);
                    groupActiveEditorDirtyContext.set(false);
                }
                if (activeEditorPane) {
                    groupActiveEditorContext.set(activeEditorPane.getId());
                    groupActiveEditorCanRevert.set(!activeEditorPane.input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
                    groupActiveEditorIsReadonly.set(!!activeEditorPane.input.isReadonly());
                    const primaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
                    const secondaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.SECONDARY });
                    groupActiveCompareEditorCanSwap.set(activeEditorPane.input instanceof DiffEditorInput && !activeEditorPane.input.original.isReadonly() && !!primaryEditorResource && (this.fileService.hasProvider(primaryEditorResource) || primaryEditorResource.scheme === Schemas.untitled) && !!secondaryEditorResource && (this.fileService.hasProvider(secondaryEditorResource) || secondaryEditorResource.scheme === Schemas.untitled));
                    groupActiveEditorCanToggleReadonly.set(!!primaryEditorResource && this.fileService.hasProvider(primaryEditorResource) && !this.fileService.hasCapability(primaryEditorResource, 2048 /* FileSystemProviderCapabilities.Readonly */));
                    const activePaneDiffEditor = activeEditorPane?.getId() === TEXT_DIFF_EDITOR_ID;
                    groupTextCompareEditorActiveContext.set(activePaneDiffEditor);
                    groupTextCompareEditorVisibleContext.set(activePaneDiffEditor);
                }
                else {
                    groupActiveEditorContext.reset();
                    groupActiveEditorCanRevert.reset();
                    groupActiveEditorIsReadonly.reset();
                    groupActiveCompareEditorCanSwap.reset();
                    groupActiveEditorCanToggleReadonly.reset();
                }
            });
        };
        // Update group contexts based on group changes
        const updateGroupContextKeys = (e) => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    groupLockedContext.set(this.isLocked);
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    break;
                case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorPinnedContext.set(this.model.isPinned(this.model.activeEditor));
                    }
                    break;
                case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorStickyContext.set(this.model.isSticky(this.model.activeEditor));
                    }
                    break;
                case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                    multipleEditorsSelectedContext.set(this.model.selectedEditors.length > 1);
                    twoEditorsSelectedContext.set(this.model.selectedEditors.length === 2);
                    selectedEditorsHaveFileOrUntitledResourceContext.set(this.model.selectedEditors.every(e => e.resource && (this.fileService.hasProvider(e.resource) || e.resource.scheme === Schemas.untitled)));
                    break;
            }
            // Group editors count context
            groupEditorsCountContext.set(this.count);
        };
        this._register(this.onDidModelChange(e => updateGroupContextKeys(e)));
        // Track the active editor and update context key that reflects
        // the dirty state of this editor
        this._register(this.onDidActiveEditorChange(() => observeActiveEditor()));
        // Update context keys on startup
        observeActiveEditor();
        updateGroupContextKeys({ kind: 8 /* GroupModelChangeKind.EDITOR_ACTIVE */ });
        updateGroupContextKeys({ kind: 3 /* GroupModelChangeKind.GROUP_LOCKED */ });
    }
    registerContainerListeners() {
        // Open new file via doubleclick on empty container
        this._register(addDisposableListener(this.element, EventType.DBLCLICK, e => {
            if (this.isEmpty) {
                EventHelper.stop(e);
                this.editorService.openEditor({
                    resource: undefined,
                    options: {
                        pinned: true,
                        override: DEFAULT_EDITOR_ASSOCIATION.id
                    }
                }, this.id);
            }
        }));
        // Close empty editor group via middle mouse click
        this._register(addDisposableListener(this.element, EventType.AUXCLICK, e => {
            if (this.isEmpty && e.button === 1 /* Middle Button */) {
                EventHelper.stop(e, true);
                this.groupsView.removeGroup(this);
            }
        }));
    }
    createContainerToolbar() {
        // Toolbar Container
        const toolbarContainer = $('.editor-group-container-toolbar');
        this.element.appendChild(toolbarContainer);
        // Toolbar
        const containerToolbar = this._register(new ActionBar(toolbarContainer, {
            ariaLabel: localize('ariaLabelGroupActions', "Empty editor group actions"),
            highlightToggledItems: true
        }));
        // Toolbar actions
        const containerToolbarMenu = this._register(this.menuService.createMenu(MenuId.EmptyEditorGroup, this.scopedContextKeyService));
        const updateContainerToolbar = () => {
            // Clear old actions
            this.containerToolBarMenuDisposable.value = toDisposable(() => containerToolbar.clear());
            // Create new actions
            const actions = getActionBarActions(containerToolbarMenu.getActions({ arg: { groupId: this.id }, shouldForwardArgs: true }), 'navigation');
            for (const action of [...actions.primary, ...actions.secondary]) {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                containerToolbar.push(action, { icon: true, label: false, keybinding: keybinding?.getLabel() });
            }
        };
        updateContainerToolbar();
        this._register(containerToolbarMenu.onDidChange(updateContainerToolbar));
    }
    createContainerContextMenu() {
        this._register(addDisposableListener(this.element, EventType.CONTEXT_MENU, e => this.onShowContainerContextMenu(e)));
        this._register(addDisposableListener(this.element, TouchEventType.Contextmenu, () => this.onShowContainerContextMenu()));
    }
    onShowContainerContextMenu(e) {
        if (!this.isEmpty) {
            return; // only for empty editor groups
        }
        // Find target anchor
        let anchor = this.element;
        if (e) {
            anchor = new StandardMouseEvent(getWindow(this.element), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            menuId: MenuId.EmptyEditorGroupContext,
            contextKeyService: this.contextKeyService,
            getAnchor: () => anchor,
            onHide: () => this.focus()
        });
    }
    doTrackFocus() {
        // Container
        const containerFocusTracker = this._register(trackFocus(this.element));
        this._register(containerFocusTracker.onDidFocus(() => {
            if (this.isEmpty) {
                this._onDidFocus.fire(); // only when empty to prevent duplicate events from `editorPane.onDidFocus`
            }
        }));
        // Title Container
        const handleTitleClickOrTouch = (e) => {
            let target;
            if (isMouseEvent(e)) {
                if (e.button !== 0 /* middle/right mouse button */ || (isMacintosh && e.ctrlKey /* macOS context menu */)) {
                    return undefined;
                }
                target = e.target;
            }
            else {
                target = e.initialTarget;
            }
            if (findParentWithClass(target, 'monaco-action-bar', this.titleContainer) ||
                findParentWithClass(target, 'monaco-breadcrumb-item', this.titleContainer)) {
                return; // not when clicking on actions or breadcrumbs
            }
            // timeout to keep focus in editor after mouse up
            setTimeout(() => {
                this.focus();
            });
        };
        this._register(addDisposableListener(this.titleContainer, EventType.MOUSE_DOWN, e => handleTitleClickOrTouch(e)));
        this._register(addDisposableListener(this.titleContainer, TouchEventType.Tap, e => handleTitleClickOrTouch(e)));
        // Editor pane
        this._register(this.editorPane.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
    }
    updateContainer() {
        // Empty Container: add some empty container attributes
        if (this.isEmpty) {
            this.element.classList.add('empty');
            this.element.tabIndex = 0;
            this.element.setAttribute('aria-label', localize('emptyEditorGroup', "{0} (empty)", this.ariaLabel));
        }
        // Non-Empty Container: revert empty container attributes
        else {
            this.element.classList.remove('empty');
            this.element.removeAttribute('tabIndex');
            this.element.removeAttribute('aria-label');
        }
        // Update styles
        this.updateStyles();
    }
    updateTitleContainer() {
        this.titleContainer.classList.toggle('tabs', this.groupsView.partOptions.showTabs === 'multiple');
        this.titleContainer.classList.toggle('show-file-icons', this.groupsView.partOptions.showIcons);
    }
    restoreEditors(from, groupViewOptions) {
        if (this.count === 0) {
            return; // nothing to show
        }
        // Determine editor options
        let options;
        if (from instanceof EditorGroupView_1) {
            options = fillActiveEditorViewState(from); // if we copy from another group, ensure to copy its active editor viewstate
        }
        else {
            options = Object.create(null);
        }
        const activeEditor = this.model.activeEditor;
        if (!activeEditor) {
            return;
        }
        options.pinned = this.model.isPinned(activeEditor); // preserve pinned state
        options.sticky = this.model.isSticky(activeEditor); // preserve sticky state
        options.preserveFocus = true; // handle focus after editor is restored
        const internalOptions = {
            preserveWindowOrder: true, // handle window order after editor is restored
            skipTitleUpdate: true, // update the title later for all editors at once
        };
        const activeElement = getActiveElement();
        // Show active editor (intentionally not using async to keep
        // `restoreEditors` from executing in same stack)
        const result = this.doShowEditor(activeEditor, { active: true, isNew: false /* restored */ }, options, internalOptions).then(() => {
            // Set focused now if this is the active group and focus has
            // not changed meanwhile. This prevents focus from being
            // stolen accidentally on startup when the user already
            // clicked somewhere.
            if (this.groupsView.activeGroup === this && activeElement && isActiveElement(activeElement) && !groupViewOptions?.preserveFocus) {
                this.focus();
            }
        });
        // Restore editors in title control
        this.titleControl.openEditors(this.editors);
        return result;
    }
    //#region event handling
    registerListeners() {
        // Model Events
        this._register(this.model.onDidModelChange(e => this.onDidGroupModelChange(e)));
        // Option Changes
        this._register(this.groupsView.onDidChangeEditorPartOptions(e => this.onDidChangeEditorPartOptions(e)));
        // Visibility
        this._register(this.groupsView.onDidVisibilityChange(e => this.onDidVisibilityChange(e)));
        // Focus
        this._register(this.onDidFocus(() => this.onDidGainFocus()));
    }
    onDidGroupModelChange(e) {
        // Re-emit to outside
        this._onDidModelChange.fire(e);
        // Handle within
        switch (e.kind) {
            case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                this.element.classList.toggle('locked', this.isLocked);
                break;
            case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                this.onDidChangeEditorSelection();
                break;
        }
        if (!e.editor) {
            return;
        }
        switch (e.kind) {
            case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                if (isGroupEditorOpenEvent(e)) {
                    this.onDidOpenEditor(e.editor, e.editorIndex);
                }
                break;
            case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                if (isGroupEditorCloseEvent(e)) {
                    this.handleOnDidCloseEditor(e.editor, e.editorIndex, e.context, e.sticky);
                }
                break;
            case 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */:
                this.onWillDisposeEditor(e.editor);
                break;
            case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                this.onDidChangeEditorDirty(e.editor);
                break;
            case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                this.onDidChangeEditorTransient(e.editor);
                break;
            case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                this.onDidChangeEditorLabel(e.editor);
                break;
        }
    }
    onDidOpenEditor(editor, editorIndex) {
        /* __GDPR__
            "editorOpened" : {
                "owner": "isidorn",
                "${include}": [
                    "${EditorTelemetryDescriptor}"
                ]
            }
        */
        this.telemetryService.publicLog('editorOpened', this.toEditorTelemetryDescriptor(editor));
        // Update container
        this.updateContainer();
    }
    handleOnDidCloseEditor(editor, editorIndex, context, sticky) {
        // Before close
        this._onWillCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
        // Handle event
        const editorsToClose = [editor];
        // Include both sides of side by side editors when being closed
        if (editor instanceof SideBySideEditorInput) {
            editorsToClose.push(editor.primary, editor.secondary);
        }
        // For each editor to close, we call dispose() to free up any resources.
        // However, certain editors might be shared across multiple editor groups
        // (including being visible in side by side / diff editors) and as such we
        // only dispose when they are not opened elsewhere.
        for (const editor of editorsToClose) {
            if (this.canDispose(editor)) {
                editor.dispose();
            }
        }
        // Update container
        this.updateContainer();
        // Event
        this._onDidCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
    }
    canDispose(editor) {
        for (const groupView of this.editorPartsView.groups) {
            if (groupView instanceof EditorGroupView_1 && groupView.model.contains(editor, {
                strictEquals: true, // only if this input is not shared across editor groups
                supportSideBySide: SideBySideEditor.ANY // include any side of an opened side by side editor
            })) {
                return false;
            }
        }
        return true;
    }
    toResourceTelemetryDescriptor(resource) {
        if (!resource) {
            return undefined;
        }
        const path = resource ? resource.scheme === Schemas.file ? resource.fsPath : resource.path : undefined;
        if (!path) {
            return undefined;
        }
        // Remove query parameters from the resource extension
        let resourceExt = extname(resource);
        const queryStringLocation = resourceExt.indexOf('?');
        resourceExt = queryStringLocation !== -1 ? resourceExt.substr(0, queryStringLocation) : resourceExt;
        return {
            mimeType: new TelemetryTrustedValue(getMimeTypes(resource).join(', ')),
            scheme: resource.scheme,
            ext: resourceExt,
            path: hash(path)
        };
    }
    toEditorTelemetryDescriptor(editor) {
        const descriptor = editor.getTelemetryDescriptor();
        const resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH });
        if (URI.isUri(resource)) {
            descriptor['resource'] = this.toResourceTelemetryDescriptor(resource);
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        else if (resource) {
            if (resource.primary) {
                descriptor['resource'] = this.toResourceTelemetryDescriptor(resource.primary);
            }
            if (resource.secondary) {
                descriptor['resourceSecondary'] = this.toResourceTelemetryDescriptor(resource.secondary);
            }
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] },
                    "resourceSecondary": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        return descriptor;
    }
    onWillDisposeEditor(editor) {
        // To prevent race conditions, we handle disposed editors in our worker with a timeout
        // because it can happen that an input is being disposed with the intent to replace
        // it with some other input right after.
        this.disposedEditorsWorker.work(editor);
    }
    handleDisposedEditors(disposedEditors) {
        // Split between visible and hidden editors
        let activeEditor;
        const inactiveEditors = [];
        for (const disposedEditor of disposedEditors) {
            const editorFindResult = this.model.findEditor(disposedEditor);
            if (!editorFindResult) {
                continue; // not part of the model anymore
            }
            const editor = editorFindResult[0];
            if (!editor.isDisposed()) {
                continue; // editor got reopened meanwhile
            }
            if (this.model.isActive(editor)) {
                activeEditor = editor;
            }
            else {
                inactiveEditors.push(editor);
            }
        }
        // Close all inactive editors first to prevent UI flicker
        for (const inactiveEditor of inactiveEditors) {
            this.doCloseEditor(inactiveEditor, true);
        }
        // Close active one last
        if (activeEditor) {
            this.doCloseEditor(activeEditor, true);
        }
    }
    onDidChangeEditorPartOptions(event) {
        // Title container
        this.updateTitleContainer();
        // Title control
        this.titleControl.updateOptions(event.oldPartOptions, event.newPartOptions);
        // Title control switch between singleEditorTabs, multiEditorTabs and multiRowEditorTabs
        if (event.oldPartOptions.showTabs !== event.newPartOptions.showTabs ||
            event.oldPartOptions.tabHeight !== event.newPartOptions.tabHeight ||
            (event.oldPartOptions.showTabs === 'multiple' && event.oldPartOptions.pinnedTabsOnSeparateRow !== event.newPartOptions.pinnedTabsOnSeparateRow)) {
            // Re-layout
            this.relayout();
            // Ensure to show active editor if any
            if (this.model.activeEditor) {
                this.titleControl.openEditors(this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
            }
        }
        // Styles
        this.updateStyles();
        // Pin preview editor once user disables preview
        if (event.oldPartOptions.enablePreview && !event.newPartOptions.enablePreview) {
            if (this.model.previewEditor) {
                this.pinEditor(this.model.previewEditor);
            }
        }
    }
    onDidChangeEditorDirty(editor) {
        // Always show dirty editors pinned
        this.pinEditor(editor);
        // Forward to title control
        this.titleControl.updateEditorDirty(editor);
    }
    onDidChangeEditorTransient(editor) {
        const transient = this.model.isTransient(editor);
        // Transient state overrides the `enablePreview` setting,
        // so when an editor leaves the transient state, we have
        // to ensure its preview state is also cleared.
        if (!transient && !this.groupsView.partOptions.enablePreview) {
            this.pinEditor(editor);
        }
    }
    onDidChangeEditorLabel(editor) {
        // Forward to title control
        this.titleControl.updateEditorLabel(editor);
    }
    onDidChangeEditorSelection() {
        // Forward to title control
        this.titleControl.updateEditorSelections();
    }
    onDidVisibilityChange(visible) {
        // Forward to active editor pane
        this.editorPane.setVisible(visible);
    }
    onDidGainFocus() {
        if (this.activeEditor) {
            // We aggressively clear the transient state of editors
            // as soon as the group gains focus. This is to ensure
            // that the transient state is not staying around when
            // the user interacts with the editor.
            this.model.setTransient(this.activeEditor, false);
        }
    }
    //#endregion
    //#region IEditorGroupView
    get index() {
        return this._index;
    }
    get label() {
        if (this.groupsLabel) {
            return localize('groupLabelLong', "{0}: Group {1}", this.groupsLabel, this._index + 1);
        }
        return localize('groupLabel', "Group {0}", this._index + 1);
    }
    get ariaLabel() {
        if (this.groupsLabel) {
            return localize('groupAriaLabelLong', "{0}: Editor Group {1}", this.groupsLabel, this._index + 1);
        }
        return localize('groupAriaLabel', "Editor Group {0}", this._index + 1);
    }
    get disposed() {
        return this._disposed;
    }
    get isEmpty() {
        return this.count === 0;
    }
    get titleHeight() {
        return this.titleControl.getHeight();
    }
    notifyIndexChanged(newIndex) {
        if (this._index !== newIndex) {
            this._index = newIndex;
            this.model.setIndex(newIndex);
        }
    }
    notifyLabelChanged(newLabel) {
        if (this.groupsLabel !== newLabel) {
            this.groupsLabel = newLabel;
            this.model.setLabel(newLabel);
        }
    }
    setActive(isActive) {
        this.active = isActive;
        // Clear selection when group no longer active
        if (!isActive && this.activeEditor && this.selectedEditors.length > 1) {
            this.setSelection(this.activeEditor, []);
        }
        // Update container
        this.element.classList.toggle('active', isActive);
        this.element.classList.toggle('inactive', !isActive);
        // Update title control
        this.titleControl.setActive(isActive);
        // Update styles
        this.updateStyles();
        // Update model
        this.model.setActive(undefined /* entire group got active */);
    }
    //#endregion
    //#region basics()
    get id() {
        return this.model.id;
    }
    get windowId() {
        return this.groupsView.windowId;
    }
    get editors() {
        return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
    }
    get count() {
        return this.model.count;
    }
    get stickyCount() {
        return this.model.stickyCount;
    }
    get activeEditorPane() {
        return this.editorPane ? this.editorPane.activeEditorPane ?? undefined : undefined;
    }
    get activeEditor() {
        return this.model.activeEditor;
    }
    get selectedEditors() {
        return this.model.selectedEditors;
    }
    get previewEditor() {
        return this.model.previewEditor;
    }
    isPinned(editorOrIndex) {
        return this.model.isPinned(editorOrIndex);
    }
    isSticky(editorOrIndex) {
        return this.model.isSticky(editorOrIndex);
    }
    isSelected(editor) {
        return this.model.isSelected(editor);
    }
    isTransient(editorOrIndex) {
        return this.model.isTransient(editorOrIndex);
    }
    isActive(editor) {
        return this.model.isActive(editor);
    }
    async setSelection(activeSelectedEditor, inactiveSelectedEditors) {
        if (!this.isActive(activeSelectedEditor)) {
            // The active selected editor is not yet opened, so we go
            // through `openEditor` to show it. We pass the inactive
            // selection as internal options
            await this.openEditor(activeSelectedEditor, { activation: EditorActivation.ACTIVATE }, { inactiveSelection: inactiveSelectedEditors });
        }
        else {
            this.model.setSelection(activeSelectedEditor, inactiveSelectedEditors);
        }
    }
    contains(candidate, options) {
        return this.model.contains(candidate, options);
    }
    getEditors(order, options) {
        return this.model.getEditors(order, options);
    }
    findEditors(resource, options) {
        const canonicalResource = this.uriIdentityService.asCanonicalUri(resource);
        return this.getEditors(options?.order ?? 1 /* EditorsOrder.SEQUENTIAL */).filter(editor => {
            if (editor.resource && isEqual(editor.resource, canonicalResource)) {
                return true;
            }
            // Support side by side editor primary side if specified
            if (options?.supportSideBySide === SideBySideEditor.PRIMARY || options?.supportSideBySide === SideBySideEditor.ANY) {
                const primaryResource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
                if (primaryResource && isEqual(primaryResource, canonicalResource)) {
                    return true;
                }
            }
            // Support side by side editor secondary side if specified
            if (options?.supportSideBySide === SideBySideEditor.SECONDARY || options?.supportSideBySide === SideBySideEditor.ANY) {
                const secondaryResource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY });
                if (secondaryResource && isEqual(secondaryResource, canonicalResource)) {
                    return true;
                }
            }
            return false;
        });
    }
    getEditorByIndex(index) {
        return this.model.getEditorByIndex(index);
    }
    getIndexOfEditor(editor) {
        return this.model.indexOf(editor);
    }
    isFirst(editor) {
        return this.model.isFirst(editor);
    }
    isLast(editor) {
        return this.model.isLast(editor);
    }
    focus() {
        // Pass focus to editor panes
        if (this.activeEditorPane) {
            this.activeEditorPane.focus();
        }
        else {
            this.element.focus();
        }
        // Event
        this._onDidFocus.fire();
    }
    pinEditor(candidate = this.activeEditor || undefined) {
        if (candidate && !this.model.isPinned(candidate)) {
            // Update model
            const editor = this.model.pin(candidate);
            // Forward to title control
            if (editor) {
                this.titleControl.pinEditor(editor);
            }
        }
    }
    stickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, true);
    }
    unstickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, false);
    }
    doStickEditor(candidate, sticky) {
        if (candidate && this.model.isSticky(candidate) !== sticky) {
            const oldIndexOfEditor = this.getIndexOfEditor(candidate);
            // Update model
            const editor = sticky ? this.model.stick(candidate) : this.model.unstick(candidate);
            if (!editor) {
                return;
            }
            // If the index of the editor changed, we need to forward this to
            // title control and also make sure to emit this as an event
            const newIndexOfEditor = this.getIndexOfEditor(editor);
            if (newIndexOfEditor !== oldIndexOfEditor) {
                this.titleControl.moveEditor(editor, oldIndexOfEditor, newIndexOfEditor, true);
            }
            // Forward sticky state to title control
            if (sticky) {
                this.titleControl.stickEditor(editor);
            }
            else {
                this.titleControl.unstickEditor(editor);
            }
        }
    }
    //#endregion
    //#region openEditor()
    async openEditor(editor, options, internalOptions) {
        return this.doOpenEditor(editor, options, {
            // Appply given internal open options
            ...internalOptions,
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH
        });
    }
    async doOpenEditor(editor, options, internalOptions) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        if (!editor || editor.isDisposed()) {
            return;
        }
        // Fire the event letting everyone know we are about to open an editor
        this._onWillOpenEditor.fire({ editor, groupId: this.id });
        // Determine options
        const pinned = options?.sticky
            || (!this.groupsView.partOptions.enablePreview && !options?.transient)
            || editor.isDirty()
            || (options?.pinned ?? typeof options?.index === 'number' /* unless specified, prefer to pin when opening with index */)
            || (typeof options?.index === 'number' && this.model.isSticky(options.index))
            || editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */);
        const openEditorOptions = {
            index: options ? options.index : undefined,
            pinned,
            sticky: options?.sticky || (typeof options?.index === 'number' && this.model.isSticky(options.index)),
            transient: !!options?.transient,
            inactiveSelection: internalOptions?.inactiveSelection,
            active: this.count === 0 || !options || !options.inactive,
            supportSideBySide: internalOptions?.supportSideBySide
        };
        if (!openEditorOptions.active && !openEditorOptions.pinned && this.model.activeEditor && !this.model.isPinned(this.model.activeEditor)) {
            // Special case: we are to open an editor inactive and not pinned, but the current active
            // editor is also not pinned, which means it will get replaced with this one. As such,
            // the editor can only be active.
            openEditorOptions.active = true;
        }
        let activateGroup = false;
        let restoreGroup = false;
        if (options?.activation === EditorActivation.ACTIVATE) {
            // Respect option to force activate an editor group.
            activateGroup = true;
        }
        else if (options?.activation === EditorActivation.RESTORE) {
            // Respect option to force restore an editor group.
            restoreGroup = true;
        }
        else if (options?.activation === EditorActivation.PRESERVE) {
            // Respect option to preserve active editor group.
            activateGroup = false;
            restoreGroup = false;
        }
        else if (openEditorOptions.active) {
            // Finally, we only activate/restore an editor which is
            // opening as active editor.
            // If preserveFocus is enabled, we only restore but never
            // activate the group.
            activateGroup = !options || !options.preserveFocus;
            restoreGroup = !activateGroup;
        }
        // Actually move the editor if a specific index is provided and we figure
        // out that the editor is already opened at a different index. This
        // ensures the right set of events are fired to the outside.
        if (typeof openEditorOptions.index === 'number') {
            const indexOfEditor = this.model.indexOf(editor);
            if (indexOfEditor !== -1 && indexOfEditor !== openEditorOptions.index) {
                this.doMoveEditorInsideGroup(editor, openEditorOptions);
            }
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const { editor: openedEditor, isNew } = this.model.openEditor(editor, openEditorOptions);
        // Conditionally lock the group
        if (isNew && // only if this editor was new for the group
            this.count === 1 && // only when this editor was the first editor in the group
            this.editorPartsView.groups.length > 1 // only allow auto locking if more than 1 group is opened
        ) {
            // only when the editor identifier is configured as such
            if (openedEditor.editorId && this.groupsView.partOptions.autoLockGroups?.has(openedEditor.editorId)) {
                this.lock(true);
            }
        }
        // Show editor
        const showEditorResult = this.doShowEditor(openedEditor, { active: !!openEditorOptions.active, isNew }, options, internalOptions);
        // Finally make sure the group is active or restored as instructed
        if (activateGroup) {
            this.groupsView.activateGroup(this);
        }
        else if (restoreGroup) {
            this.groupsView.restoreGroup(this);
        }
        return showEditorResult;
    }
    doShowEditor(editor, context, options, internalOptions) {
        // Show in editor control if the active editor changed
        let openEditorPromise;
        if (context.active) {
            openEditorPromise = (async () => {
                const { pane, changed, cancelled, error } = await this.editorPane.openEditor(editor, options, internalOptions, { newInGroup: context.isNew });
                // Return early if the operation was cancelled by another operation
                if (cancelled) {
                    return undefined;
                }
                // Editor change event
                if (changed) {
                    this._onDidActiveEditorChange.fire({ editor });
                }
                // Indicate error as an event but do not bubble them up
                if (error) {
                    this._onDidOpenEditorFail.fire(editor);
                }
                // Without an editor pane, recover by closing the active editor
                // (if the input is still the active one)
                if (!pane && this.activeEditor === editor) {
                    this.doCloseEditor(editor, options?.preserveFocus, { fromError: true });
                }
                return pane;
            })();
        }
        else {
            openEditorPromise = Promise.resolve(undefined); // inactive: return undefined as result to signal this
        }
        // Show in title control after editor control because some actions depend on it
        // but respect the internal options in case title control updates should skip.
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.openEditor(editor, internalOptions);
        }
        return openEditorPromise;
    }
    //#endregion
    //#region openEditors()
    async openEditors(editors) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        const editorsToOpen = coalesce(editors).filter(({ editor }) => !editor.isDisposed());
        // Use the first editor as active editor
        const firstEditor = editorsToOpen.at(0);
        if (!firstEditor) {
            return;
        }
        const openEditorsOptions = {
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH
        };
        await this.doOpenEditor(firstEditor.editor, firstEditor.options, openEditorsOptions);
        // Open the other ones inactive
        const inactiveEditors = editorsToOpen.slice(1);
        const startingIndex = this.getIndexOfEditor(firstEditor.editor) + 1;
        await Promises.settled(inactiveEditors.map(({ editor, options }, index) => {
            return this.doOpenEditor(editor, {
                ...options,
                inactive: true,
                pinned: true,
                index: startingIndex + index
            }, {
                ...openEditorsOptions,
                // optimization: update the title control later
                // https://github.com/microsoft/vscode/issues/130634
                skipTitleUpdate: true
            });
        }));
        // Update the title control all at once with all editors
        this.titleControl.openEditors(inactiveEditors.map(({ editor }) => editor));
        // Opening many editors at once can put any editor to be
        // the active one depending on options. As such, we simply
        // return the active editor pane after this operation.
        return this.editorPane.activeEditorPane ?? undefined;
    }
    //#endregion
    //#region moveEditor()
    moveEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target
        };
        let moveFailed = false;
        const movedEditors = new Set();
        for (const { editor, options } of editors) {
            if (this.moveEditor(editor, target, options, internalOptions)) {
                movedEditors.add(editor);
            }
            else {
                moveFailed = true;
            }
        }
        // Update the title control all at once with all editors
        // in source and target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            target.titleControl.openEditors(Array.from(movedEditors));
            this.titleControl.closeEditors(Array.from(movedEditors));
        }
        return !moveFailed;
    }
    moveEditor(editor, target, options, internalOptions) {
        // Move within same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
            return true;
        }
        // Move across groups
        else {
            return this.doMoveOrCopyEditorAcrossGroups(editor, target, options, { ...internalOptions, keepCopy: false });
        }
    }
    doMoveEditorInsideGroup(candidate, options) {
        const moveToIndex = options ? options.index : undefined;
        if (typeof moveToIndex !== 'number') {
            return; // do nothing if we move into same group without index
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const currentIndex = this.model.indexOf(candidate);
        const editor = this.model.getEditorByIndex(currentIndex);
        if (!editor) {
            return;
        }
        // Move when index has actually changed
        if (currentIndex !== moveToIndex) {
            const oldStickyCount = this.model.stickyCount;
            // Update model
            this.model.moveEditor(editor, moveToIndex);
            this.model.pin(editor);
            // Forward to title control
            this.titleControl.moveEditor(editor, currentIndex, moveToIndex, oldStickyCount !== this.model.stickyCount);
            this.titleControl.pinEditor(editor);
        }
        // Support the option to stick the editor even if it is moved.
        // It is important that we call this method after we have moved
        // the editor because the result of moving the editor could have
        // caused a change in sticky state.
        if (options?.sticky) {
            this.stickEditor(editor);
        }
    }
    doMoveOrCopyEditorAcrossGroups(editor, target, openOptions, internalOptions) {
        const keepCopy = internalOptions?.keepCopy;
        // Validate that we can move
        if (!keepCopy || editor.hasCapability(8 /* EditorInputCapabilities.Singleton */) /* singleton editors will always move */) {
            const canMoveVeto = editor.canMove(this.id, target.id);
            if (typeof canMoveVeto === 'string') {
                this.dialogService.error(canMoveVeto, localize('moveErrorDetails', "Try saving or reverting the editor first and then try again."));
                return false;
            }
        }
        // When moving/copying an editor, try to preserve as much view state as possible
        // by checking for the editor to be a text editor and creating the options accordingly
        // if so
        const options = fillActiveEditorViewState(this, editor, {
            ...openOptions,
            pinned: true, // always pin moved editor
            sticky: openOptions?.sticky ?? (!keepCopy && this.model.isSticky(editor)) // preserve sticky state only if editor is moved or explicitly wanted (https://github.com/microsoft/vscode/issues/99035)
        });
        // Indicate will move event
        if (!keepCopy) {
            this._onWillMoveEditor.fire({
                groupId: this.id,
                editor,
                target: target.id
            });
        }
        // A move to another group is an open first...
        target.doOpenEditor(keepCopy ? editor.copy() : editor, options, internalOptions);
        // ...and a close afterwards (unless we copy)
        if (!keepCopy) {
            this.doCloseEditor(editor, true /* do not focus next one behind if any */, { ...internalOptions, context: EditorCloseContext.MOVE });
        }
        return true;
    }
    //#endregion
    //#region copyEditor()
    copyEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target
        };
        for (const { editor, options } of editors) {
            this.copyEditor(editor, target, options, internalOptions);
        }
        // Update the title control all at once with all editors
        // in target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            const copiedEditors = editors.map(({ editor }) => editor);
            target.titleControl.openEditors(copiedEditors);
        }
    }
    copyEditor(editor, target, options, internalOptions) {
        // Move within same group because we do not support to show the same editor
        // multiple times in the same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
        }
        // Copy across groups
        else {
            this.doMoveOrCopyEditorAcrossGroups(editor, target, options, { ...internalOptions, keepCopy: true });
        }
    }
    //#endregion
    //#region closeEditor()
    async closeEditor(editor = this.activeEditor || undefined, options) {
        return this.doCloseEditorWithConfirmationHandling(editor, options);
    }
    async doCloseEditorWithConfirmationHandling(editor = this.activeEditor || undefined, options, internalOptions) {
        if (!editor) {
            return false;
        }
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation([editor]);
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditor(editor, options?.preserveFocus, internalOptions);
        return true;
    }
    doCloseEditor(editor, preserveFocus = (this.groupsView.activeGroup !== this), internalOptions) {
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.beforeCloseEditor(editor);
        }
        // Closing the active editor of the group is a bit more work
        if (this.model.isActive(editor)) {
            this.doCloseActiveEditor(preserveFocus, internalOptions);
        }
        // Closing inactive editor is just a model update
        else {
            this.doCloseInactiveEditor(editor, internalOptions);
        }
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.closeEditor(editor);
        }
    }
    doCloseActiveEditor(preserveFocus = (this.groupsView.activeGroup !== this), internalOptions) {
        const editorToClose = this.activeEditor;
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.element);
        // Optimization: if we are about to close the last editor in this group and settings
        // are configured to close the group since it will be empty, we first set the last
        // active group as empty before closing the editor. This reduces the amount of editor
        // change events that this operation emits and will reduce flicker. Without this
        // optimization, this group (if active) would first trigger a active editor change
        // event because it became empty, only to then trigger another one when the next
        // group gets active.
        const closeEmptyGroup = this.groupsView.partOptions.closeEmptyGroups;
        if (closeEmptyGroup && this.active && this.count === 1) {
            const mostRecentlyActiveGroups = this.groupsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current one, so take [1]
            if (nextActiveGroup) {
                if (restoreFocus) {
                    nextActiveGroup.focus();
                }
                else {
                    this.groupsView.activateGroup(nextActiveGroup, true);
                }
            }
        }
        // Update model
        if (editorToClose) {
            this.model.closeEditor(editorToClose, internalOptions?.context);
        }
        // Open next active if there are more to show
        const nextActiveEditor = this.model.activeEditor;
        if (nextActiveEditor) {
            let activation = undefined;
            if (preserveFocus && this.groupsView.activeGroup !== this) {
                // If we are opening the next editor in an inactive group
                // without focussing it, ensure we preserve the editor
                // group sizes in case that group is minimized.
                // https://github.com/microsoft/vscode/issues/117686
                activation = EditorActivation.PRESERVE;
            }
            const options = {
                preserveFocus,
                activation,
                // When closing an editor due to an error we can end up in a loop where we continue closing
                // editors that fail to open (e.g. when the file no longer exists). We do not want to show
                // repeated errors in this case to the user. As such, if we open the next editor and we are
                // in a scope of a previous editor failing, we silence the input errors until the editor is
                // opened by setting ignoreError: true.
                ignoreError: internalOptions?.fromError
            };
            const internalEditorOpenOptions = {
                // When closing an editor, we reveal the next one in the group.
                // However, this can be a result of moving an editor to another
                // window so we explicitly disable window reordering in this case.
                preserveWindowOrder: true
            };
            this.doOpenEditor(nextActiveEditor, options, internalEditorOpenOptions);
        }
        // Otherwise we are empty, so clear from editor control and send event
        else {
            // Forward to editor pane
            if (editorToClose) {
                this.editorPane.closeEditor(editorToClose);
            }
            // Restore focus to group container as needed unless group gets closed
            if (restoreFocus && !closeEmptyGroup) {
                this.focus();
            }
            // Events
            this._onDidActiveEditorChange.fire({ editor: undefined });
            // Remove empty group if we should
            if (closeEmptyGroup) {
                this.groupsView.removeGroup(this, preserveFocus);
            }
        }
    }
    shouldRestoreFocus(target) {
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestor(activeElement, target);
    }
    doCloseInactiveEditor(editor, internalOptions) {
        // Update model
        this.model.closeEditor(editor, internalOptions?.context);
    }
    async handleCloseConfirmation(editors) {
        if (!editors.length) {
            return false; // no veto
        }
        const editor = editors.shift();
        // To prevent multiple confirmation dialogs from showing up one after the other
        // we check if a pending confirmation is currently showing and if so, join that
        let handleCloseConfirmationPromise = this.mapEditorToPendingConfirmation.get(editor);
        if (!handleCloseConfirmationPromise) {
            handleCloseConfirmationPromise = this.doHandleCloseConfirmation(editor);
            this.mapEditorToPendingConfirmation.set(editor, handleCloseConfirmationPromise);
        }
        let veto;
        try {
            veto = await handleCloseConfirmationPromise;
        }
        finally {
            this.mapEditorToPendingConfirmation.delete(editor);
        }
        // Return for the first veto we got
        if (veto) {
            return veto;
        }
        // Otherwise continue with the remainders
        return this.handleCloseConfirmation(editors);
    }
    async doHandleCloseConfirmation(editor, options) {
        if (!this.shouldConfirmClose(editor)) {
            return false; // no veto
        }
        if (editor instanceof SideBySideEditorInput && this.model.contains(editor.primary)) {
            return false; // primary-side of editor is still opened somewhere else
        }
        // Note: we explicitly decide to ask for confirm if closing a normal editor even
        // if it is opened in a side-by-side editor in the group. This decision is made
        // because it may be less obvious that one side of a side by side editor is dirty
        // and can still be changed.
        // The only exception is when the same editor is opened on both sides of a side
        // by side editor (https://github.com/microsoft/vscode/issues/138442)
        if (this.editorPartsView.groups.some(groupView => {
            if (groupView === this) {
                return false; // skip (we already handled our group above)
            }
            const otherGroup = groupView;
            if (otherGroup.contains(editor, { supportSideBySide: SideBySideEditor.BOTH })) {
                return true; // exact editor still opened (either single, or split-in-group)
            }
            if (editor instanceof SideBySideEditorInput && otherGroup.contains(editor.primary)) {
                return true; // primary side of side by side editor still opened
            }
            return false;
        })) {
            return false; // editor is still editable somewhere else
        }
        // In some cases trigger save before opening the dialog depending
        // on auto-save configuration.
        // However, make sure to respect `skipAutoSave` option in case the automated
        // save fails which would result in the editor never closing.
        // Also, we only do this if no custom confirmation handling is implemented.
        let confirmation = 2 /* ConfirmResult.CANCEL */;
        let saveReason = 1 /* SaveReason.EXPLICIT */;
        let autoSave = false;
        if (!editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && !options?.skipAutoSave && !editor.closeHandler) {
            // Auto-save on focus change: save, because a dialog would steal focus
            // (see https://github.com/microsoft/vscode/issues/108752)
            if (this.filesConfigurationService.getAutoSaveMode(editor).mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 3 /* SaveReason.FOCUS_CHANGE */;
            }
            // Auto-save on window change: save, because on Windows and Linux, a
            // native dialog triggers the window focus change
            // (see https://github.com/microsoft/vscode/issues/134250)
            else if ((isNative && (isWindows || isLinux)) && this.filesConfigurationService.getAutoSaveMode(editor).mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 4 /* SaveReason.WINDOW_CHANGE */;
            }
        }
        // No auto-save on focus change or custom confirmation handler: ask user
        if (!autoSave) {
            // Switch to editor that we want to handle for confirmation unless showing already
            if (!this.activeEditor || !this.activeEditor.matches(editor)) {
                await this.doOpenEditor(editor);
            }
            // Ensure our window has focus since we are about to show a dialog
            await this.hostService.focus(getWindow(this.element));
            // Let editor handle confirmation if implemented
            let handlerDidError = false;
            if (typeof editor.closeHandler?.confirm === 'function') {
                try {
                    confirmation = await editor.closeHandler.confirm([{ editor, groupId: this.id }]);
                }
                catch (e) {
                    this.logService.error(e);
                    handlerDidError = true;
                }
            }
            // Show a file specific confirmation if there is no handler or it errored
            if (typeof editor.closeHandler?.confirm !== 'function' || handlerDidError) {
                let name;
                if (editor instanceof SideBySideEditorInput) {
                    name = editor.primary.getName(); // prefer shorter names by using primary's name in this case
                }
                else {
                    name = editor.getName();
                }
                confirmation = await this.fileDialogService.showSaveConfirm([name]);
            }
        }
        // It could be that the editor's choice of confirmation has changed
        // given the check for confirmation is long running, so we check
        // again to see if anything needs to happen before closing for good.
        // This can happen for example if `autoSave: onFocusChange` is configured
        // so that the save happens when the dialog opens.
        // However, we only do this unless a custom confirm handler is installed
        // that may not be fit to be asked a second time right after.
        if (!editor.closeHandler && !this.shouldConfirmClose(editor)) {
            return confirmation === 2 /* ConfirmResult.CANCEL */ ? true : false;
        }
        // Otherwise, handle accordingly
        switch (confirmation) {
            case 0 /* ConfirmResult.SAVE */: {
                const result = await editor.save(this.id, { reason: saveReason });
                if (!result && autoSave) {
                    // Save failed and we need to signal this back to the user, so
                    // we handle the dirty editor again but this time ensuring to
                    // show the confirm dialog
                    // (see https://github.com/microsoft/vscode/issues/108752)
                    return this.doHandleCloseConfirmation(editor, { skipAutoSave: true });
                }
                return editor.isDirty(); // veto if still dirty
            }
            case 1 /* ConfirmResult.DONT_SAVE */:
                try {
                    // first try a normal revert where the contents of the editor are restored
                    await editor.revert(this.id);
                    return editor.isDirty(); // veto if still dirty
                }
                catch (error) {
                    this.logService.error(error);
                    // if that fails, since we are about to close the editor, we accept that
                    // the editor cannot be reverted and instead do a soft revert that just
                    // enables us to close the editor. With this, a user can always close a
                    // dirty editor even when reverting fails.
                    await editor.revert(this.id, { soft: true });
                    return editor.isDirty(); // veto if still dirty
                }
            case 2 /* ConfirmResult.CANCEL */:
                return true; // veto
        }
    }
    shouldConfirmClose(editor) {
        if (editor.closeHandler) {
            try {
                return editor.closeHandler.showConfirm(); // custom handling of confirmation on close
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return editor.isDirty() && !editor.isSaving(); // editor must be dirty and not saving
    }
    //#endregion
    //#region closeEditors()
    async closeEditors(args, options) {
        if (this.isEmpty) {
            return true;
        }
        const editors = this.doGetEditorsToClose(args);
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation(editors.slice(0));
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditors(editors, options);
        return true;
    }
    doGetEditorsToClose(args) {
        if (Array.isArray(args)) {
            return args;
        }
        const filter = args;
        const hasDirection = typeof filter.direction === 'number';
        let editorsToClose = this.model.getEditors(hasDirection ? 1 /* EditorsOrder.SEQUENTIAL */ : 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, filter); // in MRU order only if direction is not specified
        // Filter: saved or saving only
        if (filter.savedOnly) {
            editorsToClose = editorsToClose.filter(editor => !editor.isDirty() || editor.isSaving());
        }
        // Filter: direction (left / right)
        else if (hasDirection && filter.except) {
            editorsToClose = (filter.direction === 0 /* CloseDirection.LEFT */) ?
                editorsToClose.slice(0, this.model.indexOf(filter.except, editorsToClose)) :
                editorsToClose.slice(this.model.indexOf(filter.except, editorsToClose) + 1);
        }
        // Filter: except
        else if (filter.except) {
            editorsToClose = editorsToClose.filter(editor => filter.except && !editor.matches(filter.except));
        }
        return editorsToClose;
    }
    doCloseEditors(editors, options) {
        // Close all inactive editors first
        let closeActiveEditor = false;
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            else {
                closeActiveEditor = true;
            }
        }
        // Close active editor last if contained in editors list to close
        if (closeActiveEditor) {
            this.doCloseActiveEditor(options?.preserveFocus);
        }
        // Forward to title control
        if (editors.length) {
            this.titleControl.closeEditors(editors);
        }
    }
    closeAllEditors(options) {
        if (this.isEmpty) {
            // If the group is empty and the request is to close all editors, we still close
            // the editor group is the related setting to close empty groups is enabled for
            // a convenient way of removing empty editor groups for the user.
            if (this.groupsView.partOptions.closeEmptyGroups) {
                this.groupsView.removeGroup(this);
            }
            return true;
        }
        // We can go ahead and close "sync" when we exclude confirming editors
        if (options?.excludeConfirming) {
            this.doCloseAllEditors(options);
            return true;
        }
        // Otherwise go through potential confirmation "async"
        return this.handleCloseConfirmation(this.model.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, options)).then(veto => {
            if (veto) {
                return false;
            }
            this.doCloseAllEditors(options);
            return true;
        });
    }
    doCloseAllEditors(options) {
        let editors = this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */, options);
        if (options?.excludeConfirming) {
            editors = editors.filter(editor => !this.shouldConfirmClose(editor));
        }
        // Close all inactive editors first
        const editorsToClose = [];
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            editorsToClose.push(editor);
        }
        // Close active editor last (unless we skip it, e.g. because it is sticky)
        if (this.activeEditor && editorsToClose.includes(this.activeEditor)) {
            this.doCloseActiveEditor();
        }
        // Forward to title control
        if (editorsToClose.length) {
            this.titleControl.closeEditors(editorsToClose);
        }
    }
    //#endregion
    //#region replaceEditors()
    async replaceEditors(editors) {
        // Extract active vs. inactive replacements
        let activeReplacement;
        const inactiveReplacements = [];
        for (let { editor, replacement, forceReplaceDirty, options } of editors) {
            const index = this.getIndexOfEditor(editor);
            if (index >= 0) {
                const isActiveEditor = this.isActive(editor);
                // make sure we respect the index of the editor to replace
                if (options) {
                    options.index = index;
                }
                else {
                    options = { index };
                }
                options.inactive = !isActiveEditor;
                options.pinned = options.pinned ?? true; // unless specified, prefer to pin upon replace
                const editorToReplace = { editor, replacement, forceReplaceDirty, options };
                if (isActiveEditor) {
                    activeReplacement = editorToReplace;
                }
                else {
                    inactiveReplacements.push(editorToReplace);
                }
            }
        }
        // Handle inactive first
        for (const { editor, replacement, forceReplaceDirty, options } of inactiveReplacements) {
            // Open inactive editor
            await this.doOpenEditor(replacement, options);
            // Close replaced inactive editor unless they match
            if (!editor.matches(replacement)) {
                let closed = false;
                if (forceReplaceDirty) {
                    this.doCloseEditor(editor, true, { context: EditorCloseContext.REPLACE });
                    closed = true;
                }
                else {
                    closed = await this.doCloseEditorWithConfirmationHandling(editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
                if (!closed) {
                    return; // canceled
                }
            }
        }
        // Handle active last
        if (activeReplacement) {
            // Open replacement as active editor
            const openEditorResult = this.doOpenEditor(activeReplacement.replacement, activeReplacement.options);
            // Close replaced active editor unless they match
            if (!activeReplacement.editor.matches(activeReplacement.replacement)) {
                if (activeReplacement.forceReplaceDirty) {
                    this.doCloseEditor(activeReplacement.editor, true, { context: EditorCloseContext.REPLACE });
                }
                else {
                    await this.doCloseEditorWithConfirmationHandling(activeReplacement.editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
            }
            await openEditorResult;
        }
    }
    //#endregion
    //#region Locking
    get isLocked() {
        return this.model.isLocked;
    }
    lock(locked) {
        this.model.lock(locked);
    }
    //#endregion
    //#region Editor Actions
    createEditorActions(disposables, menuId = MenuId.EditorTitle) {
        let actions = { primary: [], secondary: [] };
        let onDidChange;
        // Editor actions require the editor control to be there, so we retrieve it via service
        const activeEditorPane = this.activeEditorPane;
        if (activeEditorPane instanceof EditorPane) {
            const editorScopedContextKeyService = activeEditorPane.scopedContextKeyService ?? this.scopedContextKeyService;
            const editorTitleMenu = disposables.add(this.menuService.createMenu(menuId, editorScopedContextKeyService, { emitEventsForSubmenuChanges: true, eventDebounceDelay: 0 }));
            onDidChange = editorTitleMenu.onDidChange;
            const shouldInlineGroup = (action, group) => group === 'navigation' && action.actions.length <= 1;
            actions = getActionBarActions(editorTitleMenu.getActions({ arg: this.resourceContext.get(), shouldForwardArgs: true }), 'navigation', shouldInlineGroup);
        }
        else {
            // If there is no active pane in the group (it's the last group and it's empty)
            // Trigger the change event when the active editor changes
            const onDidChangeEmitter = disposables.add(new Emitter());
            onDidChange = onDidChangeEmitter.event;
            disposables.add(this.onDidActiveEditorChange(() => onDidChangeEmitter.fire()));
        }
        return { actions, onDidChange };
    }
    //#endregion
    //#region Themable
    updateStyles() {
        const isEmpty = this.isEmpty;
        // Container
        if (isEmpty) {
            this.element.style.backgroundColor = this.getColor(EDITOR_GROUP_EMPTY_BACKGROUND) || '';
        }
        else {
            this.element.style.backgroundColor = '';
        }
        // Title control
        const borderColor = this.getColor(EDITOR_GROUP_HEADER_BORDER) || this.getColor(contrastBorder);
        if (!isEmpty && borderColor) {
            this.titleContainer.classList.add('title-border-bottom');
            this.titleContainer.style.setProperty('--title-border-bottom-color', borderColor);
        }
        else {
            this.titleContainer.classList.remove('title-border-bottom');
            this.titleContainer.style.removeProperty('--title-border-bottom-color');
        }
        const { showTabs } = this.groupsView.partOptions;
        this.titleContainer.style.backgroundColor = this.getColor(showTabs === 'multiple' ? EDITOR_GROUP_HEADER_TABS_BACKGROUND : EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND) || '';
        // Editor container
        this.editorContainer.style.backgroundColor = this.getColor(editorBackground) || '';
    }
    get minimumWidth() { return this.editorPane.minimumWidth; }
    get minimumHeight() { return this.editorPane.minimumHeight; }
    get maximumWidth() { return this.editorPane.maximumWidth; }
    get maximumHeight() { return this.editorPane.maximumHeight; }
    get proportionalLayout() {
        if (!this.lastLayout) {
            return true;
        }
        return !(this.lastLayout.width === this.minimumWidth || this.lastLayout.height === this.minimumHeight);
    }
    layout(width, height, top, left) {
        this.lastLayout = { width, height, top, left };
        this.element.classList.toggle('max-height-478px', height <= 478);
        // Layout the title control first to receive the size it occupies
        const titleControlSize = this.titleControl.layout({
            container: new Dimension(width, height),
            available: new Dimension(width, height - this.editorPane.minimumHeight)
        });
        // Update progress bar location
        this.progressBar.getContainer().style.top = `${Math.max(this.titleHeight.offset - 2, 0)}px`;
        // Pass the container width and remaining height to the editor layout
        const editorHeight = Math.max(0, height - titleControlSize.height);
        this.editorContainer.style.height = `${editorHeight}px`;
        this.editorPane.layout({ width, height: editorHeight, top: top + titleControlSize.height, left });
    }
    relayout() {
        if (this.lastLayout) {
            const { width, height, top, left } = this.lastLayout;
            this.layout(width, height, top, left);
        }
    }
    setBoundarySashes(sashes) {
        this.editorPane.setBoundarySashes(sashes);
    }
    toJSON() {
        return this.model.serialize();
    }
    //#endregion
    dispose() {
        this._disposed = true;
        this._onWillDispose.fire();
        super.dispose();
    }
};
EditorGroupView = EditorGroupView_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, ITelemetryService),
    __param(10, IKeybindingService),
    __param(11, IMenuService),
    __param(12, IContextMenuService),
    __param(13, IFileDialogService),
    __param(14, IEditorService),
    __param(15, IFilesConfigurationService),
    __param(16, IUriIdentityService),
    __param(17, ILogService),
    __param(18, IEditorResolverService),
    __param(19, IHostService),
    __param(20, IDialogService),
    __param(21, IFileService)
], EditorGroupView);
export { EditorGroupView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yR3JvdXBWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMkUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0TyxPQUFPLEVBQWdKLHNCQUFzQixFQUFnRCwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBdUksbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzZCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsd0JBQXdCLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUscUNBQXFDLEVBQUUsa0NBQWtDLEVBQUUsNkJBQTZCLEVBQUUsK0JBQStCLEVBQUUsOEJBQThCLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsNEJBQTRCLEVBQUUsb0NBQW9DLEVBQUUsaUNBQWlDLEVBQUUscUNBQXFDLEVBQUUsZ0NBQWdDLEVBQUUsc0RBQXNELEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVudkIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFF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