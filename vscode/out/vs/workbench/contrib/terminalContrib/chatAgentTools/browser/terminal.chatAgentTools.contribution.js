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
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { ILanguageModelToolsService } from '../../../chat/common/languageModelToolsService.js';
import { GetTerminalOutputTool, GetTerminalOutputToolData } from './getTerminalOutputTool.js';
import { RunInTerminalTool, RunInTerminalToolData } from './runInTerminalTool.js';
// #region Workbench contributions
let ChatAgentToolsContribution = class ChatAgentToolsContribution extends Disposable {
    static { this.ID = 'terminal.chatAgentTools'; }
    constructor(configurationService, instantiationService, toolsService) {
        super();
        if (configurationService.getValue("chat.agent.terminal.coreToolsEnabled" /* TerminalChatAgentToolsSettingId.CoreToolsEnabled */)) {
            const runInTerminalTool = instantiationService.createInstance(RunInTerminalTool);
            this._register(toolsService.registerToolData(RunInTerminalToolData));
            this._register(toolsService.registerToolImplementation(RunInTerminalToolData.id, runInTerminalTool));
            const getTerminalOutputTool = instantiationService.createInstance(GetTerminalOutputTool);
            this._register(toolsService.registerToolData(GetTerminalOutputToolData));
            this._register(toolsService.registerToolImplementation(GetTerminalOutputToolData.id, getTerminalOutputTool));
        }
    }
};
ChatAgentToolsContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, ILanguageModelToolsService)
], ChatAgentToolsContribution);
registerWorkbenchContribution2(ChatAgentToolsContribution.ID, ChatAgentToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion Contributions
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2hhdEFnZW50VG9vbHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90ZXJtaW5hbC5jaGF0QWdlbnRUb29scy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSw4QkFBOEIsRUFBK0MsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUUvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVsRixrQ0FBa0M7QUFFbEMsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO2FBRWxDLE9BQUUsR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNkI7SUFFL0MsWUFDd0Isb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUN0QyxZQUF3QztRQUVwRSxLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksb0JBQW9CLENBQUMsUUFBUSwrRkFBa0QsRUFBRSxDQUFDO1lBQ3JGLE1BQU0saUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFFckcsTUFBTSxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN6RixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMseUJBQXlCLENBQUMsRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUM5RyxDQUFDO0lBQ0YsQ0FBQzs7QUFwQkksMEJBQTBCO0lBSzdCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDBCQUEwQixDQUFBO0dBUHZCLDBCQUEwQixDQXFCL0I7QUFDRCw4QkFBOEIsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsMEJBQTBCLHVDQUErQixDQUFDO0FBRXhILDJCQUEyQiJ9