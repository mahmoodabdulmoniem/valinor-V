/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IDynamicAuthenticationProviderStorageService } from '../../../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
export class RemoveDynamicAuthenticationProvidersAction extends Action2 {
    static { this.ID = 'workbench.action.removeDynamicAuthenticationProviders'; }
    constructor() {
        super({
            id: RemoveDynamicAuthenticationProvidersAction.ID,
            title: localize2('removeDynamicAuthProviders', 'Remove Dynamic Authentication Providers'),
            category: localize2('authenticationCategory', 'Authentication'),
            f1: true
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const dynamicAuthStorageService = accessor.get(IDynamicAuthenticationProviderStorageService);
        const authenticationService = accessor.get(IAuthenticationService);
        const dialogService = accessor.get(IDialogService);
        const interactedProviders = dynamicAuthStorageService.getInteractedProviders();
        if (interactedProviders.length === 0) {
            await dialogService.info(localize('noDynamicProviders', 'No dynamic authentication providers'), localize('noDynamicProvidersDetail', 'No dynamic authentication providers have been used yet.'));
            return;
        }
        const items = interactedProviders.map(provider => ({
            label: provider.label,
            description: localize('clientId', 'Client ID: {0}', provider.clientId),
            provider
        }));
        const selected = await quickInputService.pick(items, {
            placeHolder: localize('selectProviderToRemove', 'Select a dynamic authentication provider to remove'),
            canPickMany: true
        });
        if (!selected || selected.length === 0) {
            return;
        }
        // Confirm deletion
        const providerNames = selected.map(item => item.provider.label).join(', ');
        const message = selected.length === 1
            ? localize('confirmDeleteSingleProvider', 'Are you sure you want to remove the dynamic authentication provider "{0}"?', providerNames)
            : localize('confirmDeleteMultipleProviders', 'Are you sure you want to remove {0} dynamic authentication providers: {1}?', selected.length, providerNames);
        const result = await dialogService.confirm({
            message,
            detail: localize('confirmDeleteDetail', 'This will remove all stored authentication data for the selected provider(s). You will need to re-authenticate if you use these providers again.'),
            primaryButton: localize('remove', 'Remove'),
            type: 'warning'
        });
        if (!result.confirmed) {
            return;
        }
        // Remove the selected providers
        for (const item of selected) {
            const providerId = item.provider.providerId;
            // Unregister from authentication service if still registered
            if (authenticationService.isAuthenticationProviderRegistered(providerId)) {
                authenticationService.unregisterAuthenticationProvider(providerId);
            }
            // Remove from dynamic storage service
            await dynamicAuthStorageService.removeDynamicProvider(providerId);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlRHluYW1pY0F1dGhlbnRpY2F0aW9uUHJvdmlkZXJzQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlRHluYW1pY0F1dGhlbnRpY2F0aW9uUHJvdmlkZXJzQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSx5REFBeUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsNENBQTRDLEVBQXFDLE1BQU0sb0ZBQW9GLENBQUM7QUFDckwsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBTW5GLE1BQU0sT0FBTywwQ0FBMkMsU0FBUSxPQUFPO2FBRXRELE9BQUUsR0FBRyx1REFBdUQsQ0FBQztJQUU3RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQ0FBMEMsQ0FBQyxFQUFFO1lBQ2pELEtBQUssRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUseUNBQXlDLENBQUM7WUFDekYsUUFBUSxFQUFFLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxnQkFBZ0IsQ0FBQztZQUMvRCxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcs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