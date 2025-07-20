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
var StatusbarPart_1, AuxiliaryStatusbarPart_1;
import './media/statusbarpart.css';
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, disposeIfDisposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { MultiWindowParts, Part } from '../../part.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStatusbarService, isStatusbarEntryLocation, isStatusbarEntryPriority } from '../../../services/statusbar/browser/statusbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { STATUS_BAR_BACKGROUND, STATUS_BAR_FOREGROUND, STATUS_BAR_NO_FOLDER_BACKGROUND, STATUS_BAR_ITEM_HOVER_BACKGROUND, STATUS_BAR_BORDER, STATUS_BAR_NO_FOLDER_FOREGROUND, STATUS_BAR_NO_FOLDER_BORDER, STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND, STATUS_BAR_ITEM_FOCUS_BORDER, STATUS_BAR_FOCUS_BORDER } from '../../../common/theme.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { contrastBorder, activeContrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { EventHelper, addDisposableListener, EventType, clearNode, getWindow, isHTMLElement, $ } from '../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { equals } from '../../../../base/common/arrays.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ToggleStatusbarVisibilityAction } from '../../actions/layoutActions.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { hash } from '../../../../base/common/hash.js';
import { WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { HideStatusbarEntryAction, ManageExtensionAction, ToggleStatusbarEntryVisibilityAction } from './statusbarActions.js';
import { StatusbarViewModel } from './statusbarModel.js';
import { StatusbarEntryItem } from './statusbarItem.js';
import { StatusBarFocused } from '../../../common/contextkeys.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isManagedHoverTooltipHTMLElement, isManagedHoverTooltipMarkdownString } from '../../../../base/browser/ui/hover/hover.js';
let StatusbarPart = class StatusbarPart extends Part {
    static { StatusbarPart_1 = this; }
    static { this.HEIGHT = 22; }
    constructor(id, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.instantiationService = instantiationService;
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        //#region IView
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = StatusbarPart_1.HEIGHT;
        this.maximumHeight = StatusbarPart_1.HEIGHT;
        this.pendingEntries = [];
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.onDidOverrideEntry = this._register(new Emitter());
        this.entryOverrides = new Map();
        this.compactEntriesDisposable = this._register(new MutableDisposable());
        this.styleOverrides = new Set();
        this.viewModel = this._register(new StatusbarViewModel(storageService));
        this.onDidChangeEntryVisibility = this.viewModel.onDidChangeEntryVisibility;
        this.hoverDelegate = this._register(this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', {
            instantHover: true,
            dynamicDelay(content) {
                if (typeof content === 'function' ||
                    isHTMLElement(content) ||
                    (isManagedHoverTooltipMarkdownString(content) && typeof content.markdown === 'function') ||
                    isManagedHoverTooltipHTMLElement(content)) {
                    // override the delay for content that is rich (e.g. html or long running)
                    // so that it appears more instantly. these hovers carry more important
                    // information and should not be delayed by preference.
                    return 500;
                }
                return undefined;
            }
        }, (_, focus) => ({
            persistence: {
                hideOnKeyDown: true,
                sticky: focus
            },
            appearance: {
                maxHeightRatio: 0.9
            }
        })));
        this.registerListeners();
    }
    registerListeners() {
        // Entry visibility changes
        this._register(this.onDidChangeEntryVisibility(() => this.updateCompactEntries()));
        // Workbench state changes
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateStyles()));
    }
    overrideEntry(id, override) {
        this.entryOverrides.set(id, override);
        this.onDidOverrideEntry.fire(id);
        return toDisposable(() => {
            const currentOverride = this.entryOverrides.get(id);
            if (currentOverride === override) {
                this.entryOverrides.delete(id);
                this.onDidOverrideEntry.fire(id);
            }
        });
    }
    withEntryOverride(entry, id) {
        const override = this.entryOverrides.get(id);
        if (override) {
            entry = { ...entry, ...override };
        }
        return entry;
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        let priority;
        if (isStatusbarEntryPriority(priorityOrLocation)) {
            priority = priorityOrLocation;
        }
        else {
            priority = {
                primary: priorityOrLocation,
                secondary: hash(id) // derive from identifier to accomplish uniqueness
            };
        }
        // As long as we have not been created into a container yet, record all entries
        // that are pending so that they can get created at a later point
        if (!this.element) {
            return this.doAddPendingEntry(entry, id, alignment, priority);
        }
        // Otherwise add to view
        return this.doAddEntry(entry, id, alignment, priority);
    }
    doAddPendingEntry(entry, id, alignment, priority) {
        const pendingEntry = { entry, id, alignment, priority };
        this.pendingEntries.push(pendingEntry);
        const accessor = {
            update: (entry) => {
                if (pendingEntry.accessor) {
                    pendingEntry.accessor.update(entry);
                }
                else {
                    pendingEntry.entry = entry;
                }
            },
            dispose: () => {
                if (pendingEntry.accessor) {
                    pendingEntry.accessor.dispose();
                }
                else {
                    this.pendingEntries = this.pendingEntries.filter(entry => entry !== pendingEntry);
                }
            }
        };
        return accessor;
    }
    doAddEntry(entry, id, alignment, priority) {
        const disposables = new DisposableStore();
        // View model item
        const itemContainer = this.doCreateStatusItem(id, alignment);
        const item = disposables.add(this.instantiationService.createInstance(StatusbarEntryItem, itemContainer, this.withEntryOverride(entry, id), this.hoverDelegate));
        // View model entry
        const viewModelEntry = new class {
            constructor() {
                this.id = id;
                this.extensionId = entry.extensionId;
                this.alignment = alignment;
                this.priority = priority;
                this.container = itemContainer;
                this.labelContainer = item.labelContainer;
            }
            get name() { return item.name; }
            get hasCommand() { return item.hasCommand; }
        };
        // Add to view model
        const { needsFullRefresh } = this.doAddOrRemoveModelEntry(viewModelEntry, true);
        if (needsFullRefresh) {
            this.appendStatusbarEntries();
        }
        else {
            this.appendStatusbarEntry(viewModelEntry);
        }
        let lastEntry = entry;
        const accessor = {
            update: entry => {
                lastEntry = entry;
                item.update(this.withEntryOverride(entry, id));
            },
            dispose: () => {
                const { needsFullRefresh } = this.doAddOrRemoveModelEntry(viewModelEntry, false);
                if (needsFullRefresh) {
                    this.appendStatusbarEntries();
                }
                else {
                    itemContainer.remove();
                    this.updateCompactEntries();
                }
                disposables.dispose();
            }
        };
        // React to overrides
        disposables.add(this.onDidOverrideEntry.event(overrideEntryId => {
            if (overrideEntryId === id) {
                accessor.update(lastEntry);
            }
        }));
        return accessor;
    }
    doCreateStatusItem(id, alignment, ...extraClasses) {
        const itemContainer = $('.statusbar-item', { id });
        if (extraClasses) {
            itemContainer.classList.add(...extraClasses);
        }
        if (alignment === 1 /* StatusbarAlignment.RIGHT */) {
            itemContainer.classList.add('right');
        }
        else {
            itemContainer.classList.add('left');
        }
        return itemContainer;
    }
    doAddOrRemoveModelEntry(entry, add) {
        // Update model but remember previous entries
        const entriesBefore = this.viewModel.entries;
        if (add) {
            this.viewModel.add(entry);
        }
        else {
            this.viewModel.remove(entry);
        }
        const entriesAfter = this.viewModel.entries;
        // Apply operation onto the entries from before
        if (add) {
            entriesBefore.splice(entriesAfter.indexOf(entry), 0, entry);
        }
        else {
            entriesBefore.splice(entriesBefore.indexOf(entry), 1);
        }
        // Figure out if a full refresh is needed by comparing arrays
        const needsFullRefresh = !equals(entriesBefore, entriesAfter);
        return { needsFullRefresh };
    }
    isEntryVisible(id) {
        return !this.viewModel.isHidden(id);
    }
    updateEntryVisibility(id, visible) {
        if (visible) {
            this.viewModel.show(id);
        }
        else {
            this.viewModel.hide(id);
        }
    }
    focusNextEntry() {
        this.viewModel.focusNextEntry();
    }
    focusPreviousEntry() {
        this.viewModel.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.viewModel.isEntryFocused();
    }
    focus(preserveEntryFocus = true) {
        this.getContainer()?.focus();
        const lastFocusedEntry = this.viewModel.lastFocusedEntry;
        if (preserveEntryFocus && lastFocusedEntry) {
            setTimeout(() => lastFocusedEntry.labelContainer.focus(), 0); // Need a timeout, for some reason without it the inner label container will not get focused
        }
    }
    createContentArea(parent) {
        this.element = parent;
        // Track focus within container
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
        StatusBarFocused.bindTo(scopedContextKeyService).set(true);
        // Left items container
        this.leftItemsContainer = $('.left-items.items-container');
        this.element.appendChild(this.leftItemsContainer);
        this.element.tabIndex = 0;
        // Right items container
        this.rightItemsContainer = $('.right-items.items-container');
        this.element.appendChild(this.rightItemsContainer);
        // Context menu support
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, e => this.showContextMenu(e)));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, e => this.showContextMenu(e)));
        // Initial status bar entries
        this.createInitialStatusbarEntries();
        return this.element;
    }
    createInitialStatusbarEntries() {
        // Add items in order according to alignment
        this.appendStatusbarEntries();
        // Fill in pending entries if any
        while (this.pendingEntries.length) {
            const pending = this.pendingEntries.shift();
            if (pending) {
                pending.accessor = this.addEntry(pending.entry, pending.id, pending.alignment, pending.priority.primary);
            }
        }
    }
    appendStatusbarEntries() {
        const leftItemsContainer = assertReturnsDefined(this.leftItemsContainer);
        const rightItemsContainer = assertReturnsDefined(this.rightItemsContainer);
        // Clear containers
        clearNode(leftItemsContainer);
        clearNode(rightItemsContainer);
        // Append all
        for (const entry of [
            ...this.viewModel.getEntries(0 /* StatusbarAlignment.LEFT */),
            ...this.viewModel.getEntries(1 /* StatusbarAlignment.RIGHT */).reverse() // reversing due to flex: row-reverse
        ]) {
            const target = entry.alignment === 0 /* StatusbarAlignment.LEFT */ ? leftItemsContainer : rightItemsContainer;
            target.appendChild(entry.container);
        }
        // Update compact entries
        this.updateCompactEntries();
    }
    appendStatusbarEntry(entry) {
        const entries = this.viewModel.getEntries(entry.alignment);
        if (entry.alignment === 1 /* StatusbarAlignment.RIGHT */) {
            entries.reverse(); // reversing due to flex: row-reverse
        }
        const target = assertReturnsDefined(entry.alignment === 0 /* StatusbarAlignment.LEFT */ ? this.leftItemsContainer : this.rightItemsContainer);
        const index = entries.indexOf(entry);
        if (index + 1 === entries.length) {
            target.appendChild(entry.container); // append at the end if last
        }
        else {
            target.insertBefore(entry.container, entries[index + 1].container); // insert before next element otherwise
        }
        // Update compact entries
        this.updateCompactEntries();
    }
    updateCompactEntries() {
        const entries = this.viewModel.entries;
        // Find visible entries and clear compact related CSS classes if any
        const mapIdToVisibleEntry = new Map();
        for (const entry of entries) {
            if (!this.viewModel.isHidden(entry.id)) {
                mapIdToVisibleEntry.set(entry.id, entry);
            }
            entry.container.classList.remove('compact-left', 'compact-right');
        }
        // Figure out groups of entries with `compact` alignment
        const compactEntryGroups = new Map();
        for (const entry of mapIdToVisibleEntry.values()) {
            if (isStatusbarEntryLocation(entry.priority.primary) && // entry references another entry as location
                entry.priority.primary.compact // entry wants to be compact
            ) {
                const locationId = entry.priority.primary.location.id;
                const location = mapIdToVisibleEntry.get(locationId);
                if (!location) {
                    continue; // skip if location does not exist
                }
                // Build a map of entries that are compact among each other
                let compactEntryGroup = compactEntryGroups.get(locationId);
                if (!compactEntryGroup) {
                    // It is possible that this entry references another entry
                    // that itself references an entry. In that case, we want
                    // to add it to the entries of the referenced entry.
                    for (const group of compactEntryGroups.values()) {
                        if (group.has(locationId)) {
                            compactEntryGroup = group;
                            break;
                        }
                    }
                    if (!compactEntryGroup) {
                        compactEntryGroup = new Map();
                        compactEntryGroups.set(locationId, compactEntryGroup);
                    }
                }
                compactEntryGroup.set(entry.id, entry);
                compactEntryGroup.set(location.id, location);
                // Adjust CSS classes to move compact items closer together
                if (entry.priority.primary.alignment === 0 /* StatusbarAlignment.LEFT */) {
                    location.container.classList.add('compact-left');
                    entry.container.classList.add('compact-right');
                }
                else {
                    location.container.classList.add('compact-right');
                    entry.container.classList.add('compact-left');
                }
            }
        }
        // Install mouse listeners to update hover feedback for
        // all compact entries that belong to each other
        const statusBarItemHoverBackground = this.getColor(STATUS_BAR_ITEM_HOVER_BACKGROUND);
        const statusBarItemCompactHoverBackground = this.getColor(STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND);
        this.compactEntriesDisposable.value = new DisposableStore();
        if (statusBarItemHoverBackground && statusBarItemCompactHoverBackground && !isHighContrast(this.theme.type)) {
            for (const [, compactEntryGroup] of compactEntryGroups) {
                for (const compactEntry of compactEntryGroup.values()) {
                    if (!compactEntry.hasCommand) {
                        continue; // only show hover feedback when we have a command
                    }
                    this.compactEntriesDisposable.value.add(addDisposableListener(compactEntry.labelContainer, EventType.MOUSE_OVER, () => {
                        compactEntryGroup.forEach(compactEntry => compactEntry.labelContainer.style.backgroundColor = statusBarItemHoverBackground);
                        compactEntry.labelContainer.style.backgroundColor = statusBarItemCompactHoverBackground;
                    }));
                    this.compactEntriesDisposable.value.add(addDisposableListener(compactEntry.labelContainer, EventType.MOUSE_OUT, () => {
                        compactEntryGroup.forEach(compactEntry => compactEntry.labelContainer.style.backgroundColor = '');
                    }));
                }
            }
        }
    }
    showContextMenu(e) {
        EventHelper.stop(e, true);
        const event = new StandardMouseEvent(getWindow(this.element), e);
        let actions = undefined;
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => {
                actions = this.getContextMenuActions(event);
                return actions;
            },
            onHide: () => {
                if (actions) {
                    disposeIfDisposable(actions);
                }
            }
        });
    }
    getContextMenuActions(event) {
        const actions = [];
        // Provide an action to hide the status bar at last
        actions.push(toAction({ id: ToggleStatusbarVisibilityAction.ID, label: localize('hideStatusBar', "Hide Status Bar"), run: () => this.instantiationService.invokeFunction(accessor => new ToggleStatusbarVisibilityAction().run(accessor)) }));
        actions.push(new Separator());
        // Show an entry per known status entry
        // Note: even though entries have an identifier, there can be multiple entries
        // having the same identifier (e.g. from extensions). So we make sure to only
        // show a single entry per identifier we handled.
        const handledEntries = new Set();
        for (const entry of this.viewModel.entries) {
            if (!handledEntries.has(entry.id)) {
                actions.push(new ToggleStatusbarEntryVisibilityAction(entry.id, entry.name, this.viewModel));
                handledEntries.add(entry.id);
            }
        }
        // Figure out if mouse is over an entry
        let statusEntryUnderMouse = undefined;
        for (let element = event.target; element; element = element.parentElement) {
            const entry = this.viewModel.findEntry(element);
            if (entry) {
                statusEntryUnderMouse = entry;
                break;
            }
        }
        if (statusEntryUnderMouse) {
            actions.push(new Separator());
            if (statusEntryUnderMouse.extensionId) {
                actions.push(this.instantiationService.createInstance(ManageExtensionAction, statusEntryUnderMouse.extensionId));
            }
            actions.push(new HideStatusbarEntryAction(statusEntryUnderMouse.id, statusEntryUnderMouse.name, this.viewModel));
        }
        return actions;
    }
    updateStyles() {
        super.updateStyles();
        const container = assertReturnsDefined(this.getContainer());
        const styleOverride = [...this.styleOverrides].sort((a, b) => a.priority - b.priority)[0];
        // Background / foreground colors
        const backgroundColor = this.getColor(styleOverride?.background ?? (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ? STATUS_BAR_BACKGROUND : STATUS_BAR_NO_FOLDER_BACKGROUND)) || '';
        container.style.backgroundColor = backgroundColor;
        const foregroundColor = this.getColor(styleOverride?.foreground ?? (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ? STATUS_BAR_FOREGROUND : STATUS_BAR_NO_FOLDER_FOREGROUND)) || '';
        container.style.color = foregroundColor;
        const itemBorderColor = this.getColor(STATUS_BAR_ITEM_FOCUS_BORDER);
        // Border color
        const borderColor = this.getColor(styleOverride?.border ?? (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ? STATUS_BAR_BORDER : STATUS_BAR_NO_FOLDER_BORDER)) || this.getColor(contrastBorder);
        if (borderColor) {
            container.classList.add('status-border-top');
            container.style.setProperty('--status-border-top-color', borderColor);
        }
        else {
            container.classList.remove('status-border-top');
            container.style.removeProperty('--status-border-top-color');
        }
        // Colors and focus outlines via dynamic stylesheet
        const statusBarFocusColor = this.getColor(STATUS_BAR_FOCUS_BORDER);
        if (!this.styleElement) {
            this.styleElement = createStyleSheet(container);
        }
        this.styleElement.textContent = `

				/* Status bar focus outline */
				.monaco-workbench .part.statusbar:focus {
					outline-color: ${statusBarFocusColor};
				}

				/* Status bar item focus outline */
				.monaco-workbench .part.statusbar > .items-container > .statusbar-item a:focus-visible {
					outline: 1px solid ${this.getColor(activeContrastBorder) ?? itemBorderColor};
					outline-offset: ${borderColor ? '-2px' : '-1px'};
				}

				/* Notification Beak */
				.monaco-workbench .part.statusbar > .items-container > .statusbar-item.has-beak > .status-bar-item-beak-container:before {
					border-bottom-color: ${borderColor ?? backgroundColor};
				}
			`;
    }
    layout(width, height, top, left) {
        super.layout(width, height, top, left);
        super.layoutContents(width, height);
    }
    overrideStyle(style) {
        this.styleOverrides.add(style);
        this.updateStyles();
        return toDisposable(() => {
            this.styleOverrides.delete(style);
            this.updateStyles();
        });
    }
    toJSON() {
        return {
            type: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
};
StatusbarPart = StatusbarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IWorkspaceContextService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService)
], StatusbarPart);
let MainStatusbarPart = class MainStatusbarPart extends StatusbarPart {
    constructor(instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        super("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService);
    }
};
MainStatusbarPart = __decorate([
    __param(0, IInstantiationService),
    __param(1, IThemeService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextMenuService),
    __param(6, IContextKeyService)
], MainStatusbarPart);
export { MainStatusbarPart };
let AuxiliaryStatusbarPart = class AuxiliaryStatusbarPart extends StatusbarPart {
    static { AuxiliaryStatusbarPart_1 = this; }
    static { this.COUNTER = 1; }
    constructor(container, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        const id = AuxiliaryStatusbarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryStatus.${id}`, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService);
        this.container = container;
        this.height = StatusbarPart.HEIGHT;
    }
};
AuxiliaryStatusbarPart = AuxiliaryStatusbarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IWorkspaceContextService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService)
], AuxiliaryStatusbarPart);
export { AuxiliaryStatusbarPart };
let StatusbarService = class StatusbarService extends MultiWindowParts {
    constructor(instantiationService, storageService, themeService) {
        super('workbench.statusBarService', themeService, storageService);
        this.instantiationService = instantiationService;
        this._onDidCreateAuxiliaryStatusbarPart = this._register(new Emitter());
        this.onDidCreateAuxiliaryStatusbarPart = this._onDidCreateAuxiliaryStatusbarPart.event;
        this.mainPart = this._register(this.instantiationService.createInstance(MainStatusbarPart));
        this._register(this.registerPart(this.mainPart));
        this.onDidChangeEntryVisibility = this.mainPart.onDidChangeEntryVisibility;
    }
    //#region Auxiliary Statusbar Parts
    createAuxiliaryStatusbarPart(container, instantiationService) {
        // Container
        const statusbarPartContainer = $('footer.part.statusbar', {
            'role': 'status',
            'aria-live': 'off',
            'tabIndex': '0'
        });
        statusbarPartContainer.style.position = 'relative';
        container.appendChild(statusbarPartContainer);
        // Statusbar Part
        const statusbarPart = instantiationService.createInstance(AuxiliaryStatusbarPart, statusbarPartContainer);
        const disposable = this.registerPart(statusbarPart);
        statusbarPart.create(statusbarPartContainer);
        Event.once(statusbarPart.onWillDispose)(() => disposable.dispose());
        // Emit internal event
        this._onDidCreateAuxiliaryStatusbarPart.fire(statusbarPart);
        return statusbarPart;
    }
    createScoped(statusbarEntryContainer, disposables) {
        return disposables.add(this.instantiationService.createInstance(ScopedStatusbarService, statusbarEntryContainer));
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        if (entry.showInAllWindows) {
            return this.doAddEntryToAllWindows(entry, id, alignment, priorityOrLocation);
        }
        return this.mainPart.addEntry(entry, id, alignment, priorityOrLocation);
    }
    doAddEntryToAllWindows(originalEntry, id, alignment, priorityOrLocation = 0) {
        const entryDisposables = new DisposableStore();
        const accessors = new Set();
        let entry = originalEntry;
        function addEntry(part) {
            const partDisposables = new DisposableStore();
            partDisposables.add(part.onWillDispose(() => partDisposables.dispose()));
            const accessor = partDisposables.add(part.addEntry(entry, id, alignment, priorityOrLocation));
            accessors.add(accessor);
            partDisposables.add(toDisposable(() => accessors.delete(accessor)));
            entryDisposables.add(partDisposables);
            partDisposables.add(toDisposable(() => entryDisposables.delete(partDisposables)));
        }
        for (const part of this.parts) {
            addEntry(part);
        }
        entryDisposables.add(this.onDidCreateAuxiliaryStatusbarPart(part => addEntry(part)));
        return {
            update: (updatedEntry) => {
                entry = updatedEntry;
                for (const update of accessors) {
                    update.update(updatedEntry);
                }
            },
            dispose: () => entryDisposables.dispose()
        };
    }
    isEntryVisible(id) {
        return this.mainPart.isEntryVisible(id);
    }
    updateEntryVisibility(id, visible) {
        for (const part of this.parts) {
            part.updateEntryVisibility(id, visible);
        }
    }
    overrideEntry(id, override) {
        const disposables = new DisposableStore();
        for (const part of this.parts) {
            disposables.add(part.overrideEntry(id, override));
        }
        return disposables;
    }
    focus(preserveEntryFocus) {
        this.activePart.focus(preserveEntryFocus);
    }
    focusNextEntry() {
        this.activePart.focusNextEntry();
    }
    focusPreviousEntry() {
        this.activePart.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.activePart.isEntryFocused();
    }
    overrideStyle(style) {
        const disposables = new DisposableStore();
        for (const part of this.parts) {
            disposables.add(part.overrideStyle(style));
        }
        return disposables;
    }
};
StatusbarService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService)
], StatusbarService);
export { StatusbarService };
let ScopedStatusbarService = class ScopedStatusbarService extends Disposable {
    constructor(statusbarEntryContainer, statusbarService) {
        super();
        this.statusbarEntryContainer = statusbarEntryContainer;
        this.statusbarService = statusbarService;
        this.onDidChangeEntryVisibility = this.statusbarEntryContainer.onDidChangeEntryVisibility;
    }
    createAuxiliaryStatusbarPart(container, instantiationService) {
        return this.statusbarService.createAuxiliaryStatusbarPart(container, instantiationService);
    }
    createScoped(statusbarEntryContainer, disposables) {
        return this.statusbarService.createScoped(statusbarEntryContainer, disposables);
    }
    getPart() {
        return this.statusbarEntryContainer;
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        return this.statusbarEntryContainer.addEntry(entry, id, alignment, priorityOrLocation);
    }
    isEntryVisible(id) {
        return this.statusbarEntryContainer.isEntryVisible(id);
    }
    updateEntryVisibility(id, visible) {
        this.statusbarEntryContainer.updateEntryVisibility(id, visible);
    }
    overrideEntry(id, override) {
        return this.statusbarEntryContainer.overrideEntry(id, override);
    }
    focus(preserveEntryFocus) {
        this.statusbarEntryContainer.focus(preserveEntryFocus);
    }
    focusNextEntry() {
        this.statusbarEntryContainer.focusNextEntry();
    }
    focusPreviousEntry() {
        this.statusbarEntryContainer.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.statusbarEntryContainer.isEntryFocused();
    }
    overrideStyle(style) {
        return this.statusbarEntryContainer.overrideStyle(style);
    }
};
ScopedStatusbarService = __decorate([
    __param(1, IStatusbarService)
], ScopedStatusbarService);
export { ScopedStatusbarService };
registerSingleton(IStatusbarService, StatusbarService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvc3RhdHVzYmFyL3N0YXR1c2JhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsT0FBTyxFQUFnQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBc0IsaUJBQWlCLEVBQXFFLHdCQUF3QixFQUEyQix3QkFBd0IsRUFBMkIsTUFBTSxrREFBa0QsQ0FBQztBQUNsUixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQVcsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsK0JBQStCLEVBQUUsZ0NBQWdDLEVBQUUsaUJBQWlCLEVBQUUsK0JBQStCLEVBQUUsMkJBQTJCLEVBQUUsd0NBQXdDLEVBQUUsNEJBQTRCLEVBQUUsdUJBQXVCLEVBQUUsTUFB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