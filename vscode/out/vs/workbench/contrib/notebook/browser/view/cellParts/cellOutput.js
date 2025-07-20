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
import * as DOM from '../../../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../../../base/browser/markdownRenderer.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import * as nls from '../../../../../../nls.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IExtensionsWorkbenchService } from '../../../../extensions/common/extensions.js';
import { JUPYTER_EXTENSION_ID } from '../../notebookBrowser.js';
import { mimetypeIcon } from '../../notebookIcons.js';
import { CellContentPart } from '../cellPart.js';
import { CellUri, NotebookCellExecutionState, RENDERER_NOT_AVAILABLE, isTextStreamMime } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { COPY_OUTPUT_COMMAND_ID } from '../../controller/cellOutputActions.js';
import { autorun, observableValue } from '../../../../../../base/common/observable.js';
import { NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_CELL_OUTPUT_MIMETYPE } from '../../../common/notebookContextKeys.js';
import { TEXT_BASED_MIMETYPES } from '../../viewModel/cellOutputTextHelper.js';
// DOM structure
//
//  #output
//  |
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
//  |                        |  #output-element
//  |                        |  #output-element
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
let CellOutputElement = class CellOutputElement extends Disposable {
    constructor(notebookEditor, viewCell, cellOutputContainer, outputContainer, output, notebookService, quickInputService, parentContextKeyService, menuService, extensionsWorkbenchService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.cellOutputContainer = cellOutputContainer;
        this.outputContainer = outputContainer;
        this.output = output;
        this.notebookService = notebookService;
        this.quickInputService = quickInputService;
        this.menuService = menuService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.instantiationService = instantiationService;
        this.toolbarDisposables = this._register(new DisposableStore());
        this.toolbarAttached = false;
        this._outputHeightTimer = null;
        this.contextKeyService = parentContextKeyService;
        this._register(this.output.model.onDidChangeData(() => {
            this.rerender();
        }));
        this._register(this.output.onDidResetRenderer(() => {
            this.rerender();
        }));
    }
    detach() {
        this.renderedOutputContainer?.remove();
        let count = 0;
        if (this.innerContainer) {
            for (let i = 0; i < this.innerContainer.childNodes.length; i++) {
                if (this.innerContainer.childNodes[i].className === 'rendered-output') {
                    count++;
                }
                if (count > 1) {
                    break;
                }
            }
            if (count === 0) {
                this.innerContainer.remove();
            }
        }
        this.notebookEditor.removeInset(this.output);
    }
    updateDOMTop(top) {
        if (this.innerContainer) {
            this.innerContainer.style.top = `${top}px`;
        }
    }
    rerender() {
        if (this.notebookEditor.hasModel() &&
            this.innerContainer &&
            this.renderResult &&
            this.renderResult.type === 1 /* RenderOutputType.Extension */) {
            // Output rendered by extension renderer got an update
            const [mimeTypes, pick] = this.output.resolveMimeTypes(this.notebookEditor.textModel, this.notebookEditor.activeKernel?.preloadProvides);
            const pickedMimeType = mimeTypes[pick];
            if (pickedMimeType.mimeType === this.renderResult.mimeType && pickedMimeType.rendererId === this.renderResult.renderer.id) {
                // Same mimetype, same renderer, call the extension renderer to update
                const index = this.viewCell.outputsViewModels.indexOf(this.output);
                this.notebookEditor.updateOutput(this.viewCell, this.renderResult, this.viewCell.getOutputOffset(index));
                return;
            }
        }
        if (!this.innerContainer) {
            // init rendering didn't happen
            const currOutputIndex = this.cellOutputContainer.renderedOutputEntries.findIndex(entry => entry.element === this);
            const previousSibling = currOutputIndex > 0 && !!(this.cellOutputContainer.renderedOutputEntries[currOutputIndex - 1].element.innerContainer?.parentElement)
                ? this.cellOutputContainer.renderedOutputEntries[currOutputIndex - 1].element.innerContainer
                : undefined;
            this.render(previousSibling);
        }
        else {
            // Another mimetype or renderer is picked, we need to clear the current output and re-render
            const nextElement = this.innerContainer.nextElementSibling;
            this.toolbarDisposables.clear();
            const element = this.innerContainer;
            if (element) {
                element.remove();
                this.notebookEditor.removeInset(this.output);
            }
            this.render(nextElement);
        }
        this._relayoutCell();
    }
    // insert after previousSibling
    _generateInnerOutputContainer(previousSibling, pickedMimeTypeRenderer) {
        this.innerContainer = DOM.$('.output-inner-container');
        if (previousSibling && previousSibling.nextElementSibling) {
            this.outputContainer.domNode.insertBefore(this.innerContainer, previousSibling.nextElementSibling);
        }
        else {
            this.outputContainer.domNode.appendChild(this.innerContainer);
        }
        this.innerContainer.setAttribute('output-mime-type', pickedMimeTypeRenderer.mimeType);
        return this.innerContainer;
    }
    render(previousSibling) {
        const index = this.viewCell.outputsViewModels.indexOf(this.output);
        if (this.viewCell.isOutputCollapsed || !this.notebookEditor.hasModel()) {
            this.cellOutputContainer.flagAsStale();
            return undefined;
        }
        const notebookUri = CellUri.parse(this.viewCell.uri)?.notebook;
        if (!notebookUri) {
            return undefined;
        }
        const notebookTextModel = this.notebookEditor.textModel;
        const [mimeTypes, pick] = this.output.resolveMimeTypes(notebookTextModel, this.notebookEditor.activeKernel?.preloadProvides);
        const currentMimeType = mimeTypes[pick];
        if (!mimeTypes.find(mimeType => mimeType.isTrusted) || mimeTypes.length === 0) {
            this.viewCell.updateOutputHeight(index, 0, 'CellOutputElement#noMimeType');
            return undefined;
        }
        const selectedPresentation = mimeTypes[pick];
        let renderer = this.notebookService.getRendererInfo(selectedPresentation.rendererId);
        if (!renderer && selectedPresentation.mimeType.indexOf('text/') > -1) {
            renderer = this.notebookService.getRendererInfo('vscode.builtin-renderer');
        }
        const innerContainer = this._generateInnerOutputContainer(previousSibling, selectedPresentation);
        if (index === 0 || this.output.visible.get()) {
            this._attachToolbar(innerContainer, notebookTextModel, this.notebookEditor.activeKernel, index, currentMimeType, mimeTypes);
        }
        else {
            this._register(autorun((reader) => {
                const visible = reader.readObservable(this.output.visible);
                if (visible && !this.toolbarAttached) {
                    this._attachToolbar(innerContainer, notebookTextModel, this.notebookEditor.activeKernel, index, currentMimeType, mimeTypes);
                }
                else if (!visible) {
                    this.toolbarDisposables.clear();
                }
                this.cellOutputContainer.checkForHiddenOutputs();
            }));
            this.cellOutputContainer.hasHiddenOutputs.set(true, undefined);
        }
        this.renderedOutputContainer = DOM.append(innerContainer, DOM.$('.rendered-output'));
        this.renderResult = renderer
            ? { type: 1 /* RenderOutputType.Extension */, renderer, source: this.output, mimeType: selectedPresentation.mimeType }
            : this._renderMissingRenderer(this.output, selectedPresentation.mimeType);
        this.output.pickedMimeType = selectedPresentation;
        if (!this.renderResult) {
            this.viewCell.updateOutputHeight(index, 0, 'CellOutputElement#renderResultUndefined');
            return undefined;
        }
        this.notebookEditor.createOutput(this.viewCell, this.renderResult, this.viewCell.getOutputOffset(index), false);
        innerContainer.classList.add('background');
        return { initRenderIsSynchronous: false };
    }
    _renderMissingRenderer(viewModel, preferredMimeType) {
        if (!viewModel.model.outputs.length) {
            return this._renderMessage(viewModel, nls.localize('empty', "Cell has no output"));
        }
        if (!preferredMimeType) {
            const mimeTypes = viewModel.model.outputs.map(op => op.mime);
            const mimeTypesMessage = mimeTypes.join(', ');
            return this._renderMessage(viewModel, nls.localize('noRenderer.2', "No renderer could be found for output. It has the following mimetypes: {0}", mimeTypesMessage));
        }
        return this._renderSearchForMimetype(viewModel, preferredMimeType);
    }
    _renderSearchForMimetype(viewModel, mimeType) {
        const query = `@tag:notebookRenderer ${mimeType}`;
        const p = DOM.$('p', undefined, `No renderer could be found for mimetype "${mimeType}", but one might be available on the Marketplace.`);
        const a = DOM.$('a', { href: `command:workbench.extensions.search?%22${query}%22`, class: 'monaco-button monaco-text-button', tabindex: 0, role: 'button', style: 'padding: 8px; text-decoration: none; color: rgb(255, 255, 255); background-color: rgb(14, 99, 156); max-width: 200px;' }, `Search Marketplace`);
        return {
            type: 0 /* RenderOutputType.Html */,
            source: viewModel,
            htmlContent: p.outerHTML + a.outerHTML
        };
    }
    _renderMessage(viewModel, message) {
        const el = DOM.$('p', undefined, message);
        return { type: 0 /* RenderOutputType.Html */, source: viewModel, htmlContent: el.outerHTML };
    }
    shouldEnableCopy(mimeTypes) {
        if (!mimeTypes.find(mimeType => TEXT_BASED_MIMETYPES.indexOf(mimeType.mimeType) || mimeType.mimeType.startsWith('image/'))) {
            return false;
        }
        if (isTextStreamMime(mimeTypes[0].mimeType)) {
            const cellViewModel = this.output.cellViewModel;
            const index = cellViewModel.outputsViewModels.indexOf(this.output);
            if (index > 0) {
                const previousOutput = cellViewModel.model.outputs[index - 1];
                // if the previous output was also a stream, the copy command will be in that output instead
                return !isTextStreamMime(previousOutput.outputs[0].mime);
            }
        }
        return true;
    }
    async _attachToolbar(outputItemDiv, notebookTextModel, kernel, index, currentMimeType, mimeTypes) {
        const hasMultipleMimeTypes = mimeTypes.filter(mimeType => mimeType.isTrusted).length > 1;
        const isCopyEnabled = this.shouldEnableCopy(mimeTypes);
        if (index > 0 && !hasMultipleMimeTypes && !isCopyEnabled) {
            // nothing to put in the toolbar
            return;
        }
        if (!this.notebookEditor.hasModel()) {
            return;
        }
        outputItemDiv.style.position = 'relative';
        const mimeTypePicker = DOM.$('.cell-output-toolbar');
        outputItemDiv.appendChild(mimeTypePicker);
        const toolbar = this.toolbarDisposables.add(this.instantiationService.createInstance(WorkbenchToolBar, mimeTypePicker, {
            renderDropdownAsChildElement: false
        }));
        toolbar.context = {
            ui: true,
            cell: this.output.cellViewModel,
            outputViewModel: this.output,
            notebookEditor: this.notebookEditor,
            $mid: 13 /* MarshalledId.NotebookCellActionContext */
        };
        // TODO: This could probably be a real registered action, but it has to talk to this output element
        const pickAction = this.toolbarDisposables.add(new Action('notebook.output.pickMimetype', nls.localize('pickMimeType', "Change Presentation"), ThemeIcon.asClassName(mimetypeIcon), undefined, async (_context) => this._pickActiveMimeTypeRenderer(outputItemDiv, notebookTextModel, kernel, this.output)));
        const menuContextKeyService = this.toolbarDisposables.add(this.contextKeyService.createScoped(outputItemDiv));
        const hasHiddenOutputs = NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS.bindTo(menuContextKeyService);
        const isFirstCellOutput = NOTEBOOK_CELL_IS_FIRST_OUTPUT.bindTo(menuContextKeyService);
        const cellOutputMimetype = NOTEBOOK_CELL_OUTPUT_MIMETYPE.bindTo(menuContextKeyService);
        isFirstCellOutput.set(index === 0);
        cellOutputMimetype.set(currentMimeType.mimeType);
        this.toolbarDisposables.add(autorun((r) => { hasHiddenOutputs.set(this.cellOutputContainer.hasHiddenOutputs.read(r)); }));
        const menu = this.toolbarDisposables.add(this.menuService.createMenu(MenuId.NotebookOutputToolbar, menuContextKeyService));
        const updateMenuToolbar = () => {
            let { secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), () => false);
            if (!isCopyEnabled) {
                secondary = secondary.filter((action) => action.id !== COPY_OUTPUT_COMMAND_ID);
            }
            if (hasMultipleMimeTypes) {
                secondary = [pickAction, ...secondary];
            }
            toolbar.setActions([], secondary);
        };
        updateMenuToolbar();
        this.toolbarDisposables.add(menu.onDidChange(updateMenuToolbar));
    }
    async _pickActiveMimeTypeRenderer(outputItemDiv, notebookTextModel, kernel, viewModel) {
        const [mimeTypes, currIndex] = viewModel.resolveMimeTypes(notebookTextModel, kernel?.preloadProvides);
        const items = [];
        const unsupportedItems = [];
        mimeTypes.forEach((mimeType, index) => {
            if (mimeType.isTrusted) {
                const arr = mimeType.rendererId === RENDERER_NOT_AVAILABLE ?
                    unsupportedItems :
                    items;
                arr.push({
                    label: mimeType.mimeType,
                    id: mimeType.mimeType,
                    index: index,
                    picked: index === currIndex,
                    detail: this._generateRendererInfo(mimeType.rendererId),
                    description: index === currIndex ? nls.localize('curruentActiveMimeType', "Currently Active") : undefined
                });
            }
        });
        if (unsupportedItems.some(m => JUPYTER_RENDERER_MIMETYPES.includes(m.id))) {
            unsupportedItems.push({
                label: nls.localize('installJupyterPrompt', "Install additional renderers from the marketplace"),
                id: 'installRenderers',
                index: mimeTypes.length
            });
        }
        const disposables = new DisposableStore();
        const picker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        picker.items = [
            ...items,
            { type: 'separator' },
            ...unsupportedItems
        ];
        picker.activeItems = items.filter(item => !!item.picked);
        picker.placeholder = items.length !== mimeTypes.length
            ? nls.localize('promptChooseMimeTypeInSecure.placeHolder', "Select mimetype to render for current output")
            : nls.localize('promptChooseMimeType.placeHolder', "Select mimetype to render for current output");
        const pick = await new Promise(resolve => {
            disposables.add(picker.onDidAccept(() => {
                resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0] : undefined);
                disposables.dispose();
            }));
            picker.show();
        });
        if (pick === undefined || pick.index === currIndex) {
            return;
        }
        if (pick.id === 'installRenderers') {
            this._showJupyterExtension();
            return;
        }
        // user chooses another mimetype
        const nextElement = outputItemDiv.nextElementSibling;
        this.toolbarDisposables.clear();
        const element = this.innerContainer;
        if (element) {
            element.remove();
            this.notebookEditor.removeInset(viewModel);
        }
        viewModel.pickedMimeType = mimeTypes[pick.index];
        this.viewCell.updateOutputMinHeight(this.viewCell.layoutInfo.outputTotalHeight);
        const { mimeType, rendererId } = mimeTypes[pick.index];
        this.notebookService.updateMimePreferredRenderer(notebookTextModel.viewType, mimeType, rendererId, mimeTypes.map(m => m.mimeType));
        this.render(nextElement);
        this._validateFinalOutputHeight(false);
        this._relayoutCell();
    }
    async _showJupyterExtension() {
        await this.extensionsWorkbenchService.openSearch(`@id:${JUPYTER_EXTENSION_ID}`);
    }
    _generateRendererInfo(renderId) {
        const renderInfo = this.notebookService.getRendererInfo(renderId);
        if (renderInfo) {
            const displayName = renderInfo.displayName !== '' ? renderInfo.displayName : renderInfo.id;
            return `${displayName} (${renderInfo.extensionId.value})`;
        }
        return nls.localize('unavailableRenderInfo', "renderer not available");
    }
    _validateFinalOutputHeight(synchronous) {
        if (this._outputHeightTimer !== null) {
            clearTimeout(this._outputHeightTimer);
        }
        if (synchronous) {
            this.viewCell.unlockOutputHeight();
        }
        else {
            this._outputHeightTimer = setTimeout(() => {
                this.viewCell.unlockOutputHeight();
            }, 1000);
        }
    }
    _relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        if (this._outputHeightTimer) {
            this.viewCell.unlockOutputHeight();
            clearTimeout(this._outputHeightTimer);
        }
        super.dispose();
    }
};
CellOutputElement = __decorate([
    __param(5, INotebookService),
    __param(6, IQuickInputService),
    __param(7, IContextKeyService),
    __param(8, IMenuService),
    __param(9, IExtensionsWorkbenchService),
    __param(10, IInstantiationService)
], CellOutputElement);
class OutputEntryViewHandler {
    constructor(model, element) {
        this.model = model;
        this.element = element;
    }
}
var CellOutputUpdateContext;
(function (CellOutputUpdateContext) {
    CellOutputUpdateContext[CellOutputUpdateContext["Execution"] = 1] = "Execution";
    CellOutputUpdateContext[CellOutputUpdateContext["Other"] = 2] = "Other";
})(CellOutputUpdateContext || (CellOutputUpdateContext = {}));
let CellOutputContainer = class CellOutputContainer extends CellContentPart {
    checkForHiddenOutputs() {
        if (this._outputEntries.find(entry => { return !entry.model.visible.get(); })) {
            this.hasHiddenOutputs.set(true, undefined);
        }
        else {
            this.hasHiddenOutputs.set(false, undefined);
        }
    }
    get renderedOutputEntries() {
        return this._outputEntries;
    }
    constructor(notebookEditor, viewCell, templateData, options, openerService, _notebookExecutionStateService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this.options = options;
        this.openerService = openerService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.instantiationService = instantiationService;
        this._outputEntries = [];
        this._hasStaleOutputs = false;
        this.hasHiddenOutputs = observableValue('hasHiddenOutputs', false);
        this._outputHeightTimer = null;
        this._register(viewCell.onDidStartExecution(() => {
            viewCell.updateOutputMinHeight(viewCell.layoutInfo.outputTotalHeight);
        }));
        this._register(viewCell.onDidStopExecution(() => {
            this._validateFinalOutputHeight(false);
        }));
        this._register(viewCell.onDidChangeOutputs(splice => {
            const executionState = this._notebookExecutionStateService.getCellExecution(viewCell.uri);
            const context = executionState ? 1 /* CellOutputUpdateContext.Execution */ : 2 /* CellOutputUpdateContext.Other */;
            this._updateOutputs(splice, context);
        }));
        this._register(viewCell.onDidChangeLayout(() => {
            this.updateInternalLayoutNow(viewCell);
        }));
    }
    updateInternalLayoutNow(viewCell) {
        this.templateData.outputContainer.setTop(viewCell.layoutInfo.outputContainerOffset);
        this.templateData.outputShowMoreContainer.setTop(viewCell.layoutInfo.outputShowMoreContainerOffset);
        this._outputEntries.forEach(entry => {
            const index = this.viewCell.outputsViewModels.indexOf(entry.model);
            if (index >= 0) {
                const top = this.viewCell.getOutputOffsetInContainer(index);
                entry.element.updateDOMTop(top);
            }
        });
    }
    render() {
        try {
            this._doRender();
        }
        finally {
            // TODO@rebornix, this is probably not necessary at all as cell layout change would send the update request.
            this._relayoutCell();
        }
    }
    /**
     * Notify that an output may have been swapped out without the model getting rendered.
     */
    flagAsStale() {
        this._hasStaleOutputs = true;
    }
    _doRender() {
        if (this.viewCell.outputsViewModels.length > 0) {
            if (this.viewCell.layoutInfo.outputTotalHeight !== 0) {
                this.viewCell.updateOutputMinHeight(this.viewCell.layoutInfo.outputTotalHeight);
            }
            DOM.show(this.templateData.outputContainer.domNode);
            for (let index = 0; index < Math.min(this.options.limit, this.viewCell.outputsViewModels.length); index++) {
                const currOutput = this.viewCell.outputsViewModels[index];
                const entry = this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, currOutput);
                this._outputEntries.push(new OutputEntryViewHandler(currOutput, entry));
                entry.render(undefined);
            }
            if (this.viewCell.outputsViewModels.length > this.options.limit) {
                DOM.show(this.templateData.outputShowMoreContainer.domNode);
                this.viewCell.updateOutputShowMoreContainerHeight(46);
            }
            this._validateFinalOutputHeight(false);
        }
        else {
            // noop
            DOM.hide(this.templateData.outputContainer.domNode);
        }
        this.templateData.outputShowMoreContainer.domNode.innerText = '';
        if (this.viewCell.outputsViewModels.length > this.options.limit) {
            this.templateData.outputShowMoreContainer.domNode.appendChild(this._generateShowMoreElement(this.templateData.templateDisposables));
        }
        else {
            DOM.hide(this.templateData.outputShowMoreContainer.domNode);
            this.viewCell.updateOutputShowMoreContainerHeight(0);
        }
    }
    viewUpdateShowOutputs(initRendering) {
        if (this._hasStaleOutputs) {
            this._hasStaleOutputs = false;
            this._outputEntries.forEach(entry => {
                entry.element.rerender();
            });
        }
        for (let index = 0; index < this._outputEntries.length; index++) {
            const viewHandler = this._outputEntries[index];
            const outputEntry = viewHandler.element;
            if (outputEntry.renderResult) {
                this.notebookEditor.createOutput(this.viewCell, outputEntry.renderResult, this.viewCell.getOutputOffset(index), false);
            }
            else {
                outputEntry.render(undefined);
            }
        }
        this._relayoutCell();
    }
    viewUpdateHideOuputs() {
        for (let index = 0; index < this._outputEntries.length; index++) {
            this.notebookEditor.hideInset(this._outputEntries[index].model);
        }
    }
    _validateFinalOutputHeight(synchronous) {
        if (this._outputHeightTimer !== null) {
            clearTimeout(this._outputHeightTimer);
        }
        const executionState = this._notebookExecutionStateService.getCellExecution(this.viewCell.uri);
        if (synchronous) {
            this.viewCell.unlockOutputHeight();
        }
        else if (executionState?.state !== NotebookCellExecutionState.Executing) {
            this._outputHeightTimer = setTimeout(() => {
                this.viewCell.unlockOutputHeight();
            }, 200);
        }
    }
    _updateOutputs(splice, context = 2 /* CellOutputUpdateContext.Other */) {
        const previousOutputHeight = this.viewCell.layoutInfo.outputTotalHeight;
        // for cell output update, we make sure the cell does not shrink before the new outputs are rendered.
        this.viewCell.updateOutputMinHeight(previousOutputHeight);
        if (this.viewCell.outputsViewModels.length) {
            DOM.show(this.templateData.outputContainer.domNode);
        }
        else {
            DOM.hide(this.templateData.outputContainer.domNode);
        }
        this.viewCell.spliceOutputHeights(splice.start, splice.deleteCount, splice.newOutputs.map(_ => 0));
        this._renderNow(splice, context);
    }
    _renderNow(splice, context) {
        if (splice.start >= this.options.limit) {
            // splice items out of limit
            return;
        }
        const firstGroupEntries = this._outputEntries.slice(0, splice.start);
        const deletedEntries = this._outputEntries.slice(splice.start, splice.start + splice.deleteCount);
        const secondGroupEntries = this._outputEntries.slice(splice.start + splice.deleteCount);
        let newlyInserted = this.viewCell.outputsViewModels.slice(splice.start, splice.start + splice.newOutputs.length);
        // [...firstGroup, ...deletedEntries, ...secondGroupEntries]  [...restInModel]
        // [...firstGroup, ...newlyInserted, ...secondGroupEntries, restInModel]
        if (firstGroupEntries.length + newlyInserted.length + secondGroupEntries.length > this.options.limit) {
            // exceeds limit again
            if (firstGroupEntries.length + newlyInserted.length > this.options.limit) {
                [...deletedEntries, ...secondGroupEntries].forEach(entry => {
                    entry.element.detach();
                    entry.element.dispose();
                });
                newlyInserted = newlyInserted.slice(0, this.options.limit - firstGroupEntries.length);
                const newlyInsertedEntries = newlyInserted.map(insert => {
                    return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
                });
                this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries];
                // render newly inserted outputs
                for (let i = firstGroupEntries.length; i < this._outputEntries.length; i++) {
                    this._outputEntries[i].element.render(undefined);
                }
            }
            else {
                // part of secondGroupEntries are pushed out of view
                // now we have to be creative as secondGroupEntries might not use dedicated containers
                const elementsPushedOutOfView = secondGroupEntries.slice(this.options.limit - firstGroupEntries.length - newlyInserted.length);
                [...deletedEntries, ...elementsPushedOutOfView].forEach(entry => {
                    entry.element.detach();
                    entry.element.dispose();
                });
                // exclusive
                const reRenderRightBoundary = firstGroupEntries.length + newlyInserted.length;
                const newlyInsertedEntries = newlyInserted.map(insert => {
                    return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
                });
                this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries, ...secondGroupEntries.slice(0, this.options.limit - firstGroupEntries.length - newlyInserted.length)];
                for (let i = firstGroupEntries.length; i < reRenderRightBoundary; i++) {
                    const previousSibling = i - 1 >= 0 && this._outputEntries[i - 1] && !!(this._outputEntries[i - 1].element.innerContainer?.parentElement) ? this._outputEntries[i - 1].element.innerContainer : undefined;
                    this._outputEntries[i].element.render(previousSibling);
                }
            }
        }
        else {
            // after splice, it doesn't exceed
            deletedEntries.forEach(entry => {
                entry.element.detach();
                entry.element.dispose();
            });
            const reRenderRightBoundary = firstGroupEntries.length + newlyInserted.length;
            const newlyInsertedEntries = newlyInserted.map(insert => {
                return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
            });
            let outputsNewlyAvailable = [];
            if (firstGroupEntries.length + newlyInsertedEntries.length + secondGroupEntries.length < this.viewCell.outputsViewModels.length) {
                const last = Math.min(this.options.limit, this.viewCell.outputsViewModels.length);
                outputsNewlyAvailable = this.viewCell.outputsViewModels.slice(firstGroupEntries.length + newlyInsertedEntries.length + secondGroupEntries.length, last).map(output => {
                    return new OutputEntryViewHandler(output, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, output));
                });
            }
            this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries, ...secondGroupEntries, ...outputsNewlyAvailable];
            for (let i = firstGroupEntries.length; i < reRenderRightBoundary; i++) {
                const previousSibling = i - 1 >= 0 && this._outputEntries[i - 1] && !!(this._outputEntries[i - 1].element.innerContainer?.parentElement) ? this._outputEntries[i - 1].element.innerContainer : undefined;
                this._outputEntries[i].element.render(previousSibling);
            }
            for (let i = 0; i < outputsNewlyAvailable.length; i++) {
                this._outputEntries[firstGroupEntries.length + newlyInserted.length + secondGroupEntries.length + i].element.render(undefined);
            }
        }
        if (this.viewCell.outputsViewModels.length > this.options.limit) {
            DOM.show(this.templateData.outputShowMoreContainer.domNode);
            if (!this.templateData.outputShowMoreContainer.domNode.hasChildNodes()) {
                this.templateData.outputShowMoreContainer.domNode.appendChild(this._generateShowMoreElement(this.templateData.templateDisposables));
            }
            this.viewCell.updateOutputShowMoreContainerHeight(46);
        }
        else {
            DOM.hide(this.templateData.outputShowMoreContainer.domNode);
        }
        this._relayoutCell();
        // if it's clearing all outputs, or outputs are all rendered synchronously
        // shrink immediately as the final output height will be zero.
        // if it's rerun, then the output clearing might be temporary, so we don't shrink immediately
        this._validateFinalOutputHeight(context === 2 /* CellOutputUpdateContext.Other */ && this.viewCell.outputsViewModels.length === 0);
    }
    _generateShowMoreElement(disposables) {
        const md = {
            value: `There are more than ${this.options.limit} outputs, [show more (open the raw output data in a text editor) ...](command:workbench.action.openLargeOutput)`,
            isTrusted: true,
            supportThemeIcons: true
        };
        const rendered = renderMarkdown(md, {
            actionHandler: {
                callback: (content) => {
                    if (content === 'command:workbench.action.openLargeOutput') {
                        this.openerService.open(CellUri.generateCellOutputUriWithId(this.notebookEditor.textModel.uri));
                    }
                    return;
                },
                disposables
            }
        });
        disposables.add(rendered);
        rendered.element.classList.add('output-show-more');
        return rendered.element;
    }
    _relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        this.viewCell.updateOutputMinHeight(0);
        if (this._outputHeightTimer) {
            clearTimeout(this._outputHeightTimer);
        }
        this._outputEntries.forEach(entry => {
            entry.element.dispose();
        });
        super.dispose();
    }
};
CellOutputContainer = __decorate([
    __param(4, IOpenerService),
    __param(5, INotebookExecutionStateService),
    __param(6, IInstantiationService)
], CellOutputContainer);
export { CellOutputContainer };
const JUPYTER_RENDERER_MIMETYPES = [
    'application/geo+json',
    'application/vdom.v1+json',
    'application/vnd.dataresource+json',
    'application/vnd.plotly.v1+json',
    'application/vnd.vega.v2+json',
    'application/vnd.vega.v3+json',
    'application/vnd.vega.v4+json',
    'application/vnd.vega.v5+json',
    'application/vnd.vegalite.v1+json',
    'application/vnd.vegalite.v2+json',
    'application/vnd.vegalite.v3+json',
    'application/vnd.vegalite.v4+json',
    'application/x-nteract-model-debug+json',
    'image/svg+xml',
    'text/latex',
    'text/vnd.plotly.v1+html',
    'application/vnd.jupyter.widget-view+json',
    'application/vnd.code.notebook.error'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsT3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFFN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXpGLE9BQU8sS0FBSyxHQUFHLE1BQU0sMEJBQTBCLENBQUM7QUFDaEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFrQixNQUFNLDREQUE0RCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRixPQUFPLEVBQXFGLG9CQUFvQixFQUFvQixNQUFN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