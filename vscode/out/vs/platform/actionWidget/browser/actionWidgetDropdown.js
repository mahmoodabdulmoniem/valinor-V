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
import { IActionWidgetService } from './actionWidget.js';
import { BaseDropdown } from '../../../base/browser/ui/dropdown/dropdown.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getActiveElement, isHTMLElement } from '../../../base/browser/dom.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
/**
 * Action widget dropdown is a dropdown that uses the action widget under the hood to simulate a native dropdown menu
 * The benefits of this include non native features such as headers, descriptions, icons, and button bar
 */
let ActionWidgetDropdown = class ActionWidgetDropdown extends BaseDropdown {
    constructor(container, _options, actionWidgetService, keybindingService) {
        super(container, _options);
        this._options = _options;
        this.actionWidgetService = actionWidgetService;
        this.keybindingService = keybindingService;
    }
    show() {
        let actionBarActions = this._options.actionBarActions ?? this._options.actionBarActionProvider?.getActions() ?? [];
        const actions = this._options.actions ?? this._options.actionProvider?.getActions() ?? [];
        const actionWidgetItems = [];
        const actionsByCategory = new Map();
        for (const action of actions) {
            let category = action.category;
            if (!category) {
                category = { label: '', order: Number.MIN_SAFE_INTEGER };
            }
            if (!actionsByCategory.has(category.label)) {
                actionsByCategory.set(category.label, []);
            }
            actionsByCategory.get(category.label).push(action);
        }
        // Sort categories by order
        const sortedCategories = Array.from(actionsByCategory.entries())
            .sort((a, b) => {
            const aOrder = a[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            return aOrder - bOrder;
        });
        for (const [categoryLabel, categoryActions] of sortedCategories) {
            if (categoryLabel !== '') {
                // Push headers for each category
                actionWidgetItems.push({
                    label: categoryLabel,
                    kind: "header" /* ActionListItemKind.Header */,
                    canPreview: false,
                    disabled: false,
                    hideIcon: false,
                });
            }
            // Push actions for each category
            for (const action of categoryActions) {
                actionWidgetItems.push({
                    item: action,
                    tooltip: action.tooltip,
                    description: action.description,
                    kind: "action" /* ActionListItemKind.Action */,
                    canPreview: false,
                    group: { title: '', icon: ThemeIcon.fromId(action.checked ? Codicon.check.id : Codicon.blank.id) },
                    disabled: false,
                    hideIcon: false,
                    label: action.label,
                    keybinding: this._options.showItemKeybindings ?
                        this.keybindingService.lookupKeybinding(action.id) :
                        undefined,
                });
            }
        }
        const previouslyFocusedElement = getActiveElement();
        const actionWidgetDelegate = {
            onSelect: (action, preview) => {
                this.actionWidgetService.hide();
                action.run();
            },
            onHide: () => {
                if (isHTMLElement(previouslyFocusedElement)) {
                    previouslyFocusedElement.focus();
                }
            }
        };
        actionBarActions = actionBarActions.map(action => ({
            ...action,
            run: async (...args) => {
                this.actionWidgetService.hide();
                return action.run(...args);
            }
        }));
        const accessibilityProvider = {
            isChecked(element) {
                return element.kind === "action" /* ActionListItemKind.Action */ && !!element?.item?.checked;
            },
            getRole: (e) => e.kind === "action" /* ActionListItemKind.Action */ ? 'menuitemcheckbox' : 'separator',
            getWidgetRole: () => 'menu',
        };
        this.actionWidgetService.show(this._options.label ?? '', false, actionWidgetItems, actionWidgetDelegate, this.element, undefined, actionBarActions, accessibilityProvider);
    }
};
ActionWidgetDropdown = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IKeybindingService)
], ActionWidgetDropdown);
export { ActionWidgetDropdown };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0RHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbldpZGdldC9icm93c2VyL2FjdGlvbldpZGdldERyb3Bkb3duLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXpELE9BQU8sRUFBRSxZQUFZLEVBQXlDLE1BQU0sK0NBQStDLENBQUM7QUFFcEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUF3QjNFOzs7R0FHRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsWUFBWTtJQUNyRCxZQUNDLFNBQXNCLEVBQ0wsUUFBc0MsRUFDaEIsbUJBQXlDLEVBQzNDLGlCQUFxQztRQUUxRSxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBSlYsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7UUFDaEIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUMzQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBRzNFLENBQUM7SUFFUSxJQUFJO1FBQ1osSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ25ILE1B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