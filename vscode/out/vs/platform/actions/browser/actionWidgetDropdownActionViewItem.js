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
import { $, append } from '../../../base/browser/dom.js';
import { BaseActionViewItem } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { getBaseLayerHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IActionWidgetService } from '../../actionWidget/browser/actionWidget.js';
import { ActionWidgetDropdown } from '../../actionWidget/browser/actionWidgetDropdown.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
/**
 * Action view item for the custom action widget dropdown widget.
 * Very closely based off of `DropdownMenuActionViewItem`, would be good to have some code re-use in the future
 */
let ActionWidgetDropdownActionViewItem = class ActionWidgetDropdownActionViewItem extends BaseActionViewItem {
    constructor(action, actionWidgetOptions, _actionWidgetService, _keybindingService, _contextKeyService) {
        super(undefined, action);
        this.actionWidgetOptions = actionWidgetOptions;
        this._actionWidgetService = _actionWidgetService;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.actionItem = null;
    }
    render(container) {
        this.actionItem = container;
        const labelRenderer = (el) => {
            this.element = append(el, $('a.action-label'));
            return this.renderLabel(this.element);
        };
        this.actionWidgetDropdown = this._register(new ActionWidgetDropdown(container, { ...this.actionWidgetOptions, labelRenderer }, this._actionWidgetService, this._keybindingService));
        this._register(this.actionWidgetDropdown.onDidChangeVisibility(visible => {
            this.element?.setAttribute('aria-expanded', `${visible}`);
        }));
        this.updateTooltip();
        this.updateEnabled();
    }
    renderLabel(element) {
        // todo@aeschli: remove codicon, should come through `this.options.classNames`
        element.classList.add('codicon');
        if (this._action.label) {
            this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('mouse'), element, this._action.label));
        }
        return null;
    }
    updateAriaLabel() {
        if (this.element) {
            this.setAriaLabelAttributes(this.element);
        }
    }
    setAriaLabelAttributes(element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-haspopup', 'true');
        element.setAttribute('aria-expanded', 'false');
        element.ariaLabel = (this.getTooltip() + ' - ' + (element.textContent || this._action.label)) || '';
    }
    getTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding(this.action.id, this._contextKeyService);
        const keybindingLabel = keybinding && keybinding.getLabel();
        const tooltip = this.action.tooltip ?? this.action.label;
        return keybindingLabel
            ? `${tooltip} (${keybindingLabel})`
            : tooltip;
    }
    show() {
        this.actionWidgetDropdown?.show();
    }
    updateEnabled() {
        const disabled = !this.action.enabled;
        this.actionItem?.classList.toggle('disabled', disabled);
        this.element?.classList.toggle('disabled', disabled);
    }
};
ActionWidgetDropdownActionViewItem = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService)
], ActionWidgetDropdownActionViewItem);
export { ActionWidgetDropdownActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0RHJvcGRvd25BY3Rpb25WaWV3SXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2FjdGlvbldpZGdldERyb3Bkb3duQWN0aW9uVmlld0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUzRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUdqRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQWdDLE1BQU0sb0RBQW9ELENBQUM7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFM0U7OztHQUdHO0FBQ0ksSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxrQkFBa0I7SUFHekUsWUFDQyxNQUFlLEVBQ0UsbUJBQWtGLEVBQzdFLG9CQUEyRCxFQUM3RCxrQkFBdUQsRUFDdkQsa0JBQXVEO1FBRTNFLEtBQUssQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFMUix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQStEO1FBQzVELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDNUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN0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