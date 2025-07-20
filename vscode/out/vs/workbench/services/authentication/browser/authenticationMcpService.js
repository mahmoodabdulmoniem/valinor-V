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
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IActivityService, NumberBadge } from '../../activity/common/activity.js';
import { IAuthenticationMcpAccessService } from './authenticationMcpAccessService.js';
import { IAuthenticationMcpUsageService } from './authenticationMcpUsageService.js';
import { IAuthenticationService } from '../common/authentication.js';
import { Emitter } from '../../../../base/common/event.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
// OAuth2 spec prohibits space in a scope, so use that to join them.
const SCOPESLIST_SEPARATOR = ' ';
// TODO: Move this into MainThreadAuthentication
export const IAuthenticationMcpService = createDecorator('IAuthenticationMcpService');
// TODO@TylerLeonhardt: This should all go in MainThreadAuthentication
let AuthenticationMcpService = class AuthenticationMcpService extends Disposable {
    constructor(activityService, storageService, dialogService, quickInputService, _productService, _authenticationService, _authenticationUsageService, _authenticationAccessService) {
        super();
        this.activityService = activityService;
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.quickInputService = quickInputService;
        this._productService = _productService;
        this._authenticationService = _authenticationService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationAccessService = _authenticationAccessService;
        this._signInRequestItems = new Map();
        this._sessionAccessRequestItems = new Map();
        this._accountBadgeDisposable = this._register(new MutableDisposable());
        this._onDidAccountPreferenceChange = this._register(new Emitter());
        this.onDidChangeAccountPreference = this._onDidAccountPreferenceChange.event;
        this._inheritAuthAccountPreferenceParentToChildren = this._productService.inheritAuthAccountPreference || {};
        this._inheritAuthAccountPreferenceChildToParent = Object.entries(this._inheritAuthAccountPreferenceParentToChildren).reduce((acc, [parent, children]) => {
            children.forEach((child) => {
                acc[child] = parent;
            });
            return acc;
        }, {});
        this.registerListeners();
    }
    registerListeners() {
        this._register(this._authenticationService.onDidChangeSessions(async (e) => {
            if (e.event.added?.length) {
                await this.updateNewSessionRequests(e.providerId, e.event.added);
            }
            if (e.event.removed?.length) {
                await this.updateAccessRequests(e.providerId, e.event.removed);
            }
            this.updateBadgeCount();
        }));
        this._register(this._authenticationService.onDidUnregisterAuthenticationProvider(e => {
            const accessRequests = this._sessionAccessRequestItems.get(e.id) || {};
            Object.keys(accessRequests).forEach(mcpServerId => {
                this.removeAccessRequest(e.id, mcpServerId);
            });
        }));
    }
    async updateNewSessionRequests(providerId, addedSessions) {
        const existingRequestsForProvider = this._signInRequestItems.get(providerId);
        if (!existingRequestsForProvider) {
            return;
        }
        Object.keys(existingRequestsForProvider).forEach(requestedScopes => {
            if (addedSessions.some(session => session.scopes.slice().join(SCOPESLIST_SEPARATOR) === requestedScopes)) {
                const sessionRequest = existingRequestsForProvider[requestedScopes];
                sessionRequest?.disposables.forEach(item => item.dispose());
                delete existingRequestsForProvider[requestedScopes];
                if (Object.keys(existingRequestsForProvider).length === 0) {
                    this._signInRequestItems.delete(providerId);
                }
                else {
                    this._signInRequestItems.set(providerId, existingRequestsForProvider);
                }
            }
        });
    }
    async updateAccessRequests(providerId, removedSessions) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId);
        if (providerRequests) {
            Object.keys(providerRequests).forEach(mcpServerId => {
                removedSessions.forEach(removed => {
                    const indexOfSession = providerRequests[mcpServerId].possibleSessions.findIndex(session => session.id === removed.id);
                    if (indexOfSession) {
                        providerRequests[mcpServerId].possibleSessions.splice(indexOfSession, 1);
                    }
                });
                if (!providerRequests[mcpServerId].possibleSessions.length) {
                    this.removeAccessRequest(providerId, mcpServerId);
                }
            });
        }
    }
    updateBadgeCount() {
        this._accountBadgeDisposable.clear();
        let numberOfRequests = 0;
        this._signInRequestItems.forEach(providerRequests => {
            Object.keys(providerRequests).forEach(request => {
                numberOfRequests += providerRequests[request].requestingMcpServerIds.length;
            });
        });
        this._sessionAccessRequestItems.forEach(accessRequest => {
            numberOfRequests += Object.keys(accessRequest).length;
        });
        if (numberOfRequests > 0) {
            const badge = new NumberBadge(numberOfRequests, () => nls.localize('sign in', "Sign in requested"));
            this._accountBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
        }
    }
    removeAccessRequest(providerId, mcpServerId) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId) || {};
        if (providerRequests[mcpServerId]) {
            dispose(providerRequests[mcpServerId].disposables);
            delete providerRequests[mcpServerId];
            this.updateBadgeCount();
        }
    }
    //#region Account/Session Preference
    updateAccountPreference(mcpServerId, providerId, account) {
        const parentMcpServerId = this._inheritAuthAccountPreferenceChildToParent[mcpServerId] ?? mcpServerId;
        const key = this._getKey(parentMcpServerId, providerId);
        // Store the preference in the workspace and application storage. This allows new workspaces to
        // have a preference set already to limit the number of prompts that are shown... but also allows
        // a specific workspace to override the global preference.
        this.storageService.store(key, account.label, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(key, account.label, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const childrenMcpServers = this._inheritAuthAccountPreferenceParentToChildren[parentMcpServerId];
        const mcpServerIds = childrenMcpServers ? [parentMcpServerId, ...childrenMcpServers] : [parentMcpServerId];
        this._onDidAccountPreferenceChange.fire({ mcpServerIds, providerId });
    }
    getAccountPreference(mcpServerId, providerId) {
        const key = this._getKey(this._inheritAuthAccountPreferenceChildToParent[mcpServerId] ?? mcpServerId, providerId);
        // If a preference is set in the workspace, use that. Otherwise, use the global preference.
        return this.storageService.get(key, 1 /* StorageScope.WORKSPACE */) ?? this.storageService.get(key, -1 /* StorageScope.APPLICATION */);
    }
    removeAccountPreference(mcpServerId, providerId) {
        const key = this._getKey(this._inheritAuthAccountPreferenceChildToParent[mcpServerId] ?? mcpServerId, providerId);
        // This won't affect any other workspaces that have a preference set, but it will remove the preference
        // for this workspace and the global preference. This is only paired with a call to updateSessionPreference...
        // so we really don't _need_ to remove them as they are about to be overridden anyway... but it's more correct
        // to remove them first... and in case this gets called from somewhere else in the future.
        this.storageService.remove(key, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
    }
    _getKey(mcpServerId, providerId) {
        return `${mcpServerId}-${providerId}`;
    }
    // TODO@TylerLeonhardt: Remove all of this after a couple iterations
    updateSessionPreference(providerId, mcpServerId, session) {
        // The 3 parts of this key are important:
        // * MCP server id: The MCP server that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${mcpServerId}-${providerId}-${session.scopes.join(SCOPESLIST_SEPARATOR)}`;
        // Store the preference in the workspace and application storage. This allows new workspaces to
        // have a preference set already to limit the number of prompts that are shown... but also allows
        // a specific workspace to override the global preference.
        this.storageService.store(key, session.id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(key, session.id, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getSessionPreference(providerId, mcpServerId, scopes) {
        // The 3 parts of this key are important:
        // * MCP server id: The MCP server that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${mcpServerId}-${providerId}-${scopes.join(SCOPESLIST_SEPARATOR)}`;
        // If a preference is set in the workspace, use that. Otherwise, use the global preference.
        return this.storageService.get(key, 1 /* StorageScope.WORKSPACE */) ?? this.storageService.get(key, -1 /* StorageScope.APPLICATION */);
    }
    removeSessionPreference(providerId, mcpServerId, scopes) {
        // The 3 parts of this key are important:
        // * MCP server id: The MCP server that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${mcpServerId}-${providerId}-${scopes.join(SCOPESLIST_SEPARATOR)}`;
        // This won't affect any other workspaces that have a preference set, but it will remove the preference
        // for this workspace and the global preference. This is only paired with a call to updateSessionPreference...
        // so we really don't _need_ to remove them as they are about to be overridden anyway... but it's more correct
        // to remove them first... and in case this gets called from somewhere else in the future.
        this.storageService.remove(key, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
    }
    _updateAccountAndSessionPreferences(providerId, mcpServerId, session) {
        this.updateAccountPreference(mcpServerId, providerId, session.account);
        this.updateSessionPreference(providerId, mcpServerId, session);
    }
    //#endregion
    async showGetSessionPrompt(provider, accountName, mcpServerId, mcpServerName) {
        let SessionPromptChoice;
        (function (SessionPromptChoice) {
            SessionPromptChoice[SessionPromptChoice["Allow"] = 0] = "Allow";
            SessionPromptChoice[SessionPromptChoice["Deny"] = 1] = "Deny";
            SessionPromptChoice[SessionPromptChoice["Cancel"] = 2] = "Cancel";
        })(SessionPromptChoice || (SessionPromptChoice = {}));
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message: nls.localize('confirmAuthenticationAccess', "The MCP server '{0}' wants to access the {1} account '{2}'.", mcpServerName, provider.label, accountName),
            buttons: [
                {
                    label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                    run: () => SessionPromptChoice.Allow
                },
                {
                    label: nls.localize({ key: 'deny', comment: ['&& denotes a mnemonic'] }, "&&Deny"),
                    run: () => SessionPromptChoice.Deny
                }
            ],
            cancelButton: {
                run: () => SessionPromptChoice.Cancel
            }
        });
        if (result !== SessionPromptChoice.Cancel) {
            this._authenticationAccessService.updateAllowedMcpServers(provider.id, accountName, [{ id: mcpServerId, name: mcpServerName, allowed: result === SessionPromptChoice.Allow }]);
            this.removeAccessRequest(provider.id, mcpServerId);
        }
        return result === SessionPromptChoice.Allow;
    }
    /**
     * This function should be used only when there are sessions to disambiguate.
     */
    async selectSession(providerId, mcpServerId, mcpServerName, scopes, availableSessions) {
        const allAccounts = await this._authenticationService.getAccounts(providerId);
        if (!allAccounts.length) {
            throw new Error('No accounts available');
        }
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick());
        quickPick.ignoreFocusOut = true;
        const accountsWithSessions = new Set();
        const items = availableSessions
            // Only grab the first account
            .filter(session => !accountsWithSessions.has(session.account.label) && accountsWithSessions.add(session.account.label))
            .map(session => {
            return {
                label: session.account.label,
                session: session
            };
        });
        // Add the additional accounts that have been logged into the provider but are
        // don't have a session yet.
        allAccounts.forEach(account => {
            if (!accountsWithSessions.has(account.label)) {
                items.push({ label: account.label, account });
            }
        });
        items.push({ label: nls.localize('useOtherAccount', "Sign in to another account") });
        quickPick.items = items;
        quickPick.title = nls.localize({
            key: 'selectAccount',
            comment: ['The placeholder {0} is the name of a MCP server. {1} is the name of the type of account, such as Microsoft or GitHub.']
        }, "The MCP server '{0}' wants to access a {1} account", mcpServerName, this._authenticationService.getProvider(providerId).label);
        quickPick.placeholder = nls.localize('getSessionPlateholder', "Select an account for '{0}' to use or Esc to cancel", mcpServerName);
        return await new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidAccept(async (_) => {
                quickPick.dispose();
                let session = quickPick.selectedItems[0].session;
                if (!session) {
                    const account = quickPick.selectedItems[0].account;
                    try {
                        session = await this._authenticationService.createSession(providerId, scopes, { account });
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                }
                const accountName = session.account.label;
                this._authenticationAccessService.updateAllowedMcpServers(providerId, accountName, [{ id: mcpServerId, name: mcpServerName, allowed: true }]);
                this._updateAccountAndSessionPreferences(providerId, mcpServerId, session);
                this.removeAccessRequest(providerId, mcpServerId);
                resolve(session);
            }));
            disposables.add(quickPick.onDidHide(_ => {
                if (!quickPick.selectedItems[0]) {
                    reject('User did not consent to account access');
                }
                disposables.dispose();
            }));
            quickPick.show();
        });
    }
    async completeSessionAccessRequest(provider, mcpServerId, mcpServerName, scopes) {
        const providerRequests = this._sessionAccessRequestItems.get(provider.id) || {};
        const existingRequest = providerRequests[mcpServerId];
        if (!existingRequest) {
            return;
        }
        if (!provider) {
            return;
        }
        const possibleSessions = existingRequest.possibleSessions;
        let session;
        if (provider.supportsMultipleAccounts) {
            try {
                session = await this.selectSession(provider.id, mcpServerId, mcpServerName, scopes, possibleSessions);
            }
            catch (_) {
                // ignore cancel
            }
        }
        else {
            const approved = await this.showGetSessionPrompt(provider, possibleSessions[0].account.label, mcpServerId, mcpServerName);
            if (approved) {
                session = possibleSessions[0];
            }
        }
        if (session) {
            this._authenticationUsageService.addAccountUsage(provider.id, session.account.label, session.scopes, mcpServerId, mcpServerName);
        }
    }
    requestSessionAccess(providerId, mcpServerId, mcpServerName, scopes, possibleSessions) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId) || {};
        const hasExistingRequest = providerRequests[mcpServerId];
        if (hasExistingRequest) {
            return;
        }
        const provider = this._authenticationService.getProvider(providerId);
        const menuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '3_accessRequests',
            command: {
                id: `${providerId}${mcpServerId}Access`,
                title: nls.localize({
                    key: 'accessRequest',
                    comment: [`The placeholder {0} will be replaced with an authentication provider''s label. {1} will be replaced with a MCP server name. (1) is to indicate that this menu item contributes to a badge count`]
                }, "Grant access to {0} for {1}... (1)", provider.label, mcpServerName)
            }
        });
        const accessCommand = CommandsRegistry.registerCommand({
            id: `${providerId}${mcpServerId}Access`,
            handler: async (accessor) => {
                this.completeSessionAccessRequest(provider, mcpServerId, mcpServerName, scopes);
            }
        });
        providerRequests[mcpServerId] = { possibleSessions, disposables: [menuItem, accessCommand] };
        this._sessionAccessRequestItems.set(providerId, providerRequests);
        this.updateBadgeCount();
    }
    async requestNewSession(providerId, scopes, mcpServerId, mcpServerName) {
        if (!this._authenticationService.isAuthenticationProviderRegistered(providerId)) {
            // Activate has already been called for the authentication provider, but it cannot block on registering itself
            // since this is sync and returns a disposable. So, wait for registration event to fire that indicates the
            // provider is now in the map.
            await new Promise((resolve, _) => {
                const dispose = this._authenticationService.onDidRegisterAuthenticationProvider(e => {
                    if (e.id === providerId) {
                        dispose.dispose();
                        resolve();
                    }
                });
            });
        }
        let provider;
        try {
            provider = this._authenticationService.getProvider(providerId);
        }
        catch (_e) {
            return;
        }
        const providerRequests = this._signInRequestItems.get(providerId);
        const scopesList = scopes.join(SCOPESLIST_SEPARATOR);
        const mcpServerHasExistingRequest = providerRequests
            && providerRequests[scopesList]
            && providerRequests[scopesList].requestingMcpServerIds.includes(mcpServerId);
        if (mcpServerHasExistingRequest) {
            return;
        }
        // Construct a commandId that won't clash with others generated here, nor likely with an MCP server's command
        const commandId = `${providerId}:${mcpServerId}:signIn${Object.keys(providerRequests || []).length}`;
        const menuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '2_signInRequests',
            command: {
                id: commandId,
                title: nls.localize({
                    key: 'signInRequest',
                    comment: [`The placeholder {0} will be replaced with an authentication provider's label. {1} will be replaced with a MCP server name. (1) is to indicate that this menu item contributes to a badge count.`]
                }, "Sign in with {0} to use {1} (1)", provider.label, mcpServerName)
            }
        });
        const signInCommand = CommandsRegistry.registerCommand({
            id: commandId,
            handler: async (accessor) => {
                const authenticationService = accessor.get(IAuthenticationService);
                const session = await authenticationService.createSession(providerId, scopes);
                this._authenticationAccessService.updateAllowedMcpServers(providerId, session.account.label, [{ id: mcpServerId, name: mcpServerName, allowed: true }]);
                this._updateAccountAndSessionPreferences(providerId, mcpServerId, session);
            }
        });
        if (providerRequests) {
            const existingRequest = providerRequests[scopesList] || { disposables: [], requestingMcpServerIds: [] };
            providerRequests[scopesList] = {
                disposables: [...existingRequest.disposables, menuItem, signInCommand],
                requestingMcpServerIds: [...existingRequest.requestingMcpServerIds, mcpServerId]
            };
            this._signInRequestItems.set(providerId, providerRequests);
        }
        else {
            this._signInRequestItems.set(providerId, {
                [scopesList]: {
                    disposables: [menuItem, signInCommand],
                    requestingMcpServerIds: [mcpServerId]
                }
            });
        }
        this.updateBadgeCount();
    }
};
AuthenticationMcpService = __decorate([
    __param(0, IActivityService),
    __param(1, IStorageService),
    __param(2, IDialogService),
    __param(3, IQuickInputService),
    __param(4, IProductService),
    __param(5, IAuthenticationService),
    __param(6, IAuthenticationMcpUsageService),
    __param(7, IAuthenticationMcpAccessService)
], AuthenticationMcpService);
export { AuthenticationMcpService };
registerSingleton(IAuthenticationMcpService, AuthenticationMcpService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25NY3BTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbk1jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BGLE9BQU8sRUFBa0Qsc0JBQXNCLEVBQWdDLE1BQU0sNkJBQTZCLENBQUM7QUFDbkosT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0Ysb0VBQW9FO0FBQ3BFLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBV2pDLGdEQUFnRDtBQUNoRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUF5RGpILHNFQUFzRTtBQUMvRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFZdkQsWUFDbUIsZUFBa0QsRUFDbkQsY0FBZ0QsRUFDakQsYUFBOEMsRUFDMUMsaUJBQXNELEVBQ3pELGVBQWlELEVBQzFDLHNCQUErRCxFQUN2RCwyQkFBNEUsRUFDM0UsNEJBQThFO1FBRS9HLEtBQUssRUFBRSxDQUFDO1FBVDJCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNsQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDeEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3pCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDdEMsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFnQztRQUMxRCxpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQWlDO1FBbEJ4Ryx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztRQUM1RCwrQkFBMEIsR0FBRyxJQUFJLEdBQUcsRUFBZ0gsQ0FBQztRQUM1SSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBRTNFLGtDQUE2QixHQUE0RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFrRCxDQUFDLENBQUM7UUFDdEssaUNBQTRCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQztRQWdCaEYsSUFBSSxDQUFDLDZDQUE2QyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsNEJBQTRCLElBQUksRUFBRSxDQUFDO1FBQzdHLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLE1BQU0sQ0FBb0MsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRTtZQUMxTCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUU7Z0JBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUM7WUFDckIsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQ3hFLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsRSxDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hFLENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3ZFLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUNqRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLFVBQWtCLEVBQUUsYUFBK0M7UUFDekcsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ2xDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUNsRSxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFHLE1BQU0sY0FBYyxHQUFHLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNwRSxjQUFjLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUU1RCxPQUFPLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO2dCQUN2RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLGVBQWlEO1FBQ3ZHLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDbkQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDakMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3RILElBQUksY0FBYyxFQUFFLENBQUM7d0JBQ3BCLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzFFLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUM1RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFckMsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQy9DLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQztZQUM3RSxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUN2RCxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN2RCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQ3BHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDM0YsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxVQUFrQixFQUFFLFdBQW1CO1FBQ2xFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDL0UsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxPQUFPLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRUQsb0NBQW9DO0lBRXBDLHVCQUF1QixDQUFDLFdBQW1CLEVBQUUsVUFBa0IsRUFBRSxPQUFxQztRQUNyRyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxXQUFXLENBQUMsSUFBSSxXQUFXLENBQUM7UUFDdEcsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUV4RCwrRkFBK0Y7UUFDL0YsaUdBQWlHO1FBQ2pHLDBEQUEwRDtRQUMxRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssZ0VBQWdELENBQUM7UUFDN0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxLQUFLLG1FQUFrRCxDQUFDO1FBRS9GLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakcsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDM0csSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxXQUFtQixFQUFFLFVBQWtCO1FBQzNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVsSCwyRkFBMkY7UUFDM0YsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGlDQUF5QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsb0NBQTJCLENBQUM7SUFDdkgsQ0FBQztJQUVELHVCQUF1QixDQUFDLFdBQW1CLEVBQUUsVUFBa0I7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQTBDLENBQUMsV0FBVyxDQUFDLElBQUksV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWxILHVHQUF1RztRQUN2Ryw4R0FBOEc7UUFDOUcsOEdBQThHO1FBQzlHLDBGQUEwRjtRQUMxRixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLGlDQUF5QixDQUFDO1FBQ3hELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLENBQUM7SUFDM0QsQ0FBQztJQUVPLE9BQU8sQ0FBQyxXQUFtQixFQUFFLFVBQWtCO1FBQ3RELE9BQU8sR0FBRyxXQUFXLElBQUksVUFBVSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELG9FQUFvRTtJQUVwRSx1QkFBdUIsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsT0FBOEI7UUFDOUYseUNBQXlDO1FBQ3pDLHdEQUF3RDtRQUN4RCx5REFBeUQ7UUFDekQsc0VBQXNFO1FBQ3RFLE1BQU0sR0FBRyxHQUFHLEdBQUcsV0FBVyxJQUFJLFVBQVUsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7UUFFeEYsK0ZBQStGO1FBQy9GLGlHQUFpRztRQUNqRywwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxFQUFFLGdFQUFnRCxDQUFDO1FBQzFGLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsRUFBRSxtRUFBa0QsQ0FBQztJQUM3RixDQUFDO0lBRUQsb0JBQW9CLENBQUMsVUFBa0IsRUFBRSxXQUFtQixFQUFFLE1BQWdCO1FBQzdFLHlDQUF5QztRQUN6Qyx3REFBd0Q7UUFDeEQseURBQXlEO1FBQ3pELHNFQUFzRTtRQUN0RSxNQUFNLEdBQUcsR0FBRyxHQUFHLFdBQVcsSUFBSSxVQUFVLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7UUFFaEYsMkZBQTJGO1FBQzNGLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxpQ0FBeUIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLG9DQUEyQixDQUFDO0lBQ3ZILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsTUFBZ0I7UUFDaEYseUNBQXlDO1FBQ3pDLHdEQUF3RDtRQUN4RCx5REFBeUQ7UUFDekQsc0VBQXNFO1FBQ3RFLE1BQU0sR0FBRyxHQUFHLEdBQUcsV0FBVyxJQUFJLFVBQVUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztRQUVoRix1R0FBdUc7UUFDdkcsOEdBQThHO1FBQzlHLDhHQUE4RztRQUM5RywwRkFBMEY7UUFDMUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxpQ0FBeUIsQ0FBQztRQUN4RCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFDO0lBQzNELENBQUM7SUFFTyxtQ0FBbUMsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsT0FBOEI7UUFDbEgsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxZQUFZO0lBRUosS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQWlDLEVBQUUsV0FBbUIsRUFBRSxXQUFtQixFQUFFLGFBQXFCO1FBQ3BJLElBQUssbUJBSUo7UUFKRCxXQUFLLG1CQUFtQjtZQUN2QiwrREFBUyxDQUFBO1lBQ1QsNkRBQVEsQ0FBQTtZQUNSLGlFQUFVLENBQUE7UUFDWCxDQUFDLEVBSkksbUJBQW1CLEtBQW5CLG1CQUFtQixRQUl2QjtRQUNELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFzQjtZQUN2RSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsNkRBQTZELEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDO1lBQy9KLE9BQU8sRUFBRTtnQkFDUjtvQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQztvQkFDcEYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUs7aUJBQ3BDO2dCQUNEO29CQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO29CQUNsRixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSTtpQkFDbkM7YUFDRDtZQUNELFlBQVksRUFBRTtnQkFDYixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTTthQUNyQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksTUFBTSxLQUFLLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLEtBQUssbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9LLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxPQUFPLE1BQU0sS0FBSyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7SUFDN0MsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsYUFBcUIsRUFBRSxNQUFnQixFQUFFLGlCQUEwQztRQUMvSSxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUE4RixDQUFDLENBQUM7UUFDeEssU0FBUyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQy9DLE1BQU0sS0FBSyxHQUFpRyxpQkFBaUI7WUFDNUgsOEJBQThCO2FBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDdEgsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2QsT0FBTztnQkFDTixLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLO2dCQUM1QixPQUFPLEVBQUUsT0FBTzthQUNoQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSiw4RUFBOEU7UUFDOUUsNEJBQTRCO1FBQzVCLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDL0MsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDN0I7WUFDQyxHQUFHLEVBQUUsZUFBZTtZQUNwQixPQUFPLEVBQUUsQ0FBQyx1SEFBdUgsQ0FBQztTQUNsSSxFQUNELG9EQUFvRCxFQUNwRCxhQUFhLEVBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQ3pELENBQUM7UUFDRixTQUFTLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUscURBQXFELEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFcEksT0FBTyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzVDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7Z0JBQy9DLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztvQkFDbkQsSUFBSSxDQUFDO3dCQUNKLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQzVGLENBQUM7b0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDWixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ1YsT0FBTztvQkFDUixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBRTFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDOUksSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzNFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRWxELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUosV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNqQyxNQUFNLENBQUMsd0NBQXdDLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztnQkFDRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQUMsUUFBaUMsRUFBRSxXQUFtQixFQUFFLGFBQXFCLEVBQUUsTUFBZ0I7UUFDekksTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUUxRCxJQUFJLE9BQTBDLENBQUM7UUFDL0MsSUFBSSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUM7Z0JBQ0osT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDdkcsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCO1lBQ2pCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMxSCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsMkJBQTJCLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEksQ0FBQztJQUNGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsYUFBcUIsRUFBRSxNQUFnQixFQUFFLGdCQUF5QztRQUMvSSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9FLE1BQU0sa0JBQWtCLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7WUFDcEUsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxFQUFFLEdBQUcsVUFBVSxHQUFHLFdBQVcsUUFBUTtnQkFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUM7b0JBQ25CLEdBQUcsRUFBRSxlQUFlO29CQUNwQixPQUFPLEVBQUUsQ0FBQyxpTUFBaU0sQ0FBQztpQkFDNU0sRUFDQSxvQ0FBb0MsRUFDcEMsUUFBUSxDQUFDLEtBQUssRUFDZCxhQUFhLENBQUM7YUFDZjtTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztZQUN0RCxFQUFFLEVBQUUsR0FBRyxVQUFVLEdBQUcsV0FBVyxRQUFRO1lBQ3ZDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNqRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUM3RixJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsVUFBa0IsRUFBRSxNQUFnQixFQUFFLFdBQW1CLEVBQUUsYUFBcUI7UUFDdkcsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQ0FBa0MsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2pGLDhHQUE4RztZQUM5RywwR0FBMEc7WUFDMUcsOEJBQThCO1lBQzlCLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDbkYsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLFVBQVUsRUFBRSxDQUFDO3dCQUN6QixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2xCLE9BQU8sRUFBRSxDQUFDO29CQUNYLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLFFBQWlDLENBQUM7UUFDdEMsSUFBSSxDQUFDO1lBQ0osUUFBUSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDYixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDckQsTUFBTSwyQkFBMkIsR0FBRyxnQkFBZ0I7ZUFDaEQsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO2VBQzVCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU5RSxJQUFJLDJCQUEyQixFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCw2R0FBNkc7UUFDN0csTUFBTSxTQUFTLEdBQUcsR0FBRyxVQUFVLElBQUksV0FBVyxVQUFVLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckcsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO1lBQ3BFLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsT0FBTyxFQUFFO2dCQUNSLEVBQUUsRUFBRSxTQUFTO2dCQUNiLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDO29CQUNuQixHQUFHLEVBQUUsZUFBZTtvQkFDcEIsT0FBTyxFQUFFLENBQUMsaU1BQWlNLENBQUM7aUJBQzVNLEVBQ0EsaUNBQWlDLEVBQ2pDLFFBQVEsQ0FBQyxLQUFLLEVBQ2QsYUFBYSxDQUFDO2FBQ2Y7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7WUFDdEQsRUFBRSxFQUFFLFNBQVM7WUFDYixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUMzQixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxPQUFPLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUU5RSxJQUFJLENBQUMsNEJBQTRCLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEosSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDNUUsQ0FBQztTQUNELENBQUMsQ0FBQztRQUdILElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFFeEcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEdBQUc7Z0JBQzlCLFdBQVcsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDO2dCQUN0RSxzQkFBc0IsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQzthQUNoRixDQUFDO1lBQ0YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUN4QyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNiLFdBQVcsRUFBRSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUM7b0JBQ3RDLHNCQUFzQixFQUFFLENBQUMsV0FBVyxDQUFDO2lCQUNyQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0QsQ0FBQTtBQTNjWSx3QkFBd0I7SUFhbEMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLCtCQUErQixDQUFBO0dBcEJyQix3QkFBd0IsQ0EyY3BDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQyJ9