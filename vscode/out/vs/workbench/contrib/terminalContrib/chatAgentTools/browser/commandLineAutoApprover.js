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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { isPowerShell } from './runInTerminalHelpers.js';
let CommandLineAutoApprover = class CommandLineAutoApprover extends Disposable {
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._denyListRegexes = [];
        this._allowListRegexes = [];
        this.updateConfiguration();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.AllowList */) || e.affectsConfiguration("chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DenyList */)) {
                this.updateConfiguration();
            }
        }));
    }
    updateConfiguration() {
        this._denyListRegexes = this._mapAutoApproveConfigToRegexList(this._configurationService.getValue("chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DenyList */));
        this._allowListRegexes = this._mapAutoApproveConfigToRegexList(this._configurationService.getValue("chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.AllowList */));
    }
    isAutoApproved(command, shell, os) {
        // Check the deny list to see if this command requires explicit approval
        for (const regex of this._denyListRegexes) {
            if (this._commandMatchesRegex(regex, command, shell, os)) {
                return false;
            }
        }
        // Check the allow list to see if the command is allowed to run without explicit approval
        for (const regex of this._allowListRegexes) {
            if (this._commandMatchesRegex(regex, command, shell, os)) {
                return true;
            }
        }
        // TODO: LLM-based auto-approval https://github.com/microsoft/vscode/issues/253267
        // Fallback is always to require approval
        return false;
    }
    _commandMatchesRegex(regex, command, shell, os) {
        if (regex.test(command)) {
            return true;
        }
        else if (isPowerShell(shell, os) && command.startsWith('(')) {
            // Allow ignoring of the leading ( for PowerShell commands as it's a command pattern to
            // operate on the output of a command. For example `(Get-Content README.md) ...`
            if (regex.test(command.slice(1))) {
                return true;
            }
        }
        return false;
    }
    _mapAutoApproveConfigToRegexList(config) {
        if (!config || typeof config !== 'object') {
            return [];
        }
        return Object.entries(config)
            .map(([key, value]) => value ? this._convertAutoApproveEntryToRegex(key) : undefined)
            .filter(e => !!e);
    }
    _convertAutoApproveEntryToRegex(value) {
        // If it's wrapped in `/`, it's in regex format and should be converted directly
        if (value.match(/^\/.+\/$/)) {
            return new RegExp(value.slice(1, -1));
        }
        // Escape regex special characters
        const sanitizedValue = value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
        // Regular strings should match the start of the command line and be a word boundary
        return new RegExp(`^${sanitizedValue}\\b`);
    }
};
CommandLineAutoApprover = __decorate([
    __param(0, IConfigurationService)
], CommandLineAutoApprover);
export { CommandLineAutoApprover };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL2NvbW1hbmRMaW5lQXV0b0FwcHJvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBSXRELFlBQ3dCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUZnQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSjdFLHFCQUFnQixHQUFhLEVBQUUsQ0FBQztRQUNoQyxzQkFBaUIsR0FBYSxFQUFFLENBQUM7UUFNeEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLGlGQUEyQyxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsK0VBQTBDLEVBQUUsQ0FBQztnQkFDM0ksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsK0VBQTBDLENBQUMsQ0FBQztRQUM3SSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLGlGQUEyQyxDQUFDLENBQUM7SUFDaEosQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFlLEVBQUUsS0FBYSxFQUFFLEVBQW1CO1FBQ2pFLHdFQUF3RTtRQUN4RSxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCx5RkFBeUY7UUFDekYsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsa0ZBQWtGO1FBRWxGLHlDQUF5QztRQUN6QyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxLQUFhLEVBQUUsT0FBZSxFQUFFLEtBQWEsRUFBRSxFQUFtQjtRQUM5RixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7YUFBTSxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9ELHVGQUF1RjtZQUN2RixnRkFBZ0Y7WUFDaEYsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sZ0NBQWdDLENBQUMsTUFBZTtRQUN2RCxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7YUFDM0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7YUFDcEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFTywrQkFBK0IsQ0FBQyxLQUFhO1FBQ3BELGdGQUFnRjtRQUNoRixJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFcEUsb0ZBQW9GO1FBQ3BGLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxjQUFjLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBNUVZLHVCQUF1QjtJQUtqQyxXQUFBLHFCQUFxQixDQUFBO0dBTFgsdUJBQXVCLENBNEVuQyJ9