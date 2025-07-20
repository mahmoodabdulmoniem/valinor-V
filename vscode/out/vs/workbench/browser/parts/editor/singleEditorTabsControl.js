/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/singleeditortabscontrol.css';
import { EditorResourceAccessor, SideBySideEditor, preventEditorClose, EditorCloseMethod } from '../../../common/editor.js';
import { EditorTabsControl } from './editorTabsControl.js';
import { ResourceLabel } from '../../labels.js';
import { TAB_ACTIVE_FOREGROUND, TAB_UNFOCUSED_ACTIVE_FOREGROUND } from '../../../common/theme.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { addDisposableListener, EventType, EventHelper, Dimension, isAncestor, DragAndDropObserver, isHTMLElement, $ } from '../../../../base/browser/dom.js';
import { CLOSE_EDITOR_COMMAND_ID, UNLOCK_GROUP_COMMAND_ID } from './editorCommands.js';
import { Color } from '../../../../base/common/color.js';
import { assertReturnsDefined, assertReturnsAllDefined } from '../../../../base/common/types.js';
import { equals } from '../../../../base/common/objects.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { BreadcrumbsControlFactory } from './breadcrumbsControl.js';
export class SingleEditorTabsControl extends EditorTabsControl {
    constructor() {
        super(...arguments);
        this.activeLabel = Object.create(null);
    }
    get breadcrumbsControl() { return this.breadcrumbsControlFactory?.control; }
    create(parent) {
        super.create(parent);
        const titleContainer = this.titleContainer = parent;
        titleContainer.draggable = true;
        // Container listeners
        this.registerContainerListeners(titleContainer);
        // Gesture Support
        this._register(Gesture.addTarget(titleContainer));
        const labelContainer = $('.label-container');
        titleContainer.appendChild(labelContainer);
        // Editor Label
        this.editorLabel = this._register(this.instantiationService.createInstance(ResourceLabel, labelContainer, {})).element;
        this._register(addDisposableListener(this.editorLabel.element, EventType.CLICK, e => this.onTitleLabelClick(e)));
        // Breadcrumbs
        this.breadcrumbsControlFactory = this._register(this.instantiationService.createInstance(BreadcrumbsControlFactory, labelContainer, this.groupView, {
            showFileIcons: false,
            showSymbolIcons: true,
            showDecorationColors: false,
            widgetStyles: { ...defaultBreadcrumbsWidgetStyles, breadcrumbsBackground: Color.transparent.toString() },
            showPlaceholder: false,
            dragEditor: true,
        }));
        this._register(this.breadcrumbsControlFactory.onDidEnablementChange(() => this.handleBreadcrumbsEnablementChange()));
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this._register(toDisposable(() => titleContainer.classList.remove('breadcrumbs'))); // important to remove because the container is a shared dom node
        // Create editor actions toolbar
        this.createEditorActionsToolBar(titleContainer, ['title-actions']);
        return titleContainer;
    }
    registerContainerListeners(titleContainer) {
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        this._register(new DragAndDropObserver(titleContainer, {
            onDragStart: e => { isNewWindowOperation = this.onGroupDragStart(e, titleContainer); },
            onDrag: e => { lastDragEvent = e; },
            onDragEnd: e => { this.onGroupDragEnd(e, lastDragEvent, titleContainer, isNewWindowOperation); },
        }));
        // Pin on double click
        this._register(addDisposableListener(titleContainer, EventType.DBLCLICK, e => this.onTitleDoubleClick(e)));
        // Detect mouse click
        this._register(addDisposableListener(titleContainer, EventType.AUXCLICK, e => this.onTitleAuxClick(e)));
        // Detect touch
        this._register(addDisposableListener(titleContainer, TouchEventType.Tap, (e) => this.onTitleTap(e)));
        // Context Menu
        for (const event of [EventType.CONTEXT_MENU, TouchEventType.Contextmenu]) {
            this._register(addDisposableListener(titleContainer, event, e => {
                if (this.tabsModel.activeEditor) {
                    this.onTabContextMenu(this.tabsModel.activeEditor, e, titleContainer);
                }
            }));
        }
    }
    onTitleLabelClick(e) {
        EventHelper.stop(e, false);
        // delayed to let the onTitleClick() come first which can cause a focus change which can close quick access
        setTimeout(() => this.quickInputService.quickAccess.show());
    }
    onTitleDoubleClick(e) {
        EventHelper.stop(e);
        this.groupView.pinEditor();
    }
    onTitleAuxClick(e) {
        if (e.button === 1 /* Middle Button */ && this.tabsModel.activeEditor) {
            EventHelper.stop(e, true /* for https://github.com/microsoft/vscode/issues/56715 */);
            if (!preventEditorClose(this.tabsModel, this.tabsModel.activeEditor, EditorCloseMethod.MOUSE, this.groupsView.partOptions)) {
                this.groupView.closeEditor(this.tabsModel.activeEditor);
            }
        }
    }
    onTitleTap(e) {
        // We only want to open the quick access picker when
        // the tap occurred over the editor label, so we need
        // to check on the target
        // (https://github.com/microsoft/vscode/issues/107543)
        const target = e.initialTarget;
        if (!(isHTMLElement(target)) || !this.editorLabel || !isAncestor(target, this.editorLabel.element)) {
            return;
        }
        // TODO@rebornix gesture tap should open the quick access
        // editorGroupView will focus on the editor again when there
        // are mouse/pointer/touch down events we need to wait a bit as
        // `GesureEvent.Tap` is generated from `touchstart` and then
        // `touchend` events, which are not an atom event.
        setTimeout(() => this.quickInputService.quickAccess.show(), 50);
    }
    openEditor(editor) {
        return this.doHandleOpenEditor();
    }
    openEditors(editors) {
        return this.doHandleOpenEditor();
    }
    doHandleOpenEditor() {
        const activeEditorChanged = this.ifActiveEditorChanged(() => this.redraw());
        if (!activeEditorChanged) {
            this.ifActiveEditorPropertiesChanged(() => this.redraw());
        }
        return activeEditorChanged;
    }
    beforeCloseEditor(editor) {
        // Nothing to do before closing an editor
    }
    closeEditor(editor) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    closeEditors(editors) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    moveEditor(editor, fromIndex, targetIndex) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    pinEditor(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    setActive(isActive) {
        this.redraw();
    }
    updateEditorSelections() { }
    updateEditorLabel(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    updateEditorDirty(editor) {
        this.ifEditorIsActive(editor, () => {
            const titleContainer = assertReturnsDefined(this.titleContainer);
            // Signal dirty (unless saving)
            if (editor.isDirty() && !editor.isSaving()) {
                titleContainer.classList.add('dirty');
            }
            // Otherwise, clear dirty
            else {
                titleContainer.classList.remove('dirty');
            }
        });
    }
    updateOptions(oldOptions, newOptions) {
        super.updateOptions(oldOptions, newOptions);
        if (oldOptions.labelFormat !== newOptions.labelFormat || !equals(oldOptions.decorations, newOptions.decorations)) {
            this.redraw();
        }
    }
    updateStyles() {
        this.redraw();
    }
    handleBreadcrumbsEnablementChange() {
        const titleContainer = assertReturnsDefined(this.titleContainer);
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this.redraw();
    }
    ifActiveEditorChanged(fn) {
        if (!this.activeLabel.editor && this.tabsModel.activeEditor || // active editor changed from null => editor
            this.activeLabel.editor && !this.tabsModel.activeEditor || // active editor changed from editor => null
            (!this.activeLabel.editor || !this.tabsModel.isActive(this.activeLabel.editor)) // active editor changed from editorA => editorB
        ) {
            fn();
            return true;
        }
        return false;
    }
    ifActiveEditorPropertiesChanged(fn) {
        if (!this.activeLabel.editor || !this.tabsModel.activeEditor) {
            return; // need an active editor to check for properties changed
        }
        if (this.activeLabel.pinned !== this.tabsModel.isPinned(this.tabsModel.activeEditor)) {
            fn(); // only run if pinned state has changed
        }
    }
    ifEditorIsActive(editor, fn) {
        if (this.tabsModel.isActive(editor)) {
            fn(); // only run if editor is current active
        }
    }
    redraw() {
        const editor = this.tabsModel.activeEditor ?? undefined;
        const options = this.groupsView.partOptions;
        const isEditorPinned = editor ? this.tabsModel.isPinned(editor) : false;
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        this.activeLabel = { editor, pinned: isEditorPinned };
        // Update Breadcrumbs
        if (this.breadcrumbsControl) {
            if (isGroupActive) {
                this.breadcrumbsControl.update();
                this.breadcrumbsControl.domNode.classList.toggle('preview', !isEditorPinned);
            }
            else {
                this.breadcrumbsControl.hide();
            }
        }
        // Clear if there is no editor
        const [titleContainer, editorLabel] = assertReturnsAllDefined(this.titleContainer, this.editorLabel);
        if (!editor) {
            titleContainer.classList.remove('dirty');
            editorLabel.clear();
            this.clearEditorActionsToolbar();
        }
        // Otherwise render it
        else {
            // Dirty state
            this.updateEditorDirty(editor);
            // Editor Label
            const { labelFormat } = this.groupsView.partOptions;
            let description;
            if (this.breadcrumbsControl && !this.breadcrumbsControl.isHidden()) {
                description = ''; // hide description when showing breadcrumbs
            }
            else if (labelFormat === 'default' && !isGroupActive) {
                description = ''; // hide description when group is not active and style is 'default'
            }
            else {
                description = editor.getDescription(this.getVerbosity(labelFormat)) || '';
            }
            editorLabel.setResource({
                resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
                name: editor.getName(),
                description
            }, {
                title: this.getHoverTitle(editor),
                italic: !isEditorPinned,
                extraClasses: ['single-tab', 'title-label'].concat(editor.getLabelExtraClasses()),
                fileDecorations: {
                    colors: Boolean(options.decorations?.colors),
                    badges: Boolean(options.decorations?.badges)
                },
                icon: editor.getIcon(),
                hideIcon: options.showIcons === false,
            });
            if (isGroupActive) {
                titleContainer.style.color = this.getColor(TAB_ACTIVE_FOREGROUND) || '';
            }
            else {
                titleContainer.style.color = this.getColor(TAB_UNFOCUSED_ACTIVE_FOREGROUND) || '';
            }
            // Update Editor Actions Toolbar
            this.updateEditorActionsToolbar();
        }
    }
    getVerbosity(style) {
        switch (style) {
            case 'short': return 0 /* Verbosity.SHORT */;
            case 'long': return 2 /* Verbosity.LONG */;
            default: return 1 /* Verbosity.MEDIUM */;
        }
    }
    prepareEditorActions(editorActions) {
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        // Active: allow all actions
        if (isGroupActive) {
            return editorActions;
        }
        // Inactive: only show "Close, "Unlock" and secondary actions
        else {
            return {
                primary: this.groupsView.partOptions.alwaysShowEditorActions ? editorActions.primary : editorActions.primary.filter(action => action.id === CLOSE_EDITOR_COMMAND_ID || action.id === UNLOCK_GROUP_COMMAND_ID),
                secondary: editorActions.secondary
            };
        }
    }
    getHeight() {
        return this.tabHeight;
    }
    layout(dimensions) {
        this.breadcrumbsControl?.layout(undefined);
        return new Dimension(dimensions.container.width, this.getHeight());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlRWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9zaW5nbGVFZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sRUFBRSxzQkFBc0IsRUFBaUMsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQW1CLE1BQU0sMkJBQTJCLENBQUM7QUFFNUssT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBZ0IsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUosT0FBTyxFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1B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