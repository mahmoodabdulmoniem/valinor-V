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
import { TerminalShellExecutionCommandLineConfidence } from './extHostTypes.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { Emitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { AsyncIterableObject, Barrier } from '../../../base/common/async.js';
export const IExtHostTerminalShellIntegration = createDecorator('IExtHostTerminalShellIntegration');
let ExtHostTerminalShellIntegration = class ExtHostTerminalShellIntegration extends Disposable {
    constructor(extHostRpc, _extHostTerminalService) {
        super();
        this._extHostTerminalService = _extHostTerminalService;
        this._activeShellIntegrations = new Map();
        this._onDidChangeTerminalShellIntegration = new Emitter();
        this.onDidChangeTerminalShellIntegration = this._onDidChangeTerminalShellIntegration.event;
        this._onDidStartTerminalShellExecution = new Emitter();
        this.onDidStartTerminalShellExecution = this._onDidStartTerminalShellExecution.event;
        this._onDidEndTerminalShellExecution = new Emitter();
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalShellIntegration);
        // Clean up listeners
        this._register(toDisposable(() => {
            for (const [_, integration] of this._activeShellIntegrations) {
                integration.dispose();
            }
            this._activeShellIntegrations.clear();
        }));
        // Convenient test code:
        // this.onDidChangeTerminalShellIntegration(e => {
        // 	console.log('*** onDidChangeTerminalShellIntegration', e);
        // });
        // this.onDidStartTerminalShellExecution(async e => {
        // 	console.log('*** onDidStartTerminalShellExecution', e);
        // 	// new Promise<void>(r => {
        // 	// 	(async () => {
        // 	// 		for await (const d of e.execution.read()) {
        // 	// 			console.log('data2', d);
        // 	// 		}
        // 	// 	})();
        // 	// });
        // 	for await (const d of e.execution.read()) {
        // 		console.log('data', d);
        // 	}
        // });
        // this.onDidEndTerminalShellExecution(e => {
        // 	console.log('*** onDidEndTerminalShellExecution', e);
        // });
        // setTimeout(() => {
        // 	console.log('before executeCommand(\"echo hello\")');
        // 	Array.from(this._activeShellIntegrations.values())[0].value.executeCommand('echo hello');
        // 	console.log('after executeCommand(\"echo hello\")');
        // }, 4000);
    }
    $shellIntegrationChange(instanceId) {
        const terminal = this._extHostTerminalService.getTerminalById(instanceId);
        if (!terminal) {
            return;
        }
        const apiTerminal = terminal.value;
        let shellIntegration = this._activeShellIntegrations.get(instanceId);
        if (!shellIntegration) {
            shellIntegration = new InternalTerminalShellIntegration(terminal.value, this._onDidStartTerminalShellExecution);
            this._activeShellIntegrations.set(instanceId, shellIntegration);
            shellIntegration.store.add(terminal.onWillDispose(() => this._activeShellIntegrations.get(instanceId)?.dispose()));
            shellIntegration.store.add(shellIntegration.onDidRequestShellExecution(commandLine => this._proxy.$executeCommand(instanceId, commandLine)));
            shellIntegration.store.add(shellIntegration.onDidRequestEndExecution(e => this._onDidEndTerminalShellExecution.fire(e)));
            shellIntegration.store.add(shellIntegration.onDidRequestChangeShellIntegration(e => this._onDidChangeTerminalShellIntegration.fire(e)));
            terminal.shellIntegration = shellIntegration.value;
        }
        this._onDidChangeTerminalShellIntegration.fire({
            terminal: apiTerminal,
            shellIntegration: shellIntegration.value
        });
    }
    $shellExecutionStart(instanceId, commandLineValue, commandLineConfidence, isTrusted, cwd) {
        // Force shellIntegration creation if it hasn't been created yet, this could when events
        // don't come through on startup
        if (!this._activeShellIntegrations.has(instanceId)) {
            this.$shellIntegrationChange(instanceId);
        }
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted
        };
        this._activeShellIntegrations.get(instanceId)?.startShellExecution(commandLine, this._convertCwdToUri(cwd));
    }
    $shellExecutionEnd(instanceId, commandLineValue, commandLineConfidence, isTrusted, exitCode) {
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted
        };
        this._activeShellIntegrations.get(instanceId)?.endShellExecution(commandLine, exitCode);
    }
    $shellExecutionData(instanceId, data) {
        this._activeShellIntegrations.get(instanceId)?.emitData(data);
    }
    $shellEnvChange(instanceId, shellEnvKeys, shellEnvValues, isTrusted) {
        this._activeShellIntegrations.get(instanceId)?.setEnv(shellEnvKeys, shellEnvValues, isTrusted);
    }
    $cwdChange(instanceId, cwd) {
        this._activeShellIntegrations.get(instanceId)?.setCwd(this._convertCwdToUri(cwd));
    }
    $closeTerminal(instanceId) {
        this._activeShellIntegrations.get(instanceId)?.dispose();
        this._activeShellIntegrations.delete(instanceId);
    }
    _convertCwdToUri(cwd) {
        // IMPORTANT: cwd is provided to the exthost as a string from the renderer and only
        // converted to a URI on the machine in which the pty is hosted on. The string version of
        // the cwd is used from the renderer such that it's access is synchronous and its event
        // comes through in order relative to other shell integration events.
        return cwd ? URI.file(cwd) : undefined;
    }
};
ExtHostTerminalShellIntegration = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostTerminalService)
], ExtHostTerminalShellIntegration);
export { ExtHostTerminalShellIntegration };
export class InternalTerminalShellIntegration extends Disposable {
    get currentExecution() { return this._currentExecution; }
    constructor(_terminal, _onDidStartTerminalShellExecution) {
        super();
        this._terminal = _terminal;
        this._onDidStartTerminalShellExecution = _onDidStartTerminalShellExecution;
        this._pendingExecutions = [];
        this.store = this._register(new DisposableStore());
        this._onDidRequestChangeShellIntegration = this._register(new Emitter());
        this.onDidRequestChangeShellIntegration = this._onDidRequestChangeShellIntegration.event;
        this._onDidRequestShellExecution = this._register(new Emitter());
        this.onDidRequestShellExecution = this._onDidRequestShellExecution.event;
        this._onDidRequestEndExecution = this._register(new Emitter());
        this.onDidRequestEndExecution = this._onDidRequestEndExecution.event;
        this._onDidRequestNewExecution = this._register(new Emitter());
        this.onDidRequestNewExecution = this._onDidRequestNewExecution.event;
        const that = this;
        this.value = {
            get cwd() {
                return that._cwd;
            },
            get env() {
                if (!that._env) {
                    return undefined;
                }
                return Object.freeze({
                    isTrusted: that._env.isTrusted,
                    value: Object.freeze({ ...that._env.value })
                });
            },
            // executeCommand(commandLine: string): vscode.TerminalShellExecution;
            // executeCommand(executable: string, args: string[]): vscode.TerminalShellExecution;
            executeCommand(commandLineOrExecutable, args) {
                let commandLineValue = commandLineOrExecutable;
                if (args) {
                    for (const arg of args) {
                        const wrapInQuotes = !arg.match(/["'`]/) && arg.match(/\s/);
                        if (wrapInQuotes) {
                            commandLineValue += ` "${arg}"`;
                        }
                        else {
                            commandLineValue += ` ${arg}`;
                        }
                    }
                }
                that._onDidRequestShellExecution.fire(commandLineValue);
                // Fire the event in a microtask to allow the extension to use the execution before
                // the start event fires
                const commandLine = {
                    value: commandLineValue,
                    confidence: TerminalShellExecutionCommandLineConfidence.High,
                    isTrusted: true
                };
                const execution = that.requestNewShellExecution(commandLine, that._cwd).value;
                return execution;
            }
        };
    }
    requestNewShellExecution(commandLine, cwd) {
        const execution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        const unresolvedCommandLines = splitAndSanitizeCommandLine(commandLine.value);
        if (unresolvedCommandLines.length > 1) {
            this._currentExecutionProperties = {
                isMultiLine: true,
                unresolvedCommandLines: splitAndSanitizeCommandLine(commandLine.value),
            };
        }
        this._pendingExecutions.push(execution);
        this._onDidRequestNewExecution.fire(commandLine.value);
        return execution;
    }
    startShellExecution(commandLine, cwd) {
        // Since an execution is starting, fire the end event for any execution that is awaiting to
        // end. When this happens it means that the data stream may not be flushed and therefore may
        // fire events after the end event.
        if (this._pendingEndingExecution) {
            this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._pendingEndingExecution.value, exitCode: undefined });
            this._pendingEndingExecution = undefined;
        }
        if (this._currentExecution) {
            // If the current execution is multi-line, check if this command line is part of it.
            if (this._currentExecutionProperties?.isMultiLine && this._currentExecutionProperties.unresolvedCommandLines) {
                const subExecutionResult = isSubExecution(this._currentExecutionProperties.unresolvedCommandLines, commandLine);
                if (subExecutionResult) {
                    this._currentExecutionProperties.unresolvedCommandLines = subExecutionResult.unresolvedCommandLines;
                    return;
                }
            }
            this._currentExecution.endExecution(undefined);
            this._currentExecution.flush();
            this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._currentExecution.value, exitCode: undefined });
        }
        // Get the matching pending execution, how strict this is depends on the confidence of the
        // command line
        let currentExecution;
        if (commandLine.confidence === TerminalShellExecutionCommandLineConfidence.High) {
            for (const [i, execution] of this._pendingExecutions.entries()) {
                if (execution.value.commandLine.value === commandLine.value) {
                    currentExecution = execution;
                    this._currentExecutionProperties = {
                        isMultiLine: false,
                        unresolvedCommandLines: undefined,
                    };
                    currentExecution = execution;
                    this._pendingExecutions.splice(i, 1);
                    break;
                }
                else {
                    const subExecutionResult = isSubExecution(splitAndSanitizeCommandLine(execution.value.commandLine.value), commandLine);
                    if (subExecutionResult) {
                        this._currentExecutionProperties = {
                            isMultiLine: true,
                            unresolvedCommandLines: subExecutionResult.unresolvedCommandLines,
                        };
                        currentExecution = execution;
                        this._pendingExecutions.splice(i, 1);
                        break;
                    }
                }
            }
        }
        else {
            currentExecution = this._pendingExecutions.shift();
        }
        // If there is no execution, create a new one
        if (!currentExecution) {
            // Fallback to the shell integration's cwd as the cwd may not have been restored after a reload
            currentExecution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        }
        this._currentExecution = currentExecution;
        this._onDidStartTerminalShellExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._currentExecution.value });
    }
    emitData(data) {
        this.currentExecution?.emitData(data);
    }
    endShellExecution(commandLine, exitCode) {
        // If the current execution is multi-line, don't end it until the next command line is
        // confirmed to not be a part of it.
        if (this._currentExecutionProperties?.isMultiLine) {
            if (this._currentExecutionProperties.unresolvedCommandLines && this._currentExecutionProperties.unresolvedCommandLines.length > 0) {
                return;
            }
        }
        if (this._currentExecution) {
            const commandLineForEvent = this._currentExecutionProperties?.isMultiLine ? this._currentExecution.value.commandLine : commandLine;
            this._currentExecution.endExecution(commandLineForEvent);
            const currentExecution = this._currentExecution;
            this._pendingEndingExecution = currentExecution;
            this._currentExecution = undefined;
            // IMPORTANT: Ensure the current execution's data events are flushed in order to
            // prevent data events firing after the end event fires.
            currentExecution.flush().then(() => {
                // Only fire if it's still the same execution, if it's changed it would have already
                // been fired.
                if (this._pendingEndingExecution === currentExecution) {
                    this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: currentExecution.value, exitCode });
                    this._pendingEndingExecution = undefined;
                }
            });
        }
    }
    setEnv(keys, values, isTrusted) {
        const env = {};
        for (let i = 0; i < keys.length; i++) {
            env[keys[i]] = values[i];
        }
        this._env = { value: env, isTrusted };
        this._fireChangeEvent();
    }
    setCwd(cwd) {
        let wasChanged = false;
        if (URI.isUri(this._cwd)) {
            wasChanged = !URI.isUri(cwd) || this._cwd.toString() !== cwd.toString();
        }
        else if (this._cwd !== cwd) {
            wasChanged = true;
        }
        if (wasChanged) {
            this._cwd = cwd;
            this._fireChangeEvent();
        }
    }
    _fireChangeEvent() {
        this._onDidRequestChangeShellIntegration.fire({ terminal: this._terminal, shellIntegration: this.value });
    }
}
class InternalTerminalShellExecution {
    constructor(_commandLine, cwd) {
        this._commandLine = _commandLine;
        this.cwd = cwd;
        this._isEnded = false;
        const that = this;
        this.value = {
            get commandLine() {
                return that._commandLine;
            },
            get cwd() {
                return that.cwd;
            },
            read() {
                return that._createDataStream();
            }
        };
    }
    _createDataStream() {
        if (!this._dataStream) {
            if (this._isEnded) {
                return AsyncIterableObject.EMPTY;
            }
            this._dataStream = new ShellExecutionDataStream();
        }
        return this._dataStream.createIterable();
    }
    emitData(data) {
        if (!this._isEnded) {
            this._dataStream?.emitData(data);
        }
    }
    endExecution(commandLine) {
        if (commandLine) {
            this._commandLine = commandLine;
        }
        this._dataStream?.endExecution();
        this._isEnded = true;
    }
    async flush() {
        if (this._dataStream) {
            await this._dataStream.flush();
            this._dataStream.dispose();
            this._dataStream = undefined;
        }
    }
}
class ShellExecutionDataStream extends Disposable {
    constructor() {
        super(...arguments);
        this._iterables = [];
        this._emitters = [];
    }
    createIterable() {
        if (!this._barrier) {
            this._barrier = new Barrier();
        }
        const barrier = this._barrier;
        const iterable = new AsyncIterableObject(async (emitter) => {
            this._emitters.push(emitter);
            await barrier.wait();
        });
        this._iterables.push(iterable);
        return iterable;
    }
    emitData(data) {
        for (const emitter of this._emitters) {
            emitter.emitOne(data);
        }
    }
    endExecution() {
        this._barrier?.open();
    }
    async flush() {
        await Promise.all(this._iterables.map(e => e.toPromise()));
    }
}
function splitAndSanitizeCommandLine(commandLine) {
    return commandLine
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
/**
 * When executing something that the shell considers multiple commands, such as
 * a comment followed by a command, this needs to all be tracked under a single
 * execution.
 */
function isSubExecution(unresolvedCommandLines, commandLine) {
    if (unresolvedCommandLines.length === 0) {
        return false;
    }
    const newUnresolvedCommandLines = [...unresolvedCommandLines];
    const subExecutionLines = splitAndSanitizeCommandLine(commandLine.value);
    if (newUnresolvedCommandLines && newUnresolvedCommandLines.length > 0) {
        // If all sub-execution lines are in the command line, this is part of the
        // multi-line execution.
        while (newUnresolvedCommandLines.length > 0) {
            if (newUnresolvedCommandLines[0] !== subExecutionLines[0]) {
                break;
            }
            newUnresolvedCommandLines.shift();
            subExecutionLines.shift();
        }
        if (subExecutionLines.length === 0) {
            return { unresolvedCommandLines: newUnresolvedCommandLines };
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBMkYsTUFBTSx1QkFBdUIsQ0FBQztBQUM3SSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFjLE1BQU0sK0JBQStCLENBQUM7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFTeEcsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsZUFBZSxDQUFtQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRS9ILElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsVUFBVTtJQWU5RCxZQUNxQixVQUE4QixFQUN6Qix1QkFBaUU7UUFFMUYsS0FBSyxFQUFFLENBQUM7UUFGa0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQVhuRiw2QkFBd0IsR0FBZ0UsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUV2Rix5Q0FBb0MsR0FBRyxJQUFJLE9BQU8sRUFBOEMsQ0FBQztRQUMzRyx3Q0FBbUMsR0FBRyxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFDO1FBQzVFLHNDQUFpQyxHQUFHLElBQUksT0FBTyxFQUEyQyxDQUFDO1FBQ3JHLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUM7UUFDdEUsb0NBQStCLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFDakcsbUNBQThCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQztRQVFwRixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFFbEYscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNoQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQzlELFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QixDQUFDO1lBQ0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSix3QkFBd0I7UUFDeEIsa0RBQWtEO1FBQ2xELDhEQUE4RDtRQUM5RCxNQUFNO1FBQ04scURBQXFEO1FBQ3JELDJEQUEyRDtRQUMzRCwrQkFBK0I7UUFDL0Isc0JBQXNCO1FBQ3RCLG9EQUFvRDtRQUNwRCxrQ0FBa0M7UUFDbEMsVUFBVTtRQUNWLGFBQWE7UUFDYixVQUFVO1FBQ1YsK0NBQStDO1FBQy9DLDRCQUE0QjtRQUM1QixLQUFLO1FBQ0wsTUFBTTtRQUNOLDZDQUE2QztRQUM3Qyx5REFBeUQ7UUFDekQsTUFBTTtRQUNOLHFCQUFxQjtRQUNyQix5REFBeUQ7UUFDekQsNkZBQTZGO1FBQzdGLHdEQUF3RDtRQUN4RCxZQUFZO0lBQ2IsQ0FBQztJQUVNLHVCQUF1QixDQUFDLFVBQWtCO1FBQ2hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ25DLElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixnQkFBZ0IsR0FBRyxJQUFJLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7WUFDaEgsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUNoRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkgsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0ksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pILGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4SSxRQUFRLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBQ3BELENBQUM7UUFDRCxJQUFJLENBQUMsb0NBQW9DLENBQUMsSUFBSSxDQUFDO1lBQzlDLFFBQVEsRUFBRSxXQUFXO1lBQ3JCLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLEtBQUs7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsZ0JBQXdCLEVBQUUscUJBQWtFLEVBQUUsU0FBa0IsRUFBRSxHQUF1QjtRQUN4TCx3RkFBd0Y7UUFDeEYsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBNkM7WUFDN0QsS0FBSyxFQUFFLGdCQUFnQjtZQUN2QixVQUFVLEVBQUUscUJBQXFCO1lBQ2pDLFNBQVM7U0FDVCxDQUFDO1FBQ0YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVNLGtCQUFrQixDQUFDLFVBQWtCLEVBQUUsZ0JBQXdCLEVBQUUscUJBQWtFLEVBQUUsU0FBa0IsRUFBRSxRQUE0QjtRQUMzTCxNQUFNLFdBQVcsR0FBNkM7WUFDN0QsS0FBSyxFQUFFLGdCQUFnQjtZQUN2QixVQUFVLEVBQUUscUJBQXFCO1lBQ2pDLFNBQVM7U0FDVCxDQUFDO1FBQ0YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsSUFBWTtRQUMxRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU0sZUFBZSxDQUFDLFVBQWtCLEVBQUUsWUFBc0IsRUFBRSxjQUF3QixFQUFFLFNBQWtCO1FBQzlHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVNLFVBQVUsQ0FBQyxVQUFrQixFQUFFLEdBQXVCO1FBQzVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFTSxjQUFjLENBQUMsVUFBa0I7UUFDdkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN6RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxHQUF1QjtRQUMvQyxtRkFBbUY7UUFDbkYseUZBQXlGO1FBQ3pGLHVGQUF1RjtRQUN2RixxRUFBcUU7UUFDckUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUN4QyxDQUFDO0NBQ0QsQ0FBQTtBQWhJWSwrQkFBK0I7SUFnQnpDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx1QkFBdUIsQ0FBQTtHQWpCYiwrQkFBK0IsQ0FnSTNDOztBQU9ELE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxVQUFVO0lBTS9ELElBQUksZ0JBQWdCLEtBQWlELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQW1CckcsWUFDa0IsU0FBMEIsRUFDMUIsaUNBQW1GO1FBRXBHLEtBQUssRUFBRSxDQUFDO1FBSFMsY0FBUyxHQUFULFNBQVMsQ0FBaUI7UUFDMUIsc0NBQWlDLEdBQWpDLGlDQUFpQyxDQUFrRDtRQTFCN0YsdUJBQWtCLEdBQXFDLEVBQUUsQ0FBQztRQVd6RCxVQUFLLEdBQW9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBSXJELHdDQUFtQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQThDLENBQUMsQ0FBQztRQUMxSCx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQUMsS0FBSyxDQUFDO1FBQzFFLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFDO1FBQzlFLCtCQUEwQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUM7UUFDMUQsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUMsQ0FBQyxDQUFDO1FBQzNHLDZCQUF3QixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFDdEQsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFDNUUsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztRQVF4RSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRztZQUNaLElBQUksR0FBRztnQkFDTixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksR0FBRztnQkFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNoQixPQUFPLFNBQVMsQ0FBQztnQkFDbEIsQ0FBQztnQkFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7b0JBQzlCLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2lCQUM1QyxDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0Qsc0VBQXNFO1lBQ3RFLHFGQUFxRjtZQUNyRixjQUFjLENBQUMsdUJBQStCLEVBQUUsSUFBZTtnQkFDOUQsSUFBSSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQztnQkFDL0MsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUN4QixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDNUQsSUFBSSxZQUFZLEVBQUUsQ0FBQzs0QkFDbEIsZ0JBQWdCLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQzt3QkFDakMsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLGdCQUFnQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7d0JBQy9CLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDeEQsbUZBQW1GO2dCQUNuRix3QkFBd0I7Z0JBQ3hCLE1BQU0sV0FBVyxHQUE2QztvQkFDN0QsS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsVUFBVSxFQUFFLDJDQUEyQyxDQUFDLElBQUk7b0JBQzVELFNBQVMsRUFBRSxJQUFJO2lCQUNmLENBQUM7Z0JBQ0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUM5RSxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxXQUFxRCxFQUFFLEdBQW9CO1FBQ25HLE1BQU0sU0FBUyxHQUFHLElBQUksOEJBQThCLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEYsTUFBTSxzQkFBc0IsR0FBRywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUUsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLDJCQUEyQixHQUFHO2dCQUNsQyxXQUFXLEVBQUUsSUFBSTtnQkFDakIsc0JBQXNCLEVBQUUsMkJBQTJCLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQzthQUN0RSxDQUFDO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLFdBQXFELEVBQUUsR0FBb0I7UUFDOUYsMkZBQTJGO1FBQzNGLDRGQUE0RjtRQUM1RixtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUNwSyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsU0FBUyxDQUFDO1FBQzFDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLG9GQUFvRjtZQUNwRixJQUFJLElBQUksQ0FBQywyQkFBMkIsRUFBRSxXQUFXLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzlHLE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxzQkFBc0IsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDaEgsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsMkJBQTJCLENBQUMsc0JBQXNCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQUM7b0JBQ3BHLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMvSixDQUFDO1FBRUQsMEZBQTBGO1FBQzFGLGVBQWU7UUFDZixJQUFJLGdCQUE0RCxDQUFDO1FBQ2pFLElBQUksV0FBVyxDQUFDLFVBQVUsS0FBSywyQ0FBMkMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqRixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ2hFLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDN0QsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO29CQUM3QixJQUFJLENBQUMsMkJBQTJCLEdBQUc7d0JBQ2xDLFdBQVcsRUFBRSxLQUFLO3dCQUNsQixzQkFBc0IsRUFBRSxTQUFTO3FCQUNqQyxDQUFDO29CQUNGLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3JDLE1BQU07Z0JBQ1AsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUN2SCxJQUFJLGtCQUFrQixFQUFFLENBQUM7d0JBQ3hCLElBQUksQ0FBQywyQkFBMkIsR0FBRzs0QkFDbEMsV0FBVyxFQUFFLElBQUk7NEJBQ2pCLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLHNCQUFzQjt5QkFDakUsQ0FBQzt3QkFDRixnQkFBZ0IsR0FBRyxTQUFTLENBQUM7d0JBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNyQyxNQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGdCQUFnQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwRCxDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLCtGQUErRjtZQUMvRixnQkFBZ0IsR0FBRyxJQUFJLDhCQUE4QixDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUM7UUFDMUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2xKLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWTtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxXQUFpRSxFQUFFLFFBQTRCO1FBQ2hILHNGQUFzRjtRQUN0RixvQ0FBb0M7UUFDcEMsSUFBSSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDbkQsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsc0JBQXNCLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkksT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQywyQkFBMkIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFDbkksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ2hELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxnQkFBZ0IsQ0FBQztZQUNoRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1lBQ25DLGdGQUFnRjtZQUNoRix3REFBd0Q7WUFDeEQsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDbEMsb0ZBQW9GO2dCQUNwRixjQUFjO2dCQUNkLElBQUksSUFBSSxDQUFDLHVCQUF1QixLQUFLLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDN0ksSUFBSSxDQUFDLHVCQUF1QixHQUFHLFNBQVMsQ0FBQztnQkFDMUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBYyxFQUFFLE1BQWdCLEVBQUUsU0FBa0I7UUFDMUQsTUFBTSxHQUFHLEdBQTBDLEVBQUUsQ0FBQztRQUN0RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBb0I7UUFDMUIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQixVQUFVLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pFLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDOUIsVUFBVSxHQUFHLElBQUksQ0FBQztRQUNuQixDQUFDO1FBQ0QsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNoQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLENBQUMsbUNBQW1DLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDM0csQ0FBQztDQUNEO0FBRUQsTUFBTSw4QkFBOEI7SUFNbkMsWUFDUyxZQUFzRCxFQUNyRCxHQUFvQjtRQURyQixpQkFBWSxHQUFaLFlBQVksQ0FBMEM7UUFDckQsUUFBRyxHQUFILEdBQUcsQ0FBaUI7UUFKdEIsYUFBUSxHQUFZLEtBQUssQ0FBQztRQU1qQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRztZQUNaLElBQUksV0FBVztnQkFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDMUIsQ0FBQztZQUNELElBQUksR0FBRztnQkFDTixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDakIsQ0FBQztZQUNELElBQUk7Z0JBQ0gsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNqQyxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7WUFDbEMsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ25ELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDMUMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFZO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsV0FBaUU7UUFDN0UsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDVixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUM5QixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBQWpEOztRQUVTLGVBQVUsR0FBa0MsRUFBRSxDQUFDO1FBQy9DLGNBQVMsR0FBbUMsRUFBRSxDQUFDO0lBNEJ4RCxDQUFDO0lBMUJBLGNBQWM7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixDQUFTLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtZQUNoRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QixNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWTtRQUNwQixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLDJCQUEyQixDQUFDLFdBQW1CO0lBQ3ZELE9BQU8sV0FBVztTQUNoQixLQUFLLENBQUMsSUFBSSxDQUFDO1NBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGNBQWMsQ0FBQyxzQkFBZ0MsRUFBRSxXQUFxRDtJQUM5RyxJQUFJLHNCQUFzQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxNQUFNLHlCQUF5QixHQUFHLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzlELE1BQU0saUJBQWlCLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLElBQUkseUJBQXlCLElBQUkseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3ZFLDBFQUEwRTtRQUMxRSx3QkFBd0I7UUFDeEIsT0FBTyx5QkFBeUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsSUFBSSx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzRCxNQUFNO1lBQ1AsQ0FBQztZQUNELHlCQUF5QixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLENBQUM7UUFFRCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUseUJBQXlCLEVBQUUsQ0FBQztRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQyJ9