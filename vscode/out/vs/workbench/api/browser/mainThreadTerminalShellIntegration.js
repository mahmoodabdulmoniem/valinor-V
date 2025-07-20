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
import { Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { ITerminalService } from '../../contrib/terminal/browser/terminal.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { TerminalShellExecutionCommandLineConfidence } from '../common/extHostTypes.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
let MainThreadTerminalShellIntegration = class MainThreadTerminalShellIntegration extends Disposable {
    constructor(extHostContext, _terminalService, workbenchEnvironmentService, _extensionService) {
        super();
        this._terminalService = _terminalService;
        this._extensionService = _extensionService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTerminalShellIntegration);
        const instanceDataListeners = new Map();
        this._register(toDisposable(() => {
            for (const listener of instanceDataListeners.values()) {
                listener.dispose();
            }
        }));
        // onDidChangeTerminalShellIntegration initial state
        for (const terminal of this._terminalService.instances) {
            const cmdDetection = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (cmdDetection) {
                this._enableShellIntegration(terminal);
            }
        }
        // onDidChangeTerminalShellIntegration via command detection
        const onDidAddCommandDetection = this._store.add(this._terminalService.createOnInstanceEvent(instance => {
            return Event.map(Event.filter(instance.capabilities.onDidAddCapabilityType, e => e === 2 /* TerminalCapability.CommandDetection */), () => instance);
        })).event;
        this._store.add(onDidAddCommandDetection(e => this._enableShellIntegration(e)));
        // onDidChangeTerminalShellIntegration via cwd
        const cwdChangeEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(0 /* TerminalCapability.CwdDetection */, e => e.onDidChangeCwd));
        this._store.add(cwdChangeEvent.event(e => {
            this._proxy.$cwdChange(e.instance.instanceId, e.data);
        }));
        // onDidChangeTerminalShellIntegration via env
        const envChangeEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(5 /* TerminalCapability.ShellEnvDetection */, e => e.onDidChangeEnv));
        this._store.add(envChangeEvent.event(e => {
            if (e.data.value && typeof e.data.value === 'object') {
                const envValue = e.data.value;
                // Extract keys and values
                const keysArr = Object.keys(envValue);
                const valuesArr = Object.values(envValue);
                this._proxy.$shellEnvChange(e.instance.instanceId, keysArr, valuesArr, e.data.isTrusted);
            }
        }));
        // onDidStartTerminalShellExecution
        const commandDetectionStartEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, e => e.onCommandExecuted));
        let currentCommand;
        this._store.add(commandDetectionStartEvent.event(e => {
            // Prevent duplicate events from being sent in case command detection double fires the
            // event
            if (e.data === currentCommand) {
                return;
            }
            // String paths are not exposed in the extension API
            currentCommand = e.data;
            const instanceId = e.instance.instanceId;
            this._proxy.$shellExecutionStart(instanceId, e.data.command, convertToExtHostCommandLineConfidence(e.data), e.data.isTrusted, e.data.cwd);
            // TerminalShellExecution.createDataStream
            // Debounce events to reduce the message count - when this listener is disposed the events will be flushed
            instanceDataListeners.get(instanceId)?.dispose();
            instanceDataListeners.set(instanceId, Event.accumulate(e.instance.onData, 50, this._store)(events => {
                this._proxy.$shellExecutionData(instanceId, events.join(''));
            }));
        }));
        // onDidEndTerminalShellExecution
        const commandDetectionEndEvent = this._store.add(this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, e => e.onCommandFinished));
        this._store.add(commandDetectionEndEvent.event(e => {
            currentCommand = undefined;
            const instanceId = e.instance.instanceId;
            instanceDataListeners.get(instanceId)?.dispose();
            // Shell integration C (executed) and D (command finished) sequences should always be in
            // their own events, so send this immediately. This means that the D sequence will not
            // be included as it's currently being parsed when the command finished event fires.
            this._proxy.$shellExecutionEnd(instanceId, e.data.command, convertToExtHostCommandLineConfidence(e.data), e.data.isTrusted, e.data.exitCode);
        }));
        // Clean up after dispose
        this._store.add(this._terminalService.onDidDisposeInstance(e => this._proxy.$closeTerminal(e.instanceId)));
    }
    $executeCommand(terminalId, commandLine) {
        this._terminalService.getInstanceFromId(terminalId)?.runCommand(commandLine, true);
    }
    _enableShellIntegration(instance) {
        this._extensionService.activateByEvent('onTerminalShellIntegration:*');
        if (instance.shellType) {
            this._extensionService.activateByEvent(`onTerminalShellIntegration:${instance.shellType}`);
        }
        this._proxy.$shellIntegrationChange(instance.instanceId);
        const cwdDetection = instance.capabilities.get(0 /* TerminalCapability.CwdDetection */);
        if (cwdDetection) {
            this._proxy.$cwdChange(instance.instanceId, cwdDetection.getCwd());
        }
    }
};
MainThreadTerminalShellIntegration = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTerminalShellIntegration),
    __param(1, ITerminalService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IExtensionService)
], MainThreadTerminalShellIntegration);
export { MainThreadTerminalShellIntegration };
function convertToExtHostCommandLineConfidence(command) {
    switch (command.commandLineConfidence) {
        case 'high':
            return TerminalShellExecutionCommandLineConfidence.High;
        case 'medium':
            return TerminalShellExecutionCommandLineConfidence.Medium;
        case 'low':
        default:
            return TerminalShellExecutionCommandLineConfidence.Low;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUZXJtaW5hbFNoZWxsSW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFvQixNQUFNLG1DQUFtQyxDQUFDO0FBRS9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUEyRixNQUFNLCtCQUErQixDQUFDO0FBQ3JLLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsb0JBQW9CLEVBQXdCLE1BQU0sc0RBQXNELENBQUM7QUFDbEgsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHNUUsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxVQUFVO0lBR2pFLFlBQ0MsY0FBK0IsRUFDSSxnQkFBa0MsRUFDdkMsMkJBQXlELEVBQ25ELGlCQUFvQztRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUoyQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBRWpDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFJeEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FB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