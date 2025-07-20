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
var DropOverlay_1;
import './media/editordroptarget.css';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, addDisposableListener, DragAndDropObserver, EventHelper, EventType, getWindow, isAncestor } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { assertReturnsAllDefined, assertReturnsDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { activeContrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CodeDataTransfers, containsDragType, Extensions as DragAndDropExtensions, LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { DraggedEditorGroupIdentifier, DraggedEditorIdentifier, extractTreeDropData, ResourcesDropHandler } from '../../dnd.js';
import { prepareMoveCopyEditors } from './editor.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND, EDITOR_DROP_INTO_PROMPT_BACKGROUND, EDITOR_DROP_INTO_PROMPT_BORDER, EDITOR_DROP_INTO_PROMPT_FOREGROUND } from '../../../common/theme.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
function isDropIntoEditorEnabledGlobally(configurationService) {
    return configurationService.getValue('editor.dropIntoEditor.enabled');
}
function isDragIntoEditorEvent(e) {
    return e.shiftKey;
}
let DropOverlay = class DropOverlay extends Themable {
    static { DropOverlay_1 = this; }
    static { this.OVERLAY_ID = 'monaco-workbench-editor-drop-overlay'; }
    get disposed() { return !!this._disposed; }
    constructor(groupView, themeService, configurationService, instantiationService, editorService, editorGroupService, treeViewsDragAndDropService, contextService) {
        super(themeService);
        this.groupView = groupView;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.contextService = contextService;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.cleanupOverlayScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));
        this.enableDropIntoEditor = isDropIntoEditorEnabledGlobally(this.configurationService) && this.isDropIntoActiveEditorEnabled();
        this.create();
    }
    create() {
        const overlayOffsetHeight = this.getOverlayOffsetHeight();
        // Container
        const container = this.container = $('div', { id: DropOverlay_1.OVERLAY_ID });
        container.style.top = `${overlayOffsetHeight}px`;
        // Parent
        this.groupView.element.appendChild(container);
        this.groupView.element.classList.add('dragged-over');
        this._register(toDisposable(() => {
            container.remove();
            this.groupView.element.classList.remove('dragged-over');
        }));
        // Overlay
        this.overlay = $('.editor-group-overlay-indicator');
        container.appendChild(this.overlay);
        if (this.enableDropIntoEditor) {
            this.dropIntoPromptElement = renderFormattedText(localize('dropIntoEditorPrompt', "Hold __{0}__ to drop into editor", isMacintosh ? '⇧' : 'Shift'), {});
            this.dropIntoPromptElement.classList.add('editor-group-overlay-drop-into-prompt');
            this.overlay.appendChild(this.dropIntoPromptElement);
        }
        // Overlay Event Handling
        this.registerListeners(container);
        // Styles
        this.updateStyles();
    }
    updateStyles() {
        const overlay = assertReturnsDefined(this.overlay);
        // Overlay drop background
        overlay.style.backgroundColor = this.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND) || '';
        // Overlay contrast border (if any)
        const activeContrastBorderColor = this.getColor(activeContrastBorder);
        overlay.style.outlineColor = activeContrastBorderColor || '';
        overlay.style.outlineOffset = activeContrastBorderColor ? '-2px' : '';
        overlay.style.outlineStyle = activeContrastBorderColor ? 'dashed' : '';
        overlay.style.outlineWidth = activeContrastBorderColor ? '2px' : '';
        if (this.dropIntoPromptElement) {
            this.dropIntoPromptElement.style.backgroundColor = this.getColor(EDITOR_DROP_INTO_PROMPT_BACKGROUND) ?? '';
            this.dropIntoPromptElement.style.color = this.getColor(EDITOR_DROP_INTO_PROMPT_FOREGROUND) ?? '';
            const borderColor = this.getColor(EDITOR_DROP_INTO_PROMPT_BORDER);
            if (borderColor) {
                this.dropIntoPromptElement.style.borderWidth = '1px';
                this.dropIntoPromptElement.style.borderStyle = 'solid';
                this.dropIntoPromptElement.style.borderColor = borderColor;
            }
            else {
                this.dropIntoPromptElement.style.borderWidth = '0';
            }
        }
    }
    registerListeners(container) {
        this._register(new DragAndDropObserver(container, {
            onDragOver: e => {
                if (this.enableDropIntoEditor && isDragIntoEditorEvent(e)) {
                    this.dispose();
                    return;
                }
                const isDraggingGroup = this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype);
                const isDraggingEditor = this.editorTransfer.hasData(DraggedEditorIdentifier.prototype);
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!isDraggingEditor && !isDraggingGroup && e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
                // Find out if operation is valid
                let isCopy = true;
                if (isDraggingGroup) {
                    isCopy = this.isCopyOperation(e);
                }
                else if (isDraggingEditor) {
                    const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
                    if (Array.isArray(data) && data.length > 0) {
                        isCopy = this.isCopyOperation(e, data[0].identifier);
                    }
                }
                if (!isCopy) {
                    const sourceGroupView = this.findSourceGroupView();
                    if (sourceGroupView === this.groupView) {
                        if (isDraggingGroup || (isDraggingEditor && sourceGroupView.count < 2)) {
                            this.hideOverlay();
                            return; // do not allow to drop group/editor on itself if this results in an empty group
                        }
                    }
                }
                // Position overlay and conditionally enable or disable
                // editor group splitting support based on setting and
                // keymodifiers used.
                let splitOnDragAndDrop = !!this.editorGroupService.partOptions.splitOnDragAndDrop;
                if (this.isToggleSplitOperation(e)) {
                    splitOnDragAndDrop = !splitOnDragAndDrop;
                }
                this.positionOverlay(e.offsetX, e.offsetY, isDraggingGroup, splitOnDragAndDrop);
                // Make sure to stop any running cleanup scheduler to remove the overlay
                if (this.cleanupOverlayScheduler.isScheduled()) {
                    this.cleanupOverlayScheduler.cancel();
                }
            },
            onDragLeave: e => this.dispose(),
            onDragEnd: e => this.dispose(),
            onDrop: e => {
                EventHelper.stop(e, true);
                // Dispose overlay
                this.dispose();
                // Handle drop if we have a valid operation
                if (this.currentDropOperation) {
                    this.handleDrop(e, this.currentDropOperation.splitDirection);
                }
            }
        }));
        this._register(addDisposableListener(container, EventType.MOUSE_OVER, () => {
            // Under some circumstances we have seen reports where the drop overlay is not being
            // cleaned up and as such the editor area remains under the overlay so that you cannot
            // type into the editor anymore. This seems related to using VMs and DND via host and
            // guest OS, though some users also saw it without VMs.
            // To protect against this issue we always destroy the overlay as soon as we detect a
            // mouse event over it. The delay is used to guarantee we are not interfering with the
            // actual DROP event that can also trigger a mouse over event.
            if (!this.cleanupOverlayScheduler.isScheduled()) {
                this.cleanupOverlayScheduler.schedule();
            }
        }));
    }
    isDropIntoActiveEditorEnabled() {
        return !!this.groupView.activeEditor?.hasCapability(128 /* EditorInputCapabilities.CanDropIntoEditor */);
    }
    findSourceGroupView() {
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                return this.editorGroupService.getGroup(data[0].identifier);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                return this.editorGroupService.getGroup(data[0].identifier.groupId);
            }
        }
        return undefined;
    }
    async handleDrop(event, splitDirection) {
        // Determine target group
        const ensureTargetGroup = () => {
            let targetGroup;
            if (typeof splitDirection === 'number') {
                targetGroup = this.editorGroupService.addGroup(this.groupView, splitDirection);
            }
            else {
                targetGroup = this.groupView;
            }
            return targetGroup;
        };
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorGroupService.getGroup(data[0].identifier);
                if (sourceGroup) {
                    if (typeof splitDirection !== 'number' && sourceGroup === this.groupView) {
                        return;
                    }
                    // Split to new group
                    let targetGroup;
                    if (typeof splitDirection === 'number') {
                        if (this.isCopyOperation(event)) {
                            targetGroup = this.editorGroupService.copyGroup(sourceGroup, this.groupView, splitDirection);
                        }
                        else {
                            targetGroup = this.editorGroupService.moveGroup(sourceGroup, this.groupView, splitDirection);
                        }
                    }
                    // Merge into existing group
                    else {
                        let mergeGroupOptions = undefined;
                        if (this.isCopyOperation(event)) {
                            mergeGroupOptions = { mode: 0 /* MergeGroupMode.COPY_EDITORS */ };
                        }
                        this.editorGroupService.mergeGroup(sourceGroup, this.groupView, mergeGroupOptions);
                    }
                    if (targetGroup) {
                        this.editorGroupService.activateGroup(targetGroup);
                    }
                }
                this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const draggedEditors = data;
                const firstDraggedEditor = data[0].identifier;
                const sourceGroup = this.editorGroupService.getGroup(firstDraggedEditor.groupId);
                if (sourceGroup) {
                    const copyEditor = this.isCopyOperation(event, firstDraggedEditor);
                    let targetGroup = undefined;
                    // Optimization: if we move the last editor of an editor group
                    // and we are configured to close empty editor groups, we can
                    // rather move the entire editor group according to the direction
                    if (this.editorGroupService.partOptions.closeEmptyGroups && sourceGroup.count === 1 && typeof splitDirection === 'number' && !copyEditor) {
                        targetGroup = this.editorGroupService.moveGroup(sourceGroup, this.groupView, splitDirection);
                    }
                    // In any other case do a normal move/copy operation
                    else {
                        targetGroup = ensureTargetGroup();
                        if (sourceGroup === targetGroup) {
                            return;
                        }
                        const editorsWithOptions = prepareMoveCopyEditors(this.groupView, draggedEditors.map(editor => editor.identifier.editor));
                        if (!copyEditor) {
                            sourceGroup.moveEditors(editorsWithOptions, targetGroup);
                        }
                        else {
                            sourceGroup.copyEditors(editorsWithOptions, targetGroup);
                        }
                    }
                    // Ensure target has focus
                    targetGroup.focus();
                }
                this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
            }
        }
        // Check for tree items
        else if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const editors = [];
                for (const id of data) {
                    const dataTransferItem = await this.treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (dataTransferItem) {
                        const treeDropData = await extractTreeDropData(dataTransferItem);
                        editors.push(...treeDropData.map(editor => ({ ...editor, options: { ...editor.options, pinned: true } })));
                    }
                }
                if (editors.length) {
                    this.editorService.openEditors(editors, ensureTargetGroup(), { validateTrust: true });
                }
            }
            this.treeItemsTransfer.clearData(DraggedTreeItemsIdentifier.prototype);
        }
        // Check for URI transfer
        else {
            const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace()) });
            dropHandler.handleDrop(event, getWindow(this.groupView.element), () => ensureTargetGroup(), targetGroup => targetGroup?.focus());
        }
    }
    isCopyOperation(e, draggedEditor) {
        if (draggedEditor?.editor.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            return false; // Singleton editors cannot be split
        }
        return (e.ctrlKey && !isMacintosh) || (e.altKey && isMacintosh);
    }
    isToggleSplitOperation(e) {
        return (e.altKey && !isMacintosh) || (e.shiftKey && isMacintosh);
    }
    positionOverlay(mousePosX, mousePosY, isDraggingGroup, enableSplitting) {
        const preferSplitVertically = this.editorGroupService.partOptions.openSideBySideDirection === 'right';
        const editorControlWidth = this.groupView.element.clientWidth;
        const editorControlHeight = this.groupView.element.clientHeight - this.getOverlayOffsetHeight();
        let edgeWidthThresholdFactor;
        let edgeHeightThresholdFactor;
        if (enableSplitting) {
            if (isDraggingGroup) {
                edgeWidthThresholdFactor = preferSplitVertically ? 0.3 : 0.1; // give larger threshold when dragging group depending on preferred split direction
            }
            else {
                edgeWidthThresholdFactor = 0.1; // 10% threshold to split if dragging editors
            }
            if (isDraggingGroup) {
                edgeHeightThresholdFactor = preferSplitVertically ? 0.1 : 0.3; // give larger threshold when dragging group depending on preferred split direction
            }
            else {
                edgeHeightThresholdFactor = 0.1; // 10% threshold to split if dragging editors
            }
        }
        else {
            edgeWidthThresholdFactor = 0;
            edgeHeightThresholdFactor = 0;
        }
        const edgeWidthThreshold = editorControlWidth * edgeWidthThresholdFactor;
        const edgeHeightThreshold = editorControlHeight * edgeHeightThresholdFactor;
        const splitWidthThreshold = editorControlWidth / 3; // offer to split left/right at 33%
        const splitHeightThreshold = editorControlHeight / 3; // offer to split up/down at 33%
        // No split if mouse is above certain threshold in the center of the view
        let splitDirection;
        if (mousePosX > edgeWidthThreshold && mousePosX < editorControlWidth - edgeWidthThreshold &&
            mousePosY > edgeHeightThreshold && mousePosY < editorControlHeight - edgeHeightThreshold) {
            splitDirection = undefined;
        }
        // Offer to split otherwise
        else {
            // User prefers to split vertically: offer a larger hitzone
            // for this direction like so:
            // ----------------------------------------------
            // |		|		SPLIT UP		|			|
            // | SPLIT 	|-----------------------|	SPLIT	|
            // |		|		  MERGE			|			|
            // | LEFT	|-----------------------|	RIGHT	|
            // |		|		SPLIT DOWN		|			|
            // ----------------------------------------------
            if (preferSplitVertically) {
                if (mousePosX < splitWidthThreshold) {
                    splitDirection = 2 /* GroupDirection.LEFT */;
                }
                else if (mousePosX > splitWidthThreshold * 2) {
                    splitDirection = 3 /* GroupDirection.RIGHT */;
                }
                else if (mousePosY < editorControlHeight / 2) {
                    splitDirection = 0 /* GroupDirection.UP */;
                }
                else {
                    splitDirection = 1 /* GroupDirection.DOWN */;
                }
            }
            // User prefers to split horizontally: offer a larger hitzone
            // for this direction like so:
            // ----------------------------------------------
            // |				SPLIT UP					|
            // |--------------------------------------------|
            // |  SPLIT LEFT  |	   MERGE	|  SPLIT RIGHT  |
            // |--------------------------------------------|
            // |				SPLIT DOWN					|
            // ----------------------------------------------
            else {
                if (mousePosY < splitHeightThreshold) {
                    splitDirection = 0 /* GroupDirection.UP */;
                }
                else if (mousePosY > splitHeightThreshold * 2) {
                    splitDirection = 1 /* GroupDirection.DOWN */;
                }
                else if (mousePosX < editorControlWidth / 2) {
                    splitDirection = 2 /* GroupDirection.LEFT */;
                }
                else {
                    splitDirection = 3 /* GroupDirection.RIGHT */;
                }
            }
        }
        // Draw overlay based on split direction
        switch (splitDirection) {
            case 0 /* GroupDirection.UP */:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '50%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 1 /* GroupDirection.DOWN */:
                this.doPositionOverlay({ top: '50%', left: '0', width: '100%', height: '50%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 2 /* GroupDirection.LEFT */:
                this.doPositionOverlay({ top: '0', left: '0', width: '50%', height: '100%' });
                this.toggleDropIntoPrompt(false);
                break;
            case 3 /* GroupDirection.RIGHT */:
                this.doPositionOverlay({ top: '0', left: '50%', width: '50%', height: '100%' });
                this.toggleDropIntoPrompt(false);
                break;
            default:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '100%' });
                this.toggleDropIntoPrompt(true);
        }
        // Make sure the overlay is visible now
        const overlay = assertReturnsDefined(this.overlay);
        overlay.style.opacity = '1';
        // Enable transition after a timeout to prevent initial animation
        setTimeout(() => overlay.classList.add('overlay-move-transition'), 0);
        // Remember as current split direction
        this.currentDropOperation = { splitDirection };
    }
    doPositionOverlay(options) {
        const [container, overlay] = assertReturnsAllDefined(this.container, this.overlay);
        // Container
        const offsetHeight = this.getOverlayOffsetHeight();
        if (offsetHeight) {
            container.style.height = `calc(100% - ${offsetHeight}px)`;
        }
        else {
            container.style.height = '100%';
        }
        // Overlay
        overlay.style.top = options.top;
        overlay.style.left = options.left;
        overlay.style.width = options.width;
        overlay.style.height = options.height;
    }
    getOverlayOffsetHeight() {
        // With tabs and opened editors: use the area below tabs as drop target
        if (!this.groupView.isEmpty && this.editorGroupService.partOptions.showTabs === 'multiple') {
            return this.groupView.titleHeight.offset;
        }
        // Without tabs or empty group: use entire editor area as drop target
        return 0;
    }
    hideOverlay() {
        const overlay = assertReturnsDefined(this.overlay);
        // Reset overlay
        this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '100%' });
        overlay.style.opacity = '0';
        overlay.classList.remove('overlay-move-transition');
        // Reset current operation
        this.currentDropOperation = undefined;
    }
    toggleDropIntoPrompt(showing) {
        if (!this.dropIntoPromptElement) {
            return;
        }
        this.dropIntoPromptElement.style.opacity = showing ? '1' : '0';
    }
    contains(element) {
        return element === this.container || element === this.overlay;
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
};
DropOverlay = DropOverlay_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, IEditorGroupsService),
    __param(6, ITreeViewsDnDService),
    __param(7, IWorkspaceContextService)
], DropOverlay);
let EditorDropTarget = class EditorDropTarget extends Themable {
    constructor(container, delegate, editorGroupService, themeService, configurationService, instantiationService) {
        super(themeService);
        this.container = container;
        this.delegate = delegate;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.counter = 0;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.registerListeners();
    }
    get overlay() {
        if (this._overlay && !this._overlay.disposed) {
            return this._overlay;
        }
        return undefined;
    }
    registerListeners() {
        this._register(addDisposableListener(this.container, EventType.DRAG_ENTER, e => this.onDragEnter(e)));
        this._register(addDisposableListener(this.container, EventType.DRAG_LEAVE, () => this.onDragLeave()));
        for (const target of [this.container, getWindow(this.container)]) {
            this._register(addDisposableListener(target, EventType.DRAG_END, () => this.onDragEnd()));
        }
    }
    onDragEnter(event) {
        if (isDropIntoEditorEnabledGlobally(this.configurationService) && isDragIntoEditorEvent(event)) {
            return;
        }
        this.counter++;
        // Validate transfer
        if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype) &&
            !this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype) &&
            event.dataTransfer) {
            const dndContributions = Registry.as(DragAndDropExtensions.DragAndDropContribution).getAll();
            const dndContributionKeys = Array.from(dndContributions).map(e => e.dataFormatKey);
            if (!containsDragType(event, DataTransfers.FILES, CodeDataTransfers.FILES, DataTransfers.RESOURCES, CodeDataTransfers.EDITORS, ...dndContributionKeys)) { // see https://github.com/microsoft/vscode/issues/25789
                event.dataTransfer.dropEffect = 'none';
                return; // unsupported transfer
            }
        }
        // Signal DND start
        this.updateContainer(true);
        const target = event.target;
        if (target) {
            // Somehow we managed to move the mouse quickly out of the current overlay, so destroy it
            if (this.overlay && !this.overlay.contains(target)) {
                this.disposeOverlay();
            }
            // Create overlay over target
            if (!this.overlay) {
                const targetGroupView = this.findTargetGroupView(target);
                if (targetGroupView) {
                    this._overlay = this.instantiationService.createInstance(DropOverlay, targetGroupView);
                }
            }
        }
    }
    onDragLeave() {
        this.counter--;
        if (this.counter === 0) {
            this.updateContainer(false);
        }
    }
    onDragEnd() {
        this.counter = 0;
        this.updateContainer(false);
        this.disposeOverlay();
    }
    findTargetGroupView(child) {
        const groups = this.editorGroupService.groups;
        return groups.find(groupView => isAncestor(child, groupView.element) || this.delegate.containsGroup?.(groupView));
    }
    updateContainer(isDraggedOver) {
        this.container.classList.toggle('dragged-over', isDraggedOver);
    }
    dispose() {
        super.dispose();
        this.disposeOverlay();
    }
    disposeOverlay() {
        if (this.overlay) {
            this.overlay.dispose();
            this._overlay = undefined;
        }
    }
};
EditorDropTarget = __decorate([
    __param(2, IEditorGroupsService),
    __param(3, IThemeService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService)
], EditorDropTarget);
export { EditorDropTarget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRHJvcFRhcmdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckRyb3BUYXJnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0ksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLFFB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