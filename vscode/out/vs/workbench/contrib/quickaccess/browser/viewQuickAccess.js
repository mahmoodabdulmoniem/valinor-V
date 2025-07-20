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
var ViewQuickAccessProvider_1;
import { localize, localize2 } from '../../../../nls.js';
import { IQuickInputService, ItemActivation } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { fuzzyContains } from '../../../../base/common/strings.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IDebugService, REPL_VIEW_ID } from '../../debug/common/debug.js';
let ViewQuickAccessProvider = class ViewQuickAccessProvider extends PickerQuickAccessProvider {
    static { ViewQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'view '; }
    constructor(viewDescriptorService, viewsService, outputService, terminalService, terminalGroupService, debugService, paneCompositeService, contextKeyService) {
        super(ViewQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noViewResults', "No matching views"),
                containerLabel: ''
            }
        });
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.outputService = outputService;
        this.terminalService = terminalService;
        this.terminalGroupService = terminalGroupService;
        this.debugService = debugService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
    }
    _getPicks(filter) {
        const filteredViewEntries = this.doGetViewPickItems().filter(entry => {
            if (!filter) {
                return true;
            }
            // Match fuzzy on label
            entry.highlights = { label: matchesFuzzy(filter, entry.label, true) ?? undefined };
            // Return if we have a match on label or container
            return entry.highlights.label || fuzzyContains(entry.containerLabel, filter);
        });
        // Map entries to container labels
        const mapEntryToContainer = new Map();
        for (const entry of filteredViewEntries) {
            if (!mapEntryToContainer.has(entry.label)) {
                mapEntryToContainer.set(entry.label, entry.containerLabel);
            }
        }
        // Add separators for containers
        const filteredViewEntriesWithSeparators = [];
        let lastContainer = undefined;
        for (const entry of filteredViewEntries) {
            if (lastContainer !== entry.containerLabel) {
                lastContainer = entry.containerLabel;
                // When the entry container has a parent container, set container
                // label as Parent / Child. For example, `Views / Explorer`.
                let separatorLabel;
                if (mapEntryToContainer.has(lastContainer)) {
                    separatorLabel = `${mapEntryToContainer.get(lastContainer)} / ${lastContainer}`;
                }
                else {
                    separatorLabel = lastContainer;
                }
                filteredViewEntriesWithSeparators.push({ type: 'separator', label: separatorLabel });
            }
            filteredViewEntriesWithSeparators.push(entry);
        }
        return filteredViewEntriesWithSeparators;
    }
    doGetViewPickItems() {
        const viewEntries = [];
        const getViewEntriesForPaneComposite = (paneComposite, viewContainer) => {
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            const result = [];
            for (const view of viewContainerModel.allViewDescriptors) {
                if (this.contextKeyService.contextMatchesRules(view.when)) {
                    result.push({
                        label: view.name.value,
                        containerLabel: viewContainerModel.title,
                        accept: () => this.viewsService.openView(view.id, true)
                    });
                }
            }
            return result;
        };
        const addPaneComposites = (location, containerLabel) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            const visiblePaneCompositeIds = this.paneCompositeService.getVisiblePaneCompositeIds(location);
            paneComposites.sort((a, b) => {
                let aIndex = visiblePaneCompositeIds.findIndex(id => a.id === id);
                let bIndex = visiblePaneCompositeIds.findIndex(id => b.id === id);
                if (aIndex < 0) {
                    aIndex = paneComposites.indexOf(a) + visiblePaneCompositeIds.length;
                }
                if (bIndex < 0) {
                    bIndex = paneComposites.indexOf(b) + visiblePaneCompositeIds.length;
                }
                return aIndex - bIndex;
            });
            for (const paneComposite of paneComposites) {
                if (this.includeViewContainer(paneComposite)) {
                    const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                    if (viewContainer) {
                        viewEntries.push({
                            label: this.viewDescriptorService.getViewContainerModel(viewContainer).title,
                            containerLabel,
                            accept: () => this.paneCompositeService.openPaneComposite(paneComposite.id, location, true)
                        });
                    }
                }
            }
        };
        // Viewlets / Panels
        addPaneComposites(0 /* ViewContainerLocation.Sidebar */, localize('views', "Side Bar"));
        addPaneComposites(1 /* ViewContainerLocation.Panel */, localize('panels', "Panel"));
        addPaneComposites(2 /* ViewContainerLocation.AuxiliaryBar */, localize('secondary side bar', "Secondary Side Bar"));
        const addPaneCompositeViews = (location) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            for (const paneComposite of paneComposites) {
                const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                if (viewContainer) {
                    viewEntries.push(...getViewEntriesForPaneComposite(paneComposite, viewContainer));
                }
            }
        };
        // Side Bar / Panel Views
        addPaneCompositeViews(0 /* ViewContainerLocation.Sidebar */);
        addPaneCompositeViews(1 /* ViewContainerLocation.Panel */);
        addPaneCompositeViews(2 /* ViewContainerLocation.AuxiliaryBar */);
        // Terminals
        this.terminalGroupService.groups.forEach((group, groupIndex) => {
            group.terminalInstances.forEach((terminal, terminalIndex) => {
                const label = localize('terminalTitle', "{0}: {1}", `${groupIndex + 1}.${terminalIndex + 1}`, terminal.title);
                viewEntries.push({
                    label,
                    containerLabel: localize('terminals', "Terminal"),
                    accept: async () => {
                        await this.terminalGroupService.showPanel(true);
                        this.terminalService.setActiveInstance(terminal);
                    }
                });
            });
        });
        // Debug Consoles
        this.debugService.getModel().getSessions(true).filter(s => s.hasSeparateRepl()).forEach((session, _) => {
            const label = session.name;
            viewEntries.push({
                label,
                containerLabel: localize('debugConsoles', "Debug Console"),
                accept: async () => {
                    await this.debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
                    if (!this.viewsService.isViewVisible(REPL_VIEW_ID)) {
                        await this.viewsService.openView(REPL_VIEW_ID, true);
                    }
                }
            });
        });
        // Output Channels
        const channels = this.outputService.getChannelDescriptors();
        for (const channel of channels) {
            viewEntries.push({
                label: channel.label,
                containerLabel: localize('channels', "Output"),
                accept: () => this.outputService.showChannel(channel.id)
            });
        }
        return viewEntries;
    }
    includeViewContainer(container) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(container.id);
        if (viewContainer?.hideIfEmpty) {
            return this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors.length > 0;
        }
        return true;
    }
};
ViewQuickAccessProvider = ViewQuickAccessProvider_1 = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IViewsService),
    __param(2, IOutputService),
    __param(3, ITerminalService),
    __param(4, ITerminalGroupService),
    __param(5, IDebugService),
    __param(6, IPaneCompositePartService),
    __param(7, IContextKeyService)
], ViewQuickAccessProvider);
export { ViewQuickAccessProvider };
//#region Actions
export class OpenViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.openView'; }
    constructor() {
        super({
            id: OpenViewPickerAction.ID,
            title: localize2('openView', 'Open View'),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(ViewQuickAccessProvider.PREFIX);
    }
}
export class QuickAccessViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.quickOpenView'; }
    static { this.KEYBINDING = {
        primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 0 }
    }; }
    constructor() {
        super({
            id: QuickAccessViewPickerAction.ID,
            title: localize2('quickOpenView', 'Quick Open View'),
            category: Categories.View,
            f1: false, // hide quick pickers from command palette to not confuse with the other entry that shows a input field
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: undefined,
                ...QuickAccessViewPickerAction.KEYBINDING
            }
        });
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(QuickAccessViewPickerAction.ID);
        quickInputService.quickAccess.show(ViewQuickAccessProvider.PREFIX, { quickNavigateConfiguration: { keybindings: keys }, itemActivation: ItemActivation.FIRST });
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9xdWlja2FjY2Vzcy9icm93c2VyL3ZpZXdRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQXVCLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9ILE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqSSxPQUFPLEVBQUUsc0JBQXNCLEVBQXdDLE1BQU0sMEJBQTBCLENBQUM7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUl6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDckcsT0FB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