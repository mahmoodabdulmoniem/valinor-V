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
import { localize } from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { getFlatActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ChatEntitlement, IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
function modelDelegateToWidgetActionsProvider(delegate) {
    return {
        getActions: () => {
            return delegate.getModels().map(model => {
                return {
                    id: model.metadata.id,
                    enabled: true,
                    checked: model.metadata.id === delegate.getCurrentModel()?.metadata.id,
                    category: model.metadata.modelPickerCategory || DEFAULT_MODEL_PICKER_CATEGORY,
                    class: undefined,
                    description: model.metadata.cost,
                    tooltip: model.metadata.description ?? model.metadata.name,
                    label: model.metadata.name,
                    run: () => {
                        delegate.setModel(model);
                    }
                };
            });
        }
    };
}
function getModelPickerActionBarActions(menuService, contextKeyService, commandService, chatEntitlementService) {
    const menuActions = menuService.createMenu(MenuId.ChatModelPicker, contextKeyService);
    const menuContributions = getFlatActionBarActions(menuActions.getActions());
    menuActions.dispose();
    const additionalActions = [];
    // Add menu contributions from extensions
    if (menuContributions.length > 0) {
        additionalActions.push(...menuContributions);
    }
    // Add upgrade option if entitlement is free
    if (chatEntitlementService.entitlement === ChatEntitlement.Free) {
        additionalActions.push({
            id: 'moreModels',
            label: localize('chat.moreModels', "Add Premium Models"),
            enabled: true,
            tooltip: localize('chat.moreModels.tooltip', "Add premium models"),
            class: undefined,
            run: () => {
                const commandId = 'workbench.action.chat.upgradePlan';
                commandService.executeCommand(commandId);
            }
        });
    }
    return additionalActions;
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
let ModelPickerActionItem = class ModelPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, currentModel, delegate, actionWidgetService, menuService, contextKeyService, commandService, chatEntitlementService, keybindingService) {
        // Modify the original action with a different label and make it show the current model
        const actionWithLabel = {
            ...action,
            label: currentModel.metadata.name,
            tooltip: localize('chat.modelPicker.label', "Pick Model"),
            run: () => { }
        };
        const modelPickerActionWidgetOptions = {
            actionProvider: modelDelegateToWidgetActionsProvider(delegate),
            actionBarActions: getModelPickerActionBarActions(menuService, contextKeyService, commandService, chatEntitlementService)
        };
        super(actionWithLabel, modelPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.currentModel = currentModel;
        // Listen for model changes from the delegate
        this._register(delegate.onDidChangeModel(model => {
            this.currentModel = model;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        dom.reset(element, dom.$('span.chat-model-label', undefined, this.currentModel.metadata.name), ...renderLabelWithIcons(`$(chevron-down)`));
        this.setAriaLabelAttributes(element);
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, IChatEntitlementService),
    __param(8, IKeybindingService)
], ModelPickerActionItem);
export { ModelPickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxQaWNrZXJBY3Rpb25JdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvbW9kZWxQaWNrZXIvbW9kZWxQaWNrZXJBY3Rpb25JdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQVM5RixTQUFTLG9DQUFvQyxDQUFDLFFBQThCO0lBQzNFLE9BQU87UUFDTixVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ2hCLE9BQU8sUUFBUSxDQUFDLFNBQVMsRUFBRSxD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