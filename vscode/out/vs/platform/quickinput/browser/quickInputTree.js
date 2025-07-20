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
var QuickPickItemElementRenderer_1;
import * as cssJs from '../../../base/browser/cssValue.js';
import * as dom from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../base/browser/ui/iconLabel/iconLabel.js';
import { KeybindingLabel } from '../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Checkbox } from '../../../base/browser/ui/toggle/toggle.js';
import { RenderIndentGuides } from '../../../base/browser/ui/tree/abstractTree.js';
import { equals } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { compareAnything } from '../../../base/common/comparers.js';
import { memoize } from '../../../base/common/decorators.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { Emitter, Event, EventBufferer } from '../../../base/common/event.js';
import { getCodiconAriaLabel, matchesFuzzyIconAware, parseLabelWithIcons } from '../../../base/common/iconLabels.js';
import { Lazy } from '../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { observableValue, observableValueOpts, transaction } from '../../../base/common/observable.js';
import { OS } from '../../../base/common/platform.js';
import { escape, ltrim } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../list/browser/listService.js';
import { defaultCheckboxStyles } from '../../theme/browser/defaultStyles.js';
import { isDark } from '../../theme/common/theme.js';
import { IThemeService } from '../../theme/common/themeService.js';
import { QuickPickFocus } from '../common/quickInput.js';
import { quickInputButtonToAction } from './quickInputUtils.js';
const $ = dom.$;
class BaseQuickPickItemElement {
    constructor(index, hasCheckbox, mainItem) {
        this.index = index;
        this.hasCheckbox = hasCheckbox;
        this._hidden = false;
        this._init = new Lazy(() => {
            const saneLabel = mainItem.label ?? '';
            const saneSortLabel = parseLabelWithIcons(saneLabel).text.trim();
            const saneAriaLabel = mainItem.ariaLabel || [saneLabel, this.saneDescription, this.saneDetail]
                .map(s => getCodiconAriaLabel(s))
                .filter(s => !!s)
                .join(', ');
            return {
                saneLabel,
                saneSortLabel,
                saneAriaLabel
            };
        });
        this._saneDescription = mainItem.description;
        this._saneTooltip = mainItem.tooltip;
    }
    // #region Lazy Getters
    get saneLabel() {
        return this._init.value.saneLabel;
    }
    get saneSortLabel() {
        return this._init.value.saneSortLabel;
    }
    get saneAriaLabel() {
        return this._init.value.saneAriaLabel;
    }
    get element() {
        return this._element;
    }
    set element(value) {
        this._element = value;
    }
    get hidden() {
        return this._hidden;
    }
    set hidden(value) {
        this._hidden = value;
    }
    get saneDescription() {
        return this._saneDescription;
    }
    set saneDescription(value) {
        this._saneDescription = value;
    }
    get saneDetail() {
        return this._saneDetail;
    }
    set saneDetail(value) {
        this._saneDetail = value;
    }
    get saneTooltip() {
        return this._saneTooltip;
    }
    set saneTooltip(value) {
        this._saneTooltip = value;
    }
    get labelHighlights() {
        return this._labelHighlights;
    }
    set labelHighlights(value) {
        this._labelHighlights = value;
    }
    get descriptionHighlights() {
        return this._descriptionHighlights;
    }
    set descriptionHighlights(value) {
        this._descriptionHighlights = value;
    }
    get detailHighlights() {
        return this._detailHighlights;
    }
    set detailHighlights(value) {
        this._detailHighlights = value;
    }
}
class QuickPickItemElement extends BaseQuickPickItemElement {
    constructor(index, childIndex, hasCheckbox, fireButtonTriggered, _onChecked, item, _separator) {
        super(index, hasCheckbox, item);
        this.childIndex = childIndex;
        this.fireButtonTriggered = fireButtonTriggered;
        this._onChecked = _onChecked;
        this.item = item;
        this._separator = _separator;
        this._checked = false;
        this.onChecked = hasCheckbox
            ? Event.map(Event.filter(this._onChecked.event, e => e.element === this), e => e.checked)
            : Event.None;
        this._saneDetail = item.detail;
        this._labelHighlights = item.highlights?.label;
        this._descriptionHighlights = item.highlights?.description;
        this._detailHighlights = item.highlights?.detail;
    }
    get separator() {
        return this._separator;
    }
    set separator(value) {
        this._separator = value;
    }
    get checked() {
        return this._checked;
    }
    set checked(value) {
        if (value !== this._checked) {
            this._checked = value;
            this._onChecked.fire({ element: this, checked: value });
        }
    }
    get checkboxDisabled() {
        return !!this.item.disabled;
    }
}
var QuickPickSeparatorFocusReason;
(function (QuickPickSeparatorFocusReason) {
    /**
     * No item is hovered or active
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["NONE"] = 0] = "NONE";
    /**
     * Some item within this section is hovered
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["MOUSE_HOVER"] = 1] = "MOUSE_HOVER";
    /**
     * Some item within this section is active
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["ACTIVE_ITEM"] = 2] = "ACTIVE_ITEM";
})(QuickPickSeparatorFocusReason || (QuickPickSeparatorFocusReason = {}));
class QuickPickSeparatorElement extends BaseQuickPickItemElement {
    constructor(index, fireSeparatorButtonTriggered, separator) {
        super(index, false, separator);
        this.fireSeparatorButtonTriggered = fireSeparatorButtonTriggered;
        this.separator = separator;
        this.children = new Array();
        /**
         * If this item is >0, it means that there is some item in the list that is either:
         * * hovered over
         * * active
         */
        this.focusInsideSeparator = QuickPickSeparatorFocusReason.NONE;
    }
}
class QuickInputItemDelegate {
    getHeight(element) {
        if (element instanceof QuickPickSeparatorElement) {
            return 30;
        }
        return element.saneDetail ? 44 : 22;
    }
    getTemplateId(element) {
        if (element instanceof QuickPickItemElement) {
            return QuickPickItemElementRenderer.ID;
        }
        else {
            return QuickPickSeparatorElementRenderer.ID;
        }
    }
}
class QuickInputAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('quickInput', "Quick Input");
    }
    getAriaLabel(element) {
        return element.separator?.label
            ? `${element.saneAriaLabel}, ${element.separator.label}`
            : element.saneAriaLabel;
    }
    getWidgetRole() {
        return 'listbox';
    }
    getRole(element) {
        return element.hasCheckbox ? 'checkbox' : 'option';
    }
    isChecked(element) {
        if (!element.hasCheckbox || !(element instanceof QuickPickItemElement)) {
            return undefined;
        }
        return {
            get value() { return element.checked; },
            onDidChange: e => element.onChecked(() => e()),
        };
    }
}
class BaseQuickInputListRenderer {
    constructor(hoverDelegate) {
        this.hoverDelegate = hoverDelegate;
    }
    // TODO: only do the common stuff here and have a subclass handle their specific stuff
    renderTemplate(container) {
        const data = Object.create(null);
        data.toDisposeElement = new DisposableStore();
        data.toDisposeTemplate = new DisposableStore();
        data.entry = dom.append(container, $('.quick-input-list-entry'));
        // Checkbox
        const label = dom.append(data.entry, $('label.quick-input-list-label'));
        data.outerLabel = label;
        data.checkbox = data.toDisposeTemplate.add(new MutableDisposable());
        data.toDisposeTemplate.add(dom.addStandardDisposableListener(label, dom.EventType.CLICK, e => {
            // `label` elements with role=checkboxes don't automatically toggle them like normal <checkbox> elements
            if (data.checkbox.value && !e.defaultPrevented && data.checkbox.value.enabled) {
                const checked = !data.checkbox.value.checked;
                data.checkbox.value.checked = checked;
                data.element.checked = checked;
            }
        }));
        // Rows
        const rows = dom.append(label, $('.quick-input-list-rows'));
        const row1 = dom.append(rows, $('.quick-input-list-row'));
        const row2 = dom.append(rows, $('.quick-input-list-row'));
        // Label
        data.label = new IconLabel(row1, { supportHighlights: true, supportDescriptionHighlights: true, supportIcons: true, hoverDelegate: this.hoverDelegate });
        data.toDisposeTemplate.add(data.label);
        data.icon = dom.prepend(data.label.element, $('.quick-input-list-icon'));
        // Keybinding
        const keybindingContainer = dom.append(row1, $('.quick-input-list-entry-keybinding'));
        data.keybinding = new KeybindingLabel(keybindingContainer, OS);
        data.toDisposeTemplate.add(data.keybinding);
        // Detail
        const detailContainer = dom.append(row2, $('.quick-input-list-label-meta'));
        data.detail = new IconLabel(detailContainer, { supportHighlights: true, supportIcons: true, hoverDelegate: this.hoverDelegate });
        data.toDisposeTemplate.add(data.detail);
        // Separator
        data.separator = dom.append(data.entry, $('.quick-input-list-separator'));
        // Actions
        data.actionBar = new ActionBar(data.entry, this.hoverDelegate ? { hoverDelegate: this.hoverDelegate } : undefined);
        data.actionBar.domNode.classList.add('quick-input-list-entry-action-bar');
        data.toDisposeTemplate.add(data.actionBar);
        return data;
    }
    disposeTemplate(data) {
        data.toDisposeElement.dispose();
        data.toDisposeTemplate.dispose();
    }
    disposeElement(_element, _index, data) {
        data.toDisposeElement.clear();
        data.actionBar.clear();
    }
}
let QuickPickItemElementRenderer = class QuickPickItemElementRenderer extends BaseQuickInputListRenderer {
    static { QuickPickItemElementRenderer_1 = this; }
    static { this.ID = 'quickpickitem'; }
    constructor(hoverDelegate, themeService) {
        super(hoverDelegate);
        this.themeService = themeService;
        // Follow what we do in the separator renderer
        this._itemsWithSeparatorsFrequency = new Map();
    }
    get templateId() {
        return QuickPickItemElementRenderer_1.ID;
    }
    ensureCheckbox(element, data) {
        if (!element.hasCheckbox) {
            data.checkbox.value?.domNode.remove();
            data.checkbox.clear();
            return;
        }
        let checkbox = data.checkbox.value;
        if (!checkbox) {
            checkbox = new Checkbox(element.saneLabel, element.checked, { ...defaultCheckboxStyles, size: 15 });
            data.checkbox.value = checkbox;
            data.outerLabel.prepend(checkbox.domNode);
        }
        else {
            checkbox.setTitle(element.saneLabel);
        }
        if (element.checkboxDisabled) {
            checkbox.disable();
        }
        else {
            checkbox.enable();
        }
        checkbox.checked = element.checked;
        data.toDisposeElement.add(element.onChecked(checked => checkbox.checked = checked));
        data.toDisposeElement.add(checkbox.onChange(() => element.checked = checkbox.checked));
    }
    renderElement(node, index, data) {
        const element = node.element;
        data.element = element;
        element.element = data.entry ?? undefined;
        const mainItem = element.item;
        element.element.classList.toggle('indented', Boolean(mainItem.indented));
        element.element.classList.toggle('not-pickable', element.item.pickable === false);
        this.ensureCheckbox(element, data);
        const { labelHighlights, descriptionHighlights, detailHighlights } = element;
        // Icon
        if (mainItem.iconPath) {
            const icon = isDark(this.themeService.getColorTheme().type) ? mainItem.iconPath.dark : (mainItem.iconPath.light ?? mainItem.iconPath.dark);
            const iconUrl = URI.revive(icon);
            data.icon.className = 'quick-input-list-icon';
            data.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            data.icon.style.backgroundImage = '';
            data.icon.className = mainItem.iconClass ? `quick-input-list-icon ${mainItem.iconClass}` : '';
        }
        // Label
        let descriptionTitle;
        // if we have a tooltip, that will be the hover,
        // with the saneDescription as fallback if it
        // is defined
        if (!element.saneTooltip && element.saneDescription) {
            descriptionTitle = {
                markdown: {
                    value: escape(element.saneDescription),
                    supportThemeIcons: true
                },
                markdownNotSupportedFallback: element.saneDescription
            };
        }
        const options = {
            matches: labelHighlights || [],
            // If we have a tooltip, we want that to be shown and not any other hover
            descriptionTitle,
            descriptionMatches: descriptionHighlights || [],
            labelEscapeNewLines: true
        };
        options.extraClasses = mainItem.iconClasses;
        options.italic = mainItem.italic;
        options.strikethrough = mainItem.strikethrough;
        data.entry.classList.remove('quick-input-list-separator-as-item');
        data.label.setLabel(element.saneLabel, element.saneDescription, options);
        // Keybinding
        data.keybinding.set(mainItem.keybinding);
        // Detail
        if (element.saneDetail) {
            let title;
            // If we have a tooltip, we want that to be shown and not any other hover
            if (!element.saneTooltip) {
                title = {
                    markdown: {
                        value: escape(element.saneDetail),
                        supportThemeIcons: true
                    },
                    markdownNotSupportedFallback: element.saneDetail
                };
            }
            data.detail.element.style.display = '';
            data.detail.setLabel(element.saneDetail, undefined, {
                matches: detailHighlights,
                title,
                labelEscapeNewLines: true
            });
        }
        else {
            data.detail.element.style.display = 'none';
        }
        // Separator
        if (element.separator?.label) {
            data.separator.textContent = element.separator.label;
            data.separator.style.display = '';
            this.addItemWithSeparator(element);
        }
        else {
            data.separator.style.display = 'none';
        }
        data.entry.classList.toggle('quick-input-list-separator-border', !!element.separator && element.childIndex !== 0);
        // Actions
        const buttons = mainItem.buttons;
        if (buttons && buttons.length) {
            data.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `id-${index}`, () => element.fireButtonTriggered({ button, item: element.item }))), { icon: true, label: false });
            data.entry.classList.add('has-actions');
        }
        else {
            data.entry.classList.remove('has-actions');
        }
    }
    disposeElement(element, _index, data) {
        this.removeItemWithSeparator(element.element);
        super.disposeElement(element, _index, data);
    }
    isItemWithSeparatorVisible(item) {
        return this._itemsWithSeparatorsFrequency.has(item);
    }
    addItemWithSeparator(item) {
        this._itemsWithSeparatorsFrequency.set(item, (this._itemsWithSeparatorsFrequency.get(item) || 0) + 1);
    }
    removeItemWithSeparator(item) {
        const frequency = this._itemsWithSeparatorsFrequency.get(item) || 0;
        if (frequency > 1) {
            this._itemsWithSeparatorsFrequency.set(item, frequency - 1);
        }
        else {
            this._itemsWithSeparatorsFrequency.delete(item);
        }
    }
};
QuickPickItemElementRenderer = QuickPickItemElementRenderer_1 = __decorate([
    __param(1, IThemeService)
], QuickPickItemElementRenderer);
class QuickPickSeparatorElementRenderer extends BaseQuickInputListRenderer {
    constructor() {
        super(...arguments);
        // This is a frequency map because sticky scroll re-uses the same renderer to render a second
        // instance of the same separator.
        this._visibleSeparatorsFrequency = new Map();
    }
    static { this.ID = 'quickpickseparator'; }
    get templateId() {
        return QuickPickSeparatorElementRenderer.ID;
    }
    get visibleSeparators() {
        return [...this._visibleSeparatorsFrequency.keys()];
    }
    isSeparatorVisible(separator) {
        return this._visibleSeparatorsFrequency.has(separator);
    }
    renderElement(node, index, data) {
        const element = node.element;
        data.element = element;
        element.element = data.entry ?? undefined;
        element.element.classList.toggle('focus-inside', !!element.focusInsideSeparator);
        const mainItem = element.separator;
        const { labelHighlights, descriptionHighlights } = element;
        // Icon
        data.icon.style.backgroundImage = '';
        data.icon.className = '';
        // Label
        let descriptionTitle;
        // if we have a tooltip, that will be the hover,
        // with the saneDescription as fallback if it
        // is defined
        if (!element.saneTooltip && element.saneDescription) {
            descriptionTitle = {
                markdown: {
                    value: escape(element.saneDescription),
                    supportThemeIcons: true
                },
                markdownNotSupportedFallback: element.saneDescription
            };
        }
        const options = {
            matches: labelHighlights || [],
            // If we have a tooltip, we want that to be shown and not any other hover
            descriptionTitle,
            descriptionMatches: descriptionHighlights || [],
            labelEscapeNewLines: true
        };
        data.entry.classList.add('quick-input-list-separator-as-item');
        data.label.setLabel(element.saneLabel, element.saneDescription, options);
        // Separator
        data.separator.style.display = 'none';
        data.entry.classList.add('quick-input-list-separator-border');
        // Actions
        const buttons = mainItem.buttons;
        if (buttons && buttons.length) {
            data.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `id-${index}`, () => element.fireSeparatorButtonTriggered({ button, separator: element.separator }))), { icon: true, label: false });
            data.entry.classList.add('has-actions');
        }
        else {
            data.entry.classList.remove('has-actions');
        }
        this.addSeparator(element);
    }
    disposeElement(element, _index, data) {
        this.removeSeparator(element.element);
        if (!this.isSeparatorVisible(element.element)) {
            element.element.element?.classList.remove('focus-inside');
        }
        super.disposeElement(element, _index, data);
    }
    addSeparator(separator) {
        this._visibleSeparatorsFrequency.set(separator, (this._visibleSeparatorsFrequency.get(separator) || 0) + 1);
    }
    removeSeparator(separator) {
        const frequency = this._visibleSeparatorsFrequency.get(separator) || 0;
        if (frequency > 1) {
            this._visibleSeparatorsFrequency.set(separator, frequency - 1);
        }
        else {
            this._visibleSeparatorsFrequency.delete(separator);
        }
    }
}
let QuickInputTree = class QuickInputTree extends Disposable {
    constructor(parent, hoverDelegate, linkOpenerDelegate, id, instantiationService, accessibilityService) {
        super();
        this.parent = parent;
        this.hoverDelegate = hoverDelegate;
        this.linkOpenerDelegate = linkOpenerDelegate;
        this.accessibilityService = accessibilityService;
        //#region QuickInputTree Events
        this._onKeyDown = new Emitter();
        /**
         * Event that is fired when the tree receives a keydown.
        */
        this.onKeyDown = this._onKeyDown.event;
        this._onLeave = new Emitter();
        /**
         * Event that is fired when the tree would no longer have focus.
        */
        this.onLeave = this._onLeave.event;
        this._visibleCountObservable = observableValue('VisibleCount', 0);
        this.onChangedVisibleCount = Event.fromObservable(this._visibleCountObservable, this._store);
        this._allVisibleCheckedObservable = observableValue('AllVisibleChecked', false);
        this.onChangedAllVisibleChecked = Event.fromObservable(this._allVisibleCheckedObservable, this._store);
        this._checkedCountObservable = observableValue('CheckedCount', 0);
        this.onChangedCheckedCount = Event.fromObservable(this._checkedCountObservable, this._store);
        this._checkedElementsObservable = observableValueOpts({ equalsFn: equals }, new Array());
        this.onChangedCheckedElements = Event.fromObservable(this._checkedElementsObservable, this._store);
        this._onButtonTriggered = new Emitter();
        this.onButtonTriggered = this._onButtonTriggered.event;
        this._onSeparatorButtonTriggered = new Emitter();
        this.onSeparatorButtonTriggered = this._onSeparatorButtonTriggered.event;
        this._elementChecked = new Emitter();
        this._elementCheckedEventBufferer = new EventBufferer();
        //#endregion
        this._hasCheckboxes = false;
        this._inputElements = new Array();
        this._elementTree = new Array();
        this._itemElements = new Array();
        // Elements that apply to the current set of elements
        this._elementDisposable = this._register(new DisposableStore());
        this._matchOnDescription = false;
        this._matchOnDetail = false;
        this._matchOnLabel = true;
        this._matchOnLabelMode = 'fuzzy';
        this._matchOnMeta = true;
        this._sortByLabel = true;
        this._shouldLoop = true;
        this._container = dom.append(this.parent, $('.quick-input-list'));
        this._separatorRenderer = new QuickPickSeparatorElementRenderer(hoverDelegate);
        this._itemRenderer = instantiationService.createInstance(QuickPickItemElementRenderer, hoverDelegate);
        this._tree = this._register(instantiationService.createInstance((WorkbenchObjectTree), 'QuickInput', this._container, new QuickInputItemDelegate(), [this._itemRenderer, this._separatorRenderer], {
            filter: {
                filter(element) {
                    return element.hidden
                        ? 0 /* TreeVisibility.Hidden */
                        : element instanceof QuickPickSeparatorElement
                            ? 2 /* TreeVisibility.Recurse */
                            : 1 /* TreeVisibility.Visible */;
                },
            },
            sorter: {
                compare: (element, otherElement) => {
                    if (!this.sortByLabel || !this._lastQueryString) {
                        return 0;
                    }
                    const normalizedSearchValue = this._lastQueryString.toLowerCase();
                    return compareEntries(element, otherElement, normalizedSearchValue);
                },
            },
            accessibilityProvider: new QuickInputAccessibilityProvider(),
            setRowLineHeight: false,
            multipleSelectionSupport: false,
            hideTwistiesOfChildlessElements: true,
            renderIndentGuides: RenderIndentGuides.None,
            findWidgetEnabled: false,
            indent: 0,
            horizontalScrolling: false,
            allowNonCollapsibleParents: true,
            alwaysConsumeMouseWheel: true
        }));
        this._tree.getHTMLElement().id = id;
        this._registerListeners();
    }
    //#region public getters/setters
    get onDidChangeFocus() {
        return Event.map(this._tree.onDidChangeFocus, e => e.elements.filter((e) => e instanceof QuickPickItemElement).map(e => e.item), this._store);
    }
    get onDidChangeSelection() {
        return Event.map(this._tree.onDidChangeSelection, e => ({
            items: e.elements.filter((e) => e instanceof QuickPickItemElement).map(e => e.item),
            event: e.browserEvent
        }), this._store);
    }
    get displayed() {
        return this._container.style.display !== 'none';
    }
    set displayed(value) {
        this._container.style.display = value ? '' : 'none';
    }
    get scrollTop() {
        return this._tree.scrollTop;
    }
    set scrollTop(scrollTop) {
        this._tree.scrollTop = scrollTop;
    }
    get ariaLabel() {
        return this._tree.ariaLabel;
    }
    set ariaLabel(label) {
        this._tree.ariaLabel = label ?? '';
    }
    set enabled(value) {
        this._tree.getHTMLElement().style.pointerEvents = value ? '' : 'none';
    }
    get matchOnDescription() {
        return this._matchOnDescription;
    }
    set matchOnDescription(value) {
        this._matchOnDescription = value;
    }
    get matchOnDetail() {
        return this._matchOnDetail;
    }
    set matchOnDetail(value) {
        this._matchOnDetail = value;
    }
    get matchOnLabel() {
        return this._matchOnLabel;
    }
    set matchOnLabel(value) {
        this._matchOnLabel = value;
    }
    get matchOnLabelMode() {
        return this._matchOnLabelMode;
    }
    set matchOnLabelMode(value) {
        this._matchOnLabelMode = value;
    }
    get matchOnMeta() {
        return this._matchOnMeta;
    }
    set matchOnMeta(value) {
        this._matchOnMeta = value;
    }
    get sortByLabel() {
        return this._sortByLabel;
    }
    set sortByLabel(value) {
        this._sortByLabel = value;
    }
    get shouldLoop() {
        return this._shouldLoop;
    }
    set shouldLoop(value) {
        this._shouldLoop = value;
    }
    //#endregion
    //#region register listeners
    _registerListeners() {
        this._registerOnKeyDown();
        this._registerOnContainerClick();
        this._registerOnMouseMiddleClick();
        this._registerOnTreeModelChanged();
        this._registerOnElementChecked();
        this._registerOnContextMenu();
        this._registerHoverListeners();
        this._registerSelectionChangeListener();
        this._registerSeparatorActionShowingListeners();
    }
    _registerOnKeyDown() {
        // TODO: Should this be added at a higher level?
        this._register(this._tree.onKeyDown(e => {
            const event = new StandardKeyboardEvent(e);
            switch (event.keyCode) {
                case 10 /* KeyCode.Space */:
                    this.toggleCheckbox();
                    break;
            }
            this._onKeyDown.fire(event);
        }));
    }
    _registerOnContainerClick() {
        this._register(dom.addDisposableListener(this._container, dom.EventType.CLICK, e => {
            if (e.x || e.y) { // Avoid 'click' triggered by 'space' on checkbox.
                this._onLeave.fire();
            }
        }));
    }
    _registerOnMouseMiddleClick() {
        this._register(dom.addDisposableListener(this._container, dom.EventType.AUXCLICK, e => {
            if (e.button === 1) {
                this._onLeave.fire();
            }
        }));
    }
    _registerOnTreeModelChanged() {
        this._register(this._tree.onDidChangeModel(() => {
            const visibleCount = this._itemElements.filter(e => !e.hidden).length;
            this._visibleCountObservable.set(visibleCount, undefined);
            if (this._hasCheckboxes) {
                this._updateCheckedObservables();
            }
        }));
    }
    _registerOnElementChecked() {
        // Only fire the last event when buffered
        this._register(this._elementCheckedEventBufferer.wrapEvent(this._elementChecked.event, (_, e) => e)(_ => this._updateCheckedObservables()));
    }
    _registerOnContextMenu() {
        this._register(this._tree.onContextMenu(e => {
            if (e.element) {
                e.browserEvent.preventDefault();
                // we want to treat a context menu event as
                // a gesture to open the item at the index
                // since we do not have any context menu
                // this enables for example macOS to Ctrl-
                // click on an item to open it.
                this._tree.setSelection([e.element]);
            }
        }));
    }
    _registerHoverListeners() {
        const delayer = this._register(new ThrottledDelayer(typeof this.hoverDelegate.delay === 'function' ? this.hoverDelegate.delay() : this.hoverDelegate.delay));
        this._register(this._tree.onMouseOver(async (e) => {
            // If we hover over an anchor element, we don't want to show the hover because
            // the anchor may have a tooltip that we want to show instead.
            if (dom.isHTMLAnchorElement(e.browserEvent.target)) {
                delayer.cancel();
                return;
            }
            if (
            // anchors are an exception as called out above so we skip them here
            !(dom.isHTMLAnchorElement(e.browserEvent.relatedTarget)) &&
                // check if the mouse is still over the same element
                dom.isAncestor(e.browserEvent.relatedTarget, e.element?.element)) {
                return;
            }
            try {
                await delayer.trigger(async () => {
                    if (e.element instanceof QuickPickItemElement) {
                        this.showHover(e.element);
                    }
                });
            }
            catch (e) {
                // Ignore cancellation errors due to mouse out
                if (!isCancellationError(e)) {
                    throw e;
                }
            }
        }));
        this._register(this._tree.onMouseOut(e => {
            // onMouseOut triggers every time a new element has been moused over
            // even if it's on the same list item. We only want one event, so we
            // check if the mouse is still over the same element.
            if (dom.isAncestor(e.browserEvent.relatedTarget, e.element?.element)) {
                return;
            }
            delayer.cancel();
        }));
    }
    /**
     * Register's focus change and mouse events so that we can track when items inside of a
     * separator's section are focused or hovered so that we can display the separator's actions
     */
    _registerSeparatorActionShowingListeners() {
        this._register(this._tree.onDidChangeFocus(e => {
            const parent = e.elements[0]
                ? this._tree.getParentElement(e.elements[0])
                // treat null as focus lost and when we have no separators
                : null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                const value = separator === parent;
                // get bitness of ACTIVE_ITEM and check if it changed
                const currentActive = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.ACTIVE_ITEM);
                if (currentActive !== value) {
                    if (value) {
                        separator.focusInsideSeparator |= QuickPickSeparatorFocusReason.ACTIVE_ITEM;
                    }
                    else {
                        separator.focusInsideSeparator &= ~QuickPickSeparatorFocusReason.ACTIVE_ITEM;
                    }
                    this._tree.rerender(separator);
                }
            }
        }));
        this._register(this._tree.onMouseOver(e => {
            const parent = e.element
                ? this._tree.getParentElement(e.element)
                : null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                if (separator !== parent) {
                    continue;
                }
                const currentMouse = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.MOUSE_HOVER);
                if (!currentMouse) {
                    separator.focusInsideSeparator |= QuickPickSeparatorFocusReason.MOUSE_HOVER;
                    this._tree.rerender(separator);
                }
            }
        }));
        this._register(this._tree.onMouseOut(e => {
            const parent = e.element
                ? this._tree.getParentElement(e.element)
                : null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                if (separator !== parent) {
                    continue;
                }
                const currentMouse = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.MOUSE_HOVER);
                if (currentMouse) {
                    separator.focusInsideSeparator &= ~QuickPickSeparatorFocusReason.MOUSE_HOVER;
                    this._tree.rerender(separator);
                }
            }
        }));
    }
    _registerSelectionChangeListener() {
        // When the user selects a separator, the separator will move to the top and focus will be
        // set to the first element after the separator.
        this._register(this._tree.onDidChangeSelection(e => {
            const elementsWithoutSeparators = e.elements.filter((e) => e instanceof QuickPickItemElement);
            if (elementsWithoutSeparators.length !== e.elements.length) {
                if (e.elements.length === 1 && e.elements[0] instanceof QuickPickSeparatorElement) {
                    this._tree.setFocus([e.elements[0].children[0]]);
                    this._tree.reveal(e.elements[0], 0);
                }
                this._tree.setSelection(elementsWithoutSeparators);
            }
        }));
    }
    //#endregion
    //#region public methods
    setAllVisibleChecked(checked) {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            this._itemElements.forEach(element => {
                if (!element.hidden && !element.checkboxDisabled && element.item.pickable !== false) {
                    // Would fire an event if we didn't beffer the events
                    element.checked = checked;
                }
            });
        });
    }
    setElements(inputElements) {
        this._elementDisposable.clear();
        this._lastQueryString = undefined;
        this._inputElements = inputElements;
        this._hasCheckboxes = this.parent.classList.contains('show-checkboxes');
        let currentSeparatorElement;
        this._itemElements = new Array();
        this._elementTree = inputElements.reduce((result, item, index) => {
            let element;
            if (item.type === 'separator') {
                if (!item.buttons) {
                    // This separator will be rendered as a part of the list item
                    return result;
                }
                currentSeparatorElement = new QuickPickSeparatorElement(index, e => this._onSeparatorButtonTriggered.fire(e), item);
                element = currentSeparatorElement;
            }
            else {
                const previous = index > 0 ? inputElements[index - 1] : undefined;
                let separator;
                if (previous && previous.type === 'separator' && !previous.buttons) {
                    separator = previous;
                }
                const qpi = new QuickPickItemElement(index, currentSeparatorElement?.children
                    ? currentSeparatorElement.children.length
                    : index, this._hasCheckboxes && item.pickable !== false, e => this._onButtonTriggered.fire(e), this._elementChecked, item, separator);
                this._itemElements.push(qpi);
                if (currentSeparatorElement) {
                    currentSeparatorElement.children.push(qpi);
                    return result;
                }
                element = qpi;
            }
            result.push(element);
            return result;
        }, new Array());
        this._setElementsToTree(this._elementTree);
        // Accessibility hack, unfortunately on next tick
        // https://github.com/microsoft/vscode/issues/211976
        if (this.accessibilityService.isScreenReaderOptimized()) {
            setTimeout(() => {
                const focusedElement = this._tree.getHTMLElement().querySelector(`.monaco-list-row.focused`);
                const parent = focusedElement?.parentNode;
                if (focusedElement && parent) {
                    const nextSibling = focusedElement.nextSibling;
                    focusedElement.remove();
                    parent.insertBefore(focusedElement, nextSibling);
                }
            }, 0);
        }
    }
    setFocusedElements(items) {
        const elements = items.map(item => this._itemElements.find(e => e.item === item))
            .filter((e) => !!e)
            .filter(e => !e.hidden);
        this._tree.setFocus(elements);
        if (items.length > 0) {
            const focused = this._tree.getFocus()[0];
            if (focused) {
                this._tree.reveal(focused);
            }
        }
    }
    getActiveDescendant() {
        return this._tree.getHTMLElement().getAttribute('aria-activedescendant');
    }
    setSelectedElements(items) {
        const elements = items.map(item => this._itemElements.find(e => e.item === item))
            .filter((e) => !!e);
        this._tree.setSelection(elements);
    }
    getCheckedElements() {
        return this._itemElements.filter(e => e.checked)
            .map(e => e.item);
    }
    setCheckedElements(items) {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            const checked = new Set();
            for (const item of items) {
                checked.add(item);
            }
            for (const element of this._itemElements) {
                // Would fire an event if we didn't beffer the events
                element.checked = checked.has(element.item);
            }
        });
    }
    focus(what) {
        if (!this._itemElements.length) {
            return;
        }
        if (what === QuickPickFocus.Second && this._itemElements.length < 2) {
            what = QuickPickFocus.First;
        }
        switch (what) {
            case QuickPickFocus.First:
                this._tree.scrollTop = 0;
                this._tree.focusFirst(undefined, (e) => e.element instanceof QuickPickItemElement);
                break;
            case QuickPickFocus.Second: {
                this._tree.scrollTop = 0;
                let isSecondItem = false;
                this._tree.focusFirst(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    if (isSecondItem) {
                        return true;
                    }
                    isSecondItem = !isSecondItem;
                    return false;
                });
                break;
            }
            case QuickPickFocus.Last:
                this._tree.scrollTop = this._tree.scrollHeight;
                this._tree.focusLast(undefined, (e) => e.element instanceof QuickPickItemElement);
                break;
            case QuickPickFocus.Next: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusNext(undefined, this._shouldLoop, undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    this._tree.reveal(e.element);
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.Previous: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusPrevious(undefined, this._shouldLoop, undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    const parent = this._tree.getParentElement(e.element);
                    if (parent === null || parent.children[0] !== e.element) {
                        this._tree.reveal(e.element);
                    }
                    else {
                        // Only if we are the first child of a separator do we reveal the separator
                        this._tree.reveal(parent);
                    }
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.NextPage:
                this._tree.focusNextPage(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    this._tree.reveal(e.element);
                    return true;
                });
                break;
            case QuickPickFocus.PreviousPage:
                this._tree.focusPreviousPage(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    const parent = this._tree.getParentElement(e.element);
                    if (parent === null || parent.children[0] !== e.element) {
                        this._tree.reveal(e.element);
                    }
                    else {
                        this._tree.reveal(parent);
                    }
                    return true;
                });
                break;
            case QuickPickFocus.NextSeparator: {
                let foundSeparatorAsItem = false;
                const before = this._tree.getFocus()[0];
                this._tree.focusNext(undefined, true, undefined, (e) => {
                    if (foundSeparatorAsItem) {
                        // This should be the index right after the separator so it
                        // is the item we want to focus.
                        return true;
                    }
                    if (e.element instanceof QuickPickSeparatorElement) {
                        foundSeparatorAsItem = true;
                        // If the separator is visible, then we should just reveal its first child so it's not as jarring.
                        if (this._separatorRenderer.isSeparatorVisible(e.element)) {
                            this._tree.reveal(e.element.children[0]);
                        }
                        else {
                            // If the separator is not visible, then we should
                            // push it up to the top of the list.
                            this._tree.reveal(e.element, 0);
                        }
                    }
                    else if (e.element instanceof QuickPickItemElement) {
                        if (e.element.separator) {
                            if (this._itemRenderer.isItemWithSeparatorVisible(e.element)) {
                                this._tree.reveal(e.element);
                            }
                            else {
                                this._tree.reveal(e.element, 0);
                            }
                            return true;
                        }
                        else if (e.element === this._elementTree[0]) {
                            // We should stop at the first item in the list if it's a regular item.
                            this._tree.reveal(e.element, 0);
                            return true;
                        }
                    }
                    return false;
                });
                const after = this._tree.getFocus()[0];
                if (before === after) {
                    // If we didn't move, then we should just move to the end
                    // of the list.
                    this._tree.scrollTop = this._tree.scrollHeight;
                    this._tree.focusLast(undefined, (e) => e.element instanceof QuickPickItemElement);
                }
                break;
            }
            case QuickPickFocus.PreviousSeparator: {
                let focusElement;
                // If we are already sitting on an inline separator, then we
                // have already found the _current_ separator and need to
                // move to the previous one.
                let foundSeparator = !!this._tree.getFocus()[0]?.separator;
                this._tree.focusPrevious(undefined, true, undefined, (e) => {
                    if (e.element instanceof QuickPickSeparatorElement) {
                        if (foundSeparator) {
                            if (!focusElement) {
                                if (this._separatorRenderer.isSeparatorVisible(e.element)) {
                                    this._tree.reveal(e.element);
                                }
                                else {
                                    this._tree.reveal(e.element, 0);
                                }
                                focusElement = e.element.children[0];
                            }
                        }
                        else {
                            foundSeparator = true;
                        }
                    }
                    else if (e.element instanceof QuickPickItemElement) {
                        if (!focusElement) {
                            if (e.element.separator) {
                                if (this._itemRenderer.isItemWithSeparatorVisible(e.element)) {
                                    this._tree.reveal(e.element);
                                }
                                else {
                                    this._tree.reveal(e.element, 0);
                                }
                                focusElement = e.element;
                            }
                            else if (e.element === this._elementTree[0]) {
                                // We should stop at the first item in the list if it's a regular item.
                                this._tree.reveal(e.element, 0);
                                return true;
                            }
                        }
                    }
                    return false;
                });
                if (focusElement) {
                    this._tree.setFocus([focusElement]);
                }
                break;
            }
        }
    }
    clearFocus() {
        this._tree.setFocus([]);
    }
    domFocus() {
        this._tree.domFocus();
    }
    layout(maxHeight) {
        this._tree.getHTMLElement().style.maxHeight = maxHeight ? `${
        // Make sure height aligns with list item heights
        Math.floor(maxHeight / 44) * 44
            // Add some extra height so that it's clear there's more to scroll
            + 6}px` : '';
        this._tree.layout();
    }
    filter(query) {
        this._lastQueryString = query;
        if (!(this._sortByLabel || this._matchOnLabel || this._matchOnDescription || this._matchOnDetail)) {
            this._tree.layout();
            return false;
        }
        const queryWithWhitespace = query;
        query = query.trim();
        // Reset filtering
        if (!query || !(this.matchOnLabel || this.matchOnDescription || this.matchOnDetail)) {
            this._itemElements.forEach(element => {
                element.labelHighlights = undefined;
                element.descriptionHighlights = undefined;
                element.detailHighlights = undefined;
                element.hidden = false;
                const previous = element.index && this._inputElements[element.index - 1];
                if (element.item) {
                    element.separator = previous && previous.type === 'separator' && !previous.buttons ? previous : undefined;
                }
            });
        }
        // Filter by value (since we support icons in labels, use $(..) aware fuzzy matching)
        else {
            let currentSeparator;
            this._itemElements.forEach(element => {
                let labelHighlights;
                if (this.matchOnLabelMode === 'fuzzy') {
                    labelHighlights = this.matchOnLabel ? matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneLabel)) ?? undefined : undefined;
                }
                else {
                    labelHighlights = this.matchOnLabel ? matchesContiguousIconAware(queryWithWhitespace, parseLabelWithIcons(element.saneLabel)) ?? undefined : undefined;
                }
                const descriptionHighlights = this.matchOnDescription ? matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneDescription || '')) ?? undefined : undefined;
                const detailHighlights = this.matchOnDetail ? matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneDetail || '')) ?? undefined : undefined;
                if (labelHighlights || descriptionHighlights || detailHighlights) {
                    element.labelHighlights = labelHighlights;
                    element.descriptionHighlights = descriptionHighlights;
                    element.detailHighlights = detailHighlights;
                    element.hidden = false;
                }
                else {
                    element.labelHighlights = undefined;
                    element.descriptionHighlights = undefined;
                    element.detailHighlights = undefined;
                    element.hidden = element.item ? !element.item.alwaysShow : true;
                }
                // Ensure separators are filtered out first before deciding if we need to bring them back
                if (element.item) {
                    element.separator = undefined;
                }
                else if (element.separator) {
                    element.hidden = true;
                }
                // we can show the separator unless the list gets sorted by match
                if (!this.sortByLabel) {
                    const previous = element.index && this._inputElements[element.index - 1] || undefined;
                    if (previous?.type === 'separator' && !previous.buttons) {
                        currentSeparator = previous;
                    }
                    if (currentSeparator && !element.hidden) {
                        element.separator = currentSeparator;
                        currentSeparator = undefined;
                    }
                }
            });
        }
        this._setElementsToTree(this._sortByLabel && query
            // We don't render any separators if we're sorting so just render the elements
            ? this._itemElements
            // Render the full tree
            : this._elementTree);
        this._tree.layout();
        return true;
    }
    toggleCheckbox() {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            const elements = this._tree.getFocus().filter((e) => e instanceof QuickPickItemElement);
            const allChecked = this._allVisibleChecked(elements);
            for (const element of elements) {
                if (!element.checkboxDisabled) {
                    // Would fire an event if we didn't have the flag set
                    element.checked = !allChecked;
                }
            }
        });
    }
    style(styles) {
        this._tree.style(styles);
    }
    toggleHover() {
        const focused = this._tree.getFocus()[0];
        if (!focused?.saneTooltip || !(focused instanceof QuickPickItemElement)) {
            return;
        }
        // if there's a hover already, hide it (toggle off)
        if (this._lastHover && !this._lastHover.isDisposed) {
            this._lastHover.dispose();
            return;
        }
        // If there is no hover, show it (toggle on)
        this.showHover(focused);
        const store = new DisposableStore();
        store.add(this._tree.onDidChangeFocus(e => {
            if (e.elements[0] instanceof QuickPickItemElement) {
                this.showHover(e.elements[0]);
            }
        }));
        if (this._lastHover) {
            store.add(this._lastHover);
        }
        this._elementDisposable.add(store);
    }
    //#endregion
    //#region private methods
    _setElementsToTree(elements) {
        const treeElements = new Array();
        for (const element of elements) {
            if (element instanceof QuickPickSeparatorElement) {
                treeElements.push({
                    element,
                    collapsible: false,
                    collapsed: false,
                    children: element.children.map(e => ({
                        element: e,
                        collapsible: false,
                        collapsed: false,
                    })),
                });
            }
            else {
                treeElements.push({
                    element,
                    collapsible: false,
                    collapsed: false,
                });
            }
        }
        this._tree.setChildren(null, treeElements);
    }
    _allVisibleChecked(elements, whenNoneVisible = true) {
        for (let i = 0, n = elements.length; i < n; i++) {
            const element = elements[i];
            if (!element.hidden && element.item.pickable !== false) {
                if (!element.checked) {
                    return false;
                }
                else {
                    whenNoneVisible = true;
                }
            }
        }
        return whenNoneVisible;
    }
    _updateCheckedObservables() {
        transaction((tx) => {
            this._allVisibleCheckedObservable.set(this._allVisibleChecked(this._itemElements, false), tx);
            const checkedCount = this._itemElements.filter(element => element.checked).length;
            this._checkedCountObservable.set(checkedCount, tx);
            this._checkedElementsObservable.set(this.getCheckedElements(), tx);
        });
    }
    /**
     * Disposes of the hover and shows a new one for the given index if it has a tooltip.
     * @param element The element to show the hover for
     */
    showHover(element) {
        if (this._lastHover && !this._lastHover.isDisposed) {
            this.hoverDelegate.onDidHideHover?.();
            this._lastHover?.dispose();
        }
        if (!element.element || !element.saneTooltip) {
            return;
        }
        this._lastHover = this.hoverDelegate.showHover({
            content: element.saneTooltip,
            target: element.element,
            linkHandler: (url) => {
                this.linkOpenerDelegate(url);
            },
            appearance: {
                showPointer: true,
            },
            container: this._container,
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */
            }
        }, false);
    }
};
__decorate([
    memoize
], QuickInputTree.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], QuickInputTree.prototype, "onDidChangeSelection", null);
QuickInputTree = __decorate([
    __param(4, IInstantiationService),
    __param(5, IAccessibilityService)
], QuickInputTree);
export { QuickInputTree };
function matchesContiguousIconAware(query, target) {
    const { text, iconOffsets } = target;
    // Return early if there are no icon markers in the word to match against
    if (!iconOffsets || iconOffsets.length === 0) {
        return matchesContiguous(query, text);
    }
    // Trim the word to match against because it could have leading
    // whitespace now if the word started with an icon
    const wordToMatchAgainstWithoutIconsTrimmed = ltrim(text, ' ');
    const leadingWhitespaceOffset = text.length - wordToMatchAgainstWithoutIconsTrimmed.length;
    // match on value without icon
    const matches = matchesContiguous(query, wordToMatchAgainstWithoutIconsTrimmed);
    // Map matches back to offsets with icon and trimming
    if (matches) {
        for (const match of matches) {
            const iconOffset = iconOffsets[match.start + leadingWhitespaceOffset] /* icon offsets at index */ + leadingWhitespaceOffset /* overall leading whitespace offset */;
            match.start += iconOffset;
            match.end += iconOffset;
        }
    }
    return matches;
}
function matchesContiguous(word, wordToMatchAgainst) {
    const matchIndex = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
    if (matchIndex !== -1) {
        return [{ start: matchIndex, end: matchIndex + word.length }];
    }
    return null;
}
function compareEntries(elementA, elementB, lookFor) {
    const labelHighlightsA = elementA.labelHighlights || [];
    const labelHighlightsB = elementB.labelHighlights || [];
    if (labelHighlightsA.length && !labelHighlightsB.length) {
        return -1;
    }
    if (!labelHighlightsA.length && labelHighlightsB.length) {
        return 1;
    }
    if (labelHighlightsA.length === 0 && labelHighlightsB.length === 0) {
        return 0;
    }
    return compareAnything(elementA.saneSortLabel, elementB.saneSortLabel, lookFor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUs1RSxPQUFPLEVBQTBCLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUc5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUF5QixNQUFNLCtCQUErQixDQUFDO0FBR3JHLE9BQU8sRUFBeUIsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVB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