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
import { diffSets } from '../../../base/common/collections.js';
import { Emitter } from '../../../base/common/event.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConverters from './extHostTypeConverters.js';
import { ChatEditorTabInput, CustomEditorTabInput, InteractiveWindowInput, NotebookDiffEditorTabInput, NotebookEditorTabInput, TerminalEditorTabInput, TextDiffTabInput, TextMergeTabInput, TextTabInput, WebviewEditorTabInput, TextMultiDiffTabInput } from './extHostTypes.js';
export const IExtHostEditorTabs = createDecorator('IExtHostEditorTabs');
class ExtHostEditorTab {
    constructor(dto, parentGroup, activeTabIdGetter) {
        this._activeTabIdGetter = activeTabIdGetter;
        this._parentGroup = parentGroup;
        this.acceptDtoUpdate(dto);
    }
    get apiObject() {
        if (!this._apiObject) {
            // Don't want to lose reference to parent `this` in the getters
            const that = this;
            const obj = {
                get isActive() {
                    // We use a getter function here to always ensure at most 1 active tab per group and prevent iteration for being required
                    return that._dto.id === that._activeTabIdGetter();
                },
                get label() {
                    return that._dto.label;
                },
                get input() {
                    return that._input;
                },
                get isDirty() {
                    return that._dto.isDirty;
                },
                get isPinned() {
                    return that._dto.isPinned;
                },
                get isPreview() {
                    return that._dto.isPreview;
                },
                get group() {
                    return that._parentGroup.apiObject;
                }
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get tabId() {
        return this._dto.id;
    }
    acceptDtoUpdate(dto) {
        this._dto = dto;
        this._input = this._initInput();
    }
    _initInput() {
        switch (this._dto.input.kind) {
            case 1 /* TabInputKind.TextInput */:
                return new TextTabInput(URI.revive(this._dto.input.uri));
            case 2 /* TabInputKind.TextDiffInput */:
                return new TextDiffTabInput(URI.revive(this._dto.input.original), URI.revive(this._dto.input.modified));
            case 3 /* TabInputKind.TextMergeInput */:
                return new TextMergeTabInput(URI.revive(this._dto.input.base), URI.revive(this._dto.input.input1), URI.revive(this._dto.input.input2), URI.revive(this._dto.input.result));
            case 6 /* TabInputKind.CustomEditorInput */:
                return new CustomEditorTabInput(URI.revive(this._dto.input.uri), this._dto.input.viewType);
            case 7 /* TabInputKind.WebviewEditorInput */:
                return new WebviewEditorTabInput(this._dto.input.viewType);
            case 4 /* TabInputKind.NotebookInput */:
                return new NotebookEditorTabInput(URI.revive(this._dto.input.uri), this._dto.input.notebookType);
            case 5 /* TabInputKind.NotebookDiffInput */:
                return new NotebookDiffEditorTabInput(URI.revive(this._dto.input.original), URI.revive(this._dto.input.modified), this._dto.input.notebookType);
            case 8 /* TabInputKind.TerminalEditorInput */:
                return new TerminalEditorTabInput();
            case 9 /* TabInputKind.InteractiveEditorInput */:
                return new InteractiveWindowInput(URI.revive(this._dto.input.uri), URI.revive(this._dto.input.inputBoxUri));
            case 10 /* TabInputKind.ChatEditorInput */:
                return new ChatEditorTabInput();
            case 11 /* TabInputKind.MultiDiffEditorInput */:
                return new TextMultiDiffTabInput(this._dto.input.diffEditors.map(diff => new TextDiffTabInput(URI.revive(diff.original), URI.revive(diff.modified))));
            default:
                return undefined;
        }
    }
}
class ExtHostEditorTabGroup {
    constructor(dto, activeGroupIdGetter) {
        this._tabs = [];
        this._activeTabId = '';
        this._dto = dto;
        this._activeGroupIdGetter = activeGroupIdGetter;
        // Construct all tabs from the given dto
        for (const tabDto of dto.tabs) {
            if (tabDto.isActive) {
                this._activeTabId = tabDto.id;
            }
            this._tabs.push(new ExtHostEditorTab(tabDto, this, () => this.activeTabId()));
        }
    }
    get apiObject() {
        if (!this._apiObject) {
            // Don't want to lose reference to parent `this` in the getters
            const that = this;
            const obj = {
                get isActive() {
                    // We use a getter function here to always ensure at most 1 active group and prevent iteration for being required
                    return that._dto.groupId === that._activeGroupIdGetter();
                },
                get viewColumn() {
                    return typeConverters.ViewColumn.to(that._dto.viewColumn);
                },
                get activeTab() {
                    return that._tabs.find(tab => tab.tabId === that._activeTabId)?.apiObject;
                },
                get tabs() {
                    return Object.freeze(that._tabs.map(tab => tab.apiObject));
                }
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get groupId() {
        return this._dto.groupId;
    }
    get tabs() {
        return this._tabs;
    }
    acceptGroupDtoUpdate(dto) {
        this._dto = dto;
    }
    acceptTabOperation(operation) {
        // In the open case we add the tab to the group
        if (operation.kind === 0 /* TabModelOperationKind.TAB_OPEN */) {
            const tab = new ExtHostEditorTab(operation.tabDto, this, () => this.activeTabId());
            // Insert tab at editor index
            this._tabs.splice(operation.index, 0, tab);
            if (operation.tabDto.isActive) {
                this._activeTabId = tab.tabId;
            }
            return tab;
        }
        else if (operation.kind === 1 /* TabModelOperationKind.TAB_CLOSE */) {
            const tab = this._tabs.splice(operation.index, 1)[0];
            if (!tab) {
                throw new Error(`Tab close updated received for index ${operation.index} which does not exist`);
            }
            if (tab.tabId === this._activeTabId) {
                this._activeTabId = '';
            }
            return tab;
        }
        else if (operation.kind === 3 /* TabModelOperationKind.TAB_MOVE */) {
            if (operation.oldIndex === undefined) {
                throw new Error('Invalid old index on move IPC');
            }
            // Splice to remove at old index and insert at new index === moving the tab
            const tab = this._tabs.splice(operation.oldIndex, 1)[0];
            if (!tab) {
                throw new Error(`Tab move updated received for index ${operation.oldIndex} which does not exist`);
            }
            this._tabs.splice(operation.index, 0, tab);
            return tab;
        }
        const tab = this._tabs.find(extHostTab => extHostTab.tabId === operation.tabDto.id);
        if (!tab) {
            throw new Error('INVALID tab');
        }
        if (operation.tabDto.isActive) {
            this._activeTabId = operation.tabDto.id;
        }
        else if (this._activeTabId === operation.tabDto.id && !operation.tabDto.isActive) {
            // Events aren't guaranteed to be in order so if we receive a dto that matches the active tab id
            // but isn't active we mark the active tab id as empty. This prevent onDidActiveTabChange from
            // firing incorrectly
            this._activeTabId = '';
        }
        tab.acceptDtoUpdate(operation.tabDto);
        return tab;
    }
    // Not a getter since it must be a function to be used as a callback for the tabs
    activeTabId() {
        return this._activeTabId;
    }
}
let ExtHostEditorTabs = class ExtHostEditorTabs {
    constructor(extHostRpc) {
        this._onDidChangeTabs = new Emitter();
        this._onDidChangeTabGroups = new Emitter();
        this._extHostTabGroups = [];
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadEditorTabs);
    }
    get tabGroups() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                // never changes -> simple value
                onDidChangeTabGroups: that._onDidChangeTabGroups.event,
                onDidChangeTabs: that._onDidChangeTabs.event,
                // dynamic -> getters
                get all() {
                    return Object.freeze(that._extHostTabGroups.map(group => group.apiObject));
                },
                get activeTabGroup() {
                    const activeTabGroupId = that._activeGroupId;
                    const activeTabGroup = assertReturnsDefined(that._extHostTabGroups.find(candidate => candidate.groupId === activeTabGroupId)?.apiObject);
                    return activeTabGroup;
                },
                close: async (tabOrTabGroup, preserveFocus) => {
                    const tabsOrTabGroups = Array.isArray(tabOrTabGroup) ? tabOrTabGroup : [tabOrTabGroup];
                    if (!tabsOrTabGroups.length) {
                        return true;
                    }
                    // Check which type was passed in and call the appropriate close
                    // Casting is needed as typescript doesn't seem to infer enough from this
                    if (isTabGroup(tabsOrTabGroups[0])) {
                        return this._closeGroups(tabsOrTabGroups, preserveFocus);
                    }
                    else {
                        return this._closeTabs(tabsOrTabGroups, preserveFocus);
                    }
                },
                // move: async (tab: vscode.Tab, viewColumn: ViewColumn, index: number, preserveFocus?: boolean) => {
                // 	const extHostTab = this._findExtHostTabFromApi(tab);
                // 	if (!extHostTab) {
                // 		throw new Error('Invalid tab');
                // 	}
                // 	this._proxy.$moveTab(extHostTab.tabId, index, typeConverters.ViewColumn.from(viewColumn), preserveFocus);
                // 	return;
                // }
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    $acceptEditorTabModel(tabGroups) {
        const groupIdsBefore = new Set(this._extHostTabGroups.map(group => group.groupId));
        const groupIdsAfter = new Set(tabGroups.map(dto => dto.groupId));
        const diff = diffSets(groupIdsBefore, groupIdsAfter);
        const closed = this._extHostTabGroups.filter(group => diff.removed.includes(group.groupId)).map(group => group.apiObject);
        const opened = [];
        const changed = [];
        this._extHostTabGroups = tabGroups.map(tabGroup => {
            const group = new ExtHostEditorTabGroup(tabGroup, () => this._activeGroupId);
            if (diff.added.includes(group.groupId)) {
                opened.push(group.apiObject);
            }
            else {
                changed.push(group.apiObject);
            }
            return group;
        });
        // Set the active tab group id
        const activeTabGroupId = assertReturnsDefined(tabGroups.find(group => group.isActive === true)?.groupId);
        if (activeTabGroupId !== undefined && this._activeGroupId !== activeTabGroupId) {
            this._activeGroupId = activeTabGroupId;
        }
        this._onDidChangeTabGroups.fire(Object.freeze({ opened, closed, changed }));
    }
    $acceptTabGroupUpdate(groupDto) {
        const group = this._extHostTabGroups.find(group => group.groupId === groupDto.groupId);
        if (!group) {
            throw new Error('Update Group IPC call received before group creation.');
        }
        group.acceptGroupDtoUpdate(groupDto);
        if (groupDto.isActive) {
            this._activeGroupId = groupDto.groupId;
        }
        this._onDidChangeTabGroups.fire(Object.freeze({ changed: [group.apiObject], opened: [], closed: [] }));
    }
    $acceptTabOperation(operation) {
        const group = this._extHostTabGroups.find(group => group.groupId === operation.groupId);
        if (!group) {
            throw new Error('Update Tabs IPC call received before group creation.');
        }
        const tab = group.acceptTabOperation(operation);
        // Construct the tab change event based on the operation
        switch (operation.kind) {
            case 0 /* TabModelOperationKind.TAB_OPEN */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [tab.apiObject],
                    closed: [],
                    changed: []
                }));
                return;
            case 1 /* TabModelOperationKind.TAB_CLOSE */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [],
                    closed: [tab.apiObject],
                    changed: []
                }));
                return;
            case 3 /* TabModelOperationKind.TAB_MOVE */:
            case 2 /* TabModelOperationKind.TAB_UPDATE */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [],
                    closed: [],
                    changed: [tab.apiObject]
                }));
                return;
        }
    }
    _findExtHostTabFromApi(apiTab) {
        for (const group of this._extHostTabGroups) {
            for (const tab of group.tabs) {
                if (tab.apiObject === apiTab) {
                    return tab;
                }
            }
        }
        return;
    }
    _findExtHostTabGroupFromApi(apiTabGroup) {
        return this._extHostTabGroups.find(candidate => candidate.apiObject === apiTabGroup);
    }
    async _closeTabs(tabs, preserveFocus) {
        const extHostTabIds = [];
        for (const tab of tabs) {
            const extHostTab = this._findExtHostTabFromApi(tab);
            if (!extHostTab) {
                throw new Error('Tab close: Invalid tab not found!');
            }
            extHostTabIds.push(extHostTab.tabId);
        }
        return this._proxy.$closeTab(extHostTabIds, preserveFocus);
    }
    async _closeGroups(groups, preserverFoucs) {
        const extHostGroupIds = [];
        for (const group of groups) {
            const extHostGroup = this._findExtHostTabGroupFromApi(group);
            if (!extHostGroup) {
                throw new Error('Group close: Invalid group not found!');
            }
            extHostGroupIds.push(extHostGroup.groupId);
        }
        return this._proxy.$closeGroup(extHostGroupIds, preserverFoucs);
    }
};
ExtHostEditorTabs = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostEditorTabs);
export { ExtHostEditorTabs };
//#region Utils
function isTabGroup(obj) {
    const tabGroup = obj;
    if (tabGroup.tabs !== undefined) {
        return true;
    }
    return false;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RFZGl0b3JUYWJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQThELFdBQVcsRUFBZ0YsTUFBTSx1QkFBdUIsQ0FBQztBQUM5TCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQVFsUixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG9CQUFvQixDQUFDLENBQUM7QUFJNUYsTUFBTSxnQkFBZ0I7SUFPckIsWUFBWSxHQUFrQixFQUFFLFdBQWtDLEVBQUUsaUJBQStCO1FBQ2xHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQztRQUM1QyxJ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