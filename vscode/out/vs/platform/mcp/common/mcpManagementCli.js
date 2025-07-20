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
import { IMcpManagementService } from './mcpManagement.js';
let McpManagementCli = class McpManagementCli {
    constructor(_logger, _mcpManagementService) {
        this._logger = _logger;
        this._mcpManagementService = _mcpManagementService;
    }
    async addMcpDefinitions(definitions) {
        const configs = definitions.map((config) => this.validateConfiguration(config));
        await this.updateMcpInResource(configs);
        this._logger.info(`Added MCP servers: ${configs.map(c => c.name).join(', ')}`);
    }
    async updateMcpInResource(configs) {
        await Promise.all(configs.map(({ name, config, inputs }) => this._mcpManagementService.install({ name, config, inputs })));
    }
    validateConfiguration(config) {
        let parsed;
        try {
            parsed = JSON.parse(config);
        }
        catch (e) {
            throw new InvalidMcpOperationError(`Invalid JSON '${config}': ${e}`);
        }
        if (!parsed.name) {
            throw new InvalidMcpOperationError(`Missing name property in ${config}`);
        }
        if (!('command' in parsed) && !('url' in parsed)) {
            throw new InvalidMcpOperationError(`Missing command or URL property in ${config}`);
        }
        const { name, inputs, ...rest } = parsed;
        return { name, inputs, config: rest };
    }
};
McpManagementCli = __decorate([
    __param(1, IMcpManagementService)
], McpManagementCli);
export { McpManagementCli };
class InvalidMcpOperationError extends Error {
    constructor(message) {
        super(message);
        this.stack = message;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudENsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL2NvbW1vbi9tY3BNYW5hZ2VtZW50Q2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSXBELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBQzVCLFlBQ2tCLE9BQWdCLEVBQ08scUJBQTRDO1FBRG5FLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDTywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO0lBQ2pGLENBQUM7SUFFTCxLQUFLLENBQUMsaUJBQWlCLENBQ3RCLFdBQXFCO1FBRXJCLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUEwQjtRQUMzRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUgsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE1BQWM7UUFDM0MsSUFBSSxNQUFpRixDQUFDO1FBQ3RGLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLHdCQUF3QixDQUFDLGlCQUFpQixNQUFNLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksd0JBQXdCLENBQUMsNEJBQTRCLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbEQsTUFBTSxJQUFJLHdCQUF3QixDQUFDLHNDQUFzQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUN6QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBK0IsRUFBRSxDQUFDO0lBQ2xFLENBQUM7Q0FDRCxDQUFBO0FBckNZLGdCQUFnQjtJQUcxQixXQUFBLHFCQUFxQixDQUFBO0dBSFgsZ0JBQWdCLENBcUM1Qjs7QUFFRCxNQUFNLHdCQUF5QixTQUFRLEtBQUs7SUFDM0MsWUFBWSxPQUFlO1FBQzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQ3RCLENBQUM7Q0FDRCJ9