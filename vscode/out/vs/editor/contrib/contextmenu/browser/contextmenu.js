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
var ContextMenuController_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { IMenuService, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, isStandaloneEditorWorkspace } from '../../../../platform/workspace/common/workspace.js';
let ContextMenuController = class ContextMenuController {
    static { ContextMenuController_1 = this; }
    static { this.ID = 'editor.contrib.contextmenu'; }
    static get(editor) {
        return editor.getContribution(ContextMenuController_1.ID);
    }
    constructor(editor, _contextMenuService, _contextViewService, _contextKeyService, _keybindingService, _menuService, _configurationService, _workspaceContextService) {
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._toDispose = new DisposableStore();
        this._contextMenuIsBeingShownCount = 0;
        this._editor = editor;
        this._toDispose.add(this._editor.onContextMenu((e) => this._onContextMenu(e)));
        this._toDispose.add(this._editor.onMouseWheel((e) => {
            if (this._contextMenuIsBeingShownCount > 0) {
                const view = this._contextViewService.getContextViewElement();
                const target = e.srcElement;
                // Event triggers on shadow root host first
                // Check if the context view is under this host before hiding it #103169
                if (!(target.shadowRoot && dom.getShadowRoot(view) === target.shadowRoot)) {
                    this._contextViewService.hideContextView();
                }
            }
        }));
        this._toDispose.add(this._editor.onKeyDown((e) => {
            if (!this._editor.getOption(30 /* EditorOption.contextmenu */)) {
                return; // Context menu is turned off through configuration
            }
            if (e.keyCode === 58 /* KeyCode.ContextMenu */) {
                // Chrome is funny like that
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu();
            }
        }));
    }
    _onContextMenu(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._editor.getOption(30 /* EditorOption.contextmenu */)) {
            this._editor.focus();
            // Ensure the cursor is at the position of the mouse click
            if (e.target.position && !this._editor.getSelection().containsPosition(e.target.position)) {
                this._editor.setPosition(e.target.position);
            }
            return; // Context menu is turned off through configuration
        }
        if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
            return; // allow native menu on widgets to support right click on input field for example in find
        }
        if (e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.detail.injectedText) {
            return; // allow native menu on injected text
        }
        e.event.preventDefault();
        e.event.stopPropagation();
        if (e.target.type === 11 /* MouseTargetType.SCROLLBAR */) {
            return this._showScrollbarContextMenu(e.event);
        }
        if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.type !== 7 /* MouseTargetType.CONTENT_EMPTY */ && e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            return; // only support mouse click into text or native context menu key for now
        }
        // Ensure the editor gets focus if it hasn't, so the right events are being sent to other contributions
        this._editor.focus();
        // Ensure the cursor is at the position of the mouse click
        if (e.target.position) {
            let hasSelectionAtPosition = false;
            for (const selection of this._editor.getSelections()) {
                if (selection.containsPosition(e.target.position)) {
                    hasSelectionAtPosition = true;
                    break;
                }
            }
            if (!hasSelectionAtPosition) {
                this._editor.setPosition(e.target.position);
            }
        }
        // Unless the user triggerd the context menu through Shift+F10, use the mouse position as menu position
        let anchor = null;
        if (e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            anchor = e.event;
        }
        // Show the context menu
        this.showContextMenu(anchor);
    }
    showContextMenu(anchor) {
        if (!this._editor.getOption(30 /* EditorOption.contextmenu */)) {
            return; // Context menu is turned off through configuration
        }
        if (!this._editor.hasModel()) {
            return;
        }
        // Find actions available for menu
        const menuActions = this._getMenuActions(this._editor.getModel(), this._editor.contextMenuId);
        // Show menu if we have actions to show
        if (menuActions.length > 0) {
            this._doShowContextMenu(menuActions, anchor);
        }
    }
    _getMenuActions(model, menuId) {
        const result = [];
        // get menu groups
        const groups = this._menuService.getMenuActions(menuId, this._contextKeyService, { arg: model.uri });
        // translate them into other actions
        for (const group of groups) {
            const [, actions] = group;
            let addedItems = 0;
            for (const action of actions) {
                if (action instanceof SubmenuItemAction) {
                    const subActions = this._getMenuActions(model, action.item.submenu);
                    if (subActions.length > 0) {
                        result.push(new SubmenuAction(action.id, action.label, subActions));
                        addedItems++;
                    }
                }
                else {
                    result.push(action);
                    addedItems++;
                }
            }
            if (addedItems) {
                result.push(new Separator());
            }
        }
        if (result.length) {
            result.pop(); // remove last separator
        }
        return result;
    }
    _doShowContextMenu(actions, event = null) {
        if (!this._editor.hasModel()) {
            return;
        }
        let anchor = event;
        if (!anchor) {
            // Ensure selection is visible
            this._editor.revealPosition(this._editor.getPosition(), 1 /* ScrollType.Immediate */);
            this._editor.render();
            const cursorCoords = this._editor.getScrolledVisiblePosition(this._editor.getPosition());
            // Translate to absolute editor position
            const editorCoords = dom.getDomNodePagePosition(this._editor.getDomNode());
            const posx = editorCoords.left + cursorCoords.left;
            const posy = editorCoords.top + cursorCoords.top + cursorCoords.height;
            anchor = { x: posx, y: posy };
        }
        const useShadowDOM = this._editor.getOption(143 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        // Show menu
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? this._editor.getOverflowWidgetsDomNode() ?? this._editor.getDomNode() : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this._keybindingFor(action);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel(), isMenu: true });
                }
                const customActionViewItem = action;
                if (typeof customActionViewItem.getActionViewItem === 'function') {
                    return customActionViewItem.getActionViewItem();
                }
                return new ActionViewItem(action, action, { icon: true, label: true, isMenu: true });
            },
            getKeyBinding: (action) => {
                return this._keybindingFor(action);
            },
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
            }
        });
    }
    _showScrollbarContextMenu(anchor) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (isStandaloneEditorWorkspace(this._workspaceContextService.getWorkspace())) {
            // can't update the configuration properly in the standalone editor
            return;
        }
        const minimapOptions = this._editor.getOption(81 /* EditorOption.minimap */);
        let lastId = 0;
        const createAction = (opts) => {
            return {
                id: `menu-action-${++lastId}`,
                label: opts.label,
                tooltip: '',
                class: undefined,
                enabled: (typeof opts.enabled === 'undefined' ? true : opts.enabled),
                checked: opts.checked,
                run: opts.run
            };
        };
        const createSubmenuAction = (label, actions) => {
            return new SubmenuAction(`menu-action-${++lastId}`, label, actions, undefined);
        };
        const createEnumAction = (label, enabled, configName, configuredValue, options) => {
            if (!enabled) {
                return createAction({ label, enabled, run: () => { } });
            }
            const createRunner = (value) => {
                return () => {
                    this._configurationService.updateValue(configName, value);
                };
            };
            const actions = [];
            for (const option of options) {
                actions.push(createAction({
                    label: option.label,
                    checked: configuredValue === option.value,
                    run: createRunner(option.value)
                }));
            }
            return createSubmenuAction(label, actions);
        };
        const actions = [];
        actions.push(createAction({
            label: nls.localize('context.minimap.minimap', "Minimap"),
            checked: minimapOptions.enabled,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.enabled`, !minimapOptions.enabled);
            }
        }));
        actions.push(new Separator());
        actions.push(createAction({
            label: nls.localize('context.minimap.renderCharacters', "Render Characters"),
            enabled: minimapOptions.enabled,
            checked: minimapOptions.renderCharacters,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.renderCharacters`, !minimapOptions.renderCharacters);
            }
        }));
        actions.push(createEnumAction(nls.localize('context.minimap.size', "Vertical size"), minimapOptions.enabled, 'editor.minimap.size', minimapOptions.size, [{
                label: nls.localize('context.minimap.size.proportional', "Proportional"),
                value: 'proportional'
            }, {
                label: nls.localize('context.minimap.size.fill', "Fill"),
                value: 'fill'
            }, {
                label: nls.localize('context.minimap.size.fit', "Fit"),
                value: 'fit'
            }]));
        actions.push(createEnumAction(nls.localize('context.minimap.slider', "Slider"), minimapOptions.enabled, 'editor.minimap.showSlider', minimapOptions.showSlider, [{
                label: nls.localize('context.minimap.slider.mouseover', "Mouse Over"),
                value: 'mouseover'
            }, {
                label: nls.localize('context.minimap.slider.always', "Always"),
                value: 'always'
            }]));
        const useShadowDOM = this._editor.getOption(143 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? this._editor.getDomNode() : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
                this._editor.focus();
            }
        });
    }
    _keybindingFor(action) {
        return this._keybindingService.lookupKeybinding(action.id);
    }
    dispose() {
        if (this._contextMenuIsBeingShownCount > 0) {
            this._contextViewService.hideContextView();
        }
        this._toDispose.dispose();
    }
};
ContextMenuController = ContextMenuController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IMenuService),
    __param(6, IConfigurationService),
    __param(7, IWorkspaceContextService)
], ContextMenuController);
export { ContextMenuController };
class ShowContextMenu extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.showContextMenu',
            label: nls.localize2('action.showContextMenu.label', "Show Editor Context Menu"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 1024 /* KeyMod.Shift */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        ContextMenuController.get(editor)?.showContextMenu();
    }
}
registerEditorContribution(ContextMenuController.ID, ContextMenuController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(ShowContextMenu);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbnRleHRtZW51L2Jyb3dzZXIvY29udGV4dG1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFHdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTFGLE9BQU8sRUFBVyxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsWUFBWSxFQUFtQyxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUd6SyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQVUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvREFBb0Qs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