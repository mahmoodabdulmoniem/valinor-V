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
import { ButtonBar } from '../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ActionRunner, SubmenuAction } from '../../../base/common/actions.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { localize } from '../../../nls.js';
import { getActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService, MenuItemAction } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IContextMenuService } from '../../contextview/browser/contextView.js';
import { IHoverService } from '../../hover/browser/hover.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
let WorkbenchButtonBar = class WorkbenchButtonBar extends ButtonBar {
    constructor(container, _options, _contextMenuService, _keybindingService, telemetryService, _hoverService) {
        super(container);
        this._options = _options;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._store = new DisposableStore();
        this._updateStore = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._actionRunner = this._store.add(new ActionRunner());
        if (_options?.telemetrySource) {
            this._actionRunner.onDidRun(e => {
                telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: _options.telemetrySource });
            }, undefined, this._store);
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateStore.dispose();
        this._store.dispose();
        super.dispose();
    }
    update(actions, secondary) {
        const conifgProvider = this._options?.buttonConfigProvider ?? (() => ({ showLabel: true }));
        this._updateStore.clear();
        this.clear();
        // Support instamt hover between buttons
        const hoverDelegate = this._updateStore.add(createInstantHoverDelegate());
        for (let i = 0; i < actions.length; i++) {
            const secondary = i > 0;
            const actionOrSubmenu = actions[i];
            let action;
            let btn;
            let tooltip = '';
            const kb = actionOrSubmenu instanceof SubmenuAction ? '' : this._keybindingService.lookupKeybinding(actionOrSubmenu.id);
            if (kb) {
                tooltip = localize('labelWithKeybinding', "{0} ({1})", actionOrSubmenu.tooltip || actionOrSubmenu.label, kb.getLabel());
            }
            else {
                tooltip = actionOrSubmenu.tooltip || actionOrSubmenu.label;
            }
            if (actionOrSubmenu instanceof SubmenuAction && actionOrSubmenu.actions.length > 0) {
                const [first, ...rest] = actionOrSubmenu.actions;
                action = first;
                btn = this.addButtonWithDropdown({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    actionRunner: this._actionRunner,
                    actions: rest,
                    contextMenuProvider: this._contextMenuService,
                    ariaLabel: tooltip,
                    supportIcons: true,
                });
            }
            else {
                action = actionOrSubmenu;
                btn = this.addButton({
                    secondary: conifgProvider(action, i)?.isSecondary ?? secondary,
                    ariaLabel: tooltip,
                    supportIcons: true,
                });
            }
            btn.enabled = action.enabled;
            btn.checked = action.checked ?? false;
            btn.element.classList.add('default-colors');
            const showLabel = conifgProvider(action, i)?.showLabel ?? true;
            if (showLabel) {
                btn.label = action.label;
            }
            else {
                btn.element.classList.add('monaco-text-button');
            }
            if (conifgProvider(action, i)?.showIcon) {
                if (action instanceof MenuItemAction && ThemeIcon.isThemeIcon(action.item.icon)) {
                    if (!showLabel) {
                        btn.icon = action.item.icon;
                    }
                    else {
                        // this is REALLY hacky but combining a codicon and normal text is ugly because
                        // the former define a font which doesn't work for text
                        btn.label = `$(${action.item.icon.id}) ${action.label}`;
                    }
                }
                else if (action.class) {
                    btn.element.classList.add(...action.class.split(' '));
                }
            }
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, tooltip));
            this._updateStore.add(btn.onDidClick(async () => {
                this._actionRunner.run(action);
            }));
        }
        if (secondary.length > 0) {
            const btn = this.addButton({
                secondary: true,
                ariaLabel: localize('moreActions', "More Actions")
            });
            btn.icon = Codicon.dropDownButton;
            btn.element.classList.add('default-colors', 'monaco-text-button');
            btn.enabled = true;
            this._updateStore.add(this._hoverService.setupManagedHover(hoverDelegate, btn.element, localize('moreActions', "More Actions")));
            this._updateStore.add(btn.onDidClick(async () => {
                this._contextMenuService.showContextMenu({
                    getAnchor: () => btn.element,
                    getActions: () => secondary,
                    actionRunner: this._actionRunner,
                    onHide: () => btn.element.setAttribute('aria-expanded', 'false')
                });
                btn.element.setAttribute('aria-expanded', 'true');
            }));
        }
        this._onDidChange.fire(this);
    }
};
WorkbenchButtonBar = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ITelemetryService),
    __param(5, IHoverService)
], WorkbenchButtonBar);
export { WorkbenchButtonBar };
let MenuWorkbenchButtonBar = class MenuWorkbenchButtonBar extends WorkbenchButtonBar {
    constructor(container, menuId, options, menuService, contextKeyService, contextMenuService, keybindingService, telemetryService, hoverService) {
        super(container, options, contextMenuService, keybindingService, telemetryService, hoverService);
        const menu = menuService.createMenu(menuId, contextKeyService);
        this._store.add(menu);
        const update = () => {
            this.clear();
            const actions = getActionBarActions(menu.getActions(options?.menuOptions), options?.toolbarOptions?.primaryGroup);
            super.update(actions.primary, actions.secondary);
        };
        this._store.add(menu.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    update(_actions) {
        throw new Error('Use Menu or WorkbenchButtonBar');
    }
};
MenuWorkbenchButtonBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ITelemetryService),
    __param(8, IHoverService)
], MenuWorkbenchButtonBar);
export { MenuWorkbenchButtonBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvYnV0dG9uYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQVcsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsWUFBWSxFQUEwQixhQUFhLEVBQXVFLE1BQU0saUNBQWlDLENBQUM7QUFDM0ssT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVuRSxPQUFPLEVBQVUsWUFBWSxFQUFFLGNBQWMsRUFBc0IsTUFBTSxzQkFBc0IsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFhakUs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