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
var NotificationsCenter_1;
import './media/notificationsCenter.css';
import './media/notificationsActions.css';
import { NOTIFICATIONS_CENTER_HEADER_FOREGROUND, NOTIFICATIONS_CENTER_HEADER_BACKGROUND, NOTIFICATIONS_CENTER_BORDER } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Emitter } from '../../../../base/common/event.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { NotificationActionRunner } from './notificationsCommands.js';
import { NotificationsList } from './notificationsList.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { $, Dimension, isAncestorOfActiveElement } from '../../../../base/browser/dom.js';
import { widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { localize } from '../../../../nls.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ClearAllNotificationsAction, ConfigureDoNotDisturbAction, ToggleDoNotDisturbBySourceAction, HideNotificationsCenterAction, ToggleDoNotDisturbAction } from './notificationsActions.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { assertReturnsAllDefined, assertReturnsDefined } from '../../../../base/common/types.js';
import { NotificationsCenterVisibleContext } from '../../../common/contextkeys.js';
import { INotificationService, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
let NotificationsCenter = class NotificationsCenter extends Themable {
    static { NotificationsCenter_1 = this; }
    static { this.MAX_DIMENSIONS = new Dimension(450, 400); }
    static { this.MAX_NOTIFICATION_SOURCES = 10; } // maximum number of notification sources to show in configure dropdown
    constructor(container, model, themeService, instantiationService, layoutService, contextKeyService, editorGroupService, keybindingService, notificationService, accessibilitySignalService, contextMenuService) {
        super(themeService);
        this.container = container;
        this.model = model;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.editorGroupService = editorGroupService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.contextMenuService = contextMenuService;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.notificationsCenterVisibleContextKey = NotificationsCenterVisibleContext.bindTo(contextKeyService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification(e => this.onDidChangeNotification(e)));
        this._register(this.layoutService.onDidLayoutMainContainer(dimension => this.layout(Dimension.lift(dimension))));
        this._register(this.notificationService.onDidChangeFilter(() => this.onDidChangeFilter()));
    }
    onDidChangeFilter() {
        if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
            this.hide(); // hide the notification center when we have a error filter enabled
        }
    }
    get isVisible() {
        return !!this._isVisible;
    }
    show() {
        if (this._isVisible) {
            const notificationsList = assertReturnsDefined(this.notificationsList);
            // Make visible
            notificationsList.show();
            // Focus first
            notificationsList.focusFirst();
            return; // already visible
        }
        // Lazily create if showing for the first time
        if (!this.notificationsCenterContainer) {
            this.create();
        }
        // Title
        this.updateTitle();
        // Make visible
        const [notificationsList, notificationsCenterContainer] = assertReturnsAllDefined(this.notificationsList, this.notificationsCenterContainer);
        this._isVisible = true;
        notificationsCenterContainer.classList.add('visible');
        notificationsList.show();
        // Layout
        this.layout(this.workbenchDimensions);
        // Show all notifications that are present now
        notificationsList.updateNotificationsList(0, 0, this.model.notifications);
        // Focus first
        notificationsList.focusFirst();
        // Theming
        this.updateStyles();
        // Mark as visible
        this.model.notifications.forEach(notification => notification.updateVisibility(true));
        // Context Key
        this.notificationsCenterVisibleContextKey.set(true);
        // Event
        this._onDidChangeVisibility.fire();
    }
    updateTitle() {
        const [notificationsCenterTitle, clearAllAction] = assertReturnsAllDefined(this.notificationsCenterTitle, this.clearAllAction);
        if (this.model.notifications.length === 0) {
            notificationsCenterTitle.textContent = localize('notificationsEmpty', "No new notifications");
            clearAllAction.enabled = false;
        }
        else {
            notificationsCenterTitle.textContent = localize('notifications', "Notifications");
            clearAllAction.enabled = this.model.notifications.some(notification => !notification.hasProgress);
        }
    }
    create() {
        // Container
        this.notificationsCenterContainer = $('.notifications-center');
        // Header
        this.notificationsCenterHeader = $('.notifications-center-header');
        this.notificationsCenterContainer.appendChild(this.notificationsCenterHeader);
        // Header Title
        this.notificationsCenterTitle = $('span.notifications-center-header-title');
        this.notificationsCenterHeader.appendChild(this.notificationsCenterTitle);
        // Header Toolbar
        const toolbarContainer = $('.notifications-center-header-toolbar');
        this.notificationsCenterHeader.appendChild(toolbarContainer);
        const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));
        const that = this;
        const notificationsToolBar = this._register(new ActionBar(toolbarContainer, {
            ariaLabel: localize('notificationsToolbar', "Notification Center Actions"),
            actionRunner,
            actionViewItemProvider: (action, options) => {
                if (action.id === ConfigureDoNotDisturbAction.ID) {
                    return this._register(this.instantiationService.createInstance(DropdownMenuActionViewItem, action, {
                        getActions() {
                            const actions = [toAction({
                                    id: ToggleDoNotDisturbAction.ID,
                                    label: that.notificationService.getFilter() === NotificationsFilter.OFF ? localize('turnOnNotifications', "Enable Do Not Disturb Mode") : localize('turnOffNotifications', "Disable Do Not Disturb Mode"),
                                    run: () => that.notificationService.setFilter(that.notificationService.getFilter() === NotificationsFilter.OFF ? NotificationsFilter.ERROR : NotificationsFilter.OFF)
                                })];
                            const sortedFilters = that.notificationService.getFilters().sort((a, b) => a.label.localeCompare(b.label));
                            for (const source of sortedFilters.slice(0, NotificationsCenter_1.MAX_NOTIFICATION_SOURCES)) {
                                if (actions.length === 1) {
                                    actions.push(new Separator());
                                }
                                actions.push(toAction({
                                    id: `${ToggleDoNotDisturbAction.ID}.${source.id}`,
                                    label: source.label,
                                    checked: source.filter !== NotificationsFilter.ERROR,
                                    run: () => that.notificationService.setFilter({
                                        ...source,
                                        filter: source.filter === NotificationsFilter.ERROR ? NotificationsFilter.OFF : NotificationsFilter.ERROR
                                    })
                                }));
                            }
                            if (sortedFilters.length > NotificationsCenter_1.MAX_NOTIFICATION_SOURCES) {
                                actions.push(new Separator());
                                actions.push(that._register(that.instantiationService.createInstance(ToggleDoNotDisturbBySourceAction, ToggleDoNotDisturbBySourceAction.ID, localize('moreSources', "More…"))));
                            }
                            return actions;
                        },
                    }, this.contextMenuService, {
                        ...options,
                        actionRunner,
                        classNames: action.class,
                        keybindingProvider: action => this.keybindingService.lookupKeybinding(action.id)
                    }));
                }
                return undefined;
            }
        }));
        this.clearAllAction = this._register(this.instantiationService.createInstance(ClearAllNotificationsAction, ClearAllNotificationsAction.ID, ClearAllNotificationsAction.LABEL));
        notificationsToolBar.push(this.clearAllAction, { icon: true, label: false, keybinding: this.getKeybindingLabel(this.clearAllAction) });
        this.configureDoNotDisturbAction = this._register(this.instantiationService.createInstance(ConfigureDoNotDisturbAction, ConfigureDoNotDisturbAction.ID, ConfigureDoNotDisturbAction.LABEL));
        notificationsToolBar.push(this.configureDoNotDisturbAction, { icon: true, label: false });
        const hideAllAction = this._register(this.instantiationService.createInstance(HideNotificationsCenterAction, HideNotificationsCenterAction.ID, HideNotificationsCenterAction.LABEL));
        notificationsToolBar.push(hideAllAction, { icon: true, label: false, keybinding: this.getKeybindingLabel(hideAllAction) });
        // Notifications List
        this.notificationsList = this.instantiationService.createInstance(NotificationsList, this.notificationsCenterContainer, {
            widgetAriaLabel: localize('notificationsCenterWidgetAriaLabel', "Notifications Center")
        });
        this.container.appendChild(this.notificationsCenterContainer);
    }
    getKeybindingLabel(action) {
        const keybinding = this.keybindingService.lookupKeybinding(action.id);
        return keybinding ? keybinding.getLabel() : null;
    }
    onDidChangeNotification(e) {
        if (!this._isVisible) {
            return; // only if visible
        }
        let focusEditor = false;
        // Update notifications list based on event kind
        const [notificationsList, notificationsCenterContainer] = assertReturnsAllDefined(this.notificationsList, this.notificationsCenterContainer);
        switch (e.kind) {
            case 0 /* NotificationChangeType.ADD */:
                notificationsList.updateNotificationsList(e.index, 0, [e.item]);
                e.item.updateVisibility(true);
                break;
            case 1 /* NotificationChangeType.CHANGE */:
                // Handle content changes
                // - actions: re-draw to properly show them
                // - message: update notification height unless collapsed
                switch (e.detail) {
                    case 2 /* NotificationViewItemContentChangeKind.ACTIONS */:
                        notificationsList.updateNotificationsList(e.index, 1, [e.item]);
                        break;
                    case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                        if (e.item.expanded) {
                            notificationsList.updateNotificationHeight(e.item);
                        }
                        break;
                }
                break;
            case 2 /* NotificationChangeType.EXPAND_COLLAPSE */:
                // Re-draw entire item when expansion changes to reveal or hide details
                notificationsList.updateNotificationsList(e.index, 1, [e.item]);
                break;
            case 3 /* NotificationChangeType.REMOVE */:
                focusEditor = isAncestorOfActiveElement(notificationsCenterContainer);
                notificationsList.updateNotificationsList(e.index, 1);
                e.item.updateVisibility(false);
                break;
        }
        // Update title
        this.updateTitle();
        // Hide if no more notifications to show
        if (this.model.notifications.length === 0) {
            this.hide();
            // Restore focus to editor group if we had focus
            if (focusEditor) {
                this.editorGroupService.activeGroup.focus();
            }
        }
    }
    hide() {
        if (!this._isVisible || !this.notificationsCenterContainer || !this.notificationsList) {
            return; // already hidden
        }
        const focusEditor = isAncestorOfActiveElement(this.notificationsCenterContainer);
        // Hide
        this._isVisible = false;
        this.notificationsCenterContainer.classList.remove('visible');
        this.notificationsList.hide();
        // Mark as hidden
        this.model.notifications.forEach(notification => notification.updateVisibility(false));
        // Context Key
        this.notificationsCenterVisibleContextKey.set(false);
        // Event
        this._onDidChangeVisibility.fire();
        // Restore focus to editor group if we had focus
        if (focusEditor) {
            this.editorGroupService.activeGroup.focus();
        }
    }
    updateStyles() {
        if (this.notificationsCenterContainer && this.notificationsCenterHeader) {
            const widgetShadowColor = this.getColor(widgetShadow);
            this.notificationsCenterContainer.style.boxShadow = widgetShadowColor ? `0 0 8px 2px ${widgetShadowColor}` : '';
            const borderColor = this.getColor(NOTIFICATIONS_CENTER_BORDER);
            this.notificationsCenterContainer.style.border = borderColor ? `1px solid ${borderColor}` : '';
            const headerForeground = this.getColor(NOTIFICATIONS_CENTER_HEADER_FOREGROUND);
            this.notificationsCenterHeader.style.color = headerForeground ?? '';
            const headerBackground = this.getColor(NOTIFICATIONS_CENTER_HEADER_BACKGROUND);
            this.notificationsCenterHeader.style.background = headerBackground ?? '';
        }
    }
    layout(dimension) {
        this.workbenchDimensions = dimension;
        if (this._isVisible && this.notificationsCenterContainer) {
            const maxWidth = NotificationsCenter_1.MAX_DIMENSIONS.width;
            const maxHeight = NotificationsCenter_1.MAX_DIMENSIONS.height;
            let availableWidth = maxWidth;
            let availableHeight = maxHeight;
            if (this.workbenchDimensions) {
                // Make sure notifications are not exceding available width
                availableWidth = this.workbenchDimensions.width;
                availableWidth -= (2 * 8); // adjust for paddings left and right
                // Make sure notifications are not exceeding available height
                availableHeight = this.workbenchDimensions.height - 35 /* header */;
                if (this.layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow)) {
                    availableHeight -= 22; // adjust for status bar
                }
                if (this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
                    availableHeight -= 22; // adjust for title bar
                }
                availableHeight -= (2 * 12); // adjust for paddings top and bottom
            }
            // Apply to list
            const notificationsList = assertReturnsDefined(this.notificationsList);
            notificationsList.layout(Math.min(maxWidth, availableWidth), Math.min(maxHeight, availableHeight));
        }
    }
    clearAll() {
        // Hide notifications center first
        this.hide();
        // Close all
        for (const notification of [...this.model.notifications] /* copy array since we modify it from closing */) {
            if (!notification.hasProgress) {
                notification.close();
            }
            this.accessibilitySignalService.playSignal(AccessibilitySignal.clear);
        }
    }
};
NotificationsCenter = NotificationsCenter_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextKeyService),
    __param(6, IEditorGroupsService),
    __param(7, IKeybindingService),
    __param(8, INotificationService),
    __param(9, IAccessibilitySignalService),
    __param(10, IContextMenuService)
], NotificationsCenter);
export { NotificationsCenter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NlbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQ2VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sa0NBQWtDLENBQUM7QUFDMUMsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLHNDQUFzQyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkosT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUU1RixPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxtREFBbUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFrQyx3QkFBd0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsU0FB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