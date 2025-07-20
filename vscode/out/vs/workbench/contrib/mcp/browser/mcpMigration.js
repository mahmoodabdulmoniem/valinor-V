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
import { ILogService } from '../../../../platform/log/common/log.js';
import { mcpConfigurationSection } from '../../../contrib/mcp/common/mcpConfiguration.js';
import { IWorkbenchMcpManagementService } from '../../../services/mcp/common/mcpWorkbenchManagementService.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { parse } from '../../../../base/common/jsonc.js';
import { isObject } from '../../../../base/common/types.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { localize } from '../../../../nls.js';
let McpConfigMigrationContribution = class McpConfigMigrationContribution extends Disposable {
    static { this.ID = 'workbench.mcp.config.migration'; }
    constructor(mcpManagementService, userDataProfileService, fileService, remoteAgentService, jsonEditingService, logService, notificationService, commandService) {
        super();
        this.mcpManagementService = mcpManagementService;
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.jsonEditingService = jsonEditingService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.migrateMcpConfig();
    }
    async migrateMcpConfig() {
        try {
            const userMcpConfig = await this.parseMcpConfig(this.userDataProfileService.currentProfile.settingsResource);
            if (userMcpConfig && userMcpConfig.servers && Object.keys(userMcpConfig.servers).length > 0) {
                await Promise.all(Object.entries(userMcpConfig.servers).map(([name, config], index) => this.mcpManagementService.install({ name, config, inputs: index === 0 ? userMcpConfig.inputs : undefined })));
                await this.removeMcpConfig(this.userDataProfileService.currentProfile.settingsResource);
            }
        }
        catch (error) {
            this.logService.error(`MCP migration: Failed to migrate user MCP config`, error);
        }
        this.watchForMcpConfiguration(this.userDataProfileService.currentProfile.settingsResource, false);
        const remoteEnvironment = await this.remoteAgentService.getEnvironment();
        if (remoteEnvironment) {
            try {
                const userRemoteMcpConfig = await this.parseMcpConfig(remoteEnvironment.settingsPath);
                if (userRemoteMcpConfig && userRemoteMcpConfig.servers && Object.keys(userRemoteMcpConfig.servers).length > 0) {
                    await Promise.all(Object.entries(userRemoteMcpConfig.servers).map(([name, config], index) => this.mcpManagementService.install({ name, config, inputs: index === 0 ? userRemoteMcpConfig.inputs : undefined }, { target: 4 /* ConfigurationTarget.USER_REMOTE */ })));
                    await this.removeMcpConfig(remoteEnvironment.settingsPath);
                }
            }
            catch (error) {
                this.logService.error(`MCP migration: Failed to migrate remote MCP config`, error);
            }
            this.watchForMcpConfiguration(remoteEnvironment.settingsPath, true);
        }
    }
    watchForMcpConfiguration(file, isRemote) {
        this._register(this.fileService.watch(file));
        this._register(this.fileService.onDidFilesChange(e => {
            if (e.contains(file)) {
                this.checkForMcpConfigInFile(file, isRemote);
            }
        }));
    }
    async checkForMcpConfigInFile(settingsFile, isRemote) {
        try {
            const mcpConfig = await this.parseMcpConfig(settingsFile);
            if (mcpConfig && mcpConfig.servers && Object.keys(mcpConfig.servers).length > 0) {
                this.showMcpConfigErrorNotification(isRemote);
            }
        }
        catch (error) {
            // Ignore parsing errors - file might not exist or be malformed
        }
    }
    showMcpConfigErrorNotification(isRemote) {
        const message = isRemote
            ? localize('mcp.migration.remoteConfigFound', 'MCP servers should no longer be configured in remote user settings. Use the dedicated MCP configuration instead.')
            : localize('mcp.migration.userConfigFound', 'MCP servers should no longer be configured in user settings. Use the dedicated MCP configuration instead.');
        const openConfigLabel = isRemote
            ? localize('mcp.migration.openRemoteConfig', 'Open Remote User MCP Configuration')
            : localize('mcp.migration.openUserConfig', 'Open User MCP Configuration');
        const commandId = isRemote ? "workbench.mcp.openRemoteUserMcpJson" /* McpCommandIds.OpenRemoteUserMcp */ : "workbench.mcp.openUserMcpJson" /* McpCommandIds.OpenUserMcp */;
        this.notificationService.prompt(Severity.Error, message, [{
                label: localize('mcp.migration.update', 'Update Now'),
                run: async () => {
                    await this.migrateMcpConfig();
                    await this.commandService.executeCommand(commandId);
                },
            }, {
                label: openConfigLabel,
                keepOpen: true,
                run: () => this.commandService.executeCommand(commandId)
            }]);
    }
    async parseMcpConfig(settingsFile) {
        try {
            const content = await this.fileService.readFile(settingsFile);
            const settingsObject = parse(content.value.toString());
            if (!isObject(settingsObject)) {
                return undefined;
            }
            const mcpConfiguration = settingsObject[mcpConfigurationSection];
            if (mcpConfiguration && mcpConfiguration.servers) {
                for (const [, config] of Object.entries(mcpConfiguration.servers)) {
                    if (config.type === undefined) {
                        config.type = config.command ? "stdio" /* McpServerType.LOCAL */ : "http" /* McpServerType.REMOTE */;
                    }
                }
            }
            return mcpConfiguration;
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.warn(`MCP migration: Failed to parse MCP config from ${settingsFile}:`, error);
            }
            return;
        }
    }
    async removeMcpConfig(settingsFile) {
        try {
            await this.jsonEditingService.write(settingsFile, [
                {
                    path: [mcpConfigurationSection],
                    value: undefined
                }
            ], true);
        }
        catch (error) {
            this.logService.warn(`MCP migration: Failed to remove MCP config from ${settingsFile}:`, error);
        }
    }
};
McpConfigMigrationContribution = __decorate([
    __param(0, IWorkbenchMcpManagementService),
    __param(1, IUserDataProfileService),
    __param(2, IFileService),
    __param(3, IRemoteAgentService),
    __param(4, IJSONEditingService),
    __param(5, ILogService),
    __param(6, INotificationService),
    __param(7, ICommandService)
], McpConfigMigrationContribution);
export { McpConfigMigrationContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUdyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUUvRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0RyxPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXRILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFXLE1BQU0sa0NBQWtDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFPdkMsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO2FBRXRELE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBb0M7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