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
var OutlineItem_1, FileItem_1, BreadcrumbsControl_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { BreadcrumbsItem, BreadcrumbsWidget } from '../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { combinedDisposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { OutlineElement } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData, LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService, WorkbenchAsyncDataTree, WorkbenchDataTree, WorkbenchListFocusContextKey } from '../../../../platform/list/browser/listService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { DraggedEditorIdentifier, fillEditorsDragData } from '../../dnd.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../labels.js';
import { BreadcrumbsConfig, IBreadcrumbsService } from './breadcrumbs.js';
import { BreadcrumbsModel, FileElement, OutlineElement2 } from './breadcrumbsModel.js';
import { BreadcrumbsFilePicker, BreadcrumbsOutlinePicker } from './breadcrumbsPicker.js';
import './media/breadcrumbscontrol.css';
let OutlineItem = OutlineItem_1 = class OutlineItem extends BreadcrumbsItem {
    constructor(model, element, options, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof OutlineItem_1)) {
            return false;
        }
        return this.element.element === other.element.element &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons;
    }
    render(container) {
        const { element, outline } = this.element;
        if (element === outline) {
            const element = dom.$('span', undefined, '…');
            container.appendChild(element);
            return;
        }
        const templateId = outline.config.delegate.getTemplateId(element);
        const renderer = outline.config.renderers.find(renderer => renderer.templateId === templateId);
        if (!renderer) {
            container.innerText = '<<NO RENDERER>>';
            return;
        }
        const template = renderer.renderTemplate(container);
        renderer.renderElement({
            element,
            children: [],
            depth: 0,
            visibleChildrenCount: 0,
            visibleChildIndex: 0,
            collapsible: false,
            collapsed: false,
            visible: true,
            filterData: undefined
        }, 0, template, undefined);
        this._disposables.add(toDisposable(() => { renderer.disposeTemplate(template); }));
        if (element instanceof OutlineElement && outline.uri) {
            this._disposables.add(this._instantiationService.invokeFunction(accessor => createBreadcrumbDndObserver(accessor, container, element.symbol.name, { symbol: element.symbol, uri: outline.uri }, this.model, this.options.dragEditor)));
        }
    }
};
OutlineItem = OutlineItem_1 = __decorate([
    __param(3, IInstantiationService)
], OutlineItem);
let FileItem = FileItem_1 = class FileItem extends BreadcrumbsItem {
    constructor(model, element, options, _labels, _hoverDelegate, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._labels = _labels;
        this._hoverDelegate = _hoverDelegate;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof FileItem_1)) {
            return false;
        }
        return (extUri.isEqual(this.element.uri, other.element.uri) &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons);
    }
    render(container) {
        // file/folder
        const label = this._labels.create(container, { hoverDelegate: this._hoverDelegate });
        label.setFile(this.element.uri, {
            hidePath: true,
            hideIcon: this.element.kind === FileKind.FOLDER || !this.options.showFileIcons,
            fileKind: this.element.kind,
            fileDecorations: { colors: this.options.showDecorationColors, badges: false },
        });
        container.classList.add(FileKind[this.element.kind].toLowerCase());
        this._disposables.add(label);
        this._disposables.add(this._instantiationService.invokeFunction(accessor => createBreadcrumbDndObserver(accessor, container, basename(this.element.uri), this.element.uri, this.model, this.options.dragEditor)));
    }
};
FileItem = FileItem_1 = __decorate([
    __param(5, IInstantiationService)
], FileItem);
function createBreadcrumbDndObserver(accessor, container, label, item, model, dragEditor) {
    const instantiationService = accessor.get(IInstantiationService);
    container.draggable = true;
    return new dom.DragAndDropObserver(container, {
        onDragStart: event => {
            if (!event.dataTransfer) {
                return;
            }
            // Set data transfer
            event.dataTransfer.effectAllowed = 'copyMove';
            instantiationService.invokeFunction(accessor => {
                if (URI.isUri(item)) {
                    fillEditorsDragData(accessor, [item], event);
                }
                else { // Symbol
                    fillEditorsDragData(accessor, [{ resource: item.uri, selection: item.symbol.range }], event);
                    fillInSymbolsDragData([{
                            name: item.symbol.name,
                            fsPath: item.uri.fsPath,
                            range: item.symbol.range,
                            kind: item.symbol.kind
                        }], event);
                }
                if (dragEditor && model.editor && model.editor?.input) {
                    const editorTransfer = LocalSelectionTransfer.getInstance();
                    editorTransfer.setData([new DraggedEditorIdentifier({ editor: model.editor.input, groupId: model.editor.group.id })], DraggedEditorIdentifier.prototype);
                }
            });
            applyDragImage(event, container, label);
        }
    });
}
const separatorIcon = registerIcon('breadcrumb-separator', Codicon.chevronRight, localize('separatorIcon', 'Icon for the separator in the breadcrumbs.'));
let BreadcrumbsControl = class BreadcrumbsControl {
    static { BreadcrumbsControl_1 = this; }
    static { this.HEIGHT = 22; }
    static { this.SCROLLBAR_SIZES = {
        default: 3,
        large: 8
    }; }
    static { this.Payload_Reveal = {}; }
    static { this.Payload_RevealAside = {}; }
    static { this.Payload_Pick = {}; }
    static { this.CK_BreadcrumbsPossible = new RawContextKey('breadcrumbsPossible', false, localize('breadcrumbsPossible', "Whether the editor can show breadcrumbs")); }
    static { this.CK_BreadcrumbsVisible = new RawContextKey('breadcrumbsVisible', false, localize('breadcrumbsVisible', "Whether breadcrumbs are currently visible")); }
    static { this.CK_BreadcrumbsActive = new RawContextKey('breadcrumbsActive', false, localize('breadcrumbsActive', "Whether breadcrumbs have focus")); }
    get onDidVisibilityChange() { return this._onDidVisibilityChange.event; }
    constructor(container, _options, _editorGroup, _contextKeyService, _contextViewService, _instantiationService, _quickInputService, _fileService, _editorService, _labelService, configurationService, breadcrumbsService) {
        this._options = _options;
        this._editorGroup = _editorGroup;
        this._contextKeyService = _contextKeyService;
        this._contextViewService = _contextViewService;
        this._instantiationService = _instantiationService;
        this._quickInputService = _quickInputService;
        this._fileService = _fileService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._disposables = new DisposableStore();
        this._breadcrumbsDisposables = new DisposableStore();
        this._model = new MutableDisposable();
        this._breadcrumbsPickerShowing = false;
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        this.domNode = document.createElement('div');
        this.domNode.classList.add('breadcrumbs-control');
        dom.append(container, this.domNode);
        this._cfUseQuickPick = BreadcrumbsConfig.UseQuickPick.bindTo(configurationService);
        this._cfShowIcons = BreadcrumbsConfig.Icons.bindTo(configurationService);
        this._cfTitleScrollbarSizing = BreadcrumbsConfig.TitleScrollbarSizing.bindTo(configurationService);
        this._labels = this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER);
        const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
        const styles = _options.widgetStyles ?? defaultBreadcrumbsWidgetStyles;
        this._widget = new BreadcrumbsWidget(this.domNode, BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing], separatorIcon, styles);
        this._widget.onDidSelectItem(this._onSelectEvent, this, this._disposables);
        this._widget.onDidFocusItem(this._onFocusEvent, this, this._disposables);
        this._widget.onDidChangeFocus(this._updateCkBreadcrumbsActive, this, this._disposables);
        this._ckBreadcrumbsPossible = BreadcrumbsControl_1.CK_BreadcrumbsPossible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsVisible = BreadcrumbsControl_1.CK_BreadcrumbsVisible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsActive = BreadcrumbsControl_1.CK_BreadcrumbsActive.bindTo(this._contextKeyService);
        this._hoverDelegate = getDefaultHoverDelegate('mouse');
        this._disposables.add(breadcrumbsService.register(this._editorGroup.id, this._widget));
        this.hide();
    }
    dispose() {
        this._disposables.dispose();
        this._breadcrumbsDisposables.dispose();
        this._model.dispose();
        this._ckBreadcrumbsPossible.reset();
        this._ckBreadcrumbsVisible.reset();
        this._ckBreadcrumbsActive.reset();
        this._cfUseQuickPick.dispose();
        this._cfShowIcons.dispose();
        this._widget.dispose();
        this._labels.dispose();
        this.domNode.remove();
    }
    get model() {
        return this._model.value;
    }
    layout(dim) {
        this._widget.layout(dim);
    }
    isHidden() {
        return this.domNode.classList.contains('hidden');
    }
    hide() {
        const wasHidden = this.isHidden();
        this._breadcrumbsDisposables.clear();
        this._ckBreadcrumbsVisible.set(false);
        this.domNode.classList.toggle('hidden', true);
        if (!wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    show() {
        const wasHidden = this.isHidden();
        this._ckBreadcrumbsVisible.set(true);
        this.domNode.classList.toggle('hidden', false);
        if (wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    revealLast() {
        this._widget.revealLast();
    }
    update() {
        this._breadcrumbsDisposables.clear();
        // honor diff editors and such
        const uri = EditorResourceAccessor.getCanonicalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const wasHidden = this.isHidden();
        if (!uri || !this._fileService.hasProvider(uri)) {
            // cleanup and return when there is no input or when
            // we cannot handle this input
            this._ckBreadcrumbsPossible.set(false);
            if (!wasHidden) {
                this.hide();
                return true;
            }
            else {
                return false;
            }
        }
        // display uri which can be derived from certain inputs
        const fileInfoUri = EditorResourceAccessor.getOriginalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        this.show();
        this._ckBreadcrumbsPossible.set(true);
        const model = this._instantiationService.createInstance(BreadcrumbsModel, fileInfoUri ?? uri, this._editorGroup.activeEditorPane);
        this._model.value = model;
        this.domNode.classList.toggle('backslash-path', this._labelService.getSeparator(uri.scheme, uri.authority) === '\\');
        const updateBreadcrumbs = () => {
            this.domNode.classList.toggle('relative-path', model.isRelative());
            const showIcons = this._cfShowIcons.getValue();
            const options = {
                ...this._options,
                showFileIcons: this._options.showFileIcons && showIcons,
                showSymbolIcons: this._options.showSymbolIcons && showIcons
            };
            const items = model.getElements().map(element => element instanceof FileElement
                ? this._instantiationService.createInstance(FileItem, model, element, options, this._labels, this._hoverDelegate)
                : this._instantiationService.createInstance(OutlineItem, model, element, options));
            if (items.length === 0) {
                this._widget.setEnabled(false);
                this._widget.setItems([new class extends BreadcrumbsItem {
                        render(container) {
                            container.innerText = localize('empty', "no elements");
                        }
                        equals(other) {
                            return other === this;
                        }
                        dispose() {
                        }
                    }]);
            }
            else {
                this._widget.setEnabled(true);
                this._widget.setItems(items);
                this._widget.reveal(items[items.length - 1]);
            }
        };
        const listener = model.onDidUpdate(updateBreadcrumbs);
        const configListener = this._cfShowIcons.onDidChange(updateBreadcrumbs);
        updateBreadcrumbs();
        this._breadcrumbsDisposables.clear();
        this._breadcrumbsDisposables.add(listener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._model.clear()));
        this._breadcrumbsDisposables.add(configListener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._widget.setItems([])));
        const updateScrollbarSizing = () => {
            const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
            this._widget.setHorizontalScrollbarSize(BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing]);
        };
        updateScrollbarSizing();
        const updateScrollbarSizeListener = this._cfTitleScrollbarSizing.onDidChange(updateScrollbarSizing);
        this._breadcrumbsDisposables.add(updateScrollbarSizeListener);
        // close picker on hide/update
        this._breadcrumbsDisposables.add({
            dispose: () => {
                if (this._breadcrumbsPickerShowing) {
                    this._contextViewService.hideContextView({ source: this });
                }
            }
        });
        return wasHidden !== this.isHidden();
    }
    _onFocusEvent(event) {
        if (event.item && this._breadcrumbsPickerShowing) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setSelection(event.item);
        }
    }
    _onSelectEvent(event) {
        if (!event.item) {
            return;
        }
        if (event.item === this._breadcrumbsPickerIgnoreOnceItem) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            return;
        }
        const { element } = event.item;
        this._editorGroup.focus();
        const group = this._getEditorGroup(event.payload);
        if (group !== undefined) {
            // reveal the item
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._revealInEditor(event, element, group);
            return;
        }
        if (this._cfUseQuickPick.getValue()) {
            // using quick pick
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._quickInputService.quickAccess.show(element instanceof OutlineElement2 ? '@' : '');
            return;
        }
        // show picker
        let picker;
        let pickerAnchor;
        this._contextViewService.showContextView({
            render: (parent) => {
                if (event.item instanceof FileItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsFilePicker, parent, event.item.model.resource);
                }
                else if (event.item instanceof OutlineItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsOutlinePicker, parent, event.item.model.resource);
                }
                const selectListener = picker.onWillPickElement(() => this._contextViewService.hideContextView({ source: this, didPick: true }));
                const zoomListener = PixelRatio.getInstance(dom.getWindow(this.domNode)).onDidChange(() => this._contextViewService.hideContextView({ source: this }));
                const focusTracker = dom.trackFocus(parent);
                const blurListener = focusTracker.onDidBlur(() => {
                    this._breadcrumbsPickerIgnoreOnceItem = this._widget.isDOMFocused() ? event.item : undefined;
                    this._contextViewService.hideContextView({ source: this });
                });
                this._breadcrumbsPickerShowing = true;
                this._updateCkBreadcrumbsActive();
                return combinedDisposable(picker, selectListener, zoomListener, focusTracker, blurListener);
            },
            getAnchor: () => {
                if (!pickerAnchor) {
                    const window = dom.getWindow(this.domNode);
                    const maxInnerWidth = window.innerWidth - 8 /*a little less the full widget*/;
                    let maxHeight = Math.min(window.innerHeight * 0.7, 300);
                    const pickerWidth = Math.min(maxInnerWidth, Math.max(240, maxInnerWidth / 4.17));
                    const pickerArrowSize = 8;
                    let pickerArrowOffset;
                    const data = dom.getDomNodePagePosition(event.node.firstChild);
                    const y = data.top + data.height + pickerArrowSize;
                    if (y + maxHeight >= window.innerHeight) {
                        maxHeight = window.innerHeight - y - 30 /* room for shadow and status bar*/;
                    }
                    let x = data.left;
                    if (x + pickerWidth >= maxInnerWidth) {
                        x = maxInnerWidth - pickerWidth;
                    }
                    if (event.payload instanceof StandardMouseEvent) {
                        const maxPickerArrowOffset = pickerWidth - 2 * pickerArrowSize;
                        pickerArrowOffset = event.payload.posx - x;
                        if (pickerArrowOffset > maxPickerArrowOffset) {
                            x = Math.min(maxInnerWidth - pickerWidth, x + pickerArrowOffset - maxPickerArrowOffset);
                            pickerArrowOffset = maxPickerArrowOffset;
                        }
                    }
                    else {
                        pickerArrowOffset = (data.left + (data.width * 0.3)) - x;
                    }
                    picker.show(element, maxHeight, pickerWidth, pickerArrowSize, Math.max(0, pickerArrowOffset));
                    pickerAnchor = { x, y };
                }
                return pickerAnchor;
            },
            onHide: (data) => {
                if (!data?.didPick) {
                    picker.restoreViewState();
                }
                this._breadcrumbsPickerShowing = false;
                this._updateCkBreadcrumbsActive();
                if (data?.source === this) {
                    this._widget.setFocused(undefined);
                    this._widget.setSelection(undefined);
                }
                picker.dispose();
            }
        });
    }
    _updateCkBreadcrumbsActive() {
        const value = this._widget.isDOMFocused() || this._breadcrumbsPickerShowing;
        this._ckBreadcrumbsActive.set(value);
    }
    async _revealInEditor(event, element, group, pinned = false) {
        if (element instanceof FileElement) {
            if (element.kind === FileKind.FILE) {
                await this._editorService.openEditor({ resource: element.uri, options: { pinned } }, group);
            }
            else {
                // show next picker
                const items = this._widget.getItems();
                const idx = items.indexOf(event.item);
                this._widget.setFocused(items[idx + 1]);
                this._widget.setSelection(items[idx + 1], BreadcrumbsControl_1.Payload_Pick);
            }
        }
        else {
            element.outline.reveal(element, { pinned }, group === SIDE_GROUP, false);
        }
    }
    _getEditorGroup(data) {
        if (data === BreadcrumbsControl_1.Payload_RevealAside) {
            return SIDE_GROUP;
        }
        else if (data === BreadcrumbsControl_1.Payload_Reveal) {
            return ACTIVE_GROUP;
        }
        else {
            return undefined;
        }
    }
};
BreadcrumbsControl = BreadcrumbsControl_1 = __decorate([
    __param(3, IContextKeyService),
    __param(4, IContextViewService),
    __param(5, IInstantiationService),
    __param(6, IQuickInputService),
    __param(7, IFileService),
    __param(8, IEditorService),
    __param(9, ILabelService),
    __param(10, IConfigurationService),
    __param(11, IBreadcrumbsService)
], BreadcrumbsControl);
export { BreadcrumbsControl };
let BreadcrumbsControlFactory = class BreadcrumbsControlFactory {
    get control() { return this._control; }
    get onDidEnablementChange() { return this._onDidEnablementChange.event; }
    get onDidVisibilityChange() { return this._onDidVisibilityChange.event; }
    constructor(_container, _editorGroup, _options, configurationService, _instantiationService, fileService) {
        this._container = _container;
        this._editorGroup = _editorGroup;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
        this._controlDisposables = new DisposableStore();
        this._onDidEnablementChange = this._disposables.add(new Emitter());
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        const config = this._disposables.add(BreadcrumbsConfig.IsEnabled.bindTo(configurationService));
        this._disposables.add(config.onDidChange(() => {
            const value = config.getValue();
            if (!value && this._control) {
                this._controlDisposables.clear();
                this._control = undefined;
                this._onDidEnablementChange.fire();
            }
            else if (value && !this._control) {
                this._control = this.createControl();
                this._control.update();
                this._onDidEnablementChange.fire();
            }
        }));
        if (config.getValue()) {
            this._control = this.createControl();
        }
        this._disposables.add(fileService.onDidChangeFileSystemProviderRegistrations(e => {
            if (this._control?.model && this._control.model.resource.scheme !== e.scheme) {
                // ignore if the scheme of the breadcrumbs resource is not affected
                return;
            }
            if (this._control?.update()) {
                this._onDidEnablementChange.fire();
            }
        }));
    }
    createControl() {
        const control = this._controlDisposables.add(this._instantiationService.createInstance(BreadcrumbsControl, this._container, this._options, this._editorGroup));
        this._controlDisposables.add(control.onDidVisibilityChange(() => this._onDidVisibilityChange.fire()));
        return control;
    }
    dispose() {
        this._disposables.dispose();
        this._controlDisposables.dispose();
    }
};
BreadcrumbsControlFactory = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IFileService)
], BreadcrumbsControlFactory);
export { BreadcrumbsControlFactory };
//#region commands
// toggle command
registerAction2(class ToggleBreadcrumb extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.toggle',
            title: localize2('cmd.toggle', "Toggle Breadcrumbs"),
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.breadcrumbs.enabled', true),
                title: localize('cmd.toggle2', "Toggle Breadcrumbs"),
                mnemonicTitle: localize({ key: 'miBreadcrumbs2', comment: ['&& denotes a mnemonic'] }, "&&Breadcrumbs")
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 2 },
                { id: MenuId.NotebookToolbar, group: 'notebookLayout', order: 2 },
                { id: MenuId.StickyScrollContext },
                { id: MenuId.NotebookStickyScrollContext, group: 'notebookView', order: 2 },
                { id: MenuId.NotebookToolbarContext, group: 'notebookView', order: 2 }
            ]
        });
    }
    run(accessor) {
        const config = accessor.get(IConfigurationService);
        const value = BreadcrumbsConfig.IsEnabled.bindTo(config).getValue();
        BreadcrumbsConfig.IsEnabled.bindTo(config).updateValue(!value);
    }
});
// focus/focus-and-select
function focusAndSelectHandler(accessor, select) {
    // find widget and focus/select
    const groups = accessor.get(IEditorGroupsService);
    const breadcrumbs = accessor.get(IBreadcrumbsService);
    const widget = breadcrumbs.getWidget(groups.activeGroup.id);
    if (widget) {
        const item = widget.getItems().at(-1);
        widget.setFocused(item);
        if (select) {
            widget.setSelection(item, BreadcrumbsControl.Payload_Pick);
        }
    }
}
registerAction2(class FocusAndSelectBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focusAndSelect',
            title: localize2('cmd.focusAndSelect', "Focus and Select Breadcrumbs"),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, true);
    }
});
registerAction2(class FocusBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focus',
            title: localize2('cmd.focus', "Focus Breadcrumbs"),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 85 /* KeyCode.Semicolon */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, false);
    }
});
// this commands is only enabled when breadcrumbs are
// disabled which it then enables and focuses
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.toggleToOn',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
    when: ContextKeyExpr.not('config.breadcrumbs.enabled'),
    handler: async (accessor) => {
        const instant = accessor.get(IInstantiationService);
        const config = accessor.get(IConfigurationService);
        // check if enabled and iff not enable
        const isEnabled = BreadcrumbsConfig.IsEnabled.bindTo(config);
        if (!isEnabled.getValue()) {
            await isEnabled.updateValue(true);
            await timeout(50); // hacky - the widget might not be ready yet...
        }
        return instant.invokeFunction(focusAndSelectHandler, true);
    }
});
// navigation
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */],
    mac: {
        primary: 17 /* KeyCode.RightArrow */,
        secondary: [512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */],
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNextWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPreviousWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 3 /* KeyCode.Enter */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Pick);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 10 /* KeyCode.Space */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Reveal);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectEditor',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 9 /* KeyCode.Escape */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setFocused(undefined);
        widget.setSelection(undefined);
        groups.activeGroup.activeEditorPane?.focus();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocusedFromTreeAside',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const editors = accessor.get(IEditorService);
        const lists = accessor.get(IListService);
        const tree = lists.lastFocusedList;
        if (!(tree instanceof WorkbenchDataTree) && !(tree instanceof WorkbenchAsyncDataTree)) {
            return;
        }
        const element = tree.getFocus()[0];
        if (URI.isUri(element?.resource)) {
            // IFileStat: open file in editor
            return editors.openEditor({
                resource: element.resource,
                options: { pinned: true }
            }, SIDE_GROUP);
        }
        // IOutline: check if this the outline and iff so reveal element
        const input = tree.getInput();
        if (input && typeof input.outlineKind === 'string') {
            return input.reveal(element, {
                pinned: true,
                preserveFocus: false
            }, true, false);
        }
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFtRCxNQUFNLDhEQUE4RCxDQUFDO0FBQ25LLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFv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