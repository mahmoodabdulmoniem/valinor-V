/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { AuxiliaryBarMaximizedContext, AuxiliaryBarVisibleContext, IsAuxiliaryWindowContext } from '../../../common/contextkeys.js';
import { ViewContainerLocationToString } from '../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
import { closeIcon as panelCloseIcon } from '../panel/panelActions.js';
const maximizeIcon = registerIcon('auxiliarybar-maximize', Codicon.screenFull, localize('maximizeIcon', 'Icon to maximize the secondary side bar.'));
const closeIcon = registerIcon('auxiliarybar-close', panelCloseIcon, localize('closeIcon', 'Icon to close the secondary side bar.'));
const auxiliaryBarRightIcon = registerIcon('auxiliarybar-right-layout-icon', Codicon.layoutSidebarRight, localize('toggleAuxiliaryIconRight', 'Icon to toggle the secondary side bar off in its right position.'));
const auxiliaryBarRightOffIcon = registerIcon('auxiliarybar-right-off-layout-icon', Codicon.layoutSidebarRightOff, localize('toggleAuxiliaryIconRightOn', 'Icon to toggle the secondary side bar on in its right position.'));
const auxiliaryBarLeftIcon = registerIcon('auxiliarybar-left-layout-icon', Codicon.layoutSidebarLeft, localize('toggleAuxiliaryIconLeft', 'Icon to toggle the secondary side bar in its left position.'));
const auxiliaryBarLeftOffIcon = registerIcon('auxiliarybar-left-off-layout-icon', Codicon.layoutSidebarLeftOff, localize('toggleAuxiliaryIconLeftOn', 'Icon to toggle the secondary side bar on in its left position.'));
export class ToggleAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAuxiliaryBar'; }
    static { this.LABEL = localize2('toggleAuxiliaryBar', "Toggle Secondary Side Bar Visibility"); }
    constructor() {
        super({
            id: ToggleAuxiliaryBarAction.ID,
            title: ToggleAuxiliaryBarAction.LABEL,
            toggled: {
                condition: AuxiliaryBarVisibleContext,
                title: localize('closeSecondarySideBar', 'Hide Secondary Side Bar'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'miCloseSecondarySideBar', comment: ['&& denotes a mnemonic'] }, "&&Secondary Side Bar"),
            },
            icon: closeIcon,
            category: Categories.View,
            metadata: {
                description: localize('openAndCloseAuxiliaryBar', 'Open/Show and Close/Hide Secondary Side Bar'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 32 /* KeyCode.KeyB */
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 1
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 2
                }
            ]
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */), "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
}
registerAction2(ToggleAuxiliaryBarAction);
MenuRegistry.appendMenuItem(MenuId.AuxiliaryBarTitle, {
    command: {
        id: ToggleAuxiliaryBarAction.ID,
        title: localize('closeSecondarySideBar', 'Hide Secondary Side Bar'),
        icon: closeIcon
    },
    group: 'navigation',
    order: 2,
    when: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */)
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeAuxiliaryBar',
            title: localize2('closeSecondarySideBar', 'Hide Secondary Side Bar'),
            category: Categories.View,
            precondition: AuxiliaryBarVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
});
registerAction2(class FocusAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.focusAuxiliaryBar'; }
    static { this.LABEL = localize2('focusAuxiliaryBar', "Focus into Secondary Side Bar"); }
    constructor() {
        super({
            id: FocusAuxiliaryBarAction.ID,
            title: FocusAuxiliaryBarAction.LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // Show auxiliary bar
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        // Focus into active composite
        const composite = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        composite?.focus();
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', "Toggle Secondary Side Bar"),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarLeftIcon },
                icon: auxiliaryBarLeftOffIcon,
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 0
        }
    }, {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', "Toggle Secondary Side Bar"),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarRightIcon },
                icon: auxiliaryBarRightOffIcon,
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 2
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize2('hideAuxiliaryBar', 'Hide Secondary Side Bar'),
            },
            when: ContextKeyExpr.and(AuxiliaryBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 2
        }
    }
]);
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousAuxiliaryBarView',
            title: localize2('previousAuxiliaryBarView', 'Previous Secondary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextAuxiliaryBarView',
            title: localize2('nextAuxiliaryBarView', 'Next Secondary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, 1);
    }
});
// --- Maximized Mode
class MaximizeAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.maximizeAuxiliaryBar'; }
    constructor() {
        super({
            id: MaximizeAuxiliaryBar.ID,
            title: localize2('maximizeAuxiliaryBar', 'Maximize Secondary Side Bar'),
            tooltip: localize('maximizeAuxiliaryBarTooltip', "Maximize Secondary Side Bar Size"),
            category: Categories.View,
            f1: true,
            precondition: AuxiliaryBarMaximizedContext.negate(),
            icon: maximizeIcon,
            menu: {
                id: MenuId.AuxiliaryBarTitle,
                group: 'navigation',
                order: 1,
                when: AuxiliaryBarMaximizedContext.negate()
            }
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setAuxiliaryBarMaximized(true);
    }
}
registerAction2(MaximizeAuxiliaryBar);
class RestoreAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.restoreAuxiliaryBar'; }
    constructor() {
        super({
            id: RestoreAuxiliaryBar.ID,
            title: localize2('restoreAuxiliaryBar', 'Restore Secondary Side Bar'),
            tooltip: localize('restoreAuxiliaryBarTooltip', "Restore Secondary Side Bar Size"),
            category: Categories.View,
            f1: true,
            precondition: AuxiliaryBarMaximizedContext,
            toggled: AuxiliaryBarMaximizedContext,
            icon: maximizeIcon,
            menu: {
                id: MenuId.AuxiliaryBarTitle,
                group: 'navigation',
                order: 1,
                when: AuxiliaryBarMaximizedContext
            }
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setAuxiliaryBarMaximized(false);
    }
}
registerAction2(RestoreAuxiliaryBar);
class ToggleMaximizedAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.toggleMaximizedAuxiliaryBar'; }
    constructor() {
        super({
            id: ToggleMaximizedAuxiliaryBar.ID,
            title: localize2('toggleMaximizedAuxiliaryBar', 'Toggle Maximized Secondary Side Bar'),
            f1: true,
            category: Categories.View
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.toggleMaximizedAuxiliaryBar();
    }
}
registerAction2(ToggleMaximizedAuxiliaryBar);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvYXV4aWxpYXJ5YmFyL2F1eGlsaWFyeUJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BJLE9BQU8sRUFBeUIsNkJBQTZCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRyxPQUFPLEVBQXVCLHVCQUF1QixFQUF5QixNQUFNLG1EQUFtRCxDQUFDO0FBQ3hJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBSXJHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFdkUsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxVQUFVLEVB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