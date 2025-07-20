/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append, clearNode, h, hasParentWithClass, isActiveElement, isKeyboardEvent, addDisposableListener, isEditableElement } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { asCssValueWithDefault } from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { FindInput } from '../findinput/findInput.js';
import { unthemedInboxStyles } from '../inputbox/inputBox.js';
import { ElementsDragAndDropData } from '../list/listView.js';
import { isActionItem, isButton, isMonacoCustomToggle, isMonacoEditor, isStickyScrollContainer, isStickyScrollElement, List, MouseController } from '../list/listWidget.js';
import { Toggle, unthemedToggleStyles } from '../toggle/toggle.js';
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { TreeError, TreeMouseEventTarget } from './tree.js';
import { Action } from '../../../common/actions.js';
import { distinct, equals, insertInto, range } from '../../../common/arrays.js';
import { Delayer, disposableTimeout, timeout } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { SetMap } from '../../../common/map.js';
import { Emitter, Event, EventBufferer, Relay } from '../../../common/event.js';
import { fuzzyScore, FuzzyScore } from '../../../common/filters.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import './media/tree.css';
import { localize } from '../../../../nls.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { autorun, constObservable } from '../../../common/observable.js';
import { alert } from '../aria/aria.js';
class TreeElementsDragAndDropData extends ElementsDragAndDropData {
    set context(context) {
        this.data.context = context;
    }
    get context() {
        return this.data.context;
    }
    constructor(data) {
        super(data.elements.map(node => node.element));
        this.data = data;
    }
}
function asTreeDragAndDropData(data) {
    if (data instanceof ElementsDragAndDropData) {
        return new TreeElementsDragAndDropData(data);
    }
    return data;
}
class TreeNodeListDragAndDrop {
    constructor(modelProvider, dnd) {
        this.modelProvider = modelProvider;
        this.dnd = dnd;
        this.autoExpandDisposable = Disposable.None;
        this.disposables = new DisposableStore();
    }
    getDragURI(node) {
        return this.dnd.getDragURI(node.element);
    }
    getDragLabel(nodes, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(nodes.map(node => node.element), originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(asTreeDragAndDropData(data), originalEvent);
    }
    onDragOver(data, targetNode, targetIndex, targetSector, originalEvent, raw = true) {
        const result = this.dnd.onDragOver(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
        const didChangeAutoExpandNode = this.autoExpandNode !== targetNode;
        if (didChangeAutoExpandNode) {
            this.autoExpandDisposable.dispose();
            this.autoExpandNode = targetNode;
        }
        if (typeof targetNode === 'undefined') {
            return result;
        }
        if (didChangeAutoExpandNode && typeof result !== 'boolean' && result.autoExpand) {
            this.autoExpandDisposable = disposableTimeout(() => {
                const model = this.modelProvider();
                const ref = model.getNodeLocation(targetNode);
                if (model.isCollapsed(ref)) {
                    model.setCollapsed(ref, false);
                }
                this.autoExpandNode = undefined;
            }, 500, this.disposables);
        }
        if (typeof result === 'boolean' || !result.accept || typeof result.bubble === 'undefined' || result.feedback) {
            if (!raw) {
                const accept = typeof result === 'boolean' ? result : result.accept;
                const effect = typeof result === 'boolean' ? undefined : result.effect;
                return { accept, effect, feedback: [targetIndex] };
            }
            return result;
        }
        if (result.bubble === 1 /* TreeDragOverBubble.Up */) {
            const model = this.modelProvider();
            const ref = model.getNodeLocation(targetNode);
            const parentRef = model.getParentNodeLocation(ref);
            const parentNode = model.getNode(parentRef);
            const parentIndex = parentRef && model.getListIndex(parentRef);
            return this.onDragOver(data, parentNode, parentIndex, targetSector, originalEvent, false);
        }
        const model = this.modelProvider();
        const ref = model.getNodeLocation(targetNode);
        const start = model.getListIndex(ref);
        const length = model.getListRenderCount(ref);
        return { ...result, feedback: range(start, start + length) };
    }
    drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        this.autoExpandDisposable.dispose();
        this.autoExpandNode = undefined;
        this.dnd.drop(asTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    dispose() {
        this.disposables.dispose();
        this.dnd.dispose();
    }
}
function asListOptions(modelProvider, disposableStore, options) {
    return options && {
        ...options,
        identityProvider: options.identityProvider && {
            getId(el) {
                return options.identityProvider.getId(el.element);
            }
        },
        dnd: options.dnd && disposableStore.add(new TreeNodeListDragAndDrop(modelProvider, options.dnd)),
        multipleSelectionController: options.multipleSelectionController && {
            isSelectionSingleChangeEvent(e) {
                return options.multipleSelectionController.isSelectionSingleChangeEvent({ ...e, element: e.element });
            },
            isSelectionRangeChangeEvent(e) {
                return options.multipleSelectionController.isSelectionRangeChangeEvent({ ...e, element: e.element });
            }
        },
        accessibilityProvider: options.accessibilityProvider && {
            ...options.accessibilityProvider,
            getSetSize(node) {
                const model = modelProvider();
                const ref = model.getNodeLocation(node);
                const parentRef = model.getParentNodeLocation(ref);
                const parentNode = model.getNode(parentRef);
                return parentNode.visibleChildrenCount;
            },
            getPosInSet(node) {
                return node.visibleChildIndex + 1;
            },
            isChecked: options.accessibilityProvider && options.accessibilityProvider.isChecked ? (node) => {
                return options.accessibilityProvider.isChecked(node.element);
            } : undefined,
            getRole: options.accessibilityProvider && options.accessibilityProvider.getRole ? (node) => {
                return options.accessibilityProvider.getRole(node.element);
            } : () => 'treeitem',
            getAriaLabel(e) {
                return options.accessibilityProvider.getAriaLabel(e.element);
            },
            getWidgetAriaLabel() {
                return options.accessibilityProvider.getWidgetAriaLabel();
            },
            getWidgetRole: options.accessibilityProvider && options.accessibilityProvider.getWidgetRole ? () => options.accessibilityProvider.getWidgetRole() : () => 'tree',
            getAriaLevel: options.accessibilityProvider && options.accessibilityProvider.getAriaLevel ? (node) => options.accessibilityProvider.getAriaLevel(node.element) : (node) => {
                return node.depth;
            },
            getActiveDescendantId: options.accessibilityProvider.getActiveDescendantId && (node => {
                return options.accessibilityProvider.getActiveDescendantId(node.element);
            })
        },
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            ...options.keyboardNavigationLabelProvider,
            getKeyboardNavigationLabel(node) {
                return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(node.element);
            }
        }
    };
}
export class ComposedTreeDelegate {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getHeight(element) {
        return this.delegate.getHeight(element.element);
    }
    getTemplateId(element) {
        return this.delegate.getTemplateId(element.element);
    }
    hasDynamicHeight(element) {
        return !!this.delegate.hasDynamicHeight && this.delegate.hasDynamicHeight(element.element);
    }
    setDynamicHeight(element, height) {
        this.delegate.setDynamicHeight?.(element.element, height);
    }
}
export class AbstractTreeViewState {
    static lift(state) {
        return state instanceof AbstractTreeViewState ? state : new AbstractTreeViewState(state);
    }
    static empty(scrollTop = 0) {
        return new AbstractTreeViewState({
            focus: [],
            selection: [],
            expanded: Object.create(null),
            scrollTop,
        });
    }
    constructor(state) {
        this.focus = new Set(state.focus);
        this.selection = new Set(state.selection);
        if (state.expanded instanceof Array) { // old format
            this.expanded = Object.create(null);
            for (const id of state.expanded) {
                this.expanded[id] = 1;
            }
        }
        else {
            this.expanded = state.expanded;
        }
        this.expanded = state.expanded;
        this.scrollTop = state.scrollTop;
    }
    toJSON() {
        return {
            focus: Array.from(this.focus),
            selection: Array.from(this.selection),
            expanded: this.expanded,
            scrollTop: this.scrollTop,
        };
    }
}
export var RenderIndentGuides;
(function (RenderIndentGuides) {
    RenderIndentGuides["None"] = "none";
    RenderIndentGuides["OnHover"] = "onHover";
    RenderIndentGuides["Always"] = "always";
})(RenderIndentGuides || (RenderIndentGuides = {}));
class EventCollection {
    get elements() {
        return this._elements;
    }
    constructor(onDidChange, _elements = []) {
        this._elements = _elements;
        this.disposables = new DisposableStore();
        this.onDidChange = Event.forEach(onDidChange, elements => this._elements = elements, this.disposables);
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class TreeRenderer {
    static { this.DefaultIndent = 8; }
    constructor(renderer, model, onDidChangeCollapseState, activeNodes, renderedIndentGuides, options = {}) {
        this.renderer = renderer;
        this.model = model;
        this.activeNodes = activeNodes;
        this.renderedIndentGuides = renderedIndentGuides;
        this.renderedElements = new Map();
        this.renderedNodes = new Map();
        this.indent = TreeRenderer.DefaultIndent;
        this.hideTwistiesOfChildlessElements = false;
        this.shouldRenderIndentGuides = false;
        this.activeIndentNodes = new Set();
        this.indentGuidesDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.templateId = renderer.templateId;
        this.updateOptions(options);
        Event.map(onDidChangeCollapseState, e => e.node)(this.onDidChangeNodeTwistieState, this, this.disposables);
        renderer.onDidChangeTwistieState?.(this.onDidChangeTwistieState, this, this.disposables);
    }
    updateOptions(options = {}) {
        if (typeof options.indent !== 'undefined') {
            const indent = clamp(options.indent, 0, 40);
            if (indent !== this.indent) {
                this.indent = indent;
                for (const [node, templateData] of this.renderedNodes) {
                    templateData.indentSize = TreeRenderer.DefaultIndent + (node.depth - 1) * this.indent;
                    this.renderTreeElement(node, templateData);
                }
            }
        }
        if (typeof options.renderIndentGuides !== 'undefined') {
            const shouldRenderIndentGuides = options.renderIndentGuides !== RenderIndentGuides.None;
            if (shouldRenderIndentGuides !== this.shouldRenderIndentGuides) {
                this.shouldRenderIndentGuides = shouldRenderIndentGuides;
                for (const [node, templateData] of this.renderedNodes) {
                    this._renderIndentGuides(node, templateData);
                }
                this.indentGuidesDisposable.dispose();
                if (shouldRenderIndentGuides) {
                    const disposables = new DisposableStore();
                    this.activeNodes.onDidChange(this._onDidChangeActiveNodes, this, disposables);
                    this.indentGuidesDisposable = disposables;
                    this._onDidChangeActiveNodes(this.activeNodes.elements);
                }
            }
        }
        if (typeof options.hideTwistiesOfChildlessElements !== 'undefined') {
            this.hideTwistiesOfChildlessElements = options.hideTwistiesOfChildlessElements;
        }
    }
    renderTemplate(container) {
        const el = append(container, $('.monaco-tl-row'));
        const indent = append(el, $('.monaco-tl-indent'));
        const twistie = append(el, $('.monaco-tl-twistie'));
        const contents = append(el, $('.monaco-tl-contents'));
        const templateData = this.renderer.renderTemplate(contents);
        return { container, indent, twistie, indentGuidesDisposable: Disposable.None, indentSize: 0, templateData };
    }
    renderElement(node, index, templateData, details) {
        templateData.indentSize = TreeRenderer.DefaultIndent + (node.depth - 1) * this.indent;
        this.renderedNodes.set(node, templateData);
        this.renderedElements.set(node.element, node);
        this.renderTreeElement(node, templateData);
        this.renderer.renderElement(node, index, templateData.templateData, { ...details, indent: templateData.indentSize });
    }
    disposeElement(node, index, templateData, details) {
        templateData.indentGuidesDisposable.dispose();
        this.renderer.disposeElement?.(node, index, templateData.templateData, { ...details, indent: templateData.indentSize });
        if (typeof details?.height === 'number') {
            this.renderedNodes.delete(node);
            this.renderedElements.delete(node.element);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.templateData);
    }
    onDidChangeTwistieState(element) {
        const node = this.renderedElements.get(element);
        if (!node) {
            return;
        }
        this.onDidChangeNodeTwistieState(node);
    }
    onDidChangeNodeTwistieState(node) {
        const templateData = this.renderedNodes.get(node);
        if (!templateData) {
            return;
        }
        this._onDidChangeActiveNodes(this.activeNodes.elements);
        this.renderTreeElement(node, templateData);
    }
    renderTreeElement(node, templateData) {
        templateData.twistie.style.paddingLeft = `${templateData.indentSize}px`;
        templateData.indent.style.width = `${templateData.indentSize + this.indent - 16}px`;
        if (node.collapsible) {
            templateData.container.setAttribute('aria-expanded', String(!node.collapsed));
        }
        else {
            templateData.container.removeAttribute('aria-expanded');
        }
        templateData.twistie.classList.remove(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
        let twistieRendered = false;
        if (this.renderer.renderTwistie) {
            twistieRendered = this.renderer.renderTwistie(node.element, templateData.twistie);
        }
        if (node.collapsible && (!this.hideTwistiesOfChildlessElements || node.visibleChildrenCount > 0)) {
            if (!twistieRendered) {
                templateData.twistie.classList.add(...ThemeIcon.asClassNameArray(Codicon.treeItemExpanded));
            }
            templateData.twistie.classList.add('collapsible');
            templateData.twistie.classList.toggle('collapsed', node.collapsed);
        }
        else {
            templateData.twistie.classList.remove('collapsible', 'collapsed');
        }
        this._renderIndentGuides(node, templateData);
    }
    _renderIndentGuides(node, templateData) {
        clearNode(templateData.indent);
        templateData.indentGuidesDisposable.dispose();
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const disposableStore = new DisposableStore();
        while (true) {
            const ref = this.model.getNodeLocation(node);
            const parentRef = this.model.getParentNodeLocation(ref);
            if (!parentRef) {
                break;
            }
            const parent = this.model.getNode(parentRef);
            const guide = $('.indent-guide', { style: `width: ${this.indent}px` });
            if (this.activeIndentNodes.has(parent)) {
                guide.classList.add('active');
            }
            if (templateData.indent.childElementCount === 0) {
                templateData.indent.appendChild(guide);
            }
            else {
                templateData.indent.insertBefore(guide, templateData.indent.firstElementChild);
            }
            this.renderedIndentGuides.add(parent, guide);
            disposableStore.add(toDisposable(() => this.renderedIndentGuides.delete(parent, guide)));
            node = parent;
        }
        templateData.indentGuidesDisposable = disposableStore;
    }
    _onDidChangeActiveNodes(nodes) {
        if (!this.shouldRenderIndentGuides) {
            return;
        }
        const set = new Set();
        nodes.forEach(node => {
            const ref = this.model.getNodeLocation(node);
            try {
                const parentRef = this.model.getParentNodeLocation(ref);
                if (node.collapsible && node.children.length > 0 && !node.collapsed) {
                    set.add(node);
                }
                else if (parentRef) {
                    set.add(this.model.getNode(parentRef));
                }
            }
            catch {
                // noop
            }
        });
        this.activeIndentNodes.forEach(node => {
            if (!set.has(node)) {
                this.renderedIndentGuides.forEach(node, line => line.classList.remove('active'));
            }
        });
        set.forEach(node => {
            if (!this.activeIndentNodes.has(node)) {
                this.renderedIndentGuides.forEach(node, line => line.classList.add('active'));
            }
        });
        this.activeIndentNodes = set;
    }
    dispose() {
        this.renderedNodes.clear();
        this.renderedElements.clear();
        this.indentGuidesDisposable.dispose();
        dispose(this.disposables);
    }
}
export function contiguousFuzzyScore(patternLower, wordLower) {
    const index = wordLower.toLowerCase().indexOf(patternLower);
    let score;
    if (index > -1) {
        score = [Number.MAX_SAFE_INTEGER, 0];
        for (let i = patternLower.length; i > 0; i--) {
            score.push(index + i - 1);
        }
    }
    return score;
}
export class FindFilter {
    get totalCount() { return this._totalCount; }
    get matchCount() { return this._matchCount; }
    set findMatchType(type) { this._findMatchType = type; }
    get findMatchType() { return this._findMatchType; }
    set findMode(mode) { this._findMode = mode; }
    get findMode() { return this._findMode; }
    set pattern(pattern) {
        this._pattern = pattern;
        this._lowercasePattern = pattern.toLowerCase();
    }
    constructor(_keyboardNavigationLabelProvider, _filter, _defaultFindVisibility) {
        this._keyboardNavigationLabelProvider = _keyboardNavigationLabelProvider;
        this._filter = _filter;
        this._defaultFindVisibility = _defaultFindVisibility;
        this._totalCount = 0;
        this._matchCount = 0;
        this._findMatchType = TreeFindMatchType.Fuzzy;
        this._findMode = TreeFindMode.Highlight;
        this._pattern = '';
        this._lowercasePattern = '';
        this.disposables = new DisposableStore();
    }
    filter(element, parentVisibility) {
        let visibility = 1 /* TreeVisibility.Visible */;
        if (this._filter) {
            const result = this._filter.filter(element, parentVisibility);
            if (typeof result === 'boolean') {
                visibility = result ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
            }
            else if (isFilterResult(result)) {
                visibility = getVisibleState(result.visibility);
            }
            else {
                visibility = result;
            }
            if (visibility === 0 /* TreeVisibility.Hidden */) {
                return false;
            }
        }
        this._totalCount++;
        if (!this._pattern) {
            this._matchCount++;
            return { data: FuzzyScore.Default, visibility };
        }
        const label = this._keyboardNavigationLabelProvider.getKeyboardNavigationLabel(element);
        const labels = Array.isArray(label) ? label : [label];
        for (const l of labels) {
            const labelStr = l && l.toString();
            if (typeof labelStr === 'undefined') {
                return { data: FuzzyScore.Default, visibility };
            }
            let score;
            if (this._findMatchType === TreeFindMatchType.Contiguous) {
                score = contiguousFuzzyScore(this._lowercasePattern, labelStr.toLowerCase());
            }
            else {
                score = fuzzyScore(this._pattern, this._lowercasePattern, 0, labelStr, labelStr.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
            }
            if (score) {
                this._matchCount++;
                return labels.length === 1 ?
                    { data: score, visibility } :
                    { data: { label: labelStr, score: score }, visibility };
            }
        }
        if (this._findMode === TreeFindMode.Filter) {
            if (typeof this._defaultFindVisibility === 'number') {
                return this._defaultFindVisibility;
            }
            else if (this._defaultFindVisibility) {
                return this._defaultFindVisibility(element);
            }
            else {
                return 2 /* TreeVisibility.Recurse */;
            }
        }
        else {
            return { data: FuzzyScore.Default, visibility };
        }
    }
    reset() {
        this._totalCount = 0;
        this._matchCount = 0;
    }
    dispose() {
        dispose(this.disposables);
    }
}
class TreeFindToggle extends Toggle {
    constructor(contribution, opts, hoverDelegate) {
        super({
            icon: contribution.icon,
            title: contribution.title,
            isChecked: contribution.isChecked,
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
            hoverDelegate,
        });
        this.id = contribution.id;
    }
}
export class FindToggles {
    constructor(startStates) {
        this.stateMap = new Map(startStates.map(state => [state.id, { ...state }]));
    }
    states() {
        return Array.from(this.stateMap.values());
    }
    get(id) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        return state.isChecked;
    }
    set(id, value) {
        const state = this.stateMap.get(id);
        if (state === undefined) {
            throw new Error(`No state found for toggle id ${id}`);
        }
        if (state.isChecked === value) {
            return false;
        }
        state.isChecked = value;
        return true;
    }
}
const unthemedFindWidgetStyles = {
    inputBoxStyles: unthemedInboxStyles,
    toggleStyles: unthemedToggleStyles,
    listFilterWidgetBackground: undefined,
    listFilterWidgetNoMatchesOutline: undefined,
    listFilterWidgetOutline: undefined,
    listFilterWidgetShadow: undefined
};
export var TreeFindMode;
(function (TreeFindMode) {
    TreeFindMode[TreeFindMode["Highlight"] = 0] = "Highlight";
    TreeFindMode[TreeFindMode["Filter"] = 1] = "Filter";
})(TreeFindMode || (TreeFindMode = {}));
export var TreeFindMatchType;
(function (TreeFindMatchType) {
    TreeFindMatchType[TreeFindMatchType["Fuzzy"] = 0] = "Fuzzy";
    TreeFindMatchType[TreeFindMatchType["Contiguous"] = 1] = "Contiguous";
})(TreeFindMatchType || (TreeFindMatchType = {}));
class FindWidget extends Disposable {
    get value() {
        return this.findInput.inputBox.value;
    }
    set value(value) {
        this.findInput.inputBox.value = value;
    }
    constructor(container, tree, contextViewProvider, placeholder, toggleContributions = [], options) {
        super();
        this.tree = tree;
        this.elements = h('.monaco-tree-type-filter', [
            h('.monaco-tree-type-filter-input@findInput'),
            h('.monaco-tree-type-filter-actionbar@actionbar'),
        ]);
        this.toggles = [];
        this._onDidDisable = new Emitter();
        this.onDidDisable = this._onDidDisable.event;
        container.appendChild(this.elements.root);
        this._register(toDisposable(() => this.elements.root.remove()));
        const styles = options?.styles ?? unthemedFindWidgetStyles;
        if (styles.listFilterWidgetBackground) {
            this.elements.root.style.backgroundColor = styles.listFilterWidgetBackground;
        }
        if (styles.listFilterWidgetShadow) {
            this.elements.root.style.boxShadow = `0 0 8px 2px ${styles.listFilterWidgetShadow}`;
        }
        const toggleHoverDelegate = this._register(createInstantHoverDelegate());
        this.toggles = toggleContributions.map(contribution => this._register(new TreeFindToggle(contribution, styles.toggleStyles, toggleHoverDelegate)));
        this.onDidToggleChange = Event.any(...this.toggles.map(toggle => Event.map(toggle.onChange, () => ({ id: toggle.id, isChecked: toggle.checked }))));
        const history = options?.history || [];
        this.findInput = this._register(new FindInput(this.elements.findInput, contextViewProvider, {
            label: localize('type to search', "Type to search"),
            placeholder,
            additionalToggles: this.toggles,
            showCommonFindToggles: false,
            inputBoxStyles: styles.inputBoxStyles,
            toggleStyles: styles.toggleStyles,
            history: new Set(history)
        }));
        this.actionbar = this._register(new ActionBar(this.elements.actionbar));
        const emitter = this._register(new DomEmitter(this.findInput.inputBox.inputElement, 'keydown'));
        const onKeyDown = Event.chain(emitter.event, $ => $.map(e => new StandardKeyboardEvent(e)));
        this._register(onKeyDown((e) => {
            // Using equals() so we reserve modified keys for future use
            if (e.equals(3 /* KeyCode.Enter */)) {
                // This is the only keyboard way to return to the tree from a history item that isn't the last one
                e.preventDefault();
                e.stopPropagation();
                this.findInput.inputBox.addToHistory();
                this.tree.domFocus();
                return;
            }
            if (e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                if (this.findInput.inputBox.isAtLastInHistory() || this.findInput.inputBox.isNowhereInHistory()) {
                    // Retain original pre-history DownArrow behavior
                    this.findInput.inputBox.addToHistory();
                    this.tree.domFocus();
                }
                else {
                    // Downward through history
                    this.findInput.inputBox.showNextValue();
                }
                return;
            }
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                e.preventDefault();
                e.stopPropagation();
                // Upward through history
                this.findInput.inputBox.showPreviousValue();
                return;
            }
        }));
        const closeAction = this._register(new Action('close', localize('close', "Close"), 'codicon codicon-close', true, () => this.dispose()));
        this.actionbar.push(closeAction, { icon: true, label: false });
        this.onDidChangeValue = this.findInput.onDidChange;
    }
    setToggleState(id, checked) {
        const toggle = this.toggles.find(toggle => toggle.id === id);
        if (toggle) {
            toggle.checked = checked;
        }
    }
    setPlaceHolder(placeHolder) {
        this.findInput.inputBox.setPlaceHolder(placeHolder);
    }
    getHistory() {
        return this.findInput.inputBox.getHistory();
    }
    focus() {
        this.findInput.focus();
    }
    select() {
        this.findInput.select();
        // Reposition to last in history
        this.findInput.inputBox.addToHistory(true);
    }
    showMessage(message) {
        this.findInput.showMessage(message);
    }
    clearMessage() {
        this.findInput.clearMessage();
    }
    async dispose() {
        this._onDidDisable.fire();
        this.elements.root.classList.add('disabled');
        await timeout(300);
        super.dispose();
    }
}
var DefaultTreeToggles;
(function (DefaultTreeToggles) {
    DefaultTreeToggles["Mode"] = "mode";
    DefaultTreeToggles["MatchType"] = "matchType";
})(DefaultTreeToggles || (DefaultTreeToggles = {}));
export class AbstractFindController {
    get pattern() { return this._pattern; }
    get placeholder() { return this._placeholder; }
    set placeholder(value) {
        this._placeholder = value;
        this.widget?.setPlaceHolder(value);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        this.tree = tree;
        this.filter = filter;
        this.contextViewProvider = contextViewProvider;
        this.options = options;
        this._pattern = '';
        this.previousPattern = '';
        this._onDidChangePattern = new Emitter();
        this.onDidChangePattern = this._onDidChangePattern.event;
        this._onDidChangeOpenState = new Emitter();
        this.onDidChangeOpenState = this._onDidChangeOpenState.event;
        this.enabledDisposables = new DisposableStore();
        this.disposables = new DisposableStore();
        this.toggles = new FindToggles(options.toggles ?? []);
        this._placeholder = options.placeholder ?? localize('type to search', "Type to search");
    }
    isOpened() {
        return !!this.widget;
    }
    open() {
        if (this.widget) {
            this.widget.focus();
            this.widget.select();
            return;
        }
        this.tree.updateOptions({ paddingTop: 30 });
        this.widget = new FindWidget(this.tree.getHTMLElement(), this.tree, this.contextViewProvider, this.placeholder, this.toggles.states(), { ...this.options, history: this._history });
        this.enabledDisposables.add(this.widget);
        this.widget.onDidChangeValue(this.onDidChangeValue, this, this.enabledDisposables);
        this.widget.onDidDisable(this.close, this, this.enabledDisposables);
        this.widget.onDidToggleChange(this.onDidToggleChange, this, this.enabledDisposables);
        this.widget.focus();
        this.widget.value = this.previousPattern;
        this.widget.select();
        this._onDidChangeOpenState.fire(true);
    }
    close() {
        if (!this.widget) {
            return;
        }
        this.tree.updateOptions({ paddingTop: 0 });
        this._history = this.widget.getHistory();
        this.widget = undefined;
        this.enabledDisposables.clear();
        this.previousPattern = this.pattern;
        this.onDidChangeValue('');
        this.tree.domFocus();
        this._onDidChangeOpenState.fire(false);
    }
    onDidChangeValue(pattern) {
        this._pattern = pattern;
        this._onDidChangePattern.fire(pattern);
        this.filter.pattern = pattern;
        this.applyPattern(pattern);
    }
    onDidToggleChange(e) {
        this.toggles.set(e.id, e.isChecked);
    }
    updateToggleState(id, checked) {
        this.toggles.set(id, checked);
        this.widget?.setToggleState(id, checked);
    }
    renderMessage(showNotFound, warningMessage) {
        if (showNotFound) {
            if (this.tree.options.showNotFoundMessage ?? true) {
                this.widget?.showMessage({ type: 2 /* MessageType.WARNING */, content: warningMessage ?? localize('not found', "No results found.") });
            }
            else {
                this.widget?.showMessage({ type: 2 /* MessageType.WARNING */ });
            }
        }
        else {
            this.widget?.clearMessage();
        }
    }
    alertResults(results) {
        if (!results) {
            alert(localize('replFindNoResults', "No results"));
        }
        else {
            alert(localize('foundResults', "{0} results", results));
        }
    }
    dispose() {
        this._history = undefined;
        this._onDidChangePattern.dispose();
        this.enabledDisposables.dispose();
        this.disposables.dispose();
    }
}
export class FindController extends AbstractFindController {
    get mode() { return this.toggles.get(DefaultTreeToggles.Mode) ? TreeFindMode.Filter : TreeFindMode.Highlight; }
    set mode(mode) {
        if (mode === this.mode) {
            return;
        }
        const isFilterMode = mode === TreeFindMode.Filter;
        this.updateToggleState(DefaultTreeToggles.Mode, isFilterMode);
        this.placeholder = isFilterMode ? localize('type to filter', "Type to filter") : localize('type to search', "Type to search");
        this.filter.findMode = mode;
        this.tree.refilter();
        this.render();
        this._onDidChangeMode.fire(mode);
    }
    get matchType() { return this.toggles.get(DefaultTreeToggles.MatchType) ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous; }
    set matchType(matchType) {
        if (matchType === this.matchType) {
            return;
        }
        this.updateToggleState(DefaultTreeToggles.MatchType, matchType === TreeFindMatchType.Fuzzy);
        this.filter.findMatchType = matchType;
        this.tree.refilter();
        this.render();
        this._onDidChangeMatchType.fire(matchType);
    }
    constructor(tree, filter, contextViewProvider, options = {}) {
        const defaultFindMode = options.defaultFindMode ?? TreeFindMode.Highlight;
        const defaultFindMatchType = options.defaultFindMatchType ?? TreeFindMatchType.Fuzzy;
        const toggleContributions = [{
                id: DefaultTreeToggles.Mode,
                icon: Codicon.listFilter,
                title: localize('filter', "Filter"),
                isChecked: defaultFindMode === TreeFindMode.Filter,
            }, {
                id: DefaultTreeToggles.MatchType,
                icon: Codicon.searchFuzzy,
                title: localize('fuzzySearch', "Fuzzy Match"),
                isChecked: defaultFindMatchType === TreeFindMatchType.Fuzzy,
            }];
        filter.findMatchType = defaultFindMatchType;
        filter.findMode = defaultFindMode;
        super(tree, filter, contextViewProvider, { ...options, toggles: toggleContributions });
        this.filter = filter;
        this._onDidChangeMode = new Emitter();
        this.onDidChangeMode = this._onDidChangeMode.event;
        this._onDidChangeMatchType = new Emitter();
        this.onDidChangeMatchType = this._onDidChangeMatchType.event;
        this.disposables.add(this.tree.onDidChangeModel(() => {
            if (!this.isOpened()) {
                return;
            }
            if (this.pattern.length !== 0) {
                this.tree.refilter();
            }
            this.render();
        }));
        this.disposables.add(this.tree.onWillRefilter(() => this.filter.reset()));
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.defaultFindMode !== undefined) {
            this.mode = optionsUpdate.defaultFindMode;
        }
        if (optionsUpdate.defaultFindMatchType !== undefined) {
            this.matchType = optionsUpdate.defaultFindMatchType;
        }
    }
    applyPattern(pattern) {
        this.tree.refilter();
        if (pattern) {
            this.tree.focusNext(0, true, undefined, (node) => !FuzzyScore.isDefault(node.filterData));
        }
        const focus = this.tree.getFocus();
        if (focus.length > 0) {
            const element = focus[0];
            if (this.tree.getRelativeTop(element) === null) {
                this.tree.reveal(element, 0.5);
            }
        }
        this.render();
    }
    shouldAllowFocus(node) {
        if (!this.isOpened() || !this.pattern) {
            return true;
        }
        if (this.filter.totalCount > 0 && this.filter.matchCount <= 1) {
            return true;
        }
        return !FuzzyScore.isDefault(node.filterData);
    }
    onDidToggleChange(e) {
        if (e.id === DefaultTreeToggles.Mode) {
            this.mode = e.isChecked ? TreeFindMode.Filter : TreeFindMode.Highlight;
        }
        else if (e.id === DefaultTreeToggles.MatchType) {
            this.matchType = e.isChecked ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous;
        }
    }
    render() {
        const noMatches = this.filter.matchCount === 0 && this.filter.totalCount > 0;
        const showNotFound = noMatches && this.pattern.length > 0;
        this.renderMessage(showNotFound);
        if (this.pattern.length) {
            this.alertResults(this.filter.matchCount);
        }
    }
}
function stickyScrollNodeStateEquals(node1, node2) {
    return node1.position === node2.position && stickyScrollNodeEquals(node1, node2);
}
function stickyScrollNodeEquals(node1, node2) {
    return node1.node.element === node2.node.element &&
        node1.startIndex === node2.startIndex &&
        node1.height === node2.height &&
        node1.endIndex === node2.endIndex;
}
class StickyScrollState {
    constructor(stickyNodes = []) {
        this.stickyNodes = stickyNodes;
    }
    get count() { return this.stickyNodes.length; }
    equal(state) {
        return equals(this.stickyNodes, state.stickyNodes, stickyScrollNodeStateEquals);
    }
    contains(element) {
        return this.stickyNodes.some(node => node.node.element === element.element);
    }
    lastNodePartiallyVisible() {
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        if (this.count === 1) {
            return lastStickyNode.position !== 0;
        }
        const secondLastStickyNode = this.stickyNodes[this.count - 2];
        return secondLastStickyNode.position + secondLastStickyNode.height !== lastStickyNode.position;
    }
    animationStateChanged(previousState) {
        if (!equals(this.stickyNodes, previousState.stickyNodes, stickyScrollNodeEquals)) {
            return false;
        }
        if (this.count === 0) {
            return false;
        }
        const lastStickyNode = this.stickyNodes[this.count - 1];
        const previousLastStickyNode = previousState.stickyNodes[previousState.count - 1];
        return lastStickyNode.position !== previousLastStickyNode.position;
    }
}
class DefaultStickyScrollDelegate {
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            if (stickyNodeBottom > maxWidgetHeight || i >= stickyScrollMaxItemCount) {
                return stickyNodes.slice(0, i);
            }
        }
        return stickyNodes;
    }
}
class StickyScrollController extends Disposable {
    constructor(tree, model, view, renderers, treeDelegate, options = {}) {
        super();
        this.tree = tree;
        this.model = model;
        this.view = view;
        this.treeDelegate = treeDelegate;
        this.maxWidgetViewRatio = 0.4;
        const stickyScrollOptions = this.validateStickySettings(options);
        this.stickyScrollMaxItemCount = stickyScrollOptions.stickyScrollMaxItemCount;
        this.stickyScrollDelegate = options.stickyScrollDelegate ?? new DefaultStickyScrollDelegate();
        this.paddingTop = options.paddingTop ?? 0;
        this._widget = this._register(new StickyScrollWidget(view.getScrollableElement(), view, tree, renderers, treeDelegate, options.accessibilityProvider));
        this.onDidChangeHasFocus = this._widget.onDidChangeHasFocus;
        this.onContextMenu = this._widget.onContextMenu;
        this._register(view.onDidScroll(() => this.update()));
        this._register(view.onDidChangeContentHeight(() => this.update()));
        this._register(tree.onDidChangeCollapseState(() => this.update()));
        this._register(model.onDidSpliceRenderedNodes((e) => {
            const state = this._widget.state;
            if (!state) {
                return;
            }
            // If a sticky node is removed, recompute the state
            const hasRemovedStickyNode = e.deleteCount > 0 && state.stickyNodes.some(stickyNode => !this.model.has(this.model.getNodeLocation(stickyNode.node)));
            if (hasRemovedStickyNode) {
                this.update();
                return;
            }
            // If a sticky node is updated, rerender the widget
            const shouldRerenderStickyNodes = state.stickyNodes.some(stickyNode => {
                const listIndex = this.model.getListIndex(this.model.getNodeLocation(stickyNode.node));
                return listIndex >= e.start && listIndex < e.start + e.deleteCount && state.contains(stickyNode.node);
            });
            if (shouldRerenderStickyNodes) {
                this._widget.rerender();
            }
        }));
        this.update();
    }
    get height() {
        return this._widget.height;
    }
    get count() {
        return this._widget.count;
    }
    getNode(node) {
        return this._widget.getNode(node);
    }
    getNodeAtHeight(height) {
        let index;
        if (height === 0) {
            index = this.view.firstVisibleIndex;
        }
        else {
            index = this.view.indexAt(height + this.view.scrollTop);
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        return this.view.element(index);
    }
    update() {
        const firstVisibleNode = this.getNodeAtHeight(this.paddingTop);
        // Don't render anything if there are no elements
        if (!firstVisibleNode || this.tree.scrollTop <= this.paddingTop) {
            this._widget.setState(undefined);
            return;
        }
        const stickyState = this.findStickyState(firstVisibleNode);
        this._widget.setState(stickyState);
    }
    findStickyState(firstVisibleNode) {
        const stickyNodes = [];
        let firstVisibleNodeUnderWidget = firstVisibleNode;
        let stickyNodesHeight = 0;
        let nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, undefined, stickyNodesHeight);
        while (nextStickyNode) {
            stickyNodes.push(nextStickyNode);
            stickyNodesHeight += nextStickyNode.height;
            if (stickyNodes.length <= this.stickyScrollMaxItemCount) {
                firstVisibleNodeUnderWidget = this.getNextVisibleNode(nextStickyNode);
                if (!firstVisibleNodeUnderWidget) {
                    break;
                }
            }
            nextStickyNode = this.getNextStickyNode(firstVisibleNodeUnderWidget, nextStickyNode.node, stickyNodesHeight);
        }
        const contrainedStickyNodes = this.constrainStickyNodes(stickyNodes);
        return contrainedStickyNodes.length ? new StickyScrollState(contrainedStickyNodes) : undefined;
    }
    getNextVisibleNode(previousStickyNode) {
        return this.getNodeAtHeight(previousStickyNode.position + previousStickyNode.height);
    }
    getNextStickyNode(firstVisibleNodeUnderWidget, previousStickyNode, stickyNodesHeight) {
        const nextStickyNode = this.getAncestorUnderPrevious(firstVisibleNodeUnderWidget, previousStickyNode);
        if (!nextStickyNode) {
            return undefined;
        }
        if (nextStickyNode === firstVisibleNodeUnderWidget) {
            if (!this.nodeIsUncollapsedParent(firstVisibleNodeUnderWidget)) {
                return undefined;
            }
            if (this.nodeTopAlignsWithStickyNodesBottom(firstVisibleNodeUnderWidget, stickyNodesHeight)) {
                return undefined;
            }
        }
        return this.createStickyScrollNode(nextStickyNode, stickyNodesHeight);
    }
    nodeTopAlignsWithStickyNodesBottom(node, stickyNodesHeight) {
        const nodeIndex = this.getNodeIndex(node);
        const elementTop = this.view.getElementTop(nodeIndex);
        const stickyPosition = stickyNodesHeight;
        return this.view.scrollTop === elementTop - stickyPosition;
    }
    createStickyScrollNode(node, currentStickyNodesHeight) {
        const height = this.treeDelegate.getHeight(node);
        const { startIndex, endIndex } = this.getNodeRange(node);
        const position = this.calculateStickyNodePosition(endIndex, currentStickyNodesHeight, height);
        return { node, position, height, startIndex, endIndex };
    }
    getAncestorUnderPrevious(node, previousAncestor = undefined) {
        let currentAncestor = node;
        let parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        while (parentOfcurrentAncestor) {
            if (parentOfcurrentAncestor === previousAncestor) {
                return currentAncestor;
            }
            currentAncestor = parentOfcurrentAncestor;
            parentOfcurrentAncestor = this.getParentNode(currentAncestor);
        }
        if (previousAncestor === undefined) {
            return currentAncestor;
        }
        return undefined;
    }
    calculateStickyNodePosition(lastDescendantIndex, stickyRowPositionTop, stickyNodeHeight) {
        let lastChildRelativeTop = this.view.getRelativeTop(lastDescendantIndex);
        // If the last descendant is only partially visible at the top of the view, getRelativeTop() returns null
        // In that case, utilize the next node's relative top to calculate the sticky node's position
        if (lastChildRelativeTop === null && this.view.firstVisibleIndex === lastDescendantIndex && lastDescendantIndex + 1 < this.view.length) {
            const nodeHeight = this.treeDelegate.getHeight(this.view.element(lastDescendantIndex));
            const nextNodeRelativeTop = this.view.getRelativeTop(lastDescendantIndex + 1);
            lastChildRelativeTop = nextNodeRelativeTop ? nextNodeRelativeTop - nodeHeight / this.view.renderHeight : null;
        }
        if (lastChildRelativeTop === null) {
            return stickyRowPositionTop;
        }
        const lastChildNode = this.view.element(lastDescendantIndex);
        const lastChildHeight = this.treeDelegate.getHeight(lastChildNode);
        const topOfLastChild = lastChildRelativeTop * this.view.renderHeight;
        const bottomOfLastChild = topOfLastChild + lastChildHeight;
        if (stickyRowPositionTop + stickyNodeHeight > bottomOfLastChild && stickyRowPositionTop <= bottomOfLastChild) {
            return bottomOfLastChild - stickyNodeHeight;
        }
        return stickyRowPositionTop;
    }
    constrainStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            return [];
        }
        // Check if sticky nodes need to be constrained
        const maximumStickyWidgetHeight = this.view.renderHeight * this.maxWidgetViewRatio;
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        if (stickyNodes.length <= this.stickyScrollMaxItemCount && lastStickyNode.position + lastStickyNode.height <= maximumStickyWidgetHeight) {
            return stickyNodes;
        }
        // constrain sticky nodes
        const constrainedStickyNodes = this.stickyScrollDelegate.constrainStickyScrollNodes(stickyNodes, this.stickyScrollMaxItemCount, maximumStickyWidgetHeight);
        if (!constrainedStickyNodes.length) {
            return [];
        }
        // Validate constraints
        const lastConstrainedStickyNode = constrainedStickyNodes[constrainedStickyNodes.length - 1];
        if (constrainedStickyNodes.length > this.stickyScrollMaxItemCount || lastConstrainedStickyNode.position + lastConstrainedStickyNode.height > maximumStickyWidgetHeight) {
            throw new Error('stickyScrollDelegate violates constraints');
        }
        return constrainedStickyNodes;
    }
    getParentNode(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const parentLocation = this.model.getParentNodeLocation(nodeLocation);
        return parentLocation ? this.model.getNode(parentLocation) : undefined;
    }
    nodeIsUncollapsedParent(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        return this.model.getListRenderCount(nodeLocation) > 1;
    }
    getNodeIndex(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const nodeIndex = this.model.getListIndex(nodeLocation);
        return nodeIndex;
    }
    getNodeRange(node) {
        const nodeLocation = this.model.getNodeLocation(node);
        const startIndex = this.model.getListIndex(nodeLocation);
        if (startIndex < 0) {
            throw new Error('Node not found in tree');
        }
        const renderCount = this.model.getListRenderCount(nodeLocation);
        const endIndex = startIndex + renderCount - 1;
        return { startIndex, endIndex };
    }
    nodePositionTopBelowWidget(node) {
        const ancestors = [];
        let currentAncestor = this.getParentNode(node);
        while (currentAncestor) {
            ancestors.push(currentAncestor);
            currentAncestor = this.getParentNode(currentAncestor);
        }
        let widgetHeight = 0;
        for (let i = 0; i < ancestors.length && i < this.stickyScrollMaxItemCount; i++) {
            widgetHeight += this.treeDelegate.getHeight(ancestors[i]);
        }
        return widgetHeight;
    }
    getFocus() {
        return this._widget.getFocus();
    }
    domFocus() {
        this._widget.domFocus();
    }
    // Whether sticky scroll was the last focused part in the tree or not
    focusedLast() {
        return this._widget.focusedLast();
    }
    updateOptions(optionsUpdate = {}) {
        if (optionsUpdate.paddingTop !== undefined) {
            this.paddingTop = optionsUpdate.paddingTop;
        }
        if (optionsUpdate.stickyScrollMaxItemCount !== undefined) {
            const validatedOptions = this.validateStickySettings(optionsUpdate);
            if (this.stickyScrollMaxItemCount !== validatedOptions.stickyScrollMaxItemCount) {
                this.stickyScrollMaxItemCount = validatedOptions.stickyScrollMaxItemCount;
                this.update();
            }
        }
    }
    validateStickySettings(options) {
        let stickyScrollMaxItemCount = 7;
        if (typeof options.stickyScrollMaxItemCount === 'number') {
            stickyScrollMaxItemCount = Math.max(options.stickyScrollMaxItemCount, 1);
        }
        return { stickyScrollMaxItemCount };
    }
}
class StickyScrollWidget {
    get state() { return this._previousState; }
    constructor(container, view, tree, treeRenderers, treeDelegate, accessibilityProvider) {
        this.view = view;
        this.tree = tree;
        this.treeRenderers = treeRenderers;
        this.treeDelegate = treeDelegate;
        this.accessibilityProvider = accessibilityProvider;
        this._previousElements = [];
        this._previousStateDisposables = new DisposableStore();
        this._rootDomNode = $('.monaco-tree-sticky-container.empty');
        container.appendChild(this._rootDomNode);
        const shadow = $('.monaco-tree-sticky-container-shadow');
        this._rootDomNode.appendChild(shadow);
        this.stickyScrollFocus = new StickyScrollFocus(this._rootDomNode, view);
        this.onDidChangeHasFocus = this.stickyScrollFocus.onDidChangeHasFocus;
        this.onContextMenu = this.stickyScrollFocus.onContextMenu;
    }
    get height() {
        if (!this._previousState) {
            return 0;
        }
        const lastElement = this._previousState.stickyNodes[this._previousState.count - 1];
        return lastElement.position + lastElement.height;
    }
    get count() {
        return this._previousState?.count ?? 0;
    }
    getNode(node) {
        return this._previousState?.stickyNodes.find(stickyNode => stickyNode.node === node);
    }
    setState(state) {
        const wasVisible = !!this._previousState && this._previousState.count > 0;
        const isVisible = !!state && state.count > 0;
        // If state has not changed, do nothing
        if ((!wasVisible && !isVisible) || (wasVisible && isVisible && this._previousState.equal(state))) {
            return;
        }
        // Update visibility of the widget if changed
        if (wasVisible !== isVisible) {
            this.setVisible(isVisible);
        }
        if (!isVisible) {
            this._previousState = undefined;
            this._previousElements = [];
            this._previousStateDisposables.clear();
            return;
        }
        const lastStickyNode = state.stickyNodes[state.count - 1];
        // If the new state is only a change in the last node's position, update the position of the last element
        if (this._previousState && state.animationStateChanged(this._previousState)) {
            this._previousElements[this._previousState.count - 1].style.top = `${lastStickyNode.position}px`;
        }
        // create new dom elements
        else {
            this.renderState(state);
        }
        this._previousState = state;
        // Set the height of the widget to the bottom of the last sticky node
        this._rootDomNode.style.height = `${lastStickyNode.position + lastStickyNode.height}px`;
    }
    renderState(state) {
        this._previousStateDisposables.clear();
        const elements = Array(state.count);
        for (let stickyIndex = state.count - 1; stickyIndex >= 0; stickyIndex--) {
            const stickyNode = state.stickyNodes[stickyIndex];
            const { element, disposable } = this.createElement(stickyNode, stickyIndex, state.count);
            elements[stickyIndex] = element;
            this._rootDomNode.appendChild(element);
            this._previousStateDisposables.add(disposable);
        }
        this.stickyScrollFocus.updateElements(elements, state);
        this._previousElements = elements;
    }
    rerender() {
        if (this._previousState) {
            this.renderState(this._previousState);
        }
    }
    createElement(stickyNode, stickyIndex, stickyNodesTotal) {
        const nodeIndex = stickyNode.startIndex;
        // Sticky element container
        const stickyElement = document.createElement('div');
        stickyElement.style.top = `${stickyNode.position}px`;
        if (this.tree.options.setRowHeight !== false) {
            stickyElement.style.height = `${stickyNode.height}px`;
        }
        if (this.tree.options.setRowLineHeight !== false) {
            stickyElement.style.lineHeight = `${stickyNode.height}px`;
        }
        stickyElement.classList.add('monaco-tree-sticky-row');
        stickyElement.classList.add('monaco-list-row');
        stickyElement.setAttribute('data-index', `${nodeIndex}`);
        stickyElement.setAttribute('data-parity', nodeIndex % 2 === 0 ? 'even' : 'odd');
        stickyElement.setAttribute('id', this.view.getElementID(nodeIndex));
        const accessibilityDisposable = this.setAccessibilityAttributes(stickyElement, stickyNode.node.element, stickyIndex, stickyNodesTotal);
        // Get the renderer for the node
        const nodeTemplateId = this.treeDelegate.getTemplateId(stickyNode.node);
        const renderer = this.treeRenderers.find((renderer) => renderer.templateId === nodeTemplateId);
        if (!renderer) {
            throw new Error(`No renderer found for template id ${nodeTemplateId}`);
        }
        // To make sure we do not influence the original node, we create a copy of the node
        // We need to check if it is already a unique instance of the node by the delegate
        let nodeCopy = stickyNode.node;
        if (nodeCopy === this.tree.getNode(this.tree.getNodeLocation(stickyNode.node))) {
            nodeCopy = new Proxy(stickyNode.node, {});
        }
        // Render the element
        const templateData = renderer.renderTemplate(stickyElement);
        renderer.renderElement(nodeCopy, stickyNode.startIndex, templateData, { height: stickyNode.height });
        // Remove the element from the DOM when state is disposed
        const disposable = toDisposable(() => {
            accessibilityDisposable.dispose();
            renderer.disposeElement(nodeCopy, stickyNode.startIndex, templateData, { height: stickyNode.height });
            renderer.disposeTemplate(templateData);
            stickyElement.remove();
        });
        return { element: stickyElement, disposable };
    }
    setAccessibilityAttributes(container, element, stickyIndex, stickyNodesTotal) {
        if (!this.accessibilityProvider) {
            return Disposable.None;
        }
        if (this.accessibilityProvider.getSetSize) {
            container.setAttribute('aria-setsize', String(this.accessibilityProvider.getSetSize(element, stickyIndex, stickyNodesTotal)));
        }
        if (this.accessibilityProvider.getPosInSet) {
            container.setAttribute('aria-posinset', String(this.accessibilityProvider.getPosInSet(element, stickyIndex)));
        }
        if (this.accessibilityProvider.getRole) {
            container.setAttribute('role', this.accessibilityProvider.getRole(element) ?? 'treeitem');
        }
        const ariaLabel = this.accessibilityProvider.getAriaLabel(element);
        const observable = (ariaLabel && typeof ariaLabel !== 'string') ? ariaLabel : constObservable(ariaLabel);
        const result = autorun(reader => {
            const value = reader.readObservable(observable);
            if (value) {
                container.setAttribute('aria-label', value);
            }
            else {
                container.removeAttribute('aria-label');
            }
        });
        if (typeof ariaLabel === 'string') {
        }
        else if (ariaLabel) {
            container.setAttribute('aria-label', ariaLabel.get());
        }
        const ariaLevel = this.accessibilityProvider.getAriaLevel && this.accessibilityProvider.getAriaLevel(element);
        if (typeof ariaLevel === 'number') {
            container.setAttribute('aria-level', `${ariaLevel}`);
        }
        // Sticky Scroll elements can not be selected
        container.setAttribute('aria-selected', String(false));
        return result;
    }
    setVisible(visible) {
        this._rootDomNode.classList.toggle('empty', !visible);
        if (!visible) {
            this.stickyScrollFocus.updateElements([], undefined);
        }
    }
    getFocus() {
        return this.stickyScrollFocus.getFocus();
    }
    domFocus() {
        this.stickyScrollFocus.domFocus();
    }
    focusedLast() {
        return this.stickyScrollFocus.focusedLast();
    }
    dispose() {
        this.stickyScrollFocus.dispose();
        this._previousStateDisposables.dispose();
        this._rootDomNode.remove();
    }
}
class StickyScrollFocus extends Disposable {
    get domHasFocus() { return this._domHasFocus; }
    set domHasFocus(hasFocus) {
        if (hasFocus !== this._domHasFocus) {
            this._onDidChangeHasFocus.fire(hasFocus);
            this._domHasFocus = hasFocus;
        }
    }
    constructor(container, view) {
        super();
        this.container = container;
        this.view = view;
        this.focusedIndex = -1;
        this.elements = [];
        this._onDidChangeHasFocus = new Emitter();
        this.onDidChangeHasFocus = this._onDidChangeHasFocus.event;
        this._onContextMenu = new Emitter();
        this.onContextMenu = this._onContextMenu.event;
        this._domHasFocus = false;
        this._register(addDisposableListener(this.container, 'focus', () => this.onFocus()));
        this._register(addDisposableListener(this.container, 'blur', () => this.onBlur()));
        this._register(this.view.onDidFocus(() => this.toggleStickyScrollFocused(false)));
        this._register(this.view.onKeyDown((e) => this.onKeyDown(e)));
        this._register(this.view.onMouseDown((e) => this.onMouseDown(e)));
        this._register(this.view.onContextMenu((e) => this.handleContextMenu(e)));
    }
    handleContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            if (this.focusedLast()) {
                this.view.domFocus();
            }
            return;
        }
        // The list handles the context menu triggered by a mouse event
        // In that case only set the focus of the element clicked and leave the rest to the list to handle
        if (!isKeyboardEvent(e.browserEvent)) {
            if (!this.state) {
                throw new Error('Context menu should not be triggered when state is undefined');
            }
            const stickyIndex = this.state.stickyNodes.findIndex(stickyNode => stickyNode.node.element === e.element?.element);
            if (stickyIndex === -1) {
                throw new Error('Context menu should not be triggered when element is not in sticky scroll widget');
            }
            this.container.focus();
            this.setFocus(stickyIndex);
            return;
        }
        if (!this.state || this.focusedIndex < 0) {
            throw new Error('Context menu key should not be triggered when focus is not in sticky scroll widget');
        }
        const stickyNode = this.state.stickyNodes[this.focusedIndex];
        const element = stickyNode.node.element;
        const anchor = this.elements[this.focusedIndex];
        this._onContextMenu.fire({ element, anchor, browserEvent: e.browserEvent, isStickyScroll: true });
    }
    onKeyDown(e) {
        // Sticky Scroll Navigation
        if (this.domHasFocus && this.state) {
            // Move up
            if (e.key === 'ArrowUp') {
                this.setFocusedElement(Math.max(0, this.focusedIndex - 1));
                e.preventDefault();
                e.stopPropagation();
            }
            // Move down, if last sticky node is focused, move focus into first child of last sticky node
            else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                if (this.focusedIndex >= this.state.count - 1) {
                    const nodeIndexToFocus = this.state.stickyNodes[this.state.count - 1].startIndex + 1;
                    this.view.domFocus();
                    this.view.setFocus([nodeIndexToFocus]);
                    this.scrollNodeUnderWidget(nodeIndexToFocus, this.state);
                }
                else {
                    this.setFocusedElement(this.focusedIndex + 1);
                }
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            return;
        }
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
    }
    updateElements(elements, state) {
        if (state && state.count === 0) {
            throw new Error('Sticky scroll state must be undefined when there are no sticky nodes');
        }
        if (state && state.count !== elements.length) {
            throw new Error('Sticky scroll focus received illigel state');
        }
        const previousIndex = this.focusedIndex;
        this.removeFocus();
        this.elements = elements;
        this.state = state;
        if (state) {
            const newFocusedIndex = clamp(previousIndex, 0, state.count - 1);
            this.setFocus(newFocusedIndex);
        }
        else {
            if (this.domHasFocus) {
                this.view.domFocus();
            }
        }
        // must come last as it calls blur()
        this.container.tabIndex = state ? 0 : -1;
    }
    setFocusedElement(stickyIndex) {
        // doesn't imply that the widget has (or will have) focus
        const state = this.state;
        if (!state) {
            throw new Error('Cannot set focus when state is undefined');
        }
        this.setFocus(stickyIndex);
        if (stickyIndex < state.count - 1) {
            return;
        }
        // If the last sticky node is not fully visible, scroll it into view
        if (state.lastNodePartiallyVisible()) {
            const lastStickyNode = state.stickyNodes[stickyIndex];
            this.scrollNodeUnderWidget(lastStickyNode.endIndex + 1, state);
        }
    }
    scrollNodeUnderWidget(nodeIndex, state) {
        const lastStickyNode = state.stickyNodes[state.count - 1];
        const secondLastStickyNode = state.count > 1 ? state.stickyNodes[state.count - 2] : undefined;
        const elementScrollTop = this.view.getElementTop(nodeIndex);
        const elementTargetViewTop = secondLastStickyNode ? secondLastStickyNode.position + secondLastStickyNode.height + lastStickyNode.height : lastStickyNode.height;
        this.view.scrollTop = elementScrollTop - elementTargetViewTop;
    }
    getFocus() {
        if (!this.state || this.focusedIndex === -1) {
            return undefined;
        }
        return this.state.stickyNodes[this.focusedIndex].node.element;
    }
    domFocus() {
        if (!this.state) {
            throw new Error('Cannot focus when state is undefined');
        }
        this.container.focus();
    }
    focusedLast() {
        if (!this.state) {
            return false;
        }
        return this.view.getHTMLElement().classList.contains('sticky-scroll-focused');
    }
    removeFocus() {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementFocus(this.elements[this.focusedIndex], false);
        this.focusedIndex = -1;
    }
    setFocus(newFocusIndex) {
        if (0 > newFocusIndex) {
            throw new Error('addFocus() can not remove focus');
        }
        if (!this.state && newFocusIndex >= 0) {
            throw new Error('Cannot set focus index when state is undefined');
        }
        if (this.state && newFocusIndex >= this.state.count) {
            throw new Error('Cannot set focus index to an index that does not exist');
        }
        const oldIndex = this.focusedIndex;
        if (oldIndex >= 0) {
            this.toggleElementFocus(this.elements[oldIndex], false);
        }
        if (newFocusIndex >= 0) {
            this.toggleElementFocus(this.elements[newFocusIndex], true);
        }
        this.focusedIndex = newFocusIndex;
    }
    toggleElementFocus(element, focused) {
        this.toggleElementActiveFocus(element, focused && this.domHasFocus);
        this.toggleElementPassiveFocus(element, focused);
    }
    toggleCurrentElementActiveFocus(focused) {
        if (this.focusedIndex === -1) {
            return;
        }
        this.toggleElementActiveFocus(this.elements[this.focusedIndex], focused);
    }
    toggleElementActiveFocus(element, focused) {
        // active focus is set when sticky scroll has focus
        element.classList.toggle('focused', focused);
    }
    toggleElementPassiveFocus(element, focused) {
        // passive focus allows to show focus when sticky scroll does not have focus
        // for example when the context menu has focus
        element.classList.toggle('passive-focused', focused);
    }
    toggleStickyScrollFocused(focused) {
        // Weather the last focus in the view was sticky scroll and not the list
        // Is only removed when the focus is back in the tree an no longer in sticky scroll
        this.view.getHTMLElement().classList.toggle('sticky-scroll-focused', focused);
    }
    onFocus() {
        if (!this.state || this.elements.length === 0) {
            throw new Error('Cannot focus when state is undefined or elements are empty');
        }
        this.domHasFocus = true;
        this.toggleStickyScrollFocused(true);
        this.toggleCurrentElementActiveFocus(true);
        if (this.focusedIndex === -1) {
            this.setFocus(0);
        }
    }
    onBlur() {
        this.domHasFocus = false;
        this.toggleCurrentElementActiveFocus(false);
    }
    dispose() {
        this.toggleStickyScrollFocused(false);
        this._onDidChangeHasFocus.fire(false);
        super.dispose();
    }
}
function asTreeMouseEvent(event) {
    let target = TreeMouseEventTarget.Unknown;
    if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-twistie', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Twistie;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tl-contents', 'monaco-tl-row')) {
        target = TreeMouseEventTarget.Element;
    }
    else if (hasParentWithClass(event.browserEvent.target, 'monaco-tree-type-filter', 'monaco-list')) {
        target = TreeMouseEventTarget.Filter;
    }
    return {
        browserEvent: event.browserEvent,
        element: event.element ? event.element.element : null,
        target
    };
}
function asTreeContextMenuEvent(event) {
    const isStickyScroll = isStickyScrollContainer(event.browserEvent.target);
    return {
        element: event.element ? event.element.element : null,
        browserEvent: event.browserEvent,
        anchor: event.anchor,
        isStickyScroll
    };
}
function dfs(node, fn) {
    fn(node);
    node.children.forEach(child => dfs(child, fn));
}
/**
 * The trait concept needs to exist at the tree level, because collapsed
 * tree nodes will not be known by the list.
 */
class Trait {
    get nodeSet() {
        if (!this._nodeSet) {
            this._nodeSet = this.createNodeSet();
        }
        return this._nodeSet;
    }
    constructor(getFirstViewElementWithTrait, identityProvider) {
        this.getFirstViewElementWithTrait = getFirstViewElementWithTrait;
        this.identityProvider = identityProvider;
        this.nodes = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    set(nodes, browserEvent) {
        if (!browserEvent?.__forceEvent && equals(this.nodes, nodes)) {
            return;
        }
        this._set(nodes, false, browserEvent);
    }
    _set(nodes, silent, browserEvent) {
        this.nodes = [...nodes];
        this.elements = undefined;
        this._nodeSet = undefined;
        if (!silent) {
            const that = this;
            this._onDidChange.fire({ get elements() { return that.get(); }, browserEvent });
        }
    }
    get() {
        if (!this.elements) {
            this.elements = this.nodes.map(node => node.element);
        }
        return [...this.elements];
    }
    getNodes() {
        return this.nodes;
    }
    has(node) {
        return this.nodeSet.has(node);
    }
    onDidModelSplice({ insertedNodes, deletedNodes }) {
        if (!this.identityProvider) {
            const set = this.createNodeSet();
            const visit = (node) => set.delete(node);
            deletedNodes.forEach(node => dfs(node, visit));
            this.set([...set.values()]);
            return;
        }
        const deletedNodesIdSet = new Set();
        const deletedNodesVisitor = (node) => deletedNodesIdSet.add(this.identityProvider.getId(node.element).toString());
        deletedNodes.forEach(node => dfs(node, deletedNodesVisitor));
        const insertedNodesMap = new Map();
        const insertedNodesVisitor = (node) => insertedNodesMap.set(this.identityProvider.getId(node.element).toString(), node);
        insertedNodes.forEach(node => dfs(node, insertedNodesVisitor));
        const nodes = [];
        for (const node of this.nodes) {
            const id = this.identityProvider.getId(node.element).toString();
            const wasDeleted = deletedNodesIdSet.has(id);
            if (!wasDeleted) {
                nodes.push(node);
            }
            else {
                const insertedNode = insertedNodesMap.get(id);
                if (insertedNode && insertedNode.visible) {
                    nodes.push(insertedNode);
                }
            }
        }
        if (this.nodes.length > 0 && nodes.length === 0) {
            const node = this.getFirstViewElementWithTrait();
            if (node) {
                nodes.push(node);
            }
        }
        this._set(nodes, true);
    }
    createNodeSet() {
        const set = new Set();
        for (const node of this.nodes) {
            set.add(node);
        }
        return set;
    }
}
class TreeNodeListMouseController extends MouseController {
    constructor(list, tree, stickyScrollProvider) {
        super(list);
        this.tree = tree;
        this.stickyScrollProvider = stickyScrollProvider;
    }
    onViewPointer(e) {
        if (isButton(e.browserEvent.target) ||
            isEditableElement(e.browserEvent.target) ||
            isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        const node = e.element;
        if (!node) {
            return super.onViewPointer(e);
        }
        if (this.isSelectionRangeChangeEvent(e) || this.isSelectionSingleChangeEvent(e)) {
            return super.onViewPointer(e);
        }
        const target = e.browserEvent.target;
        const onTwistie = target.classList.contains('monaco-tl-twistie')
            || (target.classList.contains('monaco-icon-label') && target.classList.contains('folder-icon') && e.browserEvent.offsetX < 16);
        const isStickyElement = isStickyScrollElement(e.browserEvent.target);
        let expandOnlyOnTwistieClick = false;
        if (isStickyElement) {
            expandOnlyOnTwistieClick = true;
        }
        else if (typeof this.tree.expandOnlyOnTwistieClick === 'function') {
            expandOnlyOnTwistieClick = this.tree.expandOnlyOnTwistieClick(node.element);
        }
        else {
            expandOnlyOnTwistieClick = !!this.tree.expandOnlyOnTwistieClick;
        }
        if (!isStickyElement) {
            if (expandOnlyOnTwistieClick && !onTwistie && e.browserEvent.detail !== 2) {
                return super.onViewPointer(e);
            }
            if (!this.tree.expandOnDoubleClick && e.browserEvent.detail === 2) {
                return super.onViewPointer(e);
            }
        }
        else {
            this.handleStickyScrollMouseEvent(e, node);
        }
        if (node.collapsible && (!isStickyElement || onTwistie)) {
            const location = this.tree.getNodeLocation(node);
            const recursive = e.browserEvent.altKey;
            this.tree.setFocus([location]);
            this.tree.toggleCollapsed(location, recursive);
            if (onTwistie) {
                // Do not set this before calling a handler on the super class, because it will reject it as handled
                e.browserEvent.isHandledByList = true;
                return;
            }
        }
        if (!isStickyElement) {
            super.onViewPointer(e);
        }
    }
    handleStickyScrollMouseEvent(e, node) {
        if (isMonacoCustomToggle(e.browserEvent.target) || isActionItem(e.browserEvent.target)) {
            return;
        }
        const stickyScrollController = this.stickyScrollProvider();
        if (!stickyScrollController) {
            throw new Error('Sticky scroll controller not found');
        }
        const nodeIndex = this.list.indexOf(node);
        const elementScrollTop = this.list.getElementTop(nodeIndex);
        const elementTargetViewTop = stickyScrollController.nodePositionTopBelowWidget(node);
        this.tree.scrollTop = elementScrollTop - elementTargetViewTop;
        this.list.domFocus();
        this.list.setFocus([nodeIndex]);
        this.list.setSelection([nodeIndex]);
    }
    onDoubleClick(e) {
        const onTwistie = e.browserEvent.target.classList.contains('monaco-tl-twistie');
        if (onTwistie || !this.tree.expandOnDoubleClick) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        super.onDoubleClick(e);
    }
    // to make sure dom focus is not stolen (for example with context menu)
    onMouseDown(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onMouseDown(e);
            return;
        }
    }
    onContextMenu(e) {
        const target = e.browserEvent.target;
        if (!isStickyScrollContainer(target) && !isStickyScrollElement(target)) {
            super.onContextMenu(e);
            return;
        }
    }
}
/**
 * We use this List subclass to restore selection and focus as nodes
 * get rendered in the list, possibly due to a node expand() call.
 */
class TreeNodeList extends List {
    constructor(user, container, virtualDelegate, renderers, focusTrait, selectionTrait, anchorTrait, options) {
        super(user, container, virtualDelegate, renderers, options);
        this.focusTrait = focusTrait;
        this.selectionTrait = selectionTrait;
        this.anchorTrait = anchorTrait;
    }
    createMouseController(options) {
        return new TreeNodeListMouseController(this, options.tree, options.stickyScrollProvider);
    }
    splice(start, deleteCount, elements = []) {
        super.splice(start, deleteCount, elements);
        if (elements.length === 0) {
            return;
        }
        const additionalFocus = [];
        const additionalSelection = [];
        let anchor;
        elements.forEach((node, index) => {
            if (this.focusTrait.has(node)) {
                additionalFocus.push(start + index);
            }
            if (this.selectionTrait.has(node)) {
                additionalSelection.push(start + index);
            }
            if (this.anchorTrait.has(node)) {
                anchor = start + index;
            }
        });
        if (additionalFocus.length > 0) {
            super.setFocus(distinct([...super.getFocus(), ...additionalFocus]));
        }
        if (additionalSelection.length > 0) {
            super.setSelection(distinct([...super.getSelection(), ...additionalSelection]));
        }
        if (typeof anchor === 'number') {
            super.setAnchor(anchor);
        }
    }
    setFocus(indexes, browserEvent, fromAPI = false) {
        super.setFocus(indexes, browserEvent);
        if (!fromAPI) {
            this.focusTrait.set(indexes.map(i => this.element(i)), browserEvent);
        }
    }
    setSelection(indexes, browserEvent, fromAPI = false) {
        super.setSelection(indexes, browserEvent);
        if (!fromAPI) {
            this.selectionTrait.set(indexes.map(i => this.element(i)), browserEvent);
        }
    }
    setAnchor(index, fromAPI = false) {
        super.setAnchor(index);
        if (!fromAPI) {
            if (typeof index === 'undefined') {
                this.anchorTrait.set([]);
            }
            else {
                this.anchorTrait.set([this.element(index)]);
            }
        }
    }
}
export var AbstractTreePart;
(function (AbstractTreePart) {
    AbstractTreePart[AbstractTreePart["Tree"] = 0] = "Tree";
    AbstractTreePart[AbstractTreePart["StickyScroll"] = 1] = "StickyScroll";
})(AbstractTreePart || (AbstractTreePart = {}));
export class AbstractTree {
    get onDidScroll() { return this.view.onDidScroll; }
    get onDidChangeFocus() { return this.eventBufferer.wrapEvent(this.focus.onDidChange); }
    get onDidChangeSelection() { return this.eventBufferer.wrapEvent(this.selection.onDidChange); }
    get onMouseClick() { return Event.map(this.view.onMouseClick, asTreeMouseEvent); }
    get onMouseDblClick() { return Event.filter(Event.map(this.view.onMouseDblClick, asTreeMouseEvent), e => e.target !== TreeMouseEventTarget.Filter); }
    get onMouseOver() { return Event.map(this.view.onMouseOver, asTreeMouseEvent); }
    get onMouseOut() { return Event.map(this.view.onMouseOut, asTreeMouseEvent); }
    get onContextMenu() { return Event.any(Event.filter(Event.map(this.view.onContextMenu, asTreeContextMenuEvent), e => !e.isStickyScroll), this.stickyScrollController?.onContextMenu ?? Event.None); }
    get onTap() { return Event.map(this.view.onTap, asTreeMouseEvent); }
    get onPointer() { return Event.map(this.view.onPointer, asTreeMouseEvent); }
    get onKeyDown() { return this.view.onKeyDown; }
    get onKeyUp() { return this.view.onKeyUp; }
    get onKeyPress() { return this.view.onKeyPress; }
    get onDidFocus() { return this.view.onDidFocus; }
    get onDidBlur() { return this.view.onDidBlur; }
    get onDidChangeModel() { return Event.any(this.onDidChangeModelRelay.event, this.onDidSwapModel.event); }
    get onDidChangeCollapseState() { return this.onDidChangeCollapseStateRelay.event; }
    get onDidChangeRenderNodeCount() { return this.onDidChangeRenderNodeCountRelay.event; }
    get findMode() { return this.findController?.mode ?? TreeFindMode.Highlight; }
    set findMode(findMode) { if (this.findController) {
        this.findController.mode = findMode;
    } }
    get findMatchType() { return this.findController?.matchType ?? TreeFindMatchType.Fuzzy; }
    set findMatchType(findFuzzy) { if (this.findController) {
        this.findController.matchType = findFuzzy;
    } }
    get onDidChangeFindPattern() { return this.findController ? this.findController.onDidChangePattern : Event.None; }
    get expandOnDoubleClick() { return typeof this._options.expandOnDoubleClick === 'undefined' ? true : this._options.expandOnDoubleClick; }
    get expandOnlyOnTwistieClick() { return typeof this._options.expandOnlyOnTwistieClick === 'undefined' ? true : this._options.expandOnlyOnTwistieClick; }
    get onDidDispose() { return this.view.onDidDispose; }
    constructor(_user, container, delegate, renderers, _options = {}) {
        this._user = _user;
        this._options = _options;
        this.eventBufferer = new EventBufferer();
        this.onDidChangeFindOpenState = Event.None;
        this.onDidChangeStickyScrollFocused = Event.None;
        this.disposables = new DisposableStore();
        this.onDidSwapModel = this.disposables.add(new Emitter());
        this.onDidChangeModelRelay = this.disposables.add(new Relay());
        this.onDidSpliceModelRelay = this.disposables.add(new Relay());
        this.onDidChangeCollapseStateRelay = this.disposables.add(new Relay());
        this.onDidChangeRenderNodeCountRelay = this.disposables.add(new Relay());
        this.onDidChangeActiveNodesRelay = this.disposables.add(new Relay());
        this._onWillRefilter = new Emitter();
        this.onWillRefilter = this._onWillRefilter.event;
        this._onDidUpdateOptions = new Emitter();
        this.onDidUpdateOptions = this._onDidUpdateOptions.event;
        this.modelDisposables = new DisposableStore();
        if (_options.keyboardNavigationLabelProvider && (_options.findWidgetEnabled ?? true)) {
            this.findFilter = new FindFilter(_options.keyboardNavigationLabelProvider, _options.filter, _options.defaultFindVisibility);
            _options = { ..._options, filter: this.findFilter }; // TODO need typescript help here
            this.disposables.add(this.findFilter);
        }
        this.model = this.createModel(_user, _options);
        this.treeDelegate = new ComposedTreeDelegate(delegate);
        const activeNodes = this.disposables.add(new EventCollection(this.onDidChangeActiveNodesRelay.event));
        const renderedIndentGuides = new SetMap();
        this.renderers = renderers.map(r => new TreeRenderer(r, this.model, this.onDidChangeCollapseStateRelay.event, activeNodes, renderedIndentGuides, _options));
        for (const r of this.renderers) {
            this.disposables.add(r);
        }
        this.focus = new Trait(() => this.view.getFocusedElements()[0], _options.identityProvider);
        this.selection = new Trait(() => this.view.getSelectedElements()[0], _options.identityProvider);
        this.anchor = new Trait(() => this.view.getAnchorElement(), _options.identityProvider);
        this.view = new TreeNodeList(_user, container, this.treeDelegate, this.renderers, this.focus, this.selection, this.anchor, { ...asListOptions(() => this.model, this.disposables, _options), tree: this, stickyScrollProvider: () => this.stickyScrollController });
        this.setupModel(this.model); // model needs to be setup after the traits have been created
        if (_options.keyboardSupport !== false) {
            const onKeyDown = Event.chain(this.view.onKeyDown, $ => $.filter(e => !isEditableElement(e.target))
                .map(e => new StandardKeyboardEvent(e)));
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 15 /* KeyCode.LeftArrow */))(this.onLeftArrow, this, this.disposables);
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 17 /* KeyCode.RightArrow */))(this.onRightArrow, this, this.disposables);
            Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 10 /* KeyCode.Space */))(this.onSpace, this, this.disposables);
        }
        if ((_options.findWidgetEnabled ?? true) && _options.keyboardNavigationLabelProvider && _options.contextViewProvider) {
            const findOptions = {
                styles: _options.findWidgetStyles,
                defaultFindMode: _options.defaultFindMode,
                defaultFindMatchType: _options.defaultFindMatchType,
                showNotFoundMessage: _options.showNotFoundMessage,
            };
            this.findController = this.disposables.add(new FindController(this, this.findFilter, _options.contextViewProvider, findOptions));
            this.focusNavigationFilter = node => this.findController.shouldAllowFocus(node);
            this.onDidChangeFindOpenState = this.findController.onDidChangeOpenState;
            this.onDidChangeFindMode = this.findController.onDidChangeMode;
            this.onDidChangeFindMatchType = this.findController.onDidChangeMatchType;
        }
        else {
            this.onDidChangeFindMode = Event.None;
            this.onDidChangeFindMatchType = Event.None;
        }
        if (_options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, _options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        this.styleElement = createStyleSheet(this.view.getHTMLElement());
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    updateOptions(optionsUpdate = {}) {
        this._options = { ...this._options, ...optionsUpdate };
        for (const renderer of this.renderers) {
            renderer.updateOptions(optionsUpdate);
        }
        this.view.updateOptions(this._options);
        this.findController?.updateOptions(optionsUpdate);
        this.updateStickyScroll(optionsUpdate);
        this._onDidUpdateOptions.fire(this._options);
        this.getHTMLElement().classList.toggle('always', this._options.renderIndentGuides === RenderIndentGuides.Always);
    }
    get options() {
        return this._options;
    }
    updateStickyScroll(optionsUpdate) {
        if (!this.stickyScrollController && this._options.enableStickyScroll) {
            this.stickyScrollController = new StickyScrollController(this, this.model, this.view, this.renderers, this.treeDelegate, this._options);
            this.onDidChangeStickyScrollFocused = this.stickyScrollController.onDidChangeHasFocus;
        }
        else if (this.stickyScrollController && !this._options.enableStickyScroll) {
            this.onDidChangeStickyScrollFocused = Event.None;
            this.stickyScrollController.dispose();
            this.stickyScrollController = undefined;
        }
        this.stickyScrollController?.updateOptions(optionsUpdate);
    }
    updateWidth(element) {
        const index = this.model.getListIndex(element);
        if (index === -1) {
            return;
        }
        this.view.updateWidth(index);
    }
    // Widget
    getHTMLElement() {
        return this.view.getHTMLElement();
    }
    get contentHeight() {
        return this.view.contentHeight;
    }
    get contentWidth() {
        return this.view.contentWidth;
    }
    get onDidChangeContentHeight() {
        return this.view.onDidChangeContentHeight;
    }
    get onDidChangeContentWidth() {
        return this.view.onDidChangeContentWidth;
    }
    get scrollTop() {
        return this.view.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.view.scrollTop = scrollTop;
    }
    get scrollLeft() {
        return this.view.scrollLeft;
    }
    set scrollLeft(scrollLeft) {
        this.view.scrollLeft = scrollLeft;
    }
    get scrollHeight() {
        return this.view.scrollHeight;
    }
    get renderHeight() {
        return this.view.renderHeight;
    }
    get firstVisibleElement() {
        let index = this.view.firstVisibleIndex;
        if (this.stickyScrollController) {
            index += this.stickyScrollController.count;
        }
        if (index < 0 || index >= this.view.length) {
            return undefined;
        }
        const node = this.view.element(index);
        return node.element;
    }
    get lastVisibleElement() {
        const index = this.view.lastVisibleIndex;
        const node = this.view.element(index);
        return node.element;
    }
    get ariaLabel() {
        return this.view.ariaLabel;
    }
    set ariaLabel(value) {
        this.view.ariaLabel = value;
    }
    get selectionSize() {
        return this.selection.getNodes().length;
    }
    domFocus() {
        if (this.stickyScrollController?.focusedLast()) {
            this.stickyScrollController.domFocus();
        }
        else {
            this.view.domFocus();
        }
    }
    isDOMFocused() {
        return isActiveElement(this.getHTMLElement());
    }
    layout(height, width) {
        this.view.layout(height, width);
    }
    style(styles) {
        const suffix = `.${this.view.domId}`;
        const content = [];
        if (styles.treeIndentGuidesStroke) {
            content.push(`.monaco-list${suffix}:hover .monaco-tl-indent > .indent-guide, .monaco-list${suffix}.always .monaco-tl-indent > .indent-guide  { opacity: 1; border-color: ${styles.treeInactiveIndentGuidesStroke}; }`);
            content.push(`.monaco-list${suffix} .monaco-tl-indent > .indent-guide.active { opacity: 1; border-color: ${styles.treeIndentGuidesStroke}; }`);
        }
        // Sticky Scroll Background
        const stickyScrollBackground = styles.treeStickyScrollBackground ?? styles.listBackground;
        if (stickyScrollBackground) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { background-color: ${stickyScrollBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-row { background-color: ${stickyScrollBackground}; }`);
        }
        // Sticky Scroll Border
        if (styles.treeStickyScrollBorder) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container { border-bottom: 1px solid ${styles.treeStickyScrollBorder}; }`);
        }
        // Sticky Scroll Shadow
        if (styles.treeStickyScrollShadow) {
            content.push(`.monaco-list${suffix} .monaco-scrollable-element .monaco-tree-sticky-container .monaco-tree-sticky-container-shadow { box-shadow: ${styles.treeStickyScrollShadow} 0 6px 6px -6px inset; height: 3px; }`);
        }
        // Sticky Scroll Focus
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { color: inherit; }`);
        }
        // Sticky Scroll Focus Outlines
        const focusAndSelectionOutline = asCssValueWithDefault(styles.listFocusAndSelectionOutline, asCssValueWithDefault(styles.listSelectionOutline, styles.listFocusOutline ?? ''));
        if (focusAndSelectionOutline) { // default: listFocusOutline
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused.selected { outline: 1px solid ${focusAndSelectionOutline}; outline-offset: -1px;}`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused.selected { outline: inherit;}`);
        }
        if (styles.listFocusOutline) { // default: set
            content.push(`.monaco-list${suffix}.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-list${suffix}:not(.sticky-scroll-focused) .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-scrollable-element .monaco-tree-sticky-container .monaco-list-row.passive-focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused.sticky-scroll-focused .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
            content.push(`.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused:not(.sticky-scroll-focused) .monaco-tree-sticky-container .monaco-list-rows .monaco-list-row.focused { outline: inherit; }`);
        }
        this.styleElement.textContent = content.join('\n');
        this.view.style(styles);
    }
    // Tree navigation
    getParentElement(location) {
        const parentRef = this.model.getParentNodeLocation(location);
        const parentNode = this.model.getNode(parentRef);
        return parentNode.element;
    }
    getFirstElementChild(location) {
        return this.model.getFirstElementChild(location);
    }
    // Tree
    getNode(location) {
        return this.model.getNode(location);
    }
    getNodeLocation(node) {
        return this.model.getNodeLocation(node);
    }
    collapse(location, recursive = false) {
        return this.model.setCollapsed(location, true, recursive);
    }
    expand(location, recursive = false) {
        return this.model.setCollapsed(location, false, recursive);
    }
    toggleCollapsed(location, recursive = false) {
        return this.model.setCollapsed(location, undefined, recursive);
    }
    expandAll() {
        this.model.setCollapsed(this.model.rootRef, false, true);
    }
    collapseAll() {
        this.model.setCollapsed(this.model.rootRef, true, true);
    }
    isCollapsible(location) {
        return this.model.isCollapsible(location);
    }
    setCollapsible(location, collapsible) {
        return this.model.setCollapsible(location, collapsible);
    }
    isCollapsed(location) {
        return this.model.isCollapsed(location);
    }
    expandTo(location) {
        this.model.expandTo(location);
    }
    triggerTypeNavigation() {
        this.view.triggerTypeNavigation();
    }
    openFind() {
        this.findController?.open();
    }
    closeFind() {
        this.findController?.close();
    }
    refilter() {
        this._onWillRefilter.fire(undefined);
        this.model.refilter();
    }
    setAnchor(element) {
        if (typeof element === 'undefined') {
            return this.view.setAnchor(undefined);
        }
        this.eventBufferer.bufferEvents(() => {
            const node = this.model.getNode(element);
            this.anchor.set([node]);
            const index = this.model.getListIndex(element);
            if (index > -1) {
                this.view.setAnchor(index, true);
            }
        });
    }
    getAnchor() {
        return this.anchor.get().at(0);
    }
    setSelection(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map(e => this.model.getNode(e));
            this.selection.set(nodes, browserEvent);
            const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
            this.view.setSelection(indexes, browserEvent, true);
        });
    }
    getSelection() {
        return this.selection.get();
    }
    setFocus(elements, browserEvent) {
        this.eventBufferer.bufferEvents(() => {
            const nodes = elements.map(e => this.model.getNode(e));
            this.focus.set(nodes, browserEvent);
            const indexes = elements.map(e => this.model.getListIndex(e)).filter(i => i > -1);
            this.view.setFocus(indexes, browserEvent, true);
        });
    }
    focusNext(n = 1, loop = false, browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusNext(n, loop, browserEvent, filter);
    }
    focusPrevious(n = 1, loop = false, browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusPrevious(n, loop, browserEvent, filter);
    }
    focusNextPage(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        return this.view.focusNextPage(browserEvent, filter);
    }
    focusPreviousPage(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        return this.view.focusPreviousPage(browserEvent, filter, () => this.stickyScrollController?.height ?? 0);
    }
    focusLast(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusLast(browserEvent, filter);
    }
    focusFirst(browserEvent, filter = (isKeyboardEvent(browserEvent) && browserEvent.altKey) ? undefined : this.focusNavigationFilter) {
        this.view.focusFirst(browserEvent, filter);
    }
    getFocus() {
        return this.focus.get();
    }
    getStickyScrollFocus() {
        const focus = this.stickyScrollController?.getFocus();
        return focus !== undefined ? [focus] : [];
    }
    getFocusedPart() {
        return this.stickyScrollController?.focusedLast() ? 1 /* AbstractTreePart.StickyScroll */ : 0 /* AbstractTreePart.Tree */;
    }
    reveal(location, relativeTop) {
        this.model.expandTo(location);
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return;
        }
        if (!this.stickyScrollController) {
            this.view.reveal(index, relativeTop);
        }
        else {
            const paddingTop = this.stickyScrollController.nodePositionTopBelowWidget(this.getNode(location));
            this.view.reveal(index, relativeTop, paddingTop);
        }
    }
    /**
     * Returns the relative position of an element rendered in the list.
     * Returns `null` if the element isn't *entirely* in the visible viewport.
     */
    getRelativeTop(location) {
        const index = this.model.getListIndex(location);
        if (index === -1) {
            return null;
        }
        const stickyScrollNode = this.stickyScrollController?.getNode(this.getNode(location));
        return this.view.getRelativeTop(index, stickyScrollNode?.position ?? this.stickyScrollController?.height);
    }
    getViewState(identityProvider = this.options.identityProvider) {
        if (!identityProvider) {
            throw new TreeError(this._user, 'Can\'t get tree view state without an identity provider');
        }
        const getId = (element) => identityProvider.getId(element).toString();
        const state = AbstractTreeViewState.empty(this.scrollTop);
        for (const focus of this.getFocus()) {
            state.focus.add(getId(focus));
        }
        for (const selection of this.getSelection()) {
            state.selection.add(getId(selection));
        }
        const root = this.model.getNode();
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node !== root && node.collapsible) {
                state.expanded[getId(node.element)] = node.collapsed ? 0 : 1;
            }
            insertInto(stack, stack.length, node.children);
        }
        return state;
    }
    // List
    onLeftArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, true);
        if (!didChange) {
            const parentLocation = this.model.getParentNodeLocation(location);
            if (!parentLocation) {
                return;
            }
            const parentListIndex = this.model.getListIndex(parentLocation);
            this.view.reveal(parentListIndex);
            this.view.setFocus([parentListIndex]);
        }
    }
    onRightArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const didChange = this.model.setCollapsed(location, false);
        if (!didChange) {
            if (!node.children.some(child => child.visible)) {
                return;
            }
            const [focusedIndex] = this.view.getFocus();
            const firstChildIndex = focusedIndex + 1;
            this.view.reveal(firstChildIndex);
            this.view.setFocus([firstChildIndex]);
        }
    }
    onSpace(e) {
        e.preventDefault();
        e.stopPropagation();
        const nodes = this.view.getFocusedElements();
        if (nodes.length === 0) {
            return;
        }
        const node = nodes[0];
        const location = this.model.getNodeLocation(node);
        const recursive = e.browserEvent.altKey;
        this.model.setCollapsed(location, undefined, recursive);
    }
    setupModel(model) {
        this.modelDisposables.clear();
        this.modelDisposables.add(model.onDidSpliceRenderedNodes(({ start, deleteCount, elements }) => this.view.splice(start, deleteCount, elements)));
        const onDidModelSplice = Event.forEach(model.onDidSpliceModel, e => {
            this.eventBufferer.bufferEvents(() => {
                this.focus.onDidModelSplice(e);
                this.selection.onDidModelSplice(e);
            });
        }, this.modelDisposables);
        // Make sure the `forEach` always runs
        onDidModelSplice(() => null, null, this.modelDisposables);
        // Active nodes can change when the model changes or when focus or selection change.
        // We debounce it with 0 delay since these events may fire in the same stack and we only
        // want to run this once. It also doesn't matter if it runs on the next tick since it's only
        // a nice to have UI feature.
        const activeNodesEmitter = this.modelDisposables.add(new Emitter());
        const activeNodesDebounce = this.modelDisposables.add(new Delayer(0));
        this.modelDisposables.add(Event.any(onDidModelSplice, this.focus.onDidChange, this.selection.onDidChange)(() => {
            activeNodesDebounce.trigger(() => {
                const set = new Set();
                for (const node of this.focus.getNodes()) {
                    set.add(node);
                }
                for (const node of this.selection.getNodes()) {
                    set.add(node);
                }
                activeNodesEmitter.fire([...set.values()]);
            });
        }));
        this.onDidChangeActiveNodesRelay.input = activeNodesEmitter.event;
        this.onDidChangeModelRelay.input = Event.signal(model.onDidSpliceModel);
        this.onDidChangeCollapseStateRelay.input = model.onDidChangeCollapseState;
        this.onDidChangeRenderNodeCountRelay.input = model.onDidChangeRenderNodeCount;
        this.onDidSpliceModelRelay.input = model.onDidSpliceModel;
    }
    navigate(start) {
        return new TreeNavigator(this.view, this.model, start);
    }
    dispose() {
        dispose(this.disposables);
        this.stickyScrollController?.dispose();
        this.view.dispose();
        this.modelDisposables.dispose();
    }
}
class TreeNavigator {
    constructor(view, model, start) {
        this.view = view;
        this.model = model;
        if (start) {
            this.index = this.model.getListIndex(start);
        }
        else {
            this.index = -1;
        }
    }
    current() {
        if (this.index < 0 || this.index >= this.view.length) {
            return null;
        }
        return this.view.element(this.index).element;
    }
    previous() {
        this.index--;
        return this.current();
    }
    next() {
        this.index++;
        return this.current();
    }
    first() {
        this.index = 0;
        return this.current();
    }
    last() {
        this.index = this.view.length - 1;
        return this.current();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9hYnN0cmFjdFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBMEMsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQXdCLE1BQU0scUJBQXFCLENBQUM7QUFDcEYsT0FBTyxFQUF5RCxZQUFZLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFzQixNQUFNLHVCQUF1QixDQUFDO0FBQ3ZQLE9BQU8sRUFBaUIsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVB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