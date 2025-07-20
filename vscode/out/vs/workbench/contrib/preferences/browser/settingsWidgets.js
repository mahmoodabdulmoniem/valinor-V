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
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { defaultButtonStyles, getInputBoxStyle, getSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { hasNativeContextMenu } from '../../../../platform/window/common/window.js';
import { settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground } from '../common/settingsEditorColorRegistry.js';
import './media/settingsWidgets.css';
import { settingsDiscardIcon, settingsEditIcon, settingsRemoveIcon } from './preferencesIcons.js';
const $ = DOM.$;
export class ListSettingListModel {
    get items() {
        const items = this._dataItems.map((item, i) => {
            const editing = typeof this._editKey === 'number' && this._editKey === i;
            return {
                ...item,
                editing,
                selected: i === this._selectedIdx || editing
            };
        });
        if (this._editKey === 'create') {
            items.push({
                editing: true,
                selected: true,
                ...this._newDataItem,
            });
        }
        return items;
    }
    constructor(newItem) {
        this._dataItems = [];
        this._editKey = null;
        this._selectedIdx = null;
        this._newDataItem = newItem;
    }
    setEditKey(key) {
        this._editKey = key;
    }
    setValue(listData) {
        this._dataItems = listData;
    }
    select(idx) {
        this._selectedIdx = idx;
    }
    getSelected() {
        return this._selectedIdx;
    }
    selectNext() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.min(this._selectedIdx + 1, this._dataItems.length - 1);
        }
        else {
            this._selectedIdx = 0;
        }
    }
    selectPrevious() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
        }
        else {
            this._selectedIdx = 0;
        }
    }
}
let AbstractListSettingWidget = class AbstractListSettingWidget extends Disposable {
    get domNode() {
        return this.listElement;
    }
    get items() {
        return this.model.items;
    }
    get isReadOnly() {
        return false;
    }
    constructor(container, themeService, contextViewService, configurationService) {
        super();
        this.container = container;
        this.themeService = themeService;
        this.contextViewService = contextViewService;
        this.configurationService = configurationService;
        this.rowElements = [];
        this._onDidChangeList = this._register(new Emitter());
        this.model = new ListSettingListModel(this.getEmptyItem());
        this.listDisposables = this._register(new DisposableStore());
        this.onDidChangeList = this._onDidChangeList.event;
        this.listElement = DOM.append(container, $('div'));
        this.listElement.setAttribute('role', 'list');
        this.getContainerClasses().forEach(c => this.listElement.classList.add(c));
        DOM.append(container, this.renderAddButton());
        this.renderList();
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.POINTER_DOWN, e => this.onListClick(e)));
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.DBLCLICK, e => this.onListDoubleClick(e)));
        this._register(DOM.addStandardDisposableListener(this.listElement, 'keydown', (e) => {
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                this.selectPreviousRow();
            }
            else if (e.equals(18 /* KeyCode.DownArrow */)) {
                this.selectNextRow();
            }
            else {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        }));
    }
    setValue(listData) {
        this.model.setValue(listData);
        this.renderList();
    }
    renderHeader() {
        return;
    }
    isAddButtonVisible() {
        return true;
    }
    renderList() {
        const focused = DOM.isAncestorOfActiveElement(this.listElement);
        DOM.clearNode(this.listElement);
        this.listDisposables.clear();
        const newMode = this.model.items.some(item => !!(item.editing && this.isItemNew(item)));
        this.container.classList.toggle('setting-list-hide-add-button', !this.isAddButtonVisible() || newMode);
        if (this.model.items.length) {
            this.listElement.tabIndex = 0;
        }
        else {
            this.listElement.removeAttribute('tabIndex');
        }
        const header = this.renderHeader();
        if (header) {
            this.listElement.appendChild(header);
        }
        this.rowElements = this.model.items.map((item, i) => this.renderDataOrEditItem(item, i, focused));
        this.rowElements.forEach(rowElement => this.listElement.appendChild(rowElement));
    }
    createBasicSelectBox(value) {
        const selectBoxOptions = value.options.map(({ value, description }) => ({ text: value, description }));
        const selected = value.options.findIndex(option => value.data === option.value);
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder
        });
        const selectBox = new SelectBox(selectBoxOptions, selected, this.contextViewService, styles, {
            useCustomDrawn: !hasNativeContextMenu(this.configurationService) || !(isIOS && BrowserFeatures.pointerEvents)
        });
        return selectBox;
    }
    editSetting(idx) {
        this.model.setEditKey(idx);
        this.renderList();
    }
    cancelEdit() {
        this.model.setEditKey('none');
        this.renderList();
    }
    handleItemChange(originalItem, changedItem, idx) {
        this.model.setEditKey('none');
        if (this.isItemNew(originalItem)) {
            this._onDidChangeList.fire({
                type: 'add',
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        else {
            this._onDidChangeList.fire({
                type: 'change',
                originalItem,
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        this.renderList();
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = item.editing ?
            this.renderEdit(item, idx) :
            this.renderDataItem(item, idx, listFocused);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderDataItem(item, idx, listFocused) {
        const rowElementGroup = this.renderItem(item, idx);
        const rowElement = rowElementGroup.rowElement;
        rowElement.setAttribute('data-index', idx + '');
        rowElement.setAttribute('tabindex', item.selected ? '0' : '-1');
        rowElement.classList.toggle('selected', item.selected);
        const actionBar = new ActionBar(rowElement);
        this.listDisposables.add(actionBar);
        actionBar.push(this.getActionsForItem(item, idx), { icon: true, label: true });
        this.addTooltipsToRow(rowElementGroup, item);
        if (item.selected && listFocused) {
            disposableTimeout(() => rowElement.focus(), undefined, this.listDisposables);
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, 'click', (e) => {
            // There is a parent list widget, which is the one that holds the list of settings.
            // Prevent the parent widget from trying to interpret this click event.
            e.stopPropagation();
        }));
        return rowElement;
    }
    renderAddButton() {
        const rowElement = $('.setting-list-new-row');
        const startAddButton = this._register(new Button(rowElement, defaultButtonStyles));
        startAddButton.label = this.getLocalizedStrings().addButtonLabel;
        startAddButton.element.classList.add('setting-list-addButton');
        this._register(startAddButton.onDidClick(() => {
            this.model.setEditKey('create');
            this.renderList();
        }));
        return rowElement;
    }
    onListClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.model.getSelected() === targetIdx) {
            return;
        }
        this.selectRow(targetIdx);
    }
    onListDoubleClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        if (this.isReadOnly) {
            return;
        }
        const item = this.model.items[targetIdx];
        if (item) {
            this.editSetting(targetIdx);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    getClickedItemIndex(e) {
        if (!e.target) {
            return -1;
        }
        const actionbar = DOM.findParentWithClass(e.target, 'monaco-action-bar');
        if (actionbar) {
            // Don't handle doubleclicks inside the action bar
            return -1;
        }
        const element = DOM.findParentWithClass(e.target, 'setting-list-row');
        if (!element) {
            return -1;
        }
        const targetIdxStr = element.getAttribute('data-index');
        if (!targetIdxStr) {
            return -1;
        }
        const targetIdx = parseInt(targetIdxStr);
        return targetIdx;
    }
    selectRow(idx) {
        this.model.select(idx);
        this.rowElements.forEach(row => row.classList.remove('selected'));
        const selectedRow = this.rowElements[this.model.getSelected()];
        selectedRow.classList.add('selected');
        selectedRow.focus();
    }
    selectNextRow() {
        this.model.selectNext();
        this.selectRow(this.model.getSelected());
    }
    selectPreviousRow() {
        this.model.selectPrevious();
        this.selectRow(this.model.getSelected());
    }
};
AbstractListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IConfigurationService)
], AbstractListSettingWidget);
export { AbstractListSettingWidget };
let ListSettingWidget = class ListSettingWidget extends AbstractListSettingWidget {
    setValue(listData, options) {
        this.keyValueSuggester = options?.keySuggester;
        this.showAddButton = options?.showAddButton ?? true;
        super.setValue(listData);
    }
    constructor(container, themeService, contextViewService, hoverService, configurationService) {
        super(container, themeService, contextViewService, configurationService);
        this.hoverService = hoverService;
        this.showAddButton = true;
    }
    getEmptyItem() {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            value: {
                type: 'string',
                data: ''
            }
        };
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    getContainerClasses() {
        return ['setting-list-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        return [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx)
            },
            {
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx })
            }
        ];
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        const valueElement = DOM.append(rowElement, $('.setting-list-value'));
        const siblingElement = DOM.append(rowElement, $('.setting-list-sibling'));
        valueElement.textContent = item.value.data.toString();
        if (item.sibling) {
            siblingElement.textContent = `when: ${item.sibling}`;
        }
        else {
            siblingElement.textContent = null;
            valueElement.classList.add('no-sibling');
        }
        this.addDragAndDrop(rowElement, item, idx);
        return { rowElement, keyElement: valueElement, valueElement: siblingElement };
    }
    addDragAndDrop(rowElement, item, idx) {
        if (this.model.items.every(item => !item.editing)) {
            rowElement.draggable = true;
            rowElement.classList.add('draggable');
        }
        else {
            rowElement.draggable = false;
            rowElement.classList.remove('draggable');
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_START, (ev) => {
            this.dragDetails = {
                element: rowElement,
                item,
                itemIndex: idx
            };
            applyDragImage(ev, rowElement, item.value.data);
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_OVER, (ev) => {
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            if (ev.dataTransfer) {
                ev.dataTransfer.dropEffect = 'move';
            }
            return true;
        }));
        let counter = 0;
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_ENTER, (ev) => {
            counter++;
            rowElement.classList.add('drag-hover');
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_LEAVE, (ev) => {
            counter--;
            if (!counter) {
                rowElement.classList.remove('drag-hover');
            }
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DROP, (ev) => {
            // cancel the op if we dragged to a completely different setting
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            counter = 0;
            if (this.dragDetails.element !== rowElement) {
                this._onDidChangeList.fire({
                    type: 'move',
                    originalItem: this.dragDetails.item,
                    sourceIndex: this.dragDetails.itemIndex,
                    newItem: item,
                    targetIndex: idx
                });
            }
            return true;
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_END, (ev) => {
            counter = 0;
            rowElement.classList.remove('drag-hover');
            ev.dataTransfer?.clearData();
            if (this.dragDetails) {
                this.dragDetails = undefined;
            }
        }));
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row');
        let valueInput;
        let currentDisplayValue;
        let currentEnumOptions;
        if (this.keyValueSuggester) {
            const enumData = this.keyValueSuggester(this.model.items.map(({ value: { data } }) => data), idx);
            item = {
                ...item,
                value: {
                    type: 'enum',
                    data: item.value.data,
                    options: enumData ? enumData.options : []
                }
            };
        }
        switch (item.value.type) {
            case 'string':
                valueInput = this.renderInputBox(item.value, rowElement);
                break;
            case 'enum':
                valueInput = this.renderDropdown(item.value, rowElement);
                currentEnumOptions = item.value.options;
                if (item.value.options.length) {
                    currentDisplayValue = this.isItemNew(item) ?
                        currentEnumOptions[0].value : item.value.data;
                }
                break;
        }
        const updatedInputBoxItem = () => {
            const inputBox = valueInput;
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'string',
                    data: inputBox.value
                },
                sibling: siblingInput?.value
            };
        };
        const updatedSelectBoxItem = (selectedValue) => {
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'enum',
                    data: selectedValue,
                    options: currentEnumOptions ?? []
                }
            };
        };
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
            rowElement?.focus();
        };
        if (item.value.type !== 'string') {
            const selectBox = valueInput;
            this.listDisposables.add(selectBox.onDidSelect(({ selected }) => {
                currentDisplayValue = selected;
            }));
        }
        else {
            const inputBox = valueInput;
            this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        let siblingInput;
        if (!isUndefinedOrNull(item.sibling)) {
            siblingInput = new InputBox(rowElement, this.contextViewService, {
                placeholder: this.getLocalizedStrings().siblingInputPlaceholder,
                inputBoxStyles: getInputBoxStyle({
                    inputBackground: settingsTextInputBackground,
                    inputForeground: settingsTextInputForeground,
                    inputBorder: settingsTextInputBorder
                })
            });
            siblingInput.element.classList.add('setting-list-siblingInput');
            this.listDisposables.add(siblingInput);
            siblingInput.value = item.sibling;
            this.listDisposables.add(DOM.addStandardDisposableListener(siblingInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        else if (valueInput instanceof InputBox) {
            valueInput.element.classList.add('no-sibling');
        }
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.label = localize('okButton', "OK");
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => {
            if (item.value.type === 'string') {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else {
                this.handleItemChange(item, updatedSelectBoxItem(currentDisplayValue), idx);
            }
        }));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', "Cancel");
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            valueInput.focus();
            if (valueInput instanceof InputBox) {
                valueInput.select();
            }
        }));
        return rowElement;
    }
    isItemNew(item) {
        return item.value.data === '';
    }
    addTooltipsToRow(rowElementGroup, { value, sibling }) {
        const title = isUndefinedOrNull(sibling)
            ? localize('listValueHintLabel', "List item `{0}`", value.data)
            : localize('listSiblingHintLabel', "List item `{0}` with sibling `${1}`", value.data, sibling);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: title }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            inputPlaceholder: localize('itemInputPlaceholder', "Item..."),
            siblingInputPlaceholder: localize('listSiblingInputPlaceholder', "Sibling..."),
        };
    }
    renderInputBox(value, rowElement) {
        const valueInput = new InputBox(rowElement, this.contextViewService, {
            placeholder: this.getLocalizedStrings().inputPlaceholder,
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder
            })
        });
        valueInput.element.classList.add('setting-list-valueInput');
        this.listDisposables.add(valueInput);
        valueInput.value = value.data.toString();
        return valueInput;
    }
    renderDropdown(value, rowElement) {
        if (value.type !== 'enum') {
            throw new Error('Valuetype must be enum.');
        }
        const selectBox = this.createBasicSelectBox(value);
        const wrapper = $('.setting-list-object-list-row');
        selectBox.render(wrapper);
        rowElement.appendChild(wrapper);
        return selectBox;
    }
};
ListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService),
    __param(4, IConfigurationService)
], ListSettingWidget);
export { ListSettingWidget };
export class ExcludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('excludePatternHintLabel', "Exclude files matching `{0}`", item.value.data)
            : localize('excludeSiblingHintLabel', "Exclude files matching `{0}`, only when a file matching `{1}` is present", item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', ". Default value provided by `{0}`", item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeExcludeItem', "Remove Exclude Item"),
            editActionTooltip: localize('editExcludeItem', "Edit Exclude Item"),
            addButtonLabel: localize('addPattern', "Add Pattern"),
            inputPlaceholder: localize('excludePatternInputPlaceholder', "Exclude Pattern..."),
            siblingInputPlaceholder: localize('excludeSiblingInputPlaceholder', "When Pattern Is Present..."),
        };
    }
}
export class IncludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('includePatternHintLabel', "Include files matching `{0}`", item.value.data)
            : localize('includeSiblingHintLabel', "Include files matching `{0}`, only when a file matching `{1}` is present", item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', ". Default value provided by `{0}`", item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeIncludeItem', "Remove Include Item"),
            editActionTooltip: localize('editIncludeItem', "Edit Include Item"),
            addButtonLabel: localize('addPattern', "Add Pattern"),
            inputPlaceholder: localize('includePatternInputPlaceholder', "Include Pattern..."),
            siblingInputPlaceholder: localize('includeSiblingInputPlaceholder', "When Pattern Is Present..."),
        };
    }
}
let ObjectSettingDropdownWidget = class ObjectSettingDropdownWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService, configurationService) {
        super(container, themeService, contextViewService, configurationService);
        this.hoverService = hoverService;
        this.editable = true;
        this.currentSettingKey = '';
        this.showAddButton = true;
        this.keySuggester = () => undefined;
        this.valueSuggester = () => undefined;
    }
    setValue(listData, options) {
        this.editable = !options?.isReadOnly;
        this.showAddButton = options?.showAddButton ?? this.showAddButton;
        this.keySuggester = options?.keySuggester ?? this.keySuggester;
        this.valueSuggester = options?.valueSuggester ?? this.valueSuggester;
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return item.key.data === '' && item.value.data === '';
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    get isReadOnly() {
        return !this.editable;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'string', data: '' },
            removable: true,
            resetable: false
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        const actions = [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                label: '',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx)
            },
        ];
        if (item.resetable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsDiscardIcon),
                enabled: true,
                id: 'workbench.action.resetListItem',
                label: '',
                tooltip: this.getLocalizedStrings().resetActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'reset', originalItem: item, targetIndex: idx })
            });
        }
        if (item.removable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                label: '',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx })
            });
        }
        return actions;
    }
    renderHeader() {
        const header = $('.setting-list-row-header');
        const keyHeader = DOM.append(header, $('.setting-list-object-key'));
        const valueHeader = DOM.append(header, $('.setting-list-object-value'));
        const { keyHeaderText, valueHeaderText } = this.getLocalizedStrings();
        keyHeader.textContent = keyHeaderText;
        valueHeader.textContent = valueHeaderText;
        return header;
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        rowElement.classList.add('setting-list-object-row');
        const keyElement = DOM.append(rowElement, $('.setting-list-object-key'));
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        keyElement.textContent = item.key.data;
        valueElement.textContent = item.value.data.toString();
        return { rowElement, keyElement, valueElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row');
        const changedItem = { ...item };
        const onKeyChange = (key) => {
            changedItem.key = key;
            okButton.enabled = key.data !== '';
            const suggestedValue = this.valueSuggester(key.data) ?? item.value;
            if (this.shouldUseSuggestion(item.value, changedItem.value, suggestedValue)) {
                onValueChange(suggestedValue);
                renderLatestValue();
            }
        };
        const onValueChange = (value) => {
            changedItem.value = value;
        };
        let keyWidget;
        let keyElement;
        if (this.showAddButton) {
            if (this.isItemNew(item)) {
                const suggestedKey = this.keySuggester(this.model.items.map(({ key: { data } }) => data));
                if (isDefined(suggestedKey)) {
                    changedItem.key = suggestedKey;
                    const suggestedValue = this.valueSuggester(changedItem.key.data);
                    onValueChange(suggestedValue ?? changedItem.value);
                }
            }
            const { widget, element } = this.renderEditWidget(changedItem.key, {
                idx,
                isKey: true,
                originalItem: item,
                changedItem,
                update: onKeyChange,
            });
            keyWidget = widget;
            keyElement = element;
        }
        else {
            keyElement = $('.setting-list-object-key');
            keyElement.textContent = item.key.data;
        }
        let valueWidget;
        const valueContainer = $('.setting-list-object-value-container');
        const renderLatestValue = () => {
            const { widget, element } = this.renderEditWidget(changedItem.value, {
                idx,
                isKey: false,
                originalItem: item,
                changedItem,
                update: onValueChange,
            });
            valueWidget = widget;
            DOM.clearNode(valueContainer);
            valueContainer.append(element);
        };
        renderLatestValue();
        rowElement.append(keyElement, valueContainer);
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.enabled = changedItem.key.data !== '';
        okButton.label = localize('okButton', "OK");
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => this.handleItemChange(item, changedItem, idx)));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', "Cancel");
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            const widget = keyWidget ?? valueWidget;
            widget.focus();
            if (widget instanceof InputBox) {
                widget.select();
            }
        }));
        return rowElement;
    }
    renderEditWidget(keyOrValue, options) {
        switch (keyOrValue.type) {
            case 'string':
                return this.renderStringEditWidget(keyOrValue, options);
            case 'enum':
                return this.renderEnumEditWidget(keyOrValue, options);
            case 'boolean':
                return this.renderEnumEditWidget({
                    type: 'enum',
                    data: keyOrValue.data.toString(),
                    options: [{ value: 'true' }, { value: 'false' }],
                }, options);
        }
    }
    renderStringEditWidget(keyOrValue, { idx, isKey, originalItem, changedItem, update }) {
        const wrapper = $(isKey ? '.setting-list-object-input-key' : '.setting-list-object-input-value');
        const inputBox = new InputBox(wrapper, this.contextViewService, {
            placeholder: isKey
                ? localize('objectKeyInputPlaceholder', "Key")
                : localize('objectValueInputPlaceholder', "Value"),
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder
            })
        });
        inputBox.element.classList.add('setting-list-object-input');
        this.listDisposables.add(inputBox);
        inputBox.value = keyOrValue.data;
        this.listDisposables.add(inputBox.onDidChange(value => update({ ...keyOrValue, data: value })));
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(originalItem, changedItem, idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
        };
        this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        return { widget: inputBox, element: wrapper };
    }
    renderEnumEditWidget(keyOrValue, { isKey, changedItem, update }) {
        const selectBox = this.createBasicSelectBox(keyOrValue);
        const changedKeyOrValue = isKey ? changedItem.key : changedItem.value;
        this.listDisposables.add(selectBox.onDidSelect(({ selected }) => update(changedKeyOrValue.type === 'boolean'
            ? { ...changedKeyOrValue, data: selected === 'true' ? true : false }
            : { ...changedKeyOrValue, data: selected })));
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add(isKey ? 'setting-list-object-input-key' : 'setting-list-object-input-value');
        selectBox.render(wrapper);
        // Switch to the first item if the user set something invalid in the json
        const selected = keyOrValue.options.findIndex(option => keyOrValue.data === option.value);
        if (selected === -1 && keyOrValue.options.length) {
            update(changedKeyOrValue.type === 'boolean'
                ? { ...changedKeyOrValue, data: true }
                : { ...changedKeyOrValue, data: keyOrValue.options[0].value });
        }
        else if (changedKeyOrValue.type === 'boolean') {
            // https://github.com/microsoft/vscode/issues/129581
            update({ ...changedKeyOrValue, data: keyOrValue.data === 'true' });
        }
        return { widget: selectBox, element: wrapper };
    }
    shouldUseSuggestion(originalValue, previousValue, newValue) {
        // suggestion is exactly the same
        if (newValue.type !== 'enum' && newValue.type === previousValue.type && newValue.data === previousValue.data) {
            return false;
        }
        // item is new, use suggestion
        if (originalValue.data === '') {
            return true;
        }
        if (previousValue.type === newValue.type && newValue.type !== 'enum') {
            return false;
        }
        // check if all enum options are the same
        if (previousValue.type === 'enum' && newValue.type === 'enum') {
            const previousEnums = new Set(previousValue.options.map(({ value }) => value));
            newValue.options.forEach(({ value }) => previousEnums.delete(value));
            // all options are the same
            if (previousEnums.size === 0) {
                return false;
            }
        }
        return true;
    }
    addTooltipsToRow(rowElementGroup, item) {
        const { keyElement, valueElement, rowElement } = rowElementGroup;
        let accessibleDescription;
        if (item.source) {
            accessibleDescription = localize('objectPairHintLabelWithSource', "The property `{0}` is set to `{1}` by `{2}`.", item.key.data, item.value.data, item.source);
        }
        else {
            accessibleDescription = localize('objectPairHintLabel', "The property `{0}` is set to `{1}`.", item.key.data, item.value.data);
        }
        const markdownString = new MarkdownString().appendMarkdown(accessibleDescription);
        const keyDescription = this.getEnumDescription(item.key) ?? item.keyDescription ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: keyDescription }));
        const valueDescription = this.getEnumDescription(item.value) ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(valueElement, { content: valueDescription }));
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getEnumDescription(keyOrValue) {
        const enumDescription = keyOrValue.type === 'enum'
            ? keyOrValue.options.find(({ value }) => keyOrValue.data === value)?.description
            : undefined;
        return enumDescription;
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            resetActionTooltip: localize('resetItem', "Reset Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            keyHeaderText: localize('objectKeyHeader', "Item"),
            valueHeaderText: localize('objectValueHeader', "Value"),
        };
    }
};
ObjectSettingDropdownWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService),
    __param(4, IConfigurationService)
], ObjectSettingDropdownWidget);
export { ObjectSettingDropdownWidget };
let ObjectSettingCheckboxWidget = class ObjectSettingCheckboxWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService, configurationService) {
        super(container, themeService, contextViewService, configurationService);
        this.hoverService = hoverService;
        this.currentSettingKey = '';
    }
    setValue(listData, options) {
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return !item.key.data && !item.value.data;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'boolean', data: false },
            removable: false,
            resetable: true
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        return [];
    }
    isAddButtonVisible() {
        return false;
    }
    renderHeader() {
        return undefined;
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = this.renderEdit(item, idx);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderItem(item, idx) {
        // Return just the containers, since we always render in edit mode anyway
        const rowElement = $('.blank-row');
        const keyElement = $('.blank-row-key');
        return { rowElement, keyElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row.setting-item-bool');
        const changedItem = { ...item };
        const onValueChange = (newValue) => {
            changedItem.value.data = newValue;
            this.handleItemChange(item, changedItem, idx);
        };
        const checkboxDescription = item.keyDescription ? `${item.keyDescription} (${item.key.data})` : item.key.data;
        const { element, widget: checkbox } = this.renderEditWidget(changedItem.value.data, checkboxDescription, onValueChange);
        rowElement.appendChild(element);
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        valueElement.textContent = checkboxDescription;
        // We add the tooltips here, because the method is not called by default
        // for widgets in edit mode
        const rowElementGroup = { rowElement, keyElement: valueElement, valueElement: checkbox.domNode };
        this.addTooltipsToRow(rowElementGroup, item);
        this._register(DOM.addDisposableListener(valueElement, DOM.EventType.MOUSE_DOWN, e => {
            const targetElement = e.target;
            if (targetElement.tagName.toLowerCase() !== 'a') {
                checkbox.checked = !checkbox.checked;
                onValueChange(checkbox.checked);
            }
            DOM.EventHelper.stop(e);
        }));
        return rowElement;
    }
    renderEditWidget(value, checkboxDescription, onValueChange) {
        const checkbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'setting-value-checkbox',
            isChecked: value,
            title: checkboxDescription,
            ...unthemedToggleStyles
        });
        this.listDisposables.add(checkbox);
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add('setting-list-object-input-key-checkbox');
        checkbox.domNode.classList.add('setting-value-checkbox');
        wrapper.appendChild(checkbox.domNode);
        this._register(DOM.addDisposableListener(wrapper, DOM.EventType.MOUSE_DOWN, e => {
            checkbox.checked = !checkbox.checked;
            onValueChange(checkbox.checked);
            // Without this line, the settings editor assumes
            // we lost focus on this setting completely.
            e.stopImmediatePropagation();
        }));
        return { widget: checkbox, element: wrapper };
    }
    addTooltipsToRow(rowElementGroup, item) {
        const accessibleDescription = localize('objectPairHintLabel', "The property `{0}` is set to `{1}`.", item.key.data, item.value.data);
        const title = item.keyDescription ?? accessibleDescription;
        const { rowElement, keyElement, valueElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: title }));
        valueElement.setAttribute('aria-label', accessibleDescription);
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            resetActionTooltip: localize('resetItem', "Reset Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            keyHeaderText: localize('objectKeyHeader', "Item"),
            valueHeaderText: localize('objectValueHeader', "Value"),
        };
    }
};
ObjectSettingCheckboxWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService),
    __param(4, IConfigurationService)
], ObjectSettingCheckboxWidget);
export { ObjectSettingCheckboxWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzV2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENB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