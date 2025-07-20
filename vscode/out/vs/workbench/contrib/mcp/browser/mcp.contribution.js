/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { ExtensionMcpDiscovery } from '../common/discovery/extensionMcpDiscovery.js';
import { InstalledMcpServersDiscovery } from '../common/discovery/installedMcpServersDiscovery.js';
import { mcpDiscoveryRegistry } from '../common/discovery/mcpDiscovery.js';
import { RemoteNativeMpcDiscovery } from '../common/discovery/nativeMcpRemoteDiscovery.js';
import { CursorWorkspaceMcpDiscoveryAdapter } from '../common/discovery/workspaceMcpDiscoveryAdapter.js';
import { mcpServerSchema } from '../common/mcpConfiguration.js';
import { McpContextKeysController } from '../common/mcpContextKeys.js';
import { IMcpDevModeDebugging, McpDevModeDebugging } from '../common/mcpDevMode.js';
import { McpRegistry } from '../common/mcpRegistry.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { McpResourceFilesystem } from '../common/mcpResourceFilesystem.js';
import { McpSamplingService } from '../common/mcpSamplingService.js';
import { McpService } from '../common/mcpService.js';
import { IMcpElicitationService, IMcpSamplingService, IMcpService, IMcpWorkbenchService } from '../common/mcpTypes.js';
import { McpAddContextContribution } from './mcpAddContextContribution.js';
import { AddConfigurationAction, BrowseMcpServersPageCommand, EditStoredInput, ListMcpServerCommand, McpBrowseCommand, McpBrowseResourcesCommand, McpConfigureSamplingModels, MCPServerActionRendering, McpServerOptionsCommand, McpStartPromptingServerCommand, OpenRemoteUserMcpResourceCommand, OpenUserMcpResourceCommand, OpenWorkspaceFolderMcpResourceCommand, OpenWorkspaceMcpResourceCommand, RemoveStoredInput, ResetMcpCachedTools, ResetMcpTrustCommand, RestartServer, ShowConfiguration, ShowInstalledMcpServersCommand, ShowOutput, StartServer, StopServer } from './mcpCommands.js';
import { McpDiscovery } from './mcpDiscovery.js';
import { McpElicitationService } from './mcpElicitationService.js';
import { McpLanguageFeatures } from './mcpLanguageFeatures.js';
import { McpConfigMigrationContribution } from './mcpMigration.js';
import { McpResourceQuickAccess } from './mcpResourceQuickAccess.js';
import { McpServerEditor } from './mcpServerEditor.js';
import { McpServerEditorInput } from './mcpServerEditorInput.js';
import { McpServersViewsContribution } from './mcpServersView.js';
import { MCPContextsInitialisation, McpWorkbenchService } from './mcpWorkbenchService.js';
registerSingleton(IMcpRegistry, McpRegistry, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpService, McpService, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpWorkbenchService, McpWorkbenchService, 0 /* InstantiationType.Eager */);
registerSingleton(IMcpDevModeDebugging, McpDevModeDebugging, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpSamplingService, McpSamplingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpElicitationService, McpElicitationService, 1 /* InstantiationType.Delayed */);
mcpDiscoveryRegistry.register(new SyncDescriptor(RemoteNativeMpcDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(InstalledMcpServersDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(ExtensionMcpDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(CursorWorkspaceMcpDiscoveryAdapter));
registerWorkbenchContribution2('mcpDiscovery', McpDiscovery, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2('mcpContextKeys', McpContextKeysController, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2('mcpLanguageFeatures', McpLanguageFeatures, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2('mcpResourceFilesystem', McpResourceFilesystem, 2 /* WorkbenchPhase.BlockRestore */);
registerAction2(ListMcpServerCommand);
registerAction2(McpServerOptionsCommand);
registerAction2(ResetMcpTrustCommand);
registerAction2(ResetMcpCachedTools);
registerAction2(AddConfigurationAction);
registerAction2(RemoveStoredInput);
registerAction2(EditStoredInput);
registerAction2(StartServer);
registerAction2(StopServer);
registerAction2(ShowOutput);
registerAction2(RestartServer);
registerAction2(ShowConfiguration);
registerAction2(McpBrowseCommand);
registerAction2(BrowseMcpServersPageCommand);
registerAction2(OpenUserMcpResourceCommand);
registerAction2(OpenRemoteUserMcpResourceCommand);
registerAction2(OpenWorkspaceMcpResourceCommand);
registerAction2(OpenWorkspaceFolderMcpResourceCommand);
registerAction2(ShowInstalledMcpServersCommand);
registerAction2(McpBrowseResourcesCommand);
registerAction2(McpConfigureSamplingModels);
registerAction2(McpStartPromptingServerCommand);
registerWorkbenchContribution2('mcpActionRendering', MCPServerActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2('mcpAddContext', McpAddContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(MCPContextsInitialisation.ID, MCPContextsInitialisation, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(McpConfigMigrationContribution.ID, McpConfigMigrationContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(McpServersViewsContribution.ID, McpServersViewsContribution, 3 /* WorkbenchPhase.AfterRestored */);
const jsonRegistry = Registry.as(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchema(mcpSchemaId, mcpServerSchema);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(McpServerEditor, McpServerEditor.ID, localize('mcpServer', "MCP Server")), [
    new SyncDescriptor(McpServerEditorInput)
]);
Registry.as(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: McpResourceQuickAccess,
    prefix: McpResourceQuickAccess.PREFIX,
    placeholder: localize('mcp.quickaccess.placeholder', "Filter to an MCP resource"),
    helpEntries: [{
            description: localize('mcp.quickaccess.add', "MCP Server Resources"),
            commandId: "workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */
        }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFDO0FBQ2hILE9BQU8sRUFBd0IsVUFBVSxJQUFJLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FB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