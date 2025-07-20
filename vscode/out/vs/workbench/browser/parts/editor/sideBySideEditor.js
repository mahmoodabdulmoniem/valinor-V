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
var SideBySideEditor_1;
import './media/sidebysideeditor.css';
import { localize } from '../../../../nls.js';
import { Dimension, $, clearNode } from '../../../../base/browser/dom.js';
import { multibyteAwareBtoa } from '../../../../base/common/strings.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions, SIDE_BY_SIDE_EDITOR_ID, SideBySideEditor as Side, isEditorPaneWithSelection } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { SplitView, Sizing } from '../../../../base/browser/ui/splitview/splitview.js';
import { Event, Relay, Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS } from './editor.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER, SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER } from '../../../common/theme.js';
import { AbstractEditorWithViewState } from './editorWithViewState.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
function isSideBySideEditorViewState(thing) {
    const candidate = thing;
    return typeof candidate?.primary === 'object' && typeof candidate.secondary === 'object';
}
let SideBySideEditor = class SideBySideEditor extends AbstractEditorWithViewState {
    static { SideBySideEditor_1 = this; }
    static { this.ID = SIDE_BY_SIDE_EDITOR_ID; }
    static { this.SIDE_BY_SIDE_LAYOUT_SETTING = 'workbench.editor.splitInGroupLayout'; }
    static { this.VIEW_STATE_PREFERENCE_KEY = 'sideBySideEditorViewState'; }
    //#region Layout Constraints
    get minimumPrimaryWidth() { return this.primaryEditorPane ? this.primaryEditorPane.minimumWidth : 0; }
    get maximumPrimaryWidth() { return this.primaryEditorPane ? this.primaryEditorPane.maximumWidth : Number.POSITIVE_INFINITY; }
    get minimumPrimaryHeight() { return this.primaryEditorPane ? this.primaryEditorPane.minimumHeight : 0; }
    get maximumPrimaryHeight() { return this.primaryEditorPane ? this.primaryEditorPane.maximumHeight : Number.POSITIVE_INFINITY; }
    get minimumSecondaryWidth() { return this.secondaryEditorPane ? this.secondaryEditorPane.minimumWidth : 0; }
    get maximumSecondaryWidth() { return this.secondaryEditorPane ? this.secondaryEditorPane.maximumWidth : Number.POSITIVE_INFINITY; }
    get minimumSecondaryHeight() { return this.secondaryEditorPane ? this.secondaryEditorPane.minimumHeight : 0; }
    get maximumSecondaryHeight() { return this.secondaryEditorPane ? this.secondaryEditorPane.maximumHeight : Number.POSITIVE_INFINITY; }
    set minimumWidth(value) { }
    set maximumWidth(value) { }
    set minimumHeight(value) { }
    set maximumHeight(value) { }
    get minimumWidth() { return this.minimumPrimaryWidth + this.minimumSecondaryWidth; }
    get maximumWidth() { return this.maximumPrimaryWidth + this.maximumSecondaryWidth; }
    get minimumHeight() { return this.minimumPrimaryHeight + this.minimumSecondaryHeight; }
    get maximumHeight() { return this.maximumPrimaryHeight + this.maximumSecondaryHeight; }
    constructor(group, telemetryService, instantiationService, themeService, storageService, configurationService, textResourceConfigurationService, editorService, editorGroupService) {
        super(SideBySideEditor_1.ID, group, SideBySideEditor_1.VIEW_STATE_PREFERENCE_KEY, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.configurationService = configurationService;
        //#endregion
        //#region Events
        this.onDidCreateEditors = this._register(new Emitter());
        this._onDidChangeSizeConstraints = this._register(new Relay());
        this.onDidChangeSizeConstraints = Event.any(this.onDidCreateEditors.event, this._onDidChangeSizeConstraints.event);
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        //#endregion
        this.primaryEditorPane = undefined;
        this.secondaryEditorPane = undefined;
        this.splitviewDisposables = this._register(new DisposableStore());
        this.editorDisposables = this._register(new DisposableStore());
        this.dimension = new Dimension(0, 0);
        this.lastFocusedSide = undefined;
        this.orientation = this.configurationService.getValue(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING) === 'vertical' ? 0 /* Orientation.VERTICAL */ : 1 /* Orientation.HORIZONTAL */;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
    }
    onConfigurationUpdated(event) {
        if (event.affectsConfiguration(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING)) {
            this.orientation = this.configurationService.getValue(SideBySideEditor_1.SIDE_BY_SIDE_LAYOUT_SETTING) === 'vertical' ? 0 /* Orientation.VERTICAL */ : 1 /* Orientation.HORIZONTAL */;
            // If config updated from event, re-create the split
            // editor using the new layout orientation if it was
            // already created.
            if (this.splitview) {
                this.recreateSplitview();
            }
        }
    }
    recreateSplitview() {
        const container = assertReturnsDefined(this.getContainer());
        // Clear old (if any) but remember ratio
        const ratio = this.getSplitViewRatio();
        if (this.splitview) {
            this.splitview.el.remove();
            this.splitviewDisposables.clear();
        }
        // Create new
        this.createSplitView(container, ratio);
        this.layout(this.dimension);
    }
    getSplitViewRatio() {
        let ratio = undefined;
        if (this.splitview) {
            const leftViewSize = this.splitview.getViewSize(0);
            const rightViewSize = this.splitview.getViewSize(1);
            // Only return a ratio when the view size is significantly
            // enough different for left and right view sizes
            if (Math.abs(leftViewSize - rightViewSize) > 1) {
                const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */ ? this.dimension.width : this.dimension.height;
                ratio = leftViewSize / totalSize;
            }
        }
        return ratio;
    }
    createEditor(parent) {
        parent.classList.add('side-by-side-editor');
        // Editor pane containers
        this.secondaryEditorContainer = $('.side-by-side-editor-container.editor-instance');
        this.primaryEditorContainer = $('.side-by-side-editor-container.editor-instance');
        // Split view
        this.createSplitView(parent);
    }
    createSplitView(parent, ratio) {
        // Splitview widget
        this.splitview = this.splitviewDisposables.add(new SplitView(parent, { orientation: this.orientation }));
        this.splitviewDisposables.add(this.splitview.onDidSashReset(() => this.splitview?.distributeViewSizes()));
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this.splitview.orthogonalEndSash = this._boundarySashes?.bottom;
        }
        else {
            this.splitview.orthogonalStartSash = this._boundarySashes?.left;
            this.splitview.orthogonalEndSash = this._boundarySashes?.right;
        }
        // Figure out sizing
        let leftSizing = Sizing.Distribute;
        let rightSizing = Sizing.Distribute;
        if (ratio) {
            const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */ ? this.dimension.width : this.dimension.height;
            leftSizing = Math.round(totalSize * ratio);
            rightSizing = totalSize - leftSizing;
            // We need to call `layout` for the `ratio` to have any effect
            this.splitview.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.dimension.width : this.dimension.height);
        }
        // Secondary (left)
        const secondaryEditorContainer = assertReturnsDefined(this.secondaryEditorContainer);
        this.splitview.addView({
            element: secondaryEditorContainer,
            layout: size => this.layoutPane(this.secondaryEditorPane, size),
            minimumSize: this.orientation === 1 /* Orientation.HORIZONTAL */ ? DEFAULT_EDITOR_MIN_DIMENSIONS.width : DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: Event.None
        }, leftSizing);
        // Primary (right)
        const primaryEditorContainer = assertReturnsDefined(this.primaryEditorContainer);
        this.splitview.addView({
            element: primaryEditorContainer,
            layout: size => this.layoutPane(this.primaryEditorPane, size),
            minimumSize: this.orientation === 1 /* Orientation.HORIZONTAL */ ? DEFAULT_EDITOR_MIN_DIMENSIONS.width : DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: Event.None
        }, rightSizing);
        this.updateStyles();
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('sideBySideEditor', "Side by Side Editor");
    }
    async setInput(input, options, context, token) {
        const oldInput = this.input;
        await super.setInput(input, options, context, token);
        // Create new side by side editors if either we have not
        // been created before or the input no longer matches.
        if (!oldInput || !input.matches(oldInput)) {
            if (oldInput) {
                this.disposeEditors();
            }
            this.createEditors(input);
        }
        // Restore any previous view state
        const { primary, secondary, viewState } = this.loadViewState(input, options, context);
        this.lastFocusedSide = viewState?.focus;
        if (typeof viewState?.ratio === 'number' && this.splitview) {
            const totalSize = this.splitview.orientation === 1 /* Orientation.HORIZONTAL */ ? this.dimension.width : this.dimension.height;
            this.splitview.resizeView(0, Math.round(totalSize * viewState.ratio));
        }
        else {
            this.splitview?.distributeViewSizes();
        }
        // Set input to both sides
        await Promise.all([
            this.secondaryEditorPane?.setInput(input.secondary, secondary, context, token),
            this.primaryEditorPane?.setInput(input.primary, primary, context, token)
        ]);
        // Update focus if target is provided
        if (typeof options?.target === 'number') {
            this.lastFocusedSide = options.target;
        }
    }
    loadViewState(input, options, context) {
        const viewState = isSideBySideEditorViewState(options?.viewState) ? options?.viewState : this.loadEditorViewState(input, context);
        let primaryOptions = Object.create(null);
        let secondaryOptions = undefined;
        // Depending on the optional `target` property, we apply
        // the provided options to either the primary or secondary
        // side
        if (options?.target === Side.SECONDARY) {
            secondaryOptions = { ...options };
        }
        else {
            primaryOptions = { ...options };
        }
        primaryOptions.viewState = viewState?.primary;
        if (viewState?.secondary) {
            if (!secondaryOptions) {
                secondaryOptions = { viewState: viewState.secondary };
            }
            else {
                secondaryOptions.viewState = viewState?.secondary;
            }
        }
        return { primary: primaryOptions, secondary: secondaryOptions, viewState };
    }
    createEditors(newInput) {
        // Create editors
        this.secondaryEditorPane = this.doCreateEditor(newInput.secondary, assertReturnsDefined(this.secondaryEditorContainer));
        this.primaryEditorPane = this.doCreateEditor(newInput.primary, assertReturnsDefined(this.primaryEditorContainer));
        // Layout
        this.layout(this.dimension);
        // Eventing
        this._onDidChangeSizeConstraints.input = Event.any(Event.map(this.secondaryEditorPane.onDidChangeSizeConstraints, () => undefined), Event.map(this.primaryEditorPane.onDidChangeSizeConstraints, () => undefined));
        this.onDidCreateEditors.fire(undefined);
        // Track focus and signal active control change via event
        this.editorDisposables.add(this.primaryEditorPane.onDidFocus(() => this.onDidFocusChange(Side.PRIMARY)));
        this.editorDisposables.add(this.secondaryEditorPane.onDidFocus(() => this.onDidFocusChange(Side.SECONDARY)));
    }
    doCreateEditor(editorInput, container) {
        const editorPaneDescriptor = Registry.as(EditorExtensions.EditorPane).getEditorPane(editorInput);
        if (!editorPaneDescriptor) {
            throw new Error('No editor pane descriptor for editor found');
        }
        // Create editor pane and make visible
        const editorPane = editorPaneDescriptor.instantiate(this.instantiationService, this.group);
        editorPane.create(container);
        editorPane.setVisible(this.isVisible());
        // Track selections if supported
        if (isEditorPaneWithSelection(editorPane)) {
            this.editorDisposables.add(editorPane.onDidChangeSelection(e => this._onDidChangeSelection.fire(e)));
        }
        // Track for disposal
        this.editorDisposables.add(editorPane);
        return editorPane;
    }
    onDidFocusChange(side) {
        this.lastFocusedSide = side;
        // Signal to outside that our active control changed
        this._onDidChangeControl.fire();
    }
    getSelection() {
        const lastFocusedEditorPane = this.getLastFocusedEditorPane();
        if (isEditorPaneWithSelection(lastFocusedEditorPane)) {
            const selection = lastFocusedEditorPane.getSelection();
            if (selection) {
                return new SideBySideAwareEditorPaneSelection(selection, lastFocusedEditorPane === this.primaryEditorPane ? Side.PRIMARY : Side.SECONDARY);
            }
        }
        return undefined;
    }
    setOptions(options) {
        super.setOptions(options);
        // Update focus if target is provided
        if (typeof options?.target === 'number') {
            this.lastFocusedSide = options.target;
        }
        // Apply to focused side
        this.getLastFocusedEditorPane()?.setOptions(options);
    }
    setEditorVisible(visible) {
        // Forward to both sides
        this.primaryEditorPane?.setVisible(visible);
        this.secondaryEditorPane?.setVisible(visible);
        super.setEditorVisible(visible);
    }
    clearInput() {
        super.clearInput();
        // Forward to both sides
        this.primaryEditorPane?.clearInput();
        this.secondaryEditorPane?.clearInput();
        // Since we do not keep side editors alive
        // we dispose any editor created for recreation
        this.disposeEditors();
    }
    focus() {
        super.focus();
        this.getLastFocusedEditorPane()?.focus();
    }
    getLastFocusedEditorPane() {
        if (this.lastFocusedSide === Side.SECONDARY) {
            return this.secondaryEditorPane;
        }
        return this.primaryEditorPane;
    }
    layout(dimension) {
        this.dimension = dimension;
        const splitview = assertReturnsDefined(this.splitview);
        splitview.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? dimension.width : dimension.height);
    }
    setBoundarySashes(sashes) {
        this._boundarySashes = sashes;
        if (this.splitview) {
            this.splitview.orthogonalEndSash = sashes.bottom;
        }
    }
    layoutPane(pane, size) {
        pane?.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? new Dimension(size, this.dimension.height) : new Dimension(this.dimension.width, size));
    }
    getControl() {
        return this.getLastFocusedEditorPane()?.getControl();
    }
    getPrimaryEditorPane() {
        return this.primaryEditorPane;
    }
    getSecondaryEditorPane() {
        return this.secondaryEditorPane;
    }
    tracksEditorViewState(input) {
        return input instanceof SideBySideEditorInput;
    }
    computeEditorViewState(resource) {
        if (!this.input || !isEqual(resource, this.toEditorViewStateResource(this.input))) {
            return; // unexpected state
        }
        const primarViewState = this.primaryEditorPane?.getViewState();
        const secondaryViewState = this.secondaryEditorPane?.getViewState();
        if (!primarViewState || !secondaryViewState) {
            return; // we actually need view states
        }
        return {
            primary: primarViewState,
            secondary: secondaryViewState,
            focus: this.lastFocusedSide,
            ratio: this.getSplitViewRatio()
        };
    }
    toEditorViewStateResource(input) {
        let primary;
        let secondary;
        if (input instanceof SideBySideEditorInput) {
            primary = input.primary.resource;
            secondary = input.secondary.resource;
        }
        if (!secondary || !primary) {
            return undefined;
        }
        // create a URI that is the Base64 concatenation of original + modified resource
        return URI.from({ scheme: 'sideBySide', path: `${multibyteAwareBtoa(secondary.toString())}${multibyteAwareBtoa(primary.toString())}` });
    }
    updateStyles() {
        super.updateStyles();
        if (this.primaryEditorContainer) {
            if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
                this.primaryEditorContainer.style.borderLeftWidth = '1px';
                this.primaryEditorContainer.style.borderLeftStyle = 'solid';
                this.primaryEditorContainer.style.borderLeftColor = this.getColor(SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER) ?? '';
                this.primaryEditorContainer.style.borderTopWidth = '0';
            }
            else {
                this.primaryEditorContainer.style.borderTopWidth = '1px';
                this.primaryEditorContainer.style.borderTopStyle = 'solid';
                this.primaryEditorContainer.style.borderTopColor = this.getColor(SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER) ?? '';
                this.primaryEditorContainer.style.borderLeftWidth = '0';
            }
        }
    }
    dispose() {
        this.disposeEditors();
        super.dispose();
    }
    disposeEditors() {
        this.editorDisposables.clear();
        this.secondaryEditorPane = undefined;
        this.primaryEditorPane = undefined;
        this.lastFocusedSide = undefined;
        if (this.secondaryEditorContainer) {
            clearNode(this.secondaryEditorContainer);
        }
        if (this.primaryEditorContainer) {
            clearNode(this.primaryEditorContainer);
        }
    }
};
SideBySideEditor = SideBySideEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService)
], SideBySideEditor);
export { SideBySideEditor };
class SideBySideAwareEditorPaneSelection {
    constructor(selection, side) {
        this.selection = selection;
        this.side = side;
    }
    compare(other) {
        if (!(other instanceof SideBySideAwareEditorPaneSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (this.side !== other.side) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        return this.selection.compare(other.selection);
    }
    restore(options) {
        const sideBySideEditorOptions = {
            ...options,
            target: this.side
        };
        return this.selection.restore(sideBySideEditorOptions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3NpZGVCeVNpZGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQW1ELGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixJQUFJLElBQUksRUFBbUYseUJBQXlCLEVBQW9DLE1BQU0sMkJBQTJCLENBQUM7QUFDOVMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFHeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR2xGLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBZSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sRUFB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