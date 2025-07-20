/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { IAuthenticationAccessService } from '../../../../services/authentication/browser/authenticationAccessService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../../../services/authentication/common/authentication.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
class ManageLanguageModelAuthenticationAction extends Action2 {
    static { this.ID = 'workbench.action.chat.manageLanguageModelAuthentication'; }
    constructor() {
        super({
            id: ManageLanguageModelAuthenticationAction.ID,
            title: localize2('manageLanguageModelAuthentication', 'Manage Language Model Access...'),
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.enabled,
            menu: [{
                    id: MenuId.AccountsContext,
                    order: 100,
                }],
            f1: true
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const languageModelsService = accessor.get(ILanguageModelsService);
        const authenticationAccessService = accessor.get(IAuthenticationAccessService);
        const dialogService = accessor.get(IDialogService);
        const extensionService = accessor.get(IExtensionService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const productService = accessor.get(IProductService);
        // Get all registered language models
        const modelIds = languageModelsService.getLanguageModelIds();
        // Group models by owning extension and collect all allowed extensions
        const extensionAuth = new Map();
        const ownerToAccountLabel = new Map();
        for (const modelId of modelIds) {
            const model = languageModelsService.lookupLanguageModel(modelId);
            if (!model?.auth) {
                continue; // Skip if model is not found
            }
            const ownerId = model.extension.value;
            if (extensionAuth.has(ownerId)) {
                // If the owner already exists, just continue
                continue;
            }
            // Get allowed extensions for this model's auth provider
            try {
                // Use providerLabel as the providerId and accountLabel (or default)
                const providerId = INTERNAL_AUTH_PROVIDER_PREFIX + ownerId;
                const accountLabel = model.auth.accountLabel || 'Language Models';
                ownerToAccountLabel.set(ownerId, accountLabel);
                const allowedExtensions = authenticationAccessService.readAllowedExtensions(providerId, accountLabel).filter(ext => !ext.trusted); // Filter out trusted extensions because those should not be modified
                if (productService.trustedExtensionAuthAccess && !Array.isArray(productService.trustedExtensionAuthAccess)) {
                    const trustedExtensions = productService.trustedExtensionAuthAccess[providerId];
                    // If the provider is trusted, add all trusted extensions to the allowed list
                    for (const ext of trustedExtensions) {
                        const index = allowedExtensions.findIndex(a => a.id === ext);
                        if (index !== -1) {
                            allowedExtensions.splice(index, 1);
                        }
                        const extension = await extensionService.getExtension(ext);
                        if (!extension) {
                            continue; // Skip if the extension is not found
                        }
                        allowedExtensions.push({
                            id: ext,
                            name: extension.displayName || extension.name,
                            allowed: true, // Assume trusted extensions are allowed by default
                            trusted: true // Mark as trusted
                        });
                    }
                }
                // Only grab extensions that are gettable from the extension service
                const filteredExtensions = new Array();
                for (const ext of allowedExtensions) {
                    if (await extensionService.getExtension(ext.id)) {
                        filteredExtensions.push(ext);
                    }
                }
                extensionAuth.set(ownerId, filteredExtensions);
                // Add all allowed extensions to the set for this owner
            }
            catch (error) {
                // Handle error by ensuring the owner is in the map
                if (!extensionAuth.has(ownerId)) {
                    extensionAuth.set(ownerId, []);
                }
            }
        }
        if (extensionAuth.size === 0) {
            dialogService.prompt({
                type: 'info',
                message: localize('noLanguageModels', 'No language models requiring authentication found.'),
                detail: localize('noLanguageModelsDetail', 'There are currently no language models that require authentication.')
            });
            return;
        }
        const items = [];
        // Create QuickPick items grouped by owner extension
        for (const [ownerId, allowedExtensions] of extensionAuth) {
            const extension = await extensionService.getExtension(ownerId);
            if (!extension) {
                // If the extension is not found, skip it
                continue;
            }
            // Add separator for the owning extension
            items.push({
                type: 'separator',
                id: ownerId,
                label: localize('extensionOwner', '{0}', extension.displayName || extension.name),
                buttons: [{
                        iconClass: ThemeIcon.asClassName(Codicon.info),
                        tooltip: localize('openExtension', 'Open Extension'),
                    }]
            });
            // Add allowed extensions as checkboxes (visual representation)
            let addedTrustedSeparator = false;
            if (allowedExtensions.length > 0) {
                for (const allowedExt of allowedExtensions) {
                    if (allowedExt.trusted && !addedTrustedSeparator) {
                        items.push({
                            type: 'separator',
                            label: localize('trustedExtension', 'Trusted by Microsoft'),
                        });
                        addedTrustedSeparator = true;
                    }
                    items.push({
                        label: allowedExt.name,
                        ownerId,
                        id: allowedExt.id,
                        picked: allowedExt.allowed ?? false,
                        extension: allowedExt,
                        disabled: allowedExt.trusted, // Don't allow toggling trusted extensions
                        buttons: [{
                                iconClass: ThemeIcon.asClassName(Codicon.info),
                                tooltip: localize('openExtension', 'Open Extension'),
                            }]
                    });
                }
            }
            else {
                items.push({
                    label: localize('noAllowedExtensions', 'No extensions have access'),
                    description: localize('noAccessDescription', 'No extensions are currently allowed to use models from {0}', ownerId),
                    pickable: false
                });
            }
        }
        // Show the QuickPick
        const result = await quickInputService.pick(items, {
            canPickMany: true,
            sortByLabel: true,
            onDidTriggerSeparatorButton(context) {
                // Handle separator button clicks
                const extId = context.separator.id;
                if (extId) {
                    // Open the extension in the editor
                    void extensionsWorkbenchService.open(extId);
                }
            },
            onDidTriggerItemButton(context) {
                // Handle item button clicks
                const extId = context.item.id;
                if (extId) {
                    // Open the extension in the editor
                    void extensionsWorkbenchService.open(extId);
                }
            },
            title: localize('languageModelAuthTitle', 'Manage Language Model Access'),
            placeHolder: localize('languageModelAuthPlaceholder', 'Choose which extensions can access language models'),
        });
        if (!result) {
            return;
        }
        for (const [ownerId, allowedExtensions] of extensionAuth) {
            // diff with result to find out which extensions are allowed or not
            // but we need to only look at the result items that have the ownerId
            const allowedSet = new Set(result
                .filter(item => item.ownerId === ownerId)
                // only save items that are not trusted automatically
                .filter(item => !item.extension?.trusted)
                .map(item => item.id));
            for (const allowedExt of allowedExtensions) {
                allowedExt.allowed = allowedSet.has(allowedExt.id);
            }
            authenticationAccessService.updateAllowedExtensions(INTERNAL_AUTH_PROVIDER_PREFIX + ownerId, ownerToAccountLabel.get(ownerId) || 'Language Models', allowedExtensions);
        }
    }
}
export function registerLanguageModelActions() {
    registerAction2(ManageLanguageModelAuthenticationAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdExhbmd1YWdlTW9kZWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0TGFuZ3VhZ2VNb2RlbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFckcsT0FBTyxFQUFFLGtCQUFrQixFQUFrQyxNQUFNLHlEQUF5RCxDQUFDO0FBQzdILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQzFILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFvQiw2QkFBNkIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxF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