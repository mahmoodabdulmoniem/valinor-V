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
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageAccountPreferencesForExtensionAction extends Action2 {
    constructor() {
        super({
            id: '_manageAccountPreferencesForExtension',
            title: localize2('manageAccountPreferenceForExtension', "Manage Extension Account Preferences"),
            category: localize2('accounts', "Accounts"),
            f1: false
        });
    }
    run(accessor, extensionId, providerId) {
        return accessor.get(IInstantiationService).createInstance(ManageAccountPreferenceForExtensionActionImpl).run(extensionId, providerId);
    }
}
let ManageAccountPreferenceForExtensionActionImpl = class ManageAccountPreferenceForExtensionActionImpl {
    constructor(_authenticationService, _quickInputService, _dialogService, _authenticationQueryService, _extensionService, _logService) {
        this._authenticationService = _authenticationService;
        this._quickInputService = _quickInputService;
        this._dialogService = _dialogService;
        this._authenticationQueryService = _authenticationQueryService;
        this._extensionService = _extensionService;
        this._logService = _logService;
    }
    async run(extensionId, providerId) {
        if (!extensionId) {
            return;
        }
        const extension = await this._extensionService.getExtension(extensionId);
        if (!extension) {
            throw new Error(`No extension with id ${extensionId}`);
        }
        if (!providerId) {
            // Use the query service's extension-centric approach to find providers that have been used
            const extensionQuery = this._authenticationQueryService.extension(extensionId);
            const providersWithAccess = await extensionQuery.getProvidersWithAccess();
            if (!providersWithAccess.length) {
                await this._dialogService.info(localize('noAccountUsage', "This extension has not used any accounts yet."));
                return;
            }
            providerId = providersWithAccess[0]; // Default to the first provider
            if (providersWithAccess.length > 1) {
                const result = await this._quickInputService.pick(providersWithAccess.map(providerId => ({
                    label: this._authenticationService.getProvider(providerId).label,
                    id: providerId,
                })), {
                    placeHolder: localize('selectProvider', "Select an authentication provider to manage account preferences for"),
                    title: localize('pickAProviderTitle', "Manage Extension Account Preferences")
                });
                if (!result) {
                    return; // User cancelled
                }
                providerId = result.id;
            }
        }
        // Only fetch accounts for the chosen provider
        const accounts = await this._authenticationService.getAccounts(providerId);
        const currentAccountNamePreference = this._authenticationQueryService.provider(providerId).extension(extensionId).getPreferredAccount();
        const items = this._getItems(accounts, providerId, currentAccountNamePreference);
        // If the provider supports multiple accounts, add an option to use a new account
        const provider = this._authenticationService.getProvider(providerId);
        if (provider.supportsMultipleAccounts) {
            // Get the last used scopes for the last used account. This will be used to pre-fill the scopes when adding a new account.
            // If there's no scopes, then don't add this option.
            const lastUsedScopes = accounts
                .flatMap(account => this._authenticationQueryService.provider(providerId).account(account.label).extension(extensionId).getUsage())
                .sort((a, b) => b.lastUsed - a.lastUsed)[0]?.scopes; // Sort by timestamp and take the most recent
            if (lastUsedScopes) {
                items.push({ type: 'separator' });
                items.push({
                    providerId,
                    scopes: lastUsedScopes,
                    label: localize('use new account', "Use a new account..."),
                });
            }
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, extensionId, extension.displayName ?? extension.name, provider.label);
        if (items.length === 0) {
            // We would only get here if we went through the Command Palette
            disposables.add(this._handleNoAccounts(picker));
            return;
        }
        picker.items = items;
        picker.show();
    }
    _createQuickPick(disposableStore, extensionId, extensionLabel, providerLabel) {
        const picker = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        disposableStore.add(picker.onDidHide(() => {
            disposableStore.dispose();
        }));
        picker.placeholder = localize('placeholder v2', "Manage '{0}' account preferences for {1}...", extensionLabel, providerLabel);
        picker.title = localize('title', "'{0}' Account Preferences For This Workspace", extensionLabel);
        picker.sortByLabel = false;
        disposableStore.add(picker.onDidAccept(async () => {
            picker.hide();
            await this._accept(extensionId, picker.selectedItems);
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
        picker.validationMessage = localize('noAccounts', "No accounts are currently used by this extension.");
        picker.buttons = [this._quickInputService.backButton];
        picker.show();
        return Event.filter(picker.onDidTriggerButton, (e) => e === this._quickInputService.backButton)(() => this.run());
    }
    async _accept(extensionId, selectedItems) {
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
            const extensionQuery = this._authenticationQueryService.provider(providerId).extension(extensionId);
            const currentAccountName = extensionQuery.getPreferredAccount();
            if (currentAccountName === account.label) {
                // This account is already the preferred account
                continue;
            }
            extensionQuery.setPreferredAccount(account);
        }
    }
};
ManageAccountPreferenceForExtensionActionImpl = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IQuickInputService),
    __param(2, IDialogService),
    __param(3, IAuthenticationQueryService),
    __param(4, IExtensionService),
    __param(5, ILogService)
], ManageAccountPreferenceForExtensionActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUE4QyxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pJLE9BQU8sRUFBZ0Msc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNwSSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV6RixNQUFNLE9BQU8sMENBQTJDLFNBQVEsT0FBTztJQUN0RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1Q0FBdUM7WUFDM0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQ0FBcUMsRUFBRSxzQ0FBc0MsQ0FBQztZQUMvRixRQUFRLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7WUFDM0MsRUFBRSxFQUFFLEtBQUs7U0FDVCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCLEVBQUUsV0FBb0IsRUFBRSxVQUFtQjtRQUNqRixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUMsNkNBQTZDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZJLENBQUM7Q0FDRDtBQWdCRCxJQUFNLDZDQUE2QyxHQUFuRCxNQUFNLDZDQUE2QztJQUNsRCxZQUMwQyxzQkFBOEMsRUFDbEQsa0JBQXNDLEVBQzFDLGNBQThCLEVBQ2pCLDJCQUF3RCxFQUNsRSxpQkFBb0MsRUFDMUMsV0FBd0I7UUFMYiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ2xELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDMUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ2pCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDbEUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUMxQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtJQUNuRCxDQUFDO0lBRUwsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFvQixFQUFFLFVBQW1CO1FBQ2xELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLDJGQUEyRjtZQUMzRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQy9FLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxjQUFjLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUMxRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLCtDQUErQyxDQUFDLENBQUMsQ0FBQztnQkFDNUcsT0FBTztZQUNSLENBQUM7WUFDRCxVQUFVLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7WUFDckUsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FDaEQsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdEMsS0FBSyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSztvQkFDaEUsRUFBRSxFQUFFLFVBQVU7aUJBQ2QsQ0FBQyxDQUFDLEVBQ0g7b0JBQ0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxxRUFBcUUsQ0FBQztvQkFDOUcsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxzQ0FBc0MsQ0FBQztpQkFDN0UsQ0FDRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixPQUFPLENBQUMsaUJBQWlCO2dCQUMxQixDQUFDO2dCQUNELFVBQVUsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsOENBQThDO1FBQzlDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzRSxNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDeEksTUFBTSxLQUFLLEdBQTBELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBRXhJLGlGQUFpRjtRQUNqRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksUUFBUSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDdkMsMEhBQTBIO1lBQzFILG9EQUFvRDtZQUNwRCxNQUFNLGNBQWMsR0FBRyxRQUFRO2lCQUM3QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2lCQUNsSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyw2Q0FBNkM7WUFDbkcsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNWLFVBQVU7b0JBQ1YsTUFBTSxFQUFFLGNBQWM7b0JBQ3RCLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsc0JBQXNCLENBQUM7aUJBQzFELENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hILElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixnRUFBZ0U7WUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRCxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxlQUFnQyxFQUFFLFdBQW1CLEVBQUUsY0FBc0IsRUFBRSxhQUFxQjtRQUM1SCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQWlDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNySSxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ3pDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsNkNBQTZDLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlILE1BQU0sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSw4Q0FBOEMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUMzQixlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDakQsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxRQUFxRCxFQUFFLFVBQWtCLEVBQUUsNEJBQWdEO1FBQzVJLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBaUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyw0QkFBNEIsS0FBSyxDQUFDLENBQUMsS0FBSztZQUNoSCxDQUFDLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO2dCQUNkLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFVBQVU7Z0JBQ1YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQztnQkFDMUQsTUFBTSxFQUFFLElBQUk7YUFDWjtZQUNELENBQUMsQ0FBQztnQkFDRCxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsVUFBVTthQUNWLENBQ0QsQ0FBQztJQUNILENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxNQUEyRDtRQUNwRixNQUFNLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxtREFBbUQsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNuSCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFtQixFQUFFLGFBQTREO1FBQ3RHLEtBQUssTUFBTSxJQUFJLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEMsSUFBSSxPQUFxQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQztvQkFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ25HLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUMzQixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLFNBQVM7Z0JBQ1YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUN4QixDQUFDO1lBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNwRyxNQUFNLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hFLElBQUksa0JBQWtCLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUMxQyxnREFBZ0Q7Z0JBQ2hELFNBQVM7WUFDVixDQUFDO1lBQ0QsY0FBYyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQS9JSyw2Q0FBNkM7SUFFaEQsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0dBUFIsNkNBQTZDLENBK0lsRCJ9