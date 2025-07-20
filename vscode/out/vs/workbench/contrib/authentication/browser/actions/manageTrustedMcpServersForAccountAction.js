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
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow } from '../../../../../base/common/date.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../../services/authentication/common/authenticationQuery.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
export class ManageTrustedMcpServersForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedMCPServersForAccount',
            title: localize2('manageTrustedMcpServersForAccount', "Manage Trusted MCP Servers For Account"),
            category: localize2('accounts', "Accounts"),
            f1: true
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageTrustedMcpServersForAccountActionImpl).run(options);
    }
}
let ManageTrustedMcpServersForAccountActionImpl = class ManageTrustedMcpServersForAccountActionImpl {
    constructor(_mcpServerService, _dialogService, _quickInputService, _mcpServerAuthenticationService, _authenticationQueryService, _commandService) {
        this._mcpServerService = _mcpServerService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._mcpServerAuthenticationService = _mcpServerAuthenticationService;
        this._authenticationQueryService = _authenticationQueryService;
        this._commandService = _commandService;
    }
    async run(options) {
        const accountQuery = await this._resolveAccountQuery(options?.providerId, options?.accountLabel);
        if (!accountQuery) {
            return;
        }
        const items = await this._getItems(accountQuery);
        if (!items.length) {
            return;
        }
        const picker = this._createQuickPick(accountQuery);
        picker.items = items;
        picker.selectedItems = items.filter((i) => i.type !== 'separator' && !!i.picked);
        picker.show();
    }
    //#region Account Query Resolution
    async _resolveAccountQuery(providerId, accountLabel) {
        if (providerId && accountLabel) {
            return this._authenticationQueryService.provider(providerId).account(accountLabel);
        }
        const accounts = await this._getAllAvailableAccounts();
        const pick = await this._quickInputService.pick(accounts, {
            placeHolder: localize('pickAccount', "Pick an account to manage trusted MCP servers for"),
            matchOnDescription: true,
        });
        return pick ? this._authenticationQueryService.provider(pick.providerId).account(pick.label) : undefined;
    }
    async _getAllAvailableAccounts() {
        const accounts = [];
        for (const providerId of this._mcpServerAuthenticationService.getProviderIds()) {
            const provider = this._mcpServerAuthenticationService.getProvider(providerId);
            const sessions = await this._mcpServerAuthenticationService.getSessions(providerId);
            const uniqueLabels = new Set();
            for (const session of sessions) {
                if (!uniqueLabels.has(session.account.label)) {
                    uniqueLabels.add(session.account.label);
                    accounts.push({
                        providerId,
                        label: session.account.label,
                        description: provider.label
                    });
                }
            }
        }
        return accounts;
    }
    //#endregion
    //#region Item Retrieval and Quick Pick Creation
    async _getItems(accountQuery) {
        const allowedMcpServers = accountQuery.mcpServers().getAllowedMcpServers();
        const serverIdToLabel = new Map(this._mcpServerService.servers.get().map(s => [s.definition.id, s.definition.label]));
        const filteredMcpServers = allowedMcpServers
            // Filter out MCP servers that are not in the current list of servers
            .filter(server => serverIdToLabel.has(server.id))
            .map(server => {
            const usage = accountQuery.mcpServer(server.id).getUsage();
            return {
                ...server,
                // Use the server name from the MCP service
                name: serverIdToLabel.get(server.id),
                lastUsed: usage.length > 0 ? Math.max(...usage.map(u => u.lastUsed)) : server.lastUsed
            };
        });
        if (!filteredMcpServers.length) {
            this._dialogService.info(localize('noTrustedMcpServers', "This account has not been used by any MCP servers."));
            return [];
        }
        const trustedServers = filteredMcpServers.filter(s => s.trusted);
        const otherServers = filteredMcpServers.filter(s => !s.trusted);
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        return [
            ...otherServers.sort(sortByLastUsed).map(this._toQuickPickItem),
            { type: 'separator', label: localize('trustedMcpServers', "Trusted by Microsoft") },
            ...trustedServers.sort(sortByLastUsed).map(this._toQuickPickItem)
        ];
    }
    _toQuickPickItem(mcpServer) {
        const lastUsed = mcpServer.lastUsed;
        const description = lastUsed
            ? localize({ key: 'accountLastUsedDate', comment: ['The placeholder {0} is a string with time information, such as "3 days ago"'] }, "Last used this account {0}", fromNow(lastUsed, true))
            : localize('notUsed', "Has not used this account");
        let tooltip;
        let disabled;
        if (mcpServer.trusted) {
            tooltip = localize('trustedMcpServerTooltip', "This MCP server is trusted by Microsoft and\nalways has access to this account");
            disabled = true;
        }
        return {
            label: mcpServer.name,
            mcpServer,
            description,
            tooltip,
            disabled,
            buttons: [{
                    tooltip: localize('accountPreferences', "Manage account preferences for this MCP server"),
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                }],
            picked: mcpServer.allowed === undefined || mcpServer.allowed
        };
    }
    _createQuickPick(accountQuery) {
        const disposableStore = new DisposableStore();
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        // Configure quick pick
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize('manageTrustedMcpServers.cancel', 'Cancel');
        quickPick.title = localize('manageTrustedMcpServers', "Manage Trusted MCP Servers");
        quickPick.placeholder = localize('manageMcpServers', "Choose which MCP servers can access this account");
        // Set up event handlers
        disposableStore.add(quickPick.onDidAccept(() => {
            quickPick.hide();
            const allServers = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map((i) => i.mcpServer);
            const selectedServers = new Set(quickPick.selectedItems.map((i) => i.mcpServer));
            for (const mcpServer of allServers) {
                const isAllowed = selectedServers.has(mcpServer);
                accountQuery.mcpServer(mcpServer.id).setAccessAllowed(isAllowed, mcpServer.name);
            }
        }));
        disposableStore.add(quickPick.onDidHide(() => disposableStore.dispose()));
        disposableStore.add(quickPick.onDidCustom(() => quickPick.hide()));
        disposableStore.add(quickPick.onDidTriggerItemButton((e) => this._commandService.executeCommand('_manageAccountPreferencesForMcpServer', e.item.mcpServer.id, accountQuery.providerId)));
        return quickPick;
    }
};
ManageTrustedMcpServersForAccountActionImpl = __decorate([
    __param(0, IMcpService),
    __param(1, IDialogService),
    __param(2, IQuickInputService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationQueryService),
    __param(5, ICommandService)
], ManageTrustedMcpServersForAccountActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVHJ1c3RlZE1jcFNlcnZlcnNGb3JBY2NvdW50QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlVHJ1c3RlZE1jcFNlcnZlcnNGb3JBY2NvdW50QWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVDLE1BQU0seURBQXlELENBQUM7QUFFbEksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLDJCQUEyQixFQUFpQixNQUFNLG1FQUFtRSxDQUFDO0FBQy9ILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU5RCxNQUFNLE9BQU8sdUNBQXdD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