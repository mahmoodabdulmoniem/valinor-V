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
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Emitter } from '../../../base/common/event.js';
import { mcpEnabledConfig } from './mcpManagement.js';
let AllowedMcpServersService = class AllowedMcpServersService extends Disposable {
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeAllowedMcpServers = this._register(new Emitter());
        this.onDidChangeAllowedMcpServers = this._onDidChangeAllowedMcpServers.event;
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpEnabledConfig)) {
                this._onDidChangeAllowedMcpServers.fire();
            }
        }));
    }
    isAllowed(mcpServer) {
        const isEnabled = this.configurationService.getValue(mcpEnabledConfig) === true;
        if (isEnabled) {
            return true;
        }
        const settingsCommandLink = URI.parse(`command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify({ query: `@id:${mcpEnabledConfig}` }))}`).toString();
        return new MarkdownString(nls.localize('mcp servers are not allowed', "Model Context Protocol servers are disabled in the Editor. Please check your [settings]({0}).", settingsCommandLink));
    }
};
AllowedMcpServersService = __decorate([
    __param(0, IConfigurationService)
], AllowedMcpServersService);
export { AllowedMcpServersService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZE1jcFNlcnZlcnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tY3AvY29tbW9uL2FsbG93ZWRNY3BTZXJ2ZXJzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUF3RixnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXJJLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQU92RCxZQUN3QixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFGZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUo1RSxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNuRSxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDO1FBTWhGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFzRTtRQUMvRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssSUFBSSxDQUFDO1FBQ2hGLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMseUNBQXlDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0SyxPQUFPLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsK0ZBQStGLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzlMLENBQUM7Q0FDRCxDQUFBO0FBM0JZLHdCQUF3QjtJQVFsQyxXQUFBLHFCQUFxQixDQUFBO0dBUlgsd0JBQXdCLENBMkJwQyJ9