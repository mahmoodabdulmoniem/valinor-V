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
var ActionButtonRenderer_1, InputRenderer_1, ResourceGroupRenderer_1, ResourceRenderer_1, SCMInputWidget_1;
import './media/scm.css';
import { Event, Emitter } from '../../../../base/common/event.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { Disposable, DisposableStore, combinedDisposable, dispose, toDisposable, MutableDisposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { ViewPane, ViewAction } from '../../../browser/parts/views/viewPane.js';
import { append, $, Dimension, trackFocus, clearNode, isPointerEvent, isActiveElement } from '../../../../base/browser/dom.js';
import { asCSSUrl } from '../../../../base/browser/cssValue.js';
import { ISCMViewService, ISCMService, SCMInputChangeReason, VIEW_PANE_ID } from '../common/scm.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextViewService, IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { MenuItemAction, IMenuService, registerAction2, MenuId, MenuRegistry, Action2 } from '../../../../platform/actions/common/actions.js';
import { ActionRunner, Action, Separator, toAction } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isSCMResource, isSCMResourceGroup, isSCMRepository, isSCMInput, collectContextMenuActions, getActionViewItemProvider, isSCMActionButton, isSCMViewService, isSCMResourceNode, connectPrimaryMenu } from './util.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { disposableTimeout, Sequencer, ThrottledDelayer, Throttler } from '../../../../base/common/async.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { EditorDictation } from '../../codeEditor/browser/dictation/editorDictation.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import * as platform from '../../../../base/common/platform.js';
import { compare, format } from '../../../../base/common/strings.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { createActionViewItem, getFlatActionBarActions, getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MarkdownRenderer, openLinkFromMarkdown } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Button, ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { RepositoryContextKeys } from './scmViewService.js';
import { DragAndDropController } from '../../../../editor/contrib/dnd/browser/dnd.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { defaultButtonStyles, defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { Schemas } from '../../../../base/common/network.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { CodeDataTransfers } from '../../../../platform/dnd/browser/dnd.js';
import { FormatOnType } from '../../../../editor/contrib/format/browser/formatActions.js';
import { EditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { clamp, rot } from '../../../../base/common/numbers.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { OpenScmGroupAction } from '../../multiDiffEditor/browser/scmMultiDiffSourceResolver.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { PlaceholderTextContribution } from '../../../../editor/contrib/placeholderText/browser/placeholderTextContribution.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import product from '../../../../platform/product/common/product.js';
import { CHAT_SETUP_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
function processResourceFilterData(uri, filterData) {
    if (!filterData) {
        return [undefined, undefined];
    }
    if (!filterData.label) {
        const matches = createMatches(filterData);
        return [matches, undefined];
    }
    const fileName = basename(uri);
    const label = filterData.label;
    const pathLength = label.length - fileName.length;
    const matches = createMatches(filterData.score);
    // FileName match
    if (label === fileName) {
        return [matches, undefined];
    }
    // FilePath match
    const labelMatches = [];
    const descriptionMatches = [];
    for (const match of matches) {
        if (match.start > pathLength) {
            // Label match
            labelMatches.push({
                start: match.start - pathLength,
                end: match.end - pathLength
            });
        }
        else if (match.end < pathLength) {
            // Description match
            descriptionMatches.push(match);
        }
        else {
            // Spanning match
            labelMatches.push({
                start: 0,
                end: match.end - pathLength
            });
            descriptionMatches.push({
                start: match.start,
                end: pathLength
            });
        }
    }
    return [labelMatches, descriptionMatches];
}
let ActionButtonRenderer = class ActionButtonRenderer {
    static { ActionButtonRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 28; }
    static { this.TEMPLATE_ID = 'actionButton'; }
    get templateId() { return ActionButtonRenderer_1.TEMPLATE_ID; }
    constructor(commandService, contextMenuService, notificationService) {
        this.commandService = commandService;
        this.contextMenuService = contextMenuService;
        this.notificationService = notificationService;
        this.actionButtons = new Map();
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Use default cursor & disable hover for list item
        container.parentElement.parentElement.classList.add('cursor-default', 'force-no-hover');
        const buttonContainer = append(container, $('.button-container'));
        const actionButton = new SCMActionButton(buttonContainer, this.contextMenuService, this.commandService, this.notificationService);
        return { actionButton, disposable: Disposable.None, templateDisposable: actionButton };
    }
    renderElement(node, index, templateData) {
        templateData.disposable.dispose();
        const disposables = new DisposableStore();
        const actionButton = node.element;
        templateData.actionButton.setButton(node.element.button);
        // Remember action button
        this.actionButtons.set(actionButton, templateData.actionButton);
        disposables.add({ dispose: () => this.actionButtons.delete(actionButton) });
        templateData.disposable = disposables;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    focusActionButton(actionButton) {
        this.actionButtons.get(actionButton)?.focus();
    }
    disposeElement(node, index, template) {
        template.disposable.dispose();
    }
    disposeTemplate(templateData) {
        templateData.disposable.dispose();
        templateData.templateDisposable.dispose();
    }
};
ActionButtonRenderer = ActionButtonRenderer_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IContextMenuService),
    __param(2, INotificationService)
], ActionButtonRenderer);
export { ActionButtonRenderer };
class SCMTreeDragAndDrop {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    getDragURI(element) {
        if (isSCMResource(element)) {
            return element.sourceUri.toString();
        }
        return null;
    }
    onDragStart(data, originalEvent) {
        const items = SCMTreeDragAndDrop.getResourcesFromDragAndDropData(data);
        if (originalEvent.dataTransfer && items?.length) {
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, items, originalEvent));
            const fileResources = items.filter(s => s.scheme === Schemas.file).map(r => r.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const element = elements[0];
            if (isSCMResource(element)) {
                return basename(element.sourceUri);
            }
        }
        return String(elements.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return true;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
    static getResourcesFromDragAndDropData(data) {
        const uris = [];
        for (const element of [...data.context ?? [], ...data.elements]) {
            if (isSCMResource(element)) {
                uris.push(element.sourceUri);
            }
        }
        return uris;
    }
    dispose() { }
}
let InputRenderer = class InputRenderer {
    static { InputRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 26; }
    static { this.TEMPLATE_ID = 'input'; }
    get templateId() { return InputRenderer_1.TEMPLATE_ID; }
    constructor(outerLayout, overflowWidgetsDomNode, updateHeight, instantiationService) {
        this.outerLayout = outerLayout;
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.updateHeight = updateHeight;
        this.instantiationService = instantiationService;
        this.inputWidgets = new Map();
        this.contentHeights = new WeakMap();
        this.editorSelections = new WeakMap();
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Disable hover for list item
        container.parentElement.parentElement.classList.add('force-no-hover');
        const templateDisposable = new DisposableStore();
        const inputElement = append(container, $('.scm-input'));
        const inputWidget = this.instantiationService.createInstance(SCMInputWidget, inputElement, this.overflowWidgetsDomNode);
        templateDisposable.add(inputWidget);
        return { inputWidget, inputWidgetHeight: InputRenderer_1.DEFAULT_HEIGHT, elementDisposables: new DisposableStore(), templateDisposable };
    }
    renderElement(node, index, templateData) {
        const input = node.element;
        templateData.inputWidget.input = input;
        // Remember widget
        this.inputWidgets.set(input, templateData.inputWidget);
        templateData.elementDisposables.add({
            dispose: () => this.inputWidgets.delete(input)
        });
        // Widget cursor selections
        const selections = this.editorSelections.get(input);
        if (selections) {
            templateData.inputWidget.selections = selections;
        }
        templateData.elementDisposables.add(toDisposable(() => {
            const selections = templateData.inputWidget.selections;
            if (selections) {
                this.editorSelections.set(input, selections);
            }
        }));
        // Reset widget height so it's recalculated
        templateData.inputWidgetHeight = InputRenderer_1.DEFAULT_HEIGHT;
        // Rerender the element whenever the editor content height changes
        const onDidChangeContentHeight = () => {
            const contentHeight = templateData.inputWidget.getContentHeight();
            this.contentHeights.set(input, contentHeight);
            if (templateData.inputWidgetHeight !== contentHeight) {
                this.updateHeight(input, contentHeight + 10);
                templateData.inputWidgetHeight = contentHeight;
                templateData.inputWidget.layout();
            }
        };
        const startListeningContentHeightChange = () => {
            templateData.elementDisposables.add(templateData.inputWidget.onDidChangeContentHeight(onDidChangeContentHeight));
            onDidChangeContentHeight();
        };
        // Setup height change listener on next tick
        disposableTimeout(startListeningContentHeightChange, 0, templateData.elementDisposables);
        // Layout the editor whenever the outer layout happens
        const layoutEditor = () => templateData.inputWidget.layout();
        templateData.elementDisposables.add(this.outerLayout.onDidChange(layoutEditor));
        layoutEditor();
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
    }
    getHeight(input) {
        return (this.contentHeights.get(input) ?? InputRenderer_1.DEFAULT_HEIGHT) + 10;
    }
    getRenderedInputWidget(input) {
        return this.inputWidgets.get(input);
    }
    getFocusedInput() {
        for (const [input, inputWidget] of this.inputWidgets) {
            if (inputWidget.hasFocus()) {
                return input;
            }
        }
        return undefined;
    }
    clearValidation() {
        for (const [, inputWidget] of this.inputWidgets) {
            inputWidget.clearValidation();
        }
    }
};
InputRenderer = InputRenderer_1 = __decorate([
    __param(3, IInstantiationService)
], InputRenderer);
let ResourceGroupRenderer = class ResourceGroupRenderer {
    static { ResourceGroupRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource group'; }
    get templateId() { return ResourceGroupRenderer_1.TEMPLATE_ID; }
    constructor(actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, menuService, scmViewService, telemetryService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        const element = append(container, $('.resource-group'));
        const name = append(element, $('.name'));
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(element, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const disposables = combinedDisposable(actionBar, count);
        return { name, count, actionBar, elementDisposables: new DisposableStore(), disposables };
    }
    renderElement(node, index, template) {
        const group = node.element;
        template.name.textContent = group.label;
        template.count.setCount(group.resources.length);
        const menus = this.scmViewService.menus.getRepositoryMenus(group.provider);
        template.elementDisposables.add(connectPrimaryMenu(menus.getResourceGroupMenu(group), primary => {
            template.actionBar.setActions(primary);
        }, 'inline'));
        template.actionBar.context = group;
    }
    renderCompressedElements(node) {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
};
ResourceGroupRenderer = ResourceGroupRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, IMenuService),
    __param(7, ISCMViewService),
    __param(8, ITelemetryService)
], ResourceGroupRenderer);
class RepositoryPaneActionRunner extends ActionRunner {
    constructor(getSelectedResources) {
        super();
        this.getSelectedResources = getSelectedResources;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const isContextResourceGroup = isSCMResourceGroup(context);
        const selection = this.getSelectedResources().filter(r => isSCMResourceGroup(r) === isContextResourceGroup);
        const contextIsSelected = selection.some(s => s === context);
        const actualContext = contextIsSelected ? selection : [context];
        const args = actualContext.map(e => ResourceTree.isResourceNode(e) ? ResourceTree.collect(e) : [e]).flat();
        await action.run(...args);
    }
}
let ResourceRenderer = class ResourceRenderer {
    static { ResourceRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource'; }
    get templateId() { return ResourceRenderer_1.TEMPLATE_ID; }
    constructor(viewMode, labels, actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, labelService, menuService, scmViewService, telemetryService, themeService) {
        this.viewMode = viewMode;
        this.labels = labels;
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
        this.themeService = themeService;
        this.disposables = new DisposableStore();
        this.renderedResources = new Map();
        themeService.onDidColorThemeChange(this.onDidColorThemeChange, this, this.disposables);
    }
    renderTemplate(container) {
        const element = append(container, $('.resource'));
        const name = append(element, $('.name'));
        const fileLabel = this.labels.create(name, { supportDescriptionHighlights: true, supportHighlights: true });
        const actionsContainer = append(fileLabel.element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const decorationIcon = append(element, $('.decoration-icon'));
        const actionBarMenuListener = new MutableDisposable();
        const disposables = combinedDisposable(actionBar, fileLabel, actionBarMenuListener);
        return { element, name, fileLabel, decorationIcon, actionBar, actionBarMenu: undefined, actionBarMenuListener, elementDisposables: new DisposableStore(), disposables };
    }
    renderElement(node, index, template) {
        const resourceOrFolder = node.element;
        const iconResource = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.element : resourceOrFolder;
        const uri = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.uri : resourceOrFolder.sourceUri;
        const fileKind = ResourceTree.isResourceNode(resourceOrFolder) ? FileKind.FOLDER : FileKind.FILE;
        const tooltip = !ResourceTree.isResourceNode(resourceOrFolder) && resourceOrFolder.decorations.tooltip || '';
        const hidePath = this.viewMode() === "tree" /* ViewMode.Tree */;
        let matches;
        let descriptionMatches;
        let strikethrough;
        if (ResourceTree.isResourceNode(resourceOrFolder)) {
            if (resourceOrFolder.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.element.resourceGroup.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder.element));
                template.element.classList.toggle('faded', resourceOrFolder.element.decorations.faded);
                strikethrough = resourceOrFolder.element.decorations.strikeThrough;
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.context.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceFolderMenu(resourceOrFolder.context));
                matches = createMatches(node.filterData);
                template.element.classList.remove('faded');
            }
        }
        else {
            const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.resourceGroup.provider);
            this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder));
            [matches, descriptionMatches] = processResourceFilterData(uri, node.filterData);
            template.element.classList.toggle('faded', resourceOrFolder.decorations.faded);
            strikethrough = resourceOrFolder.decorations.strikeThrough;
        }
        const renderedData = {
            tooltip, uri, fileLabelOptions: { hidePath, fileKind, matches, descriptionMatches, strikethrough }, iconResource
        };
        this.renderIcon(template, renderedData);
        this.renderedResources.set(template, renderedData);
        template.elementDisposables.add(toDisposable(() => this.renderedResources.delete(template)));
        template.element.setAttribute('data-tooltip', tooltip);
    }
    disposeElement(resource, index, template) {
        template.elementDisposables.clear();
    }
    renderCompressedElements(node, index, template) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map(e => e.name);
        const fileKind = FileKind.FOLDER;
        const matches = createMatches(node.filterData);
        template.fileLabel.setResource({ resource: folder.uri, name: label }, {
            fileDecorations: { colors: false, badges: true },
            fileKind,
            matches,
            separator: this.labelService.getSeparator(folder.uri.scheme)
        });
        const menus = this.scmViewService.menus.getRepositoryMenus(folder.context.provider);
        this._renderActionBar(template, folder, menus.getResourceFolderMenu(folder.context));
        template.name.classList.remove('strike-through');
        template.element.classList.remove('faded');
        template.decorationIcon.style.display = 'none';
        template.decorationIcon.style.backgroundImage = '';
        template.element.setAttribute('data-tooltip', '');
    }
    disposeCompressedElements(node, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
    _renderActionBar(template, resourceOrFolder, menu) {
        if (!template.actionBarMenu || template.actionBarMenu !== menu) {
            template.actionBarMenu = menu;
            template.actionBarMenuListener.value = connectPrimaryMenu(menu, primary => {
                template.actionBar.setActions(primary);
            }, 'inline');
        }
        template.actionBar.context = resourceOrFolder;
    }
    onDidColorThemeChange() {
        for (const [template, data] of this.renderedResources) {
            this.renderIcon(template, data);
        }
    }
    renderIcon(template, data) {
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT ? data.iconResource?.decorations.icon : data.iconResource?.decorations.iconDark;
        template.fileLabel.setFile(data.uri, {
            ...data.fileLabelOptions,
            fileDecorations: { colors: false, badges: !icon },
        });
        if (icon) {
            if (ThemeIcon.isThemeIcon(icon)) {
                template.decorationIcon.className = `decoration-icon ${ThemeIcon.asClassName(icon)}`;
                if (icon.color) {
                    template.decorationIcon.style.color = theme.getColor(icon.color.id)?.toString() ?? '';
                }
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = '';
            }
            else {
                template.decorationIcon.className = 'decoration-icon';
                template.decorationIcon.style.color = '';
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = asCSSUrl(icon);
            }
            template.decorationIcon.title = data.tooltip;
        }
        else {
            template.decorationIcon.className = 'decoration-icon';
            template.decorationIcon.style.color = '';
            template.decorationIcon.style.display = 'none';
            template.decorationIcon.style.backgroundImage = '';
            template.decorationIcon.title = '';
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
ResourceRenderer = ResourceRenderer_1 = __decorate([
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, ILabelService),
    __param(9, IMenuService),
    __param(10, ISCMViewService),
    __param(11, ITelemetryService),
    __param(12, IThemeService)
], ResourceRenderer);
class ListDelegate {
    constructor(inputRenderer) {
        this.inputRenderer = inputRenderer;
    }
    getHeight(element) {
        if (isSCMInput(element)) {
            return this.inputRenderer.getHeight(element);
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.DEFAULT_HEIGHT + 8;
        }
        else {
            return 22;
        }
    }
    getTemplateId(element) {
        if (isSCMRepository(element)) {
            return RepositoryRenderer.TEMPLATE_ID;
        }
        else if (isSCMInput(element)) {
            return InputRenderer.TEMPLATE_ID;
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.TEMPLATE_ID;
        }
        else if (isSCMResourceGroup(element)) {
            return ResourceGroupRenderer.TEMPLATE_ID;
        }
        else if (isSCMResource(element) || isSCMResourceNode(element)) {
            return ResourceRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Unknown element');
        }
    }
}
class SCMTreeCompressionDelegate {
    isIncompressible(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.childrenCount === 0 || !element.parent || !element.parent.parent;
        }
        return true;
    }
}
class SCMTreeFilter {
    filter(element) {
        if (isSCMResourceGroup(element)) {
            return element.resources.length > 0 || !element.hideWhenEmpty;
        }
        else {
            return true;
        }
    }
}
export class SCMTreeSorter {
    constructor(viewMode, viewSortKey) {
        this.viewMode = viewMode;
        this.viewSortKey = viewSortKey;
    }
    compare(one, other) {
        if (isSCMRepository(one)) {
            if (!isSCMRepository(other)) {
                throw new Error('Invalid comparison');
            }
            return 0;
        }
        if (isSCMInput(one)) {
            return -1;
        }
        else if (isSCMInput(other)) {
            return 1;
        }
        if (isSCMActionButton(one)) {
            return -1;
        }
        else if (isSCMActionButton(other)) {
            return 1;
        }
        if (isSCMResourceGroup(one)) {
            return isSCMResourceGroup(other) ? 0 : -1;
        }
        // Resource (List)
        if (this.viewMode() === "list" /* ViewMode.List */) {
            // FileName
            if (this.viewSortKey() === "name" /* ViewSortKey.Name */) {
                const oneName = basename(one.sourceUri);
                const otherName = basename(other.sourceUri);
                return compareFileNames(oneName, otherName);
            }
            // Status
            if (this.viewSortKey() === "status" /* ViewSortKey.Status */) {
                const oneTooltip = one.decorations.tooltip ?? '';
                const otherTooltip = other.decorations.tooltip ?? '';
                if (oneTooltip !== otherTooltip) {
                    return compare(oneTooltip, otherTooltip);
                }
            }
            // Path (default)
            const onePath = one.sourceUri.fsPath;
            const otherPath = other.sourceUri.fsPath;
            return comparePaths(onePath, otherPath);
        }
        // Resource (Tree)
        const oneIsDirectory = ResourceTree.isResourceNode(one);
        const otherIsDirectory = ResourceTree.isResourceNode(other);
        if (oneIsDirectory !== otherIsDirectory) {
            return oneIsDirectory ? -1 : 1;
        }
        const oneName = ResourceTree.isResourceNode(one) ? one.name : basename(one.sourceUri);
        const otherName = ResourceTree.isResourceNode(other) ? other.name : basename(other.sourceUri);
        return compareFileNames(oneName, otherName);
    }
}
let SCMTreeKeyboardNavigationLabelProvider = class SCMTreeKeyboardNavigationLabelProvider {
    constructor(viewMode, labelService) {
        this.viewMode = viewMode;
        this.labelService = labelService;
    }
    getKeyboardNavigationLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.name;
        }
        else if (isSCMRepository(element) || isSCMInput(element) || isSCMActionButton(element)) {
            return undefined;
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // In List mode match using the file name and the path.
                // Since we want to match both on the file name and the
                // full path we return an array of labels. A match in the
                // file name takes precedence over a match in the path.
                const fileName = basename(element.sourceUri);
                const filePath = this.labelService.getUriLabel(element.sourceUri, { relative: true });
                return [fileName, filePath];
            }
            else {
                // In Tree mode only match using the file name
                return basename(element.sourceUri);
            }
        }
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        const folders = elements;
        return folders.map(e => e.name).join('/');
    }
};
SCMTreeKeyboardNavigationLabelProvider = __decorate([
    __param(1, ILabelService)
], SCMTreeKeyboardNavigationLabelProvider);
export { SCMTreeKeyboardNavigationLabelProvider };
function getSCMResourceId(element) {
    if (isSCMRepository(element)) {
        const provider = element.provider;
        return `repo:${provider.id}`;
    }
    else if (isSCMInput(element)) {
        const provider = element.repository.provider;
        return `input:${provider.id}`;
    }
    else if (isSCMActionButton(element)) {
        const provider = element.repository.provider;
        return `actionButton:${provider.id}`;
    }
    else if (isSCMResourceGroup(element)) {
        const provider = element.provider;
        return `resourceGroup:${provider.id}/${element.id}`;
    }
    else if (isSCMResource(element)) {
        const group = element.resourceGroup;
        const provider = group.provider;
        return `resource:${provider.id}/${group.id}/${element.sourceUri.toString()}`;
    }
    else if (isSCMResourceNode(element)) {
        const group = element.context;
        return `folder:${group.provider.id}/${group.id}/$FOLDER/${element.uri.toString()}`;
    }
    else {
        throw new Error('Invalid tree element');
    }
}
class SCMResourceIdentityProvider {
    getId(element) {
        return getSCMResourceId(element);
    }
}
let SCMAccessibilityProvider = class SCMAccessibilityProvider {
    constructor(accessibilityService, configurationService, keybindingService, labelService) {
        this.accessibilityService = accessibilityService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('scm', "Source Control Management");
    }
    getAriaLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return this.labelService.getUriLabel(element.uri, { relative: true, noPrefix: true }) || element.name;
        }
        else if (isSCMRepository(element)) {
            return `${element.provider.name} ${element.provider.label}`;
        }
        else if (isSCMInput(element)) {
            const verbosity = this.configurationService.getValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */) === true;
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return localize('scmInput', "Source Control Input");
            }
            const kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            return kbLabel
                ? localize('scmInputRow.accessibilityHelp', "Source Control Input, Use {0} to open Source Control Accessibility Help.", kbLabel)
                : localize('scmInputRow.accessibilityHelpNoKb', "Source Control Input, Run the Open Accessibility Help command for more information.");
        }
        else if (isSCMActionButton(element)) {
            return element.button?.command.title ?? '';
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            const result = [];
            result.push(basename(element.sourceUri));
            if (element.decorations.tooltip) {
                result.push(element.decorations.tooltip);
            }
            const path = this.labelService.getUriLabel(dirname(element.sourceUri), { relative: true, noPrefix: true });
            if (path) {
                result.push(path);
            }
            return result.join(', ');
        }
    }
};
SCMAccessibilityProvider = __decorate([
    __param(0, IAccessibilityService),
    __param(1, IConfigurationService),
    __param(2, IKeybindingService),
    __param(3, ILabelService)
], SCMAccessibilityProvider);
export { SCMAccessibilityProvider };
var ViewSortKey;
(function (ViewSortKey) {
    ViewSortKey["Path"] = "path";
    ViewSortKey["Name"] = "name";
    ViewSortKey["Status"] = "status";
})(ViewSortKey || (ViewSortKey = {}));
const Menus = {
    ViewSort: new MenuId('SCMViewSort'),
    Repositories: new MenuId('SCMRepositories'),
    ChangesSettings: new MenuId('SCMChangesSettings'),
};
export const ContextKeys = {
    SCMViewMode: new RawContextKey('scmViewMode', "list" /* ViewMode.List */),
    SCMViewSortKey: new RawContextKey('scmViewSortKey', "path" /* ViewSortKey.Path */),
    SCMViewAreAllRepositoriesCollapsed: new RawContextKey('scmViewAreAllRepositoriesCollapsed', false),
    SCMViewIsAnyRepositoryCollapsible: new RawContextKey('scmViewIsAnyRepositoryCollapsible', false),
    SCMProvider: new RawContextKey('scmProvider', undefined),
    SCMProviderRootUri: new RawContextKey('scmProviderRootUri', undefined),
    SCMProviderHasRootUri: new RawContextKey('scmProviderHasRootUri', undefined),
    SCMHistoryItemCount: new RawContextKey('scmHistoryItemCount', 0),
    SCMHistoryViewMode: new RawContextKey('scmHistoryViewMode', "list" /* ViewMode.List */),
    SCMCurrentHistoryItemRefHasRemote: new RawContextKey('scmCurrentHistoryItemRefHasRemote', false),
    SCMCurrentHistoryItemRefInFilter: new RawContextKey('scmCurrentHistoryItemRefInFilter', false),
    RepositoryCount: new RawContextKey('scmRepositoryCount', 0),
    RepositoryVisibilityCount: new RawContextKey('scmRepositoryVisibleCount', 0),
    RepositoryVisibility(repository) {
        return new RawContextKey(`scmRepositoryVisible:${repository.provider.id}`, false);
    }
};
MenuRegistry.appendMenuItem(MenuId.SCMTitle, {
    title: localize('sortAction', "View & Sort"),
    submenu: Menus.ViewSort,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0)),
    group: '0_view&sort',
    order: 1
});
MenuRegistry.appendMenuItem(Menus.ViewSort, {
    title: localize('repositories', "Repositories"),
    submenu: Menus.Repositories,
    when: ContextKeyExpr.greater(ContextKeys.RepositoryCount.key, 1),
    group: '0_repositories'
});
class RepositoryVisibilityAction extends Action2 {
    constructor(repository) {
        super({
            id: `workbench.scm.action.toggleRepositoryVisibility.${repository.provider.id}`,
            title: repository.provider.name,
            f1: false,
            precondition: ContextKeyExpr.or(ContextKeys.RepositoryVisibilityCount.notEqualsTo(1), ContextKeys.RepositoryVisibility(repository).isEqualTo(false)),
            toggled: ContextKeys.RepositoryVisibility(repository).isEqualTo(true),
            menu: { id: Menus.Repositories, group: '0_repositories' }
        });
        this.repository = repository;
    }
    run(accessor) {
        const scmViewService = accessor.get(ISCMViewService);
        scmViewService.toggleVisibility(this.repository);
    }
}
let RepositoryVisibilityActionController = class RepositoryVisibilityActionController {
    constructor(contextKeyService, scmViewService, scmService) {
        this.contextKeyService = contextKeyService;
        this.scmViewService = scmViewService;
        this.items = new Map();
        this.disposables = new DisposableStore();
        this.repositoryCountContextKey = ContextKeys.RepositoryCount.bindTo(contextKeyService);
        this.repositoryVisibilityCountContextKey = ContextKeys.RepositoryVisibilityCount.bindTo(contextKeyService);
        scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.disposables);
        scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposables);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        for (const repository of scmService.repositories) {
            this.onDidAddRepository(repository);
        }
    }
    onDidAddRepository(repository) {
        const action = registerAction2(class extends RepositoryVisibilityAction {
            constructor() {
                super(repository);
            }
        });
        const contextKey = ContextKeys.RepositoryVisibility(repository).bindTo(this.contextKeyService);
        contextKey.set(this.scmViewService.isVisible(repository));
        this.items.set(repository, {
            contextKey,
            dispose() {
                contextKey.reset();
                action.dispose();
            }
        });
        this.updateRepositoryContextKeys();
    }
    onDidRemoveRepository(repository) {
        this.items.get(repository)?.dispose();
        this.items.delete(repository);
        this.updateRepositoryContextKeys();
    }
    onDidChangeVisibleRepositories() {
        let count = 0;
        for (const [repository, item] of this.items) {
            const isVisible = this.scmViewService.isVisible(repository);
            item.contextKey.set(isVisible);
            if (isVisible) {
                count++;
            }
        }
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(count);
    }
    updateRepositoryContextKeys() {
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(Iterable.reduce(this.items.keys(), (r, repository) => r + (this.scmViewService.isVisible(repository) ? 1 : 0), 0));
    }
    dispose() {
        this.disposables.dispose();
        dispose(this.items.values());
        this.items.clear();
    }
};
RepositoryVisibilityActionController = __decorate([
    __param(0, IContextKeyService),
    __param(1, ISCMViewService),
    __param(2, ISCMService)
], RepositoryVisibilityActionController);
class SetListViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setListViewMode', menu = {}) {
        super({
            id,
            title: localize('setListViewMode', "View as List"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listTree,
            toggled: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu }
        });
    }
    async runInView(_, view) {
        view.viewMode = "list" /* ViewMode.List */;
    }
}
class SetListViewModeNavigationAction extends SetListViewModeAction {
    constructor() {
        super('workbench.scm.action.setListViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */)),
            group: 'navigation',
            order: -1000
        });
    }
}
class SetTreeViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setTreeViewMode', menu = {}) {
        super({
            id,
            title: localize('setTreeViewMode', "View as Tree"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listFlat,
            toggled: ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu }
        });
    }
    async runInView(_, view) {
        view.viewMode = "tree" /* ViewMode.Tree */;
    }
}
class SetTreeViewModeNavigationAction extends SetTreeViewModeAction {
    constructor() {
        super('workbench.scm.action.setTreeViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */)),
            group: 'navigation',
            order: -1000
        });
    }
}
registerAction2(SetListViewModeAction);
registerAction2(SetTreeViewModeAction);
registerAction2(SetListViewModeNavigationAction);
registerAction2(SetTreeViewModeNavigationAction);
class RepositorySortAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.repositories.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: RepositoryContextKeys.RepositorySortKey.isEqualTo(sortKey),
            menu: [
                {
                    id: Menus.Repositories,
                    group: '1_sort'
                },
                {
                    id: MenuId.SCMSourceControlTitle,
                    group: '1_sort',
                },
            ]
        });
        this.sortKey = sortKey;
    }
    runInView(accessor) {
        accessor.get(ISCMViewService).toggleSortKey(this.sortKey);
    }
}
class RepositorySortByDiscoveryTimeAction extends RepositorySortAction {
    constructor() {
        super("discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */, localize('repositorySortByDiscoveryTime', "Sort by Discovery Time"));
    }
}
class RepositorySortByNameAction extends RepositorySortAction {
    constructor() {
        super("name" /* ISCMRepositorySortKey.Name */, localize('repositorySortByName', "Sort by Name"));
    }
}
class RepositorySortByPathAction extends RepositorySortAction {
    constructor() {
        super("path" /* ISCMRepositorySortKey.Path */, localize('repositorySortByPath', "Sort by Path"));
    }
}
registerAction2(RepositorySortByDiscoveryTimeAction);
registerAction2(RepositorySortByNameAction);
registerAction2(RepositorySortByPathAction);
class SetSortKeyAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: ContextKeys.SCMViewSortKey.isEqualTo(sortKey),
            precondition: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '2_sort' }
        });
        this.sortKey = sortKey;
    }
    async runInView(_, view) {
        view.viewSortKey = this.sortKey;
    }
}
class SetSortByNameAction extends SetSortKeyAction {
    constructor() {
        super("name" /* ViewSortKey.Name */, localize('sortChangesByName', "Sort Changes by Name"));
    }
}
class SetSortByPathAction extends SetSortKeyAction {
    constructor() {
        super("path" /* ViewSortKey.Path */, localize('sortChangesByPath', "Sort Changes by Path"));
    }
}
class SetSortByStatusAction extends SetSortKeyAction {
    constructor() {
        super("status" /* ViewSortKey.Status */, localize('sortChangesByStatus', "Sort Changes by Status"));
    }
}
registerAction2(SetSortByNameAction);
registerAction2(SetSortByPathAction);
registerAction2(SetSortByStatusAction);
class CollapseAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.collapseAllRepositories`,
            title: localize('collapse all', "Collapse All Repositories"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(false))
            }
        });
    }
    async runInView(_, view) {
        view.collapseAllRepositories();
    }
}
class ExpandAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.expandAllRepositories`,
            title: localize('expand all', "Expand All Repositories"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(true))
            }
        });
    }
    async runInView(_, view) {
        view.expandAllRepositories();
    }
}
registerAction2(CollapseAllRepositoriesAction);
registerAction2(ExpandAllRepositoriesAction);
var SCMInputWidgetCommandId;
(function (SCMInputWidgetCommandId) {
    SCMInputWidgetCommandId["CancelAction"] = "scm.input.cancelAction";
    SCMInputWidgetCommandId["SetupAction"] = "scm.input.triggerSetup";
})(SCMInputWidgetCommandId || (SCMInputWidgetCommandId = {}));
var SCMInputWidgetStorageKey;
(function (SCMInputWidgetStorageKey) {
    SCMInputWidgetStorageKey["LastActionId"] = "scm.input.lastActionId";
})(SCMInputWidgetStorageKey || (SCMInputWidgetStorageKey = {}));
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "scm.input.triggerSetup" /* SCMInputWidgetCommandId.SetupAction */,
            title: localize('scmInputGenerateCommitMessage', "Generate commit message"),
            icon: Codicon.sparkle,
            f1: false,
            menu: {
                id: MenuId.SCMInputBox,
                when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.installed.negate(), ContextKeyExpr.equals('scmProvider', 'git'))
            }
        });
    }
    async run(accessor, ...args) {
        const commandService = accessor.get(ICommandService);
        const telemetryService = accessor.get(ITelemetryService);
        telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'scmInput' });
        const result = await commandService.executeCommand(CHAT_SETUP_ACTION_ID);
        if (!result) {
            return;
        }
        const command = product.defaultChatAgent?.generateCommitMessageCommand;
        if (!command) {
            return;
        }
        await commandService.executeCommand(command, ...args);
    }
});
let SCMInputWidgetActionRunner = class SCMInputWidgetActionRunner extends ActionRunner {
    get runningActions() { return this._runningActions; }
    constructor(input, storageService) {
        super();
        this.input = input;
        this.storageService = storageService;
        this._runningActions = new Set();
    }
    async runAction(action) {
        try {
            // Cancel previous action
            if (this.runningActions.size !== 0) {
                this._cts?.cancel();
                if (action.id === "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */) {
                    return;
                }
            }
            // Create action context
            const context = [];
            for (const group of this.input.repository.provider.groups) {
                context.push({
                    resourceGroupId: group.id,
                    resources: [...group.resources.map(r => r.sourceUri)]
                });
            }
            // Run action
            this._runningActions.add(action);
            this._cts = new CancellationTokenSource();
            await action.run(...[this.input.repository.provider.rootUri, context, this._cts.token]);
        }
        finally {
            this._runningActions.delete(action);
            // Save last action
            if (this._runningActions.size === 0) {
                const actionId = action.id === "scm.input.triggerSetup" /* SCMInputWidgetCommandId.SetupAction */
                    ? product.defaultChatAgent?.generateCommitMessageCommand ?? action.id
                    : action.id;
                this.storageService.store("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, actionId, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }
    }
};
SCMInputWidgetActionRunner = __decorate([
    __param(1, IStorageService)
], SCMInputWidgetActionRunner);
let SCMInputWidgetToolbar = class SCMInputWidgetToolbar extends WorkbenchToolBar {
    get dropdownActions() { return this._dropdownActions; }
    get dropdownAction() { return this._dropdownAction; }
    constructor(container, options, menuService, contextKeyService, contextMenuService, commandService, keybindingService, storageService, telemetryService) {
        super(container, options, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this._dropdownActions = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables = this._register(new MutableDisposable());
        this._dropdownAction = new Action('scmInputMoreActions', localize('scmInputMoreActions', "More Actions..."), 'codicon-chevron-down');
        this._cancelAction = new MenuItemAction({
            id: "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */,
            title: localize('scmInputCancelAction', "Cancel"),
            icon: Codicon.stopCircle,
        }, undefined, undefined, undefined, undefined, contextKeyService, commandService);
    }
    setInput(input) {
        this._disposables.value = new DisposableStore();
        const contextKeyService = this.contextKeyService.createOverlay([
            ['scmProvider', input.repository.provider.providerId],
            ['scmProviderRootUri', input.repository.provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!input.repository.provider.rootUri]
        ]);
        const menu = this._disposables.value.add(this.menuService.createMenu(MenuId.SCMInputBox, contextKeyService, { emitEventsForSubmenuChanges: true }));
        const isEnabled = () => {
            return input.repository.provider.groups.some(g => g.resources.length > 0);
        };
        const updateToolbar = () => {
            const actions = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            for (const action of actions) {
                action.enabled = isEnabled();
            }
            this._dropdownAction.enabled = isEnabled();
            let primaryAction = undefined;
            if (this.actionRunner.runningActions.size !== 0) {
                primaryAction = this._cancelAction;
            }
            else if (actions.length === 1) {
                primaryAction = actions[0];
            }
            else if (actions.length > 1) {
                const lastActionId = this.storageService.get("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, 0 /* StorageScope.PROFILE */, '');
                primaryAction = actions.find(a => a.id === lastActionId) ?? actions[0];
            }
            this._dropdownActions = actions.length === 1 ? [] : actions;
            super.setActions(primaryAction ? [primaryAction] : [], []);
            this._onDidChange.fire();
        };
        this._disposables.value.add(menu.onDidChange(() => updateToolbar()));
        this._disposables.value.add(input.repository.provider.onDidChangeResources(() => updateToolbar()));
        this._disposables.value.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, "scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, this._disposables.value)(() => updateToolbar()));
        this.actionRunner = this._disposables.value.add(new SCMInputWidgetActionRunner(input, this.storageService));
        this._disposables.value.add(this.actionRunner.onWillRun(e => {
            if (this.actionRunner.runningActions.size === 0) {
                super.setActions([this._cancelAction], []);
                this._onDidChange.fire();
            }
        }));
        this._disposables.value.add(this.actionRunner.onDidRun(e => {
            if (this.actionRunner.runningActions.size === 0) {
                updateToolbar();
            }
        }));
        updateToolbar();
    }
};
SCMInputWidgetToolbar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, ICommandService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, ITelemetryService)
], SCMInputWidgetToolbar);
class SCMInputWidgetEditorOptions {
    constructor(overflowWidgetsDomNode, configurationService) {
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.configurationService = configurationService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.defaultInputFontFamily = DEFAULT_FONT_FAMILY;
        this._disposables = new DisposableStore();
        const onDidChangeConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, e => {
            return e.affectsConfiguration('editor.accessibilitySupport') ||
                e.affectsConfiguration('editor.cursorBlinking') ||
                e.affectsConfiguration('editor.cursorStyle') ||
                e.affectsConfiguration('editor.cursorWidth') ||
                e.affectsConfiguration('editor.emptySelectionClipboard') ||
                e.affectsConfiguration('editor.fontFamily') ||
                e.affectsConfiguration('editor.rulers') ||
                e.affectsConfiguration('editor.wordWrap') ||
                e.affectsConfiguration('scm.inputFontFamily') ||
                e.affectsConfiguration('scm.inputFontSize');
        }, this._disposables);
        this._disposables.add(onDidChangeConfiguration(() => this._onDidChange.fire()));
    }
    getEditorConstructionOptions() {
        return {
            ...getSimpleEditorOptions(this.configurationService),
            ...this.getEditorOptions(),
            dragAndDrop: true,
            dropIntoEditor: { enabled: true },
            formatOnType: true,
            lineDecorationsWidth: 6,
            overflowWidgetsDomNode: this.overflowWidgetsDomNode,
            padding: { top: 2, bottom: 2 },
            quickSuggestions: false,
            renderWhitespace: 'none',
            scrollbar: {
                alwaysConsumeMouseWheel: false,
                vertical: 'hidden'
            },
            wrappingIndent: 'none',
            wrappingStrategy: 'advanced',
        };
    }
    getEditorOptions() {
        const fontFamily = this._getEditorFontFamily();
        const fontSize = this._getEditorFontSize();
        const lineHeight = this._getEditorLineHeight(fontSize);
        const accessibilitySupport = this.configurationService.getValue('editor.accessibilitySupport');
        const cursorBlinking = this.configurationService.getValue('editor.cursorBlinking');
        const cursorStyle = this.configurationService.getValue('editor.cursorStyle');
        const cursorWidth = this.configurationService.getValue('editor.cursorWidth') ?? 1;
        const emptySelectionClipboard = this.configurationService.getValue('editor.emptySelectionClipboard') === true;
        return { ...this._getEditorLanguageConfiguration(), accessibilitySupport, cursorBlinking, cursorStyle, cursorWidth, fontFamily, fontSize, lineHeight, emptySelectionClipboard };
    }
    _getEditorFontFamily() {
        const inputFontFamily = this.configurationService.getValue('scm.inputFontFamily').trim();
        if (inputFontFamily.toLowerCase() === 'editor') {
            return this.configurationService.getValue('editor.fontFamily').trim();
        }
        if (inputFontFamily.length !== 0 && inputFontFamily.toLowerCase() !== 'default') {
            return inputFontFamily;
        }
        return this.defaultInputFontFamily;
    }
    _getEditorFontSize() {
        return this.configurationService.getValue('scm.inputFontSize');
    }
    _getEditorLanguageConfiguration() {
        // editor.rulers
        const rulersConfig = this.configurationService.inspect('editor.rulers', { overrideIdentifier: 'scminput' });
        const rulers = rulersConfig.overrideIdentifiers?.includes('scminput') ? EditorOptions.rulers.validate(rulersConfig.value) : [];
        // editor.wordWrap
        const wordWrapConfig = this.configurationService.inspect('editor.wordWrap', { overrideIdentifier: 'scminput' });
        const wordWrap = wordWrapConfig.overrideIdentifiers?.includes('scminput') ? EditorOptions.wordWrap.validate(wordWrapConfig.value) : 'on';
        return { rulers, wordWrap };
    }
    _getEditorLineHeight(fontSize) {
        return Math.round(fontSize * 1.5);
    }
    dispose() {
        this._disposables.dispose();
    }
}
let SCMInputWidget = class SCMInputWidget {
    static { SCMInputWidget_1 = this; }
    static { this.ValidationTimeouts = {
        [2 /* InputValidationType.Information */]: 5000,
        [1 /* InputValidationType.Warning */]: 8000,
        [0 /* InputValidationType.Error */]: 10000
    }; }
    get input() {
        return this.model?.input;
    }
    set input(input) {
        if (input === this.input) {
            return;
        }
        this.clearValidation();
        this.element.classList.remove('synthetic-focus');
        this.repositoryDisposables.clear();
        this.repositoryIdContextKey.set(input?.repository.id);
        if (!input) {
            this.inputEditor.setModel(undefined);
            this.model = undefined;
            return;
        }
        const textModel = input.repository.provider.inputBoxTextModel;
        this.inputEditor.setModel(textModel);
        if (this.configurationService.getValue('editor.wordBasedSuggestions', { resource: textModel.uri }) !== 'off') {
            this.configurationService.updateValue('editor.wordBasedSuggestions', 'off', { resource: textModel.uri }, 8 /* ConfigurationTarget.MEMORY */);
        }
        // Validation
        const validationDelayer = new ThrottledDelayer(200);
        const validate = async () => {
            const position = this.inputEditor.getSelection()?.getStartPosition();
            const offset = position && textModel.getOffsetAt(position);
            const value = textModel.getValue();
            this.setValidation(await input.validateInput(value, offset || 0));
        };
        const triggerValidation = () => validationDelayer.trigger(validate);
        this.repositoryDisposables.add(validationDelayer);
        this.repositoryDisposables.add(this.inputEditor.onDidChangeCursorPosition(triggerValidation));
        // Adaptive indentation rules
        const opts = this.modelService.getCreationOptions(textModel.getLanguageId(), textModel.uri, textModel.isForSimpleWidget);
        const onEnter = Event.filter(this.inputEditor.onKeyDown, e => e.keyCode === 3 /* KeyCode.Enter */, this.repositoryDisposables);
        this.repositoryDisposables.add(onEnter(() => textModel.detectIndentation(opts.insertSpaces, opts.tabSize)));
        // Keep model in sync with API
        textModel.setValue(input.value);
        this.repositoryDisposables.add(input.onDidChange(({ value, reason }) => {
            const currentValue = textModel.getValue();
            if (value === currentValue) { // circuit breaker
                return;
            }
            textModel.pushStackElement();
            textModel.pushEditOperations(null, [EditOperation.replaceMove(textModel.getFullModelRange(), value)], () => []);
            const position = reason === SCMInputChangeReason.HistoryPrevious
                ? textModel.getFullModelRange().getStartPosition()
                : textModel.getFullModelRange().getEndPosition();
            this.inputEditor.setPosition(position);
            this.inputEditor.revealPositionInCenterIfOutsideViewport(position);
        }));
        this.repositoryDisposables.add(input.onDidChangeFocus(() => this.focus()));
        this.repositoryDisposables.add(input.onDidChangeValidationMessage((e) => this.setValidation(e, { focus: true, timeout: true })));
        this.repositoryDisposables.add(input.onDidChangeValidateInput((e) => triggerValidation()));
        // Keep API in sync with model and validate
        this.repositoryDisposables.add(textModel.onDidChangeContent(() => {
            input.setValue(textModel.getValue(), true);
            triggerValidation();
        }));
        // Aria label & placeholder text
        const accessibilityVerbosityConfig = observableConfigValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */, true, this.configurationService);
        const getAriaLabel = (placeholder, verbosity) => {
            verbosity = verbosity ?? accessibilityVerbosityConfig.get();
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return placeholder;
            }
            const kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            return kbLabel
                ? localize('scmInput.accessibilityHelp', "{0}, Use {1} to open Source Control Accessibility Help.", placeholder, kbLabel)
                : localize('scmInput.accessibilityHelpNoKb', "{0}, Run the Open Accessibility Help command for more information.", placeholder);
        };
        const getPlaceholderText = () => {
            const binding = this.keybindingService.lookupKeybinding('scm.acceptInput');
            const label = binding ? binding.getLabel() : (platform.isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter');
            return format(input.placeholder, label);
        };
        const updatePlaceholderText = () => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder);
            this.inputEditor.updateOptions({ ariaLabel, placeholder });
        };
        this.repositoryDisposables.add(input.onDidChangePlaceholder(updatePlaceholderText));
        this.repositoryDisposables.add(this.keybindingService.onDidUpdateKeybindings(updatePlaceholderText));
        this.repositoryDisposables.add(runOnChange(accessibilityVerbosityConfig, verbosity => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder, verbosity);
            this.inputEditor.updateOptions({ ariaLabel });
        }));
        updatePlaceholderText();
        // Update input template
        let commitTemplate = '';
        this.repositoryDisposables.add(autorun(reader => {
            if (!input.visible) {
                return;
            }
            const oldCommitTemplate = commitTemplate;
            commitTemplate = input.repository.provider.commitTemplate.read(reader);
            const value = textModel.getValue();
            if (value && value !== oldCommitTemplate) {
                return;
            }
            textModel.setValue(commitTemplate);
        }));
        // Update input enablement
        const updateEnablement = (enabled) => {
            this.inputEditor.updateOptions({ readOnly: !enabled });
        };
        this.repositoryDisposables.add(input.onDidChangeEnablement(enabled => updateEnablement(enabled)));
        updateEnablement(input.enabled);
        // Toolbar
        this.toolbar.setInput(input);
        // Save model
        this.model = { input, textModel };
    }
    get selections() {
        return this.inputEditor.getSelections();
    }
    set selections(selections) {
        if (selections) {
            this.inputEditor.setSelections(selections);
        }
    }
    setValidation(validation, options) {
        if (this._validationTimer) {
            clearTimeout(this._validationTimer);
            this._validationTimer = undefined;
        }
        this.validation = validation;
        this.renderValidation();
        if (options?.focus && !this.hasFocus()) {
            this.focus();
        }
        if (validation && options?.timeout) {
            this._validationTimer = setTimeout(() => this.setValidation(undefined), SCMInputWidget_1.ValidationTimeouts[validation.type]);
        }
    }
    constructor(container, overflowWidgetsDomNode, contextKeyService, modelService, keybindingService, configurationService, instantiationService, scmViewService, contextViewService, openerService, accessibilityService) {
        this.modelService = modelService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.scmViewService = scmViewService;
        this.contextViewService = contextViewService;
        this.openerService = openerService;
        this.accessibilityService = accessibilityService;
        this.disposables = new DisposableStore();
        this.repositoryDisposables = new DisposableStore();
        this.validationHasFocus = false;
        // This is due to "Setup height change listener on next tick" above
        // https://github.com/microsoft/vscode/issues/108067
        this.lastLayoutWasTrash = false;
        this.shouldFocusAfterLayout = false;
        this.element = append(container, $('.scm-editor'));
        this.editorContainer = append(this.element, $('.scm-editor-container'));
        this.toolbarContainer = append(this.element, $('.scm-editor-toolbar'));
        this.contextKeyService = contextKeyService.createScoped(this.element);
        this.repositoryIdContextKey = this.contextKeyService.createKey('scmRepository', undefined);
        this.inputEditorOptions = new SCMInputWidgetEditorOptions(overflowWidgetsDomNode, this.configurationService);
        this.disposables.add(this.inputEditorOptions.onDidChange(this.onDidChangeEditorOptions, this));
        this.disposables.add(this.inputEditorOptions);
        const codeEditorWidgetOptions = {
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                CodeActionController.ID,
                ColorDetector.ID,
                ContextMenuController.ID,
                CopyPasteController.ID,
                DragAndDropController.ID,
                DropIntoEditorController.ID,
                EditorDictation.ID,
                FormatOnType.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                InlineCompletionsController.ID,
                LinkDetector.ID,
                MenuPreventer.ID,
                MessageController.ID,
                PlaceholderTextContribution.ID,
                SelectionClipboardContributionID,
                SnippetController2.ID,
                SuggestController.ID
            ]),
            isSimpleWidget: true
        };
        const services = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        const instantiationService2 = instantiationService.createChild(services, this.disposables);
        const editorConstructionOptions = this.inputEditorOptions.getEditorConstructionOptions();
        this.inputEditor = instantiationService2.createInstance(CodeEditorWidget, this.editorContainer, editorConstructionOptions, codeEditorWidgetOptions);
        this.disposables.add(this.inputEditor);
        this.disposables.add(this.inputEditor.onDidFocusEditorText(() => {
            if (this.input?.repository) {
                this.scmViewService.focus(this.input.repository);
            }
            this.element.classList.add('synthetic-focus');
            this.renderValidation();
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorText(() => {
            this.element.classList.remove('synthetic-focus');
            setTimeout(() => {
                if (!this.validation || !this.validationHasFocus) {
                    this.clearValidation();
                }
            }, 0);
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this.inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this.inputEditor)?.clearWidgets();
        }));
        const firstLineKey = this.contextKeyService.createKey('scmInputIsInFirstPosition', false);
        const lastLineKey = this.contextKeyService.createKey('scmInputIsInLastPosition', false);
        this.disposables.add(this.inputEditor.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this.inputEditor._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            firstLineKey.set(viewPosition.lineNumber === 1 && viewPosition.column === 1);
            lastLineKey.set(viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol);
        }));
        this.disposables.add(this.inputEditor.onDidScrollChange(e => {
            this.toolbarContainer.classList.toggle('scroll-decoration', e.scrollTop > 0);
        }));
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.showInputActionButton'))(() => this.layout(), this, this.disposables);
        this.onDidChangeContentHeight = Event.signal(Event.filter(this.inputEditor.onDidContentSizeChange, e => e.contentHeightChanged, this.disposables));
        // Toolbar
        this.toolbar = instantiationService2.createInstance(SCMInputWidgetToolbar, this.toolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && this.toolbar.dropdownActions.length > 1) {
                    return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, this.toolbar.dropdownAction, this.toolbar.dropdownActions, '', { actionRunner: this.toolbar.actionRunner, hoverDelegate: options.hoverDelegate });
                }
                return createActionViewItem(instantiationService, action, options);
            },
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            menuOptions: {
                shouldForwardArgs: true
            }
        });
        this.disposables.add(this.toolbar.onDidChange(() => this.layout()));
        this.disposables.add(this.toolbar);
    }
    getContentHeight() {
        const lineHeight = this.inputEditor.getOption(75 /* EditorOption.lineHeight */);
        const { top, bottom } = this.inputEditor.getOption(95 /* EditorOption.padding */);
        const inputMinLinesConfig = this.configurationService.getValue('scm.inputMinLineCount');
        const inputMinLines = typeof inputMinLinesConfig === 'number' ? clamp(inputMinLinesConfig, 1, 50) : 1;
        const editorMinHeight = inputMinLines * lineHeight + top + bottom;
        const inputMaxLinesConfig = this.configurationService.getValue('scm.inputMaxLineCount');
        const inputMaxLines = typeof inputMaxLinesConfig === 'number' ? clamp(inputMaxLinesConfig, 1, 50) : 10;
        const editorMaxHeight = inputMaxLines * lineHeight + top + bottom;
        return clamp(this.inputEditor.getContentHeight(), editorMinHeight, editorMaxHeight);
    }
    layout() {
        const editorHeight = this.getContentHeight();
        const toolbarWidth = this.getToolbarWidth();
        const dimension = new Dimension(this.element.clientWidth - toolbarWidth, editorHeight);
        if (dimension.width < 0) {
            this.lastLayoutWasTrash = true;
            return;
        }
        this.lastLayoutWasTrash = false;
        this.inputEditor.layout(dimension);
        this.renderValidation();
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton') === true;
        this.toolbarContainer.classList.toggle('hidden', !showInputActionButton || this.toolbar?.isEmpty() === true);
        if (this.shouldFocusAfterLayout) {
            this.shouldFocusAfterLayout = false;
            this.focus();
        }
    }
    focus() {
        if (this.lastLayoutWasTrash) {
            this.lastLayoutWasTrash = false;
            this.shouldFocusAfterLayout = true;
            return;
        }
        this.inputEditor.focus();
        this.element.classList.add('synthetic-focus');
    }
    hasFocus() {
        return this.inputEditor.hasTextFocus();
    }
    onDidChangeEditorOptions() {
        this.inputEditor.updateOptions(this.inputEditorOptions.getEditorOptions());
    }
    renderValidation() {
        this.clearValidation();
        this.element.classList.toggle('validation-info', this.validation?.type === 2 /* InputValidationType.Information */);
        this.element.classList.toggle('validation-warning', this.validation?.type === 1 /* InputValidationType.Warning */);
        this.element.classList.toggle('validation-error', this.validation?.type === 0 /* InputValidationType.Error */);
        if (!this.validation || !this.inputEditor.hasTextFocus()) {
            return;
        }
        const disposables = new DisposableStore();
        this.validationContextView = this.contextViewService.showContextView({
            getAnchor: () => this.element,
            render: container => {
                this.element.style.borderBottomLeftRadius = '0';
                this.element.style.borderBottomRightRadius = '0';
                const validationContainer = append(container, $('.scm-editor-validation-container'));
                validationContainer.classList.toggle('validation-info', this.validation.type === 2 /* InputValidationType.Information */);
                validationContainer.classList.toggle('validation-warning', this.validation.type === 1 /* InputValidationType.Warning */);
                validationContainer.classList.toggle('validation-error', this.validation.type === 0 /* InputValidationType.Error */);
                validationContainer.style.width = `${this.element.clientWidth + 2}px`;
                const element = append(validationContainer, $('.scm-editor-validation'));
                const message = this.validation.message;
                if (typeof message === 'string') {
                    element.textContent = message;
                }
                else {
                    const tracker = trackFocus(element);
                    disposables.add(tracker);
                    disposables.add(tracker.onDidFocus(() => (this.validationHasFocus = true)));
                    disposables.add(tracker.onDidBlur(() => {
                        this.validationHasFocus = false;
                        this.element.style.borderBottomLeftRadius = '2px';
                        this.element.style.borderBottomRightRadius = '2px';
                        this.contextViewService.hideContextView();
                    }));
                    const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
                    const renderedMarkdown = renderer.render(message, {
                        actionHandler: {
                            callback: (link) => {
                                openLinkFromMarkdown(this.openerService, link, message.isTrusted);
                                this.element.style.borderBottomLeftRadius = '2px';
                                this.element.style.borderBottomRightRadius = '2px';
                                this.contextViewService.hideContextView();
                            },
                            disposables: disposables
                        },
                    });
                    disposables.add(renderedMarkdown);
                    element.appendChild(renderedMarkdown.element);
                }
                const actionsContainer = append(validationContainer, $('.scm-editor-validation-actions'));
                const actionbar = new ActionBar(actionsContainer);
                const action = new Action('scmInputWidget.validationMessage.close', localize('label.close', "Close"), ThemeIcon.asClassName(Codicon.close), true, () => {
                    this.contextViewService.hideContextView();
                    this.element.style.borderBottomLeftRadius = '2px';
                    this.element.style.borderBottomRightRadius = '2px';
                });
                disposables.add(actionbar);
                actionbar.push(action, { icon: true, label: false });
                return Disposable.None;
            },
            onHide: () => {
                this.validationHasFocus = false;
                this.element.style.borderBottomLeftRadius = '2px';
                this.element.style.borderBottomRightRadius = '2px';
                disposables.dispose();
            },
            anchorAlignment: 0 /* AnchorAlignment.LEFT */
        });
    }
    getToolbarWidth() {
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton');
        if (!this.toolbar || !showInputActionButton || this.toolbar?.isEmpty() === true) {
            return 0;
        }
        return this.toolbar.dropdownActions.length === 0 ?
            26 /* 22px action + 4px margin */ :
            39 /* 35px action + 4px margin */;
    }
    clearValidation() {
        this.validationContextView?.close();
        this.validationContextView = undefined;
        this.validationHasFocus = false;
    }
    dispose() {
        this.input = undefined;
        this.repositoryDisposables.dispose();
        this.clearValidation();
        this.disposables.dispose();
    }
};
SCMInputWidget = SCMInputWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IModelService),
    __param(4, IKeybindingService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ISCMViewService),
    __param(8, IContextViewService),
    __param(9, IOpenerService),
    __param(10, IAccessibilityService)
], SCMInputWidget);
let SCMViewPane = class SCMViewPane extends ViewPane {
    get viewMode() { return this._viewMode; }
    set viewMode(mode) {
        if (this._viewMode === mode) {
            return;
        }
        this._viewMode = mode;
        // Update sort key based on view mode
        this.viewSortKey = this.getViewSortKey();
        this.updateChildren();
        this.onDidActiveEditorChange();
        this._onDidChangeViewMode.fire(mode);
        this.viewModeContextKey.set(mode);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this.storageService.store(`scm.viewMode`, mode, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    get viewSortKey() { return this._viewSortKey; }
    set viewSortKey(sortKey) {
        if (this._viewSortKey === sortKey) {
            return;
        }
        this._viewSortKey = sortKey;
        this.updateChildren();
        this.viewSortKeyContextKey.set(sortKey);
        this._onDidChangeViewSortKey.fire(sortKey);
        if (this._viewMode === "list" /* ViewMode.List */) {
            this.storageService.store(`scm.viewSortKey`, sortKey, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
    }
    constructor(options, commandService, editorService, menuService, scmService, scmViewService, storageService, uriIdentityService, keybindingService, themeService, contextMenuService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, hoverService) {
        super({ ...options, titleMenuId: MenuId.SCMTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.commandService = commandService;
        this.editorService = editorService;
        this.menuService = menuService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeViewMode = new Emitter();
        this.onDidChangeViewMode = this._onDidChangeViewMode.event;
        this._onDidChangeViewSortKey = new Emitter();
        this.onDidChangeViewSortKey = this._onDidChangeViewSortKey.event;
        this.items = new DisposableMap();
        this.visibilityDisposables = new DisposableStore();
        this.treeOperationSequencer = new Sequencer();
        this.revealResourceThrottler = new Throttler();
        this.updateChildrenThrottler = new Throttler();
        this.disposables = new DisposableStore();
        // View mode and sort key
        this._viewMode = this.getViewMode();
        this._viewSortKey = this.getViewSortKey();
        // Context Keys
        this.viewModeContextKey = ContextKeys.SCMViewMode.bindTo(contextKeyService);
        this.viewModeContextKey.set(this._viewMode);
        this.viewSortKeyContextKey = ContextKeys.SCMViewSortKey.bindTo(contextKeyService);
        this.viewSortKeyContextKey.set(this.viewSortKey);
        this.areAllRepositoriesCollapsedContextKey = ContextKeys.SCMViewAreAllRepositoriesCollapsed.bindTo(contextKeyService);
        this.isAnyRepositoryCollapsibleContextKey = ContextKeys.SCMViewIsAnyRepositoryCollapsible.bindTo(contextKeyService);
        this.scmProviderContextKey = ContextKeys.SCMProvider.bindTo(contextKeyService);
        this.scmProviderRootUriContextKey = ContextKeys.SCMProviderRootUri.bindTo(contextKeyService);
        this.scmProviderHasRootUriContextKey = ContextKeys.SCMProviderHasRootUri.bindTo(contextKeyService);
        this._onDidLayout = new Emitter();
        this.layoutCache = { height: undefined, width: undefined, onDidChange: this._onDidLayout.event };
        this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, this.disposables)(e => {
            switch (e.key) {
                case 'scm.viewMode':
                    this.viewMode = this.getViewMode();
                    break;
                case 'scm.viewSortKey':
                    this.viewSortKey = this.getViewSortKey();
                    break;
            }
        }, this, this.disposables);
        this.storageService.onWillSaveState(e => {
            this.viewMode = this.getViewMode();
            this.viewSortKey = this.getViewSortKey();
            this.storeTreeViewState();
        }, this, this.disposables);
        Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository)(() => this._onDidChangeViewWelcomeState.fire(), this, this.disposables);
        this.disposables.add(this.revealResourceThrottler);
        this.disposables.add(this.updateChildrenThrottler);
    }
    layoutBody(height = this.layoutCache.height, width = this.layoutCache.width) {
        if (height === undefined) {
            return;
        }
        if (width !== undefined) {
            super.layoutBody(height, width);
        }
        this.layoutCache.height = height;
        this.layoutCache.width = width;
        this._onDidLayout.fire();
        this.treeContainer.style.height = `${height}px`;
        this.tree.layout(height, width);
    }
    renderBody(container) {
        super.renderBody(container);
        // Tree
        this.treeContainer = append(container, $('.scm-view.show-file-icons'));
        this.treeContainer.classList.add('file-icon-themable-tree');
        this.treeContainer.classList.add('show-file-icons');
        const updateActionsVisibility = () => this.treeContainer.classList.toggle('show-actions', this.configurationService.getValue('scm.alwaysShowActions'));
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowActions'), this.disposables)(updateActionsVisibility, this, this.disposables);
        updateActionsVisibility();
        const updateProviderCountVisibility = () => {
            const value = this.configurationService.getValue('scm.providerCountBadge');
            this.treeContainer.classList.toggle('hide-provider-counts', value === 'hidden');
            this.treeContainer.classList.toggle('auto-provider-counts', value === 'auto');
        };
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.providerCountBadge'), this.disposables)(updateProviderCountVisibility, this, this.disposables);
        updateProviderCountVisibility();
        const viewState = this.loadTreeViewState();
        this.createTree(this.treeContainer, viewState);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (visible) {
                this.treeOperationSequencer.queue(async () => {
                    await this.tree.setInput(this.scmViewService, viewState);
                    Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowRepositories'), this.visibilityDisposables)(() => {
                        this.updateActions();
                        this.updateChildren();
                    }, this, this.visibilityDisposables);
                    Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.inputMinLineCount') ||
                        e.affectsConfiguration('scm.inputMaxLineCount') ||
                        e.affectsConfiguration('scm.showActionButton'), this.visibilityDisposables)(() => this.updateChildren(), this, this.visibilityDisposables);
                    // Add visible repositories
                    this.editorService.onDidActiveEditorChange(this.onDidActiveEditorChange, this, this.visibilityDisposables);
                    this.scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.visibilityDisposables);
                    this.onDidChangeVisibleRepositories({ added: this.scmViewService.visibleRepositories, removed: Iterable.empty() });
                    // Restore scroll position
                    if (typeof this.treeScrollTop === 'number') {
                        this.tree.scrollTop = this.treeScrollTop;
                        this.treeScrollTop = undefined;
                    }
                    this.updateRepositoryCollapseAllContextKeys();
                });
            }
            else {
                this.visibilityDisposables.clear();
                this.onDidChangeVisibleRepositories({ added: Iterable.empty(), removed: [...this.items.keys()] });
                this.treeScrollTop = this.tree.scrollTop;
                this.updateRepositoryCollapseAllContextKeys();
            }
        }, this, this.disposables);
        this.disposables.add(this.instantiationService.createInstance(RepositoryVisibilityActionController));
        this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this, this.disposables);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
    }
    createTree(container, viewState) {
        const overflowWidgetsDomNode = $('.scm-overflow-widgets-container.monaco-editor');
        this.inputRenderer = this.instantiationService.createInstance(InputRenderer, this.layoutCache, overflowWidgetsDomNode, (input, height) => {
            try {
                // Attempt to update the input element height. There is an
                // edge case where the input has already been disposed and
                // updating the height would fail.
                this.tree.updateElementHeight(input, height);
            }
            catch { }
        });
        this.actionButtonRenderer = this.instantiationService.createInstance(ActionButtonRenderer);
        this.listLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this.disposables.add(this.listLabels);
        const resourceActionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        resourceActionRunner.onWillRun(() => this.tree.domFocus(), this, this.disposables);
        this.disposables.add(resourceActionRunner);
        const treeDataSource = this.instantiationService.createInstance(SCMTreeDataSource, () => this.viewMode);
        this.disposables.add(treeDataSource);
        const compressionEnabled = observableConfigValue('scm.compactFolders', true, this.configurationService);
        this.tree = this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'SCM Tree Repo', container, new ListDelegate(this.inputRenderer), new SCMTreeCompressionDelegate(), [
            this.inputRenderer,
            this.actionButtonRenderer,
            this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMTitle, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ResourceGroupRenderer, getActionViewItemProvider(this.instantiationService), resourceActionRunner),
            this.instantiationService.createInstance(ResourceRenderer, () => this.viewMode, this.listLabels, getActionViewItemProvider(this.instantiationService), resourceActionRunner)
        ], treeDataSource, {
            horizontalScrolling: false,
            setRowLineHeight: false,
            transformOptimization: false,
            filter: new SCMTreeFilter(),
            dnd: new SCMTreeDragAndDrop(this.instantiationService),
            identityProvider: new SCMResourceIdentityProvider(),
            sorter: new SCMTreeSorter(() => this.viewMode, () => this.viewSortKey),
            keyboardNavigationLabelProvider: this.instantiationService.createInstance(SCMTreeKeyboardNavigationLabelProvider, () => this.viewMode),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            compressionEnabled: compressionEnabled.get(),
            collapseByDefault: (e) => {
                // Repository, Resource Group, Resource Folder (Tree)
                if (isSCMRepository(e) || isSCMResourceGroup(e) || isSCMResourceNode(e)) {
                    return false;
                }
                // History Item Group, History Item, or History Item Change
                return (viewState?.expanded ?? []).indexOf(getSCMResourceId(e)) === -1;
            },
            accessibilityProvider: this.instantiationService.createInstance(SCMAccessibilityProvider)
        });
        this.disposables.add(this.tree);
        this.tree.onDidOpen(this.open, this, this.disposables);
        this.tree.onContextMenu(this.onListContextMenu, this, this.disposables);
        this.tree.onDidScroll(this.inputRenderer.clearValidation, this.inputRenderer, this.disposables);
        Event.filter(this.tree.onDidChangeCollapseState, e => isSCMRepository(e.node.element?.element), this.disposables)(this.updateRepositoryCollapseAllContextKeys, this, this.disposables);
        this.disposables.add(autorun(reader => {
            this.tree.updateOptions({
                compressionEnabled: compressionEnabled.read(reader)
            });
        }));
        append(container, overflowWidgetsDomNode);
    }
    async open(e) {
        if (!e.element) {
            return;
        }
        else if (isSCMRepository(e.element)) {
            this.scmViewService.focus(e.element);
            return;
        }
        else if (isSCMInput(e.element)) {
            this.scmViewService.focus(e.element.repository);
            const widget = this.inputRenderer.getRenderedInputWidget(e.element);
            if (widget) {
                widget.focus();
                this.tree.setFocus([], e.browserEvent);
                const selection = this.tree.getSelection();
                if (selection.length === 1 && selection[0] === e.element) {
                    setTimeout(() => this.tree.setSelection([]));
                }
            }
            return;
        }
        else if (isSCMActionButton(e.element)) {
            this.scmViewService.focus(e.element.repository);
            // Focus the action button
            this.actionButtonRenderer.focusActionButton(e.element);
            this.tree.setFocus([], e.browserEvent);
            return;
        }
        else if (isSCMResourceGroup(e.element)) {
            const provider = e.element.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
        else if (isSCMResource(e.element)) {
            if (e.element.command?.id === API_OPEN_EDITOR_COMMAND_ID || e.element.command?.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                if (isPointerEvent(e.browserEvent) && e.browserEvent.button === 1) {
                    const resourceGroup = e.element.resourceGroup;
                    const title = `${resourceGroup.provider.label}: ${resourceGroup.label}`;
                    await OpenScmGroupAction.openMultiFileDiffEditor(this.editorService, title, resourceGroup.provider.rootUri, resourceGroup.id, {
                        ...e.editorOptions,
                        viewState: {
                            revealData: {
                                resource: {
                                    original: e.element.multiDiffEditorOriginalUri,
                                    modified: e.element.multiDiffEditorModifiedUri,
                                }
                            }
                        },
                        preserveFocus: true,
                    });
                }
                else {
                    await this.commandService.executeCommand(e.element.command.id, ...(e.element.command.arguments || []), e);
                }
            }
            else {
                await e.element.open(!!e.editorOptions.preserveFocus);
                if (e.editorOptions.pinned) {
                    const activeEditorPane = this.editorService.activeEditorPane;
                    activeEditorPane?.group.pinEditor(activeEditorPane.input);
                }
            }
            const provider = e.element.resourceGroup.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
        }
        else if (isSCMResourceNode(e.element)) {
            const provider = e.element.context.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
    }
    onDidActiveEditorChange() {
        if (!this.configurationService.getValue('scm.autoReveal')) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!uri) {
            return;
        }
        // Do not set focus/selection when the resource is already focused and selected
        if (this.tree.getFocus().some(e => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri)) &&
            this.tree.getSelection().some(e => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri))) {
            return;
        }
        this.revealResourceThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            for (const repository of this.scmViewService.visibleRepositories) {
                const item = this.items.get(repository);
                if (!item) {
                    continue;
                }
                // go backwards from last group
                for (let j = repository.provider.groups.length - 1; j >= 0; j--) {
                    const groupItem = repository.provider.groups[j];
                    const resource = this.viewMode === "tree" /* ViewMode.Tree */
                        ? groupItem.resourceTree.getNode(uri)?.element
                        : groupItem.resources.find(r => this.uriIdentityService.extUri.isEqual(r.sourceUri, uri));
                    if (resource) {
                        await this.tree.expandTo(resource);
                        this.tree.reveal(resource);
                        this.tree.setSelection([resource]);
                        this.tree.setFocus([resource]);
                        return;
                    }
                }
            }
        }));
    }
    onDidChangeVisibleRepositories({ added, removed }) {
        // Added repositories
        for (const repository of added) {
            const repositoryDisposables = new DisposableStore();
            repositoryDisposables.add(autorun(reader => {
                /** @description action button */
                repository.provider.actionButton.read(reader);
                this.updateChildren(repository);
            }));
            repositoryDisposables.add(repository.input.onDidChangeVisibility(() => this.updateChildren(repository)));
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(() => this.updateChildren(repository)));
            const resourceGroupDisposables = repositoryDisposables.add(new DisposableMap());
            const onDidChangeResourceGroups = () => {
                for (const [resourceGroup] of resourceGroupDisposables) {
                    if (!repository.provider.groups.includes(resourceGroup)) {
                        resourceGroupDisposables.deleteAndDispose(resourceGroup);
                    }
                }
                for (const resourceGroup of repository.provider.groups) {
                    if (!resourceGroupDisposables.has(resourceGroup)) {
                        const disposableStore = new DisposableStore();
                        disposableStore.add(resourceGroup.onDidChange(() => this.updateChildren(repository)));
                        disposableStore.add(resourceGroup.onDidChangeResources(() => this.updateChildren(repository)));
                        resourceGroupDisposables.set(resourceGroup, disposableStore);
                    }
                }
            };
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(onDidChangeResourceGroups));
            onDidChangeResourceGroups();
            this.items.set(repository, repositoryDisposables);
        }
        // Removed repositories
        for (const repository of removed) {
            this.items.deleteAndDispose(repository);
        }
        this.updateChildren();
        this.onDidActiveEditorChange();
    }
    onListContextMenu(e) {
        if (!e.element) {
            const menu = this.menuService.getMenuActions(Menus.ViewSort, this.contextKeyService);
            const actions = getFlatContextMenuActions(menu);
            return this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                onHide: () => { }
            });
        }
        const element = e.element;
        let context = element;
        let actions = [];
        const disposables = new DisposableStore();
        let actionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        disposables.add(actionRunner);
        if (isSCMRepository(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.repositoryContextMenu;
            context = element.provider;
            actionRunner = new RepositoryActionRunner(() => this.getSelectedRepositories());
            disposables.add(actionRunner);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMInput(element) || isSCMActionButton(element)) {
            // noop
        }
        else if (isSCMResourceGroup(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.getResourceGroupMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResource(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.resourceGroup.provider);
            const menu = menus.getResourceMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResourceNode(element)) {
            if (element.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.element.resourceGroup.provider);
                const menu = menus.getResourceMenu(element.element);
                actions = collectContextMenuActions(menu);
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.context.provider);
                const menu = menus.getResourceFolderMenu(element.context);
                actions = collectContextMenuActions(menu);
            }
        }
        disposables.add(actionRunner.onWillRun(() => this.tree.domFocus()));
        this.contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => context,
            onHide: () => disposables.dispose()
        });
    }
    getSelectedRepositories() {
        const focusedRepositories = this.tree.getFocus().filter(r => !!r && isSCMRepository(r));
        const selectedRepositories = this.tree.getSelection().filter(r => !!r && isSCMRepository(r));
        return Array.from(new Set([...focusedRepositories, ...selectedRepositories]));
    }
    getSelectedResources() {
        return this.tree.getSelection().filter(r => isSCMResourceGroup(r) || isSCMResource(r) || isSCMResourceNode(r));
    }
    getViewMode() {
        let mode = this.configurationService.getValue('scm.defaultViewMode') === 'list' ? "list" /* ViewMode.List */ : "tree" /* ViewMode.Tree */;
        const storageMode = this.storageService.get(`scm.viewMode`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageMode === 'string') {
            mode = storageMode;
        }
        return mode;
    }
    getViewSortKey() {
        // Tree
        if (this._viewMode === "tree" /* ViewMode.Tree */) {
            return "path" /* ViewSortKey.Path */;
        }
        // List
        let viewSortKey;
        const viewSortKeyString = this.configurationService.getValue('scm.defaultViewSortKey');
        switch (viewSortKeyString) {
            case 'name':
                viewSortKey = "name" /* ViewSortKey.Name */;
                break;
            case 'status':
                viewSortKey = "status" /* ViewSortKey.Status */;
                break;
            default:
                viewSortKey = "path" /* ViewSortKey.Path */;
                break;
        }
        const storageSortKey = this.storageService.get(`scm.viewSortKey`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageSortKey === 'string') {
            viewSortKey = storageSortKey;
        }
        return viewSortKey;
    }
    loadTreeViewState() {
        const storageViewState = this.storageService.get('scm.viewState2', 1 /* StorageScope.WORKSPACE */);
        if (!storageViewState) {
            return undefined;
        }
        try {
            const treeViewState = JSON.parse(storageViewState);
            return treeViewState;
        }
        catch {
            return undefined;
        }
    }
    storeTreeViewState() {
        if (this.tree) {
            this.storageService.store('scm.viewState2', JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    updateChildren(element) {
        this.updateChildrenThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            const focusedInput = this.inputRenderer.getFocusedInput();
            if (element && this.tree.hasNode(element)) {
                // Refresh specific repository
                await this.tree.updateChildren(element);
            }
            else {
                // Refresh the entire tree
                await this.tree.updateChildren(undefined);
            }
            if (focusedInput) {
                this.inputRenderer.getRenderedInputWidget(focusedInput)?.focus();
            }
            this.updateScmProviderContextKeys();
            this.updateRepositoryCollapseAllContextKeys();
        }));
    }
    updateIndentStyles(theme) {
        this.treeContainer.classList.toggle('list-view-mode', this.viewMode === "list" /* ViewMode.List */);
        this.treeContainer.classList.toggle('tree-view-mode', this.viewMode === "tree" /* ViewMode.Tree */);
        this.treeContainer.classList.toggle('align-icons-and-twisties', (this.viewMode === "list" /* ViewMode.List */ && theme.hasFileIcons) || (theme.hasFileIcons && !theme.hasFolderIcons));
        this.treeContainer.classList.toggle('hide-arrows', this.viewMode === "tree" /* ViewMode.Tree */ && theme.hidesExplorerArrows === true);
    }
    updateScmProviderContextKeys() {
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories');
        if (!alwaysShowRepositories && this.items.size === 1) {
            const provider = Iterable.first(this.items.keys()).provider;
            this.scmProviderContextKey.set(provider.providerId);
            this.scmProviderRootUriContextKey.set(provider.rootUri?.toString());
            this.scmProviderHasRootUriContextKey.set(!!provider.rootUri);
        }
        else {
            this.scmProviderContextKey.set(undefined);
            this.scmProviderRootUriContextKey.set(undefined);
            this.scmProviderHasRootUriContextKey.set(false);
        }
    }
    updateRepositoryCollapseAllContextKeys() {
        if (!this.isBodyVisible() || this.items.size === 1) {
            this.isAnyRepositoryCollapsibleContextKey.set(false);
            this.areAllRepositoriesCollapsedContextKey.set(false);
            return;
        }
        this.isAnyRepositoryCollapsibleContextKey.set(this.scmViewService.visibleRepositories.some(r => this.tree.hasNode(r) && this.tree.isCollapsible(r)));
        this.areAllRepositoriesCollapsedContextKey.set(this.scmViewService.visibleRepositories.every(r => this.tree.hasNode(r) && (!this.tree.isCollapsible(r) || this.tree.isCollapsed(r))));
    }
    collapseAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.collapse(repository);
            }
        }
    }
    expandAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.expand(repository);
            }
        }
    }
    focusPreviousInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(-1));
    }
    focusNextInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(1));
    }
    async focusInput(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        let input = this.scmViewService.focusedRepository.input;
        const repositories = this.scmViewService.visibleRepositories;
        // One visible repository and the input is already focused
        if (repositories.length === 1 && this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            return;
        }
        // Multiple visible repositories and the input already focused
        if (repositories.length > 1 && this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            const focusedRepositoryIndex = repositories.indexOf(this.scmViewService.focusedRepository);
            const newFocusedRepositoryIndex = rot(focusedRepositoryIndex + delta, repositories.length);
            input = repositories[newFocusedRepositoryIndex].input;
        }
        await this.tree.expandTo(input);
        this.tree.reveal(input);
        this.inputRenderer.getRenderedInputWidget(input)?.focus();
    }
    focusPreviousResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(-1));
    }
    focusNextResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(1));
    }
    async focusResourceGroup(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        const treeHasDomFocus = isActiveElement(this.tree.getHTMLElement());
        const resourceGroups = this.scmViewService.focusedRepository.provider.groups;
        const focusedResourceGroup = this.tree.getFocus().find(e => isSCMResourceGroup(e));
        const focusedResourceGroupIndex = treeHasDomFocus && focusedResourceGroup ? resourceGroups.indexOf(focusedResourceGroup) : -1;
        let resourceGroupNext;
        if (focusedResourceGroupIndex === -1) {
            // First visible resource group
            for (const resourceGroup of resourceGroups) {
                if (this.tree.hasNode(resourceGroup)) {
                    resourceGroupNext = resourceGroup;
                    break;
                }
            }
        }
        else {
            // Next/Previous visible resource group
            let index = rot(focusedResourceGroupIndex + delta, resourceGroups.length);
            while (index !== focusedResourceGroupIndex) {
                if (this.tree.hasNode(resourceGroups[index])) {
                    resourceGroupNext = resourceGroups[index];
                    break;
                }
                index = rot(index + delta, resourceGroups.length);
            }
        }
        if (resourceGroupNext) {
            await this.tree.expandTo(resourceGroupNext);
            this.tree.reveal(resourceGroupNext);
            this.tree.setSelection([resourceGroupNext]);
            this.tree.setFocus([resourceGroupNext]);
            this.tree.domFocus();
        }
    }
    shouldShowWelcome() {
        return this.scmService.repositoryCount === 0;
    }
    getActionsContext() {
        return this.scmViewService.visibleRepositories.length === 1 ? this.scmViewService.visibleRepositories[0].provider : undefined;
    }
    focus() {
        super.focus();
        this.treeOperationSequencer.queue(() => {
            return new Promise(resolve => {
                if (this.isExpanded()) {
                    if (this.tree.getFocus().length === 0) {
                        for (const repository of this.scmViewService.visibleRepositories) {
                            const widget = this.inputRenderer.getRenderedInputWidget(repository.input);
                            if (widget) {
                                widget.focus();
                                resolve();
                                return;
                            }
                        }
                    }
                    this.tree.domFocus();
                    resolve();
                }
            });
        });
    }
    dispose() {
        this.visibilityDisposables.dispose();
        this.disposables.dispose();
        this.items.dispose();
        super.dispose();
    }
};
SCMViewPane = __decorate([
    __param(1, ICommandService),
    __param(2, IEditorService),
    __param(3, IMenuService),
    __param(4, ISCMService),
    __param(5, ISCMViewService),
    __param(6, IStorageService),
    __param(7, IUriIdentityService),
    __param(8, IKeybindingService),
    __param(9, IThemeService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService),
    __param(12, IViewDescriptorService),
    __param(13, IConfigurationService),
    __param(14, IContextKeyService),
    __param(15, IOpenerService),
    __param(16, IHoverService)
], SCMViewPane);
export { SCMViewPane };
let SCMTreeDataSource = class SCMTreeDataSource extends Disposable {
    constructor(viewMode, configurationService, scmViewService) {
        super();
        this.viewMode = viewMode;
        this.configurationService = configurationService;
        this.scmViewService = scmViewService;
    }
    async getChildren(inputOrElement) {
        const repositoryCount = this.scmViewService.visibleRepositories.length;
        const showActionButton = this.configurationService.getValue('scm.showActionButton') === true;
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories') === true;
        if (isSCMViewService(inputOrElement) && (repositoryCount > 1 || alwaysShowRepositories)) {
            return this.scmViewService.visibleRepositories;
        }
        else if ((isSCMViewService(inputOrElement) && repositoryCount === 1 && !alwaysShowRepositories) || isSCMRepository(inputOrElement)) {
            const children = [];
            inputOrElement = isSCMRepository(inputOrElement) ? inputOrElement : this.scmViewService.visibleRepositories[0];
            const actionButton = inputOrElement.provider.actionButton.get();
            const resourceGroups = inputOrElement.provider.groups;
            // SCM Input
            if (inputOrElement.input.visible) {
                children.push(inputOrElement.input);
            }
            // Action Button
            if (showActionButton && actionButton) {
                children.push({
                    type: 'actionButton',
                    repository: inputOrElement,
                    button: actionButton
                });
            }
            // ResourceGroups
            const hasSomeChanges = resourceGroups.some(group => group.resources.length > 0);
            if (hasSomeChanges || (repositoryCount === 1 && (!showActionButton || !actionButton))) {
                children.push(...resourceGroups);
            }
            return children;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // Resources (List)
                return inputOrElement.resources;
            }
            else if (this.viewMode() === "tree" /* ViewMode.Tree */) {
                // Resources (Tree)
                const children = [];
                for (const node of inputOrElement.resourceTree.root.children) {
                    children.push(node.element && node.childrenCount === 0 ? node.element : node);
                }
                return children;
            }
        }
        else if (isSCMResourceNode(inputOrElement)) {
            // Resources (Tree), History item changes (Tree)
            const children = [];
            for (const node of inputOrElement.children) {
                children.push(node.element && node.childrenCount === 0 ? node.element : node);
            }
            return children;
        }
        return [];
    }
    getParent(element) {
        if (isSCMResourceNode(element)) {
            if (element.parent === element.context.resourceTree.root) {
                return element.context;
            }
            else if (element.parent) {
                return element.parent;
            }
            else {
                throw new Error('Invalid element passed to getParent');
            }
        }
        else if (isSCMResource(element)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                return element.resourceGroup;
            }
            const node = element.resourceGroup.resourceTree.getNode(element.sourceUri);
            const result = node?.parent;
            if (!result) {
                throw new Error('Invalid element passed to getParent');
            }
            if (result === element.resourceGroup.resourceTree.root) {
                return element.resourceGroup;
            }
            return result;
        }
        else if (isSCMInput(element)) {
            return element.repository;
        }
        else if (isSCMResourceGroup(element)) {
            const repository = this.scmViewService.visibleRepositories.find(r => r.provider === element.provider);
            if (!repository) {
                throw new Error('Invalid element passed to getParent');
            }
            return repository;
        }
        else {
            throw new Error('Unexpected call to getParent');
        }
    }
    hasChildren(inputOrElement) {
        if (isSCMViewService(inputOrElement)) {
            return this.scmViewService.visibleRepositories.length !== 0;
        }
        else if (isSCMRepository(inputOrElement)) {
            return true;
        }
        else if (isSCMInput(inputOrElement)) {
            return false;
        }
        else if (isSCMActionButton(inputOrElement)) {
            return false;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            return true;
        }
        else if (isSCMResource(inputOrElement)) {
            return false;
        }
        else if (ResourceTree.isResourceNode(inputOrElement)) {
            return inputOrElement.childrenCount > 0;
        }
        else {
            throw new Error('hasChildren not implemented.');
        }
    }
};
SCMTreeDataSource = __decorate([
    __param(1, IConfigurationService),
    __param(2, ISCMViewService)
], SCMTreeDataSource);
export class SCMActionButton {
    constructor(container, contextMenuService, commandService, notificationService) {
        this.container = container;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.disposables = new MutableDisposable();
    }
    dispose() {
        this.disposables?.dispose();
    }
    setButton(button) {
        // Clear old button
        this.clear();
        if (!button) {
            return;
        }
        if (button.secondaryCommands?.length) {
            const actions = [];
            for (let index = 0; index < button.secondaryCommands.length; index++) {
                const commands = button.secondaryCommands[index];
                for (const command of commands) {
                    actions.push(toAction({
                        id: command.id,
                        label: command.title,
                        enabled: true,
                        run: async () => {
                            await this.executeCommand(command.id, ...(command.arguments || []));
                        }
                    }));
                }
                if (commands.length) {
                    actions.push(new Separator());
                }
            }
            // Remove last separator
            actions.pop();
            // ButtonWithDropdown
            this.button = new ButtonWithDropdown(this.container, {
                actions: actions,
                addPrimaryActionToDropdown: false,
                contextMenuProvider: this.contextMenuService,
                title: button.command.tooltip,
                supportIcons: true,
                ...defaultButtonStyles
            });
        }
        else {
            // Button
            this.button = new Button(this.container, { supportIcons: true, supportShortLabel: !!button.command.shortTitle, title: button.command.tooltip, ...defaultButtonStyles });
        }
        this.button.enabled = button.enabled;
        this.button.label = button.command.title;
        if (this.button instanceof Button && button.command.shortTitle) {
            this.button.labelShort = button.command.shortTitle;
        }
        this.button.onDidClick(async () => await this.executeCommand(button.command.id, ...(button.command.arguments || [])), null, this.disposables.value);
        this.disposables.value.add(this.button);
    }
    focus() {
        this.button?.focus();
    }
    clear() {
        this.disposables.value = new DisposableStore();
        this.button = undefined;
        clearNode(this.container);
    }
    async executeCommand(commandId, ...args) {
        try {
            await this.commandService.executeCommand(commandId, ...args);
        }
        catch (ex) {
            this.notificationService.error(ex);
        }
    }
}
setupSimpleEditorSelectionStyling('.scm-view .scm-editor-container');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbVZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQWUsVUFBVSxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdLLE9BQU8sRUFBRSxRQUFRLEVBQW9CLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFxRyxlQUFlLEVBQXdDLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQWdILE1BQU0sa0JBQWtCLENBQUM7QUFDM1YsT0FBTyxFQUFFLGNBQWMsRUFBcUMsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFB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