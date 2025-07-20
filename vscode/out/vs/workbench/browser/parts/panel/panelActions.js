/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/panelpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { isHorizontal, IWorkbenchLayoutService, positionToString } from '../../../services/layout/browser/layoutService.js';
import { IsAuxiliaryWindowContext, PanelAlignmentContext, PanelMaximizedContext, PanelPositionContext, PanelVisibleContext } from '../../../common/contextkeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
const maximizeIcon = registerIcon('panel-maximize', Codicon.screenFull, localize('maximizeIcon', 'Icon to maximize a panel.'));
export const closeIcon = registerIcon('panel-close', Codicon.close, localize('closeIcon', 'Icon to close a panel.'));
const panelIcon = registerIcon('panel-layout-icon', Codicon.layoutPanel, localize('togglePanelOffIcon', 'Icon to toggle the panel off when it is on.'));
const panelOffIcon = registerIcon('panel-layout-icon-off', Codicon.layoutPanelOff, localize('togglePanelOnIcon', 'Icon to toggle the panel on when it is off.'));
export class TogglePanelAction extends Action2 {
    static { this.ID = 'workbench.action.togglePanel'; }
    static { this.LABEL = localize2('togglePanelVisibility', "Toggle Panel Visibility"); }
    constructor() {
        super({
            id: TogglePanelAction.ID,
            title: TogglePanelAction.LABEL,
            toggled: {
                condition: PanelVisibleContext,
                title: localize('closePanel', 'Hide Panel'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'miTogglePanelMnemonic', comment: ['&& denotes a mnemonic'] }, "&&Panel"),
            },
            icon: closeIcon,
            f1: true,
            category: Categories.View,
            metadata: {
                description: localize('openAndClosePanel', 'Open/Show and Close/Hide Panel'),
            },
            keybinding: { primary: 2048 /* KeyMod.CtrlCmd */ | 40 /* KeyCode.KeyJ */, weight: 200 /* KeybindingWeight.WorkbenchContrib */ },
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 5
                }, {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 4
                }
            ]
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */), "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
}
registerAction2(TogglePanelAction);
MenuRegistry.appendMenuItem(MenuId.PanelTitle, {
    command: {
        id: TogglePanelAction.ID,
        title: localize('closePanel', 'Hide Panel'),
        icon: closeIcon
    },
    group: 'navigation',
    order: 2
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closePanel',
            title: localize2('closePanel', 'Hide Panel'),
            category: Categories.View,
            precondition: PanelVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
});
registerAction2(class extends Action2 {
    static { this.ID = 'workbench.action.focusPanel'; }
    static { this.LABEL = localize('focusPanel', "Focus into Panel"); }
    constructor() {
        super({
            id: 'workbench.action.focusPanel',
            title: localize2('focusPanel', "Focus into Panel"),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        // Show panel
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Focus into active panel
        const panel = paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        panel?.focus();
    }
});
const PositionPanelActionId = {
    LEFT: 'workbench.action.positionPanelLeft',
    RIGHT: 'workbench.action.positionPanelRight',
    BOTTOM: 'workbench.action.positionPanelBottom',
    TOP: 'workbench.action.positionPanelTop'
};
const AlignPanelActionId = {
    LEFT: 'workbench.action.alignPanelLeft',
    RIGHT: 'workbench.action.alignPanelRight',
    CENTER: 'workbench.action.alignPanelCenter',
    JUSTIFY: 'workbench.action.alignPanelJustify',
};
function createPanelActionConfig(id, title, shortLabel, value, when) {
    return {
        id,
        title,
        shortLabel,
        value,
        when,
    };
}
function createPositionPanelActionConfig(id, title, shortLabel, position) {
    return createPanelActionConfig(id, title, shortLabel, position, PanelPositionContext.notEqualsTo(positionToString(position)));
}
function createAlignmentPanelActionConfig(id, title, shortLabel, alignment) {
    return createPanelActionConfig(id, title, shortLabel, alignment, PanelAlignmentContext.notEqualsTo(alignment));
}
const PositionPanelActionConfigs = [
    createPositionPanelActionConfig(PositionPanelActionId.TOP, localize2('positionPanelTop', "Move Panel To Top"), localize('positionPanelTopShort', "Top"), 3 /* Position.TOP */),
    createPositionPanelActionConfig(PositionPanelActionId.LEFT, localize2('positionPanelLeft', "Move Panel Left"), localize('positionPanelLeftShort', "Left"), 0 /* Position.LEFT */),
    createPositionPanelActionConfig(PositionPanelActionId.RIGHT, localize2('positionPanelRight', "Move Panel Right"), localize('positionPanelRightShort', "Right"), 1 /* Position.RIGHT */),
    createPositionPanelActionConfig(PositionPanelActionId.BOTTOM, localize2('positionPanelBottom', "Move Panel To Bottom"), localize('positionPanelBottomShort', "Bottom"), 2 /* Position.BOTTOM */),
];
const AlignPanelActionConfigs = [
    createAlignmentPanelActionConfig(AlignPanelActionId.LEFT, localize2('alignPanelLeft', "Set Panel Alignment to Left"), localize('alignPanelLeftShort', "Left"), 'left'),
    createAlignmentPanelActionConfig(AlignPanelActionId.RIGHT, localize2('alignPanelRight', "Set Panel Alignment to Right"), localize('alignPanelRightShort', "Right"), 'right'),
    createAlignmentPanelActionConfig(AlignPanelActionId.CENTER, localize2('alignPanelCenter', "Set Panel Alignment to Center"), localize('alignPanelCenterShort', "Center"), 'center'),
    createAlignmentPanelActionConfig(AlignPanelActionId.JUSTIFY, localize2('alignPanelJustify', "Set Panel Alignment to Justify"), localize('alignPanelJustifyShort', "Justify"), 'justify'),
];
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelPositionMenu,
    title: localize('positionPanel', "Panel Position"),
    group: '3_workbench_layout_move',
    order: 4
});
PositionPanelActionConfigs.forEach((positionPanelAction, index) => {
    const { id, title, shortLabel, value, when } = positionPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                f1: true
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelPosition(value === undefined ? 2 /* Position.BOTTOM */ : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelPositionMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate()
        },
        order: 5 + index
    });
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelAlignmentMenu,
    title: localize('alignPanel', "Align Panel"),
    group: '3_workbench_layout_move',
    order: 5
});
AlignPanelActionConfigs.forEach(alignPanelAction => {
    const { id, title, shortLabel, value, when } = alignPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                toggled: when.negate(),
                f1: true
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelAlignment(value === undefined ? 'center' : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelAlignmentMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate()
        },
        order: 5
    });
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousPanelView',
            title: localize2('previousPanelView', "Previous Panel View"),
            category: Categories.View,
            f1: true
        }, 1 /* ViewContainerLocation.Panel */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextPanelView',
            title: localize2('nextPanelView', "Next Panel View"),
            category: Categories.View,
            f1: true
        }, 1 /* ViewContainerLocation.Panel */, 1);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleMaximizedPanel',
            title: localize2('toggleMaximizedPanel', 'Toggle Maximized Panel'),
            tooltip: localize('maximizePanel', "Maximize Panel Size"),
            category: Categories.View,
            f1: true,
            icon: maximizeIcon,
            // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
            precondition: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top'))),
            toggled: { condition: PanelMaximizedContext, icon: maximizeIcon, tooltip: localize('minimizePanel', "Restore Panel Size") },
            menu: [{
                    id: MenuId.PanelTitle,
                    group: 'navigation',
                    order: 1,
                    // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
                    when: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top')))
                }]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const notificationService = accessor.get(INotificationService);
        if (layoutService.getPanelAlignment() !== 'center' && isHorizontal(layoutService.getPanelPosition())) {
            notificationService.warn(localize('panelMaxNotSupported', "Maximizing the panel is only supported when it is center aligned."));
            return;
        }
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            // If the panel is not already maximized, maximize it
            if (!layoutService.isPanelMaximized()) {
                layoutService.toggleMaximizedPanel();
            }
        }
        else {
            layoutService.toggleMaximizedPanel();
        }
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: TogglePanelAction.ID,
                title: localize('togglePanel', "Toggle Panel"),
                icon: panelOffIcon,
                toggled: { condition: PanelVisibleContext, icon: panelIcon }
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both'))),
            order: 1
        }
    }
]);
class MoveViewsBetweenPanelsAction extends Action2 {
    constructor(source, destination, desc) {
        super(desc);
        this.source = source;
        this.destination = destination;
    }
    run(accessor, ...args) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const viewsService = accessor.get(IViewsService);
        const srcContainers = viewDescriptorService.getViewContainersByLocation(this.source);
        const destContainers = viewDescriptorService.getViewContainersByLocation(this.destination);
        if (srcContainers.length) {
            const activeViewContainer = viewsService.getVisibleViewContainer(this.source);
            srcContainers.forEach(viewContainer => viewDescriptorService.moveViewContainerToLocation(viewContainer, this.destination, undefined, this.desc.id));
            layoutService.setPartHidden(false, this.destination === 1 /* ViewContainerLocation.Panel */ ? "workbench.parts.panel" /* Parts.PANEL_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            if (activeViewContainer && destContainers.length === 0) {
                viewsService.openViewContainer(activeViewContainer.id, true);
            }
        }
    }
}
// --- Move Panel Views To Secondary Side Bar
class MovePanelToSidePanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSidePanel'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSidePanelAction.ID,
            title: localize2('movePanelToSecondarySideBar', "Move Panel Views To Secondary Side Bar"),
            category: Categories.View,
            f1: false
        });
    }
}
export class MovePanelToSecondarySideBarAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSecondarySideBar'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSecondarySideBarAction.ID,
            title: localize2('movePanelToSecondarySideBar', "Move Panel Views To Secondary Side Bar"),
            category: Categories.View,
            f1: true
        });
    }
}
registerAction2(MovePanelToSidePanelAction);
registerAction2(MovePanelToSecondarySideBarAction);
// --- Move Secondary Side Bar Views To Panel
class MoveSidePanelToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSidePanelToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSidePanelToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', "Move Secondary Side Bar Views To Panel"),
            category: Categories.View,
            f1: false
        });
    }
}
export class MoveSecondarySideBarToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSecondarySideBarToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSecondarySideBarToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', "Move Secondary Side Bar Views To Panel"),
            category: Categories.View,
            f1: true
        });
    }
}
registerAction2(MoveSidePanelToPanelAction);
registerAction2(MoveSecondarySideBarToPanelAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9wYW5lbC9wYW5lbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpELE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQW1CLE1BQU0sZ0RBQWdELENBQUM7QUFDakksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsdUJBQXVCLEVBQW1DLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0osT0FBTyxFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkssT0FBTyxFQUFFLGNBQWMsRUFBd0IsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpGLE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDckcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHaEcsT0FBTyxFQUFFLHlCQUF5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