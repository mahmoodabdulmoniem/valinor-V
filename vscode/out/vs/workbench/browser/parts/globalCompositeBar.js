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
var GlobalCompositeBar_1;
import { localize } from '../../../nls.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../common/activity.js';
import { IActivityService } from '../../services/activity/common/activity.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, Disposable } from '../../../base/common/lifecycle.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { CompositeBarActionViewItem, CompositeBarAction } from './compositeBarActions.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { Action, Separator, SubmenuAction, toAction } from '../../../base/common/actions.js';
import { IMenuService, MenuId } from '../../../platform/actions/common/actions.js';
import { addDisposableListener, EventType, append, clearNode, hide, show, EventHelper, $, runWhenWindowIdle, getWindow } from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { EventType as TouchEventType } from '../../../base/browser/touch.js';
import { Lazy } from '../../../base/common/lazy.js';
import { getActionBarActions } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../platform/secrets/common/secrets.js';
import { getCurrentAuthenticationSessionInfo } from '../../services/authentication/browser/authenticationService.js';
import { IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { DEFAULT_ICON } from '../../services/userDataProfile/common/userDataProfileIcons.js';
import { isString } from '../../../base/common/types.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND } from '../../common/theme.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
let GlobalCompositeBar = class GlobalCompositeBar extends Disposable {
    static { GlobalCompositeBar_1 = this; }
    static { this.ACCOUNTS_ACTION_INDEX = 0; }
    static { this.ACCOUNTS_ICON = registerIcon('accounts-view-bar-icon', Codicon.account, localize('accountsViewBarIcon', "Accounts icon in the view bar.")); }
    constructor(contextMenuActionsProvider, colors, activityHoverOptions, configurationService, instantiationService, storageService, extensionService) {
        super();
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.colors = colors;
        this.activityHoverOptions = activityHoverOptions;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.globalActivityAction = this._register(new Action(GLOBAL_ACTIVITY_ID));
        this.accountAction = this._register(new Action(ACCOUNTS_ACTIVITY_ID));
        this.element = $('div');
        const contextMenuAlignmentOptions = () => ({
            anchorAlignment: configurationService.getValue('workbench.sideBar.location') === 'left' ? 1 /* AnchorAlignment.RIGHT */ : 0 /* AnchorAlignment.LEFT */,
            anchorAxisAlignment: 1 /* AnchorAxisAlignment.HORIZONTAL */
        });
        this.globalActivityActionBar = this._register(new ActionBar(this.element, {
            actionViewItemProvider: (action, options) => {
                if (action.id === GLOBAL_ACTIVITY_ID) {
                    return this.instantiationService.createInstance(GlobalActivityActionViewItem, this.contextMenuActionsProvider, { ...options, colors: this.colors, hoverOptions: this.activityHoverOptions }, contextMenuAlignmentOptions);
                }
                if (action.id === ACCOUNTS_ACTIVITY_ID) {
                    return this.instantiationService.createInstance(AccountsActivityActionViewItem, this.contextMenuActionsProvider, {
                        ...options,
                        colors: this.colors,
                        hoverOptions: this.activityHoverOptions
                    }, contextMenuAlignmentOptions, (actions) => {
                        actions.unshift(...[
                            toAction({ id: 'hideAccounts', label: localize('hideAccounts', "Hide Accounts"), run: () => setAccountsActionVisible(storageService, false) }),
                            new Separator()
                        ]);
                    });
                }
                throw new Error(`No view item for action '${action.id}'`);
            },
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            ariaLabel: localize('manage', "Manage"),
            preventLoopNavigation: true
        }));
        if (this.accountsVisibilityPreference) {
            this.globalActivityActionBar.push(this.accountAction, { index: GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX });
        }
        this.globalActivityActionBar.push(this.globalActivityAction);
        this.registerListeners();
    }
    registerListeners() {
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            if (!this._store.isDisposed) {
                this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, this._store)(() => this.toggleAccountsActivity()));
            }
        });
    }
    create(parent) {
        parent.appendChild(this.element);
    }
    focus() {
        this.globalActivityActionBar.focus(true);
    }
    size() {
        return this.globalActivityActionBar.viewItems.length;
    }
    getContextMenuActions() {
        return [toAction({ id: 'toggleAccountsVisibility', label: localize('accounts', "Accounts"), checked: this.accountsVisibilityPreference, run: () => this.accountsVisibilityPreference = !this.accountsVisibilityPreference })];
    }
    toggleAccountsActivity() {
        if (this.globalActivityActionBar.length() === 2 && this.accountsVisibilityPreference) {
            return;
        }
        if (this.globalActivityActionBar.length() === 2) {
            this.globalActivityActionBar.pull(GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX);
        }
        else {
            this.globalActivityActionBar.push(this.accountAction, { index: GlobalCompositeBar_1.ACCOUNTS_ACTION_INDEX });
        }
    }
    get accountsVisibilityPreference() {
        return isAccountsActionVisible(this.storageService);
    }
    set accountsVisibilityPreference(value) {
        setAccountsActionVisible(this.storageService, value);
    }
};
GlobalCompositeBar = GlobalCompositeBar_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService)
], GlobalCompositeBar);
export { GlobalCompositeBar };
let AbstractGlobalActivityActionViewItem = class AbstractGlobalActivityActionViewItem extends CompositeBarActionViewItem {
    constructor(menuId, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService) {
        super(action, { draggable: false, icon: true, hasPopup: true, ...options }, () => true, themeService, hoverService, configurationService, keybindingService);
        this.menuId = menuId;
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.contextMenuAlignmentOptions = contextMenuAlignmentOptions;
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.activityService = activityService;
        this.updateItemActivity();
        this._register(this.activityService.onDidChangeActivity(viewContainerOrAction => {
            if (isString(viewContainerOrAction) && viewContainerOrAction === this.compositeBarActionItem.id) {
                this.updateItemActivity();
            }
        }));
    }
    updateItemActivity() {
        this.action.activities = this.activityService.getActivity(this.compositeBarActionItem.id);
    }
    render(container) {
        super.render(container);
        this._register(addDisposableListener(this.container, EventType.MOUSE_DOWN, async (e) => {
            EventHelper.stop(e, true);
            const isLeftClick = e?.button !== 2;
            // Left-click run
            if (isLeftClick) {
                this.run();
            }
        }));
        // The rest of the activity bar uses context menu event for the context menu, so we match this
        this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, async (e) => {
            // Let the item decide on the context menu instead of the toolbar
            e.stopPropagation();
            const disposables = new DisposableStore();
            const actions = await this.resolveContextMenuActions(disposables);
            const event = new StandardMouseEvent(getWindow(this.container), e);
            this.contextMenuService.showContextMenu({
                getAnchor: () => event,
                getActions: () => actions,
                onHide: () => disposables.dispose()
            });
        }));
        this._register(addDisposableListener(this.container, EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                EventHelper.stop(e, true);
                this.run();
            }
        }));
        this._register(addDisposableListener(this.container, TouchEventType.Tap, (e) => {
            EventHelper.stop(e, true);
            this.run();
        }));
    }
    async resolveContextMenuActions(disposables) {
        return this.contextMenuActionsProvider();
    }
    async run() {
        const disposables = new DisposableStore();
        const menu = disposables.add(this.menuService.createMenu(this.menuId, this.contextKeyService));
        const actions = await this.resolveMainMenuActions(menu, disposables);
        const { anchorAlignment, anchorAxisAlignment } = this.contextMenuAlignmentOptions() ?? { anchorAlignment: undefined, anchorAxisAlignment: undefined };
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.label,
            anchorAlignment,
            anchorAxisAlignment,
            getActions: () => actions,
            onHide: () => disposables.dispose(),
            menuActionOptions: { renderShortTitle: true },
        });
    }
    async resolveMainMenuActions(menu, _disposable) {
        return getActionBarActions(menu.getActions({ renderShortTitle: true })).secondary;
    }
};
AbstractGlobalActivityActionViewItem = __decorate([
    __param(5, IThemeService),
    __param(6, IHoverService),
    __param(7, IMenuService),
    __param(8, IContextMenuService),
    __param(9, IContextKeyService),
    __param(10, IConfigurationService),
    __param(11, IKeybindingService),
    __param(12, IActivityService)
], AbstractGlobalActivityActionViewItem);
let AccountsActivityActionViewItem = class AccountsActivityActionViewItem extends AbstractGlobalActivityActionViewItem {
    static { this.ACCOUNTS_VISIBILITY_PREFERENCE_KEY = 'workbench.activity.showAccounts'; }
    constructor(contextMenuActionsProvider, options, contextMenuAlignmentOptions, fillContextMenuActions, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, logService, activityService, instantiationService, commandService) {
        const action = instantiationService.createInstance(CompositeBarAction, {
            id: ACCOUNTS_ACTIVITY_ID,
            name: localize('accounts', "Accounts"),
            classNames: ThemeIcon.asClassNameArray(GlobalCompositeBar.ACCOUNTS_ICON)
        });
        super(MenuId.AccountsContext, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService);
        this.fillContextMenuActions = fillContextMenuActions;
        this.lifecycleService = lifecycleService;
        this.authenticationService = authenticationService;
        this.productService = productService;
        this.secretStorageService = secretStorageService;
        this.logService = logService;
        this.commandService = commandService;
        this.groupedAccounts = new Map();
        this.problematicProviders = new Set();
        this.initialized = false;
        this.sessionFromEmbedder = new Lazy(() => getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService));
        this._register(action);
        this.registerListeners();
        this.initialize();
    }
    registerListeners() {
        this._register(this.authenticationService.onDidRegisterAuthenticationProvider(async (e) => {
            await this.addAccountsFromProvider(e.id);
        }));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider((e) => {
            this.groupedAccounts.delete(e.id);
            this.problematicProviders.delete(e.id);
        }));
        this._register(this.authenticationService.onDidChangeSessions(async (e) => {
            if (e.event.removed) {
                for (const removed of e.event.removed) {
                    this.removeAccount(e.providerId, removed.account);
                }
            }
            for (const changed of [...(e.event.changed ?? []), ...(e.event.added ?? [])]) {
                try {
                    await this.addOrUpdateAccount(e.providerId, changed.account);
                }
                catch (e) {
                    this.logService.error(e);
                }
            }
        }));
    }
    // This function exists to ensure that the accounts are added for auth providers that had already been registered
    // before the menu was created.
    async initialize() {
        // Resolving the menu doesn't need to happen immediately, so we can wait until after the workbench has been restored
        // and only run this when the system is idle.
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        if (this._store.isDisposed) {
            return;
        }
        const disposable = this._register(runWhenWindowIdle(getWindow(this.element), async () => {
            await this.doInitialize();
            disposable.dispose();
        }));
    }
    async doInitialize() {
        const providerIds = this.authenticationService.getProviderIds();
        const results = await Promise.allSettled(providerIds.map(providerId => this.addAccountsFromProvider(providerId)));
        // Log any errors that occurred while initializing. We try to be best effort here to show the most amount of accounts
        for (const result of results) {
            if (result.status === 'rejected') {
                this.logService.error(result.reason);
            }
        }
        this.initialized = true;
    }
    //#region overrides
    async resolveMainMenuActions(accountsMenu, disposables) {
        await super.resolveMainMenuActions(accountsMenu, disposables);
        const providers = this.authenticationService.getProviderIds().filter(p => !p.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX));
        const otherCommands = accountsMenu.getActions();
        let menus = [];
        const registeredProviders = providers.filter(providerId => !this.authenticationService.isDynamicAuthenticationProvider(providerId));
        const dynamicProviders = providers.filter(providerId => this.authenticationService.isDynamicAuthenticationProvider(providerId));
        if (!this.initialized) {
            const noAccountsAvailableAction = disposables.add(new Action('noAccountsAvailable', localize('loading', "Loading..."), undefined, false));
            menus.push(noAccountsAvailableAction);
        }
        else {
            for (const providerId of registeredProviders) {
                const provider = this.authenticationService.getProvider(providerId);
                const accounts = this.groupedAccounts.get(providerId);
                if (!accounts) {
                    if (this.problematicProviders.has(providerId)) {
                        const providerUnavailableAction = disposables.add(new Action('providerUnavailable', localize('authProviderUnavailable', '{0} is currently unavailable', provider.label), undefined, false));
                        menus.push(providerUnavailableAction);
                        // try again in the background so that if the failure was intermittent, we can resolve it on the next showing of the menu
                        try {
                            await this.addAccountsFromProvider(providerId);
                        }
                        catch (e) {
                            this.logService.error(e);
                        }
                    }
                    continue;
                }
                const canUseMcp = !!provider.authorizationServers?.length;
                for (const account of accounts) {
                    const manageExtensionsAction = toAction({
                        id: `configureSessions${account.label}`,
                        label: localize('manageTrustedExtensions', "Manage Trusted Extensions"),
                        enabled: true,
                        run: () => this.commandService.executeCommand('_manageTrustedExtensionsForAccount', { providerId, accountLabel: account.label })
                    });
                    const providerSubMenuActions = [manageExtensionsAction];
                    if (canUseMcp) {
                        const manageMCPAction = toAction({
                            id: `configureSessions${account.label}`,
                            label: localize('manageTrustedMCPServers', "Manage Trusted MCP Servers"),
                            enabled: true,
                            run: () => this.commandService.executeCommand('_manageTrustedMCPServersForAccount', { providerId, accountLabel: account.label })
                        });
                        providerSubMenuActions.push(manageMCPAction);
                    }
                    if (account.canSignOut) {
                        providerSubMenuActions.push(toAction({
                            id: 'signOut',
                            label: localize('signOut', "Sign Out"),
                            enabled: true,
                            run: () => this.commandService.executeCommand('_signOutOfAccount', { providerId, accountLabel: account.label })
                        }));
                    }
                    const providerSubMenu = new SubmenuAction('activitybar.submenu', `${account.label} (${provider.label})`, providerSubMenuActions);
                    menus.push(providerSubMenu);
                }
            }
            if (dynamicProviders.length && registeredProviders.length) {
                menus.push(new Separator());
            }
            for (const providerId of dynamicProviders) {
                const provider = this.authenticationService.getProvider(providerId);
                const accounts = this.groupedAccounts.get(providerId);
                if (!accounts) {
                    if (this.problematicProviders.has(providerId)) {
                        const providerUnavailableAction = disposables.add(new Action('providerUnavailable', localize('authProviderUnavailable', '{0} is currently unavailable', provider.label), undefined, false));
                        menus.push(providerUnavailableAction);
                        // try again in the background so that if the failure was intermittent, we can resolve it on the next showing of the menu
                        try {
                            await this.addAccountsFromProvider(providerId);
                        }
                        catch (e) {
                            this.logService.error(e);
                        }
                    }
                    continue;
                }
                for (const account of accounts) {
                    // TODO@TylerLeonhardt: Is there a nice way to bring this back?
                    // const manageExtensionsAction = toAction({
                    // 	id: `configureSessions${account.label}`,
                    // 	label: localize('manageTrustedExtensions', "Manage Trusted Extensions"),
                    // 	enabled: true,
                    // 	run: () => this.commandService.executeCommand('_manageTrustedExtensionsForAccount', { providerId, accountLabel: account.label })
                    // });
                    const providerSubMenuActions = [];
                    const manageMCPAction = toAction({
                        id: `configureSessions${account.label}`,
                        label: localize('manageTrustedMCPServers', "Manage Trusted MCP Servers"),
                        enabled: true,
                        run: () => this.commandService.executeCommand('_manageTrustedMCPServersForAccount', { providerId, accountLabel: account.label })
                    });
                    providerSubMenuActions.push(manageMCPAction);
                    if (account.canSignOut) {
                        providerSubMenuActions.push(toAction({
                            id: 'signOut',
                            label: localize('signOut', "Sign Out"),
                            enabled: true,
                            run: () => this.commandService.executeCommand('_signOutOfAccount', { providerId, accountLabel: account.label })
                        }));
                    }
                    const providerSubMenu = new SubmenuAction('activitybar.submenu', `${account.label} (${provider.label})`, providerSubMenuActions);
                    menus.push(providerSubMenu);
                }
            }
        }
        if (menus.length && otherCommands.length) {
            menus.push(new Separator());
        }
        otherCommands.forEach((group, i) => {
            const actions = group[1];
            menus = menus.concat(actions);
            if (i !== otherCommands.length - 1) {
                menus.push(new Separator());
            }
        });
        return menus;
    }
    async resolveContextMenuActions(disposables) {
        const actions = await super.resolveContextMenuActions(disposables);
        this.fillContextMenuActions(actions);
        return actions;
    }
    //#endregion
    //#region groupedAccounts helpers
    async addOrUpdateAccount(providerId, account) {
        let accounts = this.groupedAccounts.get(providerId);
        if (!accounts) {
            accounts = [];
            this.groupedAccounts.set(providerId, accounts);
        }
        const sessionFromEmbedder = await this.sessionFromEmbedder.value;
        let canSignOut = true;
        if (sessionFromEmbedder // if we have a session from the embedder
            && !sessionFromEmbedder.canSignOut // and that session says we can't sign out
            && (await this.authenticationService.getSessions(providerId)) // and that session is associated with the account we are adding/updating
                .some(s => s.id === sessionFromEmbedder.id
                && s.account.id === account.id)) {
            canSignOut = false;
        }
        const existingAccount = accounts.find(a => a.label === account.label);
        if (existingAccount) {
            // if we have an existing account and we discover that we
            // can't sign out of it, update the account to mark it as "can't sign out"
            if (!canSignOut) {
                existingAccount.canSignOut = canSignOut;
            }
        }
        else {
            accounts.push({ ...account, canSignOut });
        }
    }
    removeAccount(providerId, account) {
        const accounts = this.groupedAccounts.get(providerId);
        if (!accounts) {
            return;
        }
        const index = accounts.findIndex(a => a.id === account.id);
        if (index === -1) {
            return;
        }
        accounts.splice(index, 1);
        if (accounts.length === 0) {
            this.groupedAccounts.delete(providerId);
        }
    }
    async addAccountsFromProvider(providerId) {
        try {
            const sessions = await this.authenticationService.getSessions(providerId);
            this.problematicProviders.delete(providerId);
            for (const session of sessions) {
                try {
                    await this.addOrUpdateAccount(providerId, session.account);
                }
                catch (e) {
                    this.logService.error(e);
                }
            }
        }
        catch (e) {
            this.logService.error(e);
            this.problematicProviders.add(providerId);
        }
    }
};
AccountsActivityActionViewItem = __decorate([
    __param(4, IThemeService),
    __param(5, ILifecycleService),
    __param(6, IHoverService),
    __param(7, IContextMenuService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IAuthenticationService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IProductService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService),
    __param(15, ISecretStorageService),
    __param(16, ILogService),
    __param(17, IActivityService),
    __param(18, IInstantiationService),
    __param(19, ICommandService)
], AccountsActivityActionViewItem);
export { AccountsActivityActionViewItem };
let GlobalActivityActionViewItem = class GlobalActivityActionViewItem extends AbstractGlobalActivityActionViewItem {
    constructor(contextMenuActionsProvider, options, contextMenuAlignmentOptions, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService) {
        const action = instantiationService.createInstance(CompositeBarAction, {
            id: GLOBAL_ACTIVITY_ID,
            name: localize('manage', "Manage"),
            classNames: ThemeIcon.asClassNameArray(userDataProfileService.currentProfile.icon ? ThemeIcon.fromId(userDataProfileService.currentProfile.icon) : DEFAULT_ICON)
        });
        super(MenuId.GlobalActivity, action, options, contextMenuActionsProvider, contextMenuAlignmentOptions, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, keybindingService, activityService);
        this.userDataProfileService = userDataProfileService;
        this._register(action);
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => {
            action.compositeBarActionItem = {
                ...action.compositeBarActionItem,
                classNames: ThemeIcon.asClassNameArray(userDataProfileService.currentProfile.icon ? ThemeIcon.fromId(userDataProfileService.currentProfile.icon) : DEFAULT_ICON)
            };
        }));
    }
    render(container) {
        super.render(container);
        this.profileBadge = append(container, $('.profile-badge'));
        this.profileBadgeContent = append(this.profileBadge, $('.profile-badge-content'));
        this.updateProfileBadge();
    }
    updateProfileBadge() {
        if (!this.profileBadge || !this.profileBadgeContent) {
            return;
        }
        clearNode(this.profileBadgeContent);
        hide(this.profileBadge);
        if (this.userDataProfileService.currentProfile.isDefault) {
            return;
        }
        if (this.userDataProfileService.currentProfile.icon && this.userDataProfileService.currentProfile.icon !== DEFAULT_ICON.id) {
            return;
        }
        if (this.action.activities.length > 0) {
            return;
        }
        show(this.profileBadge);
        this.profileBadgeContent.classList.add('profile-text-overlay');
        this.profileBadgeContent.textContent = this.userDataProfileService.currentProfile.name.substring(0, 2).toUpperCase();
    }
    updateActivity() {
        super.updateActivity();
        this.updateProfileBadge();
    }
    computeTitle() {
        return this.userDataProfileService.currentProfile.isDefault ? super.computeTitle() : localize('manage profile', "Manage {0} (Profile)", this.userDataProfileService.currentProfile.name);
    }
};
GlobalActivityActionViewItem = __decorate([
    __param(3, IUserDataProfileService),
    __param(4, IThemeService),
    __param(5, IHoverService),
    __param(6, IMenuService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IKeybindingService),
    __param(12, IInstantiationService),
    __param(13, IActivityService)
], GlobalActivityActionViewItem);
export { GlobalActivityActionViewItem };
let SimpleAccountActivityActionViewItem = class SimpleAccountActivityActionViewItem extends AccountsActivityActionViewItem {
    constructor(hoverOptions, options, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, storageService, logService, activityService, instantiationService, commandService) {
        super(() => simpleActivityContextMenuActions(storageService, true), {
            ...options,
            colors: theme => ({
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
            }),
            hoverOptions,
            compact: true,
        }, () => undefined, actions => actions, themeService, lifecycleService, hoverService, contextMenuService, menuService, contextKeyService, authenticationService, environmentService, productService, configurationService, keybindingService, secretStorageService, logService, activityService, instantiationService, commandService);
    }
};
SimpleAccountActivityActionViewItem = __decorate([
    __param(2, IThemeService),
    __param(3, ILifecycleService),
    __param(4, IHoverService),
    __param(5, IContextMenuService),
    __param(6, IMenuService),
    __param(7, IContextKeyService),
    __param(8, IAuthenticationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IProductService),
    __param(11, IConfigurationService),
    __param(12, IKeybindingService),
    __param(13, ISecretStorageService),
    __param(14, IStorageService),
    __param(15, ILogService),
    __param(16, IActivityService),
    __param(17, IInstantiationService),
    __param(18, ICommandService)
], SimpleAccountActivityActionViewItem);
export { SimpleAccountActivityActionViewItem };
let SimpleGlobalActivityActionViewItem = class SimpleGlobalActivityActionViewItem extends GlobalActivityActionViewItem {
    constructor(hoverOptions, options, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService, storageService) {
        super(() => simpleActivityContextMenuActions(storageService, false), {
            ...options,
            colors: theme => ({
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
            }),
            hoverOptions,
            compact: true,
        }, () => undefined, userDataProfileService, themeService, hoverService, menuService, contextMenuService, contextKeyService, configurationService, environmentService, keybindingService, instantiationService, activityService);
    }
};
SimpleGlobalActivityActionViewItem = __decorate([
    __param(2, IUserDataProfileService),
    __param(3, IThemeService),
    __param(4, IHoverService),
    __param(5, IMenuService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService),
    __param(8, IConfigurationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IKeybindingService),
    __param(11, IInstantiationService),
    __param(12, IActivityService),
    __param(13, IStorageService)
], SimpleGlobalActivityActionViewItem);
export { SimpleGlobalActivityActionViewItem };
function simpleActivityContextMenuActions(storageService, isAccount) {
    const currentElementContextMenuActions = [];
    if (isAccount) {
        currentElementContextMenuActions.push(toAction({ id: 'hideAccounts', label: localize('hideAccounts', "Hide Accounts"), run: () => setAccountsActionVisible(storageService, false) }), new Separator());
    }
    return [
        ...currentElementContextMenuActions,
        toAction({ id: 'toggle.hideAccounts', label: localize('accounts', "Accounts"), checked: isAccountsActionVisible(storageService), run: () => setAccountsActionVisible(storageService, !isAccountsActionVisible(storageService)) }),
        toAction({ id: 'toggle.hideManage', label: localize('manage', "Manage"), checked: true, enabled: false, run: () => { throw new Error('"Manage" can not be hidden'); } })
    ];
}
export function isAccountsActionVisible(storageService) {
    return storageService.getBoolean(AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, 0 /* StorageScope.PROFILE */, true);
}
function setAccountsActionVisible(storageService, visible) {
    storageService.store(AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, visible, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsQ29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9nbG9iYWxDb21wb3NpdGVCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLGlEQUFpRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sNkNBQTZDLENBQUM7QUFDM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGtCQUFrQixFQUFrRixNQUFNLDBCQUEwQixDQUFDO0FBQzFLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxp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