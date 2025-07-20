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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { SignOutOfAccountAction } from './actions/signOutOfAccountAction.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ManageTrustedExtensionsForAccountAction } from './actions/manageTrustedExtensionsForAccountAction.js';
import { ManageAccountPreferencesForExtensionAction } from './actions/manageAccountPreferencesForExtensionAction.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { ManageAccountPreferencesForMcpServerAction } from './actions/manageAccountPreferencesForMcpServerAction.js';
import { ManageTrustedMcpServersForAccountAction } from './actions/manageTrustedMcpServersForAccountAction.js';
import { RemoveDynamicAuthenticationProvidersAction } from './actions/manageDynamicAuthenticationProvidersAction.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { IMcpRegistry } from '../../mcp/common/mcpRegistryTypes.js';
import { autorun } from '../../../../base/common/observable.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { Event } from '../../../../base/common/event.js';
const codeExchangeProxyCommand = CommandsRegistry.registerCommand('workbench.getCodeExchangeProxyEndpoints', function (accessor, _) {
    const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
    return environmentService.options?.codeExchangeProxyEndpoints;
});
class AuthenticationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.authentication;
    }
    render(manifest) {
        const authentication = manifest.contributes?.authentication || [];
        if (!authentication.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('authenticationlabel', "Label"),
            localize('authenticationid', "ID"),
            localize('authenticationMcpAuthorizationServers', "MCP Authorization Servers")
        ];
        const rows = authentication
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(auth => {
            return [
                auth.label,
                auth.id,
                (auth.authorizationServerGlobs ?? []).join(',\n')
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
const extensionFeature = Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'authentication',
    label: localize('authentication', "Authentication"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(AuthenticationDataRenderer),
});
class AuthenticationContribution extends Disposable {
    static { this.ID = 'workbench.contrib.authentication'; }
    constructor() {
        super();
        this._register(codeExchangeProxyCommand);
        this._register(extensionFeature);
        this._registerActions();
    }
    _registerActions() {
        this._register(registerAction2(SignOutOfAccountAction));
        this._register(registerAction2(ManageTrustedExtensionsForAccountAction));
        this._register(registerAction2(ManageAccountPreferencesForExtensionAction));
        this._register(registerAction2(ManageTrustedMcpServersForAccountAction));
        this._register(registerAction2(ManageAccountPreferencesForMcpServerAction));
        this._register(registerAction2(RemoveDynamicAuthenticationProvidersAction));
    }
}
let AuthenticationUsageContribution = class AuthenticationUsageContribution {
    static { this.ID = 'workbench.contrib.authenticationUsage'; }
    constructor(_authenticationUsageService) {
        this._authenticationUsageService = _authenticationUsageService;
        this._initializeExtensionUsageCache();
    }
    async _initializeExtensionUsageCache() {
        await this._authenticationUsageService.initializeExtensionUsageCache();
    }
};
AuthenticationUsageContribution = __decorate([
    __param(0, IAuthenticationUsageService)
], AuthenticationUsageContribution);
// class AuthenticationExtensionsContribution extends Disposable implements IWorkbenchContribution {
// 	static ID = 'workbench.contrib.authenticationExtensions';
// 	constructor(
// 		@IExtensionService private readonly _extensionService: IExtensionService,
// 		@IAuthenticationQueryService private readonly _authenticationQueryService: IAuthenticationQueryService,
// 		@IAuthenticationService private readonly _authenticationService: IAuthenticationService
// 	) {
// 		super();
// 		void this.run();
// 		this._register(this._extensionService.onDidChangeExtensions(this._onDidChangeExtensions, this));
// 		this._register(
// 			Event.any(
// 				this._authenticationService.onDidChangeDeclaredProviders,
// 				this._authenticationService.onDidRegisterAuthenticationProvider
// 			)(() => this._cleanupRemovedExtensions())
// 		);
// 	}
// 	async run(): Promise<void> {
// 		await this._extensionService.whenInstalledExtensionsRegistered();
// 		this._cleanupRemovedExtensions();
// 	}
// 	private _onDidChangeExtensions(delta: { readonly added: readonly IExtensionDescription[]; readonly removed: readonly IExtensionDescription[] }): void {
// 		if (delta.removed.length > 0) {
// 			this._cleanupRemovedExtensions(delta.removed);
// 		}
// 	}
// 	private _cleanupRemovedExtensions(removedExtensions?: readonly IExtensionDescription[]): void {
// 		const extensionIdsToRemove = removedExtensions
// 			? new Set(removedExtensions.map(e => e.identifier.value))
// 			: new Set(this._extensionService.extensions.map(e => e.identifier.value));
// 		// If we are cleaning up specific removed extensions, we only remove those.
// 		const isTargetedCleanup = !!removedExtensions;
// 		const providerIds = this._authenticationQueryService.getProviderIds();
// 		for (const providerId of providerIds) {
// 			this._authenticationQueryService.provider(providerId).forEachAccount(account => {
// 				account.extensions().forEach(extension => {
// 					const shouldRemove = isTargetedCleanup
// 						? extensionIdsToRemove.has(extension.extensionId)
// 						: !extensionIdsToRemove.has(extension.extensionId);
// 					if (shouldRemove) {
// 						extension.removeUsage();
// 						extension.setAccessAllowed(false);
// 					}
// 				});
// 			});
// 		}
// 	}
// }
let AuthenticationMcpContribution = class AuthenticationMcpContribution extends Disposable {
    static { this.ID = 'workbench.contrib.authenticationMcp'; }
    constructor(_mcpRegistry, _authenticationQueryService, _authenticationService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._authenticationQueryService = _authenticationQueryService;
        this._authenticationService = _authenticationService;
        this._cleanupRemovedMcpServers();
        // Listen for MCP collections changes using autorun with observables
        this._register(autorun(reader => {
            // Read the collections observable to register dependency
            this._mcpRegistry.collections.read(reader);
            // Schedule cleanup for next tick to avoid running during observable updates
            queueMicrotask(() => this._cleanupRemovedMcpServers());
        }));
        this._register(Event.any(this._authenticationService.onDidChangeDeclaredProviders, this._authenticationService.onDidRegisterAuthenticationProvider)(() => this._cleanupRemovedMcpServers()));
    }
    _cleanupRemovedMcpServers() {
        const currentServerIds = new Set(this._mcpRegistry.collections.get().flatMap(c => c.serverDefinitions.get()).map(s => s.id));
        const providerIds = this._authenticationQueryService.getProviderIds();
        for (const providerId of providerIds) {
            this._authenticationQueryService.provider(providerId).forEachAccount(account => {
                account.mcpServers().forEach(server => {
                    if (!currentServerIds.has(server.mcpServerId)) {
                        server.removeUsage();
                        server.setAccessAllowed(false);
                    }
                });
            });
        }
    }
};
AuthenticationMcpContribution = __decorate([
    __param(0, IMcpRegistry),
    __param(1, IAuthenticationQueryService),
    __param(2, IAuthenticationService)
], AuthenticationMcpContribution);
registerWorkbenchContribution2(AuthenticationContribution.ID, AuthenticationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(AuthenticationUsageContribution.ID, AuthenticationUsageContribution, 4 /* WorkbenchPhase.Eventually */);
// registerWorkbenchContribution2(AuthenticationExtensionsContribution.ID, AuthenticationExtensionsContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(AuthenticationMcpContribution.ID, AuthenticationMcpContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsVUFBVSxFQUFtRyxNQUFNLG1FQUFtRSxDQUFDO0FBQ2hNLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ3JILE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JILE9BQU8sRUFB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