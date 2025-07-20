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
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { autorun } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { getFlatActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { IChatModeService } from '../../common/chatModes.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { getOpenChatActionIdForMode } from '../actions/chatActions.js';
let ModePickerActionItem = class ModePickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, delegate, actionWidgetService, chatAgentService, keybindingService, contextKeyService, chatModeService, menuService) {
        const makeAction = (mode, currentMode) => ({
            ...action,
            id: getOpenChatActionIdForMode(mode),
            label: mode.name,
            class: undefined,
            enabled: true,
            checked: currentMode.id === mode.id,
            tooltip: chatAgentService.getDefaultAgent(ChatAgentLocation.Panel, mode.kind)?.description ?? action.tooltip,
            run: async () => {
                const result = await action.run({ modeId: mode.id });
                this.renderLabel(this.element);
                return result;
            },
            category: { label: localize('built-in', "Built-In"), order: 0 }
        });
        const makeActionFromCustomMode = (mode, currentMode) => ({
            ...action,
            id: getOpenChatActionIdForMode(mode),
            label: mode.name,
            class: undefined,
            enabled: true,
            checked: currentMode.id === mode.id,
            tooltip: mode.description.get() ?? chatAgentService.getDefaultAgent(ChatAgentLocation.Panel, mode.kind)?.description ?? action.tooltip,
            run: async () => {
                const result = await action.run({ modeId: mode.id });
                this.renderLabel(this.element);
                return result;
            },
            category: { label: localize('custom', "Custom"), order: 1 }
        });
        const actionProvider = {
            getActions: () => {
                const modes = chatModeService.getModes();
                const currentMode = delegate.currentMode.get();
                const agentStateActions = modes.builtin.map(mode => makeAction(mode, currentMode));
                if (modes.custom) {
                    agentStateActions.push(...modes.custom.map(mode => makeActionFromCustomMode(mode, currentMode)));
                }
                return agentStateActions;
            }
        };
        const modePickerActionWidgetOptions = {
            actionProvider,
            actionBarActionProvider: {
                getActions: () => this.getModePickerActionBarActions()
            },
            showItemKeybindings: true
        };
        super(action, modePickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.delegate = delegate;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        // Listen to changes in the current mode and its properties
        this._register(autorun(reader => {
            this.renderLabel(this.element, this.delegate.currentMode.read(reader));
        }));
    }
    getModePickerActionBarActions() {
        const menuActions = this.menuService.createMenu(MenuId.ChatModePicker, this.contextKeyService);
        const menuContributions = getFlatActionBarActions(menuActions.getActions({ renderShortTitle: true }));
        menuActions.dispose();
        return menuContributions;
    }
    renderLabel(element, mode = this.delegate.currentMode.get()) {
        if (!this.element) {
            return null;
        }
        this.setAriaLabelAttributes(element);
        const state = this.delegate.currentMode.get().name;
        dom.reset(element, dom.$('span.chat-model-label', undefined, state), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModePickerActionItem = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IChatAgentService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, IChatModeService),
    __param(7, IMenuService)
], ModePickerActionItem);
export { ModePickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZVBpY2tlckFjdGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9tb2RlbFBpY2tlci9tb2RlUGlja2VyQWN0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRzlGLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDbkksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDN0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQWtCLE1BQU0sbURBQW1ELENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDL0QsT0FBTyxFQUFhLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDOUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFPaEUsSUFBTSxvQkFBb0Is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