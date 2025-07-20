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
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageTrustedExtensionsForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedExtensionsForAccount',
            title: localize2('manageTrustedExtensionsForAccount', "Manage Trusted Extensions For Account"),
            category: localize2('accounts', "Accounts"),
            f1: true
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageTrustedExtensionsForAccountActionImpl).run(options);
    }
}
let ManageTrustedExtensionsForAccountActionImpl = class ManageTrustedExtensionsForAccountActionImpl {
    constructor(_extensionService, _dialogService, _quickInputService, _authenticationService, _authenticationQueryService, _commandService) {
        this._extensionService = _extensionService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._authenticationService = _authenticationService;
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
            placeHolder: localize('pickAccount', "Pick an account to manage trusted extensions for"),
            matchOnDescription: true,
        });
        return pick ? this._authenticationQueryService.provider(pick.providerId).account(pick.label) : undefined;
    }
    async _getAllAvailableAccounts() {
        const accounts = [];
        for (const providerId of this._authenticationService.getProviderIds()) {
            const provider = this._authenticationService.getProvider(providerId);
            const sessions = await this._authenticationService.getSessions(providerId);
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
        const allowedExtensions = accountQuery.extensions().getAllowedExtensions();
        const extensionIdToDisplayName = new Map();
        // Get display names for all allowed extensions
        const resolvedExtensions = await Promise.all(allowedExtensions.map(ext => this._extensionService.getExtension(ext.id)));
        resolvedExtensions.forEach((resolved, i) => {
            if (resolved) {
                extensionIdToDisplayName.set(allowedExtensions[i].id, resolved.displayName || resolved.name);
            }
        });
        // Filter out extensions that are not currently installed and enrich with display names
        const filteredExtensions = allowedExtensions
            .filter(ext => extensionIdToDisplayName.has(ext.id))
            .map(ext => {
            const usage = accountQuery.extension(ext.id).getUsage();
            return {
                ...ext,
                // Use the extension display name from the extension service
                name: extensionIdToDisplayName.get(ext.id),
                lastUsed: usage.length > 0 ? Math.max(...usage.map(u => u.lastUsed)) : ext.lastUsed
            };
        });
        if (!filteredExtensions.length) {
            this._dialogService.info(localize('noTrustedExtensions', "This account has not been used by any extensions."));
            return [];
        }
        const trustedExtensions = filteredExtensions.filter(e => e.trusted);
        const otherExtensions = filteredExtensions.filter(e => !e.trusted);
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        return [
            ...otherExtensions.sort(sortByLastUsed).map(this._toQuickPickItem),
            { type: 'separator', label: localize('trustedExtensions', "Trusted by Microsoft") },
            ...trustedExtensions.sort(sortByLastUsed).map(this._toQuickPickItem)
        ];
    }
    _toQuickPickItem(extension) {
        const lastUsed = extension.lastUsed;
        const description = lastUsed
            ? localize({ key: 'accountLastUsedDate', comment: ['The placeholder {0} is a string with time information, such as "3 days ago"'] }, "Last used this account {0}", fromNow(lastUsed, true))
            : localize('notUsed', "Has not used this account");
        let tooltip;
        let disabled;
        if (extension.trusted) {
            tooltip = localize('trustedExtensionTooltip', "This extension is trusted by Microsoft and\nalways has access to this account");
            disabled = true;
        }
        return {
            label: extension.name,
            extension,
            description,
            tooltip,
            disabled,
            buttons: [{
                    tooltip: localize('accountPreferences', "Manage account preferences for this extension"),
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                }],
            picked: extension.allowed === undefined || extension.allowed
        };
    }
    _createQuickPick(accountQuery) {
        const disposableStore = new DisposableStore();
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        // Configure quick pick
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize('manageTrustedExtensions.cancel', 'Cancel');
        quickPick.title = localize('manageTrustedExtensions', "Manage Trusted Extensions");
        quickPick.placeholder = localize('manageExtensions', "Choose which extensions can access this account");
        // Set up event handlers
        disposableStore.add(quickPick.onDidAccept(() => {
            const updatedAllowedList = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map(i => i.extension);
            const allowedExtensionsSet = new Set(quickPick.selectedItems.map(i => i.extension));
            for (const extension of updatedAllowedList) {
                const allowed = allowedExtensionsSet.has(extension);
                accountQuery.extension(extension.id).setAccessAllowed(allowed, extension.name);
            }
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidHide(() => disposableStore.dispose()));
        disposableStore.add(quickPick.onDidCustom(() => quickPick.hide()));
        disposableStore.add(quickPick.onDidTriggerItemButton(e => this._commandService.executeCommand('_manageAccountPreferencesForExtension', e.item.extension.id, accountQuery.providerId)));
        return quickPick;
    }
};
ManageTrustedExtensionsForAccountActionImpl = __decorate([
    __param(0, IExtensionService),
    __param(1, IDialogService),
    __param(2, IQuickInputService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationQueryService),
    __param(5, ICommandService)
], ManageTrustedExtensionsForAccountActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVDLE1BQU0seURBQXlELENBQUM7QUFDbEksT0FBTyxFQUFvQixzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSwyQkFBMkIsRUFBaUIsTUFBTSxtRUFBbUUsQ0FBQztBQUMvSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV6RixNQUFNLE9BQU8sdUNB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