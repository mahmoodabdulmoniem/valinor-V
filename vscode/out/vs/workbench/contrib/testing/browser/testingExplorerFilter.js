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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextScopedSuggestEnabledInputWithHistory } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { testingFilterIcon } from './icons.js';
import { StoredValue } from '../common/storedValue.js';
import { ITestExplorerFilterState } from '../common/testExplorerFilterState.js';
import { ITestService } from '../common/testService.js';
import { denamespaceTestTag } from '../common/testTypes.js';
const testFilterDescriptions = {
    ["@failed" /* TestFilterTerm.Failed */]: localize('testing.filters.showOnlyFailed', "Show Only Failed Tests"),
    ["@executed" /* TestFilterTerm.Executed */]: localize('testing.filters.showOnlyExecuted', "Show Only Executed Tests"),
    ["@doc" /* TestFilterTerm.CurrentDoc */]: localize('testing.filters.currentFile', "Show in Active File Only"),
    ["@openedFiles" /* TestFilterTerm.OpenedFiles */]: localize('testing.filters.openedFiles', "Show in Opened Files Only"),
    ["@hidden" /* TestFilterTerm.Hidden */]: localize('testing.filters.showExcludedTests', "Show Hidden Tests"),
};
let TestingExplorerFilter = class TestingExplorerFilter extends BaseActionViewItem {
    constructor(action, options, state, instantiationService, testService) {
        super(null, action, options);
        this.state = state;
        this.instantiationService = instantiationService;
        this.testService = testService;
        this.focusEmitter = this._register(new Emitter());
        this.onDidFocus = this.focusEmitter.event;
        this.filtersAction = new Action('markersFiltersAction', localize('testing.filters.menu', "More Filters..."), 'testing-filter-button ' + ThemeIcon.asClassName(testingFilterIcon));
        this.history = this._register(instantiationService.createInstance(StoredValue, {
            key: 'testing.filterHistory2',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */
        }));
        this.updateFilterActiveState();
        this._register(testService.excluded.onTestExclusionsChanged(this.updateFilterActiveState, this));
    }
    /**
     * @override
     */
    render(container) {
        container.classList.add('testing-filter-action-item');
        const updateDelayer = this._register(new Delayer(400));
        const wrapper = this.wrapper = dom.$('.testing-filter-wrapper');
        container.appendChild(wrapper);
        let history = this.history.get({ lastValue: '', values: [] });
        if (history instanceof Array) {
            history = { lastValue: '', values: history };
        }
        if (history.lastValue) {
            this.state.setText(history.lastValue);
        }
        const input = this.input = this._register(this.instantiationService.createInstance(ContextScopedSuggestEnabledInputWithHistory, {
            id: 'testing.explorer.filter',
            ariaLabel: localize('testExplorerFilterLabel', "Filter text for tests in the explorer"),
            parent: wrapper,
            suggestionProvider: {
                triggerCharacters: ['@'],
                provideResults: () => [
                    ...Object.entries(testFilterDescriptions).map(([label, detail]) => ({ label, detail })),
                    ...Iterable.map(this.testService.collection.tags.values(), tag => {
                        const { ctrlId, tagId } = denamespaceTestTag(tag.id);
                        const insertText = `@${ctrlId}:${tagId}`;
                        return ({
                            label: `@${ctrlId}:${tagId}`,
                            detail: this.testService.collection.getNodeById(ctrlId)?.item.label,
                            insertText: tagId.includes(' ') ? `@${ctrlId}:"${tagId.replace(/(["\\])/g, '\\$1')}"` : insertText,
                        });
                    }),
                ].filter(r => !this.state.text.value.includes(r.label)),
            },
            resourceHandle: 'testing:filter',
            suggestOptions: {
                value: this.state.text.value,
                placeholderText: localize('testExplorerFilter', "Filter (e.g. text, !exclude, @tag)"),
            },
            history: history.values
        }));
        this._register(this.state.text.onDidChange(newValue => {
            if (input.getValue() !== newValue) {
                input.setValue(newValue);
            }
        }));
        this._register(this.state.onDidRequestInputFocus(() => {
            input.focus();
        }));
        this._register(input.onDidFocus(() => {
            this.focusEmitter.fire();
        }));
        this._register(input.onInputDidChange(() => updateDelayer.trigger(() => {
            input.addToHistory();
            this.state.setText(input.getValue());
        })));
        const actionbar = this._register(new ActionBar(container, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this.filtersAction.id) {
                    return this.instantiationService.createInstance(FiltersDropdownMenuActionViewItem, action, options, this.state, this.actionRunner);
                }
                return undefined;
            },
        }));
        actionbar.push(this.filtersAction, { icon: true, label: false });
        this.layout(this.wrapper.clientWidth);
    }
    layout(width) {
        this.input.layout(new dom.Dimension(width - /* horizontal padding */ 24 - /* editor padding */ 8 - /* filter button padding */ 22, 20));
    }
    /**
     * Focuses the filter input.
     */
    focus() {
        this.input.focus();
    }
    /**
     * Persists changes to the input history.
     */
    saveState() {
        this.history.store({ lastValue: this.input.getValue(), values: this.input.getHistory() });
    }
    /**
     * @override
     */
    dispose() {
        this.saveState();
        super.dispose();
    }
    /**
     * Updates the 'checked' state of the filter submenu.
     */
    updateFilterActiveState() {
        this.filtersAction.checked = this.testService.excluded.hasAny;
    }
};
TestingExplorerFilter = __decorate([
    __param(2, ITestExplorerFilterState),
    __param(3, IInstantiationService),
    __param(4, ITestService)
], TestingExplorerFilter);
export { TestingExplorerFilter };
let FiltersDropdownMenuActionViewItem = class FiltersDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, filters, actionRunner, contextMenuService, testService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.filters = filters;
        this.testService = testService;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
    getActions() {
        return [
            ...["@failed" /* TestFilterTerm.Failed */, "@executed" /* TestFilterTerm.Executed */, "@doc" /* TestFilterTerm.CurrentDoc */, "@openedFiles" /* TestFilterTerm.OpenedFiles */].map(term => ({
                checked: this.filters.isFilteringFor(term),
                class: undefined,
                enabled: true,
                id: term,
                label: testFilterDescriptions[term],
                run: () => this.filters.toggleFilteringFor(term),
                tooltip: '',
                dispose: () => null
            })),
            new Separator(),
            {
                checked: this.filters.fuzzy.value,
                class: undefined,
                enabled: true,
                id: 'fuzzy',
                label: localize('testing.filters.fuzzyMatch', "Fuzzy Match"),
                run: () => this.filters.fuzzy.value = !this.filters.fuzzy.value,
                tooltip: ''
            },
            new Separator(),
            {
                checked: this.filters.isFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'showExcluded',
                label: localize('testing.filters.showExcludedTests', "Show Hidden Tests"),
                run: () => this.filters.toggleFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                tooltip: ''
            },
            {
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'removeExcluded',
                label: localize('testing.filters.removeTestExclusions', "Unhide All Tests"),
                run: async () => this.testService.excluded.clear(),
                tooltip: ''
            }
        ];
    }
    updateChecked() {
        this.element.classList.toggle('checked', this._action.checked);
    }
};
FiltersDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService),
    __param(5, ITestService)
], FiltersDropdownMenuActionViewItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0V4cGxvcmVyRmlsdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZ0V4cGxvcmVyRmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBc0QsTUFBTSwwREFBMEQsQ0FBQztBQUVsSixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsTUFBTSxFQUEwQixTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBMEQsTUFBTSxxRUFBcUUsQ0FBQztBQUMxTCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBC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