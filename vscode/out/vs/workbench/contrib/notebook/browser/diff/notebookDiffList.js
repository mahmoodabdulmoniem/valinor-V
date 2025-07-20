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
var CellDiffPlaceholderRenderer_1, NotebookDocumentMetadataDiffRenderer_1, CellDiffSingleSideRenderer_1, CellDiffSideBySideRenderer_1;
import './notebookDiff.css';
import * as DOM from '../../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../../base/browser/domStylesheets.js';
import { isMonacoEditor, MouseController } from '../../../../../base/browser/ui/list/listWidget.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { DIFF_CELL_MARGIN } from './notebookDiffEditorBrowser.js';
import { CellDiffPlaceholderElement, CollapsedCellOverlayWidget, DeletedElement, getOptimizedNestedCodeEditorWidgetOptions, InsertElement, ModifiedElement, NotebookDocumentMetadataElement, UnchangedCellOverlayWidget } from './diffComponents.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { CodiconActionViewItem } from '../view/cellParts/cellActionView.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { WorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { fixedDiffEditorOptions, fixedEditorOptions } from './diffCellEditorOptions.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { localize } from '../../../../../nls.js';
import { EditorExtensionsRegistry } from '../../../../../editor/browser/editorExtensions.js';
let NotebookCellTextDiffListDelegate = class NotebookCellTextDiffListDelegate {
    constructor(targetWindow, configurationService) {
        this.configurationService = configurationService;
        const editorOptions = this.configurationService.getValue('editor');
        this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value).lineHeight;
    }
    getHeight(element) {
        return element.getHeight(this.lineHeight);
    }
    hasDynamicHeight(element) {
        return false;
    }
    getTemplateId(element) {
        switch (element.type) {
            case 'delete':
            case 'insert':
                return CellDiffSingleSideRenderer.TEMPLATE_ID;
            case 'modified':
            case 'unchanged':
                return CellDiffSideBySideRenderer.TEMPLATE_ID;
            case 'placeholder':
                return CellDiffPlaceholderRenderer.TEMPLATE_ID;
            case 'modifiedMetadata':
            case 'unchangedMetadata':
                return NotebookDocumentMetadataDiffRenderer.TEMPLATE_ID;
        }
    }
};
NotebookCellTextDiffListDelegate = __decorate([
    __param(1, IConfigurationService)
], NotebookCellTextDiffListDelegate);
export { NotebookCellTextDiffListDelegate };
let CellDiffPlaceholderRenderer = class CellDiffPlaceholderRenderer {
    static { CellDiffPlaceholderRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_placeholder'; }
    constructor(notebookEditor, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return CellDiffPlaceholderRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-placeholder-body');
        DOM.append(container, body);
        const elementDisposables = new DisposableStore();
        const marginOverlay = new CollapsedCellOverlayWidget(body);
        const contents = DOM.append(body, DOM.$('.contents'));
        const placeholder = DOM.append(contents, DOM.$('span.text', { title: localize('notebook.diff.hiddenCells.expandAll', 'Double click to show') }));
        return {
            body,
            container,
            placeholder,
            marginOverlay,
            elementDisposables
        };
    }
    renderElement(element, index, templateData) {
        templateData.body.classList.remove('left', 'right', 'full');
        templateData.elementDisposables.add(this.instantiationService.createInstance(CellDiffPlaceholderElement, element, templateData));
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
};
CellDiffPlaceholderRenderer = CellDiffPlaceholderRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], CellDiffPlaceholderRenderer);
export { CellDiffPlaceholderRenderer };
let NotebookDocumentMetadataDiffRenderer = class NotebookDocumentMetadataDiffRenderer {
    static { NotebookDocumentMetadataDiffRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'notebook_metadata_diff_side_by_side'; }
    constructor(notebookEditor, instantiationService, contextMenuService, keybindingService, menuService, contextKeyService, notificationService, themeService, accessibilityService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.themeService = themeService;
        this.accessibilityService = accessibilityService;
    }
    get templateId() {
        return NotebookDocumentMetadataDiffRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const inputToolbarContainer = DOM.append(sourceContainer, DOM.$('.editor-input-toolbar-container'));
        const cellToolbarContainer = DOM.append(inputToolbarContainer, DOM.$('div.property-toolbar'));
        const toolbar = this.instantiationService.createInstance(WorkbenchToolBar, cellToolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    const item = new CodiconActionViewItem(action, { hoverDelegate: options.hoverDelegate }, this.keybindingService, this.notificationService, this.contextKeyService, this.themeService, this.contextMenuService, this.accessibilityService);
                    return item;
                }
                return undefined;
            },
            highlightToggledItems: true
        });
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        const marginOverlay = new UnchangedCellOverlayWidget(body);
        const elementDisposables = new DisposableStore();
        return {
            body,
            container,
            diffEditorContainer,
            cellHeaderContainer,
            sourceEditor: editor,
            editorContainer,
            inputToolbarContainer,
            toolbar,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            marginOverlay,
            elementDisposables
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildDiffEditorWidget(this.instantiationService, this.notebookEditor, sourceContainer, { readOnly: true });
    }
    renderElement(element, index, templateData) {
        templateData.body.classList.remove('full');
        templateData.elementDisposables.add(this.instantiationService.createInstance(NotebookDocumentMetadataElement, this.notebookEditor, element, templateData));
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.toolbar?.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        if (templateData.toolbar) {
            templateData.toolbar.context = undefined;
        }
        templateData.elementDisposables.clear();
    }
};
NotebookDocumentMetadataDiffRenderer = NotebookDocumentMetadataDiffRenderer_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, INotificationService),
    __param(7, IThemeService),
    __param(8, IAccessibilityService)
], NotebookDocumentMetadataDiffRenderer);
export { NotebookDocumentMetadataDiffRenderer };
let CellDiffSingleSideRenderer = class CellDiffSingleSideRenderer {
    static { CellDiffSingleSideRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_single'; }
    constructor(notebookEditor, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return CellDiffSingleSideRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const diagonalFill = DOM.append(body, DOM.$('.diagonal-fill'));
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const metadataHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-header-container'));
        const metadataInfoContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-info-container'));
        const outputHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.output-header-container'));
        const outputInfoContainer = DOM.append(diffEditorContainer, DOM.$('.output-info-container'));
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        return {
            body,
            container,
            editorContainer,
            diffEditorContainer,
            diagonalFill,
            cellHeaderContainer,
            sourceEditor: editor,
            metadataHeaderContainer,
            metadataInfoContainer,
            outputHeaderContainer,
            outputInfoContainer,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            elementDisposables: new DisposableStore()
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildSourceEditor(this.instantiationService, this.notebookEditor, sourceContainer);
    }
    renderElement(element, index, templateData) {
        templateData.body.classList.remove('left', 'right', 'full');
        switch (element.type) {
            case 'delete':
                templateData.elementDisposables.add(this.instantiationService.createInstance(DeletedElement, this.notebookEditor, element, templateData));
                return;
            case 'insert':
                templateData.elementDisposables.add(this.instantiationService.createInstance(InsertElement, this.notebookEditor, element, templateData));
                return;
            default:
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
};
CellDiffSingleSideRenderer = CellDiffSingleSideRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], CellDiffSingleSideRenderer);
export { CellDiffSingleSideRenderer };
let CellDiffSideBySideRenderer = class CellDiffSideBySideRenderer {
    static { CellDiffSideBySideRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_side_by_side'; }
    constructor(notebookEditor, instantiationService, contextMenuService, keybindingService, menuService, contextKeyService, notificationService, themeService, accessibilityService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.themeService = themeService;
        this.accessibilityService = accessibilityService;
    }
    get templateId() {
        return CellDiffSideBySideRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const inputToolbarContainer = DOM.append(sourceContainer, DOM.$('.editor-input-toolbar-container'));
        const cellToolbarContainer = DOM.append(inputToolbarContainer, DOM.$('div.property-toolbar'));
        const toolbar = this.instantiationService.createInstance(WorkbenchToolBar, cellToolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    const item = new CodiconActionViewItem(action, { hoverDelegate: options.hoverDelegate }, this.keybindingService, this.notificationService, this.contextKeyService, this.themeService, this.contextMenuService, this.accessibilityService);
                    return item;
                }
                return undefined;
            },
            highlightToggledItems: true
        });
        const metadataHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-header-container'));
        const metadataInfoContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-info-container'));
        const outputHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.output-header-container'));
        const outputInfoContainer = DOM.append(diffEditorContainer, DOM.$('.output-info-container'));
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        const marginOverlay = new UnchangedCellOverlayWidget(body);
        const elementDisposables = new DisposableStore();
        return {
            body,
            container,
            diffEditorContainer,
            cellHeaderContainer,
            sourceEditor: editor,
            editorContainer,
            inputToolbarContainer,
            toolbar,
            metadataHeaderContainer,
            metadataInfoContainer,
            outputHeaderContainer,
            outputInfoContainer,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            marginOverlay,
            elementDisposables
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildDiffEditorWidget(this.instantiationService, this.notebookEditor, sourceContainer);
    }
    renderElement(element, index, templateData) {
        templateData.body.classList.remove('left', 'right', 'full');
        switch (element.type) {
            case 'unchanged':
                templateData.elementDisposables.add(this.instantiationService.createInstance(ModifiedElement, this.notebookEditor, element, templateData));
                return;
            case 'modified':
                templateData.elementDisposables.add(this.instantiationService.createInstance(ModifiedElement, this.notebookEditor, element, templateData));
                return;
            default:
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.toolbar?.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        if (templateData.toolbar) {
            templateData.toolbar.context = undefined;
        }
        templateData.elementDisposables.clear();
    }
};
CellDiffSideBySideRenderer = CellDiffSideBySideRenderer_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, INotificationService),
    __param(7, IThemeService),
    __param(8, IAccessibilityService)
], CellDiffSideBySideRenderer);
export { CellDiffSideBySideRenderer };
export class NotebookMouseController extends MouseController {
    onViewPointer(e) {
        if (isMonacoEditor(e.browserEvent.target)) {
            const focus = typeof e.index === 'undefined' ? [] : [e.index];
            this.list.setFocus(focus, e.browserEvent);
        }
        else {
            super.onViewPointer(e);
        }
    }
}
let NotebookTextDiffList = class NotebookTextDiffList extends WorkbenchList {
    get rowsContainer() {
        return this.view.containerDomNode;
    }
    constructor(listUser, container, delegate, renderers, contextKeyService, options, listService, configurationService, instantiationService) {
        super(listUser, container, delegate, renderers, options, contextKeyService, listService, configurationService, instantiationService);
    }
    createMouseController(options) {
        return new NotebookMouseController(this);
    }
    getCellViewScrollTop(element) {
        const index = this.indexOf(element);
        // if (index === undefined || index < 0 || index >= this.length) {
        // 	this._getViewIndexUpperBound(element);
        // 	throw new ListError(this.listUser, `Invalid index ${index}`);
        // }
        return this.view.elementTop(index);
    }
    getScrollHeight() {
        return this.view.scrollHeight;
    }
    triggerScrollFromMouseWheelEvent(browserEvent) {
        this.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    clear() {
        super.splice(0, this.length);
    }
    updateElementHeight2(element, size) {
        const viewIndex = this.indexOf(element);
        const focused = this.getFocus();
        this.view.updateElementHeight(viewIndex, size, focused.length ? focused[0] : null);
    }
    style(styles) {
        const selectorSuffix = this.view.domId;
        if (!this.styleElement) {
            this.styleElement = domStylesheets.createStyleSheet(this.view.domNode);
        }
        const suffix = selectorSuffix && `.${selectorSuffix}`;
        const content = [];
        if (styles.listBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows { background: ${styles.listBackground}; }`);
        }
        if (styles.listFocusBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listFocusAndSelectionBackground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
        }
        if (styles.listFocusAndSelectionForeground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
        }
        if (styles.listInactiveFocusBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color:  ${styles.listInactiveFocusBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color:  ${styles.listInactiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list${suffix}:not(.drop-target) > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { background-color:  ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
        }
        if (styles.listSelectionOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listFocusOutline) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
        }
        if (styles.listInactiveFocusOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        if (styles.listDropOverBackground) {
            content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-row.drop-target { background-color: ${styles.listDropOverBackground} !important; color: inherit !important; }
			`);
        }
        const newStyles = content.join('\n');
        if (newStyles !== this.styleElement.textContent) {
            this.styleElement.textContent = newStyles;
        }
    }
};
NotebookTextDiffList = __decorate([
    __param(6, IListService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService)
], NotebookTextDiffList);
export { NotebookTextDiffList };
function buildDiffEditorWidget(instantiationService, notebookEditor, sourceContainer, options = {}) {
    const editorContainer = DOM.append(sourceContainer, DOM.$('.editor-container'));
    const editor = instantiationService.createInstance(DiffEditorWidget, editorContainer, {
        ...fixedDiffEditorOptions,
        overflowWidgetsDomNode: notebookEditor.getOverflowContainerDomNode(),
        originalEditable: false,
        ignoreTrimWhitespace: false,
        automaticLayout: false,
        dimension: {
            height: 0,
            width: 0
        },
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: false,
        ...options
    }, {
        originalEditor: getOptimizedNestedCodeEditorWidgetOptions(),
        modifiedEditor: getOptimizedNestedCodeEditorWidgetOptions()
    });
    return {
        editor,
        editorContainer
    };
}
function buildSourceEditor(instantiationService, notebookEditor, sourceContainer, options = {}) {
    const editorContainer = DOM.append(sourceContainer, DOM.$('.editor-container'));
    const skipContributions = [
        'editor.contrib.emptyTextEditorHint'
    ];
    const editor = instantiationService.createInstance(CodeEditorWidget, editorContainer, {
        ...fixedEditorOptions,
        glyphMargin: false,
        dimension: {
            width: (notebookEditor.getLayoutInfo().width - 2 * DIFF_CELL_MARGIN) / 2 - 18,
            height: 0
        },
        automaticLayout: false,
        overflowWidgetsDomNode: notebookEditor.getOverflowContainerDomNode(),
        allowVariableLineHeights: false,
        readOnly: true,
    }, {
        contributions: EditorExtensionsRegistry.getEditorContributions().filter(c => skipContributions.indexOf(c.id) === -1)
    });
    return { editor, editorContainer };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZkxpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0JBQW9CLENBQUM7QUFFNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssY0FBYyxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBNkIsY0FBYyxFQUFvQixlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqSixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBeUIsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJGLE9BQU8sRUFBeUcsZ0JBQWdCLEVBQXNFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN08sT0FBTyxFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLGNBQWMsRUFBRSx5Q0FBeUMsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLCtCQUErQixFQUFFLDBCQUEwQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDclAsT0FBTyxF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