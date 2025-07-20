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
var AuxiliaryBarPart_1;
import './media/auxiliaryBarPart.css';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ActiveAuxiliaryContext, AuxiliaryBarFocusContext } from '../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_DRAG_AND_DROP_BORDER, PANEL_INACTIVE_TITLE_FOREGROUND, SIDE_BAR_BACKGROUND, SIDE_BAR_BORDER, SIDE_BAR_TITLE_BORDER, SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { ToggleAuxiliaryBarAction } from './auxiliaryBarActions.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { ToggleSidebarPositionAction } from '../../actions/layoutActions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let AuxiliaryBarPart = class AuxiliaryBarPart extends AbstractPaneCompositePart {
    static { AuxiliaryBarPart_1 = this; }
    static { this.activeViewSettingsKey = 'workbench.auxiliarybar.activepanelid'; }
    static { this.pinnedViewsKey = 'workbench.auxiliarybar.pinnedPanels'; }
    static { this.placeholdeViewContainersKey = 'workbench.auxiliarybar.placeholderPanels'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.auxiliarybar.viewContainersWorkspaceState'; }
    get preferredHeight() {
        // Don't worry about titlebar or statusbar visibility
        // The difference is minimal and keeps this function clean
        return this.layoutService.mainContainerDimension.height * 0.4;
    }
    get preferredWidth() {
        const activeComposite = this.getActivePaneComposite();
        if (!activeComposite) {
            return;
        }
        const width = activeComposite.getOptimalWidth();
        if (typeof width !== 'number') {
            return;
        }
        return Math.max(width, 300);
    }
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, commandService, menuService, configurationService) {
        super("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, {
            hasTitle: true,
            borderWidth: () => (this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder)) ? 1 : 0,
        }, AuxiliaryBarPart_1.activeViewSettingsKey, ActiveAuxiliaryContext.bindTo(contextKeyService), AuxiliaryBarFocusContext.bindTo(contextKeyService), 'auxiliarybar', 'auxiliarybar', undefined, SIDE_BAR_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.commandService = commandService;
        this.configurationService = configurationService;
        // Use the side bar dimensions
        this.minimumWidth = 170;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
        this.configuration = this.resolveConfiguration();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                this.configuration = this.resolveConfiguration();
                this.onDidChangeActivityBarLocation();
            }
            else if (e.affectsConfiguration('workbench.secondarySideBar.showLabels')) {
                this.configuration = this.resolveConfiguration();
                this.updateCompositeBar(true);
            }
        }));
    }
    resolveConfiguration() {
        const position = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        const canShowLabels = position !== "top" /* ActivityBarPosition.TOP */; // otherwise labels would repeat vertically
        const showLabels = canShowLabels && this.configurationService.getValue('workbench.secondarySideBar.showLabels') !== false;
        return { position, canShowLabels, showLabels };
    }
    onDidChangeActivityBarLocation() {
        this.updateCompositeBar();
        const id = this.getActiveComposite()?.getId();
        if (id) {
            this.onTitleAreaUpdate(id);
        }
    }
    updateStyles() {
        super.updateStyles();
        const container = assertReturnsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        const borderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
        const isPositionLeft = this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */;
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        container.style.borderLeftColor = borderColor ?? '';
        container.style.borderRightColor = borderColor ?? '';
        container.style.borderLeftStyle = borderColor && !isPositionLeft ? 'solid' : 'none';
        container.style.borderRightStyle = borderColor && isPositionLeft ? 'solid' : 'none';
        container.style.borderLeftWidth = borderColor && !isPositionLeft ? '1px' : '0px';
        container.style.borderRightWidth = borderColor && isPositionLeft ? '1px' : '0px';
    }
    getCompositeBarOptions() {
        const $this = this;
        return {
            partContainerClass: 'auxiliarybar',
            pinnedViewContainersKey: AuxiliaryBarPart_1.pinnedViewsKey,
            placeholderViewContainersKey: AuxiliaryBarPart_1.placeholdeViewContainersKey,
            viewContainersWorkspaceStateKey: AuxiliaryBarPart_1.viewContainersWorkspaceStateKey,
            icon: !this.configuration.showLabels,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM ? 3 /* HoverPosition.ABOVE */ : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: actions => this.fillExtraContextMenuActions(actions),
            compositeSize: 0,
            iconSize: 16,
            // Add 10px spacing if the overflow action is visible to no confuse the user with ... between the toolbars
            get overflowActionSize() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? 40 : 30; },
            colors: theme => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                get activeBorderBottomColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER); },
                get activeForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND); },
                get inactiveForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND); },
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                get dragAndDropBorder() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_DRAG_AND_DROP_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER); }
            }),
            compact: true
        };
    }
    fillExtraContextMenuActions(actions) {
        const currentPositionRight = this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */;
        if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            const viewsSubmenuAction = this.getViewsSubmenuAction();
            if (viewsSubmenuAction) {
                actions.push(new Separator());
                actions.push(viewsSubmenuAction);
            }
        }
        const activityBarPositionMenu = this.menuService.getMenuActions(MenuId.ActivityBarPositionMenu, this.contextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
        const positionActions = getContextMenuActions(activityBarPositionMenu).secondary;
        const toggleShowLabelsAction = toAction({
            id: 'workbench.action.auxiliarybar.toggleShowLabels',
            label: this.configuration.showLabels ? localize('showIcons', "Show Icons") : localize('showLabels', "Show Labels"),
            enabled: this.configuration.canShowLabels,
            run: () => this.configurationService.updateValue('workbench.secondarySideBar.showLabels', !this.configuration.showLabels)
        });
        actions.push(...[
            new Separator(),
            new SubmenuAction('workbench.action.panel.position', localize('activity bar position', "Activity Bar Position"), positionActions),
            toAction({ id: ToggleSidebarPositionAction.ID, label: currentPositionRight ? localize('move second side bar left', "Move Secondary Side Bar Left") : localize('move second side bar right', "Move Secondary Side Bar Right"), run: () => this.commandService.executeCommand(ToggleSidebarPositionAction.ID) }),
            toggleShowLabelsAction,
            toAction({ id: ToggleAuxiliaryBarAction.ID, label: localize('hide second side bar', "Hide Secondary Side Bar"), run: () => this.commandService.executeCommand(ToggleAuxiliaryBarAction.ID) })
        ]);
    }
    shouldShowCompositeBar() {
        return this.configuration.position !== "hidden" /* ActivityBarPosition.HIDDEN */;
    }
    getCompositeBarPosition() {
        switch (this.configuration.position) {
            case "top" /* ActivityBarPosition.TOP */: return CompositeBarPosition.TOP;
            case "bottom" /* ActivityBarPosition.BOTTOM */: return CompositeBarPosition.BOTTOM;
            case "hidden" /* ActivityBarPosition.HIDDEN */: return CompositeBarPosition.TITLE;
            case "default" /* ActivityBarPosition.DEFAULT */: return CompositeBarPosition.TITLE;
            default: return CompositeBarPosition.TITLE;
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */
        };
    }
};
AuxiliaryBarPart = AuxiliaryBarPart_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, IContextMenuService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IKeybindingService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IViewDescriptorService),
    __param(9, IContextKeyService),
    __param(10, IExtensionService),
    __param(11, ICommandService),
    __param(12, IMenuService),
    __param(13, IConfigurationService)
], AuxiliaryBarPart);
export { AuxiliaryBarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvYXV4aWxpYXJ5YmFyL2F1eGlsaWFyeUJhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSw4QkFBOEIsRUFBRSxxQ0FBcUMsRUFBRSwyQkFBMkIsRUFBRSxvQ0FBb0MsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSwrQkFBK0IsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUs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