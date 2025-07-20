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
var ActivitybarPart_1;
import './media/activitybarpart.css';
import './media/activityaction.css';
import { localize, localize2 } from '../../../../nls.js';
import { Part } from '../../part.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ToggleSidebarPositionAction, ToggleSidebarVisibilityAction } from '../../actions/layoutActions.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ACTIVITY_BAR_BACKGROUND, ACTIVITY_BAR_BORDER, ACTIVITY_BAR_FOREGROUND, ACTIVITY_BAR_ACTIVE_BORDER, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_INACTIVE_FOREGROUND, ACTIVITY_BAR_ACTIVE_BACKGROUND, ACTIVITY_BAR_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_ACTIVE_FOCUS_BORDER } from '../../../common/theme.js';
import { activeContrastBorder, contrastBorder, focusBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { addDisposableListener, append, EventType, isAncestor, $, clearNode } from '../../../../base/browser/dom.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { CustomMenubarControl } from '../titlebar/menubarControl.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getMenuBarVisibility } from '../../../../platform/window/common/window.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { PaneCompositeBar } from '../paneCompositeBar.js';
import { GlobalCompositeBar } from '../globalCompositeBar.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IViewDescriptorService, ViewContainerLocationToString } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
let ActivitybarPart = class ActivitybarPart extends Part {
    static { ActivitybarPart_1 = this; }
    static { this.ACTION_HEIGHT = 48; }
    static { this.pinnedViewContainersKey = 'workbench.activity.pinnedViewlets2'; }
    static { this.placeholderViewContainersKey = 'workbench.activity.placeholderViewlets'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.activity.viewletsWorkspaceState'; }
    constructor(paneCompositePart, instantiationService, layoutService, themeService, storageService) {
        super("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, { hasTitle: false }, themeService, storageService, layoutService);
        this.paneCompositePart = paneCompositePart;
        this.instantiationService = instantiationService;
        //#region IView
        this.minimumWidth = 48;
        this.maximumWidth = 48;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        //#endregion
        this.compositeBar = this._register(new MutableDisposable());
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(ActivityBarCompositeBar, {
            partContainerClass: 'activitybar',
            pinnedViewContainersKey: ActivitybarPart_1.pinnedViewContainersKey,
            placeholderViewContainersKey: ActivitybarPart_1.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: ActivitybarPart_1.viewContainersWorkspaceStateKey,
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            icon: true,
            iconSize: 24,
            activityHoverOptions: {
                position: () => this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */,
            },
            preventLoopNavigation: true,
            recomputeSizes: false,
            fillExtraContextMenuActions: (actions, e) => { },
            compositeSize: 52,
            colors: (theme) => ({
                activeForegroundColor: theme.getColor(ACTIVITY_BAR_FOREGROUND),
                inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_INACTIVE_FOREGROUND),
                activeBorderColor: theme.getColor(ACTIVITY_BAR_ACTIVE_BORDER),
                activeBackground: theme.getColor(ACTIVITY_BAR_ACTIVE_BACKGROUND),
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(ACTIVITY_BAR_DRAG_AND_DROP_BORDER),
                activeBackgroundColor: undefined, inactiveBackgroundColor: undefined, activeBorderBottomColor: undefined,
            }),
            overflowActionSize: ActivitybarPart_1.ACTION_HEIGHT,
        }, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, this.paneCompositePart, true);
    }
    createContentArea(parent) {
        this.element = parent;
        this.content = append(this.element, $('.content'));
        if (this.layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
            this.show();
        }
        return this.content;
    }
    getPinnedPaneCompositeIds() {
        return this.compositeBar.value?.getPinnedPaneCompositeIds() ?? [];
    }
    getVisiblePaneCompositeIds() {
        return this.compositeBar.value?.getVisiblePaneCompositeIds() ?? [];
    }
    getPaneCompositeIds() {
        return this.compositeBar.value?.getPaneCompositeIds() ?? [];
    }
    focus() {
        this.compositeBar.value?.focus();
    }
    updateStyles() {
        super.updateStyles();
        const container = assertReturnsDefined(this.getContainer());
        const background = this.getColor(ACTIVITY_BAR_BACKGROUND) || '';
        container.style.backgroundColor = background;
        const borderColor = this.getColor(ACTIVITY_BAR_BORDER) || this.getColor(contrastBorder) || '';
        container.classList.toggle('bordered', !!borderColor);
        container.style.borderColor = borderColor ? borderColor : '';
    }
    show(focus) {
        if (!this.content) {
            return;
        }
        if (!this.compositeBar.value) {
            this.compositeBar.value = this.createCompositeBar();
            this.compositeBar.value.create(this.content);
            if (this.dimension) {
                this.layout(this.dimension.width, this.dimension.height);
            }
        }
        if (focus) {
            this.focus();
        }
    }
    hide() {
        if (!this.compositeBar.value) {
            return;
        }
        this.compositeBar.clear();
        if (this.content) {
            clearNode(this.content);
        }
    }
    layout(width, height) {
        super.layout(width, height, 0, 0);
        if (!this.compositeBar.value) {
            return;
        }
        // Layout contents
        const contentAreaSize = super.layoutContents(width, height).contentSize;
        // Layout composite bar
        this.compositeBar.value.layout(width, contentAreaSize.height);
    }
    toJSON() {
        return {
            type: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */
        };
    }
};
ActivitybarPart = ActivitybarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IWorkbenchLayoutService),
    __param(3, IThemeService),
    __param(4, IStorageService)
], ActivitybarPart);
export { ActivitybarPart };
let ActivityBarCompositeBar = class ActivityBarCompositeBar extends PaneCompositeBar {
    constructor(options, part, paneCompositePart, showGlobalActivities, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, configurationService, menuService, layoutService) {
        super({
            ...options,
            fillExtraContextMenuActions: (actions, e) => {
                options.fillExtraContextMenuActions(actions, e);
                this.fillContextMenuActions(actions, e);
            }
        }, part, paneCompositePart, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, layoutService);
        this.configurationService = configurationService;
        this.menuService = menuService;
        this.menuBar = this._register(new MutableDisposable());
        this.keyboardNavigationDisposables = this._register(new DisposableStore());
        if (showGlobalActivities) {
            this.globalCompositeBar = this._register(instantiationService.createInstance(GlobalCompositeBar, () => this.getContextMenuActions(), (theme) => this.options.colors(theme), this.options.activityHoverOptions));
        }
        // Register for configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */)) {
                if (getMenuBarVisibility(this.configurationService) === 'compact') {
                    this.installMenubar();
                }
                else {
                    this.uninstallMenubar();
                }
            }
        }));
    }
    fillContextMenuActions(actions, e) {
        // Menu
        const menuBarVisibility = getMenuBarVisibility(this.configurationService);
        if (menuBarVisibility === 'compact' || menuBarVisibility === 'hidden' || menuBarVisibility === 'toggle') {
            actions.unshift(...[toAction({ id: 'toggleMenuVisibility', label: localize('menu', "Menu"), checked: menuBarVisibility === 'compact', run: () => this.configurationService.updateValue("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */, menuBarVisibility === 'compact' ? 'toggle' : 'compact') }), new Separator()]);
        }
        if (menuBarVisibility === 'compact' && this.menuBarContainer && e?.target) {
            if (isAncestor(e.target, this.menuBarContainer)) {
                actions.unshift(...[toAction({ id: 'hideCompactMenu', label: localize('hideMenu', "Hide Menu"), run: () => this.configurationService.updateValue("window.menuBarVisibility" /* MenuSettings.MenuBarVisibility */, 'toggle') }), new Separator()]);
            }
        }
        // Global Composite Bar
        if (this.globalCompositeBar) {
            actions.push(new Separator());
            actions.push(...this.globalCompositeBar.getContextMenuActions());
        }
        actions.push(new Separator());
        actions.push(...this.getActivityBarContextMenuActions());
    }
    uninstallMenubar() {
        if (this.menuBar.value) {
            this.menuBar.value = undefined;
        }
        if (this.menuBarContainer) {
            this.menuBarContainer.remove();
            this.menuBarContainer = undefined;
        }
    }
    installMenubar() {
        if (this.menuBar.value) {
            return; // prevent menu bar from installing twice #110720
        }
        this.menuBarContainer = $('.menubar');
        const content = assertReturnsDefined(this.element);
        content.prepend(this.menuBarContainer);
        // Menubar: install a custom menu bar depending on configuration
        this.menuBar.value = this._register(this.instantiationService.createInstance(CustomMenubarControl));
        this.menuBar.value.create(this.menuBarContainer);
    }
    registerKeyboardNavigationListeners() {
        this.keyboardNavigationDisposables.clear();
        // Up/Down or Left/Right arrow on compact menu
        if (this.menuBarContainer) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.menuBarContainer, EventType.KEY_DOWN, e => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(18 /* KeyCode.DownArrow */) || kbEvent.equals(17 /* KeyCode.RightArrow */)) {
                    this.focus();
                }
            }));
        }
        // Up/Down on Activity Icons
        if (this.compositeBarContainer) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.compositeBarContainer, EventType.KEY_DOWN, e => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(18 /* KeyCode.DownArrow */) || kbEvent.equals(17 /* KeyCode.RightArrow */)) {
                    this.globalCompositeBar?.focus();
                }
                else if (kbEvent.equals(16 /* KeyCode.UpArrow */) || kbEvent.equals(15 /* KeyCode.LeftArrow */)) {
                    this.menuBar.value?.toggleFocus();
                }
            }));
        }
        // Up arrow on global icons
        if (this.globalCompositeBar) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.globalCompositeBar.element, EventType.KEY_DOWN, e => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(16 /* KeyCode.UpArrow */) || kbEvent.equals(15 /* KeyCode.LeftArrow */)) {
                    this.focus(this.getVisiblePaneCompositeIds().length - 1);
                }
            }));
        }
    }
    create(parent) {
        this.element = parent;
        // Install menubar if compact
        if (getMenuBarVisibility(this.configurationService) === 'compact') {
            this.installMenubar();
        }
        // View Containers action bar
        this.compositeBarContainer = super.create(this.element);
        // Global action bar
        if (this.globalCompositeBar) {
            this.globalCompositeBar.create(this.element);
        }
        // Keyboard Navigation
        this.registerKeyboardNavigationListeners();
        return this.compositeBarContainer;
    }
    layout(width, height) {
        if (this.menuBarContainer) {
            if (this.options.orientation === 1 /* ActionsOrientation.VERTICAL */) {
                height -= this.menuBarContainer.clientHeight;
            }
            else {
                width -= this.menuBarContainer.clientWidth;
            }
        }
        if (this.globalCompositeBar) {
            if (this.options.orientation === 1 /* ActionsOrientation.VERTICAL */) {
                height -= (this.globalCompositeBar.size() * ActivitybarPart.ACTION_HEIGHT);
            }
            else {
                width -= this.globalCompositeBar.element.clientWidth;
            }
        }
        super.layout(width, height);
    }
    getActivityBarContextMenuActions() {
        const activityBarPositionMenu = this.menuService.getMenuActions(MenuId.ActivityBarPositionMenu, this.contextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
        const positionActions = getContextMenuActions(activityBarPositionMenu).secondary;
        const actions = [
            new SubmenuAction('workbench.action.panel.position', localize('activity bar position', "Activity Bar Position"), positionActions),
            toAction({ id: ToggleSidebarPositionAction.ID, label: ToggleSidebarPositionAction.getLabel(this.layoutService), run: () => this.instantiationService.invokeFunction(accessor => new ToggleSidebarPositionAction().run(accessor)) }),
        ];
        if (this.part === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) {
            actions.push(toAction({ id: ToggleSidebarVisibilityAction.ID, label: ToggleSidebarVisibilityAction.LABEL, run: () => this.instantiationService.invokeFunction(accessor => new ToggleSidebarVisibilityAction().run(accessor)) }));
        }
        return actions;
    }
};
ActivityBarCompositeBar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, IViewDescriptorService),
    __param(8, IViewsService),
    __param(9, IContextKeyService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IConfigurationService),
    __param(12, IMenuService),
    __param(13, IWorkbenchLayoutService)
], ActivityBarCompositeBar);
export { ActivityBarCompositeBar };
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.default',
            title: {
                ...localize2('positionActivityBarDefault', 'Move Activity Bar to Side'),
                mnemonicTitle: localize({ key: 'miDefaultActivityBar', comment: ['&& denotes a mnemonic'] }, "&&Default"),
            },
            shortTitle: localize('default', "Default"),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */),
            menu: [{
                    id: MenuId.ActivityBarPositionMenu,
                    order: 1
                }, {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */),
                }]
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "default" /* ActivityBarPosition.DEFAULT */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.top',
            title: {
                ...localize2('positionActivityBarTop', 'Move Activity Bar to Top'),
                mnemonicTitle: localize({ key: 'miTopActivityBar', comment: ['&& denotes a mnemonic'] }, "&&Top"),
            },
            shortTitle: localize('top', "Top"),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "top" /* ActivityBarPosition.TOP */),
            menu: [{
                    id: MenuId.ActivityBarPositionMenu,
                    order: 2
                }, {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "top" /* ActivityBarPosition.TOP */),
                }]
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "top" /* ActivityBarPosition.TOP */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.bottom',
            title: {
                ...localize2('positionActivityBarBottom', 'Move Activity Bar to Bottom'),
                mnemonicTitle: localize({ key: 'miBottomActivityBar', comment: ['&& denotes a mnemonic'] }, "&&Bottom"),
            },
            shortTitle: localize('bottom', "Bottom"),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "bottom" /* ActivityBarPosition.BOTTOM */),
            menu: [{
                    id: MenuId.ActivityBarPositionMenu,
                    order: 3
                }, {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "bottom" /* ActivityBarPosition.BOTTOM */),
                }]
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "bottom" /* ActivityBarPosition.BOTTOM */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.hide',
            title: {
                ...localize2('hideActivityBar', 'Hide Activity Bar'),
                mnemonicTitle: localize({ key: 'miHideActivityBar', comment: ['&& denotes a mnemonic'] }, "&&Hidden"),
            },
            shortTitle: localize('hide', "Hidden"),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "hidden" /* ActivityBarPosition.HIDDEN */),
            menu: [{
                    id: MenuId.ActivityBarPositionMenu,
                    order: 4
                }, {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "hidden" /* ActivityBarPosition.HIDDEN */),
                }]
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "hidden" /* ActivityBarPosition.HIDDEN */);
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.ActivityBarPositionMenu,
    title: localize('positionActivituBar', "Activity Bar Position"),
    group: '3_workbench_layout_move',
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitleContext, {
    submenu: MenuId.ActivityBarPositionMenu,
    title: localize('positionActivituBar', "Activity Bar Position"),
    when: ContextKeyExpr.or(ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
    group: '3_workbench_layout_move',
    order: 1
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousSideBarView',
            title: localize2('previousSideBarView', 'Previous Primary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 0 /* ViewContainerLocation.Sidebar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextSideBarView',
            title: localize2('nextSideBarView', 'Next Primary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 0 /* ViewContainerLocation.Sidebar */, 1);
    }
});
registerAction2(class FocusActivityBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusActivityBar',
            title: localize2('focusActivityBar', 'Focus Activity Bar'),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
    }
});
registerThemingParticipant((theme, collector) => {
    const activityBarActiveBorderColor = theme.getColor(ACTIVITY_BAR_ACTIVE_BORDER);
    if (activityBarActiveBorderColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator:before {
				border-left-color: ${activityBarActiveBorderColor};
			}
		`);
    }
    const activityBarActiveFocusBorderColor = theme.getColor(ACTIVITY_BAR_ACTIVE_FOCUS_BORDER);
    if (activityBarActiveFocusBorderColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:focus::before {
				visibility: hidden;
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:focus .active-item-indicator:before {
				visibility: visible;
				border-left-color: ${activityBarActiveFocusBorderColor};
			}
		`);
    }
    const activityBarActiveBackgroundColor = theme.getColor(ACTIVITY_BAR_ACTIVE_BACKGROUND);
    if (activityBarActiveBackgroundColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator {
				z-index: 0;
				background-color: ${activityBarActiveBackgroundColor};
			}
		`);
    }
    // Styling with Outline color (e.g. high contrast theme)
    const outline = theme.getColor(activeContrastBorder);
    if (outline) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .action-label::before{
				padding: 6px;
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.active .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.active:hover .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:hover .action-label::before {
				outline: 1px solid ${outline};
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .action-label::before {
				outline: 1px dashed ${outline};
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .active-item-indicator:before {
				border-left-color: ${outline};
			}
		`);
    }
    // Styling without outline color
    else {
        const focusBorderColor = theme.getColor(focusBorder);
        if (focusBorderColor) {
            collector.addRule(`
				.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .active-item-indicator::before {
						border-left-color: ${focusBorderColor};
					}
				`);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHliYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9hY3Rpdml0eWJhci9hY3Rpdml0eWJhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUF1Qix1QkFBdUIsRUFBbUMsTUFBTSxtREFBbUQsQ0FBQztBQUNsSixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQWUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsZ0NBQWdDLEVBQUUsOEJBQThCLEVBQUUsaUNBQWlDLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsVixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxF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