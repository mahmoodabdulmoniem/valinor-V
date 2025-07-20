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
var EditorPart_1;
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Part } from '../../part.js';
import { Dimension, $, EventHelper, addDisposableGenericMouseDownListener, getWindow, isAncestorOfActiveElement, getActiveElement, isHTMLElement } from '../../../../base/browser/dom.js';
import { Event, Emitter, Relay, PauseableEmitter } from '../../../../base/common/event.js';
import { contrastBorder, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { orthogonal, SerializableGrid, Sizing, isGridBranchNode, createSerializedGrid } from '../../../../base/browser/ui/grid/grid.js';
import { EDITOR_GROUP_BORDER, EDITOR_PANE_BACKGROUND } from '../../../common/theme.js';
import { distinct, coalesce } from '../../../../base/common/arrays.js';
import { getEditorPartOptions, impactsEditorPartOptions } from './editor.js';
import { EditorGroupView } from './editorGroupView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { dispose, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isSerializedEditorGroupModel } from '../../../common/editor/editorGroupModel.js';
import { EditorDropTarget } from './editorDropTarget.js';
import { Color } from '../../../../base/common/color.js';
import { CenteredViewLayout } from '../../../../base/browser/ui/centered/centeredViewLayout.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { assertType } from '../../../../base/common/types.js';
import { CompositeDragAndDropObserver } from '../../dnd.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { findGroup } from '../../../services/editor/common/editorGroupFinder.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { EditorPartMaximizedEditorGroupContext, EditorPartMultipleEditorGroupsContext, IsAuxiliaryWindowContext } from '../../../common/contextkeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
class GridWidgetView {
    constructor() {
        this.element = $('.grid-view-container');
        this._onDidChange = new Relay();
        this.onDidChange = this._onDidChange.event;
    }
    get minimumWidth() { return this.gridWidget ? this.gridWidget.minimumWidth : 0; }
    get maximumWidth() { return this.gridWidget ? this.gridWidget.maximumWidth : Number.POSITIVE_INFINITY; }
    get minimumHeight() { return this.gridWidget ? this.gridWidget.minimumHeight : 0; }
    get maximumHeight() { return this.gridWidget ? this.gridWidget.maximumHeight : Number.POSITIVE_INFINITY; }
    get gridWidget() {
        return this._gridWidget;
    }
    set gridWidget(grid) {
        this.element.innerText = '';
        if (grid) {
            this.element.appendChild(grid.element);
            this._onDidChange.input = grid.onDidChange;
        }
        else {
            this._onDidChange.input = Event.None;
        }
        this._gridWidget = grid;
    }
    layout(width, height, top, left) {
        this.gridWidget?.layout(width, height, top, left);
    }
    dispose() {
        this._onDidChange.dispose();
    }
}
let EditorPart = class EditorPart extends Part {
    static { EditorPart_1 = this; }
    static { this.EDITOR_PART_UI_STATE_STORAGE_KEY = 'editorpart.state'; }
    static { this.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY = 'editorpart.centeredview'; }
    constructor(editorPartsView, id, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.editorPartsView = editorPartsView;
        this.groupsLabel = groupsLabel;
        this.windowId = windowId;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.contextKeyService = contextKeyService;
        //#region Events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidLayout = this._register(new Emitter());
        this.onDidLayout = this._onDidLayout.event;
        this._onDidChangeActiveGroup = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidChangeActiveGroup.event;
        this._onDidChangeGroupIndex = this._register(new Emitter());
        this.onDidChangeGroupIndex = this._onDidChangeGroupIndex.event;
        this._onDidChangeGroupLabel = this._register(new Emitter());
        this.onDidChangeGroupLabel = this._onDidChangeGroupLabel.event;
        this._onDidChangeGroupLocked = this._register(new Emitter());
        this.onDidChangeGroupLocked = this._onDidChangeGroupLocked.event;
        this._onDidChangeGroupMaximized = this._register(new Emitter());
        this.onDidChangeGroupMaximized = this._onDidChangeGroupMaximized.event;
        this._onDidActivateGroup = this._register(new Emitter());
        this.onDidActivateGroup = this._onDidActivateGroup.event;
        this._onDidAddGroup = this._register(new PauseableEmitter());
        this.onDidAddGroup = this._onDidAddGroup.event;
        this._onDidRemoveGroup = this._register(new PauseableEmitter());
        this.onDidRemoveGroup = this._onDidRemoveGroup.event;
        this._onDidMoveGroup = this._register(new Emitter());
        this.onDidMoveGroup = this._onDidMoveGroup.event;
        this.onDidSetGridWidget = this._register(new Emitter());
        this._onDidChangeSizeConstraints = this._register(new Relay());
        this.onDidChangeSizeConstraints = Event.any(this.onDidSetGridWidget.event, this._onDidChangeSizeConstraints.event);
        this._onDidScroll = this._register(new Relay());
        this.onDidScroll = Event.any(this.onDidSetGridWidget.event, this._onDidScroll.event);
        this._onDidChangeEditorPartOptions = this._register(new Emitter());
        this.onDidChangeEditorPartOptions = this._onDidChangeEditorPartOptions.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        //#endregion
        this.workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        this.profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.groupViews = new Map();
        this.mostRecentActiveGroups = [];
        this.container = $('.content');
        this.gridWidgetDisposables = this._register(new DisposableStore());
        this.gridWidgetView = this._register(new GridWidgetView());
        this.enforcedPartOptions = [];
        this.top = 0;
        this.left = 0;
        this.sideGroup = {
            openEditor: (editor, options) => {
                const [group] = this.scopedInstantiationService.invokeFunction(accessor => findGroup(accessor, { editor, options }, SIDE_GROUP));
                return group.openEditor(editor, options);
            }
        };
        this._isReady = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._willRestoreState = false;
        this.priority = 2 /* LayoutPriority.High */;
        this.scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this._partOptions = getEditorPartOptions(this.configurationService, this.themeService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this._register(this.themeService.onDidFileIconThemeChange(() => this.handleChangedPartOptions()));
        this._register(this.onDidChangeMementoValue(1 /* StorageScope.WORKSPACE */, this._store)(e => this.onDidChangeMementoState(e)));
    }
    onConfigurationUpdated(event) {
        if (impactsEditorPartOptions(event)) {
            this.handleChangedPartOptions();
        }
    }
    handleChangedPartOptions() {
        const oldPartOptions = this._partOptions;
        const newPartOptions = getEditorPartOptions(this.configurationService, this.themeService);
        for (const enforcedPartOptions of this.enforcedPartOptions) {
            Object.assign(newPartOptions, enforcedPartOptions); // check for overrides
        }
        this._partOptions = newPartOptions;
        this._onDidChangeEditorPartOptions.fire({ oldPartOptions, newPartOptions });
    }
    get partOptions() { return this._partOptions; }
    enforcePartOptions(options) {
        this.enforcedPartOptions.push(options);
        this.handleChangedPartOptions();
        return toDisposable(() => {
            this.enforcedPartOptions.splice(this.enforcedPartOptions.indexOf(options), 1);
            this.handleChangedPartOptions();
        });
    }
    get contentDimension() { return this._contentDimension; }
    get activeGroup() {
        return this._activeGroup;
    }
    get groups() {
        return Array.from(this.groupViews.values());
    }
    get count() {
        return this.groupViews.size;
    }
    get orientation() {
        return (this.gridWidget && this.gridWidget.orientation === 0 /* Orientation.VERTICAL */) ? 1 /* GroupOrientation.VERTICAL */ : 0 /* GroupOrientation.HORIZONTAL */;
    }
    get isReady() { return this._isReady; }
    get hasRestorableState() {
        return !!this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    get willRestoreState() { return this._willRestoreState; }
    getGroups(order = 0 /* GroupsOrder.CREATION_TIME */) {
        switch (order) {
            case 0 /* GroupsOrder.CREATION_TIME */:
                return this.groups;
            case 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */: {
                const mostRecentActive = coalesce(this.mostRecentActiveGroups.map(groupId => this.getGroup(groupId)));
                // there can be groups that got never active, even though they exist. in this case
                // make sure to just append them at the end so that all groups are returned properly
                return distinct([...mostRecentActive, ...this.groups]);
            }
            case 2 /* GroupsOrder.GRID_APPEARANCE */: {
                const views = [];
                if (this.gridWidget) {
                    this.fillGridNodes(views, this.gridWidget.getViews());
                }
                return views;
            }
        }
    }
    fillGridNodes(target, node) {
        if (isGridBranchNode(node)) {
            node.children.forEach(child => this.fillGridNodes(target, child));
        }
        else {
            target.push(node.view);
        }
    }
    hasGroup(identifier) {
        return this.groupViews.has(identifier);
    }
    getGroup(identifier) {
        return this.groupViews.get(identifier);
    }
    findGroup(scope, source = this.activeGroup, wrap) {
        // by direction
        if (typeof scope.direction === 'number') {
            return this.doFindGroupByDirection(scope.direction, source, wrap);
        }
        // by location
        if (typeof scope.location === 'number') {
            return this.doFindGroupByLocation(scope.location, source, wrap);
        }
        throw new Error('invalid arguments');
    }
    doFindGroupByDirection(direction, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        // Find neighbours and sort by our MRU list
        const neighbours = this.gridWidget.getNeighborViews(sourceGroupView, this.toGridViewDirection(direction), wrap);
        neighbours.sort(((n1, n2) => this.mostRecentActiveGroups.indexOf(n1.id) - this.mostRecentActiveGroups.indexOf(n2.id)));
        return neighbours[0];
    }
    doFindGroupByLocation(location, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        const groups = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        const index = groups.indexOf(sourceGroupView);
        switch (location) {
            case 0 /* GroupLocation.FIRST */:
                return groups[0];
            case 1 /* GroupLocation.LAST */:
                return groups[groups.length - 1];
            case 2 /* GroupLocation.NEXT */: {
                let nextGroup = groups[index + 1];
                if (!nextGroup && wrap) {
                    nextGroup = this.doFindGroupByLocation(0 /* GroupLocation.FIRST */, source);
                }
                return nextGroup;
            }
            case 3 /* GroupLocation.PREVIOUS */: {
                let previousGroup = groups[index - 1];
                if (!previousGroup && wrap) {
                    previousGroup = this.doFindGroupByLocation(1 /* GroupLocation.LAST */, source);
                }
                return previousGroup;
            }
        }
    }
    activateGroup(group, preserveWindowOrder) {
        const groupView = this.assertGroupView(group);
        this.doSetGroupActive(groupView);
        // Ensure window on top unless disabled
        if (!preserveWindowOrder) {
            this.hostService.moveTop(getWindow(this.element));
        }
        return groupView;
    }
    restoreGroup(group) {
        const groupView = this.assertGroupView(group);
        this.doRestoreGroup(groupView);
        return groupView;
    }
    getSize(group) {
        const groupView = this.assertGroupView(group);
        return this.gridWidget.getViewSize(groupView);
    }
    setSize(group, size) {
        const groupView = this.assertGroupView(group);
        this.gridWidget.resizeView(groupView, size);
    }
    arrangeGroups(arrangement, target = this.activeGroup) {
        if (this.count < 2) {
            return; // require at least 2 groups to show
        }
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const groupView = this.assertGroupView(target);
        switch (arrangement) {
            case 2 /* GroupsArrangement.EVEN */:
                this.gridWidget.distributeViewSizes();
                break;
            case 0 /* GroupsArrangement.MAXIMIZE */:
                if (this.groups.length < 2) {
                    return; // need at least 2 groups to be maximized
                }
                this.gridWidget.maximizeView(groupView);
                groupView.focus();
                break;
            case 1 /* GroupsArrangement.EXPAND */:
                this.gridWidget.expandView(groupView);
                break;
        }
    }
    toggleMaximizeGroup(target = this.activeGroup) {
        if (this.hasMaximizedGroup()) {
            this.unmaximizeGroup();
        }
        else {
            this.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */, target);
        }
    }
    toggleExpandGroup(target = this.activeGroup) {
        if (this.isGroupExpanded(this.activeGroup)) {
            this.arrangeGroups(2 /* GroupsArrangement.EVEN */);
        }
        else {
            this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, target);
        }
    }
    unmaximizeGroup() {
        this.gridWidget.exitMaximizedView();
        this._activeGroup.focus(); // When making views visible the focus can be affected, so restore it
    }
    hasMaximizedGroup() {
        return this.gridWidget.hasMaximizedView();
    }
    isGroupMaximized(targetGroup) {
        return this.gridWidget.isViewMaximized(targetGroup);
    }
    isGroupExpanded(targetGroup) {
        return this.gridWidget.isViewExpanded(targetGroup);
    }
    setGroupOrientation(orientation) {
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const newOrientation = (orientation === 0 /* GroupOrientation.HORIZONTAL */) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        if (this.gridWidget.orientation !== newOrientation) {
            this.gridWidget.orientation = newOrientation;
        }
    }
    applyLayout(layout) {
        const restoreFocus = this.shouldRestoreFocus(this.container);
        // Determine how many groups we need overall
        let layoutGroupsCount = 0;
        function countGroups(groups) {
            for (const group of groups) {
                if (Array.isArray(group.groups)) {
                    countGroups(group.groups);
                }
                else {
                    layoutGroupsCount++;
                }
            }
        }
        countGroups(layout.groups);
        // If we currently have too many groups, merge them into the last one
        let currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        if (layoutGroupsCount < currentGroupViews.length) {
            const lastGroupInLayout = currentGroupViews[layoutGroupsCount - 1];
            currentGroupViews.forEach((group, index) => {
                if (index >= layoutGroupsCount) {
                    this.mergeGroup(group, lastGroupInLayout);
                }
            });
            currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        }
        const activeGroup = this.activeGroup;
        // Prepare grid descriptor to create new grid from
        const gridDescriptor = createSerializedGrid({
            orientation: this.toGridViewOrientation(layout.orientation, this.isTwoDimensionalGrid() ?
                this.gridWidget.orientation : // preserve original orientation for 2-dimensional grids
                orthogonal(this.gridWidget.orientation) // otherwise flip (fix https://github.com/microsoft/vscode/issues/52975)
            ),
            groups: layout.groups
        });
        // Recreate gridwidget with descriptor
        this.doApplyGridState(gridDescriptor, activeGroup.id, currentGroupViews);
        // Restore focus as needed
        if (restoreFocus) {
            this._activeGroup.focus();
        }
    }
    getLayout() {
        // Example return value:
        // { orientation: 0, groups: [ { groups: [ { size: 0.4 }, { size: 0.6 } ], size: 0.5 }, { groups: [ {}, {} ], size: 0.5 } ] }
        const serializedGrid = this.gridWidget.serialize();
        const orientation = serializedGrid.orientation === 1 /* Orientation.HORIZONTAL */ ? 0 /* GroupOrientation.HORIZONTAL */ : 1 /* GroupOrientation.VERTICAL */;
        const root = this.serializedNodeToGroupLayoutArgument(serializedGrid.root);
        return {
            orientation,
            groups: root.groups
        };
    }
    serializedNodeToGroupLayoutArgument(serializedNode) {
        if (serializedNode.type === 'branch') {
            return {
                size: serializedNode.size,
                groups: serializedNode.data.map(node => this.serializedNodeToGroupLayoutArgument(node))
            };
        }
        return { size: serializedNode.size };
    }
    shouldRestoreFocus(target) {
        if (!target) {
            return false;
        }
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestorOfActiveElement(target);
    }
    isTwoDimensionalGrid() {
        const views = this.gridWidget.getViews();
        if (isGridBranchNode(views)) {
            // the grid is 2-dimensional if any children
            // of the grid is a branch node
            return views.children.some(child => isGridBranchNode(child));
        }
        return false;
    }
    addGroup(location, direction, groupToCopy) {
        const locationView = this.assertGroupView(location);
        let newGroupView;
        // Same groups view: add to grid widget directly
        if (locationView.groupsView === this) {
            const restoreFocus = this.shouldRestoreFocus(locationView.element);
            const shouldExpand = this.groupViews.size > 1 && this.isGroupExpanded(locationView);
            newGroupView = this.doCreateGroupView(groupToCopy);
            // Add to grid widget
            this.gridWidget.addView(newGroupView, this.getSplitSizingStyle(), locationView, this.toGridViewDirection(direction));
            // Update container
            this.updateContainer();
            // Event
            this._onDidAddGroup.fire(newGroupView);
            // Notify group index change given a new group was added
            this.notifyGroupIndexChange();
            // Expand new group, if the reference view was previously expanded
            if (shouldExpand) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, newGroupView);
            }
            // Restore focus if we had it previously after completing the grid
            // operation. That operation might cause reparenting of grid views
            // which moves focus to the <body> element otherwise.
            if (restoreFocus) {
                locationView.focus();
            }
        }
        // Different group view: add to grid widget of that group
        else {
            newGroupView = locationView.groupsView.addGroup(locationView, direction, groupToCopy);
        }
        return newGroupView;
    }
    getSplitSizingStyle() {
        switch (this._partOptions.splitSizing) {
            case 'distribute':
                return Sizing.Distribute;
            case 'split':
                return Sizing.Split;
            default:
                return Sizing.Auto;
        }
    }
    doCreateGroupView(from, options) {
        // Create group view
        let groupView;
        if (from instanceof EditorGroupView) {
            groupView = EditorGroupView.createCopy(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else if (isSerializedEditorGroupModel(from)) {
            groupView = EditorGroupView.createFromSerialized(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else {
            groupView = EditorGroupView.createNew(this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        // Keep in map
        this.groupViews.set(groupView.id, groupView);
        // Track focus
        const groupDisposables = new DisposableStore();
        groupDisposables.add(groupView.onDidFocus(() => {
            this.doSetGroupActive(groupView);
            this._onDidFocus.fire();
        }));
        // Track group changes
        groupDisposables.add(groupView.onDidModelChange(e => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    this._onDidChangeGroupLocked.fire(groupView);
                    break;
                case 1 /* GroupModelChangeKind.GROUP_INDEX */:
                    this._onDidChangeGroupIndex.fire(groupView);
                    break;
                case 2 /* GroupModelChangeKind.GROUP_LABEL */:
                    this._onDidChangeGroupLabel.fire(groupView);
                    break;
            }
        }));
        // Track active editor change after it occurred
        groupDisposables.add(groupView.onDidActiveEditorChange(() => {
            this.updateContainer();
        }));
        // Track dispose
        Event.once(groupView.onWillDispose)(() => {
            dispose(groupDisposables);
            this.groupViews.delete(groupView.id);
            this.doUpdateMostRecentActive(groupView);
        });
        return groupView;
    }
    doSetGroupActive(group) {
        if (this._activeGroup !== group) {
            const previousActiveGroup = this._activeGroup;
            this._activeGroup = group;
            // Update list of most recently active groups
            this.doUpdateMostRecentActive(group, true);
            // Mark previous one as inactive
            if (previousActiveGroup && !previousActiveGroup.disposed) {
                previousActiveGroup.setActive(false);
            }
            // Mark group as new active
            group.setActive(true);
            // Expand the group if it is currently minimized
            this.doRestoreGroup(group);
            // Event
            this._onDidChangeActiveGroup.fire(group);
        }
        // Always fire the event that a group has been activated
        // even if its the same group that is already active to
        // signal the intent even when nothing has changed.
        this._onDidActivateGroup.fire(group);
    }
    doRestoreGroup(group) {
        if (!this.gridWidget) {
            return; // method is called as part of state restore very early
        }
        try {
            if (this.hasMaximizedGroup() && !this.isGroupMaximized(group)) {
                this.unmaximizeGroup();
            }
            const viewSize = this.gridWidget.getViewSize(group);
            if (viewSize.width === group.minimumWidth || viewSize.height === group.minimumHeight) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, group);
            }
        }
        catch (error) {
            // ignore: method might be called too early before view is known to grid
        }
    }
    doUpdateMostRecentActive(group, makeMostRecentlyActive) {
        const index = this.mostRecentActiveGroups.indexOf(group.id);
        // Remove from MRU list
        if (index !== -1) {
            this.mostRecentActiveGroups.splice(index, 1);
        }
        // Add to front as needed
        if (makeMostRecentlyActive) {
            this.mostRecentActiveGroups.unshift(group.id);
        }
    }
    toGridViewDirection(direction) {
        switch (direction) {
            case 0 /* GroupDirection.UP */: return 0 /* Direction.Up */;
            case 1 /* GroupDirection.DOWN */: return 1 /* Direction.Down */;
            case 2 /* GroupDirection.LEFT */: return 2 /* Direction.Left */;
            case 3 /* GroupDirection.RIGHT */: return 3 /* Direction.Right */;
        }
    }
    toGridViewOrientation(orientation, fallback) {
        if (typeof orientation === 'number') {
            return orientation === 0 /* GroupOrientation.HORIZONTAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        }
        return fallback;
    }
    removeGroup(group, preserveFocus) {
        const groupView = this.assertGroupView(group);
        if (this.count === 1) {
            return; // Cannot remove the last root group
        }
        // Remove empty group
        if (groupView.isEmpty) {
            this.doRemoveEmptyGroup(groupView, preserveFocus);
        }
        // Remove group with editors
        else {
            this.doRemoveGroupWithEditors(groupView);
        }
    }
    doRemoveGroupWithEditors(groupView) {
        const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        let lastActiveGroup;
        if (this._activeGroup === groupView) {
            lastActiveGroup = mostRecentlyActiveGroups[1];
        }
        else {
            lastActiveGroup = mostRecentlyActiveGroups[0];
        }
        // Removing a group with editors should merge these editors into the
        // last active group and then remove this group.
        this.mergeGroup(groupView, lastActiveGroup);
    }
    doRemoveEmptyGroup(groupView, preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group if the removed one was active
        if (this._activeGroup === groupView) {
            const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
            this.doSetGroupActive(nextActiveGroup);
        }
        // Remove from grid widget & dispose
        this.gridWidget.removeView(groupView, this.getSplitSizingStyle());
        groupView.dispose();
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            this._activeGroup.focus();
        }
        // Notify group index change given a group was removed
        this.notifyGroupIndexChange();
        // Update container
        this.updateContainer();
        // Event
        this._onDidRemoveGroup.fire(groupView);
    }
    moveGroup(group, location, direction) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(location);
        if (sourceView.id === targetView.id) {
            throw new Error('Cannot move group into its own');
        }
        const restoreFocus = this.shouldRestoreFocus(sourceView.element);
        let movedView;
        // Same groups view: move via grid widget API
        if (sourceView.groupsView === targetView.groupsView) {
            this.gridWidget.moveView(sourceView, this.getSplitSizingStyle(), targetView, this.toGridViewDirection(direction));
            movedView = sourceView;
        }
        // Different groups view: move via groups view API
        else {
            movedView = targetView.groupsView.addGroup(targetView, direction, sourceView);
            sourceView.closeAllEditors();
            this.removeGroup(sourceView, restoreFocus);
        }
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            movedView.focus();
        }
        // Event
        this._onDidMoveGroup.fire(movedView);
        // Notify group index change given a group was moved
        this.notifyGroupIndexChange();
        return movedView;
    }
    copyGroup(group, location, direction) {
        const groupView = this.assertGroupView(group);
        const locationView = this.assertGroupView(location);
        const restoreFocus = this.shouldRestoreFocus(groupView.element);
        // Copy the group view
        const copiedGroupView = this.addGroup(locationView, direction, groupView);
        // Restore focus if we had it
        if (restoreFocus) {
            copiedGroupView.focus();
        }
        return copiedGroupView;
    }
    mergeGroup(group, target, options) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(target);
        // Collect editors to move/copy
        const editors = [];
        let index = (options && typeof options.index === 'number') ? options.index : targetView.count;
        for (const editor of sourceView.editors) {
            const inactive = !sourceView.isActive(editor) || this._activeGroup !== sourceView;
            let actualIndex;
            if (targetView.contains(editor) &&
                (
                // Do not configure an `index` for editors that are sticky in
                // the target, otherwise there is a chance of losing that state
                // when the editor is moved.
                // See https://github.com/microsoft/vscode/issues/239549
                targetView.isSticky(editor) ||
                    // Do not configure an `index` when we are explicitly instructed
                    options?.preserveExistingIndex)) {
                // leave `index` as `undefined`
            }
            else {
                actualIndex = index;
                index++;
            }
            editors.push({
                editor,
                options: {
                    index: actualIndex,
                    inactive,
                    preserveFocus: inactive
                }
            });
        }
        // Move/Copy editors over into target
        let result = true;
        if (options?.mode === 0 /* MergeGroupMode.COPY_EDITORS */) {
            sourceView.copyEditors(editors, targetView);
        }
        else {
            result = sourceView.moveEditors(editors, targetView);
        }
        // Remove source if the view is now empty and not already removed
        if (sourceView.isEmpty && !sourceView.disposed /* could have been disposed already via workbench.editor.closeEmptyGroups setting */) {
            this.removeGroup(sourceView, true);
        }
        return result;
    }
    mergeAllGroups(target, options) {
        const targetView = this.assertGroupView(target);
        let result = true;
        for (const group of this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group === targetView) {
                continue; // keep target
            }
            const merged = this.mergeGroup(group, targetView, options);
            if (!merged) {
                result = false;
            }
        }
        return result;
    }
    assertGroupView(group) {
        let groupView;
        if (typeof group === 'number') {
            groupView = this.editorPartsView.getGroup(group);
        }
        else {
            groupView = group;
        }
        if (!groupView) {
            throw new Error('Invalid editor group provided!');
        }
        return groupView;
    }
    createEditorDropTarget(container, delegate) {
        assertType(isHTMLElement(container));
        return this.scopedInstantiationService.createInstance(EditorDropTarget, container, delegate);
    }
    //#region Part
    // TODO @sbatten @joao find something better to prevent editor taking over #79897
    get minimumWidth() { return Math.min(this.centeredLayoutWidget.minimumWidth, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).width); }
    get maximumWidth() { return this.centeredLayoutWidget.maximumWidth; }
    get minimumHeight() { return Math.min(this.centeredLayoutWidget.minimumHeight, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).height); }
    get maximumHeight() { return this.centeredLayoutWidget.maximumHeight; }
    get snap() { return this.layoutService.getPanelAlignment() === 'center'; }
    get onDidChange() { return Event.any(this.centeredLayoutWidget.onDidChange, this.onDidSetGridWidget.event); }
    get gridSeparatorBorder() {
        return this.theme.getColor(EDITOR_GROUP_BORDER) || this.theme.getColor(contrastBorder) || Color.transparent;
    }
    updateStyles() {
        this.container.style.backgroundColor = this.getColor(editorBackground) || '';
        const separatorBorderStyle = { separatorBorder: this.gridSeparatorBorder, background: this.theme.getColor(EDITOR_PANE_BACKGROUND) || Color.transparent };
        this.gridWidget.style(separatorBorderStyle);
        this.centeredLayoutWidget.styles(separatorBorderStyle);
    }
    createContentArea(parent, options) {
        // Container
        this.element = parent;
        if (this.windowId !== mainWindow.vscodeWindowId) {
            this.container.classList.add('auxiliary');
        }
        parent.appendChild(this.container);
        // Grid control
        this._willRestoreState = !options || options.restorePreviousState;
        this.doCreateGridControl();
        // Centered layout widget
        this.centeredLayoutWidget = this._register(new CenteredViewLayout(this.container, this.gridWidgetView, this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY], this._partOptions.centeredLayoutFixedWidth));
        this._register(this.onDidChangeEditorPartOptions(e => this.centeredLayoutWidget.setFixedWidth(e.newPartOptions.centeredLayoutFixedWidth ?? false)));
        // Drag & Drop support
        this.setupDragAndDropSupport(parent, this.container);
        // Context keys
        this.handleContextKeys();
        // Signal ready
        this.whenReadyPromise.complete();
        this._isReady = true;
        // Signal restored
        Promises.settled(this.groups.map(group => group.whenRestored)).finally(() => {
            this.whenRestoredPromise.complete();
        });
        return this.container;
    }
    handleContextKeys() {
        const isAuxiliaryWindowContext = IsAuxiliaryWindowContext.bindTo(this.scopedContextKeyService);
        isAuxiliaryWindowContext.set(this.windowId !== mainWindow.vscodeWindowId);
        const multipleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.bindTo(this.scopedContextKeyService);
        const maximizedEditorGroupContext = EditorPartMaximizedEditorGroupContext.bindTo(this.scopedContextKeyService);
        const updateContextKeys = () => {
            const groupCount = this.count;
            if (groupCount > 1) {
                multipleEditorGroupsContext.set(true);
            }
            else {
                multipleEditorGroupsContext.reset();
            }
            if (this.hasMaximizedGroup()) {
                maximizedEditorGroupContext.set(true);
            }
            else {
                maximizedEditorGroupContext.reset();
            }
        };
        updateContextKeys();
        this._register(this.onDidAddGroup(() => updateContextKeys()));
        this._register(this.onDidRemoveGroup(() => updateContextKeys()));
        this._register(this.onDidChangeGroupMaximized(() => updateContextKeys()));
    }
    setupDragAndDropSupport(parent, container) {
        // Editor drop target
        this._register(this.createEditorDropTarget(container, Object.create(null)));
        // No drop in the editor
        const overlay = $('.drop-block-overlay');
        parent.appendChild(overlay);
        // Hide the block if a mouse down event occurs #99065
        this._register(addDisposableGenericMouseDownListener(overlay, () => overlay.classList.remove('visible')));
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(this.element, {
            onDragStart: e => overlay.classList.add('visible'),
            onDragEnd: e => overlay.classList.remove('visible')
        }));
        let horizontalOpenerTimeout;
        let verticalOpenerTimeout;
        let lastOpenHorizontalPosition;
        let lastOpenVerticalPosition;
        const openPartAtPosition = (position) => {
            if (!this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && position === this.layoutService.getPanelPosition()) {
                this.layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            }
            else if (!this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) && position === (this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */ ? 0 /* Position.LEFT */ : 1 /* Position.RIGHT */)) {
                this.layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            }
        };
        const clearAllTimeouts = () => {
            if (horizontalOpenerTimeout) {
                clearTimeout(horizontalOpenerTimeout);
                horizontalOpenerTimeout = undefined;
            }
            if (verticalOpenerTimeout) {
                clearTimeout(verticalOpenerTimeout);
                verticalOpenerTimeout = undefined;
            }
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(overlay, {
            onDragOver: e => {
                EventHelper.stop(e.eventData, true);
                if (e.eventData.dataTransfer) {
                    e.eventData.dataTransfer.dropEffect = 'none';
                }
                const boundingRect = overlay.getBoundingClientRect();
                let openHorizontalPosition = undefined;
                let openVerticalPosition = undefined;
                const proximity = 100;
                if (e.eventData.clientX < boundingRect.left + proximity) {
                    openHorizontalPosition = 0 /* Position.LEFT */;
                }
                if (e.eventData.clientX > boundingRect.right - proximity) {
                    openHorizontalPosition = 1 /* Position.RIGHT */;
                }
                if (e.eventData.clientY > boundingRect.bottom - proximity) {
                    openVerticalPosition = 2 /* Position.BOTTOM */;
                }
                if (e.eventData.clientY < boundingRect.top + proximity) {
                    openVerticalPosition = 3 /* Position.TOP */;
                }
                if (horizontalOpenerTimeout && openHorizontalPosition !== lastOpenHorizontalPosition) {
                    clearTimeout(horizontalOpenerTimeout);
                    horizontalOpenerTimeout = undefined;
                }
                if (verticalOpenerTimeout && openVerticalPosition !== lastOpenVerticalPosition) {
                    clearTimeout(verticalOpenerTimeout);
                    verticalOpenerTimeout = undefined;
                }
                if (!horizontalOpenerTimeout && openHorizontalPosition !== undefined) {
                    lastOpenHorizontalPosition = openHorizontalPosition;
                    horizontalOpenerTimeout = setTimeout(() => openPartAtPosition(openHorizontalPosition), 200);
                }
                if (!verticalOpenerTimeout && openVerticalPosition !== undefined) {
                    lastOpenVerticalPosition = openVerticalPosition;
                    verticalOpenerTimeout = setTimeout(() => openPartAtPosition(openVerticalPosition), 200);
                }
            },
            onDragLeave: () => clearAllTimeouts(),
            onDragEnd: () => clearAllTimeouts(),
            onDrop: () => clearAllTimeouts()
        }));
    }
    centerLayout(active) {
        this.centeredLayoutWidget.activate(active);
    }
    isLayoutCentered() {
        if (this.centeredLayoutWidget) {
            return this.centeredLayoutWidget.isActive();
        }
        return false;
    }
    doCreateGridControl() {
        // Grid Widget (with previous UI state)
        let restoreError = false;
        if (this._willRestoreState) {
            restoreError = !this.doCreateGridControlWithPreviousState();
        }
        // Grid Widget (no previous UI state or failed to restore)
        if (!this.gridWidget || restoreError) {
            const initialGroup = this.doCreateGroupView();
            this.doSetGridWidget(new SerializableGrid(initialGroup));
            // Ensure a group is active
            this.doSetGroupActive(initialGroup);
        }
        // Update container
        this.updateContainer();
        // Notify group index change we created the entire grid
        this.notifyGroupIndexChange();
    }
    doCreateGridControlWithPreviousState() {
        const state = this.loadState();
        if (state?.serializedGrid) {
            try {
                // MRU
                this.mostRecentActiveGroups = state.mostRecentActiveGroups;
                // Grid Widget
                this.doCreateGridControlWithState(state.serializedGrid, state.activeGroup);
            }
            catch (error) {
                // Log error
                onUnexpectedError(new Error(`Error restoring editor grid widget: ${error} (with state: ${JSON.stringify(state)})`));
                // Clear any state we have from the failing restore
                this.disposeGroups();
                return false; // failure
            }
        }
        return true; // success
    }
    doCreateGridControlWithState(serializedGrid, activeGroupId, editorGroupViewsToReuse, options) {
        // Determine group views to reuse if any
        let reuseGroupViews;
        if (editorGroupViewsToReuse) {
            reuseGroupViews = editorGroupViewsToReuse.slice(0); // do not modify original array
        }
        else {
            reuseGroupViews = [];
        }
        // Create new
        const groupViews = [];
        const gridWidget = SerializableGrid.deserialize(serializedGrid, {
            fromJSON: (serializedEditorGroup) => {
                let groupView;
                if (reuseGroupViews.length > 0) {
                    groupView = reuseGroupViews.shift();
                }
                else {
                    groupView = this.doCreateGroupView(serializedEditorGroup, options);
                }
                groupViews.push(groupView);
                if (groupView.id === activeGroupId) {
                    this.doSetGroupActive(groupView);
                }
                return groupView;
            }
        }, { styles: { separatorBorder: this.gridSeparatorBorder } });
        // If the active group was not found when restoring the grid
        // make sure to make at least one group active. We always need
        // an active group.
        if (!this._activeGroup) {
            this.doSetGroupActive(groupViews[0]);
        }
        // Validate MRU group views matches grid widget state
        if (this.mostRecentActiveGroups.some(groupId => !this.getGroup(groupId))) {
            this.mostRecentActiveGroups = groupViews.map(group => group.id);
        }
        // Set it
        this.doSetGridWidget(gridWidget);
    }
    doSetGridWidget(gridWidget) {
        let boundarySashes = {};
        if (this.gridWidget) {
            boundarySashes = this.gridWidget.boundarySashes;
            this.gridWidget.dispose();
        }
        this.gridWidget = gridWidget;
        this.gridWidget.boundarySashes = boundarySashes;
        this.gridWidgetView.gridWidget = gridWidget;
        this._onDidChangeSizeConstraints.input = gridWidget.onDidChange;
        this._onDidScroll.input = gridWidget.onDidScroll;
        this.gridWidgetDisposables.clear();
        this.gridWidgetDisposables.add(gridWidget.onDidChangeViewMaximized(maximized => this._onDidChangeGroupMaximized.fire(maximized)));
        this.onDidSetGridWidget.fire(undefined);
    }
    updateContainer() {
        this.container.classList.toggle('empty', this.isEmpty);
    }
    notifyGroupIndexChange() {
        this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).forEach((group, index) => group.notifyIndexChanged(index));
    }
    notifyGroupsLabelChange(newLabel) {
        for (const group of this.groups) {
            group.notifyLabelChanged(newLabel);
        }
    }
    get isEmpty() {
        return this.count === 1 && this._activeGroup.isEmpty;
    }
    setBoundarySashes(sashes) {
        this.gridWidget.boundarySashes = sashes;
        this.centeredLayoutWidget.boundarySashes = sashes;
    }
    layout(width, height, top, left) {
        this.top = top;
        this.left = left;
        // Layout contents
        const contentAreaSize = super.layoutContents(width, height).contentSize;
        // Layout editor container
        this.doLayout(Dimension.lift(contentAreaSize), top, left);
    }
    doLayout(dimension, top = this.top, left = this.left) {
        this._contentDimension = dimension;
        // Layout Grid
        this.centeredLayoutWidget.layout(this._contentDimension.width, this._contentDimension.height, top, left);
        // Event
        this._onDidLayout.fire(dimension);
    }
    saveState() {
        // Persist grid UI state
        if (this.gridWidget) {
            if (this.isEmpty) {
                delete this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
            }
            else {
                this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY] = this.createState();
            }
        }
        // Persist centered view state
        if (this.centeredLayoutWidget) {
            const centeredLayoutState = this.centeredLayoutWidget.state;
            if (this.centeredLayoutWidget.isDefault(centeredLayoutState)) {
                delete this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY];
            }
            else {
                this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY] = centeredLayoutState;
            }
        }
        super.saveState();
    }
    loadState() {
        return this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    createState() {
        return {
            serializedGrid: this.gridWidget.serialize(),
            activeGroup: this._activeGroup.id,
            mostRecentActiveGroups: this.mostRecentActiveGroups
        };
    }
    applyState(state, options) {
        if (state === 'empty') {
            return this.doApplyEmptyState();
        }
        else {
            return this.doApplyState(state, options);
        }
    }
    async doApplyState(state, options) {
        const groups = await this.doPrepareApplyState();
        // Pause add/remove events for groups during the duration of applying the state
        // This ensures that we can do this transition atomically with the new state
        // being ready when the events are fired. This is important because usually there
        // is never the state where no groups are present, but for this transition we
        // need to temporarily dispose all groups to restore the new set.
        this._onDidAddGroup.pause();
        this._onDidRemoveGroup.pause();
        this.disposeGroups();
        // MRU
        this.mostRecentActiveGroups = state.mostRecentActiveGroups;
        // Grid Widget
        try {
            this.doApplyGridState(state.serializedGrid, state.activeGroup, undefined, options);
        }
        finally {
            // It is very important to keep this order: first resume the events for
            // removed groups and then for added groups. Many listeners may store
            // groups in sets by their identifier and groups can have the same
            // identifier before and after.
            this._onDidRemoveGroup.resume();
            this._onDidAddGroup.resume();
        }
        // Restore editors that were not closed before and are now opened now
        await this.activeGroup.openEditors(groups
            .flatMap(group => group.editors)
            .filter(editor => this.editorPartsView.groups.every(groupView => !groupView.contains(editor)))
            .map(editor => ({
            editor, options: { pinned: true, preserveFocus: true, inactive: true }
        })));
    }
    async doApplyEmptyState() {
        await this.doPrepareApplyState();
        this.mergeAllGroups(this.activeGroup);
    }
    async doPrepareApplyState() {
        // Before disposing groups, try to close as many editors as
        // possible, but skip over those that would trigger a dialog
        // (for example when being dirty). This is to be able to later
        // restore these editors after state has been applied.
        const groups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        for (const group of groups) {
            await group.closeAllEditors({ excludeConfirming: true });
        }
        return groups;
    }
    doApplyGridState(gridState, activeGroupId, editorGroupViewsToReuse, options) {
        // Recreate grid widget from state
        this.doCreateGridControlWithState(gridState, activeGroupId, editorGroupViewsToReuse, options);
        // Layout
        this.doLayout(this._contentDimension);
        // Update container
        this.updateContainer();
        // Events for groups that got added
        for (const groupView of this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
            if (!editorGroupViewsToReuse?.includes(groupView)) {
                this._onDidAddGroup.fire(groupView);
            }
        }
        // Notify group index change given layout has changed
        this.notifyGroupIndexChange();
    }
    onDidChangeMementoState(e) {
        if (e.external && e.scope === 1 /* StorageScope.WORKSPACE */) {
            this.reloadMemento(e.scope);
            const state = this.loadState();
            if (state) {
                this.applyState(state);
            }
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.editor" /* Parts.EDITOR_PART */
        };
    }
    disposeGroups() {
        for (const group of this.groups) {
            group.dispose();
            this._onDidRemoveGroup.fire(group);
        }
        this.groupViews.clear();
        this.mostRecentActiveGroups = [];
    }
    dispose() {
        // Event
        this._onWillDispose.fire();
        // Forward to all groups
        this.disposeGroups();
        // Grid widget
        this.gridWidget?.dispose();
        super.dispose();
    }
};
EditorPart = EditorPart_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], EditorPart);
export { EditorPart };
let MainEditorPart = class MainEditorPart extends EditorPart {
    constructor(editorPartsView, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(editorPartsView, "workbench.parts.editor" /* Parts.EDITOR_PART */, '', mainWindow.vscodeWindowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
    }
};
MainEditorPart = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IHostService),
    __param(7, IContextKeyService)
], MainEditorPart);
export { MainEditorPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxxQ0FBcUMsRUFBRSxTQUFTLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUwsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBUyxVQUFVLEVBQXdDLGdCQUFnQixFQUFFLE1BQU0sRUFBaUUsZ0JBQWdCLEVBQVksb0JBQW9CLEVBQVEsTUFBTSwwQ0FBMEMsQ0FBQztBQUVwUSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBb0Isb0JBQW9CLEVBQUUsd0JBQXdCLEVBQTRGLE1BQU0sYUFBYSxDQUFDO0FBQ3pMLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FB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