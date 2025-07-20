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
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../../services/authentication/common/authenticationQuery.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
export class ManageAccountPreferencesForMcpServerAction extends Action2 {
    constructor() {
        super({
            id: '_manageAccountPreferencesForMcpServer',
            title: localize2('manageAccountPreferenceForMcpServer', "Manage MCP Server Account Preferences"),
            category: localize2('accounts', "Accounts"),
            f1: false
        });
    }
    run(accessor, mcpServerId, providerId) {
        return accessor.get(IInstantiationService).createInstance(ManageAccountPreferenceForMcpServerActionImpl).run(mcpServerId, providerId);
    }
}
let ManageAccountPreferenceForMcpServerActionImpl = class ManageAccountPreferenceForMcpServerActionImpl {
    constructor(_authenticationService, _quickInputService, _dialogService, _authenticationQueryService, _mcpService, _logService) {
        this._authenticationService = _authenticationService;
        this._quickInputService = _quickInputService;
        this._dialogService = _dialogService;
        this._authenticationQueryService = _authenticationQueryService;
        this._mcpService = _mcpService;
        this._logService = _logService;
    }
    async run(mcpServerId, providerId) {
        if (!mcpServerId) {
            return;
        }
        const mcpServer = this._mcpService.servers.get().find(s => s.definition.id === mcpServerId);
        if (!mcpServer) {
            throw new Error(`No MCP server with id ${mcpServerId}`);
        }
        if (!providerId) {
            // Use the query service's MCP server-centric approach to find providers that have been used
            const mcpServerQuery = this._authenticationQueryService.mcpServer(mcpServerId);
            const providersWithAccess = await mcpServerQuery.getProvidersWithAccess();
            if (!providersWithAccess.length) {
                await this._dialogService.info(localize('noAccountUsage', "This MCP server has not used any accounts yet."));
                return;
            }
            providerId = providersWithAccess[0]; // Default to the first provider
            if (providersWithAccess.length > 1) {
                const result = await this._quickInputService.pick(providersWithAccess.map(providerId => ({
                    label: this._authenticationService.getProvider(providerId).label,
                    id: providerId,
                })), {
                    placeHolder: localize('selectProvider', "Select an authentication provider to manage account preferences for"),
                    title: localize('pickAProviderTitle', "Manage MCP Server Account Preferences")
                });
                if (!result) {
                    return; // User cancelled
                }
                providerId = result.id;
            }
        }
        // Only fetch accounts for the chosen provider
        const accounts = await this._authenticationService.getAccounts(providerId);
        const currentAccountNamePreference = this._authenticationQueryService.provider(providerId).mcpServer(mcpServerId).getPreferredAccount();
        const items = this._getItems(accounts, providerId, currentAccountNamePreference);
        // If the provider supports multiple accounts, add an option to use a new account
        const provider = this._authenticationService.getProvider(providerId);
        if (provider.supportsMultipleAccounts) {
            // Get the last used scopes for the last used account. This will be used to pre-fill the scopes when adding a new account.
            // If there's no scopes, then don't add this option.
            const lastUsedScopes = accounts
                .flatMap(account => this._authenticationQueryService.provider(providerId).account(account.label).mcpServer(mcpServerId).getUsage())
                .sort((a, b) => b.lastUsed - a.lastUsed)[0]?.scopes; // Sort by timestamp and take the most recent
            if (lastUsedScopes) {
                items.push({ type: 'separator' });
                items.push({
                    providerId: providerId,
                    scopes: lastUsedScopes,
                    label: localize('use new account', "Use a new account..."),
                });
            }
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, mcpServerId, mcpServer.definition.label, provider.label);
        if (items.length === 0) {
            // We would only get here if we went through the Command Palette
            disposables.add(this._handleNoAccounts(picker));
            return;
        }
        picker.items = items;
        picker.show();
    }
    _createQuickPick(disposableStore, mcpServerId, mcpServerLabel, providerLabel) {
        const picker = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        disposableStore.add(picker.onDidHide(() => {
            disposableStore.dispose();
        }));
        picker.placeholder = localize('placeholder v2', "Manage '{0}' account preferences for {1}...", mcpServerLabel, providerLabel);
        picker.title = localize('title', "'{0}' Account Preferences For This Workspace", mcpServerLabel);
        picker.sortByLabel = false;
        disposableStore.add(picker.onDidAccept(async () => {
            picker.hide();
            await this._accept(mcpServerId, picker.selectedItems);
        }));
        return picker;
    }
    _getItems(accounts, providerId, currentAccountNamePreference) {
        return accounts.map(a => currentAccountNamePreference === a.label
            ? {
                label: a.label,
                account: a,
                providerId,
                description: localize('currentAccount', "Current account"),
                picked: true
            }
            : {
                label: a.label,
                account: a,
                providerId,
            });
    }
    _handleNoAccounts(picker) {
        picker.validationMessage = localize('noAccounts', "No accounts are currently used by this MCP server.");
        picker.buttons = [this._quickInputService.backButton];
        picker.show();
        return Event.filter(picker.onDidTriggerButton, (e) => e === this._quickInputService.backButton)(() => this.run());
    }
    async _accept(mcpServerId, selectedItems) {
        for (const item of selectedItems) {
            let account;
            if (!item.account) {
                try {
                    const session = await this._authenticationService.createSession(item.providerId, [...item.scopes]);
                    account = session.account;
                }
                catch (e) {
                    this._logService.error(e);
                    continue;
                }
            }
            else {
                account = item.account;
            }
            const providerId = item.providerId;
            const mcpQuery = this._authenticationQueryService.provider(providerId).mcpServer(mcpServerId);
            const currentAccountName = mcpQuery.getPreferredAccount();
            if (currentAccountName === account.label) {
                // This account is already the preferred account
                continue;
            }
            mcpQuery.setPreferredAccount(account);
        }
    }
};
ManageAccountPreferenceForMcpServerActionImpl = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IQuickInputService),
    __param(2, IDialogService),
    __param(3, IAuthenticationQueryService),
    __param(4, IMcpService),
    __param(5, ILogService)
], ManageAccountPreferenceForMcpServerActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yTWNwU2VydmVyQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yTWNwU2VydmVyQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUE4QyxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pJLE9BQU8sRUFBZ0Msc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNwSSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFOUQsTUFBTSxPQUFPLDBDQUEyQyxTQUFRLE9BQU87SUFDdEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUNBQXVDO1lBQzNDLEtBQUssRUFBRSxTQUFTLENBQUMs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