/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ExternalUriResolverContribution } from './externalUriResolver.js';
import { manageTrustedDomainSettingsCommand } from './trustedDomains.js';
import { TrustedDomainsFileSystemProvider } from './trustedDomainsFileSystemProvider.js';
import { OpenerValidatorContributions } from './trustedDomainsValidator.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { ITrustedDomainService, TrustedDomainService } from './trustedDomainService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
class OpenUrlAction extends Action2 {
    static { this.STORAGE_KEY = 'workbench.action.url.openUrl.lastInput'; }
    constructor() {
        super({
            id: 'workbench.action.url.openUrl',
            title: localize2('openUrl', 'Open URL'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const urlService = accessor.get(IURLService);
        const storageService = accessor.get(IStorageService);
        const value = storageService.get(OpenUrlAction.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '');
        return quickInputService.input({ prompt: localize('urlToOpen', "URL to open"), value }).then(input => {
            if (input) {
                const uri = URI.parse(input);
                urlService.open(uri, { originalUrl: input });
                storageService.store(OpenUrlAction.STORAGE_KEY, input, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        });
    }
}
registerAction2(OpenUrlAction);
/**
 * Trusted Domains Contribution
 */
CommandsRegistry.registerCommand(manageTrustedDomainSettingsCommand);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: manageTrustedDomainSettingsCommand.id,
        title: manageTrustedDomainSettingsCommand.description.description
    }
});
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(OpenerValidatorContributions, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(TrustedDomainsFileSystemProvider.ID, TrustedDomainsFileSystemProvider, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ExternalUriResolverContribution.ID, ExternalUriResolverContribution, 2 /* WorkbenchPhase.BlockRestore */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.trustedDomains.promptInTrustedWorkspace': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            description: localize('workbench.trustedDomains.promptInTrustedWorkspace', "When enabled, trusted domain prompts will appear when opening links in trusted workspaces.")
        }
    }
});
registerSingleton(ITrustedDomainService, TrustedDomainService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL2Jyb3dzZXIvdXJsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFtRCw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RLLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQXNCLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIs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